import os
import re
import autogen 
from typing import Tuple, Dict, Any

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

import google.generativeai as genai

def webpage_travel(url: str) -> Tuple[str, str | None]:
    try:
        with httpx.Client(follow_redirects=True, timeout=8) as client:
            resp = client.get(url)
            resp.raise_for_status() 
            return resp.text, None
    except httpx.HTTPStatusError as e:
        return "", f"HTTP error: {e.response.status_code}"
    except httpx.RequestError as e:
        return "", f"Network error: {e}"
    except Exception as e:
        return "", f"An unexpected error occurred: {e}"

def get_robots_txt(domain: str) -> Tuple[str, str | None]:
    robots_url = f"https://{domain.rstrip('/')}/robots.txt"
    try:
        text, error = webpage_travel(robots_url)
        if error:
            return "", f"Could not fetch robots.txt: {error}"
        return text, None
    except Exception as e:
        return "", f"An error occurred while getting robots.txt: {e}"


load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment. Set it in backend/.env")


def autogen_initiate_chat(agent_a: str, agent_b: str, url: str) -> dict:
    print(f"Agent {agent_a} initiating chat with {agent_b} about URL: {url}")
    html_content, error = webpage_travel(url)
    if error:
        print(f"Error traveling to {url}: {error}")
        return {"status": "failed", "response": f"chat failed: {error}"}
    else:
        print(f"Successfully 'traveled' to {url}. HTML length: {len(html_content)}")
        return {"status": "success", "response": "chat complete with webpage data."}


genai.configure(api_key=GEMINI_API_KEY)
GEMINI_MODEL_NAME = "gemini-1.5-flash"


def gemini_generate(prompt: str) -> str:
    model = genai.GenerativeModel(GEMINI_MODEL_NAME)
    resp = model.generate_content(prompt)
    text = getattr(resp, "text", None)
    if text:
        return text
    try:
        return "\n".join(
            [p.text for p in resp.candidates[0].content.parts if hasattr(p, "text")]
        )
    except Exception:
        return "response unavailable."


def clean_text(s: str) -> str:
    return re.sub(r"[*•\-]+", "", s).strip()


def autogen_analyze_task(domain: str) -> dict:
    print(f"Analyzing task for domain: {domain}")
    robots_content, error = get_robots_txt(domain)
    if error:
        print(f"Error fetching robots.txt for {domain}: {error}")
        return {"status": "analyzed_failed", "analysis": f"analysis failed: {error}"}
    else:
        print(f"Successfully 'fetched' robots.txt for {domain}. Content length: {len(robots_content)}")
        return {"status": "analyzed", "analysis": "analysis complete with robots.txt data."}

def excerpt(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit] + "\n...[truncated]"


def parse_gemini_analysis(text: str) -> dict:
    if not text:
        return {"verdict": "", "explanation": "", "recommendations": []}

    verdict = ""
    verdict_match = re.search(r"Verdict[:\-]?\s*(.*)", text, re.IGNORECASE)
    if verdict_match:
        verdict = verdict_match.group(1).strip()
    else:
        crawl_match = re.search(r"([^.]*\b(crawlable|indexable)[^.]*\.)", text, re.IGNORECASE)
        if crawl_match:
            verdict = crawl_match.group(1).strip()
        else:
            sentences = re.split(r'(?<=[.!?])\s+', text, 2)
            verdict = ". ".join(sentences[:2]) if sentences else text[:150]

    explanation = ""
    exp_match = re.search(r"(Key reasons|Explanation)[:\-]?\s*([\s\S]*?)(Actionable|Recommendations|$)", text, re.IGNORECASE)
    if exp_match:
        explanation_raw = exp_match.group(2).strip()
        explanation = " ".join(explanation_raw.splitlines())
        explanation = " ".join(explanation.split(".")[:4]) + "."

    recommendations = []
    rec_match = re.search(r"(Actionable recommendations|Recommendations)[:\-]?\s*([\s\S]*)", text, re.IGNORECASE)
    if rec_match:
        rec_text = rec_match.group(2)
        lines = [l.strip() for l in rec_text.splitlines() if l.strip() and not re.match(r"^[-*•]?\s*$", l.strip())]
        recommendations = [clean_text(l) for l in lines[:6] if clean_text(l)]

    return {
        "verdict": clean_text(verdict),
        "explanation": clean_text(explanation),
        "recommendations": [clean_text(r) for r in recommendations]
    }


def normalize_url(url: str) -> str | None:
    if not url:
        return None
    url = url.strip()
    if not re.match(r"^https?://", url, flags=re.I):
        url = "https://" + url
    if not re.match(r"^https?://[^/\s]+", url, flags=re.I):
        return None
    return url


def fetch_text(url: str) -> Tuple[str, str | None, int | None]:
    try:
        with httpx.Client(follow_redirects=True, timeout=8) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                return resp.text, None, 200
            elif resp.status_code == 404:
                return "", "404 Not Found", 404
            else:
                return "", f"HTTP {resp.status_code}", resp.status_code
    except Exception as e:
        return "", f"Error: {e}", None


def extract_meta_info(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    meta_tags = soup.find_all("meta")
    result: list[str] = []
    for tag in meta_tags:
        name = (tag.get("name") or "").lower()
        robots_http_equiv = (tag.get("http-equiv") or "").lower()
        content = tag.get("content", "")
        if "robots" in name or "robots" in robots_http_equiv or "googlebot" in name:
            if robots_http_equiv:
                result.append(f'<meta http-equiv="{robots_http_equiv}" content="{content}">')
            else:
                result.append(f'<meta name="{name}" content="{content}">')
    return result


def build_prompt(
    homepage_url: str,
    meta_tags: list[str],
    robots_info: Dict[str, Any]
) -> str:
    meta_section = "\n".join(meta_tags) if meta_tags else "No relevant meta robots tags found."

    if robots_info["ok"]:
        robots_section = f"robots.txt fetched OK (HTTP {robots_info['http_status']}).\n\n{robots_info['text_excerpt']}"
    else:
        status_note = f", HTTP {robots_info['http_status']}" if robots_info['http_status'] else ""
        robots_section = f"robots.txt could not be fetched ({robots_info['error'] or 'Unknown error'}{status_note})."

    return f"""
You are an SEO expert.

Analyze the crawlability of {homepage_url} and provide:
- A two-sentence verdict.
- A short explanation (3-4 sentences) why it is or isn't crawlable.
- 5-6 actionable recommendations to improve crawlability and indexability.

Input:
[robots.txt at {robots_info['url']}]
{robots_section}

[Homepage meta tags at {homepage_url}]
{meta_section}
""".strip()


def check_crawlability(input_url: str) -> Dict[str, Any]:
    norm = normalize_url(input_url)
    if not norm:
        return {"status": "error", "message": "Invalid URL"}

    robots_info: Dict[str, Any] = {"url": None, "ok": False, "http_status": None, "error": None, "text_excerpt": None}
    robots_url = norm.rstrip("/") + "/robots.txt"
    robots_info["url"] = robots_url

    homepage_html, homepage_err, _ = fetch_text(norm)
    if homepage_err:
        return {"status": "error", "message": f"site unreachable: {homepage_err}"}

    robots_text, robots_err, robots_status = fetch_text(robots_url)
    if robots_err:
        robots_info["ok"] = False
        robots_info["http_status"] = robots_status
        robots_info["error"] = robots_err
    else:
        robots_info["ok"] = True
        robots_info["http_status"] = robots_status
        robots_info["text_excerpt"] = excerpt(robots_text, 1200)

    meta_found = extract_meta_info(homepage_html)
    context = build_prompt(norm, meta_found, robots_info)

    analysis = gemini_generate(context)
    parsed = parse_gemini_analysis(analysis)

    final_message = {
        "robots_info": robots_info,
        **parsed
    }
    return {"status": "success", "message": final_message}





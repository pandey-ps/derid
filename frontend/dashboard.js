const API = "https://derid-production.up.railway.app";

const urlInput = document.getElementById("urlInput");
const checkBtn = document.getElementById("checkBtn");
const notice = document.getElementById("notice");
const viewRobotsLink = document.getElementById("viewRobotsLink");

const verdictSection = document.getElementById("verdictSection");
const explanationSection = document.getElementById("explanationSection");
const recommendationsSection = document.getElementById("recommendationsSection");
const reportContainer = document.getElementById("reportContainer");

checkBtn.addEventListener("click", () => checkCrawlability());

viewRobotsLink.addEventListener("click", (e) => {
  e.preventDefault();
  const raw = urlInput.value.trim();
  if (!validateUrlLike(raw)) {
    notice.innerHTML = `Enter a valid url.`;
    return;
  }

  let url = raw;
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const robotsUrl = new URL("/robots.txt", url).href;
    window.open(robotsUrl, "_blank");
  } catch (err) {
    notice.innerHTML = `invalid url format.`;
  }
});

function validateUrlLike(s) {
  if (!s) return false;
  s = s.trim();
  const hasDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s);
  const hasScheme = /^https?:\/\//i.test(s);
  return hasDomain || hasScheme;
}

async function checkCrawlability() {
  verdictSection.innerHTML = "";
  explanationSection.innerHTML = "";
  recommendationsSection.innerHTML = "";
  reportContainer.style.display = "none";

  const raw = urlInput.value;
  if (!validateUrlLike(raw)) {
    notice.innerHTML = `invalid url. try <code>example.com</code> or <code>https://example.com</code>.`;
    return;
  }

  notice.textContent = "Checking…";

  try {
    const res = await fetch(`${API}/check-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: raw })
    });

    if (!res.ok) {
      notice.innerHTML = `<span class="badge err">Backend error</span> ${res.status} ${res.statusText}`;
      return;
    }

    const data = await res.json();

    if (data.status === "error") {
      notice.innerHTML = `<span class="badge err">Error</span> ${escapeHtml(data.message || "Something went wrong.")}`;
      return;
    }

    const msg = data.message;

    if (msg.verdict) {
      verdictSection.innerHTML = `
        <div class="section-box verdict-box">
          <strong>Verdict</strong>
          <p>${escapeHtml(cleanText(msg.verdict))}</p>
        </div>`;
    }

    if (msg.explanation) {
      explanationSection.innerHTML = `
        <div class="section-box explanation-box">
          <strong>Explanation</strong>
          <p>${escapeHtml(cleanText(msg.explanation))}</p>
        </div>`;
    }

    if (msg.recommendations && msg.recommendations.length > 0) {
      const listItems = msg.recommendations.map(r => `<li>${escapeHtml(cleanText(r))}</li>`).join("");
      recommendationsSection.innerHTML = `
        <div class="section-box recommendations-box">
          <strong>Recommendations</strong>
          <ul>${listItems}</ul>
        </div>`;
    }

    reportContainer.style.display = "block";
    notice.textContent = ""; 

  } catch (err) {
    notice.innerHTML = `<span class="badge err">Network</span> The backend is currently waking up. Please try again in a second or two.`;
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

const themeToggle = document.querySelector('.theme-toggle');
const currentTheme = localStorage.getItem('theme');

if (currentTheme) {
  document.body.classList.add(currentTheme);
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  let theme = 'light-theme';
  if (document.body.classList.contains('dark-theme')) {
    theme = 'dark-theme';
  }
  localStorage.setItem('theme', theme);
});

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function cleanText(s) {
  return s.replace(/[*•\-]+/g, "").trim();
}

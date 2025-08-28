import { signInWithGoogle, getCurrentUser, signOut } from './src/supabase.js'

const themeToggle = document.querySelector('.theme-toggle');
let isDarkMode = localStorage.getItem('darkMode') === 'true';

if (isDarkMode) {
    document.body.classList.add('dark-theme');
}

themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-theme', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    
    const icon = themeToggle.querySelector('svg');
    icon.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
    }, 300);
});

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (user) {
        updateUIForLoggedInUser(user);
    }
});

const getStartedBtn = document.getElementById('getStartedBtn');
const signInBtn = document.querySelector('.sign-in-btn');

getStartedBtn.addEventListener('click', () => {
    getStartedBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        getStartedBtn.style.transform = '';
    }, 150);
    
    handleGoogleAuth();
});

signInBtn.addEventListener('click', () => {
    signInBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        signInBtn.style.transform = '';
    }, 150);
    handleGoogleAuth();
});

async function handleGoogleAuth() {
    try {
        console.log('Initiating Google authentication...');
        await signInWithGoogle();
    } catch (error) {
        console.error('Authentication failed:', error);
        alert('Authentication failed. Please try again.');
    }
}

function updateUIForLoggedInUser(user) {
    const signInBtn = document.querySelector('.sign-in-btn');
    const getStartedBtn = document.getElementById('getStartedBtn');
    
    signInBtn.textContent = 'Sign Out';
    signInBtn.onclick = handleSignOut;
    
    getStartedBtn.textContent = 'Go to Dashboard';
    getStartedBtn.onclick = () => {
        window.location.href = '/dashboard.html';
    };
}

async function handleSignOut() {
    try {
        await signOut();
        location.reload();
    } catch (error) {
        console.error('Sign out failed:', error);
        alert('Sign out failed. Please try again.');
    }
}

import { supabase } from './src/supabase.js';
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        updateUIForLoggedInUser(session.user);
    } else if (event === 'SIGNED_OUT') {
        location.reload();
    }
});
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
        link.style.transform = 'translateY(-1px)';
    });
    
    link.addEventListener('mouseleave', () => {
        link.style.transform = 'translateY(0)';
    });
});

const phLink = document.querySelector('.ph-link');
if (phLink) {
    phLink.addEventListener('click', (e) => {
        phLink.style.transform = 'scale(0.98) translateY(-1px)';
        setTimeout(() => {
            phLink.style.transform = 'scale(1) translateY(-1px)';
        }, 150);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const getStartedBtn = document.querySelector('.get-started-btn');
    
    setTimeout(() => {
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
    }, 100);
    
    setTimeout(() => {
        heroSubtitle.style.opacity = '1';
        heroSubtitle.style.transform = 'translateY(0)';
    }, 300);
    
    setTimeout(() => {
        getStartedBtn.style.opacity = '1';
        getStartedBtn.style.transform = 'translateY(0)';
    }, 500);
});

document.addEventListener('DOMContentLoaded', () => {
    const elements = ['.hero-title', '.hero-subtitle', '.get-started-btn'];
    elements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        }
    });
});
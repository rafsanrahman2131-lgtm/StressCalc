/* ==========================================
   StressCalculator Application Logic
   Theme Engine & Java Backend-Ready Auth Logic
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const htmlElement = document.documentElement;
  const themeButtons = document.querySelectorAll('.theme-btn');

  // 1. Initialize Theme from localStorage or default to 'light'
  const savedTheme = localStorage.getItem('stresscalc_theme') || 'light';
  setTheme(savedTheme);

  // Add click handlers for theme toggle buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-set-theme');
      if (selectedTheme) {
        setTheme(selectedTheme);
      }
    });
  });

  function setTheme(theme) {
    if (!['light', 'dark', 'contrast'].includes(theme)) {
      theme = 'light';
    }

    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('stresscalc_theme', theme);

    themeButtons.forEach((btn) => {
      if (btn.getAttribute('data-set-theme') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 2. Auth Gateway Java Form Toggle Logic (/login vs /register)
  const tabSignin = document.getElementById('tab-signin');
  const tabSignup = document.getElementById('tab-signup');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const submitBtnText = document.getElementById('submit-btn-text');
  const nameGroup = document.getElementById('group-name');
  const confirmPasswordGroup = document.getElementById('group-confirm-password');
  const forgotLink = document.getElementById('forgot-link');
  const authForm = document.getElementById('auth-form');

  if (tabSignin && tabSignup && authForm) {
    tabSignin.addEventListener('click', () => switchAuthMode('signin'));
    tabSignup.addEventListener('click', () => switchAuthMode('signup'));
  }

  function switchAuthMode(mode) {
    if (mode === 'signin') {
      tabSignin.classList.add('active');
      tabSignup.classList.remove('active');

      authForm.setAttribute('action', '/login');
      authTitle.textContent = 'Welcome back';
      authSubtitle.textContent = 'Enter your credentials to access your cognitive telemetry dashboard.';
      submitBtnText.textContent = 'Sign In to Dashboard';

      if (nameGroup) nameGroup.style.display = 'none';
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
      if (forgotLink) forgotLink.style.display = 'block';
    } else {
      tabSignup.classList.add('active');
      tabSignin.classList.remove('active');

      authForm.setAttribute('action', '/register');
      authTitle.textContent = 'Create your account';
      authSubtitle.textContent = 'Start tracking your focus and protecting your daily bandwidth.';
      submitBtnText.textContent = 'Create Account & Register';

      if (nameGroup) nameGroup.style.display = 'flex';
      if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'flex';
      if (forgotLink) forgotLink.style.display = 'none';
    }
  }

  // 3. Motivational Quotes Rotator for Auth Page
  const quotes = [
    {
      text: "“Your focus determines your reality. Protect your cognitive bandwidth like your most precious metabolic asset.”",
      author: "Quantified Self Principle"
    },
    {
      text: "“Context switching isn't free—it charges a heavy tax on working memory. Track your telemetry.”",
      author: "Cognitive Ergonomics"
    },
    {
      text: "“In an age of constant notification noise, deep focus is a superpower.”",
      author: "StressCalc System"
    }
  ];

  const quoteText = document.getElementById('quote-text');
  const quoteAuthor = document.getElementById('quote-author');

  if (quoteText && quoteAuthor) {
    let quoteIndex = 0;
    setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quoteText.style.opacity = '0';
      quoteAuthor.style.opacity = '0';

      setTimeout(() => {
        quoteText.textContent = quotes[quoteIndex].text;
        quoteAuthor.textContent = quotes[quoteIndex].author;
        quoteText.style.opacity = '1';
        quoteAuthor.style.opacity = '1';
      }, 300);
    }, 6000);
  }

  // Smooth scroll helper
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });
});

/* ==========================================
   StressCalculator Application Logic
   Theme Engine & Interactive Features
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const htmlElement = document.documentElement;
  const themeButtons = document.querySelectorAll('.theme-btn');

  // 1. Initialize Theme from localStorage or default to 'light'
  const savedTheme = localStorage.getItem('stresscalc_theme') || 'light';
  setTheme(savedTheme);

  // 2. Add Click Listeners to Theme Toggle Buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-set-theme');
      if (selectedTheme) {
        setTheme(selectedTheme);
      }
    });
  });

  // Function to apply theme and persist in localStorage
  function setTheme(theme) {
    // Valid options: 'light', 'dark', 'contrast'
    if (!['light', 'dark', 'contrast'].includes(theme)) {
      theme = 'light';
    }

    // Set data-theme attribute on <html>
    htmlElement.setAttribute('data-theme', theme);

    // Save to localStorage
    localStorage.setItem('stresscalc_theme', theme);

    // Update UI active state on buttons
    themeButtons.forEach((btn) => {
      if (btn.getAttribute('data-set-theme') === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Smooth scroll helper for anchor links
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

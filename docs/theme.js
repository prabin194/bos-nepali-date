/**
 * bos-nepali-date — Dark mode toggle
 * Persists preference in localStorage, respects prefers-color-scheme.
 * Auto-initializes when the script loads.
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'bos-nepali-date-theme';
  var darkClass = 'dark';

  function getPreferredTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Fall back to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle(darkClass, theme === 'dark');
    updateToggleButton(theme);
  }

  function updateToggleButton(theme) {
    var btn = document.getElementById('theme-btn');
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function toggleTheme() {
    var isDark = document.documentElement.classList.contains(darkClass);
    var newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }

  // Init: apply saved/system theme
  var theme = getPreferredTheme();
  applyTheme(theme);

  // Listen for system preference changes
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', function(e) {
      // Only auto-switch if user hasn't explicitly saved a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Expose toggle globally so the button's onclick can call it
  window.toggleTheme = toggleTheme;

  // Lazy-bind the button once it appears in DOM
  function bindButton() {
    var btn = document.getElementById('theme-btn');
    if (btn) {
      btn.removeEventListener('click', toggleTheme);
      btn.addEventListener('click', toggleTheme);
      updateToggleButton(getPreferredTheme());
      return true;
    }
    return false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButton);
  } else {
    if (!bindButton()) {
      // Button might be injected after script runs (e.g., by another script)
      var observer = new MutationObserver(function() {
        if (bindButton()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }
})();

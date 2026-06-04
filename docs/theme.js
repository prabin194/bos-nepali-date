(function() {
  var storageKey = 'bos-nepali-date-theme';
  var btn = null;
  var doc = document.documentElement;

  function applyTheme(dark) {
    doc.classList.toggle('dark', dark);
    localStorage.setItem(storageKey, dark ? 'dark' : 'light');
    if (btn) btn.textContent = dark ? '\u2600\uFE0F' : '\uD83C\uDF19';
  }

  function initTheme() {
    var saved = localStorage.getItem(storageKey);
    if (saved === 'dark') { applyTheme(true); return; }
    if (saved === 'light') { applyTheme(false); return; }
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  initTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem(storageKey)) applyTheme(e.matches);
  });

  var observer = new MutationObserver(function() {
    btn = document.getElementById('theme-btn');
    if (btn) {
      btn.addEventListener('click', function() {
        applyTheme(!doc.classList.contains('dark'));
      });
      btn.textContent = doc.classList.contains('dark') ? '\u2600\uFE0F' : '\uD83C\uDF19';
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();

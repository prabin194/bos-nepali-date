(function () {
  var doc = document.documentElement;
  var storageKey = 'bos-nepali-date-theme';
  var themeButton = document.getElementById('theme-btn');
  var mobileButton = document.querySelector('.nav-toggle');
  var navigation = document.querySelector('header nav');

  function applyTheme(isDark) {
    doc.classList.toggle('dark', isDark);
    if (themeButton) {
      themeButton.textContent = isDark ? '☀' : '☾';
      themeButton.setAttribute('aria-label', isDark ? 'Use light theme' : 'Use dark theme');
      themeButton.setAttribute('aria-pressed', String(isDark));
    }
  }

  var savedTheme = localStorage.getItem(storageKey);
  applyTheme(savedTheme === 'dark');

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      var isDark = !doc.classList.contains('dark');
      applyTheme(isDark);
      localStorage.setItem(storageKey, isDark ? 'dark' : 'light');
    });
  }

  if (mobileButton && navigation) {
    mobileButton.addEventListener('click', function () {
      var isOpen = navigation.classList.toggle('is-open');
      mobileButton.setAttribute('aria-expanded', String(isOpen));
      mobileButton.textContent = isOpen ? '×' : '☰';
    });
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy');
      if (!navigator.clipboard || !value) return;
      navigator.clipboard.writeText(value).then(function () {
        var original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(function () { button.textContent = original; }, 1400);
      });
    });
  });

  function createDocsSearch() {
    var buttonGroup = document.querySelector('.site-header .nav-btns');
    if (!buttonGroup) return;

    var trigger = document.createElement('button');
    trigger.className = 'nav-btn site-search-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Search documentation');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.innerHTML = '<svg class="site-search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg><span class="site-search-label">Search docs</span><kbd aria-hidden="true">⌘K</kbd>';
    buttonGroup.insertBefore(trigger, themeButton || buttonGroup.firstChild);

    var overlay = document.createElement('div');
    overlay.className = 'site-search-overlay';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<div class="site-search-backdrop" data-search-close></div>',
      '<section class="site-search-dialog" role="dialog" aria-modal="true" aria-labelledby="site-search-title">',
      '  <div class="site-search-head">',
      '    <div class="site-search-field">',
      '      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg>',
      '      <label class="sr-only" id="site-search-title" for="site-search-input">Search documentation</label>',
      '      <input id="site-search-input" type="search" placeholder="Search props, components, and guides…" autocomplete="off" spellcheck="false">',
      '      <button type="button" class="site-search-close" data-search-close aria-label="Close search">Esc</button>',
      '    </div>',
      '  </div>',
      '  <p class="site-search-status" id="site-search-status" role="status" aria-live="polite">Loading documentation…</p>',
      '  <div class="site-search-results" id="site-search-results"></div>',
      '  <div class="site-search-help" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></div>',
      '</section>'
    ].join('');
    document.body.appendChild(overlay);

    var input = overlay.querySelector('#site-search-input');
    var results = overlay.querySelector('#site-search-results');
    var status = overlay.querySelector('#site-search-status');
    var searchItems = [];
    var activeIndex = -1;
    var previousFocus = null;

    function localUrl(value) {
      if (!value || value === '/') return './';
      return value.replace(/^\//, '');
    }

    function searchableText(item) {
      return [item.t, item.p, item.c].join(' ').toLowerCase();
    }

    function resultLinks() {
      return [].slice.call(results.querySelectorAll('.site-search-result'));
    }

    function setActive(index) {
      var links = resultLinks();
      if (!links.length) {
        activeIndex = -1;
        return;
      }
      activeIndex = (index + links.length) % links.length;
      links.forEach(function (link, linkIndex) {
        var isActive = linkIndex === activeIndex;
        link.classList.toggle('is-active', isActive);
        link.setAttribute('aria-selected', String(isActive));
      });
      links[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    function render(query) {
      var terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var matches = searchItems.filter(function (item) {
        var haystack = searchableText(item);
        return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
      }).slice(0, 8);

      results.replaceChildren();
      activeIndex = -1;

      if (!matches.length) {
        status.textContent = query ? 'No results. Try a component or prop name.' : 'Start typing to search the documentation.';
        return;
      }

      status.textContent = matches.length + (matches.length === 1 ? ' result' : ' results');
      matches.forEach(function (item) {
        var link = document.createElement('a');
        link.className = 'site-search-result';
        link.href = localUrl(item.u);
        link.setAttribute('role', 'option');
        link.setAttribute('aria-selected', 'false');

        var copy = document.createElement('span');
        copy.className = 'site-search-result-copy';
        var title = document.createElement('strong');
        title.textContent = item.t;
        var excerpt = document.createElement('span');
        excerpt.textContent = String(item.c || '').replace(/\s+/g, ' ').trim().slice(0, 130);
        copy.appendChild(title);
        copy.appendChild(excerpt);

        var page = document.createElement('span');
        page.className = 'site-search-result-page';
        page.textContent = item.p || 'Documentation';
        link.appendChild(copy);
        link.appendChild(page);
        results.appendChild(link);
      });
    }

    function openSearch() {
      if (!overlay.hidden) return;
      previousFocus = document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('search-is-open');
      trigger.setAttribute('aria-expanded', 'true');
      input.value = '';
      render('');
      window.requestAnimationFrame(function () { input.focus(); });
    }

    function closeSearch() {
      if (overlay.hidden) return;
      overlay.hidden = true;
      document.body.classList.remove('search-is-open');
      trigger.setAttribute('aria-expanded', 'false');
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    trigger.addEventListener('click', openSearch);
    overlay.querySelectorAll('[data-search-close]').forEach(function (element) {
      element.addEventListener('click', closeSearch);
    });
    input.addEventListener('input', function () { render(input.value); });
    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActive(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        resultLinks()[activeIndex].click();
        return;
      }
      if (event.key === 'Tab') {
        var focusable = [input, overlay.querySelector('.site-search-close')];
        var current = focusable.indexOf(document.activeElement);
        if (event.shiftKey && current === 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && current === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      var target = event.target;
      var isTyping = target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
      var shortcut = (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey);
      if (!shortcut) return;
      event.preventDefault();
      openSearch();
    });

    fetch('search-index.json?v=20260717-10', { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('Unable to load search index');
        return response.json();
      })
      .then(function (items) {
        searchItems = Array.isArray(items) ? items : [];
        status.textContent = 'Start typing to search the documentation.';
        if (!overlay.hidden) render(input.value);
      })
      .catch(function () {
        status.textContent = 'Search is unavailable. Open the documentation to browse all sections.';
      });
  }

  createDocsSearch();

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.gsap) return;

  var headerTargets = document.querySelectorAll('.site-header .logo, .site-header nav a, .site-header .nav-btn');
  var heroTargets = document.querySelectorAll('[data-hero-reveal]');
  var entrance = window.gsap.timeline({ defaults: { ease: 'power4.out' } });
  if (headerTargets.length) {
    entrance.from(headerTargets, { opacity: 0, y: -8, duration: .38, stagger: .025 });
  }
  if (heroTargets.length) {
    entrance.from(heroTargets, { opacity: 0, y: 28, duration: .65, stagger: .07 }, '-=.15');
  }

  var revealItems = document.querySelectorAll('[data-reveal]');
  if (!revealItems.length || !('IntersectionObserver' in window)) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      window.gsap.fromTo(entry.target, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out' });
      observer.unobserve(entry.target);
    });
  }, { threshold: .12 });
  revealItems.forEach(function (item) { observer.observe(item); });
})();

(function () {
  'use strict';

  function isPlainTextPage() {
    var body = document.body;
    if (!body) return false;

    var children = body.children;
    if (children.length === 1 && children[0].tagName === 'PRE') {
      return true;
    }

    if (children.length === 0 && body.childNodes.length > 0) {
      for (var i = 0; i < body.childNodes.length; i++) {
        if (body.childNodes[i].nodeType !== Node.TEXT_NODE) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  function getMarkdownText() {
    var pre = document.body.querySelector('pre');
    if (pre) return pre.textContent;
    return document.body.textContent;
  }

  function estimateReadingTime(text) {
    var chineseChars = (text.match(/[一-鿿]/g) || []).length;
    if (chineseChars / text.length > 0.3) {
      return Math.max(1, Math.ceil(chineseChars / 400));
    }
    var words = text.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  function computeMetadata(text) {
    return {
      lines: text.split('\n').length,
      chars: text.length,
      readingTime: estimateReadingTime(text)
    };
  }

  var THEMES = {
    light: {
      bodyBg: 'linear-gradient(180deg, #f0f4ff 0%, #ffffff 200px)',
      barBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      barBorder: 'none',
      barColor: '#ffffff',
      btnBg: 'rgba(102, 126, 234, 0.15)',
      btnHover: 'rgba(102, 126, 234, 0.3)',
      tocBg: 'rgba(255, 255, 255, 0.85)',
      tocColor: '#24292f',
      tocHover: 'rgba(102, 126, 234, 0.1)'
    },
    dark: {
      bodyBg: 'linear-gradient(180deg, #0d1320 0%, #0d1117 200px)',
      barBg: 'linear-gradient(135deg, #1a1c2e 0%, #2d1b4e 100%)',
      barBorder: 'none',
      barColor: '#c9d1d9',
      btnBg: 'rgba(102, 126, 234, 0.2)',
      btnHover: 'rgba(102, 126, 234, 0.4)',
      tocBg: 'rgba(13, 17, 23, 0.85)',
      tocColor: '#c9d1d9',
      tocHover: 'rgba(102, 126, 234, 0.15)'
    }
  };

  var state = {
    theme: 'light',
    immersive: false,
    wrapper: null,
    bar: null,
    themeBtn: null,
    immersiveBtn: null,
    tocPanel: null,
    tocBtn: null,
    tocItems: []
  };

  function applyTheme(theme) {
    state.theme = theme;
    var colors = THEMES[theme];

    document.body.style.background = colors.bodyBg;

    if (state.wrapper) {
      state.wrapper.setAttribute('data-color-mode', theme);
      state.wrapper.setAttribute('data-light-theme', 'light');
      state.wrapper.setAttribute('data-dark-theme', 'dark');
    }

    if (state.bar) {
      state.bar.style.background = colors.barBg;
      state.bar.style.borderBottom = colors.barBorder;
      state.bar.style.color = colors.barColor;
    }

    if (state.themeBtn) {
      state.themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
      state.themeBtn.style.background = colors.btnBg;
    }

    if (state.immersiveBtn) {
      state.immersiveBtn.style.background = colors.btnBg;
    }

    if (state.tocPanel) {
      state.tocPanel.style.background = colors.tocBg;
      state.tocPanel.style.color = colors.tocColor;
    }
    if (state.tocBtn) {
      state.tocBtn.style.background = colors.btnBg;
    }
    state.tocItems.forEach(function (item) {
      if (!item.classList.contains('toc-active')) {
        item.style.color = colors.tocColor;
      }
    });
  }

  function applyImmersive(immersive) {
    state.immersive = immersive;
    if (immersive) {
      document.body.classList.add('immersive-mode');
    } else {
      document.body.classList.remove('immersive-mode');
    }
    if (state.immersiveBtn) {
      state.immersiveBtn.textContent = immersive ? '📄' : '📖';
    }
  }

  function savePreferences() {
    chrome.storage.local.set({
      theme: state.theme,
      immersive: state.immersive
    });
  }

  function createMetadataBar(metadata) {
    var bar = document.createElement('div');
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.zIndex = '10000';
    bar.style.padding = '6px 20px';
    bar.style.fontSize = '13px';
    bar.style.textAlign = 'center';
    bar.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

    var formattedChars = metadata.chars.toLocaleString();
    bar.textContent = '\u{1F4C4} ' + metadata.lines + ' 行  |  ✏️ ' +
      formattedChars + ' 字符  |  ⏱ 约 ' + metadata.readingTime + ' 分钟阅读';

    state.bar = bar;
    return bar;
  }

  function createFloatingButtons() {
    var container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '30px';
    container.style.right = '30px';
    container.style.zIndex = '10001';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';

    function makeButton(emoji) {
      var btn = document.createElement('button');
      btn.textContent = emoji;
      btn.style.width = '40px';
      btn.style.height = '40px';
      btn.style.borderRadius = '50%';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '18px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.padding = '0';
      btn.style.lineHeight = '1';
      btn.style.backdropFilter = 'blur(8px)';
      btn.style.webkitBackdropFilter = 'blur(8px)';
      var colors = THEMES[state.theme];
      btn.style.background = colors.btnBg;
      btn.addEventListener('mouseenter', function () {
        btn.style.background = THEMES[state.theme].btnHover;
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.background = THEMES[state.theme].btnBg;
      });
      return btn;
    }

    var themeBtn = makeButton(state.theme === 'light' ? '🌙' : '☀️');
    themeBtn.addEventListener('click', function () {
      applyTheme(state.theme === 'light' ? 'dark' : 'light');
      savePreferences();
    });
    state.themeBtn = themeBtn;

    var immersiveBtn = makeButton(state.immersive ? '📄' : '📖');
    immersiveBtn.addEventListener('click', function () {
      applyImmersive(!state.immersive);
      savePreferences();
    });
    state.immersiveBtn = immersiveBtn;

    container.appendChild(themeBtn);
    container.appendChild(immersiveBtn);
    document.body.appendChild(container);
  }

  function renderMarkdown(markdownText, preferences) {
    var theme = preferences.theme || 'light';
    var immersive = preferences.immersive || false;

    var html = marked.parse(markdownText);

    var wrapper = document.createElement('div');
    wrapper.id = 'md-renderer-wrapper';
    state.wrapper = wrapper;

    var article = document.createElement('article');
    article.className = 'markdown-body';
    article.innerHTML = html;
    article.style.maxWidth = '980px';
    article.style.margin = '0 auto';
    article.style.padding = '45px';

    wrapper.appendChild(article);

    document.body.innerHTML = '';
    document.body.appendChild(wrapper);

    var metadata = computeMetadata(markdownText);
    var bar = createMetadataBar(metadata);
    document.body.insertBefore(bar, document.body.firstChild);

    var barHeight = bar.offsetHeight;
    article.style.paddingTop = (45 + barHeight) + 'px';

    applyTheme(theme);
    applyImmersive(immersive);

    createFloatingButtons();
    createProgressBar();
    createTOC();
  }

  function createTOC() {
    var article = document.querySelector('.markdown-body');
    if (!article) return;

    var headings = article.querySelectorAll('h1, h2, h3');
    if (headings.length === 0) return;

    var colors = THEMES[state.theme];

    var panel = document.createElement('nav');
    panel.style.position = 'fixed';
    panel.style.top = '40px';
    panel.style.left = '16px';
    panel.style.width = '220px';
    panel.style.maxHeight = 'calc(100vh - 80px)';
    panel.style.overflowY = 'auto';
    panel.style.background = colors.tocBg;
    panel.style.color = colors.tocColor;
    panel.style.backdropFilter = 'blur(12px)';
    panel.style.webkitBackdropFilter = 'blur(12px)';
    panel.style.borderRadius = '8px';
    panel.style.padding = '12px 0';
    panel.style.zIndex = '10001';
    panel.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    panel.style.fontSize = '13px';
    panel.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
    state.tocPanel = panel;

    var tocBtn = document.createElement('button');
    tocBtn.textContent = '\u{1F4D1}';
    tocBtn.style.position = 'fixed';
    tocBtn.style.bottom = '30px';
    tocBtn.style.left = '30px';
    tocBtn.style.width = '40px';
    tocBtn.style.height = '40px';
    tocBtn.style.borderRadius = '50%';
    tocBtn.style.border = 'none';
    tocBtn.style.cursor = 'pointer';
    tocBtn.style.fontSize = '18px';
    tocBtn.style.display = 'none';
    tocBtn.style.alignItems = 'center';
    tocBtn.style.justifyContent = 'center';
    tocBtn.style.padding = '0';
    tocBtn.style.lineHeight = '1';
    tocBtn.style.backdropFilter = 'blur(8px)';
    tocBtn.style.webkitBackdropFilter = 'blur(8px)';
    tocBtn.style.background = colors.btnBg;
    tocBtn.style.zIndex = '10001';
    tocBtn.addEventListener('mouseenter', function () {
      tocBtn.style.background = THEMES[state.theme].btnHover;
    });
    tocBtn.addEventListener('mouseleave', function () {
      tocBtn.style.background = THEMES[state.theme].btnBg;
    });
    state.tocBtn = tocBtn;

    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0, 0, 0, 0.3)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'none';

    tocBtn.addEventListener('click', function () {
      panel.style.display = 'block';
      overlay.style.display = 'block';
    });
    overlay.addEventListener('click', function () {
      panel.style.display = 'none';
      overlay.style.display = 'none';
    });

    var items = [];
    headings.forEach(function (heading, index) {
      var id = 'toc-heading-' + index;
      heading.id = id;

      var item = document.createElement('div');
      item.textContent = heading.textContent;
      item.style.padding = '4px 12px';
      item.style.cursor = 'pointer';
      item.style.borderLeft = '2px solid transparent';
      item.style.transition = 'background 0.15s, border-color 0.15s';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';

      var tag = heading.tagName;
      if (tag === 'H2') item.style.paddingLeft = '24px';
      if (tag === 'H3') item.style.paddingLeft = '36px';

      item.addEventListener('mouseenter', function () {
        item.style.background = THEMES[state.theme].tocHover;
      });
      item.addEventListener('mouseleave', function () {
        if (!item.classList.contains('toc-active')) {
          item.style.background = 'transparent';
        }
      });
      item.addEventListener('click', function () {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (window.matchMedia('(max-width: 1199px)').matches) {
          panel.style.display = 'none';
          overlay.style.display = 'none';
        }
      });

      items.push({ el: item, heading: heading });
      panel.appendChild(item);
    });

    state.tocItems = items.map(function (i) { return i.el; });

    var activeItem = null;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var match = items.find(function (i) { return i.heading === entry.target; });
          if (match) {
            if (activeItem) {
              activeItem.style.borderLeftColor = 'transparent';
              activeItem.style.fontWeight = 'normal';
              activeItem.style.background = 'transparent';
              activeItem.classList.remove('toc-active');
            }
            match.el.style.borderLeftColor = '#667eea';
            match.el.style.fontWeight = '600';
            match.el.style.background = THEMES[state.theme].tocHover;
            match.el.classList.add('toc-active');
            activeItem = match.el;
          }
        }
      });
    }, { rootMargin: '0px 0px -80% 0px', threshold: 0 });

    items.forEach(function (i) { observer.observe(i.heading); });

    var mql = window.matchMedia('(min-width: 1200px)');
    function handleWidth(e) {
      if (e.matches) {
        panel.style.display = 'block';
        tocBtn.style.display = 'none';
        overlay.style.display = 'none';
      } else {
        panel.style.display = 'none';
        tocBtn.style.display = 'flex';
      }
    }
    handleWidth(mql);
    mql.addEventListener('change', handleWidth);

    document.body.appendChild(panel);
    document.body.appendChild(tocBtn);
    document.body.appendChild(overlay);
  }

  function createProgressBar() {
    var progressBar = document.createElement('div');
    progressBar.style.position = 'fixed';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '3px';
    progressBar.style.width = '0%';
    progressBar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    progressBar.style.zIndex = '10001';
    progressBar.style.transition = 'width 0.1s linear';
    document.body.appendChild(progressBar);

    var ticking = false;
    function updateProgress() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var scrollHeight = document.documentElement.scrollHeight;
      var clientHeight = document.documentElement.clientHeight;
      if (scrollHeight <= clientHeight) {
        progressBar.style.display = 'none';
        return;
      }
      progressBar.style.display = 'block';
      var progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      progressBar.style.width = progress + '%';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateProgress();
          ticking = false;
        });
        ticking = true;
      }
    });

    updateProgress();
  }

  if (!isPlainTextPage()) return;

  var markdownText = getMarkdownText();
  if (!markdownText || markdownText.trim().length === 0) return;

  chrome.storage.local.get({ theme: 'light', immersive: false }, function (prefs) {
    renderMarkdown(markdownText, prefs);
  });
})();

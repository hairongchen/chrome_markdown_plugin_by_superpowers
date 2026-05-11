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
      bodyBg: '#ffffff',
      barBg: '#f6f8fa',
      barBorder: '1px solid #d0d7de',
      barColor: '#586069',
      btnBg: 'rgba(0,0,0,0.06)',
      btnHover: 'rgba(0,0,0,0.12)'
    },
    dark: {
      bodyBg: '#0d1117',
      barBg: '#161b22',
      barBorder: '1px solid #30363d',
      barColor: '#8b949e',
      btnBg: 'rgba(255,255,255,0.1)',
      btnHover: 'rgba(255,255,255,0.2)'
    }
  };

  var state = {
    theme: 'light',
    immersive: false,
    wrapper: null,
    bar: null,
    themeBtn: null,
    immersiveBtn: null
  };

  function applyTheme(theme) {
    state.theme = theme;
    var colors = THEMES[theme];

    document.body.style.backgroundColor = colors.bodyBg;

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
  }

  if (!isPlainTextPage()) return;

  var markdownText = getMarkdownText();
  if (!markdownText || markdownText.trim().length === 0) return;

  chrome.storage.local.get({ theme: 'light', immersive: false }, function (prefs) {
    renderMarkdown(markdownText, prefs);
  });
})();

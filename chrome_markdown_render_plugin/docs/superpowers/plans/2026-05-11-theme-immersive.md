# Theme Toggle & Immersive Reading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dark/light theme toggle and immersive reading mode to the Markdown Renderer Chrome extension, with persistent preferences via chrome.storage.

**Architecture:** Replace the light-only CSS with the full github-markdown-css (supports light/dark via `data-color-mode` attribute). Wrap the rendered article in a theme wrapper div. Add an `immersive.css` file for reading mode overrides triggered by a body class. Two floating buttons in the bottom-right control both features. Preferences persist in `chrome.storage.local` and load before rendering to avoid flicker.

**Tech Stack:** Chrome Extension Manifest V3, chrome.storage API, github-markdown-css (full version with dark theme), vanilla CSS + JavaScript

---

## File Structure

```
superpowers_chrome_plugin/
├── manifest.json            # Add "storage" permission, add immersive.css to content_scripts
├── content.js               # Add: wrapper div, theme switching, immersive toggle, floating buttons, storage read/write
├── github-markdown.css      # Replace: light-only → full version (light + dark via data-color-mode)
├── immersive.css            # Create: immersive reading mode style overrides
```

- `manifest.json` — adds `"permissions": ["storage"]` and `"immersive.css"` to the CSS array
- `content.js` — restructured to: read preferences from storage → render with correct theme → create floating buttons → handle toggle events → save preferences
- `github-markdown.css` — replaced with the full version from `github-markdown-css` npm package that supports `[data-color-mode]` attribute switching
- `immersive.css` — defines `.immersive-mode .markdown-body` overrides for narrower width, larger font, wider line-height

---

### Task 1: Update Manifest and Replace CSS

**Files:**
- Modify: `manifest.json`
- Replace: `github-markdown.css`
- Create: `immersive.css`

- [ ] **Step 1: Download full github-markdown-css**

Replace the light-only CSS with the full version that supports dark mode:

```bash
curl -L -o github-markdown.css https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.css
```

Verify it contains `data-color-mode`:

```bash
grep -c 'data-color-mode' github-markdown.css
```

Expected: a number greater than 0.

- [ ] **Step 2: Create immersive.css**

Create `immersive.css`:

```css
.immersive-mode .markdown-body {
  max-width: 680px;
  font-size: 20px;
  line-height: 1.8;
}

.immersive-mode .markdown-body p {
  margin-bottom: 24px;
}
```

- [ ] **Step 3: Update manifest.json**

The current `manifest.json` is:

```json
{
  "manifest_version": 3,
  "name": "Markdown Renderer",
  "version": "1.0.0",
  "description": "自动渲染 .md 文件为 GitHub 风格的 Markdown 页面",
  "content_scripts": [
    {
      "matches": ["*://*/*.md", "file://*/*.md"],
      "js": ["lib/marked.min.js", "content.js"],
      "css": ["github-markdown.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Update it to:

```json
{
  "manifest_version": 3,
  "name": "Markdown Renderer",
  "version": "1.1.0",
  "description": "自动渲染 .md 文件为 GitHub 风格的 Markdown 页面",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["*://*/*.md", "file://*/*.md"],
      "js": ["lib/marked.min.js", "content.js"],
      "css": ["github-markdown.css", "immersive.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Changes: added `"permissions": ["storage"]`, added `"immersive.css"` to the css array, bumped version to `1.1.0`.

- [ ] **Step 4: Commit**

```bash
git add manifest.json github-markdown.css immersive.css
git commit -m "feat: add dark theme CSS, immersive CSS, and storage permission"
```

---

### Task 2: Refactor renderMarkdown to Use Theme Wrapper

**Files:**
- Modify: `content.js`

This task restructures the rendering to wrap the article in a theme-aware div, and reads preferences from storage before rendering. The entire `content.js` must be replaced.

- [ ] **Step 1: Replace content.js**

Replace the entire content of `content.js` with:

```javascript
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
```

Key changes from the original:
- Added `THEMES` object with light/dark color values
- Added `state` object to track current state and DOM references
- Added `applyTheme(theme)` — sets `data-color-mode` on wrapper, updates bar/button colors
- Added `applyImmersive(immersive)` — toggles `immersive-mode` class on body
- Added `savePreferences()` — writes to `chrome.storage.local`
- `createMetadataBar` no longer sets colors inline (delegated to `applyTheme`)
- Added `createFloatingButtons()` — two buttons with click handlers
- `renderMarkdown` now accepts `preferences` and creates a wrapper div
- Main execution uses `chrome.storage.local.get` callback to load prefs before rendering

- [ ] **Step 2: Verify the file is syntactically valid**

```bash
node -c content.js
```

Expected: no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add content.js
git commit -m "feat: add theme toggle, immersive mode, floating buttons, and storage"
```

---

### Task 3: Manual Testing

**Files:**
- No file changes — testing only

- [ ] **Step 1: Test light theme (default)**

1. Reload extension in `chrome://extensions`
2. Open `tests/content.test.html`

Expected:
- Page renders with white background
- Metadata bar at top with light gray background (`#f6f8fa`)
- Two floating buttons in bottom-right corner
- Theme button shows `🌙`, immersive button shows `📖`

- [ ] **Step 2: Test dark theme toggle**

1. Click the `🌙` button

Expected:
- Background changes to `#0d1117` (dark)
- Markdown content switches to dark theme (light text on dark background)
- Metadata bar background changes to `#161b22`
- Theme button changes to `☀️`
- Floating button backgrounds become semi-transparent white

- [ ] **Step 3: Test immersive mode toggle**

1. Click the `📖` button

Expected:
- Content width narrows from 980px to 680px
- Font size increases to 20px
- Line spacing increases
- Button changes to `📄`

- [ ] **Step 4: Test preference persistence**

1. Set dark theme + immersive mode
2. Close the tab
3. Reopen `tests/content.test.html`

Expected:
- Page loads directly in dark theme + immersive mode (no flash of light theme)
- Buttons show `☀️` and `📄`

- [ ] **Step 5: Test theme toggle back to light**

1. Click `☀️` button

Expected:
- Background returns to white
- Content returns to light theme
- Button changes back to `🌙`

- [ ] **Step 6: Test immersive mode toggle off**

1. Click `📄` button

Expected:
- Content width returns to 980px
- Font size returns to 16px
- Button changes back to `📖`

- [ ] **Step 7: Test Chinese content**

Open `tests/test-chinese.html`.

Expected:
- Chinese content renders correctly in both light and dark themes
- Immersive mode works with Chinese text
- Metadata bar shows correct Chinese reading time

- [ ] **Step 8: Test rich page (should NOT render)**

Open `tests/test-rich-page.html`.

Expected:
- Page is NOT modified — no floating buttons, no metadata bar, original HTML intact

- [ ] **Step 9: Commit test verification note**

If all tests pass, no commit needed. If any test revealed a bug that was fixed, commit the fix.

# Markdown Renderer Chrome Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that automatically detects `.md` URLs and renders the raw Markdown as a GitHub-styled page with a metadata bar showing line count, character count, and estimated reading time.

**Architecture:** A Manifest V3 Chrome extension using a single content script injected on `*.md` URLs. The content script detects plain-text pages, parses Markdown with the `marked` library, and replaces the page body with rendered HTML styled by `github-markdown-css`. A fixed top bar displays document metadata.

**Tech Stack:** Chrome Extension Manifest V3, marked.js (Markdown parser), github-markdown-css, vanilla JavaScript

---

## File Structure

```
superpowers_chrome_plugin/
├── manifest.json            # Extension manifest (Manifest V3)
├── content.js               # Content script: detection, parsing, rendering, metadata
├── github-markdown.css      # GitHub-flavored Markdown styles
├── lib/
│   └── marked.min.js        # Bundled marked.js library
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── tests/
    └── content.test.html    # Manual test page for verifying rendering
```

- `manifest.json` — declares content script injection rules, icon paths, extension metadata
- `content.js` — all runtime logic: plain-text detection, Markdown extraction, parsing via `marked`, DOM replacement, metadata bar creation
- `github-markdown.css` — CSS for `.markdown-body` class, sourced from sindresorhus/github-markdown-css
- `lib/marked.min.js` — the `marked` Markdown parser, bundled for offline use
- `icons/` — extension icons at 16/48/128px
- `tests/content.test.html` — a local HTML file that simulates a plain-text `.md` page for manual testing

---

### Task 1: Project Scaffolding and Dependencies

**Files:**
- Create: `manifest.json`
- Create: `lib/marked.min.js`
- Create: `github-markdown.css`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p lib icons tests
```

- [ ] **Step 2: Download marked.min.js**

Download the latest `marked` library minified build and save to `lib/marked.min.js`:

```bash
curl -L -o lib/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js
```

Verify the file is valid JavaScript (not an HTML error page):

```bash
head -c 200 lib/marked.min.js
```

Expected: starts with JavaScript code like `/**` or `!function` or `(function`, not `<!DOCTYPE` or `<html`.

- [ ] **Step 3: Download github-markdown-css**

```bash
curl -L -o github-markdown.css https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown-light.css
```

Verify:

```bash
head -c 200 github-markdown.css
```

Expected: starts with CSS like `.markdown-body` selectors, not HTML.

- [ ] **Step 4: Create placeholder icons**

Generate simple SVG-based PNG icons. Use ImageMagick (`convert`) or a simple script. The icons are placeholders — a colored square with "MD" text:

```bash
for size in 16 48 128; do
  convert -size ${size}x${size} xc:'#0969da' \
    -gravity center -fill white -font DejaVu-Sans-Bold \
    -pointsize $((size / 3)) -annotate 0 'MD' \
    icons/icon${size}.png
done
```

If ImageMagick is not available, create minimal 1x1 PNG placeholders:

```bash
for size in 16 48 128; do
  python3 -c "
import struct, zlib
def png(w,h):
    raw = b''
    for y in range(h):
        raw += b'\x00' + b'\x09\x69\xda\xff' * w
    def chunk(t,d):
        c = t+d
        return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('icons/icon${size}.png','wb').write(png(${size},${size}))
"
done
```

Verify icons exist:

```bash
ls -la icons/
```

Expected: three PNG files at roughly expected sizes.

- [ ] **Step 5: Create manifest.json**

Write `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Markdown Renderer",
  "version": "1.0.0",
  "description": "自动渲染 .md 文件为 GitHub 风格的 Markdown 页面",
  "content_scripts": [
    {
      "matches": ["*://*/*.md", "*://*/*.md?*"],
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

- [ ] **Step 6: Create empty content.js placeholder**

```javascript
// Markdown Renderer - content script
(function () {
  'use strict';
})();
```

- [ ] **Step 7: Commit scaffolding**

```bash
git add manifest.json content.js github-markdown.css lib/marked.min.js icons/ tests/
git commit -m "feat: scaffold Chrome extension with dependencies"
```

---

### Task 2: Plain-Text Detection

**Files:**
- Modify: `content.js`
- Create: `tests/content.test.html`

- [ ] **Step 1: Create manual test page**

Create `tests/content.test.html` — a page that simulates how browsers render plain text files (wrapping content in a `<pre>` tag):

```html
<!DOCTYPE html>
<html>
<head><title>test.md</title></head>
<body>
<pre># Hello World

This is a **bold** paragraph.

- Item 1
- Item 2
- Item 3

## Code Example

```python
print("hello")
```

> A blockquote here.

[Link](https://example.com)
</pre>
</body>
</html>
```

- [ ] **Step 2: Implement plain-text detection in content.js**

Replace `content.js` with:

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

  if (!isPlainTextPage()) return;

  var markdownText = getMarkdownText();
  if (!markdownText || markdownText.trim().length === 0) return;

  console.log('[Markdown Renderer] Detected plain-text .md page, length:', markdownText.length);
})();
```

- [ ] **Step 3: Test detection manually**

Open `tests/content.test.html` in Chrome with the extension loaded (via `chrome://extensions` → Load unpacked). Open DevTools console.

Expected: console shows `[Markdown Renderer] Detected plain-text .md page, length: <number>`

- [ ] **Step 4: Commit**

```bash
git add content.js tests/content.test.html
git commit -m "feat: add plain-text page detection logic"
```

---

### Task 3: Markdown Parsing and DOM Replacement

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add rendering logic to content.js**

After the `console.log` line in `content.js`, add the rendering logic. Replace the entire IIFE with:

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

  function renderMarkdown(markdownText) {
    var html = marked.parse(markdownText);

    var article = document.createElement('article');
    article.className = 'markdown-body';
    article.innerHTML = html;

    document.body.innerHTML = '';
    document.body.appendChild(article);

    document.body.style.backgroundColor = '#ffffff';
    article.style.maxWidth = '980px';
    article.style.margin = '0 auto';
    article.style.padding = '45px';
  }

  if (!isPlainTextPage()) return;

  var markdownText = getMarkdownText();
  if (!markdownText || markdownText.trim().length === 0) return;

  renderMarkdown(markdownText);
})();
```

- [ ] **Step 2: Test rendering manually**

Reload the extension in `chrome://extensions`. Open `tests/content.test.html`.

Expected: the page shows a styled Markdown document with:
- "Hello World" as an h1 heading
- Bold text rendered
- Bullet list rendered
- Code block with gray background
- Blockquote with left border
- Clickable link

- [ ] **Step 3: Commit**

```bash
git add content.js
git commit -m "feat: add Markdown parsing and GitHub-styled rendering"
```

---

### Task 4: Metadata Bar

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add metadata computation functions**

Add these functions inside the IIFE in `content.js`, before `renderMarkdown`:

```javascript
function computeMetadata(text) {
  var lines = text.split('\n').length;
  var chars = text.length;
  var readingTime = estimateReadingTime(text);
  return { lines: lines, chars: chars, readingTime: readingTime };
}

function estimateReadingTime(text) {
  var chineseChars = (text.match(/[一-鿿]/g) || []).length;
  var totalChars = text.length;
  var isChinese = totalChars > 0 && (chineseChars / totalChars) > 0.3;

  if (isChinese) {
    return Math.max(1, Math.ceil(chineseChars / 400));
  } else {
    var words = text.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
    return Math.max(1, Math.ceil(words / 200));
  }
}
```

- [ ] **Step 2: Add metadata bar creation function**

Add this function inside the IIFE, after `estimateReadingTime`:

```javascript
function createMetadataBar(metadata) {
  var bar = document.createElement('div');
  bar.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'right: 0',
    'z-index: 10000',
    'background-color: #f6f8fa',
    'border-bottom: 1px solid #d0d7de',
    'padding: 6px 20px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    'font-size: 13px',
    'color: #586069',
    'text-align: center'
  ].join(';');

  var formattedChars = metadata.chars.toLocaleString();
  bar.textContent = '\u{1F4C4} ' + metadata.lines + ' 行  |  ✏️ ' +
    formattedChars + ' 字符  |  ⏱ 约 ' + metadata.readingTime + ' 分钟阅读';

  document.body.insertBefore(bar, document.body.firstChild);

  var barHeight = bar.offsetHeight;
  var article = document.querySelector('.markdown-body');
  if (article) {
    article.style.paddingTop = (45 + barHeight) + 'px';
  }
}
```

- [ ] **Step 3: Wire metadata into renderMarkdown**

Update the `renderMarkdown` function to accept and use metadata. Replace the entire function:

```javascript
function renderMarkdown(markdownText) {
  var html = marked.parse(markdownText);

  var article = document.createElement('article');
  article.className = 'markdown-body';
  article.innerHTML = html;

  document.body.innerHTML = '';
  document.body.appendChild(article);

  document.body.style.backgroundColor = '#ffffff';
  article.style.maxWidth = '980px';
  article.style.margin = '0 auto';
  article.style.padding = '45px';

  var metadata = computeMetadata(markdownText);
  createMetadataBar(metadata);
}
```

- [ ] **Step 4: Test metadata bar manually**

Reload the extension. Open `tests/content.test.html`.

Expected:
- A fixed gray bar at the top of the page showing something like: `📄 15 行  |  ✏️ 198 字符  |  ⏱ 约 1 分钟阅读`
- The bar stays fixed when scrolling
- The rendered content is not hidden behind the bar

- [ ] **Step 5: Commit**

```bash
git add content.js
git commit -m "feat: add fixed metadata bar with line count, chars, reading time"
```

---

### Task 5: End-to-End Testing

**Files:**
- Create: `tests/test-chinese.html`
- Create: `tests/test-rich-page.html`
- Create: `tests/test-empty.html`

- [ ] **Step 1: Create Chinese content test page**

Create `tests/test-chinese.html`:

```html
<!DOCTYPE html>
<html>
<head><title>chinese.md</title></head>
<body>
<pre># 中文测试

这是一段中文 Markdown 文本，用于测试中文阅读时间的计算。

## 功能列表

- 自动检测纯文本页面
- 将 Markdown 渲染为 GitHub 风格
- 显示元信息栏

> 这是一段引用文字，用来测试引用块的渲染效果。

**粗体文字** 和 *斜体文字* 的测试。
</pre>
</body>
</html>
```

- [ ] **Step 2: Create rich HTML page test (should NOT render)**

Create `tests/test-rich-page.html`:

```html
<!DOCTYPE html>
<html>
<head><title>already-rendered.md</title></head>
<body>
<div id="app">
  <nav>Navigation</nav>
  <main>
    <h1>Already Rendered Page</h1>
    <p>This page has rich HTML structure and should NOT be re-rendered by the extension.</p>
  </main>
</div>
</body>
</html>
```

- [ ] **Step 3: Create empty page test**

Create `tests/test-empty.html`:

```html
<!DOCTYPE html>
<html>
<head><title>empty.md</title></head>
<body>
<pre></pre>
</body>
</html>
```

- [ ] **Step 4: Test all scenarios**

Reload the extension and test each page:

1. **`tests/content.test.html`** — Expected: English Markdown rendered, metadata bar shows English reading time (words/200)
2. **`tests/test-chinese.html`** — Expected: Chinese Markdown rendered, metadata bar shows Chinese reading time (chars/400)
3. **`tests/test-rich-page.html`** — Expected: page is NOT modified, no metadata bar, original HTML intact
4. **`tests/test-empty.html`** — Expected: page is NOT modified (empty content skipped)

- [ ] **Step 5: Test on a real .md URL**

Navigate to a raw GitHub `.md` file, for example:
`https://raw.githubusercontent.com/marked-js/marked/master/README.md`

Expected: the raw Markdown text is replaced with a styled, readable page with a metadata bar at the top.

- [ ] **Step 6: Commit test files**

```bash
git add tests/
git commit -m "test: add manual test pages for Chinese, rich HTML, and empty cases"
```

---

### Task 6: Final Cleanup and Validation

**Files:**
- Review: all files

- [ ] **Step 1: Validate manifest.json**

```bash
python3 -c "import json; json.load(open('manifest.json')); print('Valid JSON')"
```

Expected: `Valid JSON`

- [ ] **Step 2: Check all files referenced in manifest exist**

```bash
for f in lib/marked.min.js content.js github-markdown.css icons/icon16.png icons/icon48.png icons/icon128.png; do
  test -f "$f" && echo "OK: $f" || echo "MISSING: $f"
done
```

Expected: all files show `OK`.

- [ ] **Step 3: Check file sizes are reasonable**

```bash
wc -c manifest.json content.js github-markdown.css lib/marked.min.js
```

Expected:
- `manifest.json`: ~400 bytes
- `content.js`: ~2-3 KB
- `github-markdown.css`: ~10-15 KB
- `lib/marked.min.js`: ~30-50 KB

- [ ] **Step 4: Final commit**

```bash
git add -A
git status
```

If there are uncommitted changes:

```bash
git commit -m "chore: final cleanup and validation"
```

- [ ] **Step 5: Verify extension loads in Chrome**

1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `superpowers_chrome_plugin` directory
5. Verify: no errors shown, extension icon appears in toolbar

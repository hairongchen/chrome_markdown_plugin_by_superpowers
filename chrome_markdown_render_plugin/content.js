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

  function createMetadataBar(metadata, article) {
    var bar = document.createElement('div');
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.right = '0';
    bar.style.zIndex = '10000';
    bar.style.background = '#f6f8fa';
    bar.style.borderBottom = '1px solid #d0d7de';
    bar.style.padding = '6px 20px';
    bar.style.fontSize = '13px';
    bar.style.color = '#586069';
    bar.style.textAlign = 'center';
    bar.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    bar.textContent = '📄 ' + metadata.lines + ' 行  |  ✏️ ' + metadata.chars.toLocaleString() + ' 字符  |  ⏱ 约 ' + metadata.readingTime + ' 分钟阅读';
    document.body.insertBefore(bar, document.body.firstChild);
    var barHeight = bar.offsetHeight;
    article.style.paddingTop = (45 + barHeight) + 'px';
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

    var metadata = computeMetadata(markdownText);
    createMetadataBar(metadata, article);
  }

  if (!isPlainTextPage()) return;

  var markdownText = getMarkdownText();
  if (!markdownText || markdownText.trim().length === 0) return;

  renderMarkdown(markdownText);
})();

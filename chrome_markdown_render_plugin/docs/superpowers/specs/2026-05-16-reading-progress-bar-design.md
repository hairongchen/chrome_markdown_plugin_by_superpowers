# 阅读进度条 - 设计文档

## 概述

为 Markdown Renderer 插件添加阅读进度条，固定在页面底部，随滚动显示当前阅读进度。

## 设计

### 位置与尺寸

- 固定在页面最底部（`position: fixed; bottom: 0`）
- 高度 3px，宽度随进度从 0% 到 100%
- `z-index: 10001`，与悬浮按钮同层

### 视觉风格

使用与元信息栏一致的蓝紫渐变，两个主题共用同一渐变色：

```
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
```

进度条始终使用该渐变色，不随主题切换变化。

### 滚动计算

```
progress = scrollTop / (scrollHeight - clientHeight) * 100
```

- 页面未滚动时宽度为 0%
- 滚动到底时宽度为 100%
- 内容不足一屏时隐藏进度条（`scrollHeight <= clientHeight`）

### 性能优化

使用 `requestAnimationFrame` 节流滚动事件，避免高频重绘：

```javascript
var ticking = false;
window.addEventListener('scroll', function () {
  if (!ticking) {
    requestAnimationFrame(function () {
      updateProgress();
      ticking = false;
    });
    ticking = true;
  }
});
```

## 代码变更

### 文件变更

```
content.js    # 新增 createProgressBar() 函数，在 renderMarkdown 末尾调用
```

### 新增函数

```javascript
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
```

### renderMarkdown 变更

在 `createFloatingButtons()` 调用之后添加 `createProgressBar()`。

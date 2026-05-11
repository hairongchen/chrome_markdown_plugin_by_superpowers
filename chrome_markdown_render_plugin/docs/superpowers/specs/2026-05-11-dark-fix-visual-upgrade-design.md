# 暗色主题修复与蓝色渐变视觉升级 - 设计文档

## 概述

1. 修复暗色主题切换后 Markdown 渲染区域背景仍为白色的 bug
2. 将元信息栏、悬浮按钮和页面背景升级为蓝色渐变风格

## Bug 修复：暗色主题不生效

### 根因

`github-markdown.css` 中暗色 CSS 变量定义被 `@media (prefers-color-scheme: dark)` 媒体查询包裹。只有当操作系统为暗色模式时，`[data-color-mode="dark"] .markdown-body` 选择器才会生效。当操作系统为亮色模式时，即使插件在 wrapper 上设了 `data-color-mode="dark"`，`.markdown-body` 内的 CSS 变量仍保持亮色值，导致渲染内容区域背景为白色。

### 修复方案

在 `github-markdown.css` 末尾追加两段独立的选择器（不在任何 `@media` 查询内）：

```css
/* 插件强制主题覆盖 — 不依赖操作系统偏好 */
[data-color-mode="dark"] .markdown-body {
  /* 复制 @media (prefers-color-scheme: dark) 内的全部 CSS 变量 */
}

[data-color-mode="light"] .markdown-body {
  /* 复制 @media (prefers-color-scheme: light) 内的全部 CSS 变量 */
}
```

这样无论操作系统什么模式，插件的 `data-color-mode` 属性都能强制切换主题。

## 视觉升级：蓝色渐变

### 元信息栏

替代现有的纯灰色背景，改为蓝紫渐变：

| 主题 | 背景渐变 | 文字颜色 |
|------|---------|---------|
| 亮色 | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | `#ffffff` |
| 暗色 | `linear-gradient(135deg, #1a1c2e 0%, #2d1b4e 100%)` | `#c9d1d9` |

边框移除（渐变背景下边框多余）。

### 悬浮按钮

改为蓝色系半透明 + 毛玻璃效果：

| 主题 | 默认背景 | Hover 背景 |
|------|---------|-----------|
| 亮色 | `rgba(102, 126, 234, 0.15)` | `rgba(102, 126, 234, 0.3)` |
| 暗色 | `rgba(102, 126, 234, 0.2)` | `rgba(102, 126, 234, 0.4)` |

额外样式：
- `backdrop-filter: blur(8px)` — 毛玻璃效果
- `-webkit-backdrop-filter: blur(8px)` — Safari 兼容

### 页面背景微妆

在 body 背景上叠加极淡的蓝色渐变，从顶部开始 200px 后过渡消失：

| 主题 | 背景 |
|------|------|
| 亮色 | `linear-gradient(180deg, #f0f4ff 0%, #ffffff 200px)` |
| 暗色 | `linear-gradient(180deg, #0d1320 0%, #0d1117 200px)` |

注意：使用 `background` 而非 `backgroundColor`，因为渐变需要 `background-image` 属性。

## 代码变更

### 文件变更

```
github-markdown.css    # 末尾追加独立的 data-color-mode 选择器
content.js             # 更新 THEMES 对象中的颜色值，按钮添加 backdrop-filter，body 背景改为渐变
```

### THEMES 对象更新

```javascript
var THEMES = {
  light: {
    bodyBg: 'linear-gradient(180deg, #f0f4ff 0%, #ffffff 200px)',
    barBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    barBorder: 'none',
    barColor: '#ffffff',
    btnBg: 'rgba(102, 126, 234, 0.15)',
    btnHover: 'rgba(102, 126, 234, 0.3)'
  },
  dark: {
    bodyBg: 'linear-gradient(180deg, #0d1320 0%, #0d1117 200px)',
    barBg: 'linear-gradient(135deg, #1a1c2e 0%, #2d1b4e 100%)',
    barBorder: 'none',
    barColor: '#c9d1d9',
    btnBg: 'rgba(102, 126, 234, 0.2)',
    btnHover: 'rgba(102, 126, 234, 0.4)'
  }
};
```

### applyTheme 变更

- `document.body.style.backgroundColor` 改为 `document.body.style.background`（支持渐变）
- 元信息栏的 `bar.style.borderBottom` 设为 `'none'`
- 按钮添加 `backdrop-filter: blur(8px)` 和 `-webkit-backdrop-filter: blur(8px)`

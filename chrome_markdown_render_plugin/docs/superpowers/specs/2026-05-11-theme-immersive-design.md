# 主题切换与沉浸式阅读 - 设计文档

## 概述

为 Markdown Renderer Chrome 插件添加两个增强功能：
1. 暗色/亮色主题切换
2. 沉浸式阅读模式（窄宽度 + 大字体 + 宽行距）

用户通过右下角悬浮按钮切换，偏好通过 `chrome.storage.local` 跨页面持久化。

## 需求

- **主题切换**：亮色/暗色两种主题，一键切换
- **沉浸式阅读**：窄内容宽度（680px）、大字体（20px）、宽行距（1.8）
- **控件位置**：右下角悬浮圆形按钮
- **偏好记忆**：用 `chrome.storage.local` 保存，下次打开 .md 文件自动应用

## 架构变更

### 文件变更

```
manifest.json              # 新增 storage 权限
content.js                 # 新增：主题切换、沉浸模式、悬浮按钮、storage 读写
github-markdown.css        # 替换为完整版（含 light + dark）
immersive.css              # 新增：沉浸式阅读样式覆盖
```

### Manifest 变更

添加 `storage` 权限和新增的 CSS 文件：

```json
{
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["*://*/*.md", "file://*/*.md"],
      "js": ["lib/marked.min.js", "content.js"],
      "css": ["github-markdown.css", "immersive.css"],
      "run_at": "document_idle"
    }
  ]
}
```

## 主题切换

### 实现方式

使用 `github-markdown-css` 完整版，通过 `data-color-mode` 属性控制主题：

```html
<!-- 亮色 -->
<div id="md-renderer-wrapper" data-color-mode="light" data-light-theme="light">
  <article class="markdown-body">...</article>
</div>

<!-- 暗色 -->
<div id="md-renderer-wrapper" data-color-mode="dark" data-dark-theme="dark">
  <article class="markdown-body">...</article>
</div>
```

### 配色方案

| 元素 | 亮色 | 暗色 |
|------|------|------|
| body 背景 | `#ffffff` | `#0d1117` |
| 元信息栏背景 | `#f6f8fa` | `#161b22` |
| 元信息栏边框 | `1px solid #d0d7de` | `1px solid #30363d` |
| 元信息栏文字 | `#586069` | `#8b949e` |
| 悬浮按钮背景 | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.1)` |
| 悬浮按钮 hover | `rgba(0,0,0,0.12)` | `rgba(255,255,255,0.2)` |

### 切换逻辑

1. 修改 wrapper 的 `data-color-mode` 属性
2. 更新 `document.body.style.backgroundColor`
3. 更新元信息栏颜色
4. 更新悬浮按钮样式
5. 更新按钮图标（亮色 → `🌙`，暗色 → `☀️`）
6. 保存到 `chrome.storage.local`

## 沉浸式阅读模式

### 样式参数

| 属性 | 普通模式 | 沉浸模式 |
|------|---------|---------|
| 内容宽度 max-width | 980px | 680px |
| 正文字体 font-size | 16px | 20px |
| 行高 line-height | 1.5 | 1.8 |
| 段落间距 margin-bottom | 16px | 24px |

### 实现方式

`immersive.css` 中定义样式覆盖：

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

切换时在 `<body>` 上 toggle `immersive-mode` 类。元信息栏不受影响。

## 悬浮按钮

### 位置与布局

- 固定在页面右下角，`position: fixed`
- 距底部 30px，距右侧 30px
- 两个按钮垂直排列，间距 10px
- 上方：主题切换按钮，下方：沉浸模式按钮

### 按钮样式

- 圆形，40px 直径
- 半透明背景（随主题变化）
- hover 时背景加深
- `cursor: pointer`
- `z-index: 10001`（高于元信息栏的 10000）
- `font-size: 18px`，居中显示 emoji

### 按钮状态

- 主题按钮：亮色模式显示 `🌙`，暗色模式显示 `☀️`
- 沉浸按钮：普通模式显示 `📖`，沉浸模式显示 `📄`

## 偏好持久化

### Storage 结构

```javascript
chrome.storage.local.set({
  theme: 'light' | 'dark',
  immersive: true | false
});
```

### 加载时序

1. 页面加载 → `isPlainTextPage()` 检测
2. 从 `chrome.storage.local` 读取偏好
3. 根据偏好执行渲染（主题 + 沉浸模式同时应用）
4. 创建悬浮按钮（按钮状态反映当前偏好）

读取 storage 使用回调方式确保偏好在渲染前就绑定，避免"先亮后暗"的闪烁。

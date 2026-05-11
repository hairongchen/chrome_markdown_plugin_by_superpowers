# Markdown Renderer Chrome Plugin - 设计文档

## 概述

一个 Chrome 插件，自动检测以 `.md` 结尾的 URL 页面，将其中的 Markdown 纯文本渲染为 GitHub 风格的格式化页面。

## 需求

- **触发条件**：用户访问以 `.md` 结尾的 URL 时自动渲染
- **Markdown 特性**：基础 Markdown（标题、粗体、斜体、链接、图片、列表、引用、代码块）
- **视觉风格**：GitHub 风格
- **交互**：无需原文切换按钮，直接替换渲染
- **元信息**：顶部悬浮栏显示行数、字符数、预估阅读时间

## 架构

采用 Content Script 直接替换方案。插件仅由 content script 和 CSS 组成，不需要 background script、popup、side panel 或 options page。

### 文件结构

```
superpowers_chrome_plugin/
├── manifest.json          # Chrome 插件清单 (Manifest V3)
├── content.js             # Content Script - 检测 + 渲染逻辑
├── github-markdown.css    # GitHub 风格的 Markdown 样式
├── lib/
│   └── marked.min.js      # Markdown 解析库（打包到插件中）
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 工作流程

1. 用户访问 `*.md` URL（如 `https://raw.githubusercontent.com/.../README.md`）
2. Chrome 根据 `manifest.json` 中的 URL 匹配规则自动注入 `content.js`
3. `content.js` 检查页面内容是否为纯文本
4. 用 `marked` 库将 Markdown 文本解析为 HTML
5. 替换页面 `<body>` 内容为渲染后的 HTML，并应用 `github-markdown.css`

## Manifest 配置

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

关键决策：

- **`matches` 模式**：`*://*/*.md` 匹配所有以 `.md` 结尾的 URL，`*://*/*.md?*` 覆盖带查询参数的情况
- **`run_at: document_idle`**：在页面 DOM 完全加载后再执行，确保能读到页面内容
- **`marked` 库打包**：不依赖 CDN，离线可用
- **最小权限**：不需要 `activeTab`、`storage` 等额外权限

## Content Script 逻辑

### 纯文本检测

不是所有 `.md` URL 都是纯文本（如 GitHub 非 raw 页面已经渲染过了）。检测策略：

- 检查 `<body>` 是否只包含一个 `<pre>` 元素（浏览器展示纯文本文件的默认方式）
- 或者 `<body>` 的子节点全是文本节点（无 HTML 结构）
- 如果页面已有丰富 HTML 结构（多个 div、nav 等），跳过渲染，避免破坏已渲染的页面

### 提取原始文本

从 `<pre>` 元素或 body 的 `textContent` 中提取 Markdown 原文。

### 解析并渲染

- 调用 `marked.parse(markdownText)` 生成 HTML
- 清空 `<body>`，插入一个 `<article class="markdown-body">` 容器
- 将生成的 HTML 放入容器中

### 安全

- `marked` 默认对 HTML 标签做转义处理，防止 XSS
- 不执行页面中嵌入的 `<script>` 标签

## 样式与排版

### 页面布局

- 白色背景区域居中
- `max-width: 980px`
- `margin: 0 auto`
- `padding: 45px`

### 样式来源

- 使用开源的 `github-markdown-css`（sindresorhus/github-markdown-css）
- 包括：标题层级、代码块背景色、表格、引用块、列表、分割线等
- 页面背景色 `#ffffff`，字体沿用 GitHub 的字体栈

### 代码块

- 基础 Markdown 不含语法高亮
- 代码块用灰色背景 + 等宽字体展示
- 语法高亮作为未来可选增强，当前不做

## 元信息栏

### 位置

固定在页面顶部（`position: fixed`），不随页面滚动消失。渲染内容区域顶部增加相应 padding，避免被悬浮栏遮挡。

### 显示内容

- **行数**：原始 Markdown 文本的行数
- **字符数**：原始 Markdown 文本的字符总数
- **预估阅读时间**：根据内容语言自动计算
  - 中文：按 400 字/分钟
  - 英文：按 200 词/分钟
  - 语言检测方式：统计中文字符占比，超过 30% 视为中文内容

### 样式

- 浅灰色背景（`#f6f8fa`），与 GitHub 风格协调
- 小字体（`13px`），灰色文字（`#586069`）
- 各项信息用分隔符 `|` 隔开
- 高度紧凑，不喧宾夺主

### 示例

```
📄 128 行  |  ✏️ 3,456 字符  |  ⏱ 约 9 分钟阅读
```

## 未来可选增强（当前不实现）

- 语法高亮（highlight.js）
- 亮色/暗色主题切换
- 原文/渲染切换按钮
- 目录生成（TOC）
- 纯文本页面的 Markdown 自动检测

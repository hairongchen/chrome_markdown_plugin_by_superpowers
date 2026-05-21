# Markdown Renderer

一个 Chrome 插件，自动将浏览器中打开的 `.md` 文件渲染为 GitHub 风格的格式化页面。

## 功能

- **自动渲染** — 访问以 `.md` 结尾的 URL 时，自动将纯文本 Markdown 渲染为格式化页面
- **GitHub 风格** — 使用 [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) 提供与 GitHub 一致的阅读体验
- **元信息栏** — 页面顶部固定显示行数、字符数和预估阅读时间（自动识别中英文）
- **暗色/亮色主题** — 右下角悬浮按钮一键切换，支持 GitHub 暗色主题
- **沉浸式阅读** — 右下角悬浮按钮开启沉浸模式（窄宽度 680px、大字体 20px、宽行距 1.8）
- **目录导航** — 自动提取 h1-h3 标题生成悬浮目录，点击跳转，当前位置高亮，窄屏自动收起为按钮
- **阅读进度条** — 页面底部蓝紫渐变进度条，实时显示阅读进度，内容不足一屏时自动隐藏
- **偏好记忆** — 主题和沉浸模式设置自动保存，下次打开 .md 文件时自动应用
- **支持本地文件** — 支持 `file://` 协议，可渲染本地 `.md` 文件
- **离线可用** — 所有依赖打包在插件内，无需网络连接

## 安装

1. 下载或克隆本仓库
2. 打开 Chrome，访问 `chrome://extensions`
3. 开启右上角 **「开发者模式」**
4. 点击 **「加载已解压的扩展程序」**
5. 选择本项目目录

### 启用本地文件支持

如需渲染本地 `.md` 文件（`file:///` 开头的路径）：

1. 在 `chrome://extensions` 中找到 **Markdown Renderer**
2. 点击 **「详情」**
3. 开启 **「允许访问文件网址」**

## 使用

安装后无需任何操作。访问任意 `.md` 文件 URL（如 GitHub Raw 文件），插件会自动检测并渲染。

### 悬浮按钮

页面右下角有两个悬浮按钮：

| 按钮 | 功能 | 切换状态 |
|------|------|---------|
| 🌙 / ☀️ | 主题切换 | 亮色 ↔ 暗色 |
| 📖 / 📄 | 沉浸模式 | 普通 ↔ 沉浸 |

## 项目结构

```
├── manifest.json          # Chrome 插件清单 (Manifest V3)
├── content.js             # 核心逻辑：检测、渲染、主题、沉浸模式
├── github-markdown.css    # GitHub Markdown 样式（含亮色/暗色）
├── immersive.css          # 沉浸式阅读样式覆盖
├── lib/
│   └── marked.min.js      # Markdown 解析库
├── icons/                 # 插件图标
└── tests/                 # 手动测试页面
```

## 技术栈

- Chrome Extension Manifest V3
- [marked.js](https://github.com/markedjs/marked) — Markdown 解析
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) — GitHub 风格样式
- `chrome.storage.local` — 偏好持久化

## 许可

MIT

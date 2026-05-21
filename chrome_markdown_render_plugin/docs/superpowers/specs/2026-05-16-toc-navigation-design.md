# 悬浮目录导航 (TOC) - 设计文档

## 概述

为 Markdown Renderer 插件添加悬浮目录导航面板，从渲染后的 Markdown 内容中提取 h1-h3 标题，固定在页面左侧，支持点击跳转和当前位置高亮。

## 设计

### 目录面板

- 固定在页面左侧（`position: fixed`），宽度 220px
- 顶部与元信息栏底部齐平，底部留出 30px 边距
- 内容超出时可滚动（`overflow-y: auto`）
- 提取渲染后的 h1、h2、h3 元素，h2 缩进 12px，h3 缩进 24px
- 无标题时不创建 TOC

### 点击跳转

点击目录项平滑滚动到对应标题位置：

```javascript
heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

### 当前位置高亮

使用 `IntersectionObserver` 监听所有标题元素，当标题进入视口时更新对应目录项的高亮状态。高亮样式为左侧蓝紫色边框 + 文字加粗。

### 视觉风格

半透明毛玻璃效果，与现有悬浮按钮风格统一：

| 主题 | 面板背景 | 文字颜色 | 高亮边框 |
|------|---------|---------|---------|
| 亮色 | `rgba(255, 255, 255, 0.85)` | `#24292f` | `#667eea` |
| 暗色 | `rgba(13, 17, 23, 0.85)` | `#c9d1d9` | `#667eea` |

额外样式：
- `backdrop-filter: blur(12px)` + `-webkit-backdrop-filter: blur(12px)`
- 圆角 `border-radius: 8px`
- 目录项 `padding: 4px 12px`，`font-size: 13px`
- hover 时背景色变化（亮色 `rgba(102, 126, 234, 0.1)` / 暗色 `rgba(102, 126, 234, 0.15)`）

### 响应式处理

- **宽屏（>= 1200px）**：左侧面板常驻显示
- **窄屏（< 1200px）**：面板隐藏，左下角显示悬浮按钮（📑），点击弹出覆盖层面板
- 通过 `window.matchMedia('(min-width: 1200px)')` 监听变化
- 覆盖层面板点击外部区域自动关闭

## 代码变更

### 文件变更

```
content.js    # 新增 createTOC()，扩展 THEMES 和 applyTheme
```

### THEMES 扩展

在 light 和 dark 对象中新增：

```javascript
light: {
  // ...existing...
  tocBg: 'rgba(255, 255, 255, 0.85)',
  tocColor: '#24292f',
  tocHover: 'rgba(102, 126, 234, 0.1)'
},
dark: {
  // ...existing...
  tocBg: 'rgba(13, 17, 23, 0.85)',
  tocColor: '#c9d1d9',
  tocHover: 'rgba(102, 126, 234, 0.15)'
}
```

### state 扩展

```javascript
state.tocPanel = null;
state.tocBtn = null;
```

### applyTheme 扩展

更新 TOC 面板和按钮的背景色、文字颜色。

### renderMarkdown 变更

在 `createProgressBar()` 之后调用 `createTOC()`。

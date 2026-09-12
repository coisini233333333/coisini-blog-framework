---
title: 从这里开始写作
description: 这是可删除的公开示例，用于演示 Markdown 与文章目录。
pubDate: 2026-01-01
category: technical
tags: [Astro, 示例]
sample: true
art: particles
---

## 创建你的内容包

把 `examples/site` 复制到仓库之外，在本地 `.env` 中设置 `SITE_CONTENT_DIR`。

## 修改文章

在内容包的 `blog/` 目录编写 Markdown；页面、目录、归档和 RSS 会随构建自动更新。

```typescript
const greeting: string = 'Hello, world!';
```

## 自定义外观

在 `site.json` 中替换标题和图片路径，在框架的 `src/styles/global.css` 中调整颜色和字体。

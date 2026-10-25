# 🌌 体验不同世界 · AI 人生模拟器提示词库

**线上地址：https://liyinwaihe.github.io/experience-different-worlds/**（GitHub Pages，免费托管）

104 个 AI 人生模拟器提示词的免费分享站：玄幻修仙、国漫国动、日漫、历史背景、影视、恐怖无限流、都市人生等 13 大分类，共约 299 万字完整设定。

复制提示词发给 [DeepSeek](https://chat.deepseek.com/)（建议快速模式 + 深度思考），即可开局。

## 网站功能

- 🗂 13 大分类浏览 + 数量统计
- 🔍 即时搜索（标题 / 分类 / 简介）
- 📋 一键复制提示词全文、下载 TXT
- 🎲 随机穿越
- 📱 手机端自适应
- 💾 存档 / 续档玩法教程 + 视频教程下载

## 目录结构

```
worlds-site/
├── index.html          # 单页站点入口
├── assets/
│   ├── style.css       # 样式（深色宇宙风）
│   ├── app.js          # 交互逻辑（无依赖原生 JS）
│   └── tutorial.mp4    # 视频教程
├── data/
│   ├── prompts.json    # 元数据索引
│   ├── prompts.js      # 同上的 JS 版（file:// 兼容）
│   └── texts.js        # 全部提示词文本（file:// 兜底用）
├── prompts/
│   └── p001.txt …      # 提示词全文（ASCII 文件名，URL 安全）
└── build.mjs           # 构建脚本：从源目录重新生成以上数据
```

## 更新内容后重建

把新的提示词 txt 放入源分享库的对应分类目录（`成品提示词/{分类}/{书名}.txt`），然后：

```bash
node build.mjs
```

脚本会自动扫描、提取标题/版本/摘要/字数并重新生成数据与文本文件。

## 本地预览

```bash
python -m http.server 8765
# 打开 http://127.0.0.1:8765/
```

> 直接双击 index.html 也能用（已内置 file:// 兜底），但推荐走 HTTP。

## 部署

纯静态站，任何静态托管都能直接用：GitHub Pages、Cloudflare Pages、Netlify、Vercel 等。详见《部署上线指南.md》。

## 免责声明

本站为 AI 玩法提示词的学习交流分享，全部免费。所涉作品 IP 归原著作权人所有，提示词均为爱好者二创，仅供个人娱乐，请勿用于商业用途。

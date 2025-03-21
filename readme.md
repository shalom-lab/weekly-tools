# Weekly Tools

[![Deploy to GitHub Pages](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml)
[![Fetch Daily Updates](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml)

🔗 在线访问：[https://shalom-lab.github.io/weekly-tools/](https://shalom-lab.github.io/weekly-tools/)

## 项目介绍

这是一个基于 Vue 3 开发的工具类网站，用于展示和搜索来自 [@ruanyf/weekly](https://github.com/ruanyf/weekly) 仓库 issues 中的工具推荐。项目每天凌晨自动抓取最新的工具分享，为开发者提供便捷的工具发现和搜索服务。

### 主要特点

- 🔄 每日自动更新数据
- 🔍 支持标题和内容搜索
- 📖 优雅的阅读体验
- ⚡️ 基于 Vite 构建，快速加载

### 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vite - 下一代前端构建工具
- GitHub Actions - 自动化工作流
- GitHub Pages - 静态网站托管
- Puppeteer - 网页内容抓取


## 自动化流程

项目使用 GitHub Actions 实现了两个自动化工作流：

### 1. 数据更新 (`fetch.yml`)
- ⏰ 定时：每天凌晨 2 点（UTC+8）自动运行
- 📥 功能：抓取最新的工具推荐
- 💾 存储：更新 weekly_issues.json 文件
- 🤖 自动提交：仅在有新数据时提交更新

### 2. 页面部署 (`deploy.yml`)
- 🔄 触发：代码推送到 main 分支或手动触发
- 🏗️ 流程：安装依赖 → 构建 → 部署
- 📤 输出：自动部署到 GitHub Pages
- 🔍 状态：可在 Actions 页面查看部署日志

## 功能特性

- 📝 工具列表展示
  - 时间倒序排列
  - 分页浏览
  - 自适应页面高度

- 🔍 搜索功能
  - 支持标题搜索
  - 支持内容搜索
  - 实时过滤

- 📱 响应式设计
  - 适配桌面端
  - 优化阅读体验
  - 美观的滚动效果

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 致谢

- 感谢 [@ruanyf](https://github.com/ruanyf) 的科技爱好者周刊
- 感谢所有为周刊投稿的贡献者
- 感谢所有开源工具的作者

## 许可证

[MIT License](LICENSE) © 2024-PRESENT shalom-lab


# Weekly Tools

[![Deploy to GitHub Pages](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml)
[![Fetch Daily Updates](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml)

🔗 [https://shalom-lab.github.io/weekly-tools/](https://shalom-lab.github.io/weekly-tools/) · 建议电脑端访问

聚合 [@ruanyf/weekly](https://github.com/ruanyf/weekly) Issues 里的「自荐 / 推荐」，支持搜索、评分与收藏。

## 功能

- 每日自动更新
- 标题 / 正文搜索，桌面双栏阅读
- 五星评分、收藏与时间筛选
- Issue 按年分片存储

## 数据

| 路径 | 说明 |
|------|------|
| `public/data/issues/` | Issue 分片（含正文与 HTML） |
| `public/data/user.json` | 评分与收藏 |

## 本地开发

```bash
npm install
npm run fetch
npm run dev
```

## 自动化

- `fetch.yml`：每日增量抓取
- `deploy.yml`：构建并部署到 GitHub Pages

## 致谢

感谢 [@ruanyf](https://github.com/ruanyf) 科技爱好者周刊，以及所有投稿者与开源作者。

## 许可证

[MIT License](LICENSE) © 2024-PRESENT shalom-lab

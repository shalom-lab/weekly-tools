# Weekly Tools

[![Deploy to GitHub Pages](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/deploy.yml)
[![Fetch Daily Updates](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml/badge.svg)](https://github.com/shalom-lab/weekly-tools/actions/workflows/fetch.yml)

🔗 [https://shalom-lab.github.io/weekly-tools/](https://shalom-lab.github.io/weekly-tools/) · 建议电脑端访问

聚合 [@ruanyf/weekly](https://github.com/ruanyf/weekly) Issues 里的「自荐 / 推荐」：搜索、五星评分、收藏，支持 BYOK 把个人数据写回仓库。

## 功能

- 每日自动更新（GitHub REST API）
- 标题 / 正文搜索，桌面双栏
- 评分 + 收藏（`public/data/user.json`，也可直接改文件）
- BYOK：本机 Token 同步评分/收藏
- Issue 按年分片，单文件近 40MB 再切分

## 数据文件

| 路径 | 说明 |
|------|------|
| `public/data/issues/manifest.json` | 分片索引 |
| `public/data/issues/*.json` | Issue 列表（含 `body` markdown + `html` 完整渲染结构，保留图片等） |
| `public/data/user.json` | `{ "ratings": { "1234": 5 }, "favorites": { "1234": true } }` |

## BYOK / localStorage

前端写仓库用的 Token **单独**存在浏览器里：

| Key | 用途 |
|-----|------|
| **`weekly-tools-github-token`** | GitHub PAT（必填才能同步） |
| `weekly-tools-settings` | 仓库 owner / name / branch 等 |

### 提前写入（推荐）

打开站点后，在控制台执行：

```js
localStorage.setItem('weekly-tools-github-token', 'ghp_你的Token')
```

然后刷新。应用启动时会先检测该 key；有值即可评分同步，不必再去「设置」里粘贴。

检查是否已写入：

```js
localStorage.getItem('weekly-tools-github-token')
```

清除：

```js
localStorage.removeItem('weekly-tools-github-token')
```

Token 权限：目标仓库的 **`contents:write`**。只存在本机，不会发到本站服务器。

也可在页面「设置」Tab 填写；旧版写在 `weekly-tools-settings.githubToken` 里的值会自动迁移到上面的独立 key。

## 本地开发

```bash
npm install
npm run fetch   # 爬虫用环境变量 GITHUB_TOKEN（与前端 BYOK 无关）
npm run dev
```

## 自动化

| Workflow | 时机 | 作用 |
|----------|------|------|
| `fetch.yml` | 每天北京时间 02:00 | API 增量抓取，有变更才提交 `public/data/issues` |
| `deploy.yml` | push `main` / 抓取成功后 | 构建并部署 GitHub Pages |

## 技术栈

Vue 3 · Vite · GitHub Actions / Pages · marked + DOMPurify

## 致谢

[@ruanyf](https://github.com/ruanyf) 科技爱好者周刊，以及所有投稿者与开源作者。

## 许可证

[MIT License](LICENSE) © 2024-PRESENT shalom-lab

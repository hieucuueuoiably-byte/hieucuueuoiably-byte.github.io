# GitHub Pages 部署

本站部署到 `hieucuueuoiably-byte/hieucuueuoiably-byte.github.io`，根目录网址为 `https://hieucuueuoiably-byte.github.io/`。源码仓库为公开仓库，压缩网页视频随网站一起发布。

## 自动发布

工作流位于 `.github/workflows/pages.yml`。推送到 `main` 后自动执行 `npm ci`、`npm run build:pages`，再发布 `dist` 到 GitHub Pages；拉取请求只做构建检查。构建失败时不会发布新版本。

仓库的 Settings → Pages → Source 使用 GitHub Actions。运行结果与最终发布地址在 Actions 和 Pages 页面查看。

## 路由处理

网站保留 BrowserRouter 和现有根目录资源路径。`scripts/build-github-pages.mjs` 从 `src/data/works.ts` 和 `src/data/categories.ts` 的字面量数据中读取作品 slug 和分类 id，为作品列表、关于页、分类页与作品页生成目录内的 `index.html`。新增作品会随下次构建生成入口，无需手工维护路由清单。

例如 `/works/film-0821/` 可直接打开并刷新。目录地址可能规范化为末尾带斜杠的形式，现有路由支持此形式。未知路径由 `404.html` 展示应用的 404 页面，HTTP 状态仍为 404。生成入口只是 SPA 加载入口，并非服务端渲染。

本方案要求根目录网址。若改用 `用户名.github.io/仓库名/`，需要同时适配 Vite base、BrowserRouter basename 和代码中的图片、纹理、视频、导航地址；当前工作流会阻止误用子目录部署。

## 本地验证

```powershell
npm ci
npm run build:pages
```

使用实际静态文件服务器验证 `dist`，或上线后确认首页、三个分类、18 条作品、关于页可直接打开和刷新，视频能播放与拖动进度。`vite preview` 的 SPA 回退行为不能单独证明 Pages 深层链接正常。

## 更新与恢复

修改后执行 `git add`、`git commit`、`git push origin main`。工作流完成后网站更新。

恢复某次更新：使用 `git revert <有问题的提交 SHA>`，再推送 `main`。新的恢复提交会触发部署。不要用强制推送替代正常版本恢复。

`node_modules`、`dist`、环境文件、Python 缓存和本地验收图片/录屏已忽略。原始影片与相邻的参考站归档、备份 ZIP 不在此仓库中。网站实际使用的 `public` 资源和现有来源说明保留。

## 可选域名

先在 GitHub Pages 设置中填写自己的域名，再按 GitHub 官方文档配置 DNS，证书就绪后启用 Enforce HTTPS。Actions 部署不需要手工添加 CNAME 文件。

参考：[GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite 静态部署](https://vite.dev/guide/static-deploy.html)、[Pages 容量与流量限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)、[自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。

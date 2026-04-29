# 星月舱部署说明

## 文件结构

```
xingyue/
├── index.html       # 主入口（精简版，含启动动画）
├── script.js        # 主代码（JSX）
├── style.css        # 样式
├── sw.js            # Service Worker — 离线缓存让二次启动秒开
└── manifest.json    # PWA 配置
```

## 部署步骤

1. 把这 5 个文件**全部上传**到 GitHub Pages 仓库的根目录（覆盖原来的 `index.html`）。
2. 等 GitHub Pages 部署完成（约 1-2 分钟）。
3. 在手机/电脑上打开网页，**第一次访问还是会慢**（要把所有资源缓存下来）。
4. **关掉页面再打开**——你会发现这次秒开 ✨。

## 以后改代码

只动 `script.js` 或 `style.css` 时——commit 完，**让 Service Worker 知道有新版**：

打开 `sw.js`，把第 4 行：
```js
const CACHE_VERSION = 'xingyue-v1';
```
改成：
```js
const CACHE_VERSION = 'xingyue-v2';   // 改了代码就 +1
```

下次用户打开页面，Service Worker 会自动清掉旧缓存、拉新版本。

## 常见问题

**Q: 首次访问还是白屏几秒？**
A: 这是 babel-standalone 的天生缺陷，首次必须下载 3MB 编译器。第二次起就秒开了。

**Q: 改了代码但页面还是老样子？**
A: 大概率是没改 `CACHE_VERSION`，浏览器还在用旧缓存。改了 `sw.js` 里那行版本号再 commit。

**Q: 想强制刷新看效果？**
A: 浏览器开发者工具 → Application → Service Workers → Unregister，再刷新页面。

**Q: 添加到主屏幕后显示什么图标？**
A: 紫色星形图标（manifest.json 里定义的 SVG）。

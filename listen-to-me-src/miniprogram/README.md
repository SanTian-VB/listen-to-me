# Listen to Me · 微信小程序侧

当前仓库的 **网页版**（`npm run dev` / `npm run build`）不能直接编译成小程序，这里是 **最小接入骨架**，用官方 `<web-view>` 打开你已部署的 **HTTPS H5**。

## 你需要准备

1. **微信小程序账号**：[微信公众平台](https://mp.weixin.qq.com/) 注册小程序，拿到 AppID。
2. **HTTPS 站点**：把 `npm run build` 后的 `dist` + 你的 Node `server`（或任意能托管静态页 + `/api` 的服务）部署到公网 **https://你的域名**。
3. **业务域名**：小程序后台 → 开发 → 开发管理 → 开发设置 → **业务域名**，添加该 https 域名，并按提示放置校验文件。
4. **修改工程**：把 `project.config.json` 里的 `appid` 改成你的真实 AppID。
5. **填写 H5 地址**：编辑 `pages/index/index.js` 顶部的 `H5_BASE`，例如 `https://listen.example.com`（不要带 `#` 路由，本站是单页直出即可）。

## 使用微信开发者工具

1.WeChat DevTools 打开本 `miniprogram` 目录。  
2. 详情 → 本地设置：按需勾选「不校验合法域名」（**仅开发调试用**；上线前必须配置好业务域名）。  
3. 编译运行；若 `H5_BASE` 为空，会显示占位提示。

## 重要限制（必读）

- **Web Speech API** 在微信内置浏览器 / `web-view` 里 **经常不可用或表现不一致**，可能出现「页面能开但无法朗读」。若实测无声，需要改为：**后端语音合成（TTS）返回音频** + 小程序 `InnerAudioContext` 播放，这与现有网页逻辑不同，要单独开发一版交互。
- **无法使用** 本仓库里在浏览器中跑的 `pdfjs-dist` / `mammoth` 的完整能力映射到小程序文件 API；继续依赖你已有的 **`/api/extract`** 最省事。

## 若不用 web-view（原生小程序）

需重写界面（WXML），文件选择用 `wx.chooseMessageFile` 等，文本走你的后端，朗读走 **云 TTS + 下载 mp3**。工作量和产品形态与当前 React 项目是 **另一套**，可在此骨架上逐步替换 `web-view` 页面。

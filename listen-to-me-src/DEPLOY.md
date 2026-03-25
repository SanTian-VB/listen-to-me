# Listen to Me 部署指南

## 📋 部署概览

| 组件 | 平台 | 域名示例 |
|------|------|---------|
| 前端 | Vercel | `https://xiaohai.vercel.app` |
| 后端 | Railway | `https://listen-to-me-xxx.up.railway.app` |

**总费用：免费**（Vercel 永久免费 + Railway 每月 $5 免费额度）

---

## 🚀 第一步：准备代码

### 1.1 下载部署包

我已经帮你准备好了部署配置，你需要下载整个 `listen-to-me-src` 文件夹。

### 1.2 上传到 GitHub

1. 在 GitHub 创建新仓库，如 `listen-to-me`
2. 将代码推送到仓库：
   ```bash
   cd listen-to-me-src
   git init
   git add .
   git commit -m "init: Listen to Me"
   git branch -M main
   git remote add origin https://github.com/你的用户名/listen-to-me.git
   git push -u origin main
   ```

---

## 🔧 第二步：部署后端到 Railway

### 2.1 注册 Railway

1. 访问 [Railway.app](https://railway.app/)
2. 点击 **Start with GitHub**，用 GitHub 账号登录
3. 授权 Railway 访问你的 GitHub 仓库

### 2.2 创建项目

1. 点击 **New Project**
2. 选择 **Deploy from GitHub repo**
3. 选择你刚才创建的 `listen-to-me` 仓库
4. Railway 会自动检测 Node.js 项目并开始部署

### 2.3 配置环境变量

在 Railway 项目页面：

1. 点击项目 → Settings → Variables
2. 添加环境变量：
   ```
   CORS_ORIGINS=https://xiaohai.vercel.app
   ```
   > 注意：这里的域名是你前端将要部署到的 Vercel 地址

### 2.4 获取后端地址

部署成功后：
1. 点击项目 → Settings → Domains
2. 点击 **Generate Domain** 生成域名
3. 复制生成的域名，如：`https://listen-to-me-abc123.up.railway.app`

### 2.5 验证后端

访问 `https://你的域名/api/health`，应该看到：
```json
{"ok":true,"service":"listen-to-me","version":"1.0.0"}
```

---

## 🎨 第三步：部署前端到 Vercel

### 3.1 注册 Vercel

1. 访问 [Vercel.com](https://vercel.com/)
2. 点击 **Sign Up**，用 GitHub 账号登录
3. 授权 Vercel 访问你的 GitHub 仓库

### 3.2 导入项目

1. 点击 **Add New...** → **Project**
2. 选择 `listen-to-me` 仓库
3. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（保持默认）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 配置环境变量

在项目设置页面：

1. 点击 **Environment Variables**
2. 添加：
   ```
   VITE_API_URL=https://你的Railway后端地址
   ```
   > 例如：`VITE_API_URL=https://listen-to-me-abc123.up.railway.app`

### 3.4 配置域名

1. 点击 **Deploy** 开始部署
2. 部署成功后，点击项目 → Settings → Domains
3. 你会看到默认域名 `xxx.vercel.app`
4. 点击 **Edit**，将域名改为 `xiaohai`（你想要的域名前缀）
5. 最终域名：`https://xiaohai.vercel.app`

### 3.5 更新后端 CORS

回到 Railway，更新环境变量：
```
CORS_ORIGINS=https://xiaohai.vercel.app
```
保存后 Railway 会自动重新部署。

---

## ✅ 第四步：验证部署

### 4.1 测试前端

访问 `https://xiaohai.vercel.app`，应该看到：
- 页面正常加载
- 左上角显示 "解析服务在线"（绿点）

### 4.2 测试文件上传

1. 上传一个 PDF 或 .docx 文件
2. 文件解析成功
3. 点击朗读，能听到声音

---

## 📱 使用方式

部署完成后，你可以通过以下方式访问：

| 设备 | 访问方式 |
|------|---------|
| 手机 | 浏览器打开 `https://xiaohai.vercel.app` |
| iPad | Safari 打开 `https://xiaohai.vercel.app` |
| 电脑 | 浏览器打开 `https://xiaohai.vercel.app` |
| 微信小程序 | 配置业务域名后用 web-view 加载 |

---

## 🔒 可选：微信小程序 web-view

如果你想在微信小程序中使用：

### 1. 配置业务域名

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 开发 → 开发管理 → 开发设置 → 业务域名
3. 添加 `xiaohai.vercel.app`
4. 下载校验文件，放到项目 `public/` 目录下

### 2. 创建小程序

1. 下载微信开发者工具
2. 创建新项目
3. 在 `pages/index/index.wxml` 中：
   ```html
   <web-view src="https://xiaohai.vercel.app/"></web-view>
   ```

---

## ❓ 常见问题

### Q: 后端部署失败？

检查 Railway 日志，常见问题：
- `PORT` 环境变量：Railway 自动设置，无需手动配置
- 内存不足：免费版有 512MB 限制，大文件解析可能失败

### Q: 前端显示 "离线解析"？

检查：
1. 后端是否正常运行
2. `VITE_API_URL` 是否正确配置
3. 后端 `CORS_ORIGINS` 是否包含前端域名

### Q: 文件上传失败？

检查：
1. 文件大小是否超过 1GB
2. 后端是否正常运行
3. 浏览器控制台是否有错误

---

## 🔄 后续更新

代码更新后：

```bash
git add .
git commit -m "update: 描述你的修改"
git push
```

Vercel 和 Railway 会自动检测并重新部署。

---

## 📞 需要帮助？

如果部署过程中遇到问题，把错误截图发给我，我帮你解决！

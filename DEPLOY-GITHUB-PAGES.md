# TradeOS V2.1 GitHub Pages 部署

## 1. GitHub
进入你的 `TradeOS` 仓库，点击 **Add file → Upload files**。

把本目录的全部文件上传到仓库根目录：
- index.html
- manifest.webmanifest
- sw.js
- icon.svg
- README.md
- DEPLOY-GITHUB-PAGES.md

不要上传 JSON 交易数据或任何私人记录。

## 2. 提交
页面底部选择 **Commit directly to the main branch**，点击 **Commit changes**。

## 3. 开启 Pages
仓库顶部点击：
**Settings → Pages**

在 **Build and deployment**：
- Source：**Deploy from a branch**
- Branch：**main**
- Folder：**/(root)**
- 点击 **Save**

等待约 1～几分钟。

## 4. iPad 安装
打开生成的：
`https://你的用户名.github.io/TradeOS/`

在 iPad Safari：
**分享 → 添加到主屏幕 → 添加**

之后从主屏幕打开 TradeOS。

## 数据隐私
代码放在 GitHub；交易记录不写入 GitHub。
本应用使用浏览器本地存储。不同设备、不同浏览器/网址通常是不同的数据空间。

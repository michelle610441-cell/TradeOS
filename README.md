# TradeOS V2.0 · iPad PWA

这是一个可部署到 GitHub Pages / Cloudflare Pages / Vercel 的静态 PWA。

## 使用
1. 将本目录所有文件上传到静态托管。
2. 用 iPad Safari 打开网站地址。
3. Safari 分享 → 添加到主屏幕。
4. 以后从桌面 TradeOS 图标进入。

## 数据
交易数据保存在浏览器 localStorage；不调用行情 API、不上传交易记录。
建议定期使用「导出JSON备份」。

## 说明
同花顺热度榜 Top 100 为手动输入排名，系统用“排名≤100”作为选股条件。

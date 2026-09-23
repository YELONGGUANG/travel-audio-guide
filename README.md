# 法西导览 · 旅行语音库

这是一个适合 iPhone 的静态 PWA。音频已放在 `audio/` 目录，打开页面后可以按国家、城市搜索，收藏景点并从上次进度继续播放。

## 在电脑上预览

在此目录启动任意静态服务器，例如：

```bash
python -m http.server 8080
```

然后用浏览器打开 `http://localhost:8080`。直接双击 HTML 也能播放音频，但“添加到主屏幕”和离线缓存需要通过 HTTP/HTTPS 访问。

## 放到 iPhone

将整个 `travel-audio-guide` 文件夹上传到任意静态托管服务（例如 GitHub Pages、Netlify 或你自己的服务器），用 Safari 打开网址，选择“分享 → 添加到主屏幕”。

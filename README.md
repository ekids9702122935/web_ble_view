# Web BLE View

這是一個用於監測藍牙設備信號強度的網頁應用。

## 功能特點

- 即時顯示藍牙設備的信號強度
- 支持設備過濾搜索
- 顯示設備更新次數統計
- 自動排序和顏色指示
- 支持重整圖表功能

## 使用方法

1. 訪問 [https://ekids9702122935.github.io/web_ble_view](https://ekids9702122935.github.io/web_ble_view)
2. 點擊「連接序列埠」按鈕
3. 選擇對應的序列埠設備
4. 等待數據顯示在圖表中

## 開發環境設置

```bash
# 克隆專案
git clone https://github.com/ekids9702122935/web_ble_view.git

# 安裝依賴
cd web_ble_view
npm install

# 啟動開發服務器
npm run dev
```

## 技術棧

- Next.js 14
- Chart.js
- Web Serial API
- Tailwind CSS

## 注意事項

- 需要使用支援 Web Serial API 的瀏覽器（如 Chrome）
- 需要有適當的硬體設備連接到序列埠
- 建議使用 HTTPS 連接以確保 Web Serial API 正常工作

## 授權

MIT License 
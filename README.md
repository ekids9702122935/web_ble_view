# Web BLE View

這是一個用於監測藍牙設備信號強度的網頁應用。

## 功能特點

- 即時顯示藍牙設備的信號強度
- 支持設備過濾搜索
- 顯示設備更新次數統計
- 自動排序和顏色指示
- 支持重整圖表功能

## 串口數據格式

應用程式期望接收以下格式的串口數據：
```
BLE_DEVICE:<mac地址>,<RSSI>,<名稱>,<廣播設備商數據>;
```

例如：
```
BLE_DEVICE:AA:BB:CC:DD:EE:FF,-75,MyDevice,0123456789;
```

### 數據欄位說明
- `<mac地址>`: 藍牙設備的 MAC 地址（格式：XX:XX:XX:XX:XX:XX）
- `<RSSI>`: 信號強度值（單位：dBm）
- `<名稱>`: 設備名稱
- `<廣播設備商數據>`: 設備廣播的原始數據（十六進制格式）

### 注意事項
- 每條數據必須以 "BLE_DEVICE:" 開頭
- 欄位之間使用逗號 (,) 分隔
- 每條數據以分號 (;) 結尾
- 確保串口波特率設置正確設置為115200

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
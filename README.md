# Web BLE View

一個用於即時監測藍牙設備信號強度的網頁應用，支援多種 BLE 資料格式解析與互動式圖表顯示。

## 主要功能

- **即時監測藍牙設備信號強度**：
  - 透過 Web Serial API 連接序列埠，解析多種藍牙資料格式，動態顯示所有掃描到的藍牙設備。
- **多格式資料解析**：
  - 支援原始 BLE_DEVICE 格式
  - 支援 (TYPE,MAC,[val1,val2]) 解析格式
  - 支援 PROFILE_JSON:FTMS,MAC,{json} 格式
- **互動式圖表顯示**：
  - 可切換「柱狀圖」與「折線圖」
  - 圖表顏色根據信號強度自動變化
  - 顯示設備名稱、MAC、RSSI、估算距離、更新次數
  - 折線圖可追蹤設備 RSSI 歷史變化
- **設備過濾與排序**：
  - 支援依名稱或 MAC 過濾
  - 可依 RSSI 強度或名稱排序
- **資料暫停/繼續、重整圖表**：
  - 可暫停/繼續資料更新
  - 一鍵重整圖表與統計
- **多種資料格式切換**：
  - 可選擇「原始格式」、「解析格式」、「連線格式」顯示
- **自動管理設備清單**：
  - 只顯示 30 秒內有更新的設備
  - 每台設備最多保留 50 筆 RSSI 歷史

## 技術棧

- Next.js 14
- React 18
- TypeScript 5
- Chart.js 4 + react-chartjs-2
- Tailwind CSS 3
- Web Serial API
- date-fns（時間軸顯示）
- chartjs-adapter-date-fns（折線圖時間軸）

## 使用方式

1. 訪問 [https://ekids9702122935.github.io/web_ble_view](https://ekids9702122935.github.io/web_ble_view)
2. 點擊「連接序列埠」按鈕
3. 選擇對應的序列埠設備
4. 等待數據顯示在圖表中

## 串口資料格式

應用程式支援以下格式的串口資料：

- 原始格式：
  ```
  BLE_DEVICE:<mac地址>,<RSSI>,<名稱>,<廣播設備商數據>;
  ```
- 解析格式：
  ```
  (TYPE,<mac地址>,[val1,val2,...]);
  ```
- Profile JSON 格式：
  ```
  PROFILE_JSON:FTMS,<mac地址>,{...};
  ```

- 每條資料以分號 (;) 結尾
- 波特率需設為 115200

## 注意事項

- 僅支援支援 Web Serial API 的瀏覽器（如 Chrome）
- 需有適當硬體設備連接到序列埠
- 建議使用 HTTPS 以確保序列埠權限

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

## 授權

MIT License 
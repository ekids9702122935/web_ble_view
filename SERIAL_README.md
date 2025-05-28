.. _ble_gateway_slave:

#####################
BLE 廣播掃描器 UART 轉發器
#####################

概述
*****

本專案實現了一個基於Nordic半導體平台的藍牙低功耗(BLE)和ANT+廣播掃描器。此設備能夠掃描周圍BLE和ANT+設備的廣播資訊，根據主機通過UART介面發送的過濾命令，將符合條件的設備資訊（包括設備名稱、MAC地址、RSSI值和製造商資料）透過UART介面轉發給主控系統。

功能需求
*********

1. 無線掃描功能需求
==============

* 掃描功能: 持續掃描周圍BLE和ANT+設備的廣播資訊
* 掃描間隔: 可自定義設定
* 資料過濾: 可根據設備名稱或設備ID進行過濾
* 資料收集: 收集設備名稱、ID、MAC地址、RSSI值和製造商資料
* 安全需求: 無需配對或加密，僅接收廣播資料
* [補充] 若設定BLE連線目標，會自動進行多連線管理，並持續重連。

2. UART通訊需求
==============

* 波特率: 115200
* 資料位元: 8
* 停止位元: 1
* 奇偶校驗: 無
* 流控制: 硬體流控(DTR)
* 通訊協議: 以下為UART命令集

UART命令集
----------

**從主機到設備的命令格式:**

.. code-block:: none

   <指令>:<參數1>,<參數2>,...;<結束符>\r\n

* 指令: 英文命令字串
* 參數: 根據指令類型提供的參數，以逗號分隔
* 結束符: 分號字符 ';'
* 以回車換行符號結尾 "\r\n"

**命令列表:**

1. 設定掃描模式(用於快速開始掃描，設定之後就啟動掃描)
   
   * 格式: "SYS_MODE:<模式>;"
   * 模式選項:
     - "OFF" - 停止所有掃描
     - "BLESCAN" - 僅掃描BLE裝置
     - "ANTSCAN" - 僅掃描ANT+裝置
     - "ALLSCAN" - 同時掃描BLE和ANT+裝置
     - "BLESCANPARSE" - BLE解析模式，當過濾的設備無法解析時，直接發送原始廣播數據
     - "BLECONN" - [新增] 啟動BLE多連線，連線到已設定的目標MAC
   * 範例: "SYS_MODE:BLECONN;\r\n" (啟動BLE多連線)
   * 回應: "SYS_MODE:OK;\r\n" (成功) 或 "SYS_MODE:ERROR;<錯誤訊息>;\r\n" (失敗)

2. 設定BLE掃描參數
   
   * 格式: "BLE_PARAMS:<掃描類型>,<掃描間隔>,<掃描窗口>,<過濾重複>,<報告間隔>;"
   * 參數說明:
     - 掃描類型: "PASSIVE"=被動掃描, "ACTIVE"=主動掃描
     - 掃描間隔: 整數值 (單位: ms, 範圍: 2.5-10000, 預設: 60)
     - 掃描窗口: 整數值 (單位: ms, 範圍: 2.5-10000, 預設: 50)
     - 過濾重複: "FILTER"=過濾重複廣播, "NO_FILTER"=不過濾重複廣播
     - 報告間隔: 整數值 (單位: ms, 範圍: 0-65535, 預設: 0 表示即時報告)
   * 範例: "BLE_PARAMS:ACTIVE,100,50,FILTER,1000;\r\n"
   * 回應: "BLE_PARAMS:OK;\r\n" (成功) 或 "BLE_PARAMS:ERROR;<錯誤訊息>;\r\n" (失敗)

3. 設定ANT+掃描參數
   
   * 格式: "ANT_PARAMS:<通道號碼>,<設備類型>,<頻率>,<通道週期>;"
   * 參數說明:
     - 通道號碼: 整數值 (範圍: 0-7)
     - 設備類型: 整數值或預設類型名稱，例如 "HRM"=心率監測器(120), "BIKE"=自行車功率計(11), "ALL"=0表示所有設備
     - 頻率: 整數值 (範圍: 0-124，對應2400-2524 MHz，預設: 57)
     - 通道週期: 整數值 (例如: 8192=4Hz, 4096=8Hz, 32768=1Hz)
   * 範例: "ANT_PARAMS:0,HRM,57,8192;\r\n"
   * 回應: "ANT_PARAMS:OK;\r\n" (成功) 或 "ANT_PARAMS:ERROR;<錯誤訊息>;\r\n" (失敗)

4. 設定BLE過濾設備名稱
   
   * 格式: "BLE_FILTER:<名稱1>,<名稱2>,...;"
   * 說明: 可一次發送多個設備名稱，以逗號分隔。只要掃描到的設備名稱「包含」任一過濾名稱，就會回傳資料
   * 範例: "BLE_FILTER:Sensor,Tag;\r\n" (過濾名稱包含"Sensor"和"Tag"的設備)
   * 回應: "BLE_FILTER:OK;\r\n" (成功) 或 "BLE_FILTER:ERROR;<錯誤訊息>;\r\n" (失敗)

4.1 查詢BLE過濾設備名稱

   * 格式: "BLE_FILTER_LIST;"
   * 說明: 查詢目前所有BLE過濾設備名稱
   * 範例: "BLE_FILTER_LIST;\r\n"
   * 回應: "BLE_FILTER_LIST:<名稱1>,<名稱2>,...;\r\n"

5. 設定ANT+過濾設備ID
   
   * 格式: "ANT_FILTER:<設備ID1>,<設備ID2>,...;"
   * 說明: 可一次發送多個設備ID，以逗號分隔。
   * 範例: "ANT_FILTER:12345,67890;\r\n" (過濾ID為12345和67890的設備)
   * 回應: "ANT_FILTER:OK;\r\n" (成功) 或 "ANT_FILTER:ERROR;<錯誤訊息>;\r\n" (失敗)

6. 設定RSSI閾值
   
   * 格式: "RSSI_THRESHOLD:<閾值>;"
   * 說明: 設定RSSI閾值，單位dBm，只有信號強度大於或等於此值的設備才會被報告
   * 範例: "RSSI_THRESHOLD:-70;\r\n" (只報告RSSI大於等於-70dBm的設備)
   * 回應: "RSSI_THRESHOLD:OK;\r\n" (成功) 或 "RSSI_THRESHOLD:ERROR;<錯誤訊息>;\r\n" (失敗)

7. 清除BLE過濾條件
   
   * 格式: "BLE_CLEAR_FILTER;"
   * 回應: "BLE_CLEAR_FILTER:OK;\r\n" (成功) 或 "BLE_CLEAR_FILTER:ERROR;<錯誤訊息>;\r\n" (失敗)

8. 清除ANT+過濾條件
   
   * 格式: "ANT_CLEAR_FILTER;"
   * 回應: "ANT_CLEAR_FILTER:OK;\r\n" (成功) 或 "ANT_CLEAR_FILTER:ERROR;<錯誤訊息>;\r\n" (失敗)

9. 啟動BLE掃描
   
   * 格式: "BLE_SCAN:<模式>;"
   * 模式選項: "START" 或 "STOP"
   * 範例: "BLE_SCAN:START;\r\n"
   * 回應: "BLE_SCAN:OK;\r\n" (成功) 或 "BLE_SCAN:ERROR;<錯誤訊息>;\r\n" (失敗)

10. 啟動ANT+掃描
    
    * 格式: "ANT_SCAN:<模式>;"
    * 模式選項: "START" 或 "STOP"
    * 範例: "ANT_SCAN:START;\r\n"
    * 回應: "ANT_SCAN:OK;\r\n" (成功) 或 "ANT_SCAN:ERROR;<錯誤訊息>;\r\n" (失敗)

11. 獲取系統狀態
    
    * 格式: "STATUS;\r\n"
    * 回應: "STATUS:BLE=<BLE狀態>,ANT=<ANT狀態>,RSSI=<RSSI閾值>;\r\n"
    * 狀態值:
      - BLE狀態: "IDLE"=未啟動, "SCANNING"=掃描中
      - ANT狀態: "IDLE"=未啟動, "SCANNING"=掃描中
      - RSSI閾值: 目前設定的RSSI閾值(dBm)

12. 重啟設備
    
    * 格式: "REBOOT;\r\n"
    * 說明: 觸發系統重啟，所有掃描將停止，設定將回到預設值
    * 回應: "REBOOT:OK;\r\n" (即將重啟) 或 "REBOOT:ERROR;<錯誤訊息>;\r\n" (重啟失敗)
    * 注意: 設備重啟後需重新配置所有參數

13. 版本信息
    
    * 格式: "VERSION;\r\n"
    * 回應: "VERSION:<主版本>.<次版本>.<修訂版本>\r\n"
    * 範例: "VERSION:1.0.0\r\n"

**新增BLE連線目標設定命令**

14. 設定BLE連線目標與Profile
   * 格式: "BLE_CONN:<MAC1>,<PROFILE1>;<MAC2>,<PROFILE2>;...;"
   * 範例: "BLE_CONN:AA:BB:CC:DD:EE:FF,FTMS;11:22:33:44:55:66,NUS;\r\n"
   * Profile名稱僅允許大寫字母，最大7字元
   * 回應: "BLE_CONN:OK;\r\n" (成功) 或 "BLE_CONN:ERROR;<錯誤訊息>;\r\n" (失敗)

15. 查詢BLE連線目標與Profile
   * 格式: "BLE_CONN_LIST;\r\n"
   * 回應: "BLE_CONN_LIST:<MAC1>,<PROFILE1>;<MAC2>,<PROFILE2>;...;\r\n"

16. 清除BLE連線目標
   * 格式: "BLE_CONN_CLEAR;\r\n"
   * 回應: "BLE_CONN_CLEAR:OK;\r\n"

17. 斷開所有BLE連線
   * 格式: "BLE_DISCONN_ALL;\r\n"
   * 回應: "BLE_DISCONN_ALL:OK;\r\n" (成功) 或 "BLE_DISCONN_ALL:ERROR;斷線失敗\r\n" (失敗)

**BLE連線目標自動儲存/恢復**
- 每次設定/清除/停止BLE連線目標時，會自動將目標（MAC+Profile）存入NVS。
- 開機時自動從NVS載入並恢復上次設定。
- [補充] 連線目標需至少1個，最多8個。每個連線皆獨立管理，意外斷線會自動重連。
- [補充] 連線後自動解析FTMS資料，僅回報關注欄位，並透過UART傳送。

**從設備到主機的資料格式:**

BLE設備資料格式:
.. code-block:: none

   一般模式:
   BLE_DEVICE:<MAC地址>,<RSSI>,<設備名稱>,<製造商資料>\r\n

   BLEPARSE模式下解析後的設備資料:
   BLE_PARSED:<解析後資料>\r\n
   
   解析後資料格式:
   (HRM,<MAC地址>,[<電池電量>,<心率>])                    // 心率監測器
   (JUMP,<MAC地址>,[<電池電量>,<跳床次數>,<間隔時間>])    // 跳床感測器
   (WALK,<MAC地址>,[<電池電量>,<相似度>,<步數>,<步頻>])   // 健走仗感測器
   (CADENCE,<MAC地址>,[<電池電量>,<每分鐘轉速>])          // 踏頻感測器
   (WTRAIN,<MAC地址>,[<電池電量>,<計數>,<休眠計數>,<TOF重量>,<重量長度>,<重量ID>,<TOF計數>,<初始長度>]) // 重訓感測器
   (TMILL,<MAC地址>,[<電源狀態>,<速度>,<接觸時間>,<SPM>,<步距>])        // 跑步機感測器
   (ELL,<MAC地址>,[<電源狀態>,<RPM>,<心率>])                // 橢圓機感測器

   .. BLEPARSE模式下無法解析的設備:
   .. BLE_RAW:<MAC地址>,<RSSI>,<完整廣播數據>\r\n

* MAC地址: 格式為 XX:XX:XX:XX:XX:XX
* RSSI: 信號強度，單位dBm，例如 -70
* 設備名稱: 設備廣播名稱，若無則為空字串
* 製造商資料: 十六進位格式的製造商資料，若無則為空字串
* 完整廣播數據: BLEPARSE模式下，當設備無法解析時，以十六進位格式輸出完整的廣播數據

解析後資料欄位說明:
* HRM (心率監測器):
  - 電池電量: 0-100 的整數值，表示電池剩餘電量百分比
  - 心率: 每分鐘心跳次數

* JUMP (跳床計數器):
  - 電池電量: 0-100 的整數值，表示電池剩餘電量百分比
  - 跳床次數: 累計跳床次數
  - 間隔時間: 跳床間隔時間，單位毫秒

* WALK (計步器):
  - 電池電量: 0-100 的整數值，表示電池剩餘電量百分比
  - 相似度: 步態相似度，範圍0-100
  - 步數: 累計步數
  - 步頻: 每分鐘步數

* CADENCE (踏頻感測器):
  - 電池電量: 0-100 的整數值，表示電池剩餘電量百分比
  - 每分鐘轉速: RPM值

* WTRAIN (重訓設備):
  - 電池電量: 0-100 的整數值，表示電池剩餘電量百分比
  - 計數: 重訓動作計數
  - 休眠計數: 設備休眠計數器
  - TOF重量: 重量感測器數值
  - 重量長度: 重量數據長度
  - 重量ID: 重量識別碼
  - TOF計數: TOF感測器計數
  - 初始長度: 初始數據長度

* TMILL (跑步機感測器):
  - 電源狀態: 1 byte，設備電源狀態
  - 速度: 2 bytes，Big Endian，單位依協議（如0.01km/h）
  - 接觸時間: 2 bytes，Big Endian，單位毫秒
  - SPM: 2 bytes，Big Endian，每分鐘步數
  - 步距: 1 byte，單位依協議（如公分）

* ELL (橢圓機感測器):
  - RPM: 1 byte，踏頻（每分鐘轉速）
  - 心率: 1 byte，心率
  - 電源狀態: 1 byte，若有則顯示，否則為68

ANT+設備資料格式:
.. code-block:: none

   ANT_DEVICE:<設備ID>,<設備類型>,<RSSI>,<頻道號碼>,<資料欄位1>,<資料欄位2>,...\r\n

* 設備ID: ANT+設備ID，例如 12345
* 設備類型: 設備類型編號或名稱，例如 HRM(120)
* RSSI: 信號強度，單位dBm，例如 -70
* 頻道號碼: ANT+使用的頻道號碼
* 資料欄位: 根據設備類型不同而變化的資料欄位

狀態訊息格式:
.. code-block:: none

   STATUS:<訊息類型>,<訊息內容>\r\n

* 訊息類型: "INFO", "WARNING", "ERROR"
* 訊息內容: 狀態訊息文字描述

3. 電源管理需求
==============

* 低功耗模式: 無特殊低功耗需求，持續運行掃描
* 喚醒條件: 不適用
* 電池監控: 不適用，使用外部供電

4. 其他硬體介面需求
=================

* GPIO: LED指示燈用於顯示系統狀態
* 感測器: 無
* 外部儲存: 無

LED指示燈狀態說明
----------------

本設備配備紅色和藍色兩個LED指示燈，用於指示系統不同狀態：

**紅色LED (系統狀態指示)**

* LED_OFF (關閉): 系統正常運行中
* LED_ON (常亮): 系統正在初始化/系統錯誤
* LED_SLOWBREATH (慢速呼吸): 系統待機模式(初始化完成，等待UART命令)

**藍色LED (掃描狀態指示)**

* LED_OFF (關閉): 未啟動掃描
* LED_ON (常亮): 系統正在初始化
* LED_SLOWBLINK (慢速閃爍): 正在掃描BLE設備
* LED_FASTBLINK (快速閃爍): 正在掃描ANT+設備
* LED_SLOWBREATH (慢速呼吸): 系統待機模式(初始化完成，等待UART命令)
* LED_FASTBREATH (快速呼吸): 正在掃描BLE和ANT+設備

這些LED狀態由系統自動控制，無需外部命令設定。本設備僅掃描藍牙廣播或ANT+廣播，不會與其他設備建立連線。

5. 韌體更新需求
=============

* OTA更新: 不支援
* 更新機制: 通過有線方式(SWD)更新

6. 診斷與除錯需求
===============

* 日誌等級: INFO
* 診斷介面: RTT和UART
* 自我測試: 開機自檢，檢查藍牙和UART功能


7. 非揮發性存儲功能
=================

系統使用 NVS（Non-Volatile Storage）來保存運作模式和設定參數，確保設備重啟後能夠恢復之前的設定。

存儲參數列表
-----------

1. 掃描模式設定 (ID: 0x0010)
   * 數據類型：uint16_t
   * 可能的值：
     - 0: UCM_SYS_MODE_OFF
     - 1: UCM_SYS_MODE_BLE_SCAN
     - 2: UCM_SYS_MODE_ANT_SCAN
     - 3: UCM_SYS_MODE_ALL_SCAN
     - 4: UCM_SYS_MODE_BLESCANPARSE

2. BLE 掃描參數 (ID: 0x0020)
   * 數據類型：結構體（共 6 bytes）
   * 包含：
     - scan_type (1 byte)
     - scan_interval (2 bytes)
     - scan_window (2 bytes)
     - filter_duplicate (1 byte)

3. ANT+ 掃描參數 (ID: 0x0030)
   * 數據類型：結構體（共 6 bytes）
   * 包含：
     - channel_number (1 byte)
     - device_type (1 byte)
     - rf_freq (1 byte)
     - channel_period (2 bytes)
     - network_number (1 byte)

4. RSSI 閾值 (ID: 0x0040)
   * 數據類型：int16_t
   * 範圍：-127 到 20 dBm

5. BLE 過濾名稱長度 (ID: 0x0050)
   * 數據類型：uint16_t
   * 存儲過濾名稱的總長度

6. BLE 過濾名稱數據 (ID: 0x0051)
   * 數據類型：字符串陣列
   * 最多存儲 BLE_FILTER_NAME_MAX_NUM 個名稱
   * 每個名稱最長 30 字符

7. ANT+ 過濾 ID (ID: 0x0060)
   * 數據類型：uint16_t 陣列
   * 最多存儲 5 個 ID

參數載入流程
----------

1. 系統啟動時，main.c 中的 load_stored_values() 函數會：
   * 讀取所有存儲的參數
   * 如果參數不存在，使用預設值
   * 使用讀取到的參數初始化各個模組

2. 參數更新時機：
   * 每次通過 UART 命令更改設定時
   * 在更改設定成功後立即存儲
   * 重啟後自動載入最後存儲的設定

預設參數值
---------

當存儲的參數無法讀取時，系統會使用以下預設值：

1. 掃描模式：UCM_SYS_MODE_OFF
2. BLE 掃描參數：
   * scan_type = 1 (主動掃描)
   * scan_interval = 0x0060 (60ms)
   * scan_window = 0x0050 (50ms)
   * filter_duplicate = 0
3. ANT+ 掃描參數：
   * channel_number = 0
   * device_type = 0 (所有設備)
   * rf_freq = 57
   * channel_period = 8192
   * network_number = 0
4. RSSI 閾值：-100 dBm
5. BLE 過濾名稱：{"Cade", "WTrain", "TMill", "WalkMate", "Jumpad", "HW"}
6. ANT+ 過濾 ID：空

錯誤處理
--------

1. 讀取失敗：
   * 記錄錯誤日誌
   * 使用預設值
   * 系統繼續運行

2. 寫入失敗：
   * 記錄錯誤日誌
   * 最多重試 3 次
   * 若仍然失敗，保持當前運行參數不變

硬體需求
*********

* 開發板: nRF52系列開發板
* 外部元件: 無特殊需求
* 電源需求: USB供電或3.3V外部供電

軟體需求
*********

* nRF Connect SDK 版本: v2.9.0或更高
* Zephyr RTOS 版本: 與nRF Connect SDK相容版本
* 其他相依性: 無

建置與燒錄
***********

1. 準備開發環境
==============

.. code-block:: console

   ##### 安裝nRF Connect SDK
   ##### 請參考Nordic官方文檔: https://developer.nordicsemi.com/

2. 建置專案
==========

.. code-block:: console

   ##### 建置專案
   west build -b nrf52832dk_nrf52832

3. 燻錄韌體
==========

.. code-block:: console

   ##### 燒錄韌體
   west flash

使用說明
*********

1. 初始設定
==========

* 將設備連接到電腦或主控系統
* 設定UART參數: 115200 8N1，硬體流控
* 發送啟動掃描命令(例如："BLE_SCAN:START;\r\n")

2. 操作流程
==========

* 發送設定過濾條件命令，設定要過濾的設備名稱或ID
* 設備將開始掃描並過濾符合條件的設備廣播
* 接收並解析設備傳回的設備廣播資料

3. 命令參考
==========

請參考上方UART命令集章節

故障排除
*********

* 無法接收廣播資料
  - 檢查是否已啟動掃描("BLE_SCAN:START;" 或 "ANT_SCAN:START;")
  - 檢查過濾條件是否正確
  - 確認周圍是否有符合條件的設備

* UART通訊問題
  - 檢查波特率設定
  - 檢查硬體連接
  - 檢查命令格式，確保以 ";\r\n" 結尾

已知問題
*********

* 暫無已知問題

未來計劃
*********

* 支援更多過濾條件，如UUID、服務資料等
* 優化掃描參數，提高掃描效率
* 增加電池供電支援

貢獻指南
*********

* 請提交問題報告或功能請求到專案儲存庫
* 提交程式碼前請確保通過所有測試

授權資訊
*********

* 本專案採用Nordic 5-Clause License

重大變更紀錄
************
- 新增BLE連線目標自動儲存與開機自動恢復功能。

**FTMS Profile 關注資料欄位**
-----------------------------

TREADMILL:
  - instantaneous_speed
  - total_distance
  - inclination
  - instantaneous_pace
  - total_energy
  - heart_rate
  - power_output

INDOOR_BIKE:
  - instantaneous_speed
  - instantaneous_cadence
  - total_distance
  - resistance_level
  - instantaneous_power
  - total_energy
  - heart_rate

ROWER:
  - stroke_rate
  - stroke_count
  - total_distance
  - instantaneous_pace
  - instantaneous_power
  - resistance_level
  - total_energy
  - heart_rate

CROSS_TRAINER:
  - instantaneous_speed
  - total_distance
  - stride_count
  - inclination
  - resistance_level
  - instantaneous_power
  - total_energy
  - heart_rate

**[新增] BLE多連線與連線管理功能補充說明**

- Gateway 除了原有的 BLE 廣播掃描與 UART 設定功能外，現已支援 BLE 多連線功能。
- 可透過 UART 命令設定最多 8 個目標 MAC（每個可指定 Profile，現支援 FTMS，未來可擴充）。
- 啟動連線後，gateway 會持續掃描並獨立嘗試連線到每個指定 MAC，並自動重連。
- 連線目標、狀態與參數會自動儲存於 NVS，開機自動恢復。
- 連線後自動解析 FTMS 資料，僅回報關注欄位，並透過 UART 傳送。
- 連線與掃描功能可同時存在，互不影響。

## 重大變更紀錄

### [2025-05-23]
- 修正 GATT discover 參數為 per-connection slot，避免多連線時 static/global discover params 被覆蓋導致崩潰。
- 將 discover params 移入 ble_connection_t 結構，並於連線時正確初始化與使用。

**[新增] BLE連線 Profile 解析後 UART JSON 格式**
---------------------------------------------

當 Gateway 以 BLE 連線方式連上設備並解析 profile（如 FTMS）後，會將重點資料以 JSON 格式透過 UART 傳送。

**格式說明：**

```
PROFILE_JSON:<PROFILE>,<MAC>,{<JSON物件>}\r\n
```
- <PROFILE>: Profile 名稱（如 FTMS、HRS...）
- <MAC>: 設備 MAC 地址
- <JSON物件>: 以 key-value 方式包含所有關注欄位，並**額外包含 rssi 欄位**

**範例（FTMS Treadmill）：**
```
PROFILE_JSON:FTMS,E0:FE:0B:0B:21:EB,{"instantaneous_speed":120,"total_distance":3500,"inclination":2,"instantaneous_pace":400,"total_energy":50,"heart_rate":110,"power_output":180,"rssi":-56}\r\n
```

- 欄位說明：
  - instantaneous_speed, total_distance, ...（依 profile 關注欄位）
  - rssi：目前連線的 RSSI 值（單位 dBm）

**說明：**
- 欄位順序不固定，主機端可直接以 JSON 解析。
- 欄位缺失時可省略。
- 支援 profile 擴充。
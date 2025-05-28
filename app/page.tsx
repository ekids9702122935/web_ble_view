'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { SignalChart } from '../components/SignalChart';
import { GatewayControlPanel } from '../components/GatewayControlPanel';

interface BluetoothDevice {
  name: string;
  rssi: number;
  macAddress: string;
  lastSeen: number;
  updateCount: number;
  rssiHistory: Array<{
    timestamp: number;
    rssi: number;
  }>;
}

export default function Home() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [port, setPort] = useState<SerialPort | null>(null);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  const [dataFormat, setDataFormat] = useState<'original' | 'new' | 'profile'>('original');
  const dataFormatRef = useRef(dataFormat);
  const [sortBy, setSortBy] = useState<'rssi' | 'name'>('rssi');
  const [gatewayResponse, setGatewayResponse] = useState('');

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => { dataFormatRef.current = dataFormat; }, [dataFormat]);

  // 過濾並排序設備列表
  const filteredDevices = devices
    .filter(device => 
      device.name.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(filterKeyword.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'rssi') {
        return b.rssi - a.rssi;
      } else {
        const nameA = a.name.trim();
        const nameB = b.name.trim();
        if (nameA === nameB) {
          return a.macAddress.localeCompare(b.macAddress);
        }
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

  const sortedDevices = useMemo(() => {
    const arr = dataFormat === 'new'
      ? filteredDevices.map(d => ({ ...d, rssi: d.updateCount }))
      : filteredDevices;
    return [...arr].sort((a, b) => {
      if (sortBy === 'rssi') {
        return b.rssi - a.rssi;
      } else {
        const nameA = a.name.trim();
        const nameB = b.name.trim();
        if (nameA === nameB) {
          return a.macAddress.localeCompare(b.macAddress);
        }
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      }
    });
  }, [filteredDevices, sortBy, dataFormat]);

  // 重整圖表並重置計數
  const refreshChart = () => {
    setDevices([]); // 清空裝置
    setLastUpdate(Date.now());
  };

  const connectSerial = async () => {
    try {
      console.log('正在嘗試連接序列埠...');
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });
      console.log('序列埠連接成功');
      setPort(port);
      readSerialData(port);
      
      // // 自動開始掃描
      // const writer = port.writable.getWriter();
      // await writer.write(new TextEncoder().encode('scan\n'));
      // writer.releaseLock();
      // console.log('掃描已自動開始');
    } catch (error) {
      console.error('連接序列埠時發生錯誤:', error);
    }
  };

  const readSerialData = async (port: SerialPort) => {
    console.log('開始讀取序列埠數據');
    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let bleConnListBuffer = '';
    let waitingForConnList = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('讀取完成');
          break;
        }

        const newData = decoder.decode(value);
        buffer += newData;
        console.log('serial newData:', newData);
        console.log('serial buffer:', buffer);

        // BLE_CONN_LIST 處理：累積直到 ;\r\n 結尾
        if (waitingForConnList) {
          bleConnListBuffer += newData;
          if (/;\r?\n/.test(bleConnListBuffer)) {
            setGatewayResponse(bleConnListBuffer.trim());
            bleConnListBuffer = '';
            waitingForConnList = false;
          }
          continue;
        }

        // 改善 gateway 命令回應偵測，並處理 ERROR 說明
        if (/(ERROR|OK|STATUS|REBOOT|VERSION|BLE_CONN_LIST|BLE_FILTER_LIST|BLE_CONN_CLEAR|BLE_DISCONN_ALL)/.test(newData)) {
          let resp = newData.trim();
          // 若為 ERROR，顯示詳細說明
          const errorMatch = resp.match(/ERROR;(.+)/);
          if (errorMatch) {
            resp = `錯誤：${errorMatch[1].trim()}`;
          }
          // 如果是 BLE_CONN_LIST 查詢，啟動累積模式
          if (/^BLE_CONN_LIST/.test(resp)) {
            bleConnListBuffer = resp;
            waitingForConnList = true;
            // 如果一包就結束，直接顯示
            if (/;\r?\n$/.test(resp)) {
              setGatewayResponse(resp);
              bleConnListBuffer = '';
              waitingForConnList = false;
            }
            continue;
          }
          setGatewayResponse(resp);
        }

        if (dataFormatRef.current === 'original') {
          // 原本格式解析
          const deviceEntries = buffer.split(';');
          buffer = deviceEntries.pop() || '';
          const currentTime = Date.now();
          const updatedDevices: BluetoothDevice[] = [];

          for (const entry of deviceEntries) {
            try {
              if (entry.trim().startsWith('BLE_DEVICE:')) {
                const [mac, rssi, name, manufacturerData] = entry
                  .replace('BLE_DEVICE:', '')
                  .split(',');
                if (mac && rssi && name) {
                  const currentTime = Date.now();
                  const newDevice = {
                    macAddress: mac.trim().toLowerCase(),
                    rssi: parseInt(rssi),
                    name: name.trim(),
                    lastSeen: currentTime,
                    updateCount: 1,
                    rssiHistory: [{
                      timestamp: currentTime,
                      rssi: parseInt(rssi)
                    }]
                  };
                  updatedDevices.push(newDevice);
                }
              }
            } catch (e) {
              console.error('解析設備數據時發生錯誤:', e);
            }
          }

          if (updatedDevices.length > 0 && !isPausedRef.current) {
            setDevices(prevDevices => {
              const newDevices = [...prevDevices];
              updatedDevices.forEach(updatedDevice => {
                const existingIndex = newDevices.findIndex(
                  d => d.macAddress.trim().toLowerCase() === updatedDevice.macAddress.trim().toLowerCase()
                );
                if (existingIndex >= 0) {
                  const existingDevice = newDevices[existingIndex];
                  newDevices[existingIndex] = {
                    ...updatedDevice,
                    updateCount: existingDevice.updateCount + 1,
                    rssiHistory: [
                      ...existingDevice.rssiHistory,
                      {
                        timestamp: currentTime,
                        rssi: updatedDevice.rssi
                      }
                    ].slice(-50)
                  };
                } else {
                  newDevices.push(updatedDevice);
                }
              });
              const activeDevices = newDevices.filter(
                device => currentTime - device.lastSeen <= 30000
              );
              return activeDevices;
            });
          }
        } else if (dataFormatRef.current === 'new') {
          // 用正則抓出所有 (TYPE,MAC,[val1,val2]) 片段
          const matches = buffer.match(/\([^()]+,[^()]+,\[[^\]]*\]\)/g) || [];
          buffer = buffer.replace(/\([^()]+,[^()]+,\[[^\]]*\]\)/g, ''); // 移除已處理的片段
          const currentTime = Date.now();
          const updatedDevices: BluetoothDevice[] = [];

          for (const match of matches) {
            try {
              const inner = match.slice(1, -1); // 去掉括號
              const [type, mac, values] = inner.split(',');
              if (mac) {
                const newDevice = {
                  macAddress: mac.trim().toLowerCase(),
                  rssi: 0,
                  name: type.trim(),
                  lastSeen: currentTime,
                  updateCount: 1,
                  rssiHistory: [{
                    timestamp: currentTime,
                    rssi: 0
                  }]
                };
                updatedDevices.push(newDevice);
              }
            } catch (e) {
              console.error('解析格式數據發生錯誤:', e);
            }
          }

          if (updatedDevices.length > 0 && !isPausedRef.current) {
            setDevices(prevDevices => {
              const newDevices = [...prevDevices];
              updatedDevices.forEach(updatedDevice => {
                const existingIndex = newDevices.findIndex(
                  d => d.macAddress.trim().toLowerCase() === updatedDevice.macAddress.trim().toLowerCase()
                );
                if (existingIndex >= 0) {
                  const existingDevice = newDevices[existingIndex];
                  newDevices[existingIndex] = {
                    ...existingDevice,
                    updateCount: existingDevice.updateCount + 1,
                    rssiHistory: [
                      ...existingDevice.rssiHistory,
                      {
                        timestamp: currentTime,
                        rssi: 0
                      }
                    ].slice(-50)
                  };
                } else {
                  newDevices.push(updatedDevice);
                }
              });
              const activeDevices = newDevices.filter(
                device => currentTime - device.lastSeen <= 30000
              );
              return activeDevices;
            });
          }
        } else if (dataFormatRef.current === 'profile') {
          // 解析 PROFILE_JSON:FTMS,MAC,{json}，支援連續資料
          const matches = buffer.match(/PROFILE_JSON:[^,]+,[^,]+,{[^}]+}/g) || [];
          buffer = buffer.replace(/PROFILE_JSON:[^,]+,[^,]+,{[^}]+}/g, ''); // 移除已處理的片段
          const currentTime = Date.now();
          const updatedDevices: BluetoothDevice[] = [];
          for (const entry of matches) {
            try {
              // PROFILE_JSON:FTMS,MAC,{json}
              const match = entry.match(/^PROFILE_JSON:[^,]+,([^,]+),({[^}]+})$/);
              if (match) {
                const mac = match[1].trim().toLowerCase();
                const jsonStr = match[2];
                const json = JSON.parse(jsonStr);
                if (mac && typeof json.rssi === 'number') {
                  const newDevice = {
                    macAddress: mac,
                    rssi: json.rssi,
                    name: mac, // 只顯示 mac
                    lastSeen: currentTime,
                    updateCount: 1,
                    rssiHistory: [{
                      timestamp: currentTime,
                      rssi: json.rssi
                    }]
                  };
                  updatedDevices.push(newDevice);
                }
              }
            } catch (e) {
              console.error('解析 PROFILE_JSON 數據時發生錯誤:', e);
            }
          }
          if (updatedDevices.length > 0 && !isPausedRef.current) {
            setDevices(prevDevices => {
              const newDevices = [...prevDevices];
              updatedDevices.forEach(updatedDevice => {
                const existingIndex = newDevices.findIndex(
                  d => d.macAddress.trim().toLowerCase() === updatedDevice.macAddress.trim().toLowerCase()
                );
                if (existingIndex >= 0) {
                  const existingDevice = newDevices[existingIndex];
                  newDevices[existingIndex] = {
                    ...updatedDevice,
                    updateCount: existingDevice.updateCount + 1,
                    rssiHistory: [
                      ...existingDevice.rssiHistory,
                      {
                        timestamp: currentTime,
                        rssi: updatedDevice.rssi
                      }
                    ].slice(-50)
                  };
                } else {
                  newDevices.push(updatedDevice);
                }
              });
              const activeDevices = newDevices.filter(
                device => currentTime - device.lastSeen <= 30000
              );
              return activeDevices;
            });
          }
        }
      }
    } catch (error) {
      console.error('讀取數據時發生錯誤:', error);
      setPort(null);
      setDevices([]);
      alert('序列埠連接已斷開，請重新連接');
    } finally {
      reader.releaseLock();
    }
  };

  useEffect(() => {
    return () => {
      if (port) {
        // 關閉前停止掃描
        const writer = port.writable.getWriter();
        writer.write(new TextEncoder().encode('stop\n'))
          .then(() => {
            writer.releaseLock();
            port.close();
          })
          .catch(console.error);
      }
    };
  }, [port]);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Gateway 設備監測</h1>
        {!port && (
          <button
            onClick={connectSerial}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-6"
          >
            連接序列埠
          </button>
        )}
        {/* Gateway 控制面板卡片在最上方 */}
        {port && (
          <div className="w-full mb-6">
            <GatewayControlPanel port={port} response={gatewayResponse} onSend={() => setGatewayResponse('')} />
          </div>
        )}
        {/* 控制列與設備數量顯示 */}
        {port && (
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="輸入設備名稱或MAC地址進行過濾..."
              style={{ width: '300px' }}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'rssi' | 'name')}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="rssi">依 RSSI 強度排序</option>
              <option value="name">依設備名稱排序</option>
            </select>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'bar' | 'line')}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="bar">柱狀圖</option>
              <option value="line">折線圖</option>
            </select>
            <button
              onClick={() => setIsPaused(p => !p)}
              className={`px-4 py-2 rounded text-white ${isPaused ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'}`}
            >
              {isPaused ? '繼續' : '暫停'}
            </button>
            <button
              onClick={refreshChart}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              重整圖表
            </button>
            <select
              value={dataFormat}
              onChange={e => setDataFormat(e.target.value as 'original' | 'new' | 'profile')}
              className="px-4 py-2 rounded text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:border-indigo-700"
            >
              <option value="original">原始格式</option>
              <option value="new">解析格式</option>
              <option value="profile">連線格式</option>
            </select>
            {devices.length > 0 && (
              <div className="text-sm text-gray-600">
                共找到 {devices.length} 個設備
                {filterKeyword && `, 符合條件 ${filteredDevices.length} 個`}
              </div>
            )}
          </div>
        )}
        {/* 圖表顯示在卡片下方 */}
        {filteredDevices.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <SignalChart 
              devices={sortedDevices}
              chartType={chartType}
              key={lastUpdate} 
            />
          </div>
        )}
      </div>
    </main>
  );
} 
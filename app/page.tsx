'use client';

import { useState, useEffect } from 'react';
import { SignalChart } from '../components/SignalChart';

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

  // 過濾設備列表
  const filteredDevices = devices.filter(device => 
    device.name.toLowerCase().includes(filterKeyword.toLowerCase()) ||
    device.macAddress.toLowerCase().includes(filterKeyword.toLowerCase())
  );

  // 重整圖表並重置計數
  const refreshChart = () => {
    setDevices(prevDevices => 
      prevDevices.map(device => ({
        ...device,
        updateCount: 0,  // 重置計數
        rssiHistory: chartType === 'line' ? [] : device.rssiHistory // 在折線圖模式下清除歷史數據
      }))
    );
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
      
      // 自動開始掃描
      const writer = port.writable.getWriter();
      await writer.write(new TextEncoder().encode('scan\n'));
      writer.releaseLock();
      console.log('掃描已自動開始');
    } catch (error) {
      console.error('連接序列埠時發生錯誤:', error);
    }
  };

  const readSerialData = async (port: SerialPort) => {
    console.log('開始讀取序列埠數據');
    const reader = port.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log('讀取完成');
          break;
        }

        const newData = decoder.decode(value);
        buffer += newData;
        
        // 分割多個設備數據
        const deviceEntries = buffer.split(';');
        // 保留最後一個可能不完整的條目
        buffer = deviceEntries.pop() || '';

        // 處理完整的設備數據
        const currentTime = Date.now();
        const updatedDevices: BluetoothDevice[] = [];

        for (const entry of deviceEntries) {
          try {
            if (entry.trim().startsWith('BLE_DEVICE:')) {
              // 移除 "BLE_DEVICE:" 前綴並分割數據
              const [mac, rssi, name, manufacturerData] = entry
                .replace('BLE_DEVICE:', '')
                .split(',');

              if (mac && rssi && name) {
                const newDevice = {
                  macAddress: mac,
                  rssi: parseInt(rssi),
                  name: name,
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

        if (updatedDevices.length > 0) {
          setDevices(prevDevices => {
            const newDevices = [...prevDevices];
            
            // 更新或添加新設備
            updatedDevices.forEach(updatedDevice => {
              const existingIndex = newDevices.findIndex(
                d => d.macAddress === updatedDevice.macAddress
              );
              
              if (existingIndex >= 0) {
                // 更新現有設備，保留並增加計數
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
                  ].slice(-50) // 只保留最近50筆記錄
                };
              } else {
                // 添加新設備
                newDevices.push(updatedDevice);
              }
            });

            // 移除超過30秒未更新的設備
            const activeDevices = newDevices.filter(
              device => currentTime - device.lastSeen <= 30000
            );

            return activeDevices;
          });
        }
      }
    } catch (error) {
      console.error('讀取數據時發生錯誤:', error);
      // 重置狀態
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
        <h1 className="text-2xl font-bold mb-4">藍牙設備信號強度監測</h1>
        
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {!port && (
              <button
                onClick={connectSerial}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                連接序列埠
              </button>
            )}
            
            {port && (
              <>
                <input
                  type="text"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                  placeholder="輸入設備名稱或MAC地址進行過濾..."
                  className="px-4 py-2 border border-gray-300 rounded w-64 focus:outline-none focus:border-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value as 'bar' | 'line')}
                    className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="bar">柱狀圖</option>
                    <option value="line">折線圖</option>
                  </select>
                  <button
                    onClick={refreshChart}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    重整圖表
                  </button>
                </div>
              </>
            )}
          </div>
          
          {port && devices.length > 0 && (
            <div className="text-sm text-gray-600">
              共找到 {devices.length} 個設備
              {filterKeyword && `, 符合條件 ${filteredDevices.length} 個`}
            </div>
          )}
        </div>

        {filteredDevices.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <SignalChart 
              devices={filteredDevices} 
              chartType={chartType}
              key={lastUpdate} 
            />
          </div>
        )}
      </div>
    </main>
  );
} 
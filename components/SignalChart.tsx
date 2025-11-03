'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo } from 'react';
import 'chartjs-adapter-date-fns';
import { zhTW } from 'date-fns/locale/zh-TW';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

interface SignalChartProps {
  devices: Array<{
    name: string;
    rssi: number;
    macAddress: string;
    updateCount: number;
    rssiHistory: Array<{
      timestamp: number;
      rssi: number;
    }>;
  }>;
  chartType: 'bar' | 'line';
  dataFormat?: 'original' | 'new' | 'profile' | 'allscanparse';
}

export function SignalChart({ devices, chartType, dataFormat = 'original' }: SignalChartProps) {
  const isHeartRateMode = dataFormat === 'allscanparse';
  
  // 預定義的顏色調色板，確保每個設備都有不同且易於區分的顏色
  const colorPalette = useMemo(() => [
    // 高對比、鮮明顏色（邊線 alpha 0.95）
    'rgba(230, 25, 75, 0.95)',   // 強紅
    'rgba(60, 180, 75, 0.95)',   // 強綠
    'rgba(0, 130, 200, 0.95)',   // 強藍
    'rgba(245, 130, 48, 0.95)',  // 強橙
    'rgba(145, 30, 180, 0.95)',  // 強紫
    'rgba(70, 240, 240, 0.95)',  // 青藍
    'rgba(240, 50, 230, 0.95)',  // 品紅
    'rgba(210, 245, 60, 0.95)',  // 螢光黃綠
    'rgba(250, 190, 190, 0.95)', // 淺粉
    'rgba(0, 128, 128, 0.95)',   // 水鴨
    'rgba(255, 215, 0, 0.95)',   // 金色
    'rgba(255, 99, 71, 0.95)',   // 番茄紅
    'rgba(0, 191, 255, 0.95)',   // 深天藍
    'rgba(34, 139, 34, 0.95)',   // 森林綠
    'rgba(138, 43, 226, 0.95)',  // 藍紫
  ], []);

  // 為設備分配固定顏色的函數（基於 MAC 地址的穩定分配）
  const getDeviceColor = useMemo(() => {
    const colorMap = new Map<string, string>();
    // 簡單的 hash 函數，將 MAC 地址轉換為索引
    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 轉換為 32 位整數
      }
      return Math.abs(hash);
    };
    return (deviceIndex: number, macAddress: string): string => {
      if (!colorMap.has(macAddress)) {
        // 使用 MAC 地址的 hash 來分配顏色，確保每個設備顏色穩定
        const colorIndex = hashString(macAddress) % colorPalette.length;
        const color = colorPalette[colorIndex];
        colorMap.set(macAddress, color);
      }
      return colorMap.get(macAddress)!;
    };
  }, [colorPalette]);

  // 將 RSSI 值轉換為 0-100 的信號強度
  const normalizeRSSI = (rssi: number): number => {
    const min = -100;
    const max = -30;
    return Math.max(0, Math.min(100, ((rssi - min) / (max - min)) * 100));
  };

  // 將心率值轉換為 0-100 的強度（心率範圍 40-200）
  const normalizeHeartRate = (heartRate: number): number => {
    const min = 40;
    const max = 200;
    return Math.max(0, Math.min(100, ((heartRate - min) / (max - min)) * 100));
  };

  // 根據 RSSI 估算距離（米）
  const estimateDistance = (rssi: number): number => {
    const A = -60; // 1米處的RSSI值
    const n = 2.5;  // 環境衰減因子
    return Math.round(Math.pow(10, (Math.abs(rssi) - Math.abs(A)) / (10 * n)) * 10) / 10;
  };

  // 根據信號強度生成顏色（僅用於柱狀圖）
  const getSignalColor = (strength: number): string => {
    const hue = (strength * 1.2);
    return `hsla(${hue}, 70%, 50%, 0.8)`;
  };

  // 創建柱狀圖數據
  const barData = {
    labels: devices.map(device => {
      const name = device.name || '未知設備';
      const rssi = device.rssi;
      const count = device.updateCount;
      
      if (isHeartRateMode) {
        return [
          `${name} `, 
          `(心率: ${rssi} BPM, ${count}次)`
        ];
      } else {
        const distance = estimateDistance(rssi);
        return [
          `${name} `, 
          `(${rssi} dBm, ~${distance}m, ${count}次)`
        ];
      }
    }),
    datasets: [{
      data: devices.map(device => 
        isHeartRateMode 
          ? device.rssi // 直接使用心率值（BPM）
          : normalizeRSSI(device.rssi)
      ),
      backgroundColor: devices.map(device => 
        isHeartRateMode 
          ? getSignalColor(normalizeHeartRate(device.rssi))
          : getSignalColor(normalizeRSSI(device.rssi))
      ),
      borderColor: devices.map(device => 
        isHeartRateMode 
          ? getSignalColor(normalizeHeartRate(device.rssi))
          : getSignalColor(normalizeRSSI(device.rssi))
      ),
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.8,
      categoryPercentage: 0.9
    }]
  };

  // 創建折線圖數據（使用 useMemo 穩定數據結構，避免閃爍）
  const lineData = useMemo(() => ({
    datasets: devices.map((device, index) => {
      const deviceColor = getDeviceColor(index, device.macAddress);
      return {
        label: device.name || '未知設備',
        data: device.rssiHistory.map(history => ({
          x: history.timestamp,
          y: isHeartRateMode 
            ? history.rssi // 使用心率原始值
            : normalizeRSSI(history.rssi)
        })),
        borderColor: deviceColor,
        backgroundColor: deviceColor.replace('0.95', '0.18'), // 邊線高對比，填充淡化
        tension: 0.4,
        pointRadius: 3, // 稍大點以搭配強烈顏色
        pointHoverRadius: 6, // hover時放大
        borderWidth: 3,
        fill: false,
        pointBackgroundColor: deviceColor,
        pointBorderColor: '#ffffff', // 白色邊框增加對比
        pointBorderWidth: 1
      };
    })
  }), [devices, isHeartRateMode, getDeviceColor]);

  // 柱狀圖配置
  const barOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        callbacks: {
          label: (context: any) => {
            const device = devices[context.dataIndex];
            if (isHeartRateMode) {
              return [
                `ID: ${device.macAddress}`,
                `心率: ${device.rssi} BPM`,
                `更新次數: ${device.updateCount}次`
              ];
            } else {
              const distance = estimateDistance(device.rssi);
              return [
                `MAC: ${device.macAddress}`,
                `RSSI: ${device.rssi} dBm`,
                `估算距離: ${distance} 公尺`,
                `信號強度: ${context.raw.toFixed(1)}%`,
                `更新次數: ${device.updateCount}次`
              ];
            }
          }
        }
      }
    },
    scales: {
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 14,
            weight: 700
          },
          color: (context) => {
            const index = context.index;
            if (index !== undefined && index >= 0 && index < devices.length) {
              const parts = context.tick.label;
              if (Array.isArray(parts) && parts.length === 2) {
                if (context.tick.label === parts[1]) {
                  return isHeartRateMode
                    ? getSignalColor(normalizeHeartRate(devices[index].rssi))
                    : getSignalColor(normalizeRSSI(devices[index].rssi));
                }
              }
            }
            return 'rgba(0, 0, 0, 0.9)';
          },
          callback: (value, index) => {
            const parts = barData.labels[index];
            if (Array.isArray(parts)) {
              return parts;
            }
            return '';
          }
        }
      },
      x: {
        beginAtZero: true,
        max: isHeartRateMode 
          ? Math.max(120, Math.min(220, Math.max(...devices.map(d => d.rssi)) + 10))
          : 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1
        },
        border: {
          color: 'rgba(0, 0, 0, 0.3)'
        },
        ticks: {
          font: {
            size: 12
          },
          color: 'rgba(0, 0, 0, 0.7)',
          callback: (value: number) => isHeartRateMode ? `${value}` : `${value}%`
        },
        title: {
          display: true,
          text: isHeartRateMode ? '心率 (BPM)' : '信號強度',
          color: 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: { top: 10, bottom: 10 }
        }
      }
    },
    animation: {
      duration: 0 // 禁用動畫以減少閃爍，實現即時順暢更新
    }
  };

  // ALLSCANPARSE：動態計算折線圖 Y 軸範圍（依歷史心率值）
  const heartRateRange = useMemo(() => {
    if (!isHeartRateMode) return null;
    const values: number[] = [];
    for (const d of devices) {
      for (const h of d.rssiHistory) {
        if (typeof h.rssi === 'number' && !Number.isNaN(h.rssi)) {
          values.push(h.rssi);
        }
      }
    }
    if (values.length === 0) return { min: 40, max: 120 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, max };
  }, [devices, isHeartRateMode]);

  // 折線圖配置
  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'second',
          displayFormats: {
            second: 'HH:mm:ss'
          },
          tooltipFormat: 'yyyy/MM/dd HH:mm:ss'
        },
        adapters: {
          date: {
            locale: zhTW
          }
        },
        title: {
          display: true,
          text: '時間',
          color: 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      y: {
        beginAtZero: isHeartRateMode ? false : true,
        min: isHeartRateMode ? Math.max(30, (heartRateRange?.min ?? 40) - 10) : undefined,
        max: isHeartRateMode ? Math.min(240, (heartRateRange?.max ?? 120) + 10) : 100,
        title: {
          display: true,
          text: isHeartRateMode ? '心率 (BPM)' : '信號強度 (%)',
          color: 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    },
    animation: {
      duration: 0 // 禁用動畫以減少閃爍，實現即時順暢更新
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  };

  // 計算合適的容器高度
  const containerHeight = chartType === 'bar' 
    ? Math.max(600, devices.length * 50 + 200)
    : 600;

  if (devices.length === 0) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center bg-white p-4 rounded-lg">
        <p className="text-gray-500 text-xl">尚未掃描到任何設備</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-[${containerHeight}px] relative bg-white p-6 rounded-lg`}>
      <h2 className="text-center text-2xl font-bold mb-6">
        {dataFormat === 'allscanparse' ? '設備心率監測器' : '設備信號強度顯示器'}
      </h2>
      <div className="w-full" style={{ height: `${containerHeight - 100}px` }}>
        {chartType === 'bar' ? (
          <Bar data={barData} options={barOptions} />
        ) : (
          <Line data={lineData} options={lineOptions} />
        )}
      </div>
    </div>
  );
} 
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
}

export function SignalChart({ devices, chartType }: SignalChartProps) {
  // 將 RSSI 值轉換為 0-100 的信號強度
  const normalizeRSSI = (rssi: number): number => {
    const min = -100;
    const max = -30;
    return Math.max(0, Math.min(100, ((rssi - min) / (max - min)) * 100));
  };

  // 根據 RSSI 估算距離（米）
  const estimateDistance = (rssi: number): number => {
    const A = -60; // 1米處的RSSI值
    const n = 2.5;  // 環境衰減因子
    return Math.round(Math.pow(10, (Math.abs(rssi) - Math.abs(A)) / (10 * n)) * 10) / 10;
  };

  // 根據信號強度生成顏色
  const getSignalColor = (strength: number): string => {
    const hue = (strength * 1.2);
    return `hsla(${hue}, 70%, 50%, 0.8)`;
  };

  // 按信號強度排序設備（從強到弱）
  const sortedDevices = [...devices].sort((a, b) => b.rssi - a.rssi);

  // 創建柱狀圖數據
  const barData = {
    labels: sortedDevices.map(device => {
      const name = device.name || '未知設備';
      const rssi = device.rssi;
      const count = device.updateCount;
      const distance = estimateDistance(rssi);
      return [
        `${name} `, 
        `(${rssi} dBm, ~${distance}m, ${count}次)`
      ];
    }),
    datasets: [{
      data: sortedDevices.map(device => normalizeRSSI(device.rssi)),
      backgroundColor: sortedDevices.map(device => getSignalColor(normalizeRSSI(device.rssi))),
      borderColor: sortedDevices.map(device => getSignalColor(normalizeRSSI(device.rssi))),
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.8,
      categoryPercentage: 0.9
    }]
  };

  // 創建折線圖數據
  const lineData = {
    datasets: sortedDevices.map(device => ({
      label: device.name || '未知設備',
      data: device.rssiHistory.map(history => ({
        x: history.timestamp,
        y: normalizeRSSI(history.rssi)
      })),
      borderColor: getSignalColor(normalizeRSSI(device.rssi)),
      backgroundColor: getSignalColor(normalizeRSSI(device.rssi)),
      tension: 0.4,
      pointRadius: 2,
      borderWidth: 2,
      fill: false
    }))
  };

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
            const device = sortedDevices[context.dataIndex];
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
            if (index !== undefined && index >= 0 && index < sortedDevices.length) {
              const parts = context.tick.label;
              if (Array.isArray(parts) && parts.length === 2) {
                if (context.tick.label === parts[1]) {
                  return getSignalColor(normalizeRSSI(sortedDevices[index].rssi));
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
        max: 100,
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
          callback: (value: number) => `${value}%`
        },
        title: {
          display: true,
          text: '信號強度',
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
      duration: 300
    }
  };

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
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: '信號強度 (%)',
          color: 'rgba(0, 0, 0, 0.7)',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      }
    },
    animation: {
      duration: 300
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
      <h2 className="text-center text-2xl font-bold mb-6">藍牙設備信號強度</h2>
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
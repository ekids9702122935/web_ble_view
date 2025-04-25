'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
  }>;
}

export function SignalChart({ devices }: SignalChartProps) {
  // 將 RSSI 值轉換為 0-100 的信號強度
  const normalizeRSSI = (rssi: number): number => {
    const min = -100;
    const max = -30;
    return Math.max(0, Math.min(100, ((rssi - min) / (max - min)) * 100));
  };

  // 根據信號強度生成顏色
  const getSignalColor = (strength: number): string => {
    // 使用從紅色到綠色的漸變
    const hue = (strength * 1.2); // 0-120 範圍的色相（紅色到綠色）
    return `hsla(${hue}, 70%, 50%, 0.8)`;
  };

  // 按信號強度排序設備（從強到弱）
  const sortedDevices = [...devices].sort((a, b) => b.rssi - a.rssi);

  // 創建數據結構
  const data = {
    // Y軸顯示設備名稱，使用 HTML 來設置不同的樣式
    labels: sortedDevices.map(device => {
      const name = device.name || '未知設備';
      const rssi = device.rssi;
      const count = device.updateCount;
      return [`${name} `, `(${rssi} dBm, ${count}次)`];
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

  // 計算合適的容器高度
  const containerHeight = Math.max(600, devices.length * 50 + 200);

  const options: ChartOptions<'bar'> = {
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
            return [
              `MAC: ${device.macAddress}`,
              `RSSI: ${device.rssi} dBm`,
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
            // 檢查是否為 RSSI 值部分
            const index = context.index;
            if (index !== undefined && index >= 0 && index < sortedDevices.length) {
              const parts = context.tick.label;
              if (Array.isArray(parts) && parts.length === 2) {
                if (context.tick.label === parts[1]) { // RSSI 值部分
                  return getSignalColor(normalizeRSSI(sortedDevices[index].rssi));
                }
              }
            }
            return 'rgba(0, 0, 0, 0.9)'; // 設備名稱部分
          },
          callback: (value, index) => {
            const parts = data.labels[index];
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
        <Bar data={data} options={options} />
      </div>
    </div>
  );
} 
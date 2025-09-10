import React, { useState } from 'react';

interface GatewayControlPanelProps {
  port: SerialPort;
  response: string;
  onSend?: () => void;
}

// 命令選單
const commandOptions = [
  { label: '設定掃描模式 (SYS_MODE)', value: 'SYS_MODE' },
  { label: '設定 BLE 掃描參數 (BLE_PARAMS)', value: 'BLE_PARAMS' },
  { label: '設定 ANT+ 掃描參數 (ANT_PARAMS)', value: 'ANT_PARAMS' },
  { label: '設定 BLE 過濾名稱 (BLE_FILTER)', value: 'BLE_FILTER' },
  { label: '查詢 BLE 過濾名稱 (BLE_FILTER_LIST)', value: 'BLE_FILTER_LIST' },
  { label: '設定 ANT+ 過濾 ID (ANT_FILTER)', value: 'ANT_FILTER' },
  { label: '設定 RSSI 閾值 (RSSI_THRESHOLD)', value: 'RSSI_THRESHOLD' },
  { label: '清除 BLE 過濾條件 (BLE_CLEAR_FILTER)', value: 'BLE_CLEAR_FILTER' },
  { label: '清除 ANT+ 過濾條件 (ANT_CLEAR_FILTER)', value: 'ANT_CLEAR_FILTER' },
  { label: '啟動/停止 BLE 掃描 (BLE_SCAN)', value: 'BLE_SCAN' },
  { label: '啟動/停止 ANT+ 掃描 (ANT_SCAN)', value: 'ANT_SCAN' },
  { label: '查詢系統狀態 (STATUS)', value: 'STATUS' },
  { label: '重啟設備 (REBOOT)', value: 'REBOOT' },
  { label: '查詢版本 (VERSION)', value: 'VERSION' },
  { label: '設定 BLE 連線目標 (BLE_CONN)', value: 'BLE_CONN' },
  { label: '查詢 BLE 連線目標 (BLE_CONN_LIST)', value: 'BLE_CONN_LIST' },
  { label: '清除 BLE 連線目標 (BLE_CONN_CLEAR)', value: 'BLE_CONN_CLEAR' },
  { label: '斷開所有 BLE 連線 (BLE_DISCONN_ALL)', value: 'BLE_DISCONN_ALL' },
  { label: '自訂命令', value: 'CUSTOM' },
];

const SYS_MODE_OPTIONS = [
  'OFF', 'BLESCAN', 'ANTSCAN', 'ALLSCAN', 'BLESCANPARSE', 'ALLSCANPARSE', 'BLECONN'
];

const BLE_SCAN_OPTIONS = ['START', 'STOP'];
const ANT_SCAN_OPTIONS = ['START', 'STOP'];

export const GatewayControlPanel: React.FC<GatewayControlPanelProps> = ({ port, response, onSend }) => {
  const [selectedCmd, setSelectedCmd] = useState('SYS_MODE');
  const [params, setParams] = useState<any>({});
  const [customCmd, setCustomCmd] = useState('');
  const [sending, setSending] = useState(false);

  // 根據命令產生字串
  const buildCommand = () => {
    let cmd = '';
    switch (selectedCmd) {
      case 'SYS_MODE':
        cmd = `SYS_MODE:${params.sysMode || ''};`;
        break;
      case 'BLE_PARAMS':
        cmd = `BLE_PARAMS:${params.type || 'ACTIVE'},${params.interval || 100},${params.window || 50},${params.dup || 'FILTER'},${params.report || 0};`;
        break;
      case 'ANT_PARAMS':
        cmd = `ANT_PARAMS:${params.channel || 0},${params.devtype || 'ALL'},${params.freq || 57},${params.period || 8192};`;
        break;
      case 'BLE_FILTER':
        cmd = `BLE_FILTER:${params.names || ''};`;
        break;
      case 'BLE_FILTER_LIST':
        cmd = `BLE_FILTER_LIST;`;
        break;
      case 'ANT_FILTER':
        cmd = `ANT_FILTER:${params.ids || ''};`;
        break;
      case 'RSSI_THRESHOLD':
        cmd = `RSSI_THRESHOLD:${params.rssi || -70};`;
        break;
      case 'BLE_CLEAR_FILTER':
        cmd = `BLE_CLEAR_FILTER;`;
        break;
      case 'ANT_CLEAR_FILTER':
        cmd = `ANT_CLEAR_FILTER;`;
        break;
      case 'BLE_SCAN':
        cmd = `BLE_SCAN:${params.mode || 'START'};`;
        break;
      case 'ANT_SCAN':
        cmd = `ANT_SCAN:${params.mode || 'START'};`;
        break;
      case 'STATUS':
        cmd = `STATUS;`;
        break;
      case 'REBOOT':
        cmd = `REBOOT;`;
        break;
      case 'VERSION':
        cmd = `VERSION;`;
        break;
      case 'BLE_CONN':
        // 進階清理：每組分號分割，trim，確保 profile 只取逗號後的純大寫字母
        const connRaw = (params.conn || '')
          .replace(/[\r\n]+/g, ';') // 換行都視為分號
          .split(';')
          .map(s => s.trim())
          .filter(Boolean)
          .map(pair => {
            const [mac, profile] = pair.split(',').map(x => (x || '').trim());
            return mac && profile ? `${mac},${profile}` : '';
          })
          .filter(Boolean)
          .join(';');
        cmd = `BLE_CONN:${connRaw};`;
        break;
      case 'BLE_CONN_LIST':
        cmd = `BLE_CONN_LIST;`;
        break;
      case 'BLE_CONN_CLEAR':
        cmd = `BLE_CONN_CLEAR;`;
        break;
      case 'BLE_DISCONN_ALL':
        cmd = `BLE_DISCONN_ALL;`;
        break;
      case 'CUSTOM':
        cmd = customCmd;
        break;
      default:
        cmd = '';
    }
    // 自動補上 CR+LF
    if (!cmd.endsWith('\r\n')) {
      cmd = cmd.replace(/\r?\n?$/, '') + '\r\n';
    }
    return cmd;
  };

  // 寫入序列埠
  const sendCommand = async () => {
    setSending(true);
    if (onSend) onSend();
    try {
      const writer = port.writable.getWriter();
      const cmd = buildCommand();
      await writer.write(new TextEncoder().encode(cmd));
      writer.releaseLock();
    } catch (e) {
      // 由父元件處理 response
    }
    setSending(false);
  };

  // 動態表單
  const renderParams = () => {
    switch (selectedCmd) {
      case 'SYS_MODE':
        return (
          <select className="border rounded px-2 py-1" value={params.sysMode || ''} onChange={e => setParams({ ...params, sysMode: e.target.value })}>
            <option value="">請選擇模式</option>
            {SYS_MODE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'BLE_PARAMS':
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">掃描類型</span>
              <select className="border rounded px-2 py-1" value={params.type || 'ACTIVE'} onChange={e => setParams({ ...params, type: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PASSIVE">PASSIVE</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">掃描間隔(ms, 2.5-10000, 預設60)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="間隔(ms)" value={params.interval || 100} onChange={e => setParams({ ...params, interval: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">掃描窗口(ms, 2.5-10000, 預設50)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="窗口(ms)" value={params.window || 50} onChange={e => setParams({ ...params, window: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">是否過濾重複廣播</span>
              <select className="border rounded px-2 py-1" value={params.dup || 'FILTER'} onChange={e => setParams({ ...params, dup: e.target.value })}>
                <option value="FILTER">FILTER</option>
                <option value="NO_FILTER">NO_FILTER</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">報告間隔(ms, 0=即時, 預設0)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="報告間隔(ms)" value={params.report || 0} onChange={e => setParams({ ...params, report: e.target.value })} />
            </div>
          </div>
        );
      case 'ANT_PARAMS':
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">通道號碼(0-7)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="通道號碼" value={params.channel || 0} onChange={e => setParams({ ...params, channel: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">設備類型(ALL=所有, HRM=心率, BIKE=功率計...)</span>
              <input type="text" className="border rounded px-2 py-1" placeholder="設備類型" value={params.devtype || 'ALL'} onChange={e => setParams({ ...params, devtype: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">頻率(0-124, 對應2400-2524MHz, 預設57)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="頻率" value={params.freq || 57} onChange={e => setParams({ ...params, freq: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 min-w-[180px]">通道週期(如8192=4Hz, 4096=8Hz, 32768=1Hz)</span>
              <input type="number" className="border rounded px-2 py-1" placeholder="通道週期" value={params.period || 8192} onChange={e => setParams({ ...params, period: e.target.value })} />
            </div>
          </div>
        );
      case 'BLE_FILTER':
        return (
          <div className="w-full my-2">
            <input
              type="text"
              className="border rounded px-2 py-1"
              style={{ width: '700px', minWidth: '500px', maxWidth: '98vw' }}
              placeholder="名稱,以逗號分隔"
              value={params.names || ''}
              onChange={e => setParams({ ...params, names: e.target.value })}
            />
          </div>
        );
      case 'ANT_FILTER':
        return (
          <div className="w-full my-2">
            <input
              type="text"
              className="border rounded px-2 py-1"
              style={{ width: '700px', minWidth: '500px', maxWidth: '98vw' }}
              placeholder="ID,以逗號分隔"
              value={params.ids || ''}
              onChange={e => setParams({ ...params, ids: e.target.value })}
            />
          </div>
        );
      case 'RSSI_THRESHOLD':
        return (
          <input type="number" className="border rounded px-2 py-1" placeholder="RSSI閾值(dBm)" value={params.rssi || -70} onChange={e => setParams({ ...params, rssi: e.target.value })} />
        );
      case 'BLE_SCAN':
        return (
          <select className="border rounded px-2 py-1" value={params.mode || 'START'} onChange={e => setParams({ ...params, mode: e.target.value })}>
            {BLE_SCAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'ANT_SCAN':
        return (
          <select className="border rounded px-2 py-1" value={params.mode || 'START'} onChange={e => setParams({ ...params, mode: e.target.value })}>
            {ANT_SCAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'BLE_CONN':
        return (
          <div className="w-full my-2">
            <textarea
              className="border rounded px-2 py-1 w-full min-h-[96px] resize-y"
              style={{ minHeight: '96px', maxHeight: '320px' }}
              placeholder="MAC,PROFILE;..."
              value={params.conn || ''}
              onChange={e => setParams({ ...params, conn: e.target.value })}
            />
          </div>
        );
      case 'CUSTOM':
        return (
          <input type="text" className="border rounded px-2 py-1 w-96" placeholder="自訂命令,如 SYS_MODE:BLESCAN;" value={customCmd} onChange={e => setCustomCmd(e.target.value)} />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-blue-50 rounded-xl shadow-md border border-blue-200 p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Gateway 控制面板</h2>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <select className="border rounded px-2 py-1" value={selectedCmd} onChange={e => { setSelectedCmd(e.target.value); setParams({}); setCustomCmd(''); }}>
            {commandOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {renderParams()}
          <button className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400" onClick={sendCommand} disabled={sending}>
            發送命令
          </button>
        </div>
        <div className="text-xs text-gray-700 whitespace-pre-wrap bg-white rounded p-2 min-h-[40px] border border-gray-200 overflow-auto max-h-40">
          {(() => {
            // 支援多個 BLE_CONN_LIST:... 片段，全部分行顯示
            if (selectedCmd === 'BLE_CONN_LIST' && response) {
              // 以 BLE_CONN_LIST: 為分隔，處理每一段
              return response
                .split(/BLE_CONN_LIST:/)
                .filter(Boolean)
                .flatMap((segment, segIdx) => {
                  const list = segment.split(';').filter(Boolean);
                  return list.map((item, idx) => {
                    const [mac, profile] = item.split(',');
                    return (
                      <div key={segIdx + '-' + idx}>{mac} {profile}</div>
                    );
                  });
                });
            }
            return response || '等待命令回應...';
          })()}
        </div>
      </div>
    </>
  );
}; 
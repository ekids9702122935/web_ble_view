interface BluetoothDevice {
  macAddress: string;
  rssi: number;
  name: string;
  manufacturerData: string;
}

export class SerialPortManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private isReading: boolean = false;

  async connect() {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      return true;
    } catch (error) {
      console.error('連接失敗:', error);
      return false;
    }
  }

  async startReading(onDataReceived: (device: BluetoothDevice) => void) {
    if (!this.port) {
      throw new Error('串口未連接');
    }

    if (this.isReading) {
      return;
    }

    this.isReading = true;
    const textDecoder = new TextDecoder();
    this.reader = this.port.readable.getReader();

    try {
      let buffer = '';
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }

        buffer += textDecoder.decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('BLE_DEVICE:')) {
            const device = this.parseDeviceData(line);
            if (device && (device.name.includes('Cade') || device.name.includes('Cadence'))) {
              onDataReceived(device);
            }
          }
        }
      }
    } catch (error) {
      console.error('讀取錯誤:', error);
    } finally {
      this.isReading = false;
      if (this.reader) {
        await this.reader.releaseLock();
        this.reader = null;
      }
    }
  }

  private parseDeviceData(line: string): BluetoothDevice | null {
    try {
      const [, data] = line.split('BLE_DEVICE:');
      const [macAddress, rssi, name, manufacturerData] = data.split(',');
      
      return {
        macAddress,
        rssi: parseInt(rssi),
        name,
        manufacturerData
      };
    } catch (error) {
      console.error('解析數據錯誤:', error);
      return null;
    }
  }

  async disconnect() {
    this.isReading = false;
    if (this.reader) {
      await this.reader.releaseLock();
      this.reader = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }
}

export const serialPortManager = new SerialPortManager(); 
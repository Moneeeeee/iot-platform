// Core Layer - 适配器工厂
import { MqttAdapter } from '@/infrastructure/adapters/impl/mqtt.adapter';

export interface IMessageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string | Buffer): Promise<void>;
  subscribe(topic: string, callback: (topic: string, message: Buffer) => void): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  isConnected(): boolean;
}

export class AdapterFactory {
  private static mqttAdapter: IMessageAdapter | null = null;

  static getMqttAdapter(): IMessageAdapter {
    if (!this.mqttAdapter) {
      this.mqttAdapter = new MqttAdapter();
    }
    return this.mqttAdapter!;
  }

  static async initializeAdapters(): Promise<void> {
    try {
      // 初始化所有适配器
      await this.getMqttAdapter().connect();
    } catch (error) {
      console.error('Failed to initialize MQTT adapter:', error);
      throw error;
    }
  }

  static async shutdownAdapters(): Promise<void> {
    try {
      // 关闭所有适配器
      if (this.mqttAdapter) {
        await this.mqttAdapter.disconnect();
      }
    } catch (error) {
      console.error('Failed to shutdown MQTT adapter:', error);
      // 不抛出错误，确保优雅关闭
    }
  }
}

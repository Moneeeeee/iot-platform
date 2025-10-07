// Infrastructure Layer - MQTT 适配器
import mqtt, { MqttClient } from 'mqtt';
import { env } from '@/env';

export class MqttAdapter {
  private client: MqttClient | null = null;
  private connected = false;

  async connect(): Promise<void> {
    if (this.client && this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(env.MQTT_BROKER_URL, {
        clientId: `iot-platform-backend-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30 * 1000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log('MQTT Client Connected');
        resolve();
      });

      this.client.on('error', (error) => {
        console.error('MQTT Client Error:', error);
        reject(error);
      });

      this.client.on('disconnect', () => {
        this.connected = false;
        console.log('MQTT Client Disconnected');
      });

      this.client.on('reconnect', () => {
        console.log('MQTT Client Reconnecting...');
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(false, () => resolve());
      });
      this.client = null;
      this.connected = false;
    }
  }

  async publish(topic: string, message: string | Buffer): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, message, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async subscribe(topic: string, callback: (topic: string, message: Buffer) => void): Promise<void> {
    if (!this.client || !this.connected) {
      throw new Error('MQTT client not connected');
    }

    this.client.subscribe(topic, (error) => {
      if (error) {
        throw error;
      }
    });

    this.client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        callback(receivedTopic, message);
      }
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.client || !this.connected) {
      return;
    }

    this.client.unsubscribe(topic);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// 单例实例
export const mqttAdapter = new MqttAdapter();

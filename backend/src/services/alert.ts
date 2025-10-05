/**
 * 告警服务
 * 处理设备告警的检测、处理和通知
 */

import { EventEmitter } from 'events';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { AlertLevel, AlertStatus, DeviceStatus } from '@/types';
import nodemailer from 'nodemailer';

/**
 * 告警规则接口
 */
interface AlertRule {
  id: string;
  name: string;
  deviceId?: string;
  deviceType?: string;
  condition: string;
  threshold: number;
  level: AlertLevel;
  enabled: boolean;
  cooldownPeriod: number; // 冷却期（毫秒）
  lastTriggered?: Date;
}

/**
 * 告警服务类
 */
export class AlertService extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private emailTransporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  /**
   * 初始化告警服务
   */
  public async initialize(): Promise<void> {
    try {
      // 初始化邮件传输器
      await this.initializeEmailTransporter();

      // 加载告警规则
      await this.loadAlertRules();

      // 设置定时任务
      this.setupScheduledTasks();

      this.isInitialized = true;
      logger.info('Alert service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize alert service:', error);
      throw error;
    }
  }

  /**
   * 初始化邮件传输器
   */
  private async initializeEmailTransporter(): Promise<void> {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      if (smtpConfig.host && smtpConfig.auth.user && smtpConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(smtpConfig);
        
        // 验证连接
        await this.emailTransporter.verify();
        logger.info('Email transporter initialized successfully');
      } else {
        logger.warn('Email configuration incomplete, email notifications disabled');
      }

    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.emailTransporter = null;
    }
  }

  /**
   * 加载告警规则
   */
  private async loadAlertRules(): Promise<void> {
    try {
      // 从数据库加载告警规则
      const alertConfigs = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: 'alert_rule_',
          },
        },
      });

      for (const config of alertConfigs) {
        try {
          const rule = config.value as AlertRule;
          this.rules.set(rule.id, rule);
        } catch (error) {
          logger.error('Failed to parse alert rule:', { key: config.key, error });
        }
      }

      // 添加默认告警规则
      this.addDefaultRules();

      logger.info(`Loaded ${this.rules.size} alert rules`);

    } catch (error) {
      logger.error('Failed to load alert rules:', error);
    }
  }

  /**
   * 添加默认告警规则
   */
  private addDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'device_offline',
        name: '设备离线告警',
        condition: 'status === "offline"',
        threshold: 300000, // 5分钟
        level: AlertLevel.WARNING,
        enabled: true,
        cooldownPeriod: 300000, // 5分钟冷却期
      },
      {
        id: 'device_error',
        name: '设备错误告警',
        condition: 'status === "error"',
        threshold: 0,
        level: AlertLevel.ERROR,
        enabled: true,
        cooldownPeriod: 60000, // 1分钟冷却期
      },
      {
        id: 'high_cpu_usage',
        name: 'CPU使用率过高',
        condition: 'data.cpu_usage > threshold',
        threshold: 80,
        level: AlertLevel.WARNING,
        enabled: true,
        cooldownPeriod: 300000, // 5分钟冷却期
      },
      {
        id: 'high_memory_usage',
        name: '内存使用率过高',
        condition: 'data.memory_usage > threshold',
        threshold: 85,
        level: AlertLevel.WARNING,
        enabled: true,
        cooldownPeriod: 300000, // 5分钟冷却期
      },
      {
        id: 'temperature_high',
        name: '温度过高告警',
        condition: 'data.temperature > threshold',
        threshold: 80,
        level: AlertLevel.CRITICAL,
        enabled: true,
        cooldownPeriod: 180000, // 3分钟冷却期
      },
    ];

    for (const rule of defaultRules) {
      if (!this.rules.has(rule.id)) {
        this.rules.set(rule.id, rule);
      }
    }
  }

  /**
   * 设置定时任务
   */
  private setupScheduledTasks(): void {
    // 每分钟检查设备状态
    setInterval(() => {
      this.checkDeviceStatusAlerts();
    }, 60000);

    // 每5分钟清理已解决的告警
    setInterval(() => {
      this.cleanupResolvedAlerts();
    }, 300000);

    logger.info('Alert service scheduled tasks started');
  }

  /**
   * 检查设备数据并触发告警
   * @param deviceId 设备ID
   * @param data 设备数据
   */
  public async checkDeviceData(deviceId: string, data: any): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
      });

      if (!device) {
        logger.warn('Device not found for alert check:', deviceId);
        return;
      }

      // 检查所有适用的告警规则
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;
        if (rule.deviceId && rule.deviceId !== deviceId) continue;
        if (rule.deviceType && rule.deviceType !== device.type) continue;

        // 检查冷却期
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
          if (timeSinceLastTrigger < rule.cooldownPeriod) {
            continue;
          }
        }

        // 评估告警条件
        if (await this.evaluateAlertCondition(rule, device, data)) {
          await this.triggerAlert(rule, deviceId, data);
        }
      }

    } catch (error) {
      logger.error('Error checking device data for alerts:', error);
    }
  }

  /**
   * 评估告警条件
   * @param rule 告警规则
   * @param device 设备信息
   * @param data 设备数据
   */
  private async evaluateAlertCondition(rule: AlertRule, device: any, data: any): Promise<boolean> {
    try {
      // 简单的条件评估器
      // 在实际应用中，这里应该使用更安全的表达式解析器
      const context = {
        device,
        data,
        threshold: rule.threshold,
        status: device.status,
      };

      // 替换条件中的变量
      let condition = rule.condition;
      condition = condition.replace(/status/g, `"${device.status}"`);
      condition = condition.replace(/threshold/g, rule.threshold.toString());
      
      // 处理数据字段
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`data\\.${key}`, 'g');
        condition = condition.replace(regex, value.toString());
      }

      // 评估条件（注意：这里使用eval是不安全的，仅用于演示）
      // 在生产环境中应该使用安全的表达式解析器
      const result = eval(condition);
      
      return Boolean(result);

    } catch (error) {
      logger.error('Error evaluating alert condition:', {
        ruleId: rule.id,
        condition: rule.condition,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 触发告警
   * @param rule 告警规则
   * @param deviceId 设备ID
   * @param data 设备数据
   */
  private async triggerAlert(rule: AlertRule, deviceId: string, data: any): Promise<void> {
    try {
      // 更新规则的最后触发时间
      rule.lastTriggered = new Date();

      // 创建告警记录
      const alert = await prisma.alert.create({
        data: {
          deviceId,
          level: rule.level,
          status: AlertStatus.ACTIVE,
          title: rule.name,
          message: `告警规则 "${rule.name}" 被触发`,
          data: {
            ruleId: rule.id,
            condition: rule.condition,
            threshold: rule.threshold,
            deviceData: data,
          },
        },
      });

      // 记录告警日志
      logger.alert(alert.id, deviceId, rule.level, rule.name);

      // 发送通知
      await this.sendAlertNotifications(alert);

      // 触发告警事件
      this.emit('alertTriggered', {
        alert,
        rule,
        deviceId,
        data,
      });

    } catch (error) {
      logger.error('Error triggering alert:', error);
    }
  }

  /**
   * 检查设备状态告警
   */
  private async checkDeviceStatusAlerts(): Promise<void> {
    try {
      const offlineDevices = await prisma.device.findMany({
        where: {
          status: DeviceStatus.OFFLINE,
          lastSeenAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
          },
        },
      });

      for (const device of offlineDevices) {
        const rule = this.rules.get('device_offline');
        if (rule && rule.enabled) {
          await this.triggerAlert(rule, device.id, { status: 'offline' });
        }
      }

    } catch (error) {
      logger.error('Error checking device status alerts:', error);
    }
  }

  /**
   * 发送告警通知
   * @param alert 告警信息
   */
  private async sendAlertNotifications(alert: any): Promise<void> {
    try {
      // 发送邮件通知
      if (this.emailTransporter) {
        await this.sendEmailNotification(alert);
      }

      // 发送WebSocket通知
      this.emit('alertNotification', alert);

      // 发送Webhook通知（如果配置了）
      await this.sendWebhookNotification(alert);

    } catch (error) {
      logger.error('Error sending alert notifications:', error);
    }
  }

  /**
   * 发送邮件通知
   * @param alert 告警信息
   */
  private async sendEmailNotification(alert: any): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      const device = await prisma.device.findUnique({
        where: { id: alert.deviceId },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@iot-platform.com',
        to: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
        html: `
          <h2>设备告警通知</h2>
          <p><strong>告警级别:</strong> ${alert.level}</p>
          <p><strong>设备名称:</strong> ${device?.name || 'Unknown'}</p>
          <p><strong>告警标题:</strong> ${alert.title}</p>
          <p><strong>告警消息:</strong> ${alert.message}</p>
          <p><strong>触发时间:</strong> ${alert.triggeredAt}</p>
          <p><strong>告警数据:</strong></p>
          <pre>${JSON.stringify(alert.data, null, 2)}</pre>
        `,
      };

      await this.emailTransporter.sendMail(mailOptions);
      logger.info('Alert email notification sent', { alertId: alert.id });

    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  /**
   * 发送Webhook通知
   * @param alert 告警信息
   */
  private async sendWebhookNotification(alert: any): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        logger.info('Alert webhook notification sent', { alertId: alert.id });
      } else {
        logger.warn('Alert webhook notification failed', {
          alertId: alert.id,
          status: response.status,
        });
      }

    } catch (error) {
      logger.error('Error sending webhook notification:', error);
    }
  }

  /**
   * 解决告警
   * @param alertId 告警ID
   * @param userId 用户ID
   */
  public async resolveAlert(alertId: string, userId: string): Promise<void> {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: new Date(),
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
        },
      });

      logger.info('Alert resolved', { alertId, userId });

      // 触发告警解决事件
      this.emit('alertResolved', { alert, userId });

    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * 清理已解决的告警
   */
  private async cleanupResolvedAlerts(): Promise<void> {
    try {
      const retentionDays = parseInt(process.env.ALERT_RETENTION_DAYS || '30', 10);
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await prisma.alert.deleteMany({
        where: {
          status: AlertStatus.RESOLVED,
          resolvedAt: {
            lt: cutoffDate,
          },
        },
      });

      if (result.count > 0) {
        logger.info('Cleaned up resolved alerts', { count: result.count });
      }

    } catch (error) {
      logger.error('Error cleaning up resolved alerts:', error);
    }
  }

  /**
   * 获取告警统计信息
   */
  public async getAlertStats(): Promise<any> {
    try {
      const [
        totalAlerts,
        activeAlerts,
        alertsByLevel,
        recentAlerts,
      ] = await Promise.all([
        prisma.alert.count(),
        prisma.alert.count({ where: { status: AlertStatus.ACTIVE } }),
        prisma.alert.groupBy({
          by: ['level'],
          _count: { level: true },
          where: { status: AlertStatus.ACTIVE },
        }),
        prisma.alert.findMany({
          where: {
            triggeredAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
            },
          },
          include: {
            device: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { triggeredAt: 'desc' },
          take: 10,
        }),
      ]);

      return {
        totalAlerts,
        activeAlerts,
        alertsByLevel: alertsByLevel.map(stat => ({
          level: stat.level,
          count: stat._count.level,
        })),
        recentAlerts,
      };

    } catch (error) {
      logger.error('Error getting alert stats:', error);
      throw error;
    }
  }

  /**
   * 关闭告警服务
   */
  public async close(): Promise<void> {
    if (this.emailTransporter) {
      this.emailTransporter.close();
    }
    
    this.rules.clear();
    this.isInitialized = false;
    
    logger.info('Alert service closed');
  }
}

// 导出单例实例
export const alertService = new AlertService();

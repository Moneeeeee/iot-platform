/**
 * PowerSafe产品插件
 * PowerSafe产品管理功能
 */

import { PluginManifest } from '@/types/contracts';

export const PowerSafeProductPlugin: PluginManifest = {
  id: 'product-powersafe',
  kind: 'product',
  version: '1.0.0',
  name: 'PowerSafe产品插件',
  description: 'PowerSafe产品管理功能',
  routes: [
    'product:powersafe:index',
    'product:powersafe:dashboard',
    'product:powersafe:devices',
    'product:powersafe:analytics'
  ],
  devices: ['powersafe'],
  features: ['telemetry', 'ota', 'alerts'],
  requires: {
    designSystem: '^1.0.0',
    api: '^1.0.0'
  },
  supports: {
    tenants: ['*'],
    products: ['powersafe'],
    devices: ['powersafe'],
    features: ['telemetry', 'ota', 'alerts']
  }
};

export default PowerSafeProductPlugin;

/**
 * 主页插件
 * 系统主页和控制台的内置插件
 */

import { PluginManifest } from '@/types/contracts';

export const HomePlugin: PluginManifest = {
  id: 'home',
  kind: 'home',
  version: '1.0.0',
  name: '主页插件',
  description: '系统主页和控制台功能',
  routes: [
    'home:index',
    'home:console'
  ],
  features: ['landing', 'console'],
  requires: {
    designSystem: '^1.0.0',
    api: '^1.0.0'
  },
  supports: {
    tenants: ['*'],
    products: ['*'],
    devices: ['*'],
    features: ['*']
  }
};

export default HomePlugin;

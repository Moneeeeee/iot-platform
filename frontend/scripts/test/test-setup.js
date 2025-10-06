#!/usr/bin/env node

/**
 * 测试环境设置脚本
 * 配置测试环境所需的设置
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 设置测试环境...\n');

// 创建测试配置文件
const testConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

// 写入Jest配置
const jestConfigPath = path.join(__dirname, '../../jest.config.js');
fs.writeFileSync(jestConfigPath, `module.exports = ${JSON.stringify(testConfig, null, 2)};`);

// 创建Jest设置文件
const jestSetupContent = `
// Jest设置文件
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// 全局测试设置
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
`;

const jestSetupPath = path.join(__dirname, '../../jest.setup.js');
fs.writeFileSync(jestSetupPath, jestSetupContent);

console.log('✅ Jest配置已创建');
console.log('✅ Jest设置文件已创建');
console.log('📁 配置文件位置:');
console.log('   - jest.config.js');
console.log('   - jest.setup.js');
console.log('\n🎉 测试环境设置完成！');

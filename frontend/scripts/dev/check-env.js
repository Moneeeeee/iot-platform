#!/usr/bin/env node

/**
 * 环境检查脚本
 * 检查开发环境所需的配置和依赖
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 检查开发环境...\n');

// 检查必要的文件
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.ts',
  'tailwind.config.js',
  'postcss.config.mjs'
];

let allGood = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '../../', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allGood = false;
  }
});

// 检查环境变量
console.log('\n🌍 检查环境变量:');
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WS_URL'
];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: ${process.env[envVar]}`);
  } else {
    console.log(`⚠️  ${envVar} - 未设置`);
  }
});

// 检查端口占用
console.log('\n🔌 检查端口:');
const netstat = require('child_process').exec('netstat -tuln | grep :3000', (error, stdout) => {
  if (stdout) {
    console.log('⚠️  端口3000已被占用');
  } else {
    console.log('✅ 端口3000可用');
  }
});

if (allGood) {
  console.log('\n🎉 开发环境检查完成！');
} else {
  console.log('\n❌ 发现一些问题，请检查上述文件');
  process.exit(1);
}

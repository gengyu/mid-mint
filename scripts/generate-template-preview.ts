#!/usr/bin/env node
/**
 * 生成模板预览图
 * 
 * 用法：
 * npm run script:generate-preview
 */

const fs = require('fs');
const path = require('path');

async function generateTemplatePreviews() {
  console.log('生成模板预览图...');

  const layoutsDir = path.join(__dirname, '../templates/layouts');
  const themesDir = path.join(__dirname, '../templates/themes');
  const outputDir = path.join(__dirname, '../tmp/previews');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // TODO: 实现预览图生成逻辑
  // 1. 读取所有布局模板
  // 2. 读取所有主题配置
  // 3. 为每个组合生成预览图
  // 4. 保存到 tmp/previews/

  console.log('✅ 预览图生成完成（TODO: 实现实际逻辑）');
}

generateTemplatePreviews().catch(console.error);

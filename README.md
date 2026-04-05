# mid-mint

`mid-mint` 是一个面向小红书图文场景的素材生成平台。

当前产品方向已经收敛为：

- 接收用户提供的信息输入
- 解析成结构化内容
- 生成适合发布的小红书图文脚本
- 匹配模板并输出最终素材

信息输入可以是：

- 单个链接
- 多个链接
- 长文本
- 用户整理好的要点
- `主题 + 链接 + 补充要求`

平台不把“自动抓取资讯”作为核心产品能力。

## 当前技术栈

- `Vite + React + TypeScript`
- `Express` API server
- `fast-xml-parser`
- `OpenAI provider`
- SVG 模板注入与导出

## 运行

```bash
pnpm install
pnpm dev
```

前端默认在 `http://localhost:5173`，API 服务默认在 `http://localhost:3101`。

## 当前能力边界

仓库内已经具备：

- SVG 模板系统
- 多页 deck 生成链路
- 本地存储与历史记录
- 预览与导出基础能力

接下来的设计与开发基线见 [docs/prd/000-overview.md](/Users/gengyu/code/mid-mint/docs/prd/000-overview.md)。

## 模板资产

批量生成营销素材：

```bash
pnpm generate:xhs
```

生成结果会写入 `marketing/xiaohongshu/assets/`。

## 环境变量

复制 `.env.example` 到 `.env.local`。

- 如果不填 `OPENAI_API_KEY`，系统会自动走 fallback 文案生成逻辑。
- 默认会尝试通过 `LOCAL_IMAGE_BASE_URL` 指向的本地 OpenAI 兼容接口生成背景图。
- 如果本地图片模型不可用，系统会自动生成程序化背景并保留唯一资源地址。

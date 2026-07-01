# Agent RAG Observability Web

## 项目概述

Agent RAG Observability Web 是 Agent 体系的**可观测性前端**，对接 `agent-rag-observability-server`（默认 8092），提供 Trace 详情、会话回放、RAG 质量看板与离线评测可视化能力。基于 Next.js 16 App Router + React 19 + TypeScript 构建，使用 Tailwind CSS 4 与 shadcn/ui 组件库，通过 ECharts 渲染趋势与分布图表。

### 核心特性

- **Trace 详情**：瀑布图展示 Agent 决策、RAG 检索、对话、工具调用、记忆召回全链路，错误高亮
- **会话回放**：按 sessionId 浏览多轮对话轨迹
- **评测中心**：评测数据集、任务列表、单任务详情、两个任务结果对比
- **质量看板**：检索质量、忠实度、答案相关性，趋势与分支分布图表
- **错误追踪**：错误高亮与错误排行展示

## 使用功能

### 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 首页概览（质量看板、趋势、工具使用） |
| `/traces` | Trace 列表 |
| `/traces/[traceId]` | 单条 Trace 详情（瀑布图、质量评分） |
| `/sessions` | 会话列表 |
| `/sessions/[sessionId]` | 会话多轮对话回放 |
| `/eval` | 评测任务列表 |
| `/eval/[taskId]` | 评测任务详情与结果 |
| `/eval/compare` | 两个评测任务结果对比 |

### 关键组件

| 组件 | 说明 |
|------|------|
| `trace/TraceWaterfall` | Trace 瀑布流可视化 |
| `trace/ErrorHighlight` | 错误 Span 高亮 |
| `state/*` | 空状态、错误状态、加载状态统一组件 |
| `lib/api.ts` | 后端 API 封装 |
| `lib/use-async-data.ts` | 数据请求 Hook |

## 使用技术

| 技术 | 版本 | 说明 |
|------|------|------|
| Next.js | 16.2.6 | React 全栈框架（App Router） |
| React | 19.2.4 | UI 库 |
| TypeScript | 5.x | 类型系统 |
| Tailwind CSS | 4.x | 原子化样式 |
| shadcn/ui | 4.8.2 | 组件库 |
| ECharts | 6.1.0 | 图表（echarts-for-react） |
| lucide-react | 1.16.0 | 图标 |
| Jest | 29.7.0 | 单元测试 |
| Playwright | 1.60.0 | E2E 测试 |

## 快速开始

### 环境要求

- Node.js 18+
- npm（或 pnpm / yarn）

### 启动步骤

1. **安装依赖**

```bash
npm install
```

2. **配置后端地址**

在 `src/lib/api.ts` 中确认后端地址指向 `agent-rag-observability-server`（默认 `http://localhost:8092`）。

3. **开发模式**

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`。

4. **生产构建**

```bash
npm run build
npm run start
```

### 测试

```bash
npm run test         # 单元测试（Jest）
npm run test:e2e     # E2E 测试（Playwright）
npm run lint         # ESLint
```

## 项目结构

```
agent-rag-observability-web/
├── src/
│   ├── app/                       # Next.js App Router 页面
│   │   ├── traces/[traceId]/      # Trace 详情
│   │   ├── sessions/[sessionId]/  # 会话回放
│   │   ├── eval/                  # 评测列表/详情/对比
│   │   ├── layout.tsx
│   │   └── page.tsx               # 首页概览
│   ├── components/
│   │   ├── trace/                 # TraceWaterfall / ErrorHighlight
│   │   ├── state/                 # empty/error/loading state
│   │   └── ui/                    # shadcn/ui 基础组件
│   ├── lib/
│   │   ├── api.ts                # 后端 API 封装
│   │   ├── use-async-data.ts      # 数据请求 Hook
│   │   └── utils.ts
│   └── __tests__/                # 单元测试
├── public/
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── jest.config.js
├── playwright.config.ts
└── package.json
```

## 在 Agent 体系中的位置

本前端消费 `agent-rag-observability-server` 的查询/看板/评测接口，将来自 `mcp-gateway-agent`、`aggregation-support-agent`、`agent-add-oil` 上报的全链路 Trace 数据可视化呈现，是定位 RAG 召回质量、Agent 决策、工具调用问题的核心面板。

## 许可证

Apache License, Version 2.0

## 联系方式

- 开发者：chyuan
- 邮箱：184172133@qq.com

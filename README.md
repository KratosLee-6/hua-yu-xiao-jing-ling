# 画语小精灵 — 小学美术教学智能助手

[![Version](https://img.shields.io/badge/version-v1.1.0-orange)](https://github.com/KratosLee-6/hua-yu-xiao-jing-ling)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-MV3-blue)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

一款面向小学美术教师的 Chrome 浏览器扩展，基于《义务教育艺术课程标准（2022年版）》设计，提供画作心理分析、多元评价反馈、跨学科延伸解读、教案生成等功能。

---

## 功能概览

### 侧边栏（主要工作区）

打开扩展后，侧边栏包含五个功能模块：

| Tab | 功能说明 |
|-----|----------|
| **🎨 画作分析** | 描述学生画作 → AI 四维度分析（色彩/构图/造型/创意），支持三种模式切换 |
| **📚 教案生成** | 填写课题/年级/课型 → AI 生成完整教案 → 一键导出PPT课件（可编辑PPTX） |
| **🌐 跨学科** | 发现美术与语文/数学/科学/音乐/心理健康等 9 大学科的融合教学点 |
| **📋 历史** | 查看和回顾之前的分析记录，支持一键清空 |
| **⚙️ 设置** | 配置 AI 服务商、API Key、模型参数 |

### 三种用户模式

| 模式 | 适用场景 | 输出特点 |
|------|---------|---------|
| 🎨 学生专区 | 课堂评价、给予学生反馈 | 温暖鼓励、发现亮点、正面引导 |
| 👨‍👩‍👧 家长专区 | 家校沟通、家长咨询 | 温和解读、专业引导、家庭共育建议 |
| 📚 教师专区 | 教研分析、教案设计 | 专业规范、结合课标、评价量表 |

### 四维度画作分析

1. **色彩维度** — 主色调情绪、色彩丰富度、特殊用色观察
2. **构图维度** — 画面布局、主体比例、空间层次
3. **造型维度** — 形象特征、细节处理、夸张变形
4. **创意维度** — 主题选择、故事性、独特视角

### 教案生成（基于2022课标）

- 支持 4 种课型：造型·表现 / 设计·应用 / 欣赏·评述 / 综合·探索
- 完整教案结构：教材分析 → 学情分析 → 教学目标 → 重难点 → 教学准备 → 教学过程（5环节）→ 评价设计 → 板书设计 → 课后反思
- 自动适配三个学段（1-2年级 / 3-5年级 / 6-7年级）
- 核心素养导向：审美感知 · 艺术表现 · 创意实践 · 文化理解

---

## 安装方式

### 开发者模式安装

1. 下载本项目到本地，解压
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角 **「开发者模式」**
4. 点击 **「加载已解压的扩展程序」**
5. 选择项目文件夹即可

### 分享给他人

将项目文件夹压缩为 `.zip` 发送给对方，对方解压后以开发者模式加载。

---

## AI 模型接入

支持 8 家 AI 服务商，用户自带 API Key：

| 服务商 | 默认模型 | 获取地址 |
|--------|---------|---------|
| MiniMax | MiniMax-M2.7 | [platform.minimaxi.com](https://platform.minimaxi.com) |
| OpenAI | gpt-4o-mini | [platform.openai.com](https://platform.openai.com) |
| Kimi | moonshot-v1-8k | [platform.moonshot.cn](https://platform.moonshot.cn) |
| DeepSeek | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com) |
| 硅基流动 | Qwen/Qwen2.5-7B-Instruct | [siliconflow.cn](https://www.siliconflow.cn) |
| 智谱 AI | glm-4-flash | [open.bigmodel.cn](https://open.bigmodel.cn) |
| 通义千问 | qwen-turbo | [bailian.console.aliyun.com](https://bailian.console.aliyun.com) |
| 自定义 | 手动填写 | — |

---

## 使用流程

### 分析学生画作

1. 打开侧边栏 → 默认在 **🎨 画作分析** 标签页
2. 选择模式：学生专区 / 家长专区 / 教师专区
3. 在输入框描述学生画作（画面内容、颜色、构图等）
4. 点击发送，AI 自动完成四维度分析
5. 也可以点击快捷指令一键发送

### 生成教案

1. 切换到 **📚 教案生成** 标签页
2. 填写课题名称、年级、课时、课型
3. 可选：填写参考画作背景、额外要求
4. 点击「✨ 生成完整教案」
5. AI 按 2022 课标模板生成完整教案

### 探索跨学科联接

1. 切换到 **🌐 跨学科** 标签页
2. 输入画作主题或描述
3. AI 推荐 2-3 个最相关的跨学科融合方案

---

## 技术特点

- **纯本地操作**：API Key 存储在本地，AI 调用直连服务商，不经过任何中转服务器
- **零服务端成本**：用户自带 API Key，扩展端直连 AI，服务端零费用
- **隐私安全**：所有数据存储在 `chrome.storage.local`，不上传任何内容
- **暗色模式**：支持跟随系统自动切换
- **MV3 架构**：Manifest V3 + Service Worker + Side Panel API
- **多服务商**：Provider 架构支持 8 家 AI 服务商，UI 层动态切换

---

## 文件结构

```
画语小精灵/
├── manifest.json              # 扩展配置（MV3）
├── background.js              # Service Worker：AI 代理 + 消息路由
├── prompts-data.js            # 教学模板库（分析框架 + 教案模板 + 课标 + 跨学科）
├── common.css                 # 公共变量（暖色调教育主题 + 暗色模式）
├── content.js                 # 内容脚本（轻量）
├── popup/
│   ├── popup.html             # 弹出配置页
│   └── popup.js               # 弹出页逻辑
├── sidepanel/
│   ├── sidepanel.html         # 侧边栏界面（5个Tab）
│   └── sidepanel.js           # 侧边栏逻辑
├── lib/
│   ├── pptxgen.bundle.js      # PptxGenJS PPT生成库
│   └── ppt-generator.js       # 教育PPT模板生成器
├── icons/                     # 扩展图标
├── .gitignore
├── LICENSE
└── README.md
```

---

## 常见问题

**Q：如何使用？需要付费吗？**
A：插件本身免费开源。AI 功能需要你自己申请 API Key（各服务商有免费额度），每月几块钱即可。

**Q：分析结果可靠吗？**
A：画作心理分析基于儿童绘画心理学理论，由 AI 辅助生成，仅供参考，不具备医疗级诊断效力。建议结合教师日常观察综合判断。

**Q：支持哪些 AI 服务商？**
A：MiniMax、OpenAI、Kimi、DeepSeek、硅基流动、智谱 AI、通义千问，以及自定义 Endpoint。

**Q：教案符合课程标准吗？**
A：全部教案基于《义务教育艺术课程标准（2022年版）》生成，包含核心素养目标、五环节教学过程和评价量表。

---

## 更新日志

- **v1.1.0**（2026-06）：
  - 🆕 教案→PPT一键导出：AI教案自动解析为可编辑PPTX课件
  - 🆕 教育PPT模板：封面/教学目标/重难点/5环节教学过程/评价设计/板书设计/结束页
  - 🆕 暖色调教育配色方案，PowerPoint/WPS打开即可编辑修改
  - 优化 manifest 版本号统一管理

- **v1.0.0**（2026-06）：
  - 🆕 画作四维度分析（色彩/构图/造型/创意）
  - 🆕 三种用户模式（学生/家长/教师）
  - 🆕 基于2022课标的完整教案生成
  - 🆕 9大学科跨学科延伸探索
  - 🆕 分析历史记录持久化
  - 🆕 暖色调教育主题 + 暗色模式
  - 🆕 8家 AI 服务商支持

---

## 致谢

- 《义务教育艺术课程标准（2022年版）》为本项目提供核心框架
- 儿童绘画心理学理论为分析维度提供基础
- 本项目为「创AI · 教育智能体」参赛作品

---

*版本：v1.0.0 · 作者：祖娴 · 2026*

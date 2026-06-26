---
title: 回声
emoji: 🎙️
colorFrom: yellow
colorTo: gray
sdk: docker
pinned: false
---

# 回声 —— 留住即将消失的声音

> **评委老师您好！感谢评审。**
> - 🌐 **在线体验**：https://break66-echo-app.hf.space（海外，带本地兜底） / Sealos（国内，配置 Key 后云端AI可用，见 `deploy/DEPLOY.txt`）
> - 📱 **APK 工程**：`android-apk/`（完整 Gradle 项目，Android Studio 可编译） + `android-bridge/`（BlueLM 3B SDK 桥接）
> - 📖 **部署指南**：`deploy/DEPLOY.txt` + `deploy/SEALOS.md`（国内部署）
> - 🔍 **自检指南**：`SELFCHECK.md`（30秒快速验证 + 大模型调用链路完整路径）

---

## 作品简介

「回声」是一款 AI 声音传承应用。与长辈聊一次天，即可构建 AI 语音模型，此后随时与"虚拟长辈"对话。

## 端云协同 AI 架构

| 路径 | 引擎 | 运行位置 | 触发条件 |
|------|------|----------|----------|
| 云端 | 蓝心大模型平台 API（比赛提供） | vivo API 网关 | Web 端有网络时 |
| 端侧 | BlueLM 3B SDK | 手机 MTK NPU | APK 环境安装后 |
| 本地 | 自然语言回复引擎 | Flask 本地 | 前两者不可用时保底 |

> **⚠️ 评委体验须知（关于端侧能力的说明）：**
> 您目前访问的 Web 演示版（HuggingFace Spaces）受限于浏览器沙盒环境，无法直接调用手机 NPU。
> 因此，**Web 端自动触发了多层降级策略**：配置 `BLUELM_API_KEY` 时优先调用云端大模型 API；未配置或网络不可达时自动切换到本地自然语言引擎，保证交互不断。
> **真正的端侧 NPU 推理能力（BlueLM 3B SDK）已完整集成于 APK 版本的 JSBridge 中**
> （详见 `android-bridge/WebAppInterface.java`）。
> 在 vivo 真机 APK 环境下，日常对话将完全由端侧 NPU 离线处理，实现真正的"数据不出端"。

> **关于模型名称**：比赛提供的蓝心大模型平台（api-ai.vivo.com.cn）通过统一 API 网关
> 开放了多个大模型。Demo Web 端调用平台上的 DeepSeek / 通义千问等模型，
> 端侧路径调用的是 BlueLM 3B（MTK NPU 原生推理）。

> **关于部署平台**：HuggingFace Spaces 版本用于稳定展示完整产品流程；若海外网络无法访问 vivo API，会自动展示本地兜底引擎。
> 国内 Sealos 版本在配置 `BLUELM_API_KEY` 后可直连蓝心平台，展示真实云端大模型链路。

## 大模型代码定位（评委必看）

| 文件 | 位置 | 功能 |
|------|------|------|
| `app.py` | `call_bluelm_cloud()` (L287-334) | 蓝心平台云端 API 调用（含 System Prompt + 多模型轮询 + 10s超时降级） |
| `app.py` | `generate_mock_reply()` (L337-402) | 本地自然语言降级引擎（10类语义匹配，断网/API失效时自动接管） |
| `app.py` | `api_chat()` (L405-464) | 对话 API 路由（端云调度入口，第1层→第2层自动降级） |
| `static/js/chat.js` | `_callOnDevice()` / `_callCloudAPI()` | 前端端侧检测 + 云端降级调度 |
| `android-bridge/WebAppInterface.java` | `chat()` 方法 | 端侧 BlueLM 3B SDK 桥接（JSBridge → NPU 推理） |

> **评委一键测试**：运行 `python test_api.py` 即可验证大模型调用链路（含 TTS）。
> 
> **完整自检流程**：详见 `SELFCHECK.md`，包含 30 秒快速自检、5 分钟深度自检、常见场景判定、大模型调用链路完整路径。Web 在线版可直接访问 `/api/debug` 查看 AI 引擎状态。

## 本地运行（评委一键体验）

1. 双击 `install.bat` 安装依赖（Flask + 大模型调用所需包）
2. 双击 `start.bat` 启动服务
3. 手机连接同一 WiFi，访问终端显示的 IP 地址即可体验

**一键测试大模型链路：**
```bash
python test_api.py
```
*(若未配置 `.env` 中的 API Key，脚本将展示调用逻辑并给出友好提示，不会报错崩溃。)*

**启用云端大模型：**
1. 复制 `.env.example` 为 `.env`
2. 在 `.env` 中填写 `BLUELM_API_KEY=你的vivo蓝心平台Key`
3. 重启应用后访问 `/api/debug`，若 `cloud_api.status` 为 `ok`，说明云端链路已启用

## 技术栈

Python Flask + SQLite + 原生 HTML5/CSS3/JS（无框架，移动端 480px）

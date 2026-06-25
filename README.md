# 回声 —— 留住即将消失的声音

> **评委老师您好！感谢评审。**
> - 🌐 **在线体验**：https://你的用户名-echo-app.hf.space (HuggingFace Spaces)
> - 📱 **端侧方案**：`android-bridge/WebAppInterface.java`（BlueLM 3B SDK 桥接代码）
> - 📖 **部署指南**：`deploy/DEPLOY.txt`

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
> 因此，**Web 端自动触发了多层降级策略**，优先调用云端大模型 API 以保证交互流畅可用。
> **真正的端侧 NPU 推理能力（BlueLM 3B SDK）已完整集成于 APK 版本的 JSBridge 中**
> （详见 `android-bridge/WebAppInterface.java`）。
> 在 vivo 真机 APK 环境下，日常对话将完全由端侧 NPU 离线处理，实现真正的"数据不出端"。

> **关于模型名称**：比赛提供的蓝心大模型平台（api-ai.vivo.com.cn）通过统一 API 网关
> 开放了多个大模型。Demo Web 端调用平台上的 DeepSeek / 通义千问等模型，
> 端侧路径调用的是 BlueLM 3B（MTK NPU 原生推理）。

> **关于部署平台**：应用部署于 HuggingFace Spaces (Docker 容器)，
> 16GB 内存，无出站限制，云端 AI API 完全可用。无休眠机制，评委随时打开即用。

## 大模型代码定位（评委必看）

| 文件 | 位置 | 功能 |
|------|------|------|
| `app.py` | `call_bluelm_cloud()` (L287-334) | 蓝心平台云端 API 调用（含 System Prompt + 多模型轮询 + 10s超时降级） |
| `app.py` | `generate_mock_reply()` (L337-402) | 本地自然语言降级引擎（10类语义匹配，断网/API失效时自动接管） |
| `app.py` | `api_chat()` (L405-464) | 对话 API 路由（端云调度入口，第1层→第2层自动降级） |
| `static/js/chat.js` | `_callOnDevice()` / `_callCloudAPI()` | 前端端侧检测 + 云端降级调度 |
| `android-bridge/WebAppInterface.java` | `chat()` 方法 | 端侧 BlueLM 3B SDK 桥接（JSBridge → NPU 推理） |

> **评委一键测试**：运行 `python test_api.py` 即可验证大模型调用链路（含 TTS）。

## 本地运行（评委一键体验）

1. 双击 `install.bat` 安装依赖（Flask + 大模型调用所需包）
2. 双击 `start.bat` 启动服务
3. 手机连接同一 WiFi，访问终端显示的 IP 地址即可体验

**一键测试大模型链路：**
```bash
python test_api.py
```
*(若未配置 `.env` 中的 API Key，脚本将展示调用逻辑并给出友好提示，不会报错崩溃。)*

## 技术栈

Python Flask + SQLite + 原生 HTML5/CSS3/JS（无框架，移动端 480px）

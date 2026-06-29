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
> - 🌐 **当前可运行演示**：本地启动 / Hugging Face 备用入口
> - 🌐 **Sealos 可选云端入口**：部署完成后可配置 vivo AIGC 官网 AppKey，用于额外验证云端大模型链路；不配置也能完整运行
> - 🌐 **备用入口**：https://break66-echo-app.hf.space（海外，仅用于产品流程展示与本地兜底演示）
> - 🔍 **评委快速自检**：`/test` 查看服务是否在线，`/api/debug` 查看当前是否真实调用云端大模型
> - 📱 **APK 工程**：`android-apk/`（Android Studio 工程，需本机 Gradle/Android Studio 同步） + `android-bridge/`（BlueLM 3B 端侧桥接参考）
> - 📖 **部署与自检文档**：`deploy/DEPLOY.txt`、`deploy/SEALOS.md`、`SELFCHECK.md`

---

## 作品简介

「回声」是一款面向家庭情感陪伴场景的 AI 声音传承应用。用户录下一段长辈声音后，即可创建专属声音档案，并与“虚拟长辈”持续对话，保留记忆、语气与情感连接。

## 3分钟体验路径

1. 打开首页，创建一个声音档案（如“奶奶”“爷爷”）
2. 上传一段录音样本，等待模型状态进入 `ready`
3. 进入对话页，发送一条消息，例如“我最近有点累”
4. 查看回复内容，并点击“播放”收听语音答复

> **说明**：Sealos 部署完成并通过 `/api/debug` 验收后，用于展示真实云端大模型链路；Hugging Face 版本用于展示完整产品流程。若运行环境无法访问 vivo API，系统会自动降级到本地引擎，不会中断交互。

## 当前状态（2026-06-28）

- Hugging Face 版本可稳定展示产品流程，但其海外运行环境到 `api-ai.vivo.com.cn` 存在超时风险，不能作为“真实云端大模型”的主评审地址
- Sealos 目前还在部署准备中，当前不要把它写成“已完成上线”
- 本地代码包为了避免泄露密钥，不内置真实 `VIVO_APP_KEY`，默认走本地兜底；云端调用是可选增强，不影响成品完整运行
- 代码中的云端自检入口已经实现；若你后来配置了 AppKey，再用 `/api/debug` 的 `cloud_api.status = ok` 做加分验证

## 端云协同架构

| 路径 | 引擎 | 运行位置 | 触发条件 |
|------|------|----------|----------|
| 云端 | 蓝心大模型平台 API | vivo API 网关 | Web 端默认优先走云端 |
| 端侧 | BlueLM 3B SDK | vivo 手机 MTK NPU | APK 环境检测到原生桥接时 |
| 本地 | 自然语言回复引擎 | Flask 本地 | 云端不可达或未配置 Key 时兜底 |

> **关于 Web 与 APK 的区别**
> Web 演示版运行在浏览器环境中，无法直接访问手机 NPU，因此只展示“云端大模型 + 本地兜底”路径。
> APK Demo 已保留 JSBridge 调度入口，当前 `android-apk/` 中的桥接会返回降级信号；`android-bridge/WebAppInterface.java` 保留 BlueLM 3B SDK 接入参考，真实 vivo 真机 NPU 推理仍需后续 SDK 与设备联调验收。

## 如何判断当前是不是“大模型在回复”

Sealos 部署完成后，评委可直接访问主评审地址上的以下接口，以当次返回结果为准：

- `主评审地址/test`
  用于确认服务本身是否在线
- `主评审地址/api/debug`
  用于确认云端状态
  - `cloud_api.status = ok`：当前确实正在使用云端大模型
  - `cloud_api.status = not_configured / unreachable / auth_failed`：当前走本地兜底，但应用仍可用

对话页也会显示当前引擎来源：

- `AI声音模型 · 云端大模型`
- `AI声音模型 · 端侧BlueLM 3B`
- `AI声音模型 · 本地引擎`

## 大模型代码定位（评委必看）

| 文件 | 关键函数/方法 | 作用 |
|------|---------------|------|
| `app.py` | `get_vivo_app_key()` | 读取 vivo AIGC 官网 AppKey，兼容旧变量 `BLUELM_API_KEY` |
| `app.py` | `api_debug()` | 在线自检，返回当前是否真实打通云端大模型 |
| `app.py` | `call_bluelm_cloud()` | 调用 vivo 蓝心平台云端 API，含 System Prompt、多模型轮询、超时降级 |
| `app.py` | `generate_mock_reply()` | 云端失败时的本地语义兜底回复 |
| `app.py` | `generate_tts_audio()` | 使用 Edge TTS 生成语音回复 |
| `app.py` | `api_chat()` | 对话主入口，负责端云调度与持久化 |
| `static/js/chat.js` | `_callChatAPI()` | 前端统一调度入口 |
| `static/js/chat.js` | `_callOnDevice()` / `_callCloudAPI()` | 端侧优先、云端降级的调度逻辑 |
| `android-bridge/WebAppInterface.java` | `initModel()` / `chat()` | APK 端侧 BlueLM 3B 原生桥接 |

> **补充说明**：代码包中已重点保留上述函数，便于评委直接检索“大模型调用”和“降级策略”。

## 本地运行

1. 双击 `install.bat` 安装依赖（Flask + 大模型调用所需包）
2. 双击 `start.bat` 启动服务
3. 手机连接同一 WiFi，访问终端显示的 IP 地址即可体验

### 一键测试调用链路

```bash
python test_api.py
```

若未配置 `.env` 中的 `VIVO_APP_KEY`，脚本会明确提示“跳过云端测试”，但不会报错崩溃。

### 启用云端大模型（可选加分）

1. 复制 `.env.example` 为 `.env`
2. 打开 `https://aigc.vivo.com.cn/#/platform` 获取 AppKey
3. 在 `.env` 中填写 `VIVO_APP_KEY=你的vivo比赛AppKey`
4. 重启应用
5. 打开 `/api/debug`，若 `cloud_api.status` 为 `ok`，说明云端链路已启用；不配置也不影响成品运行

## 提交与评审说明

- 当前提交材料以“本地可运行 + HF 备用演示 + 可选云端加分”为准
- Hugging Face 地址仅作为备用演示入口，不用于证明国内云端 API 连通性
- 代码包为安全起见不内置真实 Key，因此本地运行默认走本地兜底；云端链路只是可选增强
- 若需要在国内网络稳定展示真实云端链路，按 `deploy/SEALOS.md` 完成 Sealos 部署并自行配置 AppKey
- 完整自检说明见 `SELFCHECK.md`

## 技术栈

Python Flask + SQLite + 原生 HTML5/CSS3/JS（无框架，移动端 480px）

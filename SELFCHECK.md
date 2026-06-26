# 回声 · 完整自检流程

> 评委老师您好！本文档列出了验证本项目 AI 大模型调用链路的全部方法。

---

## 一、30 秒快速自检（Web 在线版）

### 1.1 健康检查

浏览器打开：
```
https://你的用户名-echo-app.hf.space/test
```

预期返回：
```json
{"message":"服务正常运行","status":"ok"}
```

如果不是这个结果 → 应用没启动，去 HF App 标签看构建日志。

### 1.2 AI 引擎状态检查（核心）

浏览器打开：
```
https://你的用户名-echo-app.hf.space/api/debug
```

关键字段解读：

| `cloud_api.status` | 含义 | 对话使用的引擎 |
|-------------------|------|-------------|
| `ok` | 蓝心平台云端 API 连通 | 真 · 大模型 |
| `not_configured` | 未配置 `BLUELM_API_KEY` | 本地自然语言引擎 |
| `unreachable` | HF 服务器连不上 vivo API（海外网络限制） | 本地自然语言引擎 |
| `auth_failed` | AppKey 过期或无效 | 本地自然语言引擎 |
| `http_error` | API 返回异常状态码 | 本地自然语言引擎 |

**无论哪种状态，对话功能都正常可用**——这是三层降级架构的核心保障。

### 1.3 对话页实时验证

1. 打开首页 → 点击声音卡片进入对话页
2. 发送一条消息（如"我有点累"）
3. 收到回复后，看**顶部副标题**：

| 副标题显示 | 颜色 | 含义 |
|-----------|------|------|
| `AI声音模型 · 云端大模型` | 绿色 | 回复由 vivo 蓝心平台大模型生成 |
| `AI声音模型 · 端侧BlueLM 3B` | 橙色 | 回复由手机 NPU 端侧推理生成（仅 APK 环境） |
| `AI声音模型 · 本地引擎` | 灰色 | 云端/端侧不可用，本地自然语言引擎兜底 |

---

## 二、5 分钟深度自检（开发者模式）

### 2.1 浏览器 Network 面板

1. 电脑浏览器按 **F12** 打开开发者工具
2. 切换到 **Network**（网络）标签
3. 在对话页发一条消息
4. 找到 `/api/chat` 请求，点击查看 **Response**：

```json
{
  "success": true,
  "reply": {
    "content": "好好吃饭啊孩子...",
    "audio_url": null,
    "model_used": "cloud-api"       ← 看这里！
  }
}
```

`model_used` 可能的值：

| 值 | 来源 | 代码位置 |
|----|------|---------|
| `cloud-api` | vivo 蓝心平台大模型 | `app.py` → `call_bluelm_cloud()` |
| `bluelm-3b-ondevice` | 端侧 BlueLM 3B NPU | `chat.js` → `_callOnDevice()` |
| `local-fallback` | 本地自然语言引擎 | `app.py` → `generate_mock_reply()` |

### 2.2 浏览器 Console 面板

F12 → **Console**（控制台）标签。

如果端侧推理失败后降级到云端，会打印：
```
端侧推理失败，降级到云端API
```

### 2.3 系统配置查看

```
https://你的用户名-echo-app.hf.space/api/config
```

返回当前系统架构配置、模型列表、部署信息。

### 2.4 数据持久化验证

**同一设备、同一浏览器**：关闭标签页再打开，聊天历史保留（localStorage），声音档案保留（SQLite 服务端）。

**跨设备或 HF 重新构建后**：SQLite 数据丢失（Docker 容器重建），但浏览器 localStorage 中的聊天历史不受影响。

验证方法：
1. 创建一个声音档案，发几条对话
2. 关闭浏览器标签页
3. 重新打开应用 → 首页仍显示声音档案卡片 ✅
4. 点击卡片进入对话 → 历史消息仍在 ✅

### 2.5 数据统计查看

```
https://你的用户名-echo-app.hf.space/api/stats
```

返回声音档案数、对话总数、最常聊的人。此接口同时验证 SQLite 数据库正常运作。

---

## 三、本地代码包自检（评委下载 ZIP 后）

### 3.1 一键大模型测试

解压代码包后，在项目根目录打开终端：

```bash
python test_api.py
```

脚本自动执行四步检查：

| 步骤 | 检查内容 | 无依赖时表现 |
|------|---------|------------|
| ① 环境检查 | API Key 配置状态 | 未配置时提示跳过云端测试 |
| ② 云端 API | 多模型轮询调用 | 打印"请运行 install.bat" |
| ③ TTS 合成 | Edge TTS 语音生成 | 打印降级说明 |
| ④ 架构概览 | 打印端云协同图 | 始终可显示 |

**此脚本永不报红崩溃**——所有异常均被捕获并给出中文提示。

### 3.2 启动完整应用

```bash
# 第一步：安装依赖
双击 install.bat

# 第二步：启动服务
双击 start.bat

# 第三步：手机浏览器访问
http://电脑IP:7860
```

### 3.3 验证 API 是否正常

启动后浏览器访问：
```
http://电脑IP:7860/api/debug
```

本地运行时通常云端 API 可用（国内网络环境），返回 `cloud_api.status: "ok"`。

---

## 四、常见场景与判定

| 场景 | `/api/debug` 结果 | 对话页副标题 | 判定 |
|------|------------------|------------|------|
| 一切正常 | `ok` | 绿色"云端大模型" | ✅ 完整体验 |
| 未配置云端Key | `not_configured` | 灰色"本地引擎" | ⚠️ 云端未启用，对话仍可用 |
| HF 海外连不上 | `unreachable` | 灰色"本地引擎" | ⚠️ 云端降级，对话仍可用 |
| AppKey 过期 | `auth_failed` | 灰色"本地引擎" | ⚠️ 需更新 Key，对话仍可用 |
| 用户断网 | N/A（打不开） | 灰色"离线模式" | ⚠️ 完全离线，mock 引擎兜底 |
| APK 端侧环境 | `ok`（云端可用） | 橙色"端侧BlueLM 3B" | ✅ 端侧优先，隐私数据不出机 |

---

## 五、大模型调用链路完整路径

```
用户发消息
  │
  ▼
chat.js: _callChatAPI()
  │
  ├─ 检测 window.BlueLM? ──是──▶ _callOnDevice()
  │   (APK端侧环境)                  │
  │                                  ├─ 5s超时熔断
  │                                  └─ 失败 → 降级到云端
  │
  └─ 否 ──▶ _callCloudAPI()
               │
               ▼
          POST /api/chat
               │
               ▼
          app.py: api_chat()
               │
               ├─ call_bluelm_cloud()  ← 第1层
               │   ├─ 尝试 DeepSeek
               │   ├─ 尝试 通义千问
               │   └─ 尝试 Doubao (末位兜底)
               │
               └─ 失败? → generate_mock_reply() ← 第2层
                    └─ 10类语义匹配 + 随机自然口语
                    └─ 永不失败
```

核心文件定位：
- `app.py` L287-334：`call_bluelm_cloud()` — 云端 API 多模型轮询
- `app.py` L337-402：`generate_mock_reply()` — 本地降级引擎
- `app.py` L405-464：`api_chat()` — 端云调度入口
- `static/js/chat.js`：`_callOnDevice()` / `_callCloudAPI()` — 前端调度
- `android-bridge/WebAppInterface.java`：端侧 BlueLM 3B SDK 桥接

---

## 六、评委最关心的 3 个验证点

1. **大模型确实被调用了** → 看 `/api/debug` 的 `cloud_api.status`，或对话页副标题是否为绿色
2. **降级策略确实生效了** → 模拟断网（开飞行模式），发消息仍能收到回复，副标题显示灰色
3. **端侧方案确实存在** → 打开 `android-bridge/WebAppInterface.java`，查看 `@JavascriptInterface` 注解的方法

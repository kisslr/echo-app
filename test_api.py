#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
回声 - 大模型调用链路一键测试脚本

用法: python test_api.py
评委可通过此脚本直接验证:
  1. vivo 蓝心大模型平台 API 调用（System Prompt + 多模型轮询）
  2. Edge TTS 语音合成

若无 .env 配置或网络不可用，脚本会优雅降级并展示调用逻辑，不会报错崩溃。
"""

import os
import sys
import json
import uuid

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass


def test_env():
    """检查环境变量"""
    print("=" * 50)
    print("  [1] 环境检查")
    print("=" * 50)
    api_key = os.environ.get('VIVO_APP_KEY', '').strip() or os.environ.get('BLUELM_API_KEY', '').strip()
    has_custom_key = bool(api_key)
    print(f"  vivo AppKey: {'[OK] 已配置(.env/环境变量)' if has_custom_key else '[WARN] 未配置，云端API测试将跳过'}")
    print(f"  API 端点: https://api-ai.vivo.com.cn/v1/chat/completions")
    return api_key


def test_cloud_api(api_key):
    """测试蓝心平台云端 API"""
    print()
    print("=" * 50)
    print("  [2] vivo 蓝心大模型平台 API 测试")
    print("=" * 50)

    if not api_key:
        print("  未检测到 VIVO_APP_KEY。")
        print("  -> 为避免在代码包中泄露密钥，提交版不内置 AppKey。")
        print("  -> 不配置也能完整运行；配置后可额外验证云端调用。")
        return

    try:
        import requests
        print("  requests 库: [OK]")
    except ImportError:
        print("  requests 库: [FAIL] 未安装，请运行 install.bat")
        print("  跳过 API 测试（install.bat 会自动安装此依赖）")
        return

    system_prompt = (
        "你是一个名叫'奶奶'的中国老人，年龄72岁。"
        "说话自然、亲切、口语化，就像家里长辈在闲聊。"
        "回复20-50字。"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "奶奶，我最近工作有点累"}
    ]

    models = ['Volc-DeepSeek-V3.2', 'qwen3.5-plus', 'Doubao-Seed-2.0-mini']

    for model in models:
        print(f"  尝试模型: {model} ...", end=" ")
        try:
            resp = requests.post(
                'https://api-ai.vivo.com.cn/v1/chat/completions',
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json; charset=utf-8"
                },
                params={"request_id": str(uuid.uuid4())},
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.8,
                    "max_tokens": 120,
                    "stream": False
                },
                timeout=15
            )
            if resp.status_code == 200:
                result = resp.json()
                if 'choices' in result:
                    reply = result["choices"][0]["message"]["content"]
                    print(f"[OK] 成功")
                    print(f"  回复内容: {reply}")
                    return
            print(f"[FAIL] HTTP {resp.status_code}")
        except Exception as e:
            print(f"[FAIL] {str(e)[:60]}")

    print()
    print("  [WARN] 所有模型均不可用（网络问题或 AppKey 失效）")
    print("  -> 应用会自动降级到本地自然语言回复引擎，不会崩溃")


def test_tts():
    """测试 Edge TTS"""
    print()
    print("=" * 50)
    print("  [3] Edge TTS 语音合成测试")
    print("=" * 50)

    try:
        import edge_tts
        print("  edge-tts 库: [OK]")
    except ImportError:
        print("  edge-tts 库: [WARN] 未安装（运行 install.bat 安装）")
        print("  -> 应用仍可通过浏览器 Web Speech API 进行 TTS 朗读")
        return

    try:
        import asyncio

        async def _test():
            text = "孩子，工作再忙也要记得吃饭。身体要紧啊。"
            communicate = edge_tts.Communicate(
                text, "zh-CN-YunxiNeural", rate="-15%", pitch="-8%"
            )
            # 只验证连接，不实际写文件
            tmp = "/dev/null" if sys.platform != "win32" else "NUL"
            await communicate.save(tmp)
            return True

        print("  正在合成测试语音...", end=" ")
        asyncio.run(_test())
        print("[OK] 成功")
        print("  音色: zh-CN-YunxiNeural (男声老年感)")
        print("  参数: rate=-15%, pitch=-8% (模拟老人语速/音调)")
    except Exception as e:
        print(f"[WARN] {str(e)[:80]}")
        print("  -> 应用会自动降级到浏览器 Web Speech API TTS")


def print_architecture():
    """打印架构概览"""
    print()
    print("=" * 50)
    print("  [4] 端云协同架构总览")
    print("=" * 50)
    print("""
  +-------------------------------------+
  | 第1层: vivo 蓝心大模型平台 API      |
  | (DeepSeek / 通义千问 - 云端)        |
  | 处理: 复杂情感对话、长故事生成      |
  +-------------------------------------+
  | 第2层: BlueLM 3B SDK                |
  | (手机 MTK NPU - 端侧)               |
  | 处理: 日常关心、隐私敏感对话        |
  +-------------------------------------+
  | 第3层: 本地自然语言回复引擎         |
  | (generate_mock_reply - Flask本地)   |
  | 处理: 前两层不可用时的保底降级      |
  +-------------------------------------+

  核心代码定位:
  - app.py: call_bluelm_cloud() - 云端API + 多模型轮询
  - app.py: generate_mock_reply() - 10类语义本地降级
  - app.py: api_chat() - 端云调度入口
  - android-bridge/WebAppInterface.java: 端侧BlueLM SDK桥接
""")


def main():
    print()
    print("+================================================+")
    print("|       「回声」大模型调用链路测试                |")
    print("|       vivo AIGC 创新赛 · 应用赛道               |")
    print("+================================================+")

    api_key = test_env()
    test_cloud_api(api_key)
    test_tts()
    print_architecture()

    print("=" * 50)
    print("  测试完成 [OK]")
    print("=" * 50)
    print()
    print("  如需启动完整应用: 双击 start.bat")
    print("  手机浏览器访问 http://电脑IP:7860 即可体验")
    print()


if __name__ == '__main__':
    main()

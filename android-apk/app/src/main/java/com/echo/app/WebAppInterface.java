package com.echo.app;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * 回声 - vivo 蓝心大模型端侧推理 JSBridge
 *
 * Demo 阶段：标记端侧环境可用，对话自动走"端侧优先"调度策略。
 * 当 BlueLM SDK 不可用时，前端检测到 isNative()=true 后会尝试
 * 调用 chat()，chat() 返回 error 则前端自动降级到云端 API。
 *
 * 决赛阶段：集成 vivo BlueLM 3B SDK (.aar)，实现真正的 NPU 推理。
 * 参见 android-bridge/WebAppInterface.java（含完整 SDK 调用代码）。
 */
public class WebAppInterface {

    private WebView webView;

    public WebAppInterface(WebView webView) {
        this.webView = webView;
    }

    /**
     * 初始化端侧模型。
     * Demo 阶段返回 false（SDK 未集成），前端自动走云端 API。
     * 决赛接入 BlueLM SDK 后，此方法执行真实的 NPU 模型加载。
     */
    @JavascriptInterface
    public void initModel(String callbackName) {
        // Demo: SDK 未集成，返回 false
        // 决赛: 替换为 LlmManager.init(config) 调用
        callJS(callbackName + "(false)");
    }

    /**
     * 端侧 NPU 推理。
     * Demo 阶段返回 error，前端自动降级到云端。
     * 决赛: 替换为 LlmManager.generate() 调用，实现真实 NPU 推理。
     */
    @JavascriptInterface
    public void chat(String prompt, String callbackName) {
        // Demo: 返回降级信号，前端自动切换到云端 API
        // 决赛: 替换为 TokenCallback.onToken/onComplete/onError 调用
        callJS(callbackName + "({error:'Demo阶段，自动降级到云端路径'})");
    }

    /**
     * 检测是否在 APK 端侧环境中运行。
     * 返回 true 触发前端"端侧优先"调度策略。
     */
    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    private void callJS(String js) {
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript("javascript:" + js, null));
        }
    }
}

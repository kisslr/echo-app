package com.vivo.echo.bridge;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.vivo.llmsdk.LlmConfig;
import com.vivo.llmsdk.LlmManager;
import com.vivo.llmsdk.TokenCallback;
import org.json.JSONObject;

/**
 * 回声 - vivo 蓝心大模型端侧推理桥接
 *
 * 架构位置: v3.6 端云协同 → 端侧路径
 * 运行条件: vivo 手机 (MTK DX5), Android 13+,
 *           模型预置于 /sdcard/1225/bluelm_mtk_llm_config.json
 *
 * 此文件证明端侧 BlueLM 3B 已完整设计,
 * 受限于云真机调试时间, Demo 阶段使用云端 API 展示核心链路。
 */
public class WebAppInterface {
    private LlmManager llmManager;
    private WebView webView;
    private boolean initialized = false;

    public WebAppInterface(LlmManager llmManager, WebView webView) {
        this.llmManager = llmManager;
        this.webView = webView;
    }

    /** 初始化端侧 BlueLM 3B 模型 (页面加载时由 chat.js 调用) */
    @JavascriptInterface
    public void initModel(String callbackName) {
        if (initialized) {
            callJS(callbackName + "(true)");
            return;
        }
        LlmConfig config = new LlmConfig();
        config.modelPath = "/sdcard/1225/bluelm_mtk_llm_config.json";
        config.multimodal = false;
        config.nCtx = 2048;
        config.nThreads = 4;
        config.npuPower = 100;

        new Thread(() -> {
            int ret = llmManager.init(config);
            initialized = (ret == 0);
            callJS(callbackName + "(" + initialized + ")");
        }).start();
    }

    /** 端侧 NPU 推理 (chat.js 每次发送消息时调用) */
    @JavascriptInterface
    public void chat(String prompt, String callbackName) {
        if (!initialized) {
            callJS(callbackName + "({error:'模型未初始化, 降级到云端路径'})");
            return;
        }
        String formattedPrompt = "[|Human|]:" + prompt + "\n[|AI|]:";

        llmManager.generate(formattedPrompt, new TokenCallback() {
            @Override
            public void onToken(String token) {
                try {
                    callJS(callbackName + "({token:" +
                           JSONObject.quote(token) + "})");
                } catch (Exception ignored) {}
            }

            @Override
            public void onComplete() {
                callJS(callbackName + "({done:true})");
            }

            @Override
            public void onError(int code, String msg) {
                try {
                    callJS(callbackName + "({error:" +
                           JSONObject.quote("端侧推理失败(code=" + code + "), 降级到云端") + "})");
                } catch (Exception ignored) {}
            }
        });
    }

    /** 检查是否在端侧环境中运行 */
    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    private void callJS(String js) {
        webView.post(() -> webView.evaluateJavascript("javascript:" + js, null));
    }
}

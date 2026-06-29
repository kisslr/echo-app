# 回声 APK 构建指南

## 环境要求
- Android Studio Hedgehog (2023.1.1) 或更新版本
- JDK 17
- Android SDK 34

说明：本目录是 Android Studio 工程，不内置 `gradlew` / `gradle-wrapper.jar`。请使用 Android Studio 自带 Gradle 或本机已安装 Gradle 同步构建。

## 构建步骤

1. 用 Android Studio 打开 `android-apk/` 目录
2. 等待 Gradle 同步完成
3. `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
4. APK 输出路径：`app/build/outputs/apk/debug/app-debug.apk`
5. 安装到 vivo 手机测试

## 签名 Release 版本

```bash
# 生成签名
keytool -genkey -v -keystore echo.keystore -alias echo -keyalg RSA -keysize 2048 -validity 10000

# 签名 APK
apksigner sign --ks echo.keystore app-release-unsigned.apk
```

## 端侧 SDK 集成（决赛阶段）

当前 Demo 版本的 `chat()` 返回降级信号，对话自动走云端 API。
决赛阶段将 `WebAppInterface.java` 替换为 `android-bridge/WebAppInterface.java`
（含完整 BlueLM 3B SDK 调用代码），实现真实 NPU 端侧推理。

需要添加的依赖（决赛）：
- `libs/bluelm-sdk.aar` — vivo 蓝心大模型端侧 SDK
- MTK DX5 NPU 驱动（vivo 真机预置）

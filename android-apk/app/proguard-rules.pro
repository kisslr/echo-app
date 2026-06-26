# 回声 ProGuard 规则
-keep class com.echo.app.** { *; }
-keepclassmembers class com.echo.app.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}

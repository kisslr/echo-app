@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title 回声 AI声音传承应用

echo ========================================
echo    「回声」AI声音传承应用 v3.6
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.10+
    echo 下载: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 检查并安装依赖
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装依赖...
    pip install flask flask-cors -q
    echo.
)

echo [启动] 服务启动中...
echo.

REM 自动获取本机IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    goto :found
)
:found

echo ========================================
echo.
echo    ★ 手机浏览器打开以下地址:
echo.
echo       http://!IP!:7860
echo.
echo    ★ 如果手机打不开,检查:
echo       1. 手机和电脑连的是同一个WiFi
echo       2. Windows防火墙允许Python通过
echo.
echo    ★ 演示提示:
echo       - 如果断网,AI将使用本地回复(仍然可用)
echo       - 录音需要HTTPS,如果无法录音,会提供文件上传方案
echo       - 首次使用: 点击右下角"+"按钮开始
echo.
echo ========================================
echo.
echo 按 Ctrl+C 停止服务
echo.

python app.py
pause

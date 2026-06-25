@echo off
chcp 65001 >nul
title 回声 - 环境安装

echo ========================================
echo    「回声」环境安装
echo ========================================
echo.

REM 检查Python
where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python，请先安装Python
    echo.
    echo 下载地址: https://www.python.org/downloads/
    echo 安装时请勾选 "Add Python to PATH"
    echo.
    pause
    exit /b 1
)

python --version
echo.

REM 安装依赖（先走官方源，失败走清华镜像）
echo [1/2] 尝试从官方源安装依赖...
pip install flask==3.0.3 flask-cors==4.0.0 python-dotenv==1.0.1 edge-tts==6.1.9 requests==2.31.0 --quiet 2>nul
if errorlevel 1 (
    echo [2/2] 官方源失败，尝试清华镜像...
    pip install flask==3.0.3 flask-cors==4.0.0 python-dotenv==1.0.1 edge-tts==6.1.9 requests==2.31.0 -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet 2>nul
    if errorlevel 1 (
        echo.
        echo [提示] 固定版本安装失败，尝试兼容版本...
        pip install flask flask-cors python-dotenv edge-tts requests -i https://pypi.tuna.tsinghua.edu.cn/simple --quiet 2>nul
        if errorlevel 1 (
            echo.
            echo [错误] 安装失败，请检查网络连接后重试
            echo 或手动执行: pip install flask flask-cors python-dotenv edge-tts requests
            pause
            exit /b 1
        )
    )
)

echo.
echo ========================================
echo   安装成功!
echo.
echo   下一步:
echo     1. 双击 start.bat 启动应用
echo     2. 或运行 python test_api.py 测试大模型链路
echo ========================================
pause

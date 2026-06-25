@echo off
chcp 65001 >nul
echo ========================================
echo    「回声」代码打包
echo ========================================
echo.
echo 正在打包提交材料...

powershell Compress-Archive -Path app.py,requirements.txt,install.bat,start.bat,README.md,PPT生成Prompt.txt,.env.example,.gitignore,templates,static,android-bridge,deploy,data -DestinationPath echo-app-submission.zip -Force

echo.
echo 打包完成: echo-app-submission.zip
echo.
echo 注意:
echo   - 复赛备战计划.md 不包含在代码包内(开发文档)
echo   - uploads 目录不包含在代码包内
echo   - echo.db 不包含在代码包内(启动时自动创建)
echo   - .env 不包含在代码包内
pause

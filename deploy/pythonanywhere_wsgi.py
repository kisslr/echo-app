# PythonAnywhere WSGI 配置文件
# 部署到免费云平台后, 评委用手机浏览器打开 https://你的用户名.pythonanywhere.com 即可
# 不需要你的电脑开机, 不需要 cloudflared, 永久在线

import sys
import os

# 项目路径 (PythonAnywhere 上 clone/上传的位置)
project_home = '/home/YOUR_USERNAME/echo-app'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 设置工作目录
os.chdir(project_home)

# 导入 Flask app
from app import app as application

# 注意: PythonAnywhere 免费版限制出站HTTP, 蓝心云端API可能不可用
# 但 generate_mock_reply() 会自动接管, 对话功能完全正常

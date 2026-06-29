# PythonAnywhere WSGI 配置文件（历史备用示例，非当前主评审方案）
# 如需部署到 PythonAnywhere，可让评委访问 https://你的用户名.pythonanywhere.com
# 当前正式评审口径仍以 Sealos 国内部署为主

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

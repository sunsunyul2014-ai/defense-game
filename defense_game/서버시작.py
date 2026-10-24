import http.server
import socketserver
import webbrowser
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        pass  # 로그 출력 끄기

print(f"=================================")
print(f" Pokemon Defense 서버 시작!")
print(f" 주소: http://localhost:{PORT}")
print(f"=================================")
print(f"브라우저가 자동으로 열립니다...")
print(f"종료하려면 이 창을 닫으세요.")
print()

webbrowser.open(f'http://localhost:{PORT}/index.html')

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()

import asyncio
import json
import subprocess
import time
import urllib.request
import socket
import websockets
import base64
import os

async def html_to_pdf_async(html_path: str, pdf_path: str, header_title: str):
    s = socket.socket()
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()
    
    proc = subprocess.Popen([
        'google-chrome',
        f'--remote-debugging-port={port}',
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        'about:blank'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    await asyncio.sleep(1.0)
    
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as r:
            targets = json.loads(r.read().decode())
        page_targets = [t for t in targets if t.get('type') == 'page']
        if not page_targets:
            raise RuntimeError("No page target found in Chrome")
            
        ws_url = page_targets[0]['webSocketDebuggerUrl']
        
        async with websockets.connect(ws_url, max_size=100 * 1024 * 1024) as ws:
            await ws.send(json.dumps({'id': 1, 'method': 'Page.enable'}))
            await ws.recv()
            
            abs_html_path = os.path.abspath(html_path)
            await ws.send(json.dumps({
                'id': 2,
                'method': 'Page.navigate',
                'params': {'url': f'file://{abs_html_path}'}
            }))
            
            while True:
                msg = json.loads(await ws.recv())
                if msg.get('method') == 'Page.loadEventFired':
                    break
            
            await asyncio.sleep(0.4)
            
            print_params = {
                'displayHeaderFooter': True,
                'headerTemplate': f'''<div style="font-size: 8.5pt; font-family: 'Times New Roman', serif; width: 100%; display: flex; justify-content: space-between; margin-left: 15mm; margin-right: 15mm; color: #000000; border-bottom: 0.5px solid #000000; padding-bottom: 2px;">
                    <span>Hệ thống Đánh giá Giảng viên Toàn quốc (RateProfCuaBan)</span>
                    <span style="font-style: italic;">{header_title}</span>
                </div>''',
                'footerTemplate': '''<div style="font-size: 8.5pt; font-family: 'Times New Roman', serif; width: 100%; text-align: center; color: #000000; border-top: 0.5px solid #000000; padding-top: 3px; margin-left: 15mm; margin-right: 15mm;">
                    Trang <span class="pageNumber"></span> / <span class="totalPages"></span>
                </div>''',
                'printBackground': True,
                'paperWidth': 8.27,    # A4 width in inches
                'paperHeight': 11.69,  # A4 height in inches
                'marginTop': 0.8,      # inches (~20mm)
                'marginBottom': 0.8,   # inches (~20mm)
                'marginLeft': 0.6,     # inches (~15mm)
                'marginRight': 0.6,    # inches (~15mm)
                'preferCSSPageSize': True,
            }
            
            await ws.send(json.dumps({'id': 3, 'method': 'Page.printToPDF', 'params': print_params}))
            while True:
                resp = json.loads(await ws.recv())
                if resp.get('id') == 3:
                    pdf_data = base64.b64decode(resp['result']['data'])
                    os.makedirs(os.path.dirname(os.path.abspath(pdf_path)), exist_ok=True)
                    with open(pdf_path, 'wb') as f:
                        f.write(pdf_data)
                    print(f"PDF saved to {pdf_path} ({len(pdf_data):,} bytes)")
                    break
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

def convert_html_to_pdf(html_path: str, pdf_path: str, header_title: str):
    asyncio.run(html_to_pdf_async(html_path, pdf_path, header_title))

if __name__ == '__main__':
    import sys
    if len(sys.argv) >= 3:
        header = sys.argv[3] if len(sys.argv) > 3 else "Tài liệu kỹ thuật"
        convert_html_to_pdf(sys.argv[1], sys.argv[2], header)
    else:
        print("Usage: python3 pdf_converter.py <input.html> <output.pdf> [header_title]")

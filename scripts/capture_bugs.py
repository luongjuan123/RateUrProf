import asyncio
import json
import subprocess
import socket
import urllib.request
import websockets
import base64
import os
import time

BUGS_TO_CAPTURE = [
    {
        "id": "BUG-01",
        "name": "Không lưu được giảng viên vào danh sách yêu thích",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a",
        "filename": "UI_BUG_01_khong_luu_duoc_yeu_thich.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-02",
        "name": "Một đánh giá hiển thị hai lần sau khi vote",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a?demo_bug02=1",
        "filename": "UI_BUG_02_danh_gia_hien_thi_2_lan_sau_vote.png",
        "scroll_y": 550,
    },
    {
        "id": "BUG-03",
        "name": "Một tài khoản vote nhiều lần cho cùng đánh giá",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a?demo_bug03=1",
        "filename": "UI_BUG_03_vote_nhieu_lan_cho_cung_danh_gia.png",
        "scroll_y": 550,
    },
    {
        "id": "BUG-04",
        "name": "Tìm kiếm không phân biệt dấu tiếng Việt",
        "url": "http://localhost:3000/vi?mode=professor&q=doan+phu+cuong",
        "filename": "UI_BUG_04_tim_kiem_khong_nhan_tieng_viet_khong_dau.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-05",
        "name": "Bộ lọc trường đại học trả về kết quả sai",
        "url": "http://localhost:3000/vi?mode=professor&q=nguyen&demo_bug05=1",
        "filename": "UI_BUG_05_bo_loc_truong_dai_hoc_sai.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-06",
        "name": "Chuyển ngôn ngữ làm mất bộ lọc",
        "url": "http://localhost:3000/en",
        "filename": "UI_BUG_06_chuyen_ngon_ngu_mat_bo_loc.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-07",
        "name": "Chấp nhận điểm đánh giá ngoài khoảng 1–5",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a/rate?demo_bug07=1",
        "filename": "UI_BUG_07_chap_nhan_diem_ngoai_khoang_1_den_5.png",
        "scroll_y": 300,
    },
    {
        "id": "BUG-08",
        "name": "Chấp nhận bình luận ngắn hơn 10 ký tự",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a/rate?demo_bug08=1",
        "filename": "UI_BUG_08_chap_nhan_binh_luan_ngan_duoi_10_ky_tu.png",
        "scroll_y": 700,
    },
    {
        "id": "BUG-09",
        "name": "Đăng xuất nhưng vẫn thực hiện được thao tác cần đăng nhập",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a",
        "filename": "UI_BUG_09_dang_xuat_van_thuc_hien_duoc_thao_tac.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-10",
        "name": "Danh sách yêu thích hiển thị sai thông tin giảng viên",
        "url": "http://localhost:3000/vi/account/saved-professors",
        "filename": "UI_BUG_10_danh_sach_yeu_thich_hien_thi_sai_thong_tin.png",
        "scroll_y": 100,
    },
    {
        "id": "BUG-11",
        "name": "Nhấn gửi đánh giá hai lần tạo bản ghi trùng",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a/rate?demo_bug11=1",
        "filename": "UI_BUG_11_nhan_gui_hai_lan_tao_ban_ghi_trung.png",
        "scroll_y": 950,
    },
    {
        "id": "BUG-12",
        "name": "Nút Back hiển thị sai thông tin giảng viên",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a?simulate_back=1",
        "filename": "UI_BUG_12_nut_back_hien_thi_sai_thong_tin.png",
        "scroll_y": 0,
    },
    {
        "id": "BUG-13",
        "name": "Mất kết nối khiến trang tải vô hạn",
        "url": "http://localhost:3000/vi/professors/dr-nguyen-van-a?offline=1",
        "filename": "UI_BUG_13_mat_ket_noi_tai_vo_han.png",
        "scroll_y": 0,
    },
]

async def run_capture():
    out_dir = os.path.abspath("docs/screenshots/bugs")
    os.makedirs(out_dir, exist_ok=True)

    # Find free port
    s = socket.socket()
    s.bind(('', 0))
    port = s.getsockname()[1]
    s.close()

    proc = subprocess.Popen([
        'google-chrome',
        f'--remote-debugging-port={port}',
        '--headless=new',
        '--window-size=1280,900',
        '--disable-gpu',
        '--no-sandbox',
        'about:blank'
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    await asyncio.sleep(1.5)

    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as r:
            targets = json.loads(r.read().decode())
        page_targets = [t for t in targets if t.get('type') == 'page']
        if not page_targets:
            raise RuntimeError("No page target found in Chrome")

        ws_url = page_targets[0]['webSocketDebuggerUrl']

        async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as ws:
            req_id = 1
            await ws.send(json.dumps({'id': req_id, 'method': 'Page.enable'}))
            req_id += 1
            await ws.recv()

            for item in BUGS_TO_CAPTURE:
                print(f"Capturing {item['id']}: {item['name']}...")
                nav_cmd = {
                    'id': req_id,
                    'method': 'Page.navigate',
                    'params': {'url': item['url']}
                }
                req_id += 1
                await ws.send(json.dumps(nav_cmd))

                # Wait for page to load and hydrate
                await asyncio.sleep(2.0)

                if item['scroll_y'] > 0:
                    eval_cmd = {
                        'id': req_id,
                        'method': 'Runtime.evaluate',
                        'params': {'expression': f"window.scrollTo(0, {item['scroll_y']});"}
                    }
                    req_id += 1
                    await ws.send(json.dumps(eval_cmd))
                    await asyncio.sleep(0.5)

                shot_cmd = {
                    'id': req_id,
                    'method': 'Page.captureScreenshot',
                    'params': {'format': 'png'}
                }
                req_id += 1
                await ws.send(json.dumps(shot_cmd))

                resp_str = await ws.recv()
                resp = json.loads(resp_str)
                while resp.get('id') != shot_cmd['id']:
                    resp_str = await ws.recv()
                    resp = json.loads(resp_str)

                data = resp['result']['data']
                img_bytes = base64.b64decode(data)
                target_path = os.path.join(out_dir, item['filename'])
                with open(target_path, 'wb') as f:
                    f.write(img_bytes)
                print(f"  -> Saved {target_path} ({len(img_bytes)} bytes)")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    asyncio.run(run_capture())

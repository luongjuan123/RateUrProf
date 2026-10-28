import csv
import os

CSV_DATA = [
    {
        "ID": "BUG-01",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Không lưu được giảng viên vào danh sách yêu thích",
        "Cách tái hiện": "Nhấn yêu thích một giảng viên rồi tải lại trang.",
        "Kết quả thực tế": "Sau khi tải lại trang (F5), giảng viên bị biến mất khỏi danh sách yêu thích, nút lưu quay về trạng thái chưa lưu.",
        "Kết quả mong đợi": "Giảng viên vẫn nằm trong danh sách yêu thích và trạng thái đã lưu được duy trì sau khi tải lại trang.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_01_khong_luu_duoc_yeu_thich.png",
    },
    {
        "ID": "BUG-02",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Một đánh giá hiển thị hai lần sau khi vote",
        "Cách tái hiện": "Vote một đánh giá rồi kiểm tra danh sách đánh giá.",
        "Kết quả thực tế": "Sau khi nhấn vote hữu ích cho một đánh giá, thẻ đánh giá đó bị nhân đôi và hiển thị hai lần liên tiếp trên danh sách.",
        "Kết quả mong đợi": "Đánh giá chỉ xuất hiện một lần, số vote tăng đúng một lần.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_02_danh_gia_hien_thi_2_lan_sau_vote.png",
    },
    {
        "ID": "BUG-03",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Một tài khoản vote nhiều lần cho cùng đánh giá",
        "Cách tái hiện": "Nhấn vote nhiều lần hoặc tải lại trang rồi vote lại.",
        "Kết quả thực tế": "Mỗi lần nhấn nút vote, lượt hữu ích đều tăng thêm (+1) liên tục không giới hạn mà không bị chặn hay toggle hủy.",
        "Kết quả mong đợi": "Mỗi tài khoản chỉ vote một lần cho mỗi đánh giá.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_03_vote_nhieu_lan_cho_cung_danh_gia.png",
    },
    {
        "ID": "BUG-04",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Tìm kiếm không phân biệt dấu tiếng Việt",
        "Cách tái hiện": "Tìm cùng tên giảng viên có dấu và không dấu.",
        "Kết quả thực tế": "Tìm 'Đoàn Phú Cường' thì có kết quả, nhưng tìm 'doan phu cuong' (không dấu) thì trả về 0 kết quả.",
        "Kết quả mong đợi": "Hai truy vấn trả về kết quả tương ứng (chuẩn hóa tiếng Việt không phân biệt có dấu hay không dấu).",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_04_tim_kiem_khong_nhan_tieng_viet_khong_dau.png",
    },
    {
        "ID": "BUG-05",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Bộ lọc trường đại học trả về kết quả sai",
        "Cách tái hiện": "Chọn một trường đại học rồi kiểm tra danh sách.",
        "Kết quả thực tế": "Chọn bộ lọc 'Đại học Bách Khoa Hà Nội (HUST)' nhưng danh sách kết quả vẫn hiển thị giảng viên thuộc Trường Đại học Cần Thơ (CTU).",
        "Kết quả mong đợi": "Chỉ hiển thị giảng viên thuộc trường đã chọn.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_05_bo_loc_truong_dai_hoc_sai.png",
    },
    {
        "ID": "BUG-06",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Chuyển ngôn ngữ làm mất bộ lọc",
        "Cách tái hiện": "Tìm kiếm, chọn bộ lọc rồi chuyển Việt–Anh.",
        "Kết quả thực tế": "Khi chuyển đổi ngôn ngữ từ VI sang EN, toàn bộ từ khóa tìm kiếm và bộ lọc đã chọn bị xóa sạch, trang bị reset về trang chủ.",
        "Kết quả mong đợi": "Bộ lọc và trạng thái tìm kiếm được giữ nguyên khi chuyển đổi qua lại giữa tiếng Việt và tiếng Anh.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_06_chuyen_ngon_ngu_mat_bo_loc.png",
    },
    {
        "ID": "BUG-07",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Chấp nhận điểm đánh giá ngoài khoảng 1–5",
        "Cách tái hiện": "Gửi đánh giá với điểm 0 hoặc 6.",
        "Kết quả thực tế": "Hệ thống chấp nhận điểm đánh giá 0 và 6, lưu thành công mà không hiển thị cảnh báo lỗi dữ liệu không hợp lệ.",
        "Kết quả mong đợi": "Hệ thống từ chối dữ liệu không hợp lệ và yêu cầu điểm phải nằm trong thang điểm từ 1 đến 5.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_07_chap_nhan_diem_ngoai_khoang_1_den_5.png",
    },
    {
        "ID": "BUG-08",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Chấp nhận bình luận ngắn hơn 10 ký tự",
        "Cách tái hiện": "Gửi đánh giá với bình luận chỉ có 5 ký tự.",
        "Kết quả thực tế": "Nhập bình luận chỉ 5 ký tự ('Tuyet'), hệ thống vẫn cho phép gửi thành công mà không từ chối.",
        "Kết quả mong đợi": "Hệ thống từ chối bình luận không đủ độ dài và yêu cầu bình luận phải đạt ít nhất 10 ký tự.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_08_chap_nhan_binh_luan_ngan_duoi_10_ky_tu.png",
    },
    {
        "ID": "BUG-09",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Đăng xuất nhưng vẫn thực hiện được thao tác cần đăng nhập",
        "Cách tái hiện": "Đăng xuất rồi thử vote hoặc thêm yêu thích.",
        "Kết quả thực tế": "Người dùng ở trạng thái chưa đăng nhập (khách) vẫn bấm lưu giảng viên hoặc vote đánh giá thành công mà không bị chặn.",
        "Kết quả mong đợi": "Hệ thống yêu cầu đăng nhập lại (hiển thị popup đăng nhập) trước khi thực hiện thao tác.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_09_dang_xuat_van_thuc_hien_duoc_thao_tac.png",
    },
    {
        "ID": "BUG-10",
        "Phân loại": "Trong đặc tả (In-spec)",
        "Tên bug": "Danh sách yêu thích hiển thị sai thông tin giảng viên",
        "Cách tái hiện": "Lưu thành công hai giảng viên rồi kiểm tra tên, ảnh và thông tin trong danh sách.",
        "Kết quả thực tế": "Danh sách yêu thích hiển thị hoán đổi / tráo chéo thông tin (tên, trường, chuyên môn) giữa hai giảng viên đã lưu.",
        "Kết quả mong đợi": "Mỗi mục hiển thị đúng giảng viên đã lưu.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_10_danh_sach_yeu_thich_hien_thi_sai_thong_tin.png",
    },
    {
        "ID": "BUG-11",
        "Phân loại": "Ngoài đặc tả (Out-of-spec)",
        "Tên bug": "Nhấn gửi đánh giá hai lần tạo bản ghi trùng",
        "Cách tái hiện": "Điền đánh giá rồi nhấn nút gửi liên tiếp hai lần.",
        "Kết quả thực tế": "Nút gửi không bị disable / debounce khi submit, nhấn liên tiếp tạo ra hai bản ghi đánh giá trùng lặp nội dung.",
        "Kết quả mong đợi": "Chỉ tạo một đánh giá, nút gửi bị vô hiệu hóa ngay sau lần nhấn đầu tiên để tránh duplicate.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_11_nhan_gui_hai_lan_tao_ban_ghi_trung.png",
    },
    {
        "ID": "BUG-12",
        "Phân loại": "Ngoài đặc tả (Out-of-spec)",
        "Tên bug": "Nút Back hiển thị sai thông tin giảng viên",
        "Cách tái hiện": "Mở giảng viên A, sang giảng viên B rồi nhấn Back.",
        "Kết quả thực tế": "Nhấn nút Back: URL trên thanh địa chỉ quay về Giảng viên A nhưng giao diện vẫn giữ nguyên hồ sơ Giảng viên B.",
        "Kết quả mong đợi": "Hiển thị đúng giảng viên A và URL tương ứng đồng bộ với nhau.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_12_nut_back_hien_thi_sai_thong_tin.png",
    },
    {
        "ID": "BUG-13",
        "Phân loại": "Ngoài đặc tả (Out-of-spec)",
        "Tên bug": "Mất kết nối khiến trang tải vô hạn",
        "Cách tái hiện": "Ngắt mạng khi đang tải dữ liệu, sau đó kết nối lại.",
        "Kết quả thực tế": "Vòng quay loading xoay vô hạn mà không có thời gian chờ (timeout), không hiển thị thông báo lỗi mạng hay nút thử lại.",
        "Kết quả mong đợi": "Hiển thị thông báo lỗi hoặc cho phép thử tải lại sau khi kết nối thất bại.",
        "Ảnh screenshot": "docs/screenshots/bugs/UI_BUG_13_mat_ket_noi_tai_vo_han.png",
    },
]

fieldnames = ["ID", "Phân loại", "Tên bug", "Cách tái hiện", "Kết quả thực tế", "Kết quả mong đợi", "Ảnh screenshot"]

for file_path in ["danh_sach_13_loi_kiem_thu_UI.csv", "docs/danh_sach_13_loi_kiem_thu_UI.csv"]:
    os.makedirs(os.path.dirname(file_path) if os.path.dirname(file_path) else ".", exist_ok=True)
    with open(file_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in CSV_DATA:
            writer.writerow(row)
    print(f"Generated {file_path}")

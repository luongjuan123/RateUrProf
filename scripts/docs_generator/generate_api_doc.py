import os
from styles import COMMON_CSS
from pdf_converter import convert_html_to_pdf

HTML_CONTENT = f"""<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Tài liệu giao diện lập trình ứng dụng</title>
<style>
{COMMON_CSS}
</style>
</head>
<body>

<div class="doc-header">
  <div class="doc-title">Tài liệu giao diện lập trình ứng dụng</div>
  <div class="doc-subtitle">Hệ thống Đánh giá Giảng viên và Tra cứu Học thuật Toàn quốc (RateProfCuaBan / RateUrProf). Phiên bản 1.1 ngày 27/10/2026.</div>
  <div class="doc-meta">Người lập: Lương Chí Dũng &nbsp;&nbsp;&nbsp; MSSV: 24110215 &nbsp;&nbsp;&nbsp; Lớp: BCSE2024</div>
</div>

<h1>1 Thông tin chung</h1>
<p><strong>Base URL:</strong> <code>https://rateurprofs.site</code>. Phiên bản build: <code>production-v1.1-20261024</code>.</p>
<p>Tài liệu đặc tả giao diện lập trình ứng dụng (API) cho Hệ thống Đánh giá Giảng viên và Tra cứu Học thuật Toàn quốc (RateProfCuaBan / RateUrProf), phiên bản kiểm thử và vận hành chính thức ngày 27/10/2026. Toàn bộ dữ liệu trao đổi qua API sử dụng định dạng JSON mã hóa UTF-8.</p>
<p><strong>Cơ chế xác thực và phiên làm việc:</strong> Dựa trên phiên làm việc (Session) lưu bền vững trong cơ sở dữ liệu (bảng <code>user_sessions</code>) và cookie trình duyệt <code>rateurprofs_session</code> (với cờ <code>Secure=true</code>, <code>HttpOnly=true</code>, <code>SameSite=Lax</code>, <code>Path=/</code>). Thời hạn phiên làm việc là 30 ngày. DB lưu chuỗi băm an toàn của token phiên, client không lưu token trong localStorage. Hệ thống hỗ trợ đăng nhập qua Google OAuth 2.0 (OpenID Connect).</p>
<p><strong>Phân quyền (RBAC):</strong> Hệ thống thực thi phân quyền theo 6 vai trò: <code>student</code> (sinh viên thông thường), <code>moderator</code> (kiểm duyệt viên đánh giá), <code>support</code> (hỗ trợ giải quyết khiếu nại), <code>security</code> (an toàn dữ liệu), <code>admin</code> (quản trị viên hệ thống), <code>super_admin</code> (quản trị viên tối cao).</p>
<p><strong>Bảo vệ ranh giới HTTP và CSRF:</strong> Mọi yêu cầu thay đổi dữ liệu (POST, PATCH, DELETE) bắt buộc phải có phiên đăng nhập hợp lệ và gửi từ Origin chính thức. Header Host bắt buộc khớp domain cấu hình; nếu Host sai, hệ thống từ chối ngay lập tức.</p>
<p><strong>Quy chuẩn dữ liệu gửi lên (Request Body):</strong> Giới hạn dung lượng tối đa 16 KiB và thời gian đọc stream tối đa 10 giây; vượt quá nhận 413 BODY_TOO_LARGE hoặc 408 BODY_TIMEOUT. Các yêu cầu POST/PATCH yêu cầu Content-Type: application/json. Chuỗi văn bản được trim khoảng trắng ở hai đầu, từ chối ký tự NUL và surrogate.</p>
<p><strong>Đánh giá đa tiêu chí và Rollup nguyên tử:</strong> Mỗi bài đánh giá giảng viên bao gồm 5 tiêu chí (1–5 sao): Chất lượng giảng dạy, Độ rõ ràng, Tính công bằng chấm điểm, Độ khó bài tập, và Khả năng hỗ trợ. Đánh giá trường đại học gồm 10 tiêu chí (1–5 sao). Điểm trung bình (ratingAverage), điểm độ khó (difficultyScore) và tỷ lệ học lại (takeAgainPercent) được tự động tính toán lại đồng bộ trong giao dịch cơ sở dữ liệu khi có thay đổi.</p>
<p><strong>Tuân thủ Nghị định 13/2023/NĐ-CP:</strong> Cung cấp endpoint tiếp nhận yêu cầu đính chính học hàm, công tác hoặc yêu cầu xóa dữ liệu cá nhân theo đúng luật định.</p>
<p><strong>Phân trang và tìm kiếm:</strong> Danh sách trả về cấu trúc chuẩn <code>SearchResult</code> gồm items, totalCount, page, pageSize, totalPages, hasNextPage. Tìm kiếm hỗ trợ tiếng Việt không dấu (diacritic-insensitive).</p>
<p><strong>Định dạng phản hồi lỗi:</strong> Mọi lỗi đều trả về cấu trúc JSON chuẩn: <code>{{"error": {{"code": "STRING_CODE", "message": "Thông điệp mô tả lỗi tiếng Việt", "details": {{}}}}}}</code>.</p>

<h1>2 Mã lỗi chung</h1>
<table>
  <thead>
    <tr>
      <th style="width: 10%;">HTTP</th>
      <th style="width: 25%;">Mã</th>
      <th style="width: 65%;">Ý nghĩa</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="text-center">400</td><td>BAD_REQUEST</td><td>Dữ liệu gửi lên sai định dạng cú pháp JSON hoặc thiếu trường bắt buộc.</td></tr>
    <tr><td class="text-center">401</td><td>UNAUTHENTICATED</td><td>Chưa xác thực, thiếu cookie phiên, cookie không hợp lệ hoặc phiên đã hết hạn / bị thu hồi.</td></tr>
    <tr><td class="text-center">403</td><td>FORBIDDEN</td><td>Tài khoản không có quyền hạn thực hiện thao tác trên tài nguyên này.</td></tr>
    <tr><td class="text-center">403</td><td>ACCOUNT_LOCKED</td><td>Tài khoản đã bị tạm khóa do vi phạm quy chuẩn cộng đồng.</td></tr>
    <tr><td class="text-center">403</td><td>ORIGIN_REJECTED</td><td>Yêu cầu xuất phát từ Origin lạ hoặc không hợp lệ.</td></tr>
    <tr><td class="text-center">404</td><td>NOT_FOUND</td><td>Không tìm thấy tài nguyên yêu cầu (giảng viên, trường học, bài đánh giá không tồn tại).</td></tr>
    <tr><td class="text-center">405</td><td>METHOD_NOT_ALLOWED</td><td>Phương thức HTTP không được hỗ trợ trên endpoint yêu cầu.</td></tr>
    <tr><td class="text-center">408</td><td>BODY_TIMEOUT</td><td>Quá thời gian nhận dữ liệu body yêu cầu (vượt quá 10 giây).</td></tr>
    <tr><td class="text-center">409</td><td>DUPLICATE_REVIEW</td><td>Sinh viên đã gửi đánh giá cho môn học này của giảng viên trước đó.</td></tr>
    <tr><td class="text-center">409</td><td>ALREADY_VOTED</td><td>Tài khoản đã bình chọn hữu ích cho bài đánh giá này trước đó.</td></tr>
    <tr><td class="text-center">413</td><td>BODY_TOO_LARGE</td><td>Dung lượng dữ liệu gửi lên vượt quá giới hạn cho phép 16 KiB.</td></tr>
    <tr><td class="text-center">415</td><td>UNSUPPORTED_MEDIA_TYPE</td><td>Content-Type không phải là application/json.</td></tr>
    <tr><td class="text-center">422</td><td>VALIDATION_ERROR</td><td>Dữ liệu không hợp lệ: điểm số ngoài miền 1–5, nhận xét quá ngắn (&lt;10 ký tự) hoặc quá dài (&gt;2000 ký tự).</td></tr>
    <tr><td class="text-center">429</td><td>RATE_LIMITED</td><td>Vượt quá giới hạn tần suất yêu cầu cho phép (Retry-After: 60).</td></tr>
    <tr><td class="text-center">500</td><td>INTERNAL_ERROR</td><td>Lỗi nội bộ máy chủ trong quá trình xử lý.</td></tr>
    <tr><td class="text-center">503</td><td>DATABASE_UNAVAILABLE</td><td>Cơ sở dữ liệu chưa sẵn sàng hoặc bị gián đoạn kết nối.</td></tr>
  </tbody>
</table>

<h1>3 Danh sách endpoint</h1>
<table>
  <thead>
    <tr>
      <th style="width: 5%;">STT</th>
      <th style="width: 10%;">Method</th>
      <th style="width: 33%;">Endpoint</th>
      <th style="width: 32%;">Chức năng</th>
      <th style="width: 10%;">SRS</th>
      <th style="width: 10%;">Quyền</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="text-center">1</td><td>GET</td><td>/api/health</td><td>Kiểm tra trạng thái tiến trình và kết nối cơ sở dữ liệu</td><td>NFR-P01</td><td>Công khai</td></tr>
    <tr><td class="text-center">2</td><td>GET</td><td>/api/auth/me</td><td>Lấy thông tin tài khoản phiên hiện tại</td><td>AUTH-02</td><td>Đã đăng nhập</td></tr>
    <tr><td class="text-center">3</td><td>GET</td><td>/api/auth/google/signin</td><td>Khởi tạo URL đăng nhập Google OAuth 2.0</td><td>AUTH-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">4</td><td>GET</td><td>/api/auth/google/callback</td><td>Xử lý mã xác thực Google và cấp phiên làm việc</td><td>AUTH-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">5</td><td>POST</td><td>/api/auth/logout</td><td>Đăng xuất và hủy phiên làm việc</td><td>AUTH-03</td><td>Đã đăng nhập</td></tr>
    <tr><td class="text-center">6</td><td>PATCH</td><td>/api/auth/profile</td><td>Cập nhật ngành học, niên khóa sinh viên</td><td>USER-01</td><td>Đã đăng nhập</td></tr>
    <tr><td class="text-center">7</td><td>POST</td><td>/api/account/delete</td><td>Yêu cầu xóa tài khoản theo Nghị định 13/2023/NĐ-CP</td><td>USER-03</td><td>Đã đăng nhập</td></tr>
    <tr><td class="text-center">8</td><td>GET</td><td>/api/professors/search</td><td>Tìm kiếm giảng viên toàn quốc đa tiêu chí</td><td>SEARCH-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">9</td><td>GET</td><td>/api/professors/{{id}}</td><td>Xem thông tin chi tiết hồ sơ học thuật giảng viên</td><td>PROF-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">10</td><td>GET</td><td>/api/professors/{{id}}/reviews</td><td>Lấy danh sách đánh giá của giảng viên</td><td>REVIEW-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">11</td><td>POST</td><td>/api/professors/{{id}}/reviews</td><td>Gửi đánh giá môn học của giảng viên (5 tiêu chí)</td><td>REVIEW-01</td><td>Sinh viên</td></tr>
    <tr><td class="text-center">12</td><td>POST</td><td>/api/reviews/{{id}}/upvote</td><td>Bình chọn nhận xét đánh giá hữu ích</td><td>REVIEW-03</td><td>Sinh viên</td></tr>
    <tr><td class="text-center">13</td><td>PATCH</td><td>/api/reviews/{{id}}/moderate</td><td>Kiểm duyệt trạng thái bài đánh giá</td><td>MOD-01</td><td>Admin/Mod</td></tr>
    <tr><td class="text-center">14</td><td>GET</td><td>/api/universities</td><td>Tra cứu danh bạ trường đại học toàn quốc</td><td>SCHOOL-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">15</td><td>GET</td><td>/api/universities/{{id}}</td><td>Xem thông tin trường và cơ cấu khoa đào tạo</td><td>SCHOOL-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">16</td><td>GET</td><td>/api/universities/{{id}}/reviews</td><td>Lấy danh sách đánh giá trường học</td><td>SCHOOL-02</td><td>Công khai</td></tr>
    <tr><td class="text-center">17</td><td>POST</td><td>/api/universities/{{id}}/reviews</td><td>Gửi đánh giá môi trường trường học (10 tiêu chí)</td><td>SCHOOL-02</td><td>Sinh viên</td></tr>
    <tr><td class="text-center">18</td><td>GET</td><td>/api/autocomplete</td><td>Gợi ý tức thì tên giảng viên và trường học</td><td>SEARCH-03</td><td>Công khai</td></tr>
    <tr><td class="text-center">19</td><td>GET</td><td>/api/facets</td><td>Lấy dữ liệu danh mục phân nhánh bộ lọc</td><td>SEARCH-04</td><td>Công khai</td></tr>
    <tr><td class="text-center">20</td><td>POST</td><td>/api/reports</td><td>Báo cáo nhận xét vi phạm quy chuẩn cộng đồng</td><td>MOD-02</td><td>Sinh viên</td></tr>
    <tr><td class="text-center">21</td><td>GET</td><td>/api/correction-requests</td><td>Danh sách yêu cầu đính chính dữ liệu</td><td>LEGAL-01</td><td>Admin</td></tr>
    <tr><td class="text-center">22</td><td>POST</td><td>/api/correction-requests</td><td>Gửi yêu cầu đính chính / gỡ bỏ theo Nghị định 13</td><td>LEGAL-01</td><td>Công khai</td></tr>
    <tr><td class="text-center">23</td><td>GET</td><td>/api/users/{{id}}/saved-professors</td><td>Lấy danh sách giảng viên đã lưu cá nhân</td><td>USER-02</td><td>Chính chủ</td></tr>
    <tr><td class="text-center">24</td><td>POST</td><td>/api/users/{{id}}/saved-professors</td><td>Thêm hoặc xóa giảng viên khỏi danh sách đã lưu</td><td>USER-02</td><td>Chính chủ</td></tr>
    <tr><td class="text-center">25</td><td>GET</td><td>/api/admin/moderation</td><td>Lấy hàng đợi bài đánh giá chờ duyệt</td><td>MOD-01</td><td>Admin/Mod</td></tr>
  </tbody>
</table>

<h1>3.1 Cấu trúc dữ liệu dùng chung</h1>

<h3>CriteriaRatings (5 tiêu chí giảng viên)</h3>
<table>
  <thead><tr><th style="width: 25%;">Trường</th><th style="width: 20%;">Kiểu</th><th style="width: 55%;">Ràng buộc và mô tả</th></tr></thead>
  <tbody>
    <tr><td>teachingQuality</td><td>number</td><td>Chất lượng giảng dạy (1.0 đến 5.0).</td></tr>
    <tr><td>clarity</td><td>number</td><td>Độ rõ ràng và truyền đạt (1.0 đến 5.0).</td></tr>
    <tr><td>gradingFairness</td><td>number</td><td>Tính công bằng trong chấm điểm (1.0 đến 5.0).</td></tr>
    <tr><td>difficulty</td><td>number</td><td>Độ khó bài tập và môn học (1.0 đến 5.0).</td></tr>
    <tr><td>communication</td><td>number</td><td>Khả năng tiếp cận và hỗ trợ sinh viên (1.0 đến 5.0).</td></tr>
  </tbody>
</table>

<h3>Professor (Hồ sơ giảng viên)</h3>
<table>
  <thead><tr><th style="width: 25%;">Trường</th><th style="width: 20%;">Kiểu</th><th style="width: 55%;">Ràng buộc và mô tả</th></tr></thead>
  <tbody>
    <tr><td>id</td><td>string</td><td>Mã định danh duy nhất của giảng viên.</td></tr>
    <tr><td>name</td><td>string</td><td>Họ và tên đầy đủ của giảng viên.</td></tr>
    <tr><td>title</td><td>string|null</td><td>Chức danh học hàm, học vị (ví dụ: "PGS. TS").</td></tr>
    <tr><td>academicRank</td><td>string|null</td><td>Học hàm chuẩn hóa nhà nước phong tặng: "GS", "PGS" hoặc null.</td></tr>
    <tr><td>universityId</td><td>string</td><td>Mã trường đại học trực thuộc.</td></tr>
    <tr><td>universityShortName</td><td>string</td><td>Tên viết tắt của trường (ví dụ: "HUST", "HCMUT").</td></tr>
    <tr><td>faculty</td><td>string|null</td><td>Tên Khoa / Viện đào tạo.</td></tr>
    <tr><td>ratingAverage</td><td>number|null</td><td>Điểm đánh giá trung bình (1.00 đến 5.00) hoặc null nếu chưa có.</td></tr>
    <tr><td>ratingCount</td><td>number</td><td>Tổng số lượng bài đánh giá hợp lệ.</td></tr>
    <tr><td>difficultyScore</td><td>number|null</td><td>Điểm độ khó trung bình (1.00 đến 5.00).</td></tr>
    <tr><td>takeAgainPercent</td><td>number|null</td><td>Tỷ lệ phần trăm sinh viên sẵn sàng học lại (0 đến 100%).</td></tr>
    <tr><td>photoUrl</td><td>string|null</td><td>Đường dẫn ảnh chân dung hoặc null.</td></tr>
    <tr><td>photoStatus</td><td>string</td><td>"verified_photo", "default_avatar", "pending_verification".</td></tr>
  </tbody>
</table>

<h3>Review (Bài đánh giá sinh viên)</h3>
<table>
  <thead><tr><th style="width: 25%;">Trường</th><th style="width: 20%;">Kiểu</th><th style="width: 55%;">Ràng buộc và mô tả</th></tr></thead>
  <tbody>
    <tr><td>id</td><td>string</td><td>Mã bài đánh giá duy nhất.</td></tr>
    <tr><td>lecturerId</td><td>string</td><td>Mã giảng viên được đánh giá.</td></tr>
    <tr><td>userId</td><td>string</td><td>Mã định danh ẩn danh của tài khoản sinh viên.</td></tr>
    <tr><td>userDisplayName</td><td>string</td><td>Tên hiển thị bảo mật (ví dụ: "Sinh viên K65 - CNTT").</td></tr>
    <tr><td>courseName</td><td>string</td><td>Tên môn học (1–120 ký tự).</td></tr>
    <tr><td>overallRating</td><td>number</td><td>Điểm đánh giá tổng quan (1 đến 5).</td></tr>
    <tr><td>difficultyScore</td><td>number</td><td>Độ khó bài tập (1 đến 5).</td></tr>
    <tr><td>takeAgain</td><td>boolean</td><td>Sẵn sàng học lại hay không (true/false).</td></tr>
    <tr><td>comment</td><td>string</td><td>Nhận xét chi tiết (10 đến 2.000 ký tự sau trim).</td></tr>
    <tr><td>helpfulCount</td><td>number</td><td>Số lượt bình chọn nhận xét hữu ích.</td></tr>
    <tr><td>status</td><td>string</td><td>Trạng thái kiểm duyệt: "published", "pending", "flagged", "hidden".</td></tr>
    <tr><td>createdAt</td><td>number</td><td>Thời điểm gửi đánh giá (Epoch milliseconds).</td></tr>
  </tbody>
</table>

<h1>4 Đặc tả từng endpoint chi tiết</h1>

<div class="endpoint-block">
  <div class="endpoint-title">4.1 GET /api/health</div>
  <p>Kiểm tra trạng thái hoạt động của máy chủ và thống kê dữ liệu. Quyền: Công khai.</p>
  <p><strong>Request mẫu:</strong><br>
  GET /api/health HTTP/1.1<br>
  Host: rateurprofs.site<br>
  Accept: application/json</p>
  <p><strong>Response thành công (HTTP 200 OK):</strong></p>
  <pre>{{"status":"healthy","service":"RateUrProfs","version":"1.1.0","backend":"Cloud SQL (PostgreSQL)","universitiesCount":35,"lecturersCount":2150,"timestamp":"2026-10-27T10:15:00.000Z"}}</pre>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.2 GET /api/auth/me</div>
  <p>Lấy thông tin tài khoản phiên hiện tại từ cookie. Quyền: Đã đăng nhập.</p>
  <p><strong>Headers:</strong> Cookie: rateurprofs_session=EXAMPLE_SESSION_TOKEN</p>
  <p><strong>Response thành công (HTTP 200 OK):</strong></p>
  <pre>{{"user":{{"uid":"goog_109823471029","email":"student_k65@hust.edu.vn","displayName":"Lương Chí Dũng","role":"student","status":"active","cohort":"K65"}}}}</pre>
  <p><strong>Mã lỗi:</strong> 401 UNAUTHENTICATED (thiếu cookie hoặc phiên hết hạn); 403 ACCOUNT_LOCKED (tài khoản bị khóa).</p>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.3 GET /api/professors/search</div>
  <p>Tìm kiếm giảng viên toàn quốc kết hợp lọc đa chiều và phân trang. Quyền: Công khai.</p>
  <p><strong>Tham số truy vấn:</strong> q (từ khóa không dấu), university (mã trường), faculty (khoa), academicRank (GS/PGS), minRating (1.0-5.0), page (mặc định 1), pageSize (mặc định 12, max 50), sort (relevance, rating_desc, reviews_desc).</p>
  <p><strong>Response thành công (HTTP 200 OK):</strong></p>
  <pre>{{"items":[{{"id":"prof-hust-soict-001","name":"Huỳnh Quyết Thắng","title":"PGS. TS","academicRank":"PGS","universityId":"hust","universityShortName":"HUST","ratingAverage":4.85,"ratingCount":42,"difficultyScore":3.2,"takeAgainPercent":95}}],"totalCount":1,"page":1,"pageSize":12,"totalPages":1,"hasNextPage":false,"executionTimeMs":24}}</pre>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.4 GET /api/professors/{{id}}</div>
  <p>Xem thông tin chi tiết hồ sơ học thuật, nguồn minh chứng trích dẫn và phân bổ đánh giá của giảng viên. Quyền: Công khai.</p>
  <p><strong>Response thành công (HTTP 200 OK):</strong></p>
  <pre>{{"id":"prof-hust-soict-001","name":"Huỳnh Quyết Thắng","title":"PGS. TS","academicRank":"PGS","universityId":"hust","universityName":"Đại học Bách khoa Hà Nội","ratingAverage":4.85,"ratingCount":42,"ratingDistribution":{{"1":0,"2":1,"3":2,"4":9,"5":30}},"sources":[{{"id":"src-01","url":"https://soict.hust.edu.vn/can-bo/huynh-quyet-thang.html","reliability":"official_primary"}}]}}</pre>
  <p><strong>Mã lỗi:</strong> 404 NOT_FOUND nếu giảng viên không tồn tại.</p>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.5 POST /api/professors/{{id}}/reviews</div>
  <p>Gửi đánh giá môn học của giảng viên theo 5 tiêu chí. Quyền: Sinh viên đã đăng nhập.</p>
  <p><strong>Request Body:</strong></p>
  <pre>{{"universityId":"hust","courseName":"Kiến trúc máy tính (IT3020)","overallRating":5,"difficultyScore":3,"takeAgain":true,"attendanceMandatory":false,"gradeReceived":"A","comment":"Thầy dạy rất tận tâm, bài giảng thực tế và dễ hiểu."}}</pre>
  <p><strong>Response thành công (HTTP 201 Created):</strong></p>
  <pre>{{"success":true,"id":"rev-1729701234-9f8e7d"}}</pre>
  <p><strong>Mã lỗi:</strong> 401 UNAUTHENTICATED; 409 DUPLICATE_REVIEW (đã đánh giá môn này); 422 VALIDATION_ERROR (nhận xét dưới 10 ký tự hoặc sai miền điểm).</p>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.6 POST /api/reviews/{{id}}/upvote</div>
  <p>Bình chọn nhận xét đánh giá là hữu ích. Mỗi tài khoản chỉ vote 1 lần. Quyền: Sinh viên.</p>
  <p><strong>Response thành công (HTTP 200 OK):</strong></p>
  <pre>{{"success":true,"helpfulCount":18}}</pre>
  <p><strong>Mã lỗi:</strong> 401 UNAUTHENTICATED; 409 ALREADY_VOTED (đã bình chọn trước đó).</p>
</div>

<div class="endpoint-block">
  <div class="endpoint-title">4.7 POST /api/correction-requests</div>
  <p>Tiếp nhận yêu cầu đính chính học hàm hoặc gỡ bỏ thông tin cá nhân theo Nghị định 13/2023/NĐ-CP. Quyền: Công khai.</p>
  <p><strong>Request Body:</strong></p>
  <pre>{{"professorId":"prof-hust-soict-001","professorName":"Huỳnh Quyết Thắng","requestType":"correction","contactEmail":"thang.hq@hust.edu.vn","notes":"Đề nghị cập nhật thông tin chức danh học hàm PGS."}}</pre>
  <p><strong>Response thành công (HTTP 201 Created):</strong></p>
  <pre>{{"success":true,"id":"req-1729704567-c4d5e6"}}</pre>
</div>

<h1>5 Tài khoản dùng gọi API kiểm thử</h1>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Tài khoản</th>
      <th style="width: 25%;">Vai trò</th>
      <th style="width: 50%;">Mục đích kiểm thử</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>dungpubgame@gmail.com</td><td>Super Admin</td><td>Kiểm tra toàn quyền hệ thống, quản lý tài khoản, điều phối crawler.</td></tr>
    <tr><td>mod_academic@rateurprofs.site</td><td>Moderator</td><td>Kiểm duyệt bài đánh giá, ẩn/hiện nhận xét vi phạm.</td></tr>
    <tr><td>student_k65@hust.edu.vn</td><td>Student</td><td>Kiểm tra gửi đánh giá 5 tiêu chí, upvote hữu ích, báo cáo vi phạm.</td></tr>
    <tr><td>Khách vãng lai</td><td>Guest</td><td>Kiểm tra tra cứu công khai, gợi ý tìm kiếm, gửi phiếu đính chính NĐ 13.</td></tr>
  </tbody>
</table>

</body>
</html>"""

def main():
    out_dir = "/home/juan/Work Space/rateprofcuaban/docs"
    os.makedirs(out_dir, exist_ok=True)
    html_file = os.path.join(out_dir, "Tai_Lieu_Giao_Dien_Lap_Trinh_Ung_Dung_API_RateProfCuaBan.html")
    pdf_file = os.path.join(out_dir, "Tai_Lieu_Giao_Dien_Lap_Trinh_Ung_Dung_API_RateProfCuaBan.pdf")
    root_pdf = "/home/juan/Work Space/rateprofcuaban/Tai_Lieu_Giao_Dien_Lap_Trinh_Ung_Dung_API_RateProfCuaBan.pdf"
    
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(HTML_CONTENT)
    print(f"HTML written to {html_file}")
    
    convert_html_to_pdf(html_file, pdf_file, "Tài liệu Giao diện Lập trình Ứng dụng (API v1.1)")
    import shutil
    shutil.copyfile(pdf_file, root_pdf)
    print(f"PDF successfully generated: {pdf_file}")

if __name__ == '__main__':
    main()

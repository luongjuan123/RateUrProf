import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Scale,
  EyeOff,
  FileCheck2,
  Lock,
  RotateCcw,
  BookOpen,
} from "lucide-react";

export default function GuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-6 space-y-2">
        <div className="eyebrow-tag text-[#e03a3e]">
          Nguyên tắc ứng xử, Minh bạch Nguồn gốc &amp; Pháp lý
        </div>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950">
          Quy chuẩn Cộng đồng, Nguồn gốc Dữ liệu &amp; Chính sách Pháp lý
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed font-medium">
          RateProfCuaBan là nền tảng thông tin học thuật toàn quốc kết hợp đánh giá sinh viên, được xây dựng với sứ mệnh nâng cao chất lượng giáo dục đại học tại Việt Nam một cách minh bạch, độc lập, có trích dẫn nguồn gốc và tuân thủ pháp luật.
        </p>
      </div>

      {/* Core Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-gray-50 border border-gray-200 space-y-2">
          <Scale className="w-6 h-6 text-[#e03a3e]" />
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-tight">
            Khách quan &amp; Độc lập
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Phản hồi dựa trên trải nghiệm học tập thực tế về bài giảng, khối lượng đồ án và sự hỗ trợ trong học kỳ.
          </p>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 space-y-2">
          <EyeOff className="w-6 h-6 text-[#e03a3e]" />
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-tight">
            Ẩn danh &amp; An toàn
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Danh tính sinh viên luôn được bảo mật tuyệt đối dưới dạng mã sinh viên hoặc niên khóa công khai.
          </p>
        </div>

        <div className="p-5 bg-gray-50 border border-gray-200 space-y-2">
          <ShieldCheck className="w-6 h-6 text-[#e03a3e]" />
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-tight">
            Văn minh &amp; Tôn trọng
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Tuyệt đối không sử dụng ngôn từ xúc phạm, thù địch, quấy rối hay công kích cá nhân đối với bất kỳ ai.
          </p>
        </div>
      </div>

      {/* SECTION: ACADEMIC DATA PROVENANCE & TRANSPARENCY */}
      <div className="p-6 bg-blue-50/60 border border-blue-200 space-y-4">
        <div className="flex items-center gap-2 text-blue-950 font-extrabold text-base uppercase tracking-wider">
          <FileCheck2 className="w-5 h-5 text-blue-700" />
          <span>Chính sách Nguồn gốc Dữ liệu Học thuật (Academic Provenance Policy)</span>
        </div>
        <p className="text-xs text-blue-900 leading-relaxed">
          Nhằm xây dựng kho dữ liệu giáo dục đại học tin cậy và minh bạch trên toàn quốc, RateProfCuaBan tuân thủ các nguyên tắc dữ liệu nghiêm ngặt:
        </p>
        <ul className="space-y-2.5 text-xs text-blue-950 font-medium">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Thu thập từ nguồn công vụ chính thức:</strong> Danh bạ trường, khoa, viện, học hàm (GS, PGS, TS), chức vụ công tác và hướng nghiên cứu được thu thập tự động từ cổng thông tin chính thức có tên miền hợp pháp (.edu.vn) của các cơ sở giáo dục đại học tại Việt Nam.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Lưu vết kiểm chứng (Provenance Tracking):</strong> Mỗi trường dữ liệu đều lưu trữ liên kết nguồn gốc (source URL), thời điểm thu thập (timestamp) và chỉ số tin cậy (confidence score). Người dùng và giảng viên có thể xem trực tiếp nguồn kiểm chứng tại mục &quot;Nguồn xác minh&quot;.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span>
              <strong>Bảo vệ Bản quyền Ảnh &amp; Thay thế Trung tính:</strong> Nền tảng chỉ sử dụng ảnh đại diện khi có sự cho phép rõ ràng từ danh bạ công vụ. Nếu nguồn ảnh không rõ bản quyền, hệ thống tự động sử dụng ảnh đại diện chữ cái (SVG initials avatar) trung tính nhằm tôn trọng quyền riêng tư.
            </span>
          </li>
        </ul>
      </div>

      {/* SECTION: SEPARATION OF FACTS VS OPINIONS */}
      <div className="p-6 bg-slate-50 border border-slate-300 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base uppercase tracking-wider">
          <BookOpen className="w-5 h-5 text-slate-700" />
          <span>Phân định Rõ ràng giữa Sự thật Học thuật và Nhận xét Độc lập</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-white border border-slate-200 space-y-2">
            <span className="font-bold text-slate-950 uppercase block">1. Hồ sơ Học thuật (Academic Facts)</span>
            <p className="text-slate-600 leading-relaxed">
              Bao gồm thông tin chức danh, trường đào tạo, danh sách môn học, công trình nghiên cứu và email liên hệ công vụ. Dữ liệu này được đối soát khách quan từ website trường và <strong>chỉ quản trị viên hệ thống có quyền cập nhật</strong> sau khi xác thực.
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 space-y-2">
            <span className="font-bold text-slate-950 uppercase block">2. Đánh giá của Sinh viên (Student Evaluations)</span>
            <p className="text-slate-600 leading-relaxed">
              Bao gồm nhận xét về độ khó, tính rõ ràng, điểm số trung bình. Đây là ý kiến cá nhân độc lập dựa trên trải nghiệm học phần thực tế, không đại diện cho quan điểm chính thức của trường đại học hay RateProfCuaBan.
            </p>
          </div>
        </div>
      </div>

      {/* Do and Don't Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* DO */}
        <div className="p-6 bg-emerald-50/50 border border-emerald-200 space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Nên làm (Khuyến khích)</span>
          </div>
          <ul className="space-y-3 text-xs text-emerald-950 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Chia sẻ về phương pháp sư phạm: Thầy/cô giải thích lý thuyết có dễ hiểu không, slide có trực quan không.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Nhận xét về độ khó bài tập lớn, hình thức thi giữa kỳ và cuối kỳ (trắc nghiệm, tự luận, code, vấn đáp).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Gợi ý lời khuyên cho sinh viên khóa sau cách học tập hiệu quả nhất để đạt điểm cao.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span>Đưa ra góp ý mang tính xây dựng chân thành, ngay cả khi trải nghiệm của bạn chưa như kỳ vọng.</span>
            </li>
          </ul>
        </div>

        {/* DON'T */}
        <div className="p-6 bg-red-50/50 border border-red-200 space-y-4">
          <div className="flex items-center gap-2 text-red-900 font-extrabold text-sm uppercase tracking-wider">
            <XCircle className="w-5 h-5 text-red-600" />
            <span>Nghiêm cấm (Xử lý ngay)</span>
          </div>
          <ul className="space-y-3 text-xs text-red-950 font-medium">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Doxxing:</strong> Tiết lộ số điện thoại riêng, địa chỉ nhà, tài khoản mạng xã hội cá nhân hoặc đời tư của giảng viên.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Xúc phạm danh dự:</strong> Dùng từ ngữ thô tục, chửi thề, lăng mạ nhân phẩm hoặc xúc phạm ngoại hình.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Vu khống:</strong> Bịa đặt các cáo buộc tiêu cực không có bằng chứng xác thực hoặc vi phạm pháp luật.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Spam:</strong> Đăng tải nội dung quảng cáo tài liệu có phí, dịch vụ học hộ hoặc nội dung không liên quan.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* SECTION: CORRECTION & TAKEDOWN REQUEST PROTOCOL */}
      <div id="dinh-chinh" className="p-6 bg-amber-50/60 border border-amber-200 space-y-4">
        <div className="flex items-center gap-2 text-amber-950 font-extrabold text-base uppercase tracking-wider">
          <RotateCcw className="w-5 h-5 text-amber-700" />
          <span>Quy trình Yêu cầu Đính chính &amp; Quyền Gỡ bỏ Dữ liệu (Right to Erasure &amp; Correction)</span>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          Chúng tôi luôn sẵn sàng lắng nghe ý kiến phản hồi từ các thầy cô giáo, nhà nghiên cứu và cơ sở đào tạo:
        </p>
        <div className="space-y-3 text-xs text-amber-950">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-800">1. Đính chính thông tin học thuật:</span>
            <span>
              Nếu chức danh, môn giảng dạy, hoặc cơ quan công tác có sự thay đổi, quý thầy cô có thể bấm nút <strong>&quot;Đề xuất đính chính&quot;</strong> ngay trên trang hồ sơ cá nhân hoặc gửi kèm minh chứng về email <span className="font-mono font-bold">compliance@rateprofcuaban.vn</span>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-800">2. Yêu cầu ẩn hoặc gỡ bỏ thông tin:</span>
            <span>
              Quý giảng viên hoặc đại diện hợp pháp của nhà trường có quyền gửi văn bản yêu cầu gỡ bỏ hoặc cập nhật hồ sơ. Ban Quản trị cam kết phản hồi và xử lý trong vòng <strong>24 đến 48 giờ làm việc</strong>.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-800">3. Báo cáo bình luận tiêu cực hoặc vi phạm:</span>
            <span>
              Bất kỳ nhận xét nào vi phạm quy chuẩn cộng đồng (doxxing, lăng mạ, vu khống) sẽ được gỡ bỏ ngay lập tức khi được báo cáo thông qua nút <strong>&quot;Báo cáo&quot;</strong> hoặc qua kênh hỗ trợ trực tiếp.
            </span>
          </div>
        </div>
      </div>

      {/* Moderation & Contact Info */}
      <div id="lien-he" className="p-6 bg-gray-50 border border-gray-200 space-y-3">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-900">
          Liên hệ Ban Quản trị &amp; Bộ phận Pháp chế
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Mọi thắc mắc, đề xuất hợp tác hoặc yêu cầu hỗ trợ pháp lý, xin vui lòng liên hệ:
          <br />
          - Email Quản trị: <span className="font-mono font-bold text-gray-900">bqt@rateprofcuaban.vn</span>
          <br />
          - Email Pháp chế &amp; Đính chính: <span className="font-mono font-bold text-gray-900">compliance@rateprofcuaban.vn</span>
        </p>
        <div className="pt-2">
          <Link
            href="/professors"
            className="inline-block px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e03a3e] transition-colors"
          >
            Quay lại tìm kiếm giảng viên
          </Link>
        </div>
      </div>
    </div>
  );
}

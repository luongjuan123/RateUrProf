"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation, Locale } from "@/locales/i18n";
export default function CopyrightPage() {
  const { locale, setLocale } = useTranslation();
  const [activeLang, setActiveLang] = useState<Locale>(locale);

  const switchLang = (lang: Locale) => {
    setActiveLang(lang);
    setLocale(lang);
  };

  const isEn = activeLang === "en";

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 font-mono">
      {/* 1. EDITORIAL HEADER & LANGUAGE TOGGLE */}
      <div className="border-b border-gray-200 pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center px-3 py-1 text-[11px] font-black uppercase tracking-widest bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
            {isEn ? "Intellectual Property & DMCA" : "Sở hữu Trí tuệ & DMCA"}
          </span>

          {/* Quick In-Page Language Switcher */}
          <div className="inline-flex items-center border border-gray-200 bg-white">
            <div className="px-2 py-1 bg-[#1d4ed8] text-white text-[10px] font-black uppercase flex items-center">
              <span>Lang</span>
            </div>
            <button
              type="button"
              onClick={() => switchLang("vi")}
              className={`px-3 py-1 text-xs font-black uppercase transition-all ${
                activeLang === "vi"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-white text-gray-700 hover:bg-[#eff6ff]"
              }`}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => switchLang("en")}
              className={`px-3 py-1 text-xs font-black uppercase transition-all border-l border-gray-200 ${
                activeLang === "en"
                  ? "bg-[#1d4ed8] text-white"
                  : "bg-white text-gray-700 hover:bg-[#eff6ff]"
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-gray-900">
            {isEn
              ? "RateUrProfs Copyright Compliance Policy"
              : "Chính sách Tuân thủ Bản quyền RateUrProfs"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
            {isEn
              ? "This is the official Copyright Compliance Policy (\"Copyright Compliance Policy\") for the RateUrProfs website (rateurprofs.site), application, or other interactive services. This policy is an integral part of our Terms of Use Agreement and is legally binding on all users."
              : "Đây là Chính sách Tuân thủ Bản quyền chính thức (\"Chính sách Bản quyền\") áp dụng cho website RateUrProfs (rateurprofs.site), ứng dụng và các dịch vụ học thuật liên quan. Chính sách này là một bộ phận không tách rời của Thỏa thuận Điều khoản Sử dụng và có giá trị pháp lý ràng buộc mọi người dùng."}
          </p>
          <div className="pt-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {isEn ? "Last Modified: February 8, 2024 (Updated 2026)" : "Cập nhật lần cuối: Ngày 08 tháng 02 năm 2024 (Cập nhật 2026)"}
          </div>
        </div>
      </div>

      {/* 2. STATUTORY CAUTION ON PERJURY & FALSE CLAIMS */}
      <div className="p-6 bg-[#eff6ff] border border-[#bfdbfe] space-y-3">
        <div className="flex items-center text-[#1d4ed8] font-black text-sm uppercase tracking-wider">
          <span>
            {isEn
              ? "Statutory Caution: Severe Penalties for Misrepresentation & Perjury"
              : "Cảnh báo Pháp lý: Trách nhiệm Nặng nề đối với Hành vi Khai man"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-bold">
          {isEn
            ? "WE CAUTION YOU THAT IF YOU KNOWINGLY MISREPRESENT THAT ONLINE CONTENT IS INFRINGING, OR WAS REMOVED DUE TO MISTAKE OR MISIDENTIFICATION, YOU MAY BE SUBJECT TO HEAVY CIVIL PENALTIES. THESE INCLUDE MONETARY DAMAGES, COURT COSTS, AND ATTORNEYS' FEES INCURRED BY US, BY ANY COPYRIGHT OWNER, OR BY ANY INJURED LICENSEE. YOU MAY ALSO BE SUBJECT TO CRIMINAL PROSECUTION FOR PERJURY UNDER APPLICABLE LAW."
            : "CHÚNG TÔI CẢNH BÁO RẰNG NẾU BẠN CỐ Ý KHAI BÁO SAI RẰNG NỘI DUNG VI PHẠM BẢN QUYỀN HOẶC BỊ GỠ BỎ DO NHẦM LẪN, BẠN CÓ THỂ PHẢI CHỊU TRÁCH NHIỆM BỒI THƯỜNG DÂN SỰ NẶNG NỀ (BAO GỒM TỔN THẤT THỰC TẾ, ÁN PHÍ VÀ CHI PHÍ LUẬT SƯ CỦA CHÚNG TÔI HOẶC CHỦ SỞ HỮU BẢN QUYỀN), ĐỒNG THỜI CÓ THỂ BỊ TRUY CỨU TRÁCH NHIỆM HÌNH SỰ VỀ TỘI KHAI MAN THEO QUY ĐỊNH CỦA PHÁP LUẬT."}
        </p>
      </div>

      {/* 3. POLICY HIGHLIGHTS */}
      <div className="p-6 bg-white border border-gray-200 space-y-3">
        <h2 className="text-sm font-black uppercase text-gray-900 flex items-center tracking-wider">
          <span>{isEn ? "Copyright Compliance Highlights" : "Tóm lược các Điểm nổi bật về Bản quyền"}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          {isEn
            ? "For copyright owners and community contributors, the following summary provides quick guidance on our DMCA and intellectual property procedures. For full statutory details, review all sections below."
            : "Dành cho chủ sở hữu bản quyền và cộng đồng người dùng, phần tóm lược sau cung cấp hướng dẫn nhanh về quy trình DMCA và sở hữu trí tuệ. Vui lòng đọc toàn bộ các điều khoản chi tiết bên dưới."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Designated Copyright Agent" : "• Đại diện Tiếp nhận Bản quyền"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Official notices must be sent exclusively to admin@rateurprofs.site. Non-copyright inquiries will be discarded."
                : "Mọi thông báo chính thức gửi về admin@rateurprofs.site. Thư không liên quan bản quyền sẽ không được phản hồi."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• 6-Element Infringement Notice" : "• 6 Yêu cầu của Đơn Khiếu nại"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Must provide work identification, specific URL location, contact info, good-faith statement, signature, and penalty of perjury declaration."
                : "Phải cung cấp tên tác phẩm, URL vi phạm, thông tin liên hệ, cam đoan thiện chí, chữ ký và cam kết không khai man."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Counter-Notice & 10-14 Days" : "• Phản đối & Thời hạn 10-14 Ngày"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Users may submit counter-notices for mistaken takedowns. Content may be restored after 10-14 business days if no lawsuit is filed."
                : "Người dùng có quyền phản đối gỡ bỏ do nhầm lẫn. Nội dung có thể được phục hồi sau 10-14 ngày làm việc nếu không có khởi kiện."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Repeat Infringer Termination" : "• Khóa Tài khoản Vi phạm Tái diễn"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Two (2) or more substantiated infringement strikes result in permanent account termination and an irrevocable ban on re-registration."
                : "Có từ 2 lần vi phạm bản quyền có căn cứ trở lên sẽ bị khóa tài khoản vĩnh viễn và cấm đăng ký lại dưới mọi hình thức."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. FULL STATUTORY SECTIONS */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">01</span>
            <span>{isEn ? "Purpose, Scope & Legally Binding Agreement" : "Mục đích, Phạm vi & Giá trị Pháp lý Ràng buộc"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "This Copyright Compliance Policy governs your access to and interaction with the RateUrProfs website (rateurprofs.site), applications, and academic evaluation services. It is formulated in accordance with the Law on Intellectual Property of Vietnam (amended in 2022, especially Article 198a and Articles 25 & 25a), Decree No. 17/2023/ND-CP detailing copyright provisions for intermediary service providers, the Berne Convention, and international safe-harbor standards (including DMCA Section 512). It is incorporated into and forms an integral part of our Terms of Use Agreement. Both agreements are legally binding upon all users. RateUrProfs respects the intellectual property rights of educators, university faculty, publishers, authors, and students. We employ multiple technical and administrative measures to prevent copyright infringement across the platform and to promptly terminate any infringement brought to our attention."
              : "Chính sách Tuân thủ Bản quyền này điều chỉnh quyền truy cập và tương tác của bạn đối với website RateUrProfs (rateurprofs.site), các ứng dụng và dịch vụ đánh giá học thuật liên quan. Chính sách được xây dựng phù hợp với Luật Sở hữu trí tuệ Việt Nam (sửa đổi, bổ sung năm 2022, đặc biệt là Điều 198a và Điều 25, 25a), Nghị định số 17/2023/NĐ-CP quy định chi tiết về quyền tác giả đối với doanh nghiệp cung cấp dịch vụ trung gian, Công ước Berne và các chuẩn mực an toàn trung gian quốc tế (bao gồm DMCA Section 512). Văn bản này được tích hợp vào và cấu thành một bộ phận không tách rời của Thỏa thuận Điều khoản Sử dụng. Cả hai văn bản đều có giá trị pháp lý ràng buộc đối với mọi người dùng. RateUrProfs tôn trọng quyền sở hữu trí tuệ của giảng viên, cơ sở giáo dục, nhà xuất bản, tác giả và sinh viên. Chúng tôi áp dụng các giải pháp kỹ thuật và quy trình quản trị để ngăn ngừa và chấm dứt kịp thời các hành vi vi phạm bản quyền trên nền tảng."}
          </p>
        </div>

        {/* Section 2 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">02</span>
            <span>{isEn ? "Designated Copyright Agent Contact Information" : "Thông tin Đại diện Pháp lý Tiếp nhận Khiếu nại Bản quyền"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "In order for RateUrProfs to process any notice of claimed copyright infringement or counter-notice, it must be sent exclusively to our designated Copyright Agent at the address and contact details below:"
              : "Để RateUrProfs có thể tiếp nhận và xử lý hợp lệ thông báo khiếu nại vi phạm bản quyền hoặc văn bản phản đối gỡ bỏ, thông báo phải được gửi trực tiếp và duy nhất đến Đại diện Bản quyền được chỉ định theo thông tin dưới đây:"}
          </p>

          <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] text-xs font-mono space-y-1.5">
            <div className="font-black text-[#1d4ed8] flex items-center">
              <span>{isEn ? "Agent Name:" : "Đại diện Chỉ định:"} RateUrProfs Designated Copyright Agent</span>
            </div>
            <div className="text-gray-700">
              <strong>{isEn ? "Physical Address:" : "Địa chỉ Tiếp nhận:"}</strong> RateUrProfs Legal Operations, 50 Broad Street / Hanoi Academic Tech Center, Hanoi, Vietnam
            </div>
            <div className="text-gray-700">
              <strong>{isEn ? "Dedicated Email:" : "Email Chuyên trách:"}</strong>{" "}
              <a href="mailto:admin@rateurprofs.site" className="text-[#1d4ed8] underline font-bold">
                admin@rateurprofs.site
              </a>
            </div>
          </div>

          <p className="text-xs text-[#1d4ed8] font-bold leading-relaxed">
            {isEn
              ? "DO NOT SEND UNRELATED INQUIRIES (such as technical support, review disputes, course corrections, or general feedback) to the contact listed above. You will NOT receive a response if sent to that contact."
              : "TUYỆT ĐỐI KHÔNG GỬI CÁC YÊU CẦU KHÔNG LIÊN QUAN (như hỗ trợ kỹ thuật, thắc mắc đánh giá, khiếu nại điểm số hoặc phản ánh chung) đến địa chỉ trên. Các thư không liên quan đến bản quyền sẽ KHÔNG ĐƯỢC PHẢN HỒI."}
          </p>
        </div>

        {/* Section 3 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">03</span>
            <span>{isEn ? "How to Send a Notice of Copyright Infringement (Takedown Notice)" : "Quy trình Gửi Thông báo Vi phạm Bản quyền (Yêu cầu Gỡ bỏ)"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "If you are a copyright owner (or authorized agent) and hold a good-faith belief that material hosted on our Site infringes one of your copyrights, submit a written communication to our Designated Agent containing substantially the following six (6) items:"
              : "Nếu bạn là chủ sở hữu bản quyền (hoặc người được ủy quyền hợp pháp) và tin tưởng một cách thiện chí rằng tài liệu trên trang web vi phạm bản quyền của bạn, vui lòng gửi văn bản thông báo đến Đại diện Bản quyền bao gồm đầy đủ sáu (6) nội dung sau:"}
          </p>

          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 pl-2 leading-relaxed">
            <li>
              <strong>{isEn ? "Authorized Signature:" : "Chữ ký Hợp lệ:"}</strong>{" "}
              {isEn
                ? "A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed."
                : "Chữ ký tay hoặc chữ ký điện tử của người được ủy quyền đại diện cho chủ sở hữu độc quyền bị xâm phạm."}
            </li>
            <li>
              <strong>{isEn ? "Work Identification:" : "Xác định Tác phẩm:"}</strong>{" "}
              {isEn
                ? "Identification of the copyrighted work claimed to have been infringed, or, if multiple works are covered by a single notification, a representative list of such works."
                : "Mô tả rõ ràng tác phẩm có bản quyền bị xâm phạm, hoặc danh mục đại diện nếu thông báo áp dụng cho nhiều tác phẩm."}
            </li>
            <li>
              <strong>{isEn ? "Location on Site:" : "Vị trí Chính xác trên Trang:"}</strong>{" "}
              {isEn
                ? "Identification of the material claimed to be infringing and information reasonably sufficient to permit us to locate the material (specifically including the exact page URL on rateurprofs.site)."
                : "Xác định rõ tài liệu vi phạm kèm thông tin đường dẫn URL chính xác trên rateurprofs.site để chúng tôi có thể định vị và xử lý."}
            </li>
            <li>
              <strong>{isEn ? "Contact Information:" : "Thông tin Liên hệ:"}</strong>{" "}
              {isEn
                ? "Information reasonably sufficient to permit us to contact you, including full legal name, physical address, telephone number, and an active email address."
                : "Thông tin liên hệ đầy đủ bao gồm họ và tên pháp lý, địa chỉ liên lạc, số điện thoại và địa chỉ email đang hoạt động."}
            </li>
            <li>
              <strong>{isEn ? "Good Faith Statement:" : "Cam đoan Thiện chí:"}</strong>{" "}
              {isEn
                ? "A statement that you have a good-faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law."
                : "Lời cam đoan rằng bạn tin tưởng một cách thiện chí việc sử dụng tài liệu bị khiếu nại không được chủ sở hữu, người đại diện hoặc pháp luật cho phép."}
            </li>
            <li>
              <strong>{isEn ? "Perjury & Accuracy Statement:" : "Cam đoan Chịu Trách nhiệm về Tính Chính xác:"}</strong>{" "}
              {isEn
                ? "A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right allegedly infringed."
                : "Lời cam đoan dưới chế tài của tội khai man rằng các thông tin trong văn bản là hoàn toàn chính xác và bạn có thẩm quyền đại diện cho chủ sở hữu bản quyền."}
            </li>
          </ol>
        </div>

        {/* Section 4 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">04</span>
            <span>{isEn ? "Expeditious Action & User Notification" : "Hành động Gỡ bỏ Kịp thời & Thông báo cho Người dùng"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "When we receive a valid notice complying with Section 3, RateUrProfs will expeditiously remove or disable access to the material claimed to be infringing within the statutory intermediary timeframe (normally within 72 hours under Vietnamese Decree No. 17/2023/ND-CP). We will also promptly dispatch a written notice sent from no-reply@rateurprofs.site to the user who posted the material at their registered email address, informing them of the removal, the basis for the claimed infringement, and instructions for submitting a counter-notice."
              : "Khi nhận được thông báo hợp lệ đáp ứng đầy đủ Mục 3, RateUrProfs sẽ nhanh chóng gỡ bỏ hoặc khóa quyền truy cập vào tài liệu bị khiếu nại trong thời hạn luật định cho doanh nghiệp trung gian (thông thường trong vòng 72 giờ theo Nghị định số 17/2023/NĐ-CP). Chúng tôi đồng thời gửi thông báo bằng văn bản từ địa chỉ no-reply@rateurprofs.site đến email liên kết tài khoản của người dùng đã đăng tải tài liệu đó, thông báo rõ việc gỡ bỏ, lý do khiếu nại và hướng dẫn quy trình gửi văn bản phản đối."}
          </p>
        </div>

        {/* Section 5 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">05</span>
            <span>{isEn ? "How to Send a Counter-Notice (If Posting Removed by Mistake)" : "Quy trình Gửi Phản đối Thông báo Gỡ bỏ (Counter-Notice)"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "If you are a user whose content was removed in response to a notice of infringement and you believe the content was removed due to mistake or misidentification, you may submit a formal counter-notice to our Designated Agent containing substantially the following four (4) items:"
              : "Nếu bạn là người dùng có nội dung bị gỡ bỏ theo thông báo khiếu nại và bạn có căn cứ xác đáng tin rằng việc gỡ bỏ do nhầm lẫn hoặc nhận diện sai lệch, bạn có thể gửi văn bản phản đối đến Đại diện Bản quyền bao gồm bốn (4) nội dung sau:"}
          </p>

          <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-gray-700 pl-2 leading-relaxed">
            <li>
              <strong>{isEn ? "Subscriber Signature:" : "Chữ ký của Người dùng:"}</strong>{" "}
              {isEn
                ? "Your physical or electronic signature."
                : "Chữ ký tay hoặc chữ ký điện tử của bạn (người dùng gửi bài)."}
            </li>
            <li>
              <strong>{isEn ? "Material Identification & URL:" : "Xác định Nội dung & Đường dẫn URL:"}</strong>{" "}
              {isEn
                ? "Identification of the material that was removed or disabled and the specific URL location where it appeared prior to removal."
                : "Xác định cụ thể tài liệu đã bị gỡ bỏ và đường dẫn URL chính xác nơi tài liệu từng xuất hiện trước khi bị khóa."}
            </li>
            <li>
              <strong>{isEn ? "Perjury Mistake Declaration:" : "Cam đoan Nhầm lẫn Dưới Chế tài Khai man:"}</strong>{" "}
              {isEn
                ? "A statement under penalty of perjury that you have a good-faith belief that the material was removed or disabled as a result of mistake or misidentification of the material."
                : "Cam đoan dưới chế tài của tội khai man rằng bạn tin tưởng một cách thiện chí tài liệu bị gỡ bỏ hoặc vô hiệu hóa do nhầm lẫn hoặc nhận diện sai lệch."}
            </li>
            <li>
              <strong>{isEn ? "Jurisdiction Consent & Service Acceptance:" : "Chấp thuận Thẩm quyền Tòa án & Tống đạt:"}</strong>{" "}
              {isEn
                ? "Your name, physical address, telephone number, and an explicit statement that you consent to the jurisdiction of the competent court in the judicial district where your address is located (or where RateUrProfs operates if outside Vietnam), and that you will accept service of process from the person who provided the original infringement notification."
                : "Họ tên, địa chỉ, số điện thoại và cam kết chấp thuận thẩm quyền xét xử của tòa án có thẩm quyền nơi bạn cư trú (hoặc nơi đặt trụ sở của RateUrProfs nếu bạn ở ngoài Việt Nam), đồng thời đồng ý tiếp nhận tống đạt văn bản tố tụng từ người đã gửi thông báo khiếu nại ban đầu."}
            </li>
          </ol>
        </div>

        {/* Section 6 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">06</span>
            <span>{isEn ? "Counter-Notice Forwarding & 10-14 Business Day Restoration Window" : "Xem xét Phản đối & Thời hạn Phục hồi 10-14 Ngày Làm việc"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "When we receive a compliant counter-notice, RateUrProfs will promptly forward a complete copy to the original complaining party. We will wait at least 10 to 14 business days. If, during that window, the original complaining party notifies us that they have filed a formal lawsuit seeking a court order to restrain the user from infringing activity relating to the material on our Site, we will not replace the material. Otherwise, we reserve the right, in our sole discretion, to restore the material. However, pursuant to the 'User Postings' section of our Terms of Use, we retain the right to remove, block access to, or decline to restore material at any time for any reason without liability to the posting user. Submitting a counter-notice does not guarantee reinstatement."
              : "Khi nhận được phản đối gỡ bỏ hợp lệ, RateUrProfs sẽ nhanh chóng chuyển tiếp bản sao đầy đủ cho bên khiếu nại ban đầu. Chúng tôi sẽ chờ ít nhất 10 đến 14 ngày làm việc. Nếu trong thời hạn đó, bên khiếu nại thông báo rằng họ đã khởi kiện ra tòa án yêu cầu áp dụng biện pháp khẩn cấp tạm thời ngăn chặn hành vi xâm phạm, chúng tôi sẽ không phục hồi nội dung. Ngược lại, chúng tôi có toàn quyền tự quyết khôi phục lại tài liệu. Tuy nhiên, căn cứ mục 'Bài đăng của Người dùng' trong Thỏa thuận Điều khoản Sử dụng, chúng tôi bảo lưu quyền gỡ bỏ hoặc từ chối phục hồi bất kỳ nội dung nào mà không phải chịu bất kỳ trách nhiệm pháp lý nào đối với người đăng bài."}
          </p>
        </div>

        {/* Section 7 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">07</span>
            <span>{isEn ? "Repeat Infringer Policy" : "Chính sách Chấm dứt Tài khoản Vi phạm Tái diễn"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "RateUrProfs maintains a strict policy of terminating the accounts of repeat copyright infringers. A repeat infringer is defined as any user who has posted two (2) or more reviews, comments, or materials that have been the subject of substantiated infringement notifications under this policy. Each user agrees that upon account termination under this policy, they will not attempt to register, access, or operate a new account under any name, real or assumed. Users who violate this prohibition agree to fully indemnify and hold RateUrProfs harmless from any and all damages, liabilities, and legal costs resulting from such unauthorized registration."
              : "RateUrProfs áp dụng chính sách nghiêm khắc nhằm chấm dứt tài khoản của những đối tượng vi phạm bản quyền tái diễn. Đối tượng vi phạm tái diễn được xác định là bất kỳ người dùng nào có từ hai (2) lần bị thông báo khiếu nại vi phạm bản quyền có căn cứ trở lên. Người dùng đồng ý rằng khi tài khoản bị chấm dứt theo chính sách này, họ tuyệt đối không được tạo lập, truy cập hoặc vận hành tài khoản mới dưới bất kỳ danh tính nào. Mọi hành vi cố tình vi phạm lệnh cấm này sẽ phải bồi thường toàn bộ thiệt hại và chi phí pháp lý phát sinh cho RateUrProfs."}
          </p>
        </div>

        {/* Section 8 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">08</span>
            <span>{isEn ? "Sole Statement & Governing Law" : "Tuyên bố Duy nhất & Luật Điều chỉnh"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "This document is the sole authoritative statement of the Copyright Compliance Policy with respect to the RateUrProfs platform. No summary, restatement, or unofficial machine-generated statement is valid or binding. This policy is governed by the laws of Vietnam, incorporating applicable international copyright conventions and DMCA Section 512 safe-harbor standards. For all copyright compliance matters, contact our designated desk at admin@rateurprofs.site."
              : "Văn bản này là tuyên bố chính thức duy nhất về Chính sách Tuân thủ Bản quyền áp dụng cho nền tảng RateUrProfs. Mọi bản tóm tắt, diễn giải lại hoặc tuyên bố phi chính thức đều không có giá trị pháp lý. Chính sách này chịu sự điều chỉnh của pháp luật Việt Nam, có viện dẫn các công ước quốc tế và nguyên tắc an toàn trung gian DMCA Section 512. Mọi vấn đề liên quan đến bản quyền, vui lòng liên hệ: admin@rateurprofs.site."}
          </p>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR WITH [Copyright Policy] BADGE */}
      <div className="p-6 bg-[#1d4ed8] text-white border border-[#1d4ed8] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white text-[#1d4ed8] text-xs font-mono font-black uppercase tracking-wider border border-white">
            [Copyright Policy]
          </span>
          <span className="text-xs text-blue-100 font-mono">
            {isEn ? "RateUrProfs DMCA & IP Desk" : "Ban Pháp chế & Bản quyền RateUrProfs"}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href={`/${locale}/guidelines`}
            className="px-3 py-1.5 bg-[#1e40af] hover:bg-white hover:text-[#1d4ed8] text-white text-xs font-mono font-black uppercase tracking-wider border border-white transition-all"
          >
            [Site Guidelines]
          </Link>
          <Link
            href={`/${locale}/terms`}
            className="px-3 py-1.5 bg-[#1e40af] hover:bg-white hover:text-[#1d4ed8] text-white text-xs font-mono font-black uppercase tracking-wider border border-white transition-all"
          >
            [Terms of Use]
          </Link>
          <Link
            href={`/${locale}/privacy`}
            className="px-3 py-1.5 bg-[#1e40af] hover:bg-white hover:text-[#1d4ed8] text-white text-xs font-mono font-black uppercase tracking-wider border border-white transition-all"
          >
            [Privacy Policy]
          </Link>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center px-3 py-1.5 bg-white text-[#1d4ed8] hover:bg-[#eff6ff] text-xs font-mono font-black uppercase tracking-wider border border-white transition-all cursor-pointer"
          >
            <span>{isEn ? "Back to Top" : "Lên đầu trang"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation, Locale } from "@/locales/i18n";
export default function PrivacyPage() {
  const { locale, setLocale, t } = useTranslation();
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
            {isEn ? "Privacy & Data Protection" : "Bảo vệ Dữ liệu & Quyền Riêng tư"}
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
              ? "RateUrProfs Privacy Policy & Notice of Privacy Rights"
              : "Chính sách Bảo mật & Quyền Riêng tư RateUrProfs"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
            {isEn
              ? "This is the official Privacy Policy describing our information collection, usage, disclosure, and data protection practices for the RateUrProfs website (rateurprofs.site), applications, and interactive academic services. The Site is owned and operated by RateUrProfs (\"we,\" \"us,\" or \"our\")."
              : "Đây là Chính sách Bảo mật chính thức mô tả các hoạt động thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cho website RateUrProfs (rateurprofs.site), các ứng dụng và dịch vụ học thuật liên quan. Nền tảng được sở hữu và vận hành bởi RateUrProfs (\"chúng tôi\")."}
          </p>
          <div className="pt-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {isEn ? "Effective: January 1, 2024 (Updated 2026)" : "Hiệu lực: Ngày 01 tháng 01 năm 2024 (Cập nhật 2026)"}
          </div>
        </div>
      </div>

      {/* 2. STUDENT ANONYMITY & DATA PROTECTION SAFEGUARD NOTICE */}
      <div className="p-6 bg-[#eff6ff] border border-[#bfdbfe] space-y-3">
        <div className="flex items-center text-[#1d4ed8] font-black text-sm uppercase tracking-wider">
          <span>
            {isEn
              ? "Student Identity Protection & Anti-Doxxing Commitment"
              : "Cam kết Bảo vệ Danh tính Sinh viên & Chống Tiết lộ Đời tư"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-bold">
          {isEn
            ? "RATEURPROFS IS FOUNDED ON THE PRINCIPLE OF SAFE, ANONYMOUS STUDENT FEEDBACK. WE COMPLY FULLY WITH VIETNAMESE DECREE NO. 13/2023/ND-CP ON PERSONAL DATA PROTECTION, THE LAW ON CYBERSECURITY, AND INTERNATIONAL BENCHMARKS (CCPA & GDPR). WE NEVER SELL PERSONAL INFORMATION TO ADVERTISERS AND NEVER DISCLOSE STUDENT REVIEWER IDENTITIES OR EMAILS TO UNIVERSITIES OR EVALUATED PROFESSORS."
            : "RATEURPROFS HOẠT ĐỘNG DỰA TRÊN NGUYÊN TẮC PHẢN HỒI ẨN DANH AN TOÀN CHO SINH VIÊN. CHÚNG TÔI TUÂN THỦ NGHIÊM NGẶT NGHỊ ĐỊNH 13/2023/NĐ-CP VỀ BẢO VỆ DỮ LIỆU CÁ NHÂN, LUẬT AN NINH MẠNG VÀ CÁC CHUẨN MỰC QUỐC TẾ (CCPA & GDPR). CHÚNG TÔI TUYỆT ĐỐI KHÔNG BÁN DỮ LIỆU CÁ NHÂN VÀ KHÔNG BAO GIỜ TIẾT LỘ DANH TÍNH HAY EMAIL CỦA SINH VIÊN ĐÁNH GIÁ CHO NHÀ TRƯỜNG HOẶC GIẢNG VIÊN."}
        </p>
      </div>

      {/* 3. PRIVACY HIGHLIGHTS */}
      <div className="p-6 bg-white border border-gray-200 space-y-3">
        <h2 className="text-sm font-black uppercase text-gray-900 flex items-center tracking-wider">
          <span>{isEn ? "Privacy Policy Highlights" : "Tóm lược các Điểm nổi bật về Bảo mật"}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          {isEn
            ? "For your convenience, the following highlights provide a quick overview of how your information is handled. Please read the entire Privacy Policy below for full details. For privacy and data protection questions, contact security@rateurprofs.site."
            : "Để thuận tiện cho người dùng, phần tóm lược sau cung cấp cái nhìn nhanh về cách chúng tôi xử lý thông tin cá nhân. Vui lòng đọc toàn bộ các điều khoản chi tiết bên dưới. Mọi thắc mắc về bảo mật và dữ liệu xin liên hệ security@rateurprofs.site."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Information We Collect" : "• Thông tin Thu thập"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Account registration info (Google OAuth / email), reviews, and technical cookies. Zero collection of sensitive personal biometrics or political opinions."
                : "Thông tin tài khoản (Google OAuth / email), bài đánh giá và cookie kỹ thuật. Không thu thập sinh trắc học hay quan điểm chính trị, tôn giáo."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Purpose & Zero Data Sale" : "• Mục đích & Không Bán Dữ liệu"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Used solely to operate authentication, display academic reviews, and prevent abuse. We do not sell or rent personal information to brokers or advertisers."
                : "Chỉ phục vụ xác thực người dùng, hiển thị đánh giá học thuật và ngăn chặn gian lận. Không bán hoặc cho thuê dữ liệu cá nhân cho bên thứ ba."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Your Choices & Cookies" : "• Quyền Lựa chọn & Cookie"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "You can opt out of promotional emails and manage browser cookies. Critical session cookies remember your login and language preference."
                : "Bạn có thể từ chối email thông báo và tùy chỉnh cài đặt cookie trình duyệt. Cookie thiết yếu giúp ghi nhớ đăng nhập và ngôn ngữ hiển thị."}
            </p>
          </div>

          <div className="p-3 bg-[#f8fafc] border border-gray-200 space-y-1">
            <span className="font-bold text-gray-900 uppercase block">
              {isEn ? "• Statutory Privacy Rights" : "• Quyền theo Quy định Pháp luật"}
            </span>
            <p className="text-gray-600">
              {isEn
                ? "Full rights under Decree 13/2023/ND-CP, CCPA & GDPR: Right to know, access, correct, delete, and non-discrimination via security@rateurprofs.site."
                : "Đảm bảo đầy đủ các quyền theo Nghị định 13/2023/NĐ-CP, CCPA & GDPR: Quyền được biết, truy cập, chỉnh sửa, yêu cầu xóa dữ liệu qua security@rateurprofs.site."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. FULL PRIVACY SECTIONS (13 SECTIONS) */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">01</span>
            <span>{isEn ? "When This Privacy Policy Applies" : "Phạm vi Áp dụng của Chính sách Bảo mật"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "This Privacy Policy applies: (a) Regardless of whether you are accessing the Site via a desktop computer, laptop, mobile smartphone, tablet, or any other device; (b) Whether you access the Site as a registered member or an unregistered casual visitor; (c) To all Personal Information and automated telemetry collected directly by or through the Site; and (d) Remains in full force and effect even if your account or participation terminates. This Privacy Policy does not apply to any third-party websites, applications, or external services that may be linked to or from RateUrProfs."
              : "Chính sách Bảo mật này áp dụng: (a) Bất kể bạn truy cập website qua máy tính để bàn, máy tính xách tay, điện thoại thông minh, máy tính bảng hay thiết bị nào khác; (b) Dù bạn truy cập với tư cách người dùng đã đăng ký tài khoản hay khách vãng lai; (c) Đối với toàn bộ Thông tin Cá nhân và nhật ký kỹ thuật thu thập trên hệ thống; và (d) Tiếp tục giữ nguyên hiệu lực ngay cả khi bạn chấm dứt việc sử dụng tài khoản. Chính sách không áp dụng cho các trang web, ứng dụng hoặc dịch vụ của bên thứ ba được liên kết tới hoặc từ RateUrProfs."}
          </p>
        </div>

        {/* Section 2 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">02</span>
            <span>{isEn ? "Governing Law & International Data Processing" : "Luật Điều chỉnh & Xử lý Dữ liệu Quốc tế"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "The Site is operated in accordance with the laws of Vietnam, including Decree No. 13/2023/ND-CP on Personal Data Protection and the Law on Cybersecurity. If you are located outside of Vietnam (such as overseas students or visiting international faculty), you use this Site at your own initiative and risk, and your personal data will be collected, stored, and processed under Vietnamese legal standards and compatible international data protection frameworks (such as CCPA and GDPR principles). By using the Site, you consent to the cross-border processing of your information in accordance with this Privacy Policy."
              : "Trang web được vận hành tuân thủ các quy định của pháp luật Việt Nam, bao gồm Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân và Luật An ninh mạng. Nếu bạn truy cập từ ngoài lãnh thổ Việt Nam (chẳng hạn như du học sinh hoặc giảng viên quốc tế), bạn tự nguyện sử dụng trang web và đồng ý rằng dữ liệu cá nhân của bạn sẽ được thu thập, lưu trữ và xử lý theo quy định của pháp luật Việt Nam cùng các khuôn khổ bảo vệ dữ liệu quốc tế tương thích (như CCPA và GDPR). Bằng việc sử dụng website, bạn chấp thuận việc xử lý dữ liệu theo Chính sách Bảo mật này."}
          </p>
        </div>

        {/* Section 3 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">03</span>
            <span>{isEn ? "What Information Is Collected" : "Các Loại Thông tin Được Thu thập"}</span>
          </h3>
          <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
            <p>
              <strong>{isEn ? "3.1 Information You Provide Directly:" : "3.1 Thông tin Bạn Cung cấp Trực tiếp:"}</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-gray-600">
              <li>
                <strong>{isEn ? "Registration Information:" : "Thông tin Đăng ký:"}</strong>{" "}
                {isEn
                  ? "When creating an account or logging in via Google OAuth 2.0, we receive your email address, display name, profile avatar URL, and university affiliation."
                  : "Khi đăng ký tài khoản hoặc đăng nhập qua Google OAuth 2.0, chúng tôi nhận địa chỉ email, tên hiển thị, ảnh đại diện và trường đại học liên kết."}
              </li>
              <li>
                <strong>{isEn ? "Reviews & Ratings:" : "Bài Đánh giá & Điểm số:"}</strong>{" "}
                {isEn
                  ? "Course code, professor rating criteria (clarity, difficulty, grading fairness), qualitative commentary, tags, and textbook status."
                  : "Mã môn học, các tiêu chí đánh giá giảng viên (độ rõ ràng, độ khó, sự công bằng), nhận xét chi tiết, nhãn phân loại và tình trạng tài liệu."}
              </li>
              <li>
                <strong>{isEn ? "Inquiries & Moderation Reports:" : "Phản hồi & Báo cáo Vi phạm:"}</strong>{" "}
                {isEn
                  ? "Information submitted when contacting support, requesting profile corrections, or flagging inappropriate reviews."
                  : "Thông tin khi bạn liên hệ bộ phận hỗ trợ, yêu cầu đính chính hồ sơ giảng viên hoặc báo cáo đánh giá vi phạm."}
              </li>
            </ul>

            <p className="pt-2">
              <strong>{isEn ? "3.2 Automated Technical Information & Cookies:" : "3.2 Thông tin Kỹ thuật Tự động & Cookie:"}</strong>{" "}
              {isEn
                ? "We automatically log your IP address, browser type, operating system version, referring URLs, timestamps, and interaction clickstream data. We use lightweight browser cookies and local storage tokens to maintain your login session, persist your preferred language (VI / EN), prevent duplicate review voting, and protect against distributed denial-of-service (DDoS) attacks."
                : "Hệ thống tự động ghi nhận địa chỉ IP, loại trình duyệt, hệ điều hành, trang giới thiệu, thời gian truy cập và nhật ký tương tác. Chúng tôi sử dụng cookie trình duyệt và local storage để duy trì phiên đăng nhập, ghi nhớ ngôn ngữ ưu tiên (VI / EN), ngăn chặn việc bỏ phiếu trùng lặp và phòng chống tấn công từ chối dịch vụ (DDoS)."}
            </p>
          </div>
        </div>

        {/* Section 4 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">04</span>
            <span>{isEn ? "How Collected Information Is Used" : "Mục đích Sử dụng Thông tin"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "We use collected information for legitimate academic and administrative purposes: (a) Authenticating your user identity and managing your account profile; (b) Publishing, moderating, and indexing academic reviews and ratings; (c) Responding to user inquiries, correction requests, and dispute reports; (d) Preventing review manipulation, bot scraping, spamming, and harassment; (e) Delivering localized content in Vietnamese and English; and (f) Optimizing server performance, search latency, and platform uptime."
              : "Chúng tôi sử dụng thông tin thu thập được cho các mục đích học thuật và quản trị hợp pháp: (a) Xác thực người dùng và quản lý hồ sơ cá nhân; (b) Hiển thị, kiểm duyệt và lập chỉ mục các đánh giá giảng viên; (c) Giải quyết thắc mắc, yêu cầu đính chính và khiếu nại tranh chấp; (d) Ngăn ngừa thao túng điểm số, cào dữ liệu trái phép, spam và quấy rối; (e) Cung cấp nội dung song ngữ chuẩn xác (Tiếng Việt và Tiếng Anh); và (f) Tối ưu hóa hiệu năng máy chủ, tốc độ tìm kiếm và độ ổn định của hệ thống."}
          </p>
        </div>

        {/* Section 5 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">05</span>
            <span>{isEn ? "Your Choices & Cookie Controls" : "Quyền Lựa chọn & Quản lý Cookie của Bạn"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "You possess active control over your privacy choices: (a) Non-Essential Communications: You may unsubscribe from any platform announcement emails via the unsubscribe link; (b) Browser Cookie Management: Most modern browsers (Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge) allow you to block, delete, or inspect cookies via browser settings. Note that disabling essential session cookies may prevent you from staying logged in or submitting reviews; (c) Do Not Track: We respect standard privacy headers and do not track user activities across unrelated third-party websites."
              : "Bạn có toàn quyền kiểm soát các lựa chọn riêng tư của mình: (a) Email Thông báo: Bạn có thể hủy nhận các email cập nhật không bắt buộc thông qua liên kết hủy đăng ký ở cuối mỗi thư; (b) Quản lý Cookie Trình duyệt: Hầu hết các trình duyệt hiện đại (Chrome, Firefox, Safari, Edge) đều cho phép bạn xem, xóa hoặc chặn cookie. Lưu ý rằng việc vô hiệu hóa cookie thiết yếu có thể làm gián đoạn trạng thái đăng nhập hoặc khả năng gửi đánh giá; (c) Tín hiệu Do Not Track: Chúng tôi tôn trọng quyền riêng tư của bạn và không theo dõi hành vi duyệt web của bạn trên các website bên ngoài."}
          </p>
        </div>

        {/* Section 6 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">06</span>
            <span>{isEn ? "[Reserved]" : "[Dành riêng]"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed italic">
            {isEn
              ? "This section is intentionally reserved to maintain statutory cross-referencing and section indexing alignment with our Terms of Use and historical revisions."
              : "Mục này được bảo lưu nhằm mục đích đồng bộ đánh số và tham chiếu chéo với Thỏa thuận Điều khoản Sử dụng và các phiên bản sửa đổi liên quan."}
          </p>
        </div>

        {/* Section 7 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">07</span>
            <span>{isEn ? "Sharing & Disclosure of Information" : "Chia sẻ & Tiết lộ Thông tin"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "RateUrProfs strictly limits data disclosure: (a) Public Postings: Reviews you submit are publicly displayed with your chosen display name (or Anonymous Student pseudonym). Your private email and Google account ID are never exposed; (b) Operational Infrastructure Providers: We disclose data to trusted cloud hosting, database, and security providers (e.g., Supabase, Vercel, Cloudflare) solely to operate the platform under strict data processing agreements; (c) Legal Compliance: We may disclose information if required by a lawful court subpoena, warrant, or governmental order from competent Vietnamese authorities, or to mitigate imminent physical threats to student or faculty safety; (d) Corporate Transactions: In the event of a merger, non-profit transfer, or restructuring, user records will remain subject to this Privacy Policy."
              : "RateUrProfs kiểm soát chặt chẽ việc chia sẻ dữ liệu: (a) Đăng bài Công khai: Nhận xét bạn gửi sẽ hiển thị công khai cùng tên hiển thị bạn chọn (hoặc biệt danh Sinh viên Ẩn danh). Email cá nhân và ID tài khoản Google của bạn không bao giờ bị lộ; (b) Nhà cung cấp Hạ tầng Vận hành: Chúng tôi chỉ chia sẻ dữ liệu với các đối tác hạ tầng đám mây, cơ sở dữ liệu và bảo mật uy tín (như Supabase, Vercel, Cloudflare) để vận hành hệ thống dưới cam kết bảo mật nghiêm ngặt; (c) Tuân thủ Pháp luật: Chúng tôi chỉ cung cấp thông tin khi có lệnh tòa án hợp pháp, văn bản yêu cầu của cơ quan chức năng có thẩm quyền tại Việt Nam hoặc để ngăn chặn đe dọa trực tiếp đến an toàn tính mạng của sinh viên và giảng viên; (d) Tái cấu trúc Tổ chức: Trong trường hợp sáp nhập hoặc chuyển giao quyền điều hành, dữ liệu người dùng vẫn được bảo vệ theo đúng Chính sách Bảo mật này."}
          </p>
        </div>

        {/* Section 8 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">08</span>
            <span>{isEn ? "Reviewing, Updating or Deleting Your Information" : "Xem lại, Cập nhật & Xóa Dữ liệu của Bạn"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "You have the right to access and update your profile information at any time via Account Settings. To request complete account deletion or data erasure, send an email to security@rateurprofs.site with your registered email address. Please note: Academic reviews you have contributed form part of the collective educational record; upon account deletion, reviews are permanently decoupled from your account and retained anonymously to preserve academic evaluation history. Minors under 16 years of age are not permitted to register; parents or guardians may request immediate removal of ineligible accounts."
              : "Bạn có quyền xem và cập nhật thông tin cá nhân bất kỳ lúc nào qua trang Cài đặt Tài khoản. Để yêu cầu xóa toàn bộ tài khoản hoặc dữ liệu liên quan, vui lòng gửi email từ địa chỉ đăng ký đến security@rateurprofs.site. Lưu ý: Các bài đánh giá học thuật bạn đã đóng góp là một phần của kho dữ liệu giáo dục chung; khi xóa tài khoản, các nhận xét sẽ được gỡ bỏ hoàn toàn liên kết với danh tính cá nhân của bạn và chuyển thành ẩn danh vĩnh viễn nhằm đảm bảo tính toàn vẹn của dữ liệu đánh giá. Người chưa đủ 16 tuổi không được phép đăng ký; phụ huynh có thể yêu cầu xóa tài khoản của người chưa đủ tuổi."}
          </p>
        </div>

        {/* Section 9 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">09</span>
            <span>{isEn ? "Protection of Information & Anti-Phishing Warning" : "Bảo vệ Thông tin & Cảnh báo Chống Lừa đảo (Phishing)"}</span>
          </h3>
          <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] text-[#1d4ed8] text-xs font-bold space-y-1">
            <div className="flex items-center uppercase tracking-wider">
              <span>{isEn ? "Official Anti-Phishing Warning:" : "Cảnh báo Lừa đảo Chính thức:"}</span>
            </div>
            <p className="font-normal text-gray-800 leading-relaxed">
              {isEn
                ? "RATEURPROFS WILL NEVER SEND YOU AN EMAIL ASKING FOR YOUR PASSWORD, BANK ACCOUNT DETAILS, CREDIT CARD NUMBER, OR NATIONAL CITIZEN ID. If you receive any email claiming to be from RateUrProfs asking for sensitive credentials, do not click any links, forward the message immediately to security@rateurprofs.site, and delete it. All legitimate automated notifications and transaction messages from RateUrProfs originate strictly from no-reply@rateurprofs.site."
                : "RATEURPROFS KHÔNG BAO GIỜ GỬI EMAIL YÊU CẦU BẠN CUNG CẤP MẬT KHẨU, TÀI KHOẢN NGÂN HÀNG, SỐ THẺ TÍN DỤNG HAY CĂN CƯỚC CÔNG DÂN. Nếu bạn nhận được thư mạo danh yêu cầu thông tin nhạy cảm, tuyệt đối không nhấp vào liên kết, hãy chuyển tiếp ngay cho security@rateurprofs.site và xóa thư. Mọi email thông báo hệ thống chính thức của RateUrProfs chỉ được gửi duy nhất từ địa chỉ no-reply@rateurprofs.site."}
            </p>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "We employ industry-standard administrative, physical, and technical safeguards including TLS 1.3 encryption in transit, modern database hashing, tokenized OAuth 2.0 access tokens, and automated rate limiting to protect your personal data from unauthorized access, alteration, or disclosure."
              : "Chúng tôi áp dụng các tiêu chuẩn an toàn kỹ thuật cao bao gồm mã hóa đường truyền TLS 1.3, mã hóa mật khẩu và dữ liệu trong cơ sở dữ liệu, chứng thực bảo mật OAuth 2.0 và cơ chế giới hạn tần suất tự động nhằm bảo vệ thông tin cá nhân của bạn trước các hành vi truy cập trái phép."}
          </p>
        </div>

        {/* Section 10 */}
        <div className="p-6 bg-white border border-gray-200 space-y-3">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">10</span>
            <span>{isEn ? "Notice of Privacy Rights (Decree 13/2023/ND-CP, CCPA & GDPR)" : "Thông báo Quyền Riêng tư (Nghị định 13/2023/NĐ-CP, CCPA & GDPR)"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "Under Vietnamese Decree No. 13/2023/ND-CP on Personal Data Protection, as well as CCPA and GDPR standards, you hold comprehensive rights as a data subject. Article 9 guarantees 11 statutory rights: (1) Right to know; (2) Right to consent; (3) Right to access; (4) Right to withdraw consent; (5) Right to erasure; (6) Right to restrict processing; (7) Right to data provision; (8) Right to object to processing; (9) Right to complain, denounce, or sue; (10) Right to claim damages; and (11) Right to self-protection. Under Article 10, data subjects have the obligation to protect their own personal data, respect and protect the personal data of others (strict anti-doxxing), and provide accurate information."
              : "Căn cứ Nghị định số 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân, cùng các chuẩn mực CCPA và GDPR, bạn có đầy đủ quyền của chủ thể dữ liệu. Điều 9 bảo đảm 11 quyền luật định: (1) Quyền được biết; (2) Quyền đồng ý; (3) Quyền truy cập; (4) Quyền rút lại sự đồng ý; (5) Quyền xóa dữ liệu; (6) Quyền hạn chế xử lý dữ liệu; (7) Quyền cung cấp dữ liệu; (8) Quyền phản đối xử lý dữ liệu; (9) Quyền khiếu nại, tố cáo, khởi kiện; (10) Quyền yêu cầu bồi thường thiệt hại; và (11) Quyền tự bảo vệ. Theo Điều 10, người dùng có nghĩa vụ tự bảo vệ dữ liệu cá nhân của mình, tôn trọng và bảo vệ dữ liệu cá nhân của người khác (nghiêm cấm phát tán thông tin đời tư/doxxing) và cung cấp thông tin trung thực."}
          </p>
          <div className="overflow-x-auto border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#eff6ff] border-b border-gray-200">
                <tr>
                  <th className="p-2.5 font-black uppercase border-r border-gray-200 text-[#1d4ed8]">{isEn ? "Category" : "Danh mục"}</th>
                  <th className="p-2.5 font-black uppercase border-r border-gray-200 text-[#1d4ed8]">{isEn ? "Collected" : "Thu thập"}</th>
                  <th className="p-2.5 font-black uppercase text-[#1d4ed8]">{isEn ? "Your Statutory Right" : "Quyền Hợp pháp của Bạn"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr>
                  <td className="p-2.5 font-bold border-r border-gray-200 text-gray-900">{isEn ? "Identifiers" : "Định danh cá nhân"}</td>
                  <td className="p-2.5 border-r border-gray-200 text-gray-700">{isEn ? "Email, display name, IP address" : "Email, tên hiển thị, địa chỉ IP"}</td>
                  <td className="p-2.5 text-gray-700">{isEn ? "Right to Know, Access & Portability" : "Quyền được biết, tiếp cận & trích xuất"}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-gray-200 text-gray-900">{isEn ? "Academic Activity" : "Dữ liệu học thuật"}</td>
                  <td className="p-2.5 border-r border-gray-200 text-gray-700">{isEn ? "School, courses, ratings, feedback" : "Trường, môn học, điểm đánh giá"}</td>
                  <td className="p-2.5 text-gray-700">{isEn ? "Right to Rectification & Anonymization" : "Quyền chỉnh sửa & ẩn danh hóa"}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-gray-200 text-gray-900">{isEn ? "Device Telemetry" : "Nhật ký thiết bị"}</td>
                  <td className="p-2.5 border-r border-gray-200 text-gray-700">{isEn ? "Browser cookies, timestamp, headers" : "Cookie trình duyệt, mốc thời gian"}</td>
                  <td className="p-2.5 text-gray-700">{isEn ? "Right to Opt-Out & Clear Cookies" : "Quyền từ chối & xóa dữ liệu cookie"}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-gray-200 text-gray-900">{isEn ? "Sensitive Data" : "Dữ liệu nhạy cảm"}</td>
                  <td className="p-2.5 border-r border-gray-200 text-[#1d4ed8] font-bold">{isEn ? "NONE (We do not collect)" : "KHÔNG (Chúng tôi không thu thập)"}</td>
                  <td className="p-2.5 text-gray-700">{isEn ? "Protected by Policy & Statutory Law" : "Được bảo vệ tuyệt đối theo chính sách"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {isEn
              ? "To exercise any of these rights, email security@rateurprofs.site. We will verify your identity and respond within the statutory timeframe (normally within 30 days) without discrimination or service degradation."
              : "Để thực hiện các quyền này theo Nghị định 13/2023/NĐ-CP, vui lòng gửi email về security@rateurprofs.site. Chúng tôi sẽ xác minh danh tính và xử lý trong thời hạn luật định (tối đa 30 ngày) mà không có bất kỳ sự phân biệt đối xử nào."}
          </p>
        </div>

        {/* Section 11 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">11</span>
            <span>{isEn ? "Additional Regional & International Disclosures" : "Quy định Bảo mật Bổ sung theo Khu vực & Quốc tế"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "Residents of other jurisdictions (including Virginia, Colorado, Connecticut, the European Economic Area, and ASEAN member nations) are afforded uniform privacy protections under this policy. We do not engage in automated individual profiling that produces legal effects, nor do we sell personal data across any jurisdiction."
              : "Người dùng tại các khu vực khác (bao gồm các bang của Hoa Kỳ, Khu vực Kinh tế Châu Âu, và các quốc gia thành viên ASEAN) được hưởng các biện pháp bảo vệ quyền riêng tư đồng bộ theo chính sách này. Chúng tôi không thực hiện xây dựng hồ sơ hành vi tự động gây tác động pháp lý và không bán dữ liệu người dùng ở bất kỳ khu vực nào."}
          </p>
        </div>

        {/* Section 12 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">12</span>
            <span>{isEn ? "Changes to this Privacy Policy" : "Sửa đổi & Cập nhật Chính sách Bảo mật"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "RateUrProfs reserves the right to modify or update this Privacy Policy at any time. When material changes occur, we will update the 'Effective Date' and post prominent notification on the homepage or notify registered users via email. Continued access to or use of the Site after revisions become effective constitutes your binding consent to the modified policy."
              : "RateUrProfs bảo lưu quyền sửa đổi hoặc cập nhật Chính sách Bảo mật này vào bất kỳ lúc nào. Khi có những thay đổi trọng yếu, chúng tôi sẽ cập nhật 'Ngày Hiệu lực' và đăng thông báo nổi bật trên trang chủ hoặc thông báo qua email cho người dùng đã đăng ký. Việc bạn tiếp tục sử dụng website sau ngày có hiệu lực đồng nghĩa với việc bạn chấp thuận chính sách sửa đổi."}
          </p>
        </div>

        {/* Section 13 */}
        <div className="p-6 bg-white border border-gray-200 space-y-2">
          <h3 className="text-sm font-black uppercase text-gray-900 flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[#1d4ed8] text-white text-[10px]">13</span>
            <span>{isEn ? "Miscellaneous & Privacy Contact Desk" : "Điều khoản Thi hành & Kênh Tiếp nhận Yêu cầu"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            {isEn
              ? "This document constitutes the sole authoritative statement of RateUrProfs's privacy practices. It is incorporated into and subject to our Terms of Use Agreement. If you have any inquiries, requests to exercise statutory rights, or privacy-related complaints, please contact our dedicated Data Protection Officer:"
              : "Tài liệu này là tuyên bố chính thức duy nhất về các hoạt động bảo mật dữ liệu của RateUrProfs. Tài liệu được tích hợp vào và chịu sự điều chỉnh của Thỏa thuận Điều khoản Sử dụng. Mọi thắc mắc, yêu cầu thực thi quyền hợp pháp hoặc khiếu nại liên quan đến quyền riêng tư, vui lòng liên hệ:"}
          </p>
          <div className="p-3 bg-[#eff6ff] border border-[#bfdbfe] text-xs font-mono space-y-1">
            <div className="font-bold text-[#1d4ed8] flex items-center">
              <span>RateUrProfs Data Protection & Compliance Office</span>
            </div>
            <div className="text-gray-700">Email: security@rateurprofs.site</div>
            <div className="text-gray-700">Platform: RateUrProfs (rateurprofs.site)</div>
          </div>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR WITH [Privacy Policy] BADGE */}
      <div className="p-6 bg-[#1d4ed8] text-white border border-[#1d4ed8] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white text-[#1d4ed8] text-xs font-mono font-black uppercase tracking-wider border border-white">
            [Privacy Policy]
          </span>
          <span className="text-xs text-blue-100 font-mono">
            {isEn ? "RateUrProfs Privacy Protection" : "Chính sách Bảo mật RateUrProfs"}
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

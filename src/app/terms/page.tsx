"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation, Locale } from "@/locales/i18n";
export default function TermsPage() {
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
      <div className="border-b-2 border-black pb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center px-3 py-1 text-[11px] font-black uppercase tracking-widest bg-[#fef9c3] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
            {isEn ? "Legal Terms of Service" : "Điều khoản Dịch vụ Pháp lý"}
          </span>

          {/* Quick In-Page Language Switcher */}
          <div className="inline-flex items-center border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
            <div className="px-2 py-1 bg-black text-[#fef9c3] text-[10px] font-black uppercase flex items-center">
              <span>Lang</span>
            </div>
            <button
              type="button"
              onClick={() => switchLang("vi")}
              className={`px-3 py-1 text-xs font-black uppercase transition-all ${
                activeLang === "vi"
                  ? "bg-[#e03a3e] text-white"
                  : "bg-white text-black hover:bg-[#fef9c3]"
              }`}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              onClick={() => switchLang("en")}
              className={`px-3 py-1 text-xs font-black uppercase transition-all border-l border-black ${
                activeLang === "en"
                  ? "bg-[#e03a3e] text-white"
                  : "bg-white text-black hover:bg-[#fef9c3]"
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-black">
            {isEn
              ? "RateUrProfs Terms of Use Agreement (\"Terms of Use\")"
              : "Điều khoản Sử dụng RateUrProfs (\"Terms of Use\")"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed">
            {isEn
              ? "This is the official Terms of Use Agreement (\"Agreement\") for the RateUrProfs website (rateurprofs.site), mobile applications, and interactive academic services. The Site is owned and operated by RateUrProfs (\"we,\" \"us,\" or \"our\")."
              : "Đây là Thỏa thuận Điều khoản Sử dụng chính thức (\"Thỏa thuận\") áp dụng cho website RateUrProfs (rateurprofs.site), ứng dụng di động và các dịch vụ học thuật tương tác liên quan. Nền tảng được sở hữu và vận hành bởi RateUrProfs (\"chúng tôi\")."}
          </p>
        </div>
      </div>

      {/* 2. ARBITRATION & CLASS ACTION WAIVER NOTICE */}
      <div className="p-6 bg-[#fee2e2] border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
        <div className="flex items-center text-red-700 font-black text-sm uppercase tracking-wider">
          <span>
            {isEn
              ? "Notice: Individual Dispute Resolution & Class Action Waiver"
              : "Thông báo: Giải quyết Tranh chấp Cá nhân & Miễn trừ Khiếu kiện Tập thể"}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-900 leading-relaxed font-bold">
          {isEn
            ? "THESE TERMS OF USE CONTAIN AN ARBITRATION AND DISPUTE RESOLUTION CLAUSE AND A CLASS ACTION WAIVER. BY USING THIS SITE, YOU ACCEPT THESE TERMS AND AGREE THAT DISPUTES BETWEEN YOU AND RATEURPROFS WILL BE RESOLVED VIA GOOD-FAITH INFORMAL NEGOTIATION AND BINDING DISPUTE PROCEEDINGS ON AN INDIVIDUAL BASIS, AND NOT AS PART OF A CLASS OR CONSOLIDATED ACTION."
            : "ĐIỀU KHOẢN NÀY QUY ĐỊNH CƠ CHẾ GIẢI QUYẾT TRANH CHẤP VÀ MIỄN TRỪ KHIẾU KIỆN TẬP THỂ. BẰNG VIỆC SỬ DỤNG TRANG WEB, BẠN CHẤP THUẬN CÁC ĐIỀU KHOẢN NÀY VÀ ĐỒNG Ý RẰNG MỌI TRANH CHẤP GIỮA BẠN VÀ RATEURPROFS SẼ ĐƯỢC GIẢI QUYẾT TRÊN CƠ SỞ THƯƠNG LƯỢNG THIỆN CHÍ VÀ TỐ TỤNG THEO TƯ CÁCH CÁ NHÂN ĐỘC LẬP, KHÔNG THỰC HIỆN KHIẾU KIỆN TẬP THỂ HOẶC ĐẠI DIỆN TẬP THỂ."}
        </p>
      </div>

      {/* 3. TERMS HIGHLIGHTS */}
      <div className="p-6 bg-[#fef9c3] border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
        <h2 className="text-sm font-black uppercase text-black flex items-center tracking-wider">
          <span>{isEn ? "Terms of Use Agreement Highlights" : "Tóm lược các Điều khoản Chính"}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "For your convenience, the following summary provides quick highlights of our Terms of Use. Please review the complete sections below for full contractual details. If you have any questions, you may contact our team at support@rateurprofs.site."
            : "Để thuận tiện cho người dùng, phần tóm lược sau đây cung cấp cái nhìn khái quát về các điều khoản sử dụng. Vui lòng đọc toàn bộ các điều khoản chi tiết bên dưới. Mọi thắc mắc xin liên hệ bộ phận hỗ trợ tại support@rateurprofs.site."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3 bg-white border border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-bold text-black uppercase block">
              {isEn ? "• Eligibility & Additional Terms" : "• Điều kiện & Thỏa thuận Bổ sung"}
            </span>
            <p className="text-gray-700">
              {isEn
                ? "Designed for university students and academics (16+). Incorporates our Site Guidelines and Privacy Policy."
                : "Dành cho sinh viên và giới học thuật (từ 16 tuổi trở lên). Bao gồm Quy định Đăng bài và Chính sách Bảo mật."}
            </p>
          </div>

          <div className="p-3 bg-white border border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-bold text-black uppercase block">
              {isEn ? "• User Postings & Responsibility" : "• Trách nhiệm Bài đăng của Người dùng"}
            </span>
            <p className="text-gray-700">
              {isEn
                ? "You are responsible for what you post. You grant RateUrProfs a perpetual license to host and index your review."
                : "Bạn chịu trách nhiệm về nội dung đăng tải và cấp cho RateUrProfs quyền lưu trữ, lập chỉ mục nội dung đó."}
            </p>
          </div>

          <div className="p-3 bg-white border border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-bold text-black uppercase block">
              {isEn ? "• Rules of Conduct" : "• Quy tắc Ứng xử"}
            </span>
            <p className="text-gray-700">
              {isEn
                ? "Zero tolerance for harassment, doxxing, defamation, bot scraping, or commercial exploitation."
                : "Nghiêm cấm xúc phạm, vu khống, doxxing, phát tán mã độc và cào dữ liệu trái phép."}
            </p>
          </div>

          <div className="p-3 bg-white border border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-bold text-black uppercase block">
              {isEn ? "• Intermediary Liability" : "• Miễn trừ Nền tảng Trung gian"}
            </span>
            <p className="text-gray-700">
              {isEn
                ? "RateUrProfs is an intermediary platform and is not liable for third-party subjective evaluations."
                : "RateUrProfs hoạt động với tư cách nền tảng trung gian và được miễn trừ trách nhiệm theo pháp luật."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. FULL TERMS SECTIONS */}
      <div className="space-y-6">
        {/* Section 1 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">01</span>
            <span>{isEn ? "Eligibility, Additional Terms & Binding Agreement" : "Phạm vi, Điều kiện Áp dụng & Thỏa thuận Ràng buộc"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "This Site is designed and targeted to audiences residing in, attending, having attended, or teaching at a university or higher education institution in Vietnam or international accredited universities. You must be at least 16 years of age or older (\"Site Minimum Age\") and meet university enrollment requirements to submit ratings. By accessing or using the Site, you certify that you meet these eligibility requirements and agree to abide by all terms and conditions of this Agreement, including our Site Guidelines and Privacy Policy, which are incorporated herein by reference."
              : "Trang web được thiết kế phục vụ sinh viên, cựu sinh viên và giảng viên tại các cơ sở giáo dục đại học ở Việt Nam cũng như các trường đại học quốc tế. Người dùng phải từ đủ 16 tuổi trở lên (\"Độ tuổi Tối thiểu\") và đáp ứng điều kiện theo học đại học để gửi đánh giá. Việc bạn truy cập hoặc sử dụng trang web đồng nghĩa với việc bạn xác nhận đáp ứng đầy đủ điều kiện và cam kết tuân thủ Thỏa thuận này cùng Quy định Đăng bài (Site Guidelines) và Chính sách Bảo mật."}
          </p>
        </div>

        {/* Section 2 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">02</span>
            <span>{isEn ? "Registration & Account Security" : "Đăng ký & Bảo mật Tài khoản"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "If you register an account on the Site (via Google OAuth 2.0 or verified campus email), you are responsible for maintaining the confidentiality of your credentials. You are solely responsible for all activities, acts, and omissions occurring under your account. You agree to notify RateUrProfs immediately of any known or suspected unauthorized use of your account. RateUrProfs is not liable for harm resulting from misappropriation of credentials by third parties."
              : "Khi đăng ký tài khoản trên hệ thống (thông qua Google OAuth 2.0 hoặc email nhà trường), bạn có trách nhiệm bảo mật thông tin đăng nhập của mình. Bạn chịu trách nhiệm hoàn toàn đối với mọi hoạt động diễn ra dưới tài khoản đó. Bạn đồng ý thông báo ngay cho RateUrProfs khi phát hiện hoặc nghi ngờ có hành vi xâm nhập trái phép. Chúng tôi không chịu trách nhiệm đối với các thiệt hại do việc tiết lộ tài khoản cho bên thứ ba gây ra."}
          </p>
        </div>

        {/* Section 3 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">03</span>
            <span>{isEn ? "Modifications to this Agreement" : "Quyền Sửa đổi Thỏa thuận"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "RateUrProfs reserves the right to revise or update the terms of this Agreement at any time in its sole discretion by publishing updated Terms of Use on the Site. Updated terms become effective immediately upon public posting. Your continued use of the Site after revisions are published constitutes binding agreement to the modifications. You should periodically review these terms to stay informed of current rights and obligations."
              : "RateUrProfs bảo lưu quyền sửa đổi hoặc cập nhật các điều khoản của Thỏa thuận này vào bất kỳ lúc nào theo quyết định hợp lý của mình bằng cách đăng tải công khai trên website. Các điều khoản sửa đổi có hiệu lực ngay khi được công bố. Việc bạn tiếp tục sử dụng website sau khi cập nhật cấu thành sự đồng ý ràng buộc với các thay đổi đó. Bạn nên thường xuyên kiểm tra lại văn bản này để nắm bắt quyền và nghĩa vụ cập nhật."}
          </p>
        </div>

        {/* Section 4 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">04</span>
            <span>{isEn ? "Ownership of Intellectual Property & Limited License" : "Quyền Sở hữu Trí tuệ & Giấy phép Sử dụng Giới hạn"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "All materials on this Site—including software, application code, typography, graphic designs, Neo-Brutalist design tokens, trademarks, logos, curated academic directories, and compilations—are the proprietary intellectual property of RateUrProfs and protected under applicable copyright, trademark, and intellectual property laws. You are granted a non-exclusive, non-transferable, revocable license for non-commercial personal use only. Unauthorized reproduction, modification, distribution, automated crawling, or data scraping without prior written consent is strictly prohibited."
              : "Toàn bộ tài nguyên trên website—bao gồm mã nguồn phần mềm, giao diện, nhãn hiệu, logo, bộ quy chuẩn thị giác Neo-Brutalist, danh bạ học thuật được tổng hợp và cấu trúc dữ liệu—đều là tài sản sở hữu trí tuệ của RateUrProfs và được pháp luật bảo vệ. Bạn được cấp quyền sử dụng cá nhân, phi thương mại, có thể bị thu hồi bất kỳ lúc nào. Mọi hành vi sao chép, chỉnh sửa, phân phối, cào dữ liệu tự động hoặc khai thác thương mại khi chưa có sự đồng ý bằng văn bản đều bị nghiêm cấm."}
          </p>
        </div>

        {/* Section 5 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">05</span>
            <span>{isEn ? "External Links & Third-Party Services" : "Liên kết Bên Thứ ba & Cổng thông tin Nhà trường"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "The Site references hyperlinks to external university portals (.edu.vn), departmental catalogs, and external resources for verification purposes. The presence of any external URL does not imply endorsement, warranty, or affiliation by RateUrProfs. RateUrProfs is not responsible for the privacy practices, content, accuracy, or availability of third-party websites or services."
              : "Website cung cấp các liên kết dẫn đến cổng thông tin đào tạo công vụ (.edu.vn) của các trường đại học và nguồn kiểm chứng bên ngoài. Sự xuất hiện của các liên kết này không hàm ý bất kỳ sự bảo trợ, bảo đảm hay quan hệ liên kết nào. RateUrProfs không chịu trách nhiệm về chính sách quyền riêng tư, nội dung, tính chuẩn xác hay sự sẵn sàng của các trang web bên thứ ba."}
          </p>
        </div>

        {/* Section 6 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">06</span>
            <span>{isEn ? "Rules of Conduct & Prohibitions" : "Quy tắc Ứng xử & Các Hành vi Bị Cấm"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "You agree not to use the Site to: (a) submit content that is defamatory, vulgar, profane, sexually suggestive, harassing, threatening, discriminatory, or ethnically offensive; (b) publish personal identifiable information (doxxing: phone numbers, home addresses, private emails); (c) transmit malware, computer viruses, Trojan horses, or harmful code; (d) execute automated scraping, bot crawling, or index scraping without explicit permission; (e) disrupt or interfere with server performance, security, or operations; or (f) engage in commercial spam, cheating services, or paid document marketing."
              : "Bạn cam kết không sử dụng website để: (a) đăng tải nội dung vu khống, phỉ báng, thô tục, khiêu dâm, quấy rối, đe dọa, xúc phạm hoặc phân biệt đối xử; (b) tiết lộ thông tin nhận dạng cá nhân (doxxing: số điện thoại, địa chỉ nhà riêng, email cá nhân); (c) phát tán mã độc, virus máy tính hoặc chương trình gây hại; (d) sử dụng bot, crawler tự động để cào dữ liệu khi chưa được phép; (e) can thiệp làm gián đoạn hiệu năng, an ninh máy chủ; hoặc (f) quảng cáo dịch vụ học hộ, thi hộ, mua bán tài liệu học tập."}
          </p>
        </div>

        {/* Section 7 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">07</span>
            <span>{isEn ? "User Postings & Content License Grant" : "Bài đăng của Người dùng & Quyền Cấp phép Nội dung"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "You retain copyright in original content you post. However, by submitting reviews, comments, or ratings on RateUrProfs, you grant RateUrProfs a worldwide, perpetual, royalty-free, irrevocable, non-exclusive license to use, display, host, index, translate, and format such content in connection with operating the platform. You warrant that all postings are your original work, reflect genuine classroom experiences, violate no laws or privacy rights, and contain no defamatory material. RateUrProfs reserves the right to review, monitor, and remove any posting at any time without liability."
              : "Bạn giữ bản quyền đối với các nhận xét gốc do bạn viết. Tuy nhiên, khi gửi đánh giá trên RateUrProfs, bạn cấp cho chúng tôi quyền sử dụng toàn cầu, vĩnh viễn, miễn phí bản quyền, không hủy ngang và phi độc quyền để lưu trữ, hiển thị, lập chỉ mục, dịch thuật và định dạng nội dung phục vụ vận hành nền tảng. Bạn cam kết bài đăng phản ánh trải nghiệm học tập thực tế, không vi phạm pháp luật hay quyền riêng tư của ai. RateUrProfs bảo lưu quyền rà soát và xóa bất kỳ bài đăng nào mà không chịu trách nhiệm bồi thường."}
          </p>
        </div>

        {/* Section 8 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">08</span>
            <span>{isEn ? "Account Deactivation & Termination" : "Vô hiệu hóa & Chấm dứt Tài khoản"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "You may deactivate or request deletion of your account at any time through your account settings or by contacting support@rateurprofs.site. RateUrProfs may terminate or suspend your access, registration, or posting abilities at any time, with or without prior notice, for conduct violating this Agreement or undermining the integrity of community evaluations."
              : "Bạn có quyền xóa hoặc vô hiệu hóa tài khoản của mình bất kỳ lúc nào tại mục cài đặt tài khoản hoặc gửi email tới support@rateurprofs.site. RateUrProfs có quyền đình chỉ hoặc chấm dứt quyền truy cập, tài khoản của bạn bất cứ lúc nào, có hoặc không có thông báo trước, nếu bạn vi phạm Thỏa thuận này hoặc gây ảnh hưởng tiêu cực đến tính khách quan của hệ thống."}
          </p>
        </div>

        {/* Section 9 */}
        <div className="p-6 bg-[#e0f2fe] border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">09</span>
            <span>{isEn ? "Disclaimers & Limitation of Liability" : "Miễn trừ Bảo đảm & Giới hạn Trách nhiệm"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">
            {isEn
              ? "THIS SITE, ALL ACADEMIC INFORMATION, AND USER POSTINGS ARE PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. UNDER STATUTORY FRAMEWORKS GOVERNING INTERMEDIARY INTERNET SERVICE PROVIDERS (INCLUDING VIETNAMESE DECREE NO. 72/2013/ND-CP, DECREE NO. 27/2018/ND-CP, DECREE NO. 147/2024/ND-CP, ARTICLE 198A OF THE INTELLECTUAL PROPERTY LAW, AND APPLICABLE SAFE HARBOR STANDARDS), RATEURPROFS OPERATES AS A HOSTING PLATFORM AND SHALL NOT BE LIABLE FOR SUBJECTIVE USER REVIEWS, REPUTATIONAL ALLEGATIONS, SYSTEM DELAYS, OR LOSSES ARISING FROM YOUR USE OF THE SITE. IN NO EVENT SHALL RATEURPROFS'S TOTAL LIABILITY EXCEED THE GREATER OF $50 USD OR THE AMOUNT PAID BY YOU TO RATEURPROFS IN THE PAST 12 MONTHS."
              : "TRANG WEB, THÔNG TIN HỌC THUẬT VÀ BÀI ĐĂNG CỦA NGƯỜI DÙNG ĐƯỢC CUNG CẤP TRÊN NGUYÊN TẮC 'NGUYÊN TRẠNG' VÀ 'SẴN CÓ' MÀ KHÔNG CÓ BẤT KỲ SỰ BẢO ĐẢM NÀO. CĂN CỨ CƠ CHẾ PHÁP LÝ BẢO VỆ NỀN TẢNG TRUNG GIAN (NGHỊ ĐỊNH SỐ 72/2013/NĐ-CP, NGHỊ ĐỊNH SỐ 27/2018/NĐ-CP, NGHỊ ĐỊNH SỐ 147/2024/NĐ-CP CỦA CHÍNH PHỦ, ĐIỀU 198A LUẬT SỞ HỮU TRÍ TUỆ VÀ CÁC CHUẨN MỰC AN TOÀN TRUNG GIAN QUỐC TẾ), RATEURPROFS LÀ BÊN CUNG CẤP DỊCH VỤ LƯU TRỮ TRUNG GIAN VÀ KHÔNG CHỊU TRÁCH NHIỆM PHÁP LÝ ĐỐI VỚI CÁC Ý KIẾN CHỦ QUAN CỦA NGƯỜI DÙNG, TRANH CHẤP UY TÍN HOẶC CÁC THIỆT HẠI PHÁT SINH TỪ VIỆC SỬ DỤNG TRANG WEB. TRONG MỌI TRƯỜNG HỢP, TỔNG TRÁCH NHIỆM PHÁP LÝ CỦA CHÚNG TÔI SẼ KHÔNG VƯỢT QUÁ SỐ TIỀN THỰC TẾ BẠN ĐÃ CHI TRẢ CHO DỊCH VỤ TRONG 12 THÁNG QUA."}
          </p>
        </div>

        {/* Section 10 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">10</span>
            <span>{isEn ? "Indemnification" : "Nghĩa vụ Bồi hoàn Thiệt hại"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "You agree to indemnify, defend, and hold harmless RateUrProfs, its operators, officers, employees, and licensors from and against any third-party claims, lawsuits, liabilities, damages, and legal fees (including reasonable attorney costs) resulting from your violation of this Agreement, your misuse of the Site, or any unlawful review posted under your account."
              : "Bạn đồng ý bồi thường, bảo vệ và giữ cho RateUrProfs cùng đội ngũ vận hành không bị phương hại trước bất kỳ khiếu nại, vụ kiện, chi phí pháp lý hoặc án phí phát sinh từ hành vi vi phạm Thỏa thuận này, hành vi sử dụng trái phép website hoặc các bình luận vi phạm pháp luật do bạn đăng tải."}
          </p>
        </div>

        {/* Section 11 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">11</span>
            <span>{isEn ? "Resolution of Disputes & Individual Proceedings" : "Giải quyết Tranh chấp & Khiếu nại Cá nhân Độc lập"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "Before initiating formal arbitration or legal proceedings, you and RateUrProfs agree to engage in informal good-faith negotiation for at least 60 days following written notice sent to admin@rateurprofs.site. Both parties expressly waive the right to initiate, participate in, or join class actions, representative arbitrations, or consolidated proceedings. All disputes shall be adjudicated solely on an individual basis."
              : "Trước khi khởi kiện chính thức, bạn và RateUrProfs đồng ý dành thời gian thương lượng thiện chí ít nhất 60 ngày sau khi gửi thông báo bằng văn bản tới admin@rateurprofs.site. Cả hai bên từ bỏ quyền khởi xướng, tham gia hoặc sáp nhập vào các vụ kiện tập thể hoặc đại diện tập thể. Mọi khiếu nại phải được phân xử trên cơ sở cá nhân độc lập."}
          </p>
        </div>

        {/* Section 12 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">12</span>
            <span>{isEn ? "Governing Law & Legal Service Desk" : "Luật Điều chỉnh & Bộ phận Pháp chế"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "This Agreement is governed by and construed in accordance with the laws of Vietnam, including the Civil Code 2015, the Law on Electronic Transactions 2023, the Law on Cybersecurity 2018, and relevant government decrees on internet information services. Formal legal notices and service of process should be directed to our designated legal desk: RateUrProfs Legal Operations, Email: admin@rateurprofs.site. We reserve the right to reject deficient, improper, or invalid service."
              : "Thỏa thuận này được điều chỉnh và giải thích theo quy định của pháp luật Việt Nam, bao gồm Bộ luật Dân sự 2015, Luật Giao dịch điện tử 2023, Luật An ninh mạng 2018 và các nghị định hướng dẫn về quản lý thông tin trên mạng. Mọi thông báo pháp lý hoặc yêu cầu tống đạt văn bản chính thức xin vui lòng gửi về: Bộ phận Pháp chế RateUrProfs, Email: admin@rateurprofs.site. Chúng tôi bảo lưu quyền bác bỏ các yêu cầu tống đạt không đúng quy định."}
          </p>
        </div>

        {/* Section 13 */}
        <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
          <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-black text-[#fef9c3] text-[10px]">13</span>
            <span>{isEn ? "Miscellaneous Terms" : "Điều khoản Thi hành & Thời hiệu Khiếu nại"}</span>
          </h3>
          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
            {isEn
              ? "This Agreement constitutes the entire understanding between you and RateUrProfs regarding use of the Site. If any provision is deemed invalid or unenforceable, remaining provisions remain in full force and effect. Any cause of action relating to your use of the Site must be brought within one (1) year after the cause of action arose."
              : "Thỏa thuận này cấu thành toàn bộ sự hiểu biết giữa bạn và RateUrProfs về việc sử dụng website. Nếu bất kỳ điều khoản nào bị tuyên vô hiệu, các điều khoản còn lại vẫn giữ nguyên giá trị hiệu lực. Mọi khiếu nại liên quan đến việc sử dụng website phải được khởi xướng trong vòng một (1) năm kể từ thời điểm phát sinh sự kiện."}
          </p>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR WITH [Terms of Use] BADGE */}
      <div className="p-6 bg-black text-white border-2 border-black shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white text-black text-xs font-mono font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#fff]">
            [Terms of Use]
          </span>
          <span className="text-xs text-gray-300 font-mono">
            {isEn ? "RateUrProfs Official User Terms" : "Điều khoản Sử dụng RateUrProfs"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/guidelines`}
            className="px-3 py-1.5 bg-[#fef9c3] hover:bg-[#e03a3e] text-black hover:text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all"
          >
            [Site Guidelines]
          </Link>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center px-3 py-1.5 bg-white text-black hover:bg-[#fef9c3] text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer"
          >
            <span>{isEn ? "Back to Top" : "Lên đầu trang"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

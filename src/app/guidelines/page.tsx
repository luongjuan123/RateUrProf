"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslation, Locale } from "@/locales/i18n";

export default function GuidelinesPage() {
  const { locale, setLocale } = useTranslation();
  const [activeLang, setActiveLang] = useState<Locale>(locale);

  // Sync active language when locale changes or via in-page toggle
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
            {isEn ? "Official Posting Guidelines" : "Quy định Đăng bài Chính thức"}
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
              ? "RateUrProfs Official Posting Guidelines (\"Site Guidelines\")"
              : "Quy định Đăng bài & Quy chuẩn Cộng đồng (\"Site Guidelines\")"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-700 mt-2 leading-relaxed">
            {isEn
              ? "These are the official posting guidelines (\"Site Guidelines\") for the RateUrProfs website (rateurprofs.site), application, and interactive services. RateUrProfs is owned and operated by RateUrProfs (\"we,\" \"us,\" or \"our\"), and these Site Guidelines are a part of, and Additional Terms under, our Terms of Use Agreement."
              : "Đây là quy định đăng bài chính thức (\"Site Guidelines\") áp dụng cho website RateUrProfs (rateurprofs.site), ứng dụng và các dịch vụ tương tác liên quan. Nền tảng được sở hữu và vận hành bởi RateUrProfs (\"chúng tôi\"), và Quy định này là một bộ phận không thể tách rời thuộc Điều khoản Sử dụng (Terms of Use Agreement) của RateUrProfs."}
          </p>
        </div>
      </div>

      {/* 2. OUR MISSION */}
      <div className="p-6 bg-[#fef9c3] border-2 border-black shadow-[4px_4px_0px_#000] space-y-2">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Our Mission" : "Sứ mệnh của Chúng tôi"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-900 leading-relaxed font-medium">
          {isEn
            ? "RateUrProfs is the nationwide academic evaluation platform for students to research, rate, and discuss university professors and higher education institutions across Vietnam. Our mission is to provide a safe, respectful, and constructive forum for sharing authentic classroom experiences, empowering students to make informed academic choices."
            : "RateUrProfs là nền tảng đánh giá học thuật toàn quốc dành cho sinh viên để tra cứu, đánh giá và chia sẻ trải nghiệm về giảng viên cũng như các trường đại học, học viện trên khắp Việt Nam. Sứ mệnh của chúng tôi là mang đến một diễn đàn an toàn, minh bạch và xây dựng để lan tỏa những trải nghiệm giảng dạy thực tế, hỗ trợ sinh viên đưa ra những quyết định học tập quan trọng."}
        </p>
      </div>

      {/* 3. THE SITE / APP & ELIGIBILITY */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "The Platform & Eligibility" : "Nền tảng & Điều kiện Đăng bài"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "The RateUrProfs website (rateurprofs.site) and platform provide user-generated feedback on professors' teaching methods, course difficulty, grading fairness, and academic accessibility, as well as user-generated evaluations of university facilities, campus life, and educational environments."
            : "Trang web và ứng dụng RateUrProfs (rateurprofs.site) cung cấp phản hồi do sinh viên đóng góp về phương pháp sư phạm, độ khó học phần, tính công bằng trong chấm điểm và sự hỗ trợ của giảng viên, cũng như các đánh giá về đời sống học đường, môi trường học thuật và cơ sở vật chất của các trường đại học."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-[#f8fafc] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5">
            <span className="font-black text-xs uppercase text-black block">
              {isEn ? "1. Who Can Post & Review Limits" : "1. Ai được đăng & Giới hạn đánh giá"}
            </span>
            <p className="text-xs text-gray-700 leading-relaxed">
              {isEn
                ? "Professor ratings should only be posted by users who have taken a class from the professor or who are currently taking a class with the professor. For each course a professor teaches, users are strictly limited to posting one (1) comment. Campus ratings should only be posted by students who have attended or are currently attending the specific university being rated."
                : "Đánh giá giảng viên chỉ được thực hiện bởi người dùng đã từng theo học hoặc đang trực tiếp theo học học phần do giảng viên đó phụ trách. Với mỗi môn học do một giảng viên giảng dạy, người dùng chỉ được phép gửi tối đa một (1) nhận xét. Đánh giá trường đại học chỉ dành cho sinh viên đã hoặc đang theo học tại trường đại học đó."}
            </p>
          </div>

          <div className="p-4 bg-[#fee2e2] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5">
            <span className="font-black text-xs uppercase text-red-700 block">
              {isEn ? "2. Emergency & Safety Notice" : "2. Cảnh báo Khẩn cấp & An toàn"}
            </span>
            <p className="text-xs text-gray-800 leading-relaxed">
              {isEn
                ? "RateUrProfs is NOT the place to report dangerous, illegal, or illicit behaviors. If you believe that you, another student, or a professor is in danger, we strongly advise you to report such incidences directly to your university administration, campus security, or local law enforcement authorities."
                : "RateUrProfs KHÔNG PHẢI là nơi để thông báo hay báo cáo các hành vi nguy hiểm, đe dọa bạo lực hoặc vi phạm pháp luật hình sự. Nếu bạn tin rằng bản thân, một sinh viên khác hoặc thầy cô đang gặp nguy hiểm, hãy liên hệ ngay với ban giám hiệu nhà trường, phòng an ninh hoặc cơ quan công an / chính quyền địa phương."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. HOW MODERATION WORKS */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "How Moderation Works" : "Quy trình Kiểm duyệt của Chúng tôi"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "RateUrProfs maintains a dedicated team of moderators and automated filters to evaluate every rating submitted. We have defined site guidelines to help reinforce our mission and, most importantly, to ensure our moderation decisions are 100% consistent, regardless of student or professor."
            : "RateUrProfs duy trì đội ngũ kiểm duyệt viên chuyên trách kết hợp cùng hệ thống lọc tự động để rà soát mọi đánh giá được gửi lên. Chúng tôi thiết lập các quy chuẩn này nhằm củng cố sứ mệnh của nền tảng và quan trọng nhất là bảo đảm các quyết định kiểm duyệt luôn nhất quán 100%, bảo đảm tính khách quan, công bằng cho cả sinh viên và giảng viên."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-[#e0f2fe] border-2 border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-black text-black uppercase block">
              {isEn ? "Zero Content Alteration" : "Không tự ý can thiệp nội dung"}
            </span>
            <p className="text-gray-800 leading-relaxed">
              {isEn
                ? "Our moderators will NEVER edit the wording of a rating to make it comply. Comments either meet site standards or are removed entirely."
                : "Ban kiểm duyệt TUYỆT ĐỐI KHÔNG BAO GIỜ chỉnh sửa câu từ trong nhận xét của người dùng để làm cho nó hợp lệ. Nhận xét chỉ có thể được duyệt nguyên bản hoặc bị xóa bỏ."}
            </p>
          </div>

          <div className="p-3.5 bg-[#6ee7b7]/30 border-2 border-black shadow-[2px_2px_0px_#000] space-y-1">
            <span className="font-black text-black uppercase block">
              {isEn ? "Negative Reviews Protected" : "Bảo vệ đánh giá tiêu cực"}
            </span>
            <p className="text-gray-800 leading-relaxed">
              {isEn
                ? "Our moderators will NEVER remove a rating simply because it is a low score or negative review. Constructive criticism regarding course rigor and teaching methodology is protected."
                : "Ban kiểm duyệt KHÔNG BAO GIỜ xóa một đánh giá chỉ vì điểm số thấp hoặc đánh giá không tích cực. Mọi phản biện mang tính xây dựng về học phần đều được tôn trọng."}
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#fef9c3]/50 border border-black text-xs text-gray-800 leading-relaxed">
          <span>
            {isEn
              ? "Did we miss something? If you feel an inappropriate comment should be removed from the site, you can flag it for re-review. It will immediately be escalated to our moderation queue for evaluation."
              : "Chúng tôi có bỏ sót điều gì không? Nếu bạn phát hiện một nhận xét vi phạm quy chuẩn cộng đồng cần được gỡ bỏ, bạn có thể bấm nút báo cáo để gửi ngay về cho ban kiểm duyệt xem xét và xử lý."}
          </span>
        </div>
      </div>

      {/* 5. STUDENT GUIDELINES */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Student Guidelines" : "Quy định dành cho Sinh viên"}</span>
        </div>

        <ul className="space-y-3 text-xs sm:text-sm text-gray-800">
          <li className="leading-relaxed">
            <strong>{isEn ? "Be honest in your reviews:" : "Trung thực trong mọi đánh giá:"}</strong>{" "}
            {isEn
              ? "You want to be able to trust these reviews when evaluating your course options, so we ask that you contribute in that exact same spirit of academic integrity."
              : "Bạn luôn mong muốn có thể tin tưởng các đánh giá này khi lựa chọn môn học, vì vậy chúng tôi kỳ vọng bạn cũng đóng góp trên chính tinh thần trung thực và liêm chính học thuật đó."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Provide both pros and cons:" : "Cung cấp cả ưu điểm và nhược điểm:"}</strong>{" "}
            {isEn
              ? "When reviewing a class and/or professor, it is often helpful to provide both pros and cons. This leads to much more credible, balanced, and constructive feedback for your peers."
              : "Khi nhận xét về một lớp học hoặc giảng viên, việc nêu rõ cả điểm tốt và điểm cần cải thiện sẽ mang lại phản hồi khách quan, thuyết phục và hữu ích hơn rất nhiều cho bạn bè cùng khóa."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Focus on the course & learning experience:" : "Tập trung vào học phần và trải nghiệm học tập:"}</strong>{" "}
            {isEn
              ? "Reviews should focus specifically on the course curriculum, syllabus, and your learning experience. Do not comment on a professor's physical appearance, clothing, age, gender, or race."
              : "Đánh giá phải tập trung cụ thể vào nội dung khóa học, bài giảng và trải nghiệm tiếp thu kiến thức. Tuyệt đối không bình luận về ngoại hình, trang phục, tuổi tác, giới tính hoặc dân tộc của giảng viên."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Avoid hearsay:" : "Tránh nghe ngóng đồn thổi (Hearsay):"}</strong>{" "}
            {isEn
              ? "We want you to share your individual firsthand experience and what you took away from the course. Do not speak on behalf of others; encourage them to submit their own independent reviews."
              : "Hãy chia sẻ trải nghiệm trực tiếp của chính bạn và những gì bạn thực sự học được. Đừng nói thay người khác; hãy khuyến khích bạn bè tự gửi đánh giá độc lập của họ."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "This is not a forum for debate:" : "Đây không phải diễn đàn tranh cãi:"}</strong>{" "}
            {isEn
              ? "Reviews that specifically reference, quote, or dispute another review will be removed. If you do not agree with someone's individual experience, we encourage you to share your own."
              : "Các nhận xét dẫn chiếu trực tiếp, trích dẫn hoặc công kích nhận xét của người khác sẽ bị gỡ bỏ. Nếu bạn có trải nghiệm khác biệt, hãy chia sẻ góc nhìn độc lập của chính mình."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Acknowledge differing learning styles:" : "Tôn trọng sự đa dạng phương pháp giảng dạy:"}</strong>{" "}
            {isEn
              ? "We understand that not all instructors are the perfect match for each individual learning style. Tell us how the course or professor was or wasn't the best for you in a constructive manner that helps others make their own decision."
              : "Không phải phong cách giảng dạy nào cũng phù hợp với phong cách học tập của mọi cá nhân. Hãy giải thích tại sao khóa học hoặc cách dạy đó chưa phù hợp với bạn theo hướng xây dựng để người khác tham khảo."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Avoid reviews fueled by anger:" : "Tránh viết đánh giá trong lúc nóng giận:"}</strong>{" "}
            {isEn
              ? "Reviews fueled by anger do not reflect well on the author and can be removed for violations such as profanity or hostility. Take a minute to step back and make sure your review will genuinely help others understand your experience."
              : "Những nhận xét được viết khi bực tức thường thiếu khách quan và dễ vi phạm quy chuẩn như dùng từ ngữ thô tục. Hãy bình tâm một chút để bảo đảm nhận xét của bạn thực sự giúp ích cho người khác."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Substantive comments required:" : "Yêu cầu nội dung cụ thể và có chiều sâu:"}</strong>{" "}
            {isEn
              ? "RateUrProfs reserves the right to remove ratings that do not contain substantive comments, or that contain gibberish or spam characters."
              : "RateUrProfs bảo lưu quyền xóa các đánh giá cụt lủn, không chứa thông tin thực chất, spam ký tự hoặc nội dung vô nghĩa."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "One review per course & No dogpiling:" : "Một đánh giá mỗi môn & Nghiêm cấm hùa dồn (Dogpiling):"}</strong>{" "}
            {isEn
              ? "We only allow one student to review a professor one time per course. Spamming, brigading, or dogpiling an account will lead to comment removal and the offending account/IP being temporarily or permanently locked."
              : "Mỗi sinh viên chỉ được đánh giá một giảng viên một lần duy nhất cho mỗi học phần. Hành vi spam đánh giá, kêu gọi tẩy chay tập thể hoặc hùa dồn đánh giá tiêu cực sẽ bị xóa toàn bộ và tài khoản/IP vi phạm sẽ bị khóa."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Exercise discretion:" : "Tiếp nhận thông tin có chọn lọc:"}</strong>{" "}
            {isEn
              ? "When reading fellow student reviews, we encourage you to use your discretion and weigh every review amongst the others. Online reviews should be one of many resources used when making academic decisions."
              : "Khi đọc đánh giá của các bạn sinh viên khác, bạn nên cân nhắc và kết hợp nhiều nguồn thông tin khác nhau trước khi đưa ra quyết định ảnh hưởng đến con đường học vấn của mình."}
          </li>
        </ul>
      </div>

      {/* 6. PROHIBITED CONTENT */}
      <div className="p-6 bg-[#fee2e2] border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-red-700 font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Prohibited Content (Removed Immediately)" : "Nội dung Nghiêm cấm Đăng tải"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
          {isEn
            ? "Pursuant to Articles 8 and 16 of the Law on Cybersecurity 2018 (Law No. 24/2018/QH14), Articles 32, 34, and 38 of the Civil Code 2015, and Decree No. 147/2024/ND-CP, comments containing any of the following violations are strictly prohibited and will be removed immediately:"
            : "Căn cứ Điều 8, Điều 16 Luật An ninh mạng 2018 (Luật số 24/2018/QH14), các Điều 32, 34, 38 Bộ luật Dân sự 2015 và Nghị định số 147/2024/NĐ-CP, các bình luận chứa bất kỳ nội dung nào sau đây bị nghiêm cấm tuyệt đối và sẽ bị gỡ bỏ ngay lập tức:"}
        </p>

        <ul className="space-y-2.5 text-xs text-gray-900">
          <li className="leading-relaxed">
            {isEn
              ? "Profanity, name-calling, and/or vulgarity, derogatory remarks about religion, ethnicity or race, gender, physical appearance, age, mental and/or physical disabilities."
              : "Ngôn từ tục tĩu, chửi thề, lăng mạ, miệt thị về tôn giáo, sắc tộc, vùng miền, giới tính, xu hướng tính dục, ngoại hình, tuổi tác hoặc khiếm khuyết thể chất/tinh thần."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Identifiable information about a professor or student that would allow someone to contact the professor/student outside of their school (doxxing: private phone numbers, home addresses, private emails, private socials)."
              : "Thông tin nhận dạng cá nhân (Doxxing) về giảng viên hoặc sinh viên cho phép liên hệ ngoài trường học (số điện thoại cá nhân, địa chỉ nhà riêng, email cá nhân, mạng xã hội riêng tư)."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "References to a professor's or student's family, personal life and/or sex life, including sexual innuendos."
              : "Đề cập đến gia đình, đời sống cá nhân, tình cảm hoặc đời sống tình dục của giảng viên/sinh viên, bao gồm các lời lẽ ám chỉ tình dục."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Claims that a professor shows bias or favoritism for or against a student or specific group of students (such grievances should be reported via official university channels)."
              : "Cáo buộc giảng viên phân biệt đối xử, trù dập hoặc thiên vị cho một sinh viên hay nhóm sinh viên cụ thể (các khiếu nại này phải gửi qua quy trình chính thức của trường)."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Claims about a professor's employment status, salary, contract disputes, tenure status, or previous employment."
              : "Thông tin về tình trạng việc làm của giảng viên, bao gồm việc tuyển dụng, hợp đồng, biên chế, sa thải hoặc công việc trước đây."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Claims alleging that a professor or student engages or has engaged in illegal activities or criminal conduct."
              : "Cáo buộc giảng viên hoặc sinh viên có hành vi phạm pháp hoặc vi phạm pháp luật hình sự."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Direct references to other existing comments or comments that have been deleted by our moderators."
              : "Dẫn chiếu trực tiếp đến các bình luận khác đang tồn tại hoặc những bình luận đã bị ban quản trị xóa trước đó."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Accusations that the professor is rating him/herself or his/her colleagues."
              : "Quy kết hoặc cáo buộc giảng viên đang tự đánh giá cho bản thân hoặc đồng nghiệp."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "A language other than Vietnamese or English. Comments must be written in Vietnamese or English only."
              : "Ngôn ngữ ngoài tiếng Việt và tiếng Anh. Bình luận phải được viết bằng tiếng Việt hoặc tiếng Anh chuẩn mực."}
          </li>

          <li className="leading-relaxed">
            {isEn
              ? "Hyperlinks, commercial advertisements, paid document links, or exam/course cheating services."
              : "Chèn siêu liên kết (hyperlinks), URL, quảng cáo thương mại, dịch vụ học hộ, thi hộ hoặc rao bán tài liệu."}
          </li>
        </ul>
      </div>

      {/* 7. PROFESSOR GUIDELINES */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Professor Guidelines" : "Quy định dành cho Giảng viên"}</span>
        </div>

        <ul className="space-y-3 text-xs sm:text-sm text-gray-800">
          <li className="leading-relaxed">
            <strong>{isEn ? "Anonymous platform:" : "Diễn đàn chia sẻ ẩn danh của sinh viên:"}</strong>{" "}
            {isEn
              ? "This is an anonymous website where students can share classroom experiences. We are unable to provide identity data or personal information about the submitter of a review, except under valid legal process."
              : "Đây là website ẩn danh nơi sinh viên chia sẻ trải nghiệm lớp học. Chúng tôi không thể cung cấp dữ liệu danh tính hay thông tin cá nhân của người viết đánh giá, trừ khi có yêu cầu hợp pháp từ cơ quan tiến hành tố tụng."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Public catalog sourced:" : "Dữ liệu hồ sơ từ nguồn công vụ và cộng đồng:"}</strong>{" "}
            {isEn
              ? "Profiles and course catalogs are gathered from official university public catalogs (.edu.vn) or submitted by our student community."
              : "Hồ sơ giảng viên và môn học được tổng hợp từ cổng thông tin đào tạo công vụ (.edu.vn) của các trường đại học hoặc do cộng đồng sinh viên đề xuất."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Negative feedback policy:" : "Chính sách với đánh giá tiêu cực:"}</strong>{" "}
            {isEn
              ? "We are unable to remove a comment simply because it is negative or critical. A comment will only be removed if it violates our Site Guidelines."
              : "Chúng tôi không thể gỡ bỏ một nhận xét chỉ vì nội dung mang tính phê bình hoặc điểm số chưa cao. Nhận xét chỉ bị gỡ bỏ khi vi phạm các Quy định Đăng bài này."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Engage via verified professor account:" : "Tương tác qua tài khoản Giảng viên xác thực:"}</strong>{" "}
            {isEn
              ? "We encourage faculty to engage constructively with students. With a verified Professor account, you have the ability to post official replies and receive alerts when new ratings are posted on your profile."
              : "Chúng tôi khuyến khích quý thầy cô tương tác văn minh với sinh viên. Với tài khoản Giảng viên đã xác thực, quý vị có thể đăng phản hồi chính thức và nhận thông báo khi có đánh giá mới trên trang hồ sơ."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Civility in professor replies:" : "Chuẩn mực trong phản hồi của giảng viên:"}</strong>{" "}
            {isEn
              ? "Replies fueled by anger do not reflect well on the author and can be removed for violations such as profanity. Professor replies are subject to the same limitations regarding Prohibited Content set forth above."
              : "Những phản hồi viết trong cơn tức giận sẽ làm giảm uy tín sư phạm và có thể bị xóa nếu vi phạm chuẩn mực ngôn từ. Phản hồi của giảng viên cũng phải tuân thủ nghiêm ngặt quy định về Nội dung Bị cấm."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "We are not arbiters of facts:" : "Ban kiểm duyệt không phân xử đúng sai sự thật:"}</strong>{" "}
            {isEn
              ? "The RateUrProfs moderation team is unable to prove or disprove details mentioned in a review or arbitrate pedagogical disputes. If you disagree with details in a review, you may post a clarifying reply or request an academic data correction."
              : "Đội ngũ kiểm duyệt không thể chứng minh hoặc bác bỏ các chi tiết thực tế trong lớp học hay phân xử tranh chấp chuyên môn. Nếu quý vị không đồng tình với nhận định của sinh viên, xin hãy đăng phản hồi giải thích hoặc gửi đề xuất đính chính học thuật."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Assistance against spam & dogpiling:" : "Hỗ trợ khi bị spam hoặc hùa dồn (Dogpiling):"}</strong>{" "}
            {isEn
              ? "If you believe your profile is being spammed, brigaded, or dogpiled, please contact us at support@rateurprofs.site. We are here to help and will gladly review the comments in question."
              : "Nếu quý thầy cô nghi ngờ hồ sơ của mình đang bị spam hoặc hùa dồn đánh giá tiêu cực có tổ chức, xin hãy liên hệ với chúng tôi tại support@rateurprofs.site. Chúng tôi sẵn sàng kiểm tra đối soát và xử lý."}
          </li>

          <li className="leading-relaxed">
            <strong>{isEn ? "Encouraging semester ratings:" : "Khuyến khích sinh viên đánh giá định kỳ:"}</strong>{" "}
            {isEn
              ? "While it is against our guidelines for a professor to rate themselves, we recommend that professors encourage their students to provide ratings each semester. The larger the feedback pool, the more representative it will be."
              : "Mặc dù quy định cấm giảng viên tự chấm điểm cho mình, chúng tôi khuyến khích các thầy cô kêu gọi toàn bộ sinh viên trong lớp tham gia đánh giá vào cuối mỗi kỳ học. Số lượng đánh giá càng lớn thì kết quả càng mang tính đại diện và khách quan."}
          </li>
        </ul>
      </div>

      {/* 8. FLAGGING A RATING */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Flagging a Rating" : "Báo cáo Đánh giá Vi phạm"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "If you see a rating that you believe violates these Site Guidelines, please click the \"Report this rating\" button at the bottom of the comment and state the specific problem. Such comments will be evaluated by site personnel. Please do not flag a rating just because you disagree with it."
            : "Nếu bạn thấy một nhận xét mà bạn cho rằng vi phạm Quy định Đăng bài này, vui lòng bấm nút \"Báo cáo đánh giá\" ở chân nhận xét và nêu rõ lý do. Ban kiểm duyệt sẽ đánh giá cẩn trọng. Xin đừng báo cáo một nhận xét chỉ vì bạn không đồng tình với ý kiến đó."}
        </p>
      </div>

      {/* 9. LEGAL INFORMATION & PLATFORM PROTECTIONS */}
      <div className="p-6 bg-[#e0f2fe] border-2 border-black shadow-[4px_4px_0px_#000] space-y-4">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Legal Information & Intermediary Protections" : "Thông tin Pháp lý & Cơ chế Miễn trừ Nền tảng Trung gian"}</span>
        </div>

        <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">
          {isEn
            ? "RateUrProfs occasionally receives removal demands that include threats of lawsuits. Under applicable statutory frameworks governing internet information services (including Vietnamese Decree No. 72/2013/ND-CP, Decree No. 27/2018/ND-CP, Decree No. 147/2024/ND-CP, Article 198a of the Intellectual Property Law, and international safe-harbor standards), RateUrProfs operates as an intermediary hosting provider and is legally protected from liability for subjective evaluations and reviews submitted by third-party users."
            : "RateUrProfs thỉnh thoảng nhận được các yêu cầu gỡ bài kèm theo lời đe dọa kiện tụng. Pháp luật bảo vệ RateUrProfs khỏi trách nhiệm pháp lý đối với nội dung do người dùng tự đăng tải. Cụ thể, căn cứ quy định pháp luật hiện hành về dịch vụ mạng và thông tin trên mạng (bao gồm Nghị định số 72/2013/NĐ-CP, Nghị định số 27/2018/NĐ-CP, Nghị định số 147/2024/NĐ-CP của Chính phủ, Điều 198a Luật Sở hữu trí tuệ, cũng như nguyên tắc miễn trừ trách nhiệm của nền tảng trung gian theo chuẩn mực quốc tế), RateUrProfs là bên cung cấp dịch vụ lưu trữ thông tin trung gian và được miễn trừ trách nhiệm đối với các nhận định, đánh giá cá nhân do người dùng khởi tạo."}
        </p>

        <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">
          {isEn
            ? "The law is clear on this. Anyone who wishes to sue RateUrProfs for reviews posted by community members risks penalties and sanctions imposed by the court. These may include financial sanctions and reimbursement of attorney fees and expenses incurred in defending against lawsuits that ignore statutory protections."
            : "Pháp luật đã quy định rất rõ về điều này. Bất kỳ bên nào có ý định kiện RateUrProfs về các nhận xét do thành viên đăng tải có nguy cơ phải chịu các chế tài tố tụng của tòa án, bao gồm nghĩa vụ bồi hoàn toàn bộ chi phí luật sư và án phí phát sinh cho việc bảo vệ trước các vụ kiện phớt lờ cơ chế miễn trừ pháp lý của nền tảng."}
        </p>

        <div className="p-4 bg-white border-2 border-black shadow-[2px_2px_0px_#000] space-y-1.5 text-xs">
          <span className="font-black text-black uppercase block">
            {isEn ? "Service of Legal Process & Official Inquiries" : "Địa chỉ Tiếp nhận Văn bản Pháp lý Chính thức"}
          </span>
          <p className="text-gray-800 leading-relaxed">
            {isEn
              ? "If you intend to serve formal legal process or statutory notices on RateUrProfs, please direct inquiries to our designated legal administration desk at: "
              : "Nếu quý vị có ý định tống đạt văn bản tố tụng hoặc yêu cầu pháp lý chính thức tới RateUrProfs, xin vui lòng gửi về bộ phận pháp chế và quản trị của chúng tôi tại: "}
            <a href="mailto:admin@rateurprofs.site" className="font-bold underline text-[#e03a3e]">admin@rateurprofs.site</a>
            {isEn
              ? " (for community moderation and review disputes, please contact "
              : " (đối với khiếu nại đánh giá và hỗ trợ cộng đồng, vui lòng liên hệ "}
            <a href="mailto:support@rateurprofs.site" className="font-bold underline text-black">support@rateurprofs.site</a>).
            {isEn
              ? " Formal notices must strictly comply with all applicable procedural service rules under the laws of Vietnam. We are not obligated to respond if service is invalid."
              : " Mọi tống đạt phải tuân thủ đúng quy định tố tụng của pháp luật Việt Nam. Chúng tôi không có nghĩa vụ phản hồi các yêu cầu không hợp lệ."}
          </p>
        </div>

        <p className="text-[11px] text-gray-700 italic">
          {isEn
            ? "These guidelines are provided for informational purposes only and do not constitute legal advice. While we stand by our guidelines, you are encouraged to seek independent counsel from an attorney competent in the relevant field of law."
            : "Các quy định này được công bố nhằm mục đích thông tin minh bạch và không cấu thành lời tư vấn pháp lý. Quý vị được khuyến khích tham vấn luật sư có chuyên môn về lĩnh vực pháp luật liên quan."}
        </p>
      </div>

      {/* 10. RESERVATION OF RIGHTS */}
      <div className="p-6 bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
        <div className="flex items-center text-black font-black text-sm uppercase tracking-wider">
          <span>{isEn ? "Reservation of Rights" : "Bảo lưu Quyền hạn của Ban Quản trị"}</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "RateUrProfs reserves the right to remove any comments deemed inappropriate, libelous, defamatory, indecent, vulgar, obscene, pornographic, sexually explicit, racially or ethnically offensive, harmful, harassing, intimidating, threatening, hateful, discriminatory, or abusive, or that otherwise violate our Terms of Use Agreement."
            : "RateUrProfs bảo lưu toàn quyền gỡ bỏ bất kỳ nhận xét nào bị coi là không phù hợp, phỉ báng, vu khống, khiếm nhã, thô tục, khiêu dâm, xúc phạm dân tộc/văn hóa, gây hại, quấy rối, đe dọa, thù địch, phân biệt đối xử hoặc vi phạm Điều khoản Sử dụng."}
        </p>
        <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
          {isEn
            ? "RateUrProfs reserves the right to remove content, provide records to authorities, or otherwise take appropriate legal action regarding comments that threaten violence or bodily harm to another user or professor, including notifying authorities of your IP address, where available, and timestamps."
            : "RateUrProfs bảo lưu quyền gỡ bỏ, cung cấp chứng cứ cho cơ quan chức năng hoặc tiến hành các biện pháp pháp lý cần thiết đối với các bình luận đe dọa bạo lực hoặc xâm phạm thân thể đối với người dùng khác hoặc giảng viên, bao gồm việc chuyển giao địa chỉ IP và dấu thời gian cho cơ quan công an có thẩm quyền."}
        </p>
      </div>

      {/* 11. BOTTOM ACTION BAR WITH [Site Guidelines] BADGE */}
      <div className="p-6 bg-black text-white border-2 border-black shadow-[6px_6px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-[#fef9c3] text-black text-xs font-mono font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#fff]">
            [Site Guidelines]
          </span>
          <span className="text-xs text-gray-300 font-mono">
            {isEn ? "RateUrProfs Civility & Review Standards" : "Quy chuẩn Văn minh & Đánh giá RateUrProfs"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center px-3 py-1.5 bg-white text-black hover:bg-[#fef9c3] text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all cursor-pointer"
          >
            <span>{isEn ? "Back to Top" : "Lên đầu trang"}</span>
          </button>
          <Link
            href={`/${locale}`}
            className="px-4 py-1.5 bg-[#e03a3e] hover:bg-white hover:text-black text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-black transition-all"
          >
            {isEn ? "Search on Home →" : "Tìm kiếm tại trang chủ →"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * RateUrProfs Inbound AI Agent Tools Registry
 *
 * Implements autonomous problem-solving capabilities connected directly to
 * the platform's database with strict privacy and security boundaries.
 */

import crypto from "node:crypto";
import { searchLecturers, getDbUserByEmail, createCorrectionRequest, getAccountAppealByUserId } from "@/lib/server/db";
import { createSecureEmailToken, queueEmail } from "@/lib/server/email/emailService";
import { INITIAL_UNIVERSITIES } from "@/lib/initialData";
import { getEmailBaseUrl } from "@/lib/server/email/emailTokens";
import { normalizeSearchString } from "@/lib/search/vietnameseNormalizer";

export interface ToolExecutionContext {
  senderEmail: string;
  senderName?: string;
  locale: "vi" | "en";
}

/**
 * 1. Search Lecturer Tool
 */
export async function toolSearchLecturer(
  params: { query: string; university?: string },
  context: ToolExecutionContext
): Promise<string> {
  const query = (params.query || "").trim();
  if (!query) {
    return context.locale === "vi"
      ? "Lỗi: Vui lòng cung cấp tên giảng viên cần tìm kiếm."
      : "Error: Please provide a lecturer name to search.";
  }

  try {
    const searchRes = await searchLecturers({ query, pageSize: 4 });
    const professors = searchRes.items || [];
    const baseUrl = getEmailBaseUrl();

    if (professors.length === 0) {
      return context.locale === "vi"
        ? `Không tìm thấy giảng viên nào phù hợp với từ khóa "${query}". Bạn có thể tìm kiếm thêm tại ${baseUrl}/${context.locale}.`
        : `No professors found matching "${query}". You can browse all faculty at ${baseUrl}/${context.locale}.`;
    }

    const items = professors.map((p) => {
      const rating = typeof p.ratingAverage === "number" && p.ratingAverage > 0 ? `${p.ratingAverage.toFixed(1)}/5.0` : "Chưa có";
      const count = p.ratingCount || p.publishedReviewCount || 0;
      const title = p.academicTitle || p.title || "";
      const uni = p.universityName || p.universityShortName || "";
      const link = `${baseUrl}/${context.locale}/professors/${p.id}`;

      return `- ${title ? `${title} ` : ""}${p.name} (${uni}) — Điểm đánh giá: ${rating} (${count} lượt đánh giá). Xem hồ sơ: ${link}`;
    });

    return context.locale === "vi"
      ? `Đã tìm thấy ${professors.length} giảng viên phù hợp:\n${items.join("\n")}`
      : `Found ${professors.length} matching professors:\n${items.join("\n")}`;
  } catch (err) {
    console.error("[InboundTool] searchLecturer error:", err);
    return "Failed to search professors due to a database query issue.";
  }
}

/**
 * 2. Search University Tool
 */
export async function toolSearchUniversity(
  params: { query: string },
  context: ToolExecutionContext
): Promise<string> {
  const query = (params.query || "").trim().toLowerCase();
  if (!query) {
    return "Error: Please specify university query.";
  }

  const baseUrl = getEmailBaseUrl();
  const normalizedQuery = normalizeSearchString(query);

  const matched = INITIAL_UNIVERSITIES.filter((u) => {
    const normName = normalizeSearchString(u.name || "");
    const normShort = normalizeSearchString(u.shortName || "");
    const normCode = (u.id || "").toLowerCase();
    return normName.includes(normalizedQuery) || normShort.includes(normalizedQuery) || normCode.includes(query);
  }).slice(0, 3);

  if (matched.length === 0) {
    return context.locale === "vi"
      ? `Không tìm thấy trường đại học nào với từ khóa "${params.query}".`
      : `No university found matching "${params.query}".`;
  }

  const list = matched.map((u) => {
    const link = `${baseUrl}/${context.locale}/universities/${u.id}`;
    return `- ${u.name} (${u.shortName || u.id}) — Thành phố: ${u.city || "Việt Nam"}. Xem trường: ${link}`;
  });

  return context.locale === "vi"
    ? `Thông tin trường đại học tìm được:\n${list.join("\n")}`
    : `Matching universities:\n${list.join("\n")}`;
}

/**
 * 3. Check User Account Status (STRICT SENDER-ONLY PRIVACY)
 */
export async function toolCheckUserAccount(
  params: { targetEmail: string },
  context: ToolExecutionContext
): Promise<string> {
  const targetEmail = (params.targetEmail || "").trim().toLowerCase();
  const senderEmail = (context.senderEmail || "").trim().toLowerCase();

  // PRIVACY RULE: Reject checks for any email other than the verified sender
  if (targetEmail !== senderEmail) {
    return context.locale === "vi"
      ? "Vì lý do bảo mật và quyền riêng tư, hệ thống chỉ hỗ trợ kiểm tra thông tin tài khoản gắn liền với chính địa chỉ email đang gửi thư này."
      : "For security and privacy reasons, the assistant can only inspect account details for the verified sender email.";
  }

  try {
    const user = await getDbUserByEmail(senderEmail);
    if (!user) {
      return context.locale === "vi"
        ? `Không tìm thấy tài khoản RateUrProfs nào được đăng ký với email ${senderEmail}. Bạn có thể đăng ký tài khoản mới trực tiếp trên trang web.`
        : `No RateUrProfs account found registered with ${senderEmail}. You can sign up directly on our website.`;
    }

    const isLocked = Boolean(user.locked_at) || user.status === "suspended";
    let appealNote = "";

    if (isLocked) {
      const appeal = await getAccountAppealByUserId(user.id);
      if (appeal) {
        appealNote = context.locale === "vi"
          ? ` Bạn đã nộp đơn khiếu nại (Mã: ${appeal.id}) vào ngày ${new Date(appeal.created_at).toLocaleDateString("vi-VN")}, trạng thái hiện tại: [${appeal.status}].`
          : ` You have an active appeal (ID: ${appeal.id}) submitted on ${new Date(appeal.created_at).toLocaleDateString()}, status: [${appeal.status}].`;
      }
    }

    if (context.locale === "vi") {
      return `Thông tin tài khoản:
- Email: ${senderEmail}
- Họ tên: ${user.display_name || "Chưa cập nhật"}
- Trạng thái tài khoản: ${isLocked ? `Đang bị tạm khóa (${user.lock_reason || "Vi phạm quy chuẩn cộng đồng"})` : "Đang hoạt động bình thường"}
${appealNote}
${isLocked ? "Nếu cần mở khóa tài khoản, bạn có thể gửi đơn khiếu nại tại trang /vi/account/appeal hoặc phản hồi email này." : ""}`;
    }

    return `Account Details:
- Email: ${senderEmail}
- Name: ${user.display_name || "N/A"}
- Status: ${isLocked ? `Locked (${user.lock_reason || "Policy violation"})` : "Active and in good standing"}
${appealNote}
${isLocked ? "To request account review, please visit /en/account/appeal or reply directly to this email." : ""}`;
  } catch (err) {
    console.error("[InboundTool] checkUserAccount error:", err);
    return "Failed to retrieve account status.";
  }
}

/**
 * 4. Request Password Reset (STRICT SENDER-ONLY PRIVACY)
 */
export async function toolRequestPasswordReset(
  params: { targetEmail: string },
  context: ToolExecutionContext
): Promise<string> {
  const targetEmail = (params.targetEmail || "").trim().toLowerCase();
  const senderEmail = (context.senderEmail || "").trim().toLowerCase();

  if (targetEmail !== senderEmail) {
    return context.locale === "vi"
      ? "Vì lý do bảo mật, yêu cầu đặt lại mật khẩu chỉ được gửi đến chính địa chỉ email đang gửi thư này."
      : "Security violation: Password reset can only be initiated for your verified sender email address.";
  }

  try {
    const user = await getDbUserByEmail(senderEmail);
    if (!user) {
      return context.locale === "vi"
        ? `Không tìm thấy tài khoản với email ${senderEmail}. Vui lòng kiểm tra lại email bạn đã đăng ký.`
        : `No account exists with ${senderEmail}. Please verify your registered email address.`;
    }

    const { rawToken } = await createSecureEmailToken({
      userId: user.id,
      email: senderEmail,
      tokenType: "password_reset",
      expiresInMs: 60 * 60 * 1000,
    });

    const baseUrl = getEmailBaseUrl();
    const resetUrl = `${baseUrl}/${context.locale}/account/settings?reset_token=${rawToken}`;

    await queueEmail({
      recipient: senderEmail,
      templateId: "password_reset",
      templateVars: {
        email: senderEmail,
        resetUrl,
        token: rawToken,
        expiresInHours: 1,
      },
      locale: context.locale,
      sender: "RateUrProfs Security <security@rateurprofs.site>",
    });

    return context.locale === "vi"
      ? `Một liên kết đặt lại mật khẩu bảo mật vừa được gửi trực tiếp đến hộp thư ${senderEmail}. Liên kết có hiệu lực trong vòng 60 phút. Vui lòng kiểm tra hộp thư đến hoặc mục thư rác.`
      : `A secure password reset link has been dispatched to ${senderEmail}. The link remains valid for 60 minutes. Please check your inbox or spam folder.`;
  } catch (err) {
    console.error("[InboundTool] requestPasswordReset error:", err);
    return "Failed to queue password reset email.";
  }
}

/**
 * 5. Submit Lecturer Data Correction Request
 */
export async function toolSubmitCorrection(
  params: {
    professorId: string;
    professorName: string;
    details: string;
  },
  context: ToolExecutionContext
): Promise<string> {
  const { professorId, professorName, details } = params;
  if (!professorId || !details) {
    return "Error: Missing professorId or correction details.";
  }

  try {
    const ticketId = `corr_${crypto.randomBytes(4).toString("hex")}`;
    await createCorrectionRequest({
      id: ticketId,
      professorId: professorId.trim(),
      professorName: (professorName || "Unknown").trim(),
      requesterEmail: context.senderEmail,
      requesterRelation: "student",
      details: details.trim(),
      createdAt: Date.now(),
    });

    return context.locale === "vi"
      ? `Yêu cầu chỉnh sửa thông tin cho giảng viên "${professorName || professorId}" đã được tạo thành công với mã phiếu [${ticketId}]. Đội ngũ kiểm duyệt RateUrProfs sẽ đối soát thông tin với cơ sở dữ liệu Bộ GD&ĐT trong 24 giờ làm việc.`
      : `Correction ticket for professor "${professorName || professorId}" successfully created with reference ID [${ticketId}]. Our moderation team will verify against official MOET records within 24 business hours.`;
  } catch (err) {
    console.error("[InboundTool] submitCorrection error:", err);
    return "Failed to submit correction ticket to database.";
  }
}

/**
 * Gemini Tool Declarations for Function Calling
 */
export const INBOUND_AGENT_TOOLS = [
  {
    name: "search_university",
    description: "Search for a university in Vietnam by name, acronym (e.g. HUST, NEU, RMIT, HCMUT), or city. Returns profile link and basic info.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Name, acronym, or code of the university" },
      },
      required: ["query"],
    },
  },
  {
    name: "check_user_account",
    description: "Checks registration, active status, lock reason, or appeal status for the sender's account. Strictly restricted to the sender's verified email.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetEmail: { type: "STRING", description: "The email address to check (MUST match the sender email)" },
      },
      required: ["targetEmail"],
    },
  },
  {
    name: "request_password_reset",
    description: "Initiates a secure password reset email for users struggling to log in. Strictly restricted to the sender's verified email.",
    parameters: {
      type: "OBJECT",
      properties: {
        targetEmail: { type: "STRING", description: "The email address requesting password reset (MUST match sender email)" },
      },
      required: ["targetEmail"],
    },
  },
  {
    name: "submit_correction",
    description: "Submits an academic profile correction ticket (e.g. updated title GS/PGS/TS, wrong department, or updated course info) to the admin queue.",
    parameters: {
      type: "OBJECT",
      properties: {
        professorId: { type: "STRING", description: "The ID of the professor in RateUrProfs" },
        professorName: { type: "STRING", description: "The full name of the professor" },
        details: { type: "STRING", description: "Description of the correction or outdated information" },
      },
      required: ["professorId", "details"],
    },
  },
];

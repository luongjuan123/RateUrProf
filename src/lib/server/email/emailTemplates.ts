/**
 * RateUrProfs Neo-Brutalist Responsive Email Templates
 *
 * Visually reproduces the RateUrProfs live website design language:
 * - 100% sharp square geometry (border-radius: 0px).
 * - Thick #111111 borders with hard offset drop-shadows.
 * - Signature RateUrProfs red (#e03a3e) brand accents.
 * - Soft pastel utility surfaces: yellow (#fef9c3), blue (#e0f2fe), coral (#fee2e2).
 * - Monospace bracket navigation items matching `src/components/Footer.tsx`.
 * - Full bilingual support (Vietnamese & English).
 * - Accessible HTML table layout compatible with Gmail, Outlook, Apple Mail, and mobile clients.
 * - Safe HTML escaping for all user-supplied variables.
 * - Generated plain-text alternatives for every template.
 */

import { EmailTemplateId, EmailLocale, RenderedEmail } from "./emailTypes";
import { escapeHtml, sanitizeHeaderField } from "./emailSanitizer";
import { EMAIL_DESIGN_TOKENS, getEmailBaseUrl } from "./emailTokens";

interface BaseLayoutOptions {
  title: string;
  eyebrowTag: string;
  tagColor?: string;
  contentHtml: string;
  locale: EmailLocale;
  unsubscribeUrl?: string;
}

/**
 * Renders the Neo-Brutalist HTML container matching the RateUrProfs website.
 */
function renderBaseLayout({
  title,
  eyebrowTag,
  tagColor = EMAIL_DESIGN_TOKENS.colors.yellowAccent,
  contentHtml,
  locale,
  unsubscribeUrl,
}: BaseLayoutOptions): string {
  const baseUrl = getEmailBaseUrl();
  const isVi = locale === "vi";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    /* Reset & Email Client Normalization */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      width: 100% !important;
      height: 100% !important;
      background-color: ${EMAIL_DESIGN_TOKENS.colors.bgPage};
      margin: 0;
      padding: 0;
      font-family: ${EMAIL_DESIGN_TOKENS.typography.fontSans};
      -webkit-font-smoothing: antialiased;
      color: ${EMAIL_DESIGN_TOKENS.colors.textPrimary};
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      border-collapse: collapse !important;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    /* Neo-Brutalist Sharp Corner Enforcement */
    * {
      border-radius: 0px !important;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .content-padding {
        padding: 24px 18px !important;
      }
      .header-padding {
        padding: 18px !important;
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_DESIGN_TOKENS.colors.bgPage};">
  <!-- Top 4px RateUrProfs Signature Editorial Red Accent Bar -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td height="5" style="background-color: ${EMAIL_DESIGN_TOKENS.colors.brandRed}; font-size: 1px; line-height: 1px;">&nbsp;</td>
    </tr>
  </table>

  <!-- Outer Centering Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${EMAIL_DESIGN_TOKENS.colors.bgPage};">
    <tr>
      <td align="center" style="padding: 28px 12px 48px;">
        <!-- 600px Max-Width Neo-Brutalist Main Container -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border: 2px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; box-shadow: 5px 5px 0px ${EMAIL_DESIGN_TOKENS.colors.borderBlack};">
          
          <!-- Branded Header -->
          <tr>
            <td class="header-padding" style="padding: 24px 32px 20px; border-bottom: 2px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; background-color: #ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <a href="${baseUrl}/${locale}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <!-- Neo-Brutalist Logo Square [RUP] -->
                          <td width="38" height="38" align="center" valign="middle" style="width: 38px; height: 38px; background-color: ${EMAIL_DESIGN_TOKENS.colors.yellowAccent}; border: 2px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; box-shadow: 2px 2px 0px ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 13px; font-weight: 900; line-height: 38px;">
                            <span style="color: #111111;">RU</span><span style="color: ${EMAIL_DESIGN_TOKENS.colors.brandRed};">P</span>
                          </td>
                          <td style="padding-left: 12px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontSans}; font-size: 24px; font-weight: 900; letter-spacing: -0.03em; line-height: 1;">
                            <span style="color: #111111;">RateUr</span><span style="color: ${EMAIL_DESIGN_TOKENS.colors.brandRed};">Profs</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 3px 8px; background-color: #f4f4f5; border: 1.5px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">
                      ${isVi ? "Xác thực GCP" : "Official System"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 32px; background-color: #ffffff;">
              <!-- Eyebrow Tag -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
                <tr>
                  <td style="background-color: ${tagColor}; border: 1.5px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; box-shadow: 1.5px 1.5px 0px ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; padding: 3px 10px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #111111;">
                    ${escapeHtml(eyebrowTag)}
                  </td>
                </tr>
              </table>

              <!-- Main Heading -->
              <h1 style="margin: 0 0 20px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontSans}; font-size: 22px; font-weight: 900; letter-spacing: -0.02em; line-height: 1.25; color: ${EMAIL_DESIGN_TOKENS.colors.textPrimary};">
                ${escapeHtml(title)}
              </h1>

              <!-- Dynamic Body Content -->
              <div style="font-family: ${EMAIL_DESIGN_TOKENS.typography.fontSans}; font-size: 14px; line-height: 1.65; color: #27272a;">
                ${contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer matching Website Footer.tsx -->
          <tr>
            <td style="padding: 24px 32px 28px; background-color: #fafafa; border-top: 2px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack};">
              <!-- Navigation Badges -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td>
                    <a href="${baseUrl}/${locale}" target="_blank" style="display: inline-block; margin-right: 6px; margin-bottom: 6px; padding: 2px 7px; background-color: #ffffff; color: #111111; border: 1px solid #111111; box-shadow: 1px 1px 0px #111111; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 800; text-decoration: none; text-transform: uppercase;">
                      [${isVi ? "Trang chủ" : "Home"}]
                    </a>
                    <a href="${baseUrl}/${locale}/guidelines" target="_blank" style="display: inline-block; margin-right: 6px; margin-bottom: 6px; padding: 2px 7px; background-color: ${EMAIL_DESIGN_TOKENS.colors.yellowAccent}; color: #111111; border: 1px solid #111111; box-shadow: 1px 1px 0px #111111; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 800; text-decoration: none; text-transform: uppercase;">
                      [Site Guidelines]
                    </a>
                    <a href="${baseUrl}/${locale}/terms" target="_blank" style="display: inline-block; margin-right: 6px; margin-bottom: 6px; padding: 2px 7px; background-color: #ffffff; color: #111111; border: 1px solid #111111; box-shadow: 1px 1px 0px #111111; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 800; text-decoration: none; text-transform: uppercase;">
                      [Terms of Use]
                    </a>
                    <a href="${baseUrl}/${locale}/privacy" target="_blank" style="display: inline-block; margin-right: 6px; margin-bottom: 6px; padding: 2px 7px; background-color: #dbeafe; color: #111111; border: 1px solid #111111; box-shadow: 1px 1px 0px #111111; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 800; text-decoration: none; text-transform: uppercase;">
                      [Privacy Policy]
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Legal & Security Disclaimers -->
              <p style="margin: 0 0 10px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; line-height: 1.5; color: ${EMAIL_DESIGN_TOKENS.colors.textMuted};">
                ${isVi
                  ? "Email này được gửi tự động từ hệ thống RateUrProfs (rateurprofs.site). Mọi thắc mắc và hỗ trợ vui lòng gửi về: support@rateurprofs.site"
                  : "This is an automated message from RateUrProfs (rateurprofs.site). For inquiries, please reach out to: support@rateurprofs.site"}
              </p>
              <p style="margin: 0 0 10px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; line-height: 1.4; color: #71717a;">
                ${isVi
                  ? "Bảo mật: RateUrProfs không bao giờ yêu cầu mật khẩu hoặc mã phiên làm việc của bạn qua email."
                  : "Security: RateUrProfs will never request your password or session credentials via email."}
              </p>
              ${
                unsubscribeUrl
                  ? `<p style="margin: 0; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; color: #71717a;">
                      ${isVi ? "Không muốn nhận thông báo này?" : "Don't want these notifications?"} 
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color: #111111; font-weight: 700; text-decoration: underline;">
                        ${isVi ? "Hủy đăng ký nhận thư" : "Unsubscribe here"}
                      </a>
                    </p>`
                  : ""
              }
              <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e4e4e7; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; color: #111111;">
                &copy; 2026 RateUrProfs. ${isVi ? "Bảo lưu mọi quyền." : "All rights reserved."}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders a Neo-Brutalist Call-To-Action button.
 */
function renderNeoButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center" style="background-color: #111111; border: 2px solid #111111; box-shadow: 3px 3px 0px #111111;">
        <a href="${escapeHtml(url)}" target="_blank" style="display: block; padding: 13px 30px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 13px; font-weight: 900; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 0.06em;">
          ${escapeHtml(label)} &rarr;
        </a>
      </td>
    </tr>
  </table>`;
}

/**
 * Renders a highlighted notice callout box.
 */
function renderNoticeBox(
  text: string,
  variant: "info" | "warning" | "alert" = "info"
): string {
  let bg = EMAIL_DESIGN_TOKENS.colors.blueAccent;
  let label = "THÔNG TIN";
  if (variant === "warning") {
    bg = EMAIL_DESIGN_TOKENS.colors.yellowAccent;
    label = "LƯU Ý QUAN TRỌNG";
  } else if (variant === "alert") {
    bg = EMAIL_DESIGN_TOKENS.colors.coralAccent;
    label = "CẢNH BÁO BẢO MẬT";
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: ${bg}; border: 2px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; box-shadow: 2px 2px 0px ${EMAIL_DESIGN_TOKENS.colors.borderBlack};">
    <tr>
      <td style="padding: 14px 18px;">
        <div style="font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: #111111; margin-bottom: 4px;">
          [${label}]
        </div>
        <div style="font-size: 13px; line-height: 1.5; color: #111111;">
          ${text}
        </div>
      </td>
    </tr>
  </table>`;
}

// ===========================================================================
// TEMPLATE BUILDERS
// ===========================================================================

export function renderEmailTemplate(
  templateId: EmailTemplateId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vars: Record<string, any>,
  locale: EmailLocale = "vi"
): RenderedEmail {
  const isVi = locale === "vi";
  const baseUrl = getEmailBaseUrl();

  switch (templateId) {
    // -----------------------------------------------------------------------
    // 1. PASSWORD RESET
    // -----------------------------------------------------------------------
    case "password_reset": {
      const resetUrl = vars.resetUrl || `${baseUrl}/${locale}/account?reset_token=${vars.token || ""}`;
      const title = isVi ? "Yêu cầu Đặt lại Mật khẩu" : "Password Reset Request";
      const subject = isVi
        ? "[RateUrProfs] Hướng dẫn đặt lại mật khẩu tài khoản"
        : "[RateUrProfs] Instructions to reset your account password";

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Xin chào," : "Hello,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>${escapeHtml(vars.email || "bạn")}</strong>.`
              : `We received a request to reset the password for the account associated with <strong>${escapeHtml(vars.email || "your email")}</strong>.`
          }
        </p>
        ${renderNoticeBox(
          isVi
            ? "Để bảo vệ tài khoản, liên kết này có hiệu lực trong <strong>60 phút</strong> và sẽ tự hủy ngay sau khi sử dụng."
            : "To protect your account, this link is valid for <strong>60 minutes</strong> and is invalidated immediately after use.",
          "warning"
        )}
        ${renderNeoButton(isVi ? "Đặt lại Mật khẩu" : "Reset Password", resetUrl)}
        <p style="margin: 16px 0 6px; font-size: 12px; color: #52525b;">
          ${isVi ? "Liên kết trực tiếp:" : "Direct link:"}
        </p>
        <p style="margin: 0 0 16px; word-break: break-all; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; background: #f4f4f5; padding: 10px; border: 1px solid #111111;">
          <a href="${escapeHtml(resetUrl)}" style="color: #111111; text-decoration: underline;">${escapeHtml(resetUrl)}</a>
        </p>
        ${renderNoticeBox(
          isVi
            ? "Nếu bạn không thực hiện yêu cầu này, có thể ai đó đã nhập nhầm địa chỉ email. Mật khẩu hiện tại của bạn vẫn an toàn và không bị thay đổi."
            : "If you did not make this request, someone may have entered your email by mistake. Your current password remains secure.",
          "alert"
        )}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Xin chào," : "Hello,"}

${isVi ? "Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn." : "We received a password reset request for your account."}

${isVi ? "Truy cập đường dẫn sau để đặt mật khẩu mới (hết hạn sau 60 phút):" : "Visit the link below to reset your password (expires in 60 minutes):"}
${resetUrl}

${isVi ? "Nếu bạn không yêu cầu, vui lòng bỏ qua thư này." : "If you did not request this, please ignore this email."}

---
RateUrProfs (https://rateurprofs.site)
Support: support@rateurprofs.site
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: "Security Protocol",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 3. SECURITY ALERT
    // -----------------------------------------------------------------------
    case "security_alert": {
      const title = isVi ? "Cảnh báo Bảo mật Tài khoản" : "Account Security Notice";
      const subject = isVi
        ? `[Cảnh báo Bảo mật] Hoạt động quan trọng trên tài khoản RateUrProfs`
        : `[Security Notice] Important activity on your RateUrProfs account`;

      const action = vars.action || (isVi ? "Cập nhật tài khoản" : "Account updated");
      const clientIp = vars.ip || "unknown";
      const timestamp = new Date(vars.timestamp || Date.now()).toLocaleString(
        isVi ? "vi-VN" : "en-US",
        { timeZone: "Asia/Ho_Chi_Minh" }
      );

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Xin chào," : "Hello,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Chúng tôi phát hiện hoạt động quản trị hoặc bảo mật mới trên tài khoản của bạn:`
              : `We noticed recent administrative or security activity on your account:`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "HÀNH ĐỘNG" : "ACTION"}
            </td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #111111;">
              ${escapeHtml(action)}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "THỜI GIAN (VN)" : "TIMESTAMP"}
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; color: #111111;">
              ${escapeHtml(timestamp)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "ĐỊA CHỈ IP" : "IP ADDRESS"}
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; color: #111111;">
              ${escapeHtml(clientIp)}
            </td>
          </tr>
        </table>
        ${
          vars.details
            ? renderNoticeBox(escapeHtml(vars.details), "info")
            : ""
        }
        ${renderNoticeBox(
          isVi
            ? "Nếu bạn không thực hiện thao tác này, tài khoản của bạn có thể đã bị xâm nhập. Vui lòng đăng xuất tất cả thiết bị và liên hệ ngay: security@rateurprofs.site."
            : "If you did not perform this action, your account may be compromised. Please sign out immediately and contact security@rateurprofs.site.",
          "alert"
        )}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Hành động:" : "Action:"} ${action}
${isVi ? "Thời gian:" : "Timestamp:"} ${timestamp}
${isVi ? "IP:" : "IP:"} ${clientIp}

${vars.details || ""}

${isVi ? "Nếu bạn không thực hiện thao tác này, liên hệ ngay security@rateurprofs.site" : "If you did not perform this, contact security@rateurprofs.site immediately."}

---
RateUrProfs Security Team (https://rateurprofs.site)
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: "Security Alert",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 4. REVIEW MODERATED
    // -----------------------------------------------------------------------
    case "review_moderated": {
      const professorName = vars.professorName || "Giảng viên";
      const action = vars.action || "reviewed";
      const statusText =
        action === "hide"
          ? isVi ? "tạm ẩn do vi phạm quy chuẩn văn minh" : "hidden due to civility violations"
          : action === "delete"
          ? isVi ? "đã được gỡ bỏ khỏi hệ thống" : "removed from the platform"
          : isVi ? "được phê duyệt xuất bản" : "approved and published";

      const title = isVi ? "Thông báo Kiểm duyệt Đánh giá" : "Review Moderation Update";
      const subject = isVi
        ? `[Kiểm duyệt] Cập nhật trạng thái đánh giá giảng viên ${professorName}`
        : `[Moderation] Review update for Professor ${professorName}`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Xin chào," : "Hello,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Đội ngũ quản trị RateUrProfs vừa hoàn tất quy trình xem xét đánh giá liên quan đến giảng viên <strong>${escapeHtml(professorName)}</strong>.`
              : `The RateUrProfs moderation team has completed reviewing the submission for <strong>${escapeHtml(professorName)}</strong>.`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #e0f2fe; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "GIẢNG VIÊN" : "PROFESSOR"}
            </td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #111111;">
              ${escapeHtml(professorName)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #e0f2fe; border-right: 1px solid #111111;">
              ${isVi ? "KẾT QUẢ" : "DECISION"}
            </td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: ${action === "publish" ? "#064e3b" : "#991b1b"};">
              ${escapeHtml(statusText)}
            </td>
          </tr>
        </table>
        ${
          vars.reason
            ? renderNoticeBox(`${isVi ? "Lý do / Phản hồi:" : "Reason / Note:"} ${escapeHtml(vars.reason)}`, "info")
            : ""
        }
        <p style="margin: 14px 0 0; font-size: 13px; color: #52525b;">
          ${
            isVi
              ? "RateUrProfs luôn duy trì tiêu chuẩn học thuật khách quan, bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP và loại bỏ các nội dung bôi nhọ, xúc phạm."
              : "RateUrProfs strictly upholds civil academic discourse, protecting privacy in accordance with Decree 13/2023/ND-CP."
          }
        </p>
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Giảng viên:" : "Professor:"} ${professorName}
${isVi ? "Quyết định:" : "Decision:"} ${statusText}
${vars.reason ? `\n${isVi ? "Lý do:" : "Reason:"} ${vars.reason}` : ""}

---
RateUrProfs Moderation Team (https://rateurprofs.site)
Support: support@rateurprofs.site
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: "Moderation Notice",
          tagColor: EMAIL_DESIGN_TOKENS.colors.blueAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 5. CORRECTION UPDATE
    // -----------------------------------------------------------------------
    case "correction_update": {
      const professorName = vars.professorName || (isVi ? "Giảng viên" : "Professor");
      const status = vars.status || "received"; // 'received' | 'resolved'
      const title =
        status === "resolved"
          ? isVi ? "Yêu cầu Hiệu chỉnh Hồ sơ Đã Xử lý" : "Profile Correction Resolved"
          : isVi ? "Đã Tiếp nhận Yêu cầu Hiệu chỉnh Hồ sơ" : "Correction Request Received";

      const subject = isVi
        ? `[Hồ sơ Học thuật] ${title} — ${professorName}`
        : `[Academic Directory] ${title} — ${professorName}`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi Thầy/Cô và Quý độc giả," : "Dear Requester,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            status === "resolved"
              ? isVi
                ? `Yêu cầu hiệu chỉnh thông tin hồ sơ học thuật cho <strong>${escapeHtml(professorName)}</strong> đã được Ban Quản trị xử lý và cập nhật thành công theo dữ liệu chính thức.`
                : `Your correction request regarding <strong>${escapeHtml(professorName)}</strong> has been processed and updated in accordance with verified institutional records.`
              : isVi
              ? `Chúng tôi đã tiếp nhận yêu cầu đính chính thông tin cho <strong>${escapeHtml(professorName)}</strong> (Mã yêu cầu: <code>${escapeHtml(vars.requestId || "")}</code>).`
              : `We have received your correction request for <strong>${escapeHtml(professorName)}</strong> (Ticket ID: <code>${escapeHtml(vars.requestId || "")}</code>).`
          }
        </p>
        ${
          vars.details
            ? renderNoticeBox(`${isVi ? "Chi tiết ghi nhận:" : "Submitted details:"} ${escapeHtml(vars.details)}`, "info")
            : ""
        }
        <p style="margin: 14px 0 0; font-size: 13px; color: #52525b;">
          ${
            isVi
              ? "RateUrProfs cam kết bảo đảm tính chính xác của chức danh giảng dạy (GS/PGS), học vị (TS/ThS) và đơn vị công tác được công bố bởi các cơ sở giáo dục đại học hợp pháp."
              : "RateUrProfs is dedicated to institutional accuracy regarding statutory ranks (GS/PGS), degrees, and official affiliations."
          }
        </p>
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Giảng viên:" : "Professor:"} ${professorName}
${vars.requestId ? `Mã yêu cầu: ${vars.requestId}\n` : ""}
${vars.details ? `Chi tiết: ${vars.details}\n` : ""}

---
RateUrProfs Academic Registry (https://rateurprofs.site)
Contact: support@rateurprofs.site
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: "Academic Registry",
          tagColor: EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 6. ADMIN ALERT
    // -----------------------------------------------------------------------
    case "admin_alert": {
      const alertTitle = vars.title || (isVi ? "Cảnh báo Hệ thống" : "System Alert");
      const priority = vars.priority || "HIGH";
      const subject = `[RateUrProfs Admin Alert] [${priority}] ${alertTitle}`;

      const contentHtml = `
        <p style="margin: 0 0 14px; font-weight: 700; color: #991b1b;">
          🚨 ${escapeHtml(alertTitle)}
        </p>
        <p style="margin: 0 0 14px;">
          ${escapeHtml(vars.message || "Hệ thống ghi nhận sự kiện khẩn cấp cần quản trị viên xem xét.")}
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 8px 12px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fee2e2; width: 35%;">
              ĐỘ ƯU TIÊN
            </td>
            <td style="padding: 8px 12px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; font-weight: 900; color: #991b1b;">
              ${escapeHtml(priority)}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fee2e2;">
              THỜI GIAN
            </td>
            <td style="padding: 8px 12px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px;">
              ${new Date().toISOString()}
            </td>
          </tr>
        </table>
        ${
          vars.metadata
            ? `<pre style="background: #111111; color: #6ee7b7; padding: 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; overflow-x: auto; border: 2px solid #111111;">${escapeHtml(
                JSON.stringify(vars.metadata, null, 2)
              )}</pre>`
            : ""
        }
        ${renderNeoButton("Mở Bảng Điều Khiển Admin", `${baseUrl}/admin`)}
      `;

      const text = `
RATEURPROFS ADMIN ALERT [${priority}]
=====================================================
${alertTitle}

${vars.message || ""}

Metadata:
${JSON.stringify(vars.metadata || {}, null, 2)}

Dashboard: ${baseUrl}/admin
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title: alertTitle,
          eyebrowTag: `Admin Alert [${priority}]`,
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 7. TEST EMAIL
    // -----------------------------------------------------------------------
    case "test_email":
    default: {
      const title = isVi ? "Thử nghiệm Hệ thống Email RateUrProfs" : "RateUrProfs Email System Test";
      const subject = isVi
        ? `[Thử nghiệm] Kiểm tra phát hành email từ rateurprofs.site`
        : `[Test] Email dispatch verification from rateurprofs.site`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính chào Quản trị viên," : "Hello Administrator,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? "Đây là email kiểm tra được gửi thành công từ hệ thống giao vận email tự động của <strong>RateUrProfs</strong>."
              : "This is a diagnostic email dispatched by the automated email delivery system of <strong>RateUrProfs</strong>."
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111; width: 35%;">
              TÊN MIỀN PHÁT HÀNH
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; font-weight: 700;">
              rateurprofs.site
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              HẠ TẦNG XỬ LÝ
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px;">
              Google Cloud Run & Cloud SQL PostgreSQL
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              THỜI ĐIỂM TẠO
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px;">
              ${new Date().toISOString()}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Giao diện email này áp dụng 100% hệ thống nhận diện Neo-Brutalist của website RateUrProfs với viền đen sắc nét, góc vuông tuyệt đối và màu đỏ thương hiệu đặc trưng."
            : "This email layout applies 100% of RateUrProfs's Neo-Brutalist website design tokens with sharp square geometry and signature editorial red accents.",
          "info"
        )}
        ${renderNeoButton(isVi ? "Truy cập Website" : "Visit Website", `${baseUrl}/${locale}`)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

This is a verified test email from RateUrProfs (rateurprofs.site).

Infrastructure: Google Cloud Run & Cloud SQL PostgreSQL
Timestamp: ${new Date().toISOString()}

---
RateUrProfs Platform (https://rateurprofs.site)
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: "Diagnostic Test",
          tagColor: EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 7. ACCOUNT LOCKED
    // -----------------------------------------------------------------------
    case "account_locked": {
      const title = isVi ? "Thông báo Khóa Tài khoản" : "Account Locked Notice";
      const subject = isVi
        ? "[RateUrProfs] Tài khoản của bạn đã bị tạm khóa và hướng dẫn gửi kháng nghị"
        : "[RateUrProfs] Notice of account suspension & appeal instructions";
      const lockedUrl = vars.lockedUrl || `${baseUrl}/${locale}/locked`;
      const lockReason = vars.reason || (isVi ? "Vi phạm Tiêu chuẩn Cộng đồng hoặc chính sách nội dung." : "Violation of community standards or content policy.");
      const lockedAt = vars.lockedAt ? new Date(vars.lockedAt).toLocaleString(isVi ? "vi-VN" : "en-US") : new Date().toLocaleString(isVi ? "vi-VN" : "en-US");

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Tài khoản của bạn (<strong>${escapeHtml(vars.email || "")}</strong>) đã bị tạm thời khóa quyền sử dụng các tính năng tương tác trên RateUrProfs.`
              : `Your account (<strong>${escapeHtml(vars.email || "")}</strong>) has been temporarily locked from interactive features on RateUrProfs.`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fee2e2; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "LÝ DO KHÓA" : "REASON"}
            </td>
            <td style="padding: 10px 14px; font-size: 13px; font-weight: 600; color: #b91c1c;">
              ${escapeHtml(lockReason)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "THỜI ĐIỂM KHÓA" : "TIMESTAMP"}
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px;">
              ${escapeHtml(lockedAt)}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Bạn vẫn có thể đăng nhập vào RateUrProfs. Khi đăng nhập, bạn sẽ được chuyển đến trang Khóa Tài khoản để theo dõi tình trạng và gửi đơn kháng nghị trực tiếp tới đội ngũ kiểm duyệt."
            : "You can still log into RateUrProfs. When logged in, you will be directed to the Locked Account page to review your status and submit an appeal to our moderation team.",
          "warning"
        )}
        ${renderNeoButton(isVi ? "Xem Chi tiết & Gửi Kháng nghị" : "View Details & Submit Appeal", lockedUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Tài khoản của bạn đã bị tạm khóa." : "Your account has been temporarily locked."}
${isVi ? "Lý do:" : "Reason:"} ${lockReason}
${isVi ? "Thời điểm:" : "Timestamp:"} ${lockedAt}

${isVi ? "Để gửi đơn kháng nghị, vui lòng truy cập:" : "To submit an appeal, please visit:"}
${lockedUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Thông báo Khóa Tài khoản" : "Account Suspended",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 8. ACCOUNT UNLOCKED
    // -----------------------------------------------------------------------
    case "account_unlocked": {
      const title = isVi ? "Tài khoản Đã Được Mở Khóa" : "Account Unlocked";
      const subject = isVi
        ? "[RateUrProfs] Tài khoản của bạn đã được mở khóa thành công"
        : "[RateUrProfs] Your account has been unlocked";
      const loginUrl = `${baseUrl}/${locale}`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Tài khoản của bạn (<strong>${escapeHtml(vars.email || "")}</strong>) đã được mở khóa thành công. Toàn bộ quyền truy cập và các bài đánh giá hợp lệ của bạn đã được khôi phục.`
              : `Your account (<strong>${escapeHtml(vars.email || "")}</strong>) has been successfully unlocked. All features and valid reviews have been restored.`
          }
        </p>
        ${renderNoticeBox(
          isVi
            ? "Cảm ơn bạn đã hợp tác cùng RateUrProfs duy trì môi trường đánh giá khách quan, văn minh và xây dựng."
            : "Thank you for cooperating with RateUrProfs in maintaining a respectful and constructive community.",
          "info"
        )}
        ${renderNeoButton(isVi ? "Truy cập RateUrProfs" : "Access RateUrProfs", loginUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Tài khoản của bạn đã được mở khóa thành công. Các bài đánh giá đã hiển thị trở lại." : "Your account has been unlocked. All valid reviews are now visible."}

${loginUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Tài khoản Được Phục hồi" : "Account Restored",
          tagColor: EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 9. APPEAL SUBMITTED
    // -----------------------------------------------------------------------
    case "appeal_submitted": {
      const title = isVi ? "Đã Tiếp Nhận Đơn Kháng Nghị" : "Appeal Received";
      const appealId = vars.appealId || "";
      const subject = isVi
        ? `[RateUrProfs] Tiếp nhận đơn kháng nghị tài khoản [${appealId}]`
        : `[RateUrProfs] Appeal received for account review [${appealId}]`;
      const appealUrl = `${baseUrl}/${locale}/locked`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Hệ thống kiểm duyệt RateUrProfs đã tiếp nhận đơn kháng nghị của bạn với mã tra cứu <strong>${escapeHtml(appealId)}</strong>.`
              : `The RateUrProfs moderation team has received your appeal under ticket <strong>${escapeHtml(appealId)}</strong>.`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "MÃ ĐƠN" : "APPEAL ID"}
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; font-weight: 700;">
              ${escapeHtml(appealId)}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "DANH MỤC" : "CATEGORY"}
            </td>
            <td style="padding: 10px 14px; font-size: 12px;">
              ${escapeHtml(vars.category || "General")}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "THỜI GIAN DỰ KIẾN" : "ESTIMATED REVIEW"}
            </td>
            <td style="padding: 10px 14px; font-size: 12px;">
              ${isVi ? "24 - 48 giờ làm việc" : "24 - 48 business hours"}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Quản trị viên sẽ tiến hành xem xét lịch sử hoạt động, nội dung giải trình và bằng chứng bổ sung của bạn trước khi đưa ra quyết định cuối cùng."
            : "An administrator will review your account history, explanation, and supporting evidence before reaching a final decision.",
          "info"
        )}
        ${renderNeoButton(isVi ? "Theo dõi Trạng thái Kháng nghị" : "Check Appeal Status", appealUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? `Đơn kháng nghị [${appealId}] đã được tiếp nhận thành công.` : `Your appeal [${appealId}] has been received.`}
${isVi ? "Danh mục:" : "Category:"} ${vars.category || "General"}
${isVi ? "Thời gian xử lý dự kiến: 24 - 48 giờ." : "Estimated review time: 24 - 48 hours."}

${appealUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Đã Tiếp Nhận Đơn" : "Appeal Ticket Created",
          tagColor: EMAIL_DESIGN_TOKENS.colors.blueAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 10. APPEAL ACCEPTED
    // -----------------------------------------------------------------------
    case "appeal_accepted": {
      const title = isVi ? "Kháng Nghị Đã Được Chấp Thuận" : "Appeal Approved";
      const appealId = vars.appealId || "";
      const subject = isVi
        ? `[RateUrProfs] Kháng nghị [${appealId}] được chấp thuận - Tài khoản đã mở khóa`
        : `[RateUrProfs] Appeal [${appealId}] approved - Account restored`;
      const loginUrl = `${baseUrl}/${locale}`;
      const decisionReason = vars.decisionReason || vars.adminNotes || (isVi ? "Giải trình hợp lệ và cam kết tuân thủ quy chế." : "Valid explanation and commitment to standards.");

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Ban Quản trị RateUrProfs đã hoàn tất xem xét đơn kháng nghị <strong>${escapeHtml(appealId)}</strong> và quyết định <strong>CHẤP THUẬN</strong> phục hồi tài khoản của bạn.`
              : `The RateUrProfs moderation team has reviewed appeal <strong>${escapeHtml(appealId)}</strong> and has <strong>APPROVED</strong> the restoration of your account.`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "PHẢN HỒI QUẢN TRỊ" : "ADMIN DECISION"}
            </td>
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 600;">
              ${escapeHtml(decisionReason)}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Tài khoản của bạn đã chuyển về trạng thái Hoạt động bình thường. Bạn có thể đăng nhập và tiếp tục sử dụng tất cả dịch vụ."
            : "Your account is now fully active. You can log in and resume using all features.",
          "info"
        )}
        ${renderNeoButton(isVi ? "Đăng nhập ngay" : "Log In Now", loginUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? `Đơn kháng nghị [${appealId}] của bạn đã được CHẤP THUẬN.` : `Your appeal [${appealId}] was APPROVED.`}
${isVi ? "Phản hồi quản trị:" : "Admin decision:"} ${decisionReason}

${isVi ? "Tài khoản của bạn đã được mở khóa:" : "Your account has been unlocked:"}
${loginUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Kháng Nghị Thành Công" : "Appeal Approved",
          tagColor: EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 11. APPEAL REJECTED
    // -----------------------------------------------------------------------
    case "appeal_rejected": {
      const title = isVi ? "Kết Quả Xem Xét Kháng Nghị" : "Appeal Decision Notice";
      const appealId = vars.appealId || "";
      const subject = isVi
        ? `[RateUrProfs] Quyết định về đơn kháng nghị tài khoản [${appealId}]`
        : `[RateUrProfs] Decision notice regarding appeal [${appealId}]`;
      const decisionReason = vars.decisionReason || vars.adminNotes || (isVi ? "Nội dung giải trình chưa đáp ứng tiêu chí xem xét hoặc vi phạm có tính chất nghiêm trọng." : "Explanation does not meet reconsideration criteria or violation is severe.");
      const lockedUrl = `${baseUrl}/${locale}/locked`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Ban Quản trị RateUrProfs đã hoàn tất xem xét đơn kháng nghị <strong>${escapeHtml(appealId)}</strong>. Sau khi đối chiếu nhật ký dữ liệu và quy định cộng đồng, chúng tôi quyết định <strong>DUY TRÌ KHÓA TÀI KHOẢN</strong>.`
              : `The RateUrProfs moderation team has concluded review of appeal <strong>${escapeHtml(appealId)}</strong>. Following policy evaluation, we have decided to <strong>UPHOLD THE ACCOUNT SUSPENSION</strong>.`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fee2e2; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "LÝ DO TỪ CHỐI" : "DECISION RATIONALE"}
            </td>
            <td style="padding: 10px 14px; font-size: 12px; font-weight: 600; color: #b91c1c;">
              ${escapeHtml(decisionReason)}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Quyết định này được đưa ra nhằm đảm bảo tính chính xác, văn minh và an toàn cho cộng đồng sinh viên RateUrProfs."
            : "This decision was reached to ensure reliability, respect, and safety across the RateUrProfs student community.",
          "alert"
        )}
        ${renderNeoButton(isVi ? "Xem lại Trang Khóa" : "Review Locked Account", lockedUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? `Đơn kháng nghị [${appealId}] đã bị TỪ CHỐI.` : `Appeal [${appealId}] was REJECTED.`}
${isVi ? "Lý do:" : "Decision rationale:"} ${decisionReason}

${lockedUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Quyết Định Kháng Nghị" : "Appeal Decision",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 12. ACCOUNT DELETION REQUESTED
    // -----------------------------------------------------------------------
    case "account_deletion_requested": {
      const title = isVi ? "Yêu Cầu Xóa Tài Khoản" : "Account Deletion Requested";
      const subject = isVi
        ? "[RateUrProfs] Xác nhận yêu cầu xóa tài khoản (Thời hạn ân hạn 14 ngày)"
        : "[RateUrProfs] Account deletion scheduled (14-day grace period)";
      const recoveryUrl = vars.recoveryUrl || `${baseUrl}/${locale}/account/recover?token=${vars.recoveryToken || ""}`;
      const scheduledDate = vars.scheduledAt ? new Date(vars.scheduledAt).toLocaleDateString(isVi ? "vi-VN" : "en-US") : "14 ngày nữa";

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Hệ thống vừa ghi nhận yêu cầu xóa tài khoản của bạn (<strong>${escapeHtml(vars.email || "")}</strong>).`
              : `We received a request to delete your account (<strong>${escapeHtml(vars.email || "")}</strong>).`
          }
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; border: 2px solid #111111; background: #ffffff;">
          <tr style="border-bottom: 1px solid #111111;">
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fee2e2; border-right: 1px solid #111111; width: 35%;">
              ${isVi ? "THỜI ĐIỂM XÓA DỰ KIẾN" : "SCHEDULED PURGE"}
            </td>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; font-weight: 700; color: #b91c1c;">
              ${escapeHtml(scheduledDate)}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; font-weight: 800; background: #fef9c3; border-right: 1px solid #111111;">
              ${isVi ? "TRẠNG THÁI NỘI DUNG" : "CONTENT STATUS"}
            </td>
            <td style="padding: 10px 14px; font-size: 12px;">
              ${isVi ? "Tạm ẩn toàn bộ bài đánh giá và ngắt kết nối phiên làm việc" : "All reviews hidden, active sessions terminated"}
            </td>
          </tr>
        </table>
        ${renderNoticeBox(
          isVi
            ? "Bạn có <strong>14 ngày ân hạn</strong> kể từ thời điểm gửi yêu cầu. Trong thời gian này, bạn có thể bấm nút bên dưới để hủy yêu cầu xóa và khôi phục tài khoản nguyên vẹn ngay lập tức."
            : "You have a <strong>14-day grace period</strong>. You can click the recovery link below at any time during this period to cancel deletion and restore your account immediately.",
          "warning"
        )}
        ${renderNeoButton(isVi ? "Hủy Xóa & Khôi phục Tài khoản" : "Cancel Deletion & Recover Account", recoveryUrl)}
        <p style="margin: 16px 0 6px; font-size: 12px; color: #52525b;">
          ${isVi ? "Liên kết khôi phục trực tiếp:" : "Direct recovery link:"}
        </p>
        <p style="margin: 0 0 16px; word-break: break-all; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; background: #f4f4f5; padding: 10px; border: 1px solid #111111;">
          <a href="${escapeHtml(recoveryUrl)}" style="color: #111111; text-decoration: underline;">${escapeHtml(recoveryUrl)}</a>
        </p>
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Yêu cầu xóa tài khoản của bạn đã được tiếp nhận." : "Account deletion request received."}
${isVi ? `Thời điểm dự kiến xóa vĩnh viễn: ${scheduledDate}` : `Scheduled permanent deletion: ${scheduledDate}`}

${isVi ? "Để hủy xóa và khôi phục tài khoản trong vòng 14 ngày, truy cập:" : "To cancel deletion within 14 days, visit:"}
${recoveryUrl}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Yêu Cầu Xóa Tài Khoản" : "Deletion Scheduled",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 13. ACCOUNT DELETED
    // -----------------------------------------------------------------------
    case "account_deleted": {
      const title = isVi ? "Tài Khoản Đã Xóa Vĩnh Viễn" : "Account Permanently Deleted";
      const subject = isVi
        ? "[RateUrProfs] Tài khoản của bạn đã hoàn tất xóa vĩnh viễn"
        : "[RateUrProfs] Your account has been permanently deleted";

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Kính gửi người dùng," : "Dear user,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Tài khoản của bạn (<strong>${escapeHtml(vars.email || "")}</strong>) và toàn bộ các bài đánh giá, dữ liệu liên kết đã được xóa vĩnh viễn khỏi hệ thống RateUrProfs.`
              : `Your account (<strong>${escapeHtml(vars.email || "")}</strong>) and all associated reviews and data have been permanently deleted from RateUrProfs.`
          }
        </p>
        ${renderNoticeBox(
          isVi
            ? "Thao tác này là không thể hoàn tác. Mọi bản ghi phiên làm việc và mã khôi phục trước đó đã bị vô hiệu hóa."
            : "This action is irreversible. All prior sessions and recovery tokens have been invalidated.",
          "info"
        )}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Tài khoản của bạn đã được xóa hoàn tất khỏi hệ thống RateUrProfs." : "Your account has been permanently deleted from RateUrProfs."}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Đã Xóa Vĩnh Viễn" : "Account Deleted",
          tagColor: EMAIL_DESIGN_TOKENS.colors.coralAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 14. ACCOUNT RECOVERED
    // -----------------------------------------------------------------------
    case "account_recovered": {
      const title = isVi ? "Khôi Phục Tài Khoản Thành Công" : "Account Successfully Recovered";
      const subject = isVi
        ? "[RateUrProfs] Hủy yêu cầu xóa thành công - Chào mừng bạn trở lại!"
        : "[RateUrProfs] Account deletion cancelled - Welcome back!";
      const homeUrl = `${baseUrl}/${locale}`;

      const contentHtml = `
        <p style="margin: 0 0 14px;">
          ${isVi ? "Chào mừng bạn trở lại," : "Welcome back,"}
        </p>
        <p style="margin: 0 0 14px;">
          ${
            isVi
              ? `Yêu cầu xóa tài khoản của bạn (<strong>${escapeHtml(vars.email || "")}</strong>) đã được hủy thành công. Toàn bộ bài đánh giá và hoạt động của bạn đã được khôi phục trạng thái hiển thị.`
              : `Your account deletion request for (<strong>${escapeHtml(vars.email || "")}</strong>) has been successfully cancelled. Your reviews and profile status are now restored.`
          }
        </p>
        ${renderNoticeBox(
          isVi
            ? "Cảm ơn bạn đã tiếp tục gắn bó với RateUrProfs. Bạn có thể đăng nhập bình thường và tiếp tục đóng góp cho cộng đồng."
            : "Thank you for staying with RateUrProfs. You can continue to use all features normally.",
          "info"
        )}
        ${renderNeoButton(isVi ? "Truy cập RateUrProfs" : "Visit RateUrProfs", homeUrl)}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================

${isVi ? "Yêu cầu xóa tài khoản đã được hủy thành công. Chào mừng bạn trở lại RateUrProfs!" : "Account deletion cancelled. Welcome back to RateUrProfs!"}

${homeUrl}

---
RateUrProfs Platform (${baseUrl})
`;

        return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Khôi Phục Thành Công" : "Account Restored",
          tagColor: EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 15. INBOUND AUTO REPLY (AI Support Assistant)
    // -----------------------------------------------------------------------
    case "inbound_auto_reply": {
      const originalSubject = vars.originalSubject || (isVi ? "Yêu cầu hỗ trợ" : "Support Request");
      const cleanOriginalSubject = String(originalSubject).replace(/^(re:\s*)+/i, "");
      const title = isVi ? "Phản Hồi Hỗ Trợ Tự Động" : "Automated Support Response";
      const subject = `Re: ${cleanOriginalSubject}`;
      const ticketId = vars.ticketId ? escapeHtml(String(vars.ticketId)) : undefined;
      const senderName = vars.senderName ? escapeHtml(String(vars.senderName)) : "";
      const replyHtml = vars.replyHtml || `<p>${isVi ? "Cảm ơn bạn đã liên hệ RateUrProfs." : "Thank you for reaching out to RateUrProfs."}</p>`;

      const contentHtml = `
        ${
          ticketId
            ? `<div style="margin-bottom: 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; color: ${EMAIL_DESIGN_TOKENS.colors.textMuted};">
                <strong>${isVi ? "MÃ YÊU CẦU:" : "TICKET ID:"}</strong> [${ticketId}]
               </div>`
            : ""
        }
        <div style="margin-bottom: 16px; padding: 12px 14px; background-color: ${EMAIL_DESIGN_TOKENS.colors.bgPage}; border: 1.5px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; color: ${EMAIL_DESIGN_TOKENS.colors.textMuted};">
          <strong>${isVi ? "TIÊU ĐỀ GỐC:" : "ORIGINAL SUBJECT:"}</strong> ${escapeHtml(cleanOriginalSubject)}
        </div>

        <p style="margin: 0 0 14px; font-size: 15px; font-weight: 700;">
          ${senderName ? (isVi ? `Chào ${senderName},` : `Hello ${senderName},`) : (isVi ? "Chào bạn," : "Hello,")}
        </p>

        <div style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: ${EMAIL_DESIGN_TOKENS.colors.textPrimary};">
          ${replyHtml}
        </div>

        ${renderNoticeBox(
          isVi
            ? "Thư này được phản hồi tự động bởi Trợ lý AI RateUrProfs. Bạn có thể tiếp tục phản hồi email này nếu cần hỗ trợ thêm từ quản trị viên."
            : "This message was automatically answered by the RateUrProfs AI Assistant. You can reply directly to this thread if you require human support.",
          "info"
        )}
      `;

      const plainTextReply = String(replyHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const text = `
RateUrProfs — ${title}
=====================================================
${ticketId ? `[TICKET: ${ticketId}]\n` : ""}
V/v: ${cleanOriginalSubject}

${senderName ? `${senderName},` : ""}

${plainTextReply}

-----------------------------------------------------
${
  isVi
    ? "Thư phản hồi tự động bởi Trợ lý AI RateUrProfs. Phản hồi email này nếu cần gặp quản trị viên."
    : "Automated response by RateUrProfs AI Assistant. Reply to this email if you need human support."
}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Trợ Lý AI" : "AI Assistant",
          tagColor: EMAIL_DESIGN_TOKENS.colors.blueAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }

    // -----------------------------------------------------------------------
    // 16. INBOUND HUMAN REPLY (Staff Response)
    // -----------------------------------------------------------------------
    case "inbound_human_reply": {
      const originalSubject = vars.originalSubject || (isVi ? "Yêu cầu hỗ trợ" : "Support Request");
      const cleanOriginalSubject = String(originalSubject).replace(/^(re:\s*)+/i, "");
      const mailbox = vars.mailbox || "support";
      const title =
        mailbox === "security"
          ? (isVi ? "Phản Hồi An Ninh" : "Security Team Response")
          : mailbox === "admin"
          ? (isVi ? "Phản Hồi Ban Quản Trị" : "Admin Official Response")
          : (isVi ? "Phản Hồi Đội Ngũ Hỗ Trợ" : "Support Team Response");
      const ticketId = vars.ticketId ? escapeHtml(String(vars.ticketId)) : undefined;
      const subject = `Re: [${vars.ticketId || "RUP"}] ${cleanOriginalSubject}`;
      const responderName = vars.responderName
        ? escapeHtml(String(vars.responderName))
        : (isVi ? "Đội ngũ Quản trị" : "RateUrProfs Team");
      const replyText = vars.replyText || "";
      const replyHtml = escapeHtml(replyText).replace(/\n/g, "<br>");

      const contentHtml = `
        ${
          ticketId
            ? `<div style="margin-bottom: 14px; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 11px; color: ${EMAIL_DESIGN_TOKENS.colors.textMuted};">
                <strong>${isVi ? "MÃ HỒ SƠ:" : "CASE ID:"}</strong> [${ticketId}]
               </div>`
            : ""
        }
        <div style="margin-bottom: 16px; padding: 12px 14px; background-color: ${EMAIL_DESIGN_TOKENS.colors.bgPage}; border: 1.5px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; font-family: ${EMAIL_DESIGN_TOKENS.typography.fontMono}; font-size: 12px; color: ${EMAIL_DESIGN_TOKENS.colors.textMuted};">
          <strong>${isVi ? "TIÊU ĐỀ:" : "SUBJECT:"}</strong> ${escapeHtml(cleanOriginalSubject)}
        </div>

        <div style="margin-bottom: 16px; padding: 10px 12px; background-color: #f0fdf4; border: 1.5px solid ${EMAIL_DESIGN_TOKENS.colors.borderBlack}; font-size: 12px; font-weight: 700;">
          ${isVi ? "Người phụ trách phản hồi:" : "Responded by:"} ${responderName}
        </div>

        <div style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: ${EMAIL_DESIGN_TOKENS.colors.textPrimary};">
          ${replyHtml}
        </div>

        ${renderNoticeBox(
          isVi
            ? "Thư này được phản hồi trực tiếp bởi thành viên đội ngũ RateUrProfs. Bạn có thể tiếp tục phản hồi email này nếu cần hỗ trợ thêm."
            : "This message was sent directly by a team member at RateUrProfs. You may reply directly to this email if you have further inquiries.",
          "info"
        )}
      `;

      const text = `
RateUrProfs — ${title}
=====================================================
${ticketId ? `[CASE ID: ${ticketId}]\n` : ""}
V/v: ${cleanOriginalSubject}
${isVi ? "Người phụ trách:" : "Responded by:"} ${responderName}

${replyText}

-----------------------------------------------------
${
  isVi
    ? "Thư phản hồi trực tiếp từ đội ngũ RateUrProfs."
    : "Direct response from the RateUrProfs Team."
}

---
RateUrProfs Platform (${baseUrl})
`;

      return {
        subject: sanitizeHeaderField(subject),
        html: renderBaseLayout({
          title,
          eyebrowTag: isVi ? "Phản Hồi Trực Tiếp" : "Official Response",
          tagColor:
            mailbox === "security"
              ? EMAIL_DESIGN_TOKENS.colors.coralAccent
              : EMAIL_DESIGN_TOKENS.colors.yellowAccent,
          contentHtml,
          locale,
        }),
        text: text.trim(),
      };
    }
  }
}

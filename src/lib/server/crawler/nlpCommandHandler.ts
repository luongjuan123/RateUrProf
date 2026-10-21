/**
 * Natural Language Command Translator for Crawl Operations
 *
 * Interprets administrative prompts in Vietnamese and English, resolves target
 * universities from the registry, and executes corresponding crawler actions.
 */

import { UniversityRegistryService } from "./registry";
import { CampaignManager, CrawlCampaign } from "./campaignManager";
import { CoverageAuditService, NationwideCoverageReport } from "./coverageAudit";
import { CrawlerWorker } from "./worker";
import { removeDiacritics } from "./normalization";

export interface CommandExecutionResult {
  understood: boolean;
  intent: "crawl_nationwide" | "crawl_institution" | "audit_coverage" | "resume_worker" | "export_report" | "unknown";
  feedbackMessage: string;
  data?: {
    campaign?: CrawlCampaign;
    audit?: NationwideCoverageReport;
    workerTick?: { processedCount: number; succeededCount: number };
  };
}

export class NlpCommandHandler {
  /**
   * Processes a natural language command
   */
  public static async executeCommand(command: string): Promise<CommandExecutionResult> {
    const raw = (command || "").trim();
    const normalized = removeDiacritics(raw);

    if (!raw) {
      return {
        understood: false,
        intent: "unknown",
        feedbackMessage: "Vui lòng nhập lệnh thu thập dữ liệu (ví dụ: 'Thu thập toàn quốc' hoặc 'Cập nhật giảng viên ĐH Bách Khoa').",
      };
    }

    // 1. Audit Coverage Intent
    if (
      normalized.includes("kiem tra do phu") ||
      normalized.includes("audit") ||
      normalized.includes("bao cao") ||
      normalized.includes("coverage") ||
      normalized.includes("thong ke do phu")
    ) {
      const audit = await CoverageAuditService.runNationwideAudit();
      return {
        understood: true,
        intent: "audit_coverage",
        feedbackMessage: `Đã hoàn tất kiểm tra độ phủ toàn quốc: ${audit.nationwideCoveragePercentage}% (${audit.completeInstitutions} trường hoàn chỉnh, ${audit.partialInstitutions} trường một phần, ${audit.inaccessibleInstitutions} trường không thể truy cập). Tổng cộng ${audit.totalValidatedNationwide} giảng viên đã xác thực.`,
        data: { audit },
      };
    }

    // 2. Resume / Trigger Worker Intent
    if (
      normalized.includes("tiep tuc") ||
      normalized.includes("resume") ||
      normalized.includes("chay worker") ||
      normalized.includes("tick") ||
      normalized.includes("xu ly job")
    ) {
      // Trigger tick asynchronously in background
      CrawlerWorker.tick(2).catch(() => {});
      return {
        understood: true,
        intent: "resume_worker",
        feedbackMessage: "Đã kích hoạt worker tiếp tục xử lý hàng đợi tác vụ.",
      };
    }

    // 3. Nationwide Crawl Intent
    if (
      normalized.includes("toan quoc") ||
      normalized.includes("tat ca") ||
      normalized.includes("nationwide") ||
      normalized.includes("all universities") ||
      normalized.includes("crawl all") ||
      normalized.includes("thu thap toan bo")
    ) {
      const campaign = await CampaignManager.createCampaign({
        name: `Nationwide University Crawl (${new Date().toLocaleDateString("vi-VN")})`,
        scope: "nationwide",
      });
      await CampaignManager.startCampaign(campaign.id);

      return {
        understood: true,
        intent: "crawl_nationwide",
        feedbackMessage: `Đã khởi tạo chiến dịch cào TOÀN QUỐC cho ${campaign.totalInstitutions} trường đại học với mã chiến dịch ${campaign.id}.`,
        data: { campaign },
      };
    }

    // 4. Institution-specific Crawl Intent
    const institutions = await UniversityRegistryService.getAllInstitutions();
    let matchedInstitution = null;

    for (const inst of institutions) {
      const normName = removeDiacritics(inst.name);
      const normShort = removeDiacritics(inst.shortName);
      const normId = removeDiacritics(inst.id);

      const hasShortWord = new RegExp(`\\b${normShort}\\b`, "i").test(normalized);
      const hasIdWord = new RegExp(`\\b${normId}\\b`, "i").test(normalized);
      const hasFullName = normName.length > 5 && normalized.includes(normName);

      if (hasShortWord || hasIdWord || hasFullName) {
        matchedInstitution = inst;
        break;
      }
    }

    if (matchedInstitution) {
      const campaign = await CampaignManager.createCampaign({
        name: `Crawl ${matchedInstitution.shortName} (${new Date().toLocaleDateString("vi-VN")})`,
        scope: "institution",
        institutionId: matchedInstitution.id,
      });
      await CampaignManager.startCampaign(campaign.id);

      return {
        understood: true,
        intent: "crawl_institution",
        feedbackMessage: `Đã khởi tạo chiến dịch cào cho ${matchedInstitution.name} (${matchedInstitution.shortName}) với mã chiến dịch ${campaign.id}.`,
        data: { campaign },
      };
    }

    // 5. Unknown
    return {
      understood: false,
      intent: "unknown",
      feedbackMessage: `Không nhận diện được lệnh: "${raw}". Bạn có thể thử: "Thu thập toàn quốc", "Thu thập giảng viên FPT", hoặc "Kiểm tra độ phủ".`,
    };
  }
}

import type { DownloadedAttachment } from "./lcam";
import type { Env } from "./types/env";
import { match } from "ts-pattern";
import { sendDiscordAlert, sendDiscordWebhook } from "./discord";
import { fetchLcamAttachments } from "./lcam";
import { extractContent, parseEmail, removeFooter } from "./parser";

export { extractContent, fetchLcamAttachments, parseEmail, removeFooter, sendDiscordAlert, sendDiscordWebhook };

export type ProcessEmailResult = {
  title: string;
  category: string;
  hasAttachment: boolean;
  attachmentFailed: boolean;
  downloadedAttachments: string[];
  discordStatus: number;
  errorDetail?: string;
};

/**
 * メール本文から通知をパースし、必要に応じて添付ファイルを取得して Discord Webhook へ送信する
 */
export async function processEmail(
  text: string,
  env: Env,
  receivedDateTime?: string | Date,
): Promise<ProcessEmailResult> {
  const parsed = parseEmail(text);
  const now = receivedDateTime != null && receivedDateTime !== ""
    ? new Date(receivedDateTime)
    : new Date();
  const isStg = env.MODE === "stg";

  const {
    WEBHOOK_DISCORD_PUBLIC_0: pub,
    WEBHOOK_DISCORD_PRIVATE_0: priv,
    LCAM_USER_ID: userId,
    LCAM_APP_TOKEN: appToken,
  } = env;

  const { webhookUrl, notification } = match(parsed.category)
    .with("学内連絡", () => ({
      webhookUrl: pub,
      notification: parsed,
    }))
    .otherwise(() => ({
      webhookUrl: priv,
      notification: { ...parsed, title: `! Received otherwise ! - ${parsed.title}` },
    }));

  let attachments: DownloadedAttachment[] = [];
  let attachmentFailed = false;
  let errorDetail: string | undefined;

  if (parsed.etc.hasAttachment === true) {
    try {
      attachments = await fetchLcamAttachments(parsed, { userId, appToken });
      if (attachments.length === 0) {
        attachmentFailed = true;
        errorDetail = "attachments array is empty (no items matched)";
      }
    } catch (e) {
      console.error("Failed to fetch L-Cam attachments:", e);
      attachmentFailed = true;
      errorDetail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }
  }

  const notificationToSend = attachmentFailed
    ? {
        ...notification,
        etc: {
          ...notification.etc,
          attachmentFailed: true,
        },
      }
    : notification;

  const res = await sendDiscordWebhook(notificationToSend, now, webhookUrl, attachments, isStg);
  if (!res.ok) {
    console.error(`Failed to send Discord webhook: ${res.status} ${res.statusText}`);
  }

  // 添付ファイル取得失敗時はさらに WEBHOOK_DISCORD_PRIVATE_0 に通知
  if (attachmentFailed && priv !== "") {
    try {
      await sendDiscordAlert(
        priv,
        `⚠️ **【L-Cam 添付ファイル取得失敗】**\n「${notification.title}」(${notification.category}) の添付ファイルの自動取得に失敗しました。\nトークンの期限切れ等の可能性があります。scripts/get-token.ts による再発行を確認してください。`,
      );
    } catch (e) {
      console.error("Failed to send Discord failure alert:", e);
    }
  }

  return {
    title: parsed.title,
    category: parsed.category,
    hasAttachment: parsed.etc.hasAttachment === true,
    attachmentFailed,
    downloadedAttachments: attachments.map((a) => a.filename),
    discordStatus: res.status,
    errorDetail,
  };
}

import type { Address } from "postal-mime";
import type { DownloadedAttachment } from "./lib/lcam";
import type { Env } from "./lib/types/env";
import PostalMime from "postal-mime";
import { match } from "ts-pattern";
import { sendDiscordAlert, sendDiscordWebhook } from "./lib/discord";
import { fetchLcamAttachments } from "./lib/lcam";
import { extractContent, parseEmail, removeFooter } from "./lib/parser";

export { extractContent, fetchLcamAttachments, parseEmail, removeFooter, sendDiscordAlert, sendDiscordWebhook };

export type ProcessEmailResult = {
  title: string;
  category: string;
  hasAttachment: boolean;
  attachmentFailed: boolean;
  downloadedAttachments: string[];
  discordStatus: number;
};

/**
 * メール本文から通知をパースし、必要に応じて添付ファイルを取得して Discord Webhook へ送信する
 */
export async function processEmail(
  text: string,
  from: Address | undefined,
  env: Env,
  now = new Date(),
): Promise<ProcessEmailResult> {
  const parsed = parseEmail(text);

  const {
    WEBHOOK_DISCORD_PUBLIC_0: pub,
    WEBHOOK_DISCORD_PRIVATE_0: priv,
    MELLON_COOKIE: mellon,
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

  if (parsed.etc.hasAttachment === true) {
    try {
      attachments = await fetchLcamAttachments(parsed, { mellon });
      if (attachments.length === 0) {
        attachmentFailed = true;
      }
    } catch (e) {
      console.error("Failed to fetch L-Cam attachments:", e);
      attachmentFailed = true;
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

  const res = await sendDiscordWebhook(notificationToSend, from, now, webhookUrl, attachments);
  if (!res.ok) {
    console.error(`Failed to send Discord webhook: ${res.status} ${res.statusText}`);
  }

  // 添付ファイル取得失敗時はさらに WEBHOOK_DISCORD_PRIVATE_0 に通知
  if (attachmentFailed && priv !== "") {
    try {
      await sendDiscordAlert(
        priv,
        `⚠️ **【L-Cam 添付ファイル取得失敗】**\n「${notification.title}」(${notification.category}) の添付ファイルの自動取得に失敗しました。\nMELLON_COOKIE のセッション切れ等の可能性があります。Cookie の再設定を確認してください。`,
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
  };
}

const email: EmailExportedHandler<Env> = async (message, env, _ctx) => {
  const now = new Date();
  const { from, text } = await PostalMime.parse(message.raw);
  await processEmail(text ?? "", from, env, now);
};

const fetch: ExportedHandlerFetchHandler<Env> = async (request, env, _ctx) => {
  if (request.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", message: "L-Cam Piggyback Worker is running" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as
        | { text: string; from?: Address }
        | Array<{ text: string; from?: Address }>;

      if (Array.isArray(body)) {
        const results: ProcessEmailResult[] = [];
        for (const item of body) {
          const res = await processEmail(item.text, item.from, env);
          results.push(res);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return new Response(JSON.stringify({ success: true, count: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const res = await processEmail(body.text, body.from, env);
      return new Response(JSON.stringify({ success: true, result: res }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const text = await request.text();
    const res = await processEmail(text, undefined, env);
    return new Response(JSON.stringify({ success: true, result: res }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export default { email, fetch };

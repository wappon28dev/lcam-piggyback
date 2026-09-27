import type { DownloadedAttachment } from "./lcam";
import type { NotificationInfo } from "./types/notification";
import { match, P } from "ts-pattern";

const MAX_DESCRIPTION_LENGTH = 4000;

function truncate(text: string, maxLength: number): string {
  return match(text.length <= maxLength)
    .with(true, () => text)
    .otherwise(() => `${text.slice(0, maxLength - 15)}\n... (省略)`);
}

export async function sendDiscordWebhook(
  info: NotificationInfo,
  acceptDate: Date,
  url: string,
  attachments?: DownloadedAttachment[],
  isStg?: boolean,
): Promise<Response> {
  const unixTime = Math.floor(acceptDate.getTime() / 1000);
  const title = isStg === true ? `[stg] ${info.title}` : info.title;

  const attachmentText = match([info.etc.hasAttachment === true, info.etc.attachmentFailed === true])
    .with([true, true], () => "添付ファイルあり (取得失敗)")
    .with([true, false], () => "添付ファイルあり")
    .otherwise(() => null);

  const infoDetails = [attachmentText, info.etc.hasGarbled === true ? "通知内容が壊れているかも？" : null]
    .filter((v): v is string => v != null)
    .join(" | ");

  const infoFields = match(infoDetails)
    .with(P.string.minLength(1), (val) => [{ name: "情報", value: val }])
    .otherwise(() => []);

  const body = {
    content: null,
    embeds: [
      {
        title,
        description: truncate(info.content, MAX_DESCRIPTION_LENGTH),
        color: 14293625,
        fields: [
          {
            name: "通知カテゴリー",
            value: info.category,
          },
          {
            name: "通知種別",
            value: info.kind,
          },
          ...infoFields,
          {
            name: "受信日時",
            value: `<t:${unixTime}:F>･<t:${unixTime}:R>`,
          },
          {
            name: "リンク",
            value: "[L-Cam ↗︎](https://lcam.aitech.ac.jp/portalv2/)",
          },
        ],
      },
    ],
    attachments: [],
  };

  if (!url || url.trim() === "") {
    console.error("Discord webhook URL is empty, skipping sending");
    return new Response("Discord webhook URL is not configured", { status: 500 });
  }

  if (attachments != null && attachments.length > 0) {
    const formData = new FormData();
    const payload = {
      ...body,
      attachments: attachments.map((att, idx) => ({
        id: idx,
        filename: att.filename,
      })),
    };
    formData.append("payload_json", JSON.stringify(payload));
    attachments.forEach((att, idx) => {
      formData.append(`files[${idx}]`, new Blob([att.data]), att.filename);
    });

    return await fetch(url, {
      method: "POST",
      body: formData,
    });
  }

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/**
 * 添付ファイル取得失敗などの重大アラートを Discord Webhook へ送信する
 */
export async function sendDiscordAlert(url: string, message: string): Promise<Response> {
  if (!url || url.trim() === "") {
    console.error("Discord alert webhook URL is empty, skipping sending");
    return new Response("Discord alert webhook URL is not configured", { status: 500 });
  }

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: message,
    }),
  });
}

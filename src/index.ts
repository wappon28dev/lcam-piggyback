import PostalMime, { Address } from "postal-mime";
import { NotificationInfo } from "./lib/types/notification";
import { Env } from "./lib/types/env";
import { match } from "ts-pattern";

function extractContent(text: string) {
  const contentStart = text.indexOf("[連絡内容]") + "[連絡内容]\n".length;
  const contentEnd = text.indexOf(
    "----------------------------------------",
    contentStart,
  );
  return text.slice(contentStart, contentEnd).trim();
}

function parseEmail(body: string): NotificationInfo {
  const category = body
    .match(/◆「(.+?)」が登録されました。/)?.[1]
    .trim() as NotificationInfo["category"];

  const kind = body.match(/\[連絡種別\]\s*(.*)/)?.[1].trim();
  const title = body.match(/\[連絡タイトル\]\s*(.*)/)?.[1].trim();
  const content = extractContent(body);
  const hasAttachment =
    body.match(/■(xxxxxxxx)/)?.[1].trim() !=
    "■ファイルが添付してあります。L-Camにて確認してください。";
  const hasGarbled = body.includes("?") || body.includes("�");

  return {
    category: category ?? "<不明>",
    kind: kind ?? "<不明>",
    title: title ?? "<不明>",
    content: content ?? "<不明>",
    etc: {
      hasAttachment,
      hasGarbled,
    },
  };
}

async function sendDiscordWebhook(
  info: NotificationInfo,
  from: Address,
  acceptDate: Date,
  url: string,
): Promise<Response> {
  const unixTime = Math.floor(acceptDate.getTime() / 1000);
  const body = {
    content: null,
    embeds: [
      {
        title: info.title,
        description: info.content,
        color: 14293625,
        footer: {
          text: `from: ${from.address} | ${from.name}`,
        },
        fields: [
          {
            name: "通知カテゴリー",
            value: info.category,
          },
          {
            name: "通知種別",
            value: info.kind,
          },
          {
            name: "情報",
            value: [
              info.etc.hasAttachment ? "添付ファイルあり" : undefined,
              info.etc.hasGarbled ? "通知内容が壊れているかも？" : undefined,
            ].join(" | "),
          },
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

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const email: EmailExportedHandler<Env> = async (message, env, ctx) => {
  const now = new Date();

  const { from, text } = await PostalMime.parse(message.raw);
  const email = parseEmail(text ?? "");
  const { WEBHOOK_DISCORD_PUBLIC_0: pub, WEBHOOK_DISCORD_PRIVATE_0: priv } =
    env;

  match(email.category)
    .with("学内連絡", async () => {
      await sendDiscordWebhook(email, from, now, pub);
    })
    .otherwise(async () => {
      await sendDiscordWebhook(
        { ...email, title: `! Received otherwise ! - ${email.title}` },
        from,
        now,
        priv,
      );
    });
};

export default { email };

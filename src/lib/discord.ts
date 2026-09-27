import type { Address } from "postal-mime";
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
  from: Address | undefined,
  acceptDate: Date,
  url: string,
): Promise<Response> {
  const unixTime = Math.floor(acceptDate.getTime() / 1000);

  const fromText = match({ address: from?.address, name: from?.name })
    .with({ address: P.string, name: P.string.minLength(1) }, ({ address, name }) => `from: ${address} | ${name}`)
    .with({ address: P.string }, ({ address }) => `from: ${address}`)
    .with({ name: P.string.minLength(1) }, ({ name }) => `from: ${name}`)
    .otherwise(() => "from: <不明>");

  const infoDetails = match([info.etc.hasAttachment === true, info.etc.hasGarbled === true])
    .with([true, true], () => "添付ファイルあり | 通知内容が壊れているかも？")
    .with([true, false], () => "添付ファイルあり")
    .with([false, true], () => "通知内容が壊れているかも？")
    .otherwise(() => "");

  const infoFields = match(infoDetails)
    .with(P.string.minLength(1), (val) => [{ name: "情報", value: val }])
    .otherwise(() => []);

  const body = {
    content: null,
    embeds: [
      {
        title: info.title,
        description: truncate(info.content, MAX_DESCRIPTION_LENGTH),
        color: 14293625,
        footer: {
          text: fromText,
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

  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

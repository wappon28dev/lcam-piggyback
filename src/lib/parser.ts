import type { NotificationCategory, NotificationInfo } from "./types/notification";
import { match, P } from "ts-pattern";
import { NOTIFICATION_CATEGORIES } from "./types/notification";

const SYSTEM_FOOTER_REGEX = /\n[-ー]{10,}\s*\n(?:■[^\n]+(?:\n|$))+$/;
const CONTENT_MARKER_REGEX = /\[(?:連絡内容|内容|伝達事項)\][ \t]*\r?\n?/;
const ATTACHMENT_MARKER = "■ファイルが添付してあります。L-Camにて確認してください。";

export function removeFooter(text: string): string {
  return text.replace(SYSTEM_FOOTER_REGEX, "");
}

export function extractCategory(normalized: string): NotificationCategory {
  const catMatch = normalized.match(/◆「?([^」\n]+)」?が(?:登録|更新|通知)されました/);
  const rawCat = catMatch?.[1]?.trim();

  return match(rawCat)
    .with(P.string, (cat) => NOTIFICATION_CATEGORIES.find((c) => cat.startsWith(c) || cat === c) ?? "<不明>")
    .otherwise(() => "<不明>");
}

export function extractKind(normalized: string, category: NotificationCategory): string {
  const kindMatch = normalized.match(/\[連絡種別\][ \t]*(.*)/);
  const rawKind = kindMatch?.[1]?.trim();
  const isRegistration = normalized.includes("履修情報") || normalized.includes("履修登録");

  return match({ rawKind, category, isRegistration })
    .with({ rawKind: P.string.minLength(1) }, ({ rawKind: k }) => k)
    .with({ category: "レポート" }, () => "レポート")
    .with({ category: "学内アンケート" }, () => "学内アンケート")
    .with({ category: "授業評価アンケート" }, () => "授業評価アンケート")
    .with({ category: "授業アンケート" }, () => "授業アンケート")
    .with({ isRegistration: true }, () => "履修登録")
    .otherwise(() => "<不明>");
}

export function extractTitle(normalized: string, kind: string): string {
  const titleMatch = normalized.match(
    /\[(?:連絡タイトル|レポートタイトル|学内アンケートタイトル|授業評価アンケートタイトル|タイトル)\][ \t]*(.*)/,
  );
  const rawTitle = titleMatch?.[1]?.trim();
  const isCanceledClass = kind === "休講" || normalized.includes("[休講日]");
  const isRegistration = normalized.includes("履修情報") || normalized.includes("履修登録");

  return match({ rawTitle, isCanceledClass, isRegistration })
    .with({ rawTitle: P.string.minLength(1) }, ({ rawTitle: t }) => t)
    .with({ isCanceledClass: true }, () => {
      const subjectMatch = normalized.match(/\[授業科目（クラス）・時限\][ \t]*([^\n]+)/);
      const subject = subjectMatch?.[1]?.trim();
      return match(subject)
        .with(P.string.minLength(1), (s) => `休講のお知らせ（${s}）`)
        .otherwise(() => "休講のお知らせ");
    })
    .with({ isRegistration: true }, () => "履修登録内容")
    .otherwise(() => "<不明>");
}

export function extractContent(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n");
  const bodyWithoutFooter = removeFooter(normalized);
  const contentMarkerMatch = bodyWithoutFooter.match(CONTENT_MARKER_REGEX);
  const isRegistration = normalized.includes("履修情報") || normalized.includes("履修登録");

  return match({ markerIndex: contentMarkerMatch?.index, isRegistration })
    .with({ markerIndex: P.number }, ({ markerIndex }) =>
      bodyWithoutFooter.slice(markerIndex + (contentMarkerMatch?.[0].length ?? 0)).trim())
    .with({ isRegistration: true }, () => bodyWithoutFooter.trim())
    .otherwise(() => "<不明>");
}

export function parseEmail(body: string): NotificationInfo {
  const normalized = body.replace(/\r\n/g, "\n");

  const category = extractCategory(normalized);
  const kind = extractKind(normalized, category);
  const title = extractTitle(normalized, kind);
  const content = extractContent(normalized);

  const hasAttachment = normalized.includes(ATTACHMENT_MARKER);
  const hasGarbled = normalized.includes("\uFFFD");

  return {
    category,
    kind,
    title,
    content,
    etc: {
      hasAttachment,
      hasGarbled,
    },
  };
}

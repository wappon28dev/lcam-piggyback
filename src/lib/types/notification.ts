import type { ArrayElement } from "type-fest";

export const NOTIFICATION_CATEGORIES = [
  "学内連絡",
  "授業連絡",
  "レポート",
  "学内アンケート",
  "授業アンケート",
  "授業評価アンケート",
  "オフィスアワー",
] as const;

export type NotificationCategory = ArrayElement<typeof NOTIFICATION_CATEGORIES> | "<不明>";

export type NotificationInfo = {
  category: NotificationCategory;
  kind: string;
  title: string;
  content: string;
  etc: {
    hasAttachment?: boolean;
    hasGarbled?: boolean;
    attachmentFailed?: boolean;
  };
};

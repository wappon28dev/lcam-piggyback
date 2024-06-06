export type NotificationInfo = {
  category:
    | "学内連絡"
    | "授業連絡"
    | "レポート"
    | "学内アンケート"
    | "授業アンケート"
    | "授業評価アンケート"
    | "オフィスアワー"
    | "<不明>";
  kind: string;
  title: string;
  content: string;
  etc: {
    hasAttachment?: boolean;
    hasGarbled?: boolean;
  };
};

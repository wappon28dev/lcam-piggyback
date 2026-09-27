import { describe, expect, it } from "bun:test";
import { extractContent, parseEmail, removeFooter } from "@/lib/parser";

describe("parseEmail", () => {
  describe("学友会からの連絡（ハイフン区切り線を含むメール）", () => {
    it("本文内の区切り線（------------------------------------）で途切れず最後まで抽出できること", () => {
      const emailText = `◆「学内連絡」が登録されました。 
---------------------------------------- 
[連絡種別] 通知
[連絡タイトル] 秋の大遊戯祭 開催決定！｜学友会からのお知らせ
[連絡内容]
学部生各位
 
学友会からのお知らせです。
-----------------------------------------
 
こんにちは。
学友会八草執行委員会です。

学生間交流を目的として、「秋の大遊戯祭」を9月28日（月）に開催します！  

イベントでは、
・ゲーム交流会（優勝チームにはQUOカード3,000円分をプレゼント！）
・ビンゴ大会（豪華景品が当たるかも！？）
を予定しています！

参加方法や詳細については、後日あらためてL-Camや学友会公式SNSにてお知らせします。

ぜひお楽しみに！
  
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("学内連絡");
      expect(result.kind).toBe("通知");
      expect(result.title).toBe("秋の大遊戯祭 開催決定！｜学友会からのお知らせ");
      expect(result.etc.hasAttachment).toBe(false);
      expect(result.etc.hasGarbled).toBe(false);

      // 本文が途切れていないことの検証
      expect(result.content).toContain("学友会からのお知らせです。");
      expect(result.content).toContain("-----------------------------------------");
      expect(result.content).toContain("ぜひお楽しみに！");
      // システムフッターは含まれていないこと
      expect(result.content).not.toContain("■このメールは送信専用です");
    });

    it("36個のハイフン区切り線（------------------------------------）を含むメールも正しく抽出できること", () => {
      const emailText = `◆「学内連絡」が登録されました。 
---------------------------------------- 
[連絡種別] 通知
[連絡タイトル] QUOカードPayが当たるかも?学友会ポストキャンペーン｜学友会からのお知らせ
[連絡内容]
学生の皆さん
 
学友会からのお知らせです。
------------------------------------
こんにちは。 
学友会八草執行委員会です。

12月1日（月）～12月12日（金）の期間に学友会ポストキャンペーンを開催します。
期間中に意見をポストしてくれた方から抽選で10名にQUOカードPay1000円分をプレゼントします！

この期間中にぜひ意見をポストしてください！！
詳細は参考URLまたはビラ内のQRコードをご確認ください！

[参考URL]
https://x.com/example_post
https://www.instagram.com/example_sns 
----------------------------------------
■ファイルが添付してあります。L-Camにて確認してください。
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("学内連絡");
      expect(result.kind).toBe("通知");
      expect(result.title).toBe("QUOカードPayが当たるかも?学友会ポストキャンペーン｜学友会からのお知らせ");
      expect(result.etc.hasAttachment).toBe(true);
      expect(result.etc.hasGarbled).toBe(false);
      expect(result.content).toContain("学友会からのお知らせです。");
      expect(result.content).toContain("https://www.instagram.com/example_sns");
      expect(result.content).not.toContain("■ファイルが添付してあります");
    });
  });

  describe("レポート連絡", () => {
    it("[レポートタイトル] と [内容] から正しく抽出できること", () => {
      const emailText = `◆「レポート」が登録されました。\x20
----------------------- 
[授業科目]\u3000キャリア開発論
[クラス]\u300021
[レポートタイトル] 第９回振り返りシート
[提出期間] 2025/11/24 14:05 - 2025/11/25 22:00 
[内容]
本日の授業内に行った振り返りシートの提出はこちらでお願いします。
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("レポート");
      expect(result.kind).toBe("レポート");
      expect(result.title).toBe("第９回振り返りシート");
      expect(result.content).toBe("本日の授業内に行った振り返りシートの提出はこちらでお願いします。");
    });
  });

  describe("授業連絡（各種）", () => {
    it("授業連絡（連絡・呼出）が正しくパースできること", () => {
      const emailText = `◆「授業連絡（連絡・呼出）」が登録されました。  
---------------------------------------- 
[連絡種別] 連絡・呼出
[連絡タイトル] 連絡・呼出に関するお知らせ
[授業科目（クラス）] 外国語コミュニケーションＢ

[連絡内容]
外国語コミュニケーションＢの受講生の皆さんへ
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("授業連絡");
      expect(result.kind).toBe("連絡・呼出");
      expect(result.title).toBe("連絡・呼出に関するお知らせ");
      expect(result.content).toBe("外国語コミュニケーションＢの受講生の皆さんへ");
    });

    it("授業連絡（休講）で閉じカッコが欠落していても授業連絡としてパースできること", () => {
      const emailText = `◆「授業連絡（休講）が登録されました。 
---------------------------------------- 
[連絡種別] 休講 
[休講日] 2026/07/10 
[授業科目（クラス）・時限] 心理学入門Ⅰ限
心理学入門Ⅱ限

[連絡内容]
担当者の都合により休講とさせて頂きます。
---------------------------------------- 
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("授業連絡");
      expect(result.kind).toBe("休講");
      expect(result.title).toBe("休講のお知らせ（心理学入門Ⅰ限）");
      expect(result.content).toBe("担当者の都合により休講とさせて頂きます。");
    });

    it("授業連絡（講義室変更）で [タイトル] から正しくパースできること", () => {
      const emailText = `◆「授業連絡（講義室変更）」が登録されました。 
---------------------------------------- 
[タイトル] 講義室変更のお知らせ
[連絡種別] 講義室変更
[講義室変更日] 2025/12/12
[授業科目（クラス）時限] ネットワーク基礎Ⅴ限

[変更後講義室] １－３０１
[連絡内容]
いつもとは部屋が異なります。
---------------------------------------- 
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("授業連絡");
      expect(result.kind).toBe("講義室変更");
      expect(result.title).toBe("講義室変更のお知らせ");
      expect(result.content).toBe("いつもとは部屋が異なります。");
    });
  });

  describe("アンケート連絡", () => {
    it("授業評価アンケートが正しくパースできること", () => {
      const emailText = `◆「授業評価アンケート」が登録されました。 
---------------------------------------- 
[授業評価アンケートタイトル] 前期 授業フィードバックアンケートの実施について 
[提出期間] 2026/07/20 09:00 - 2026/08/07 23:55 
[伝達事項]
アンケートへのご協力をお願いします。
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("授業評価アンケート");
      expect(result.kind).toBe("授業評価アンケート");
      expect(result.title).toBe("前期 授業フィードバックアンケートの実施について");
      expect(result.content).toBe("アンケートへのご協力をお願いします。");
    });

    it("学内アンケートが正しくパースできること", () => {
      const emailText = `◆「学内アンケート」が登録されました。 
---------------------------------------- 
[学内アンケートタイトル] 後期演習科目履修アンケート 
[提出期間] 2026/09/17 09:00 - 2026/09/19 12:00 
[伝達事項]
必ず提出してください。 
---------------------------------------- 
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("学内アンケート");
      expect(result.kind).toBe("学内アンケート");
      expect(result.title).toBe("後期演習科目履修アンケート");
      expect(result.content).toBe("必ず提出してください。");
    });
  });

  describe("履修登録確認メール", () => {
    it("氏名宛て形式（〜様）のメールもパースできること", () => {
      const emailText = `山田\u3000太郎様
登録された一般・集中履修情報は以下の通りです。
2026年度\u3000Ｗｅｂプログラミング及び演習/Ｗｅｂプログラミング及び演習(X1)
※登録日時：2026年09月23日 15時55分49秒`;

      const result = parseEmail(emailText);
      expect(result.category).toBe("<不明>");
      expect(result.kind).toBe("履修登録");
      expect(result.title).toBe("履修登録内容");
      expect(result.content).toContain("2026年度\u3000Ｗｅｂプログラミング及び演習");
    });
  });

  describe("添付ファイルおよび文字化け判定", () => {
    it("添付ファイルありの判定", () => {
      const emailText = `◆「学内連絡」が登録されました。
----------------------------------------
[連絡種別] 通知
[連絡タイトル] 資料配布
[連絡内容]
添付を確認してください。
----------------------------------------
■ファイルが添付してあります。L-Camにて確認してください。
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.etc.hasAttachment).toBe(true);
    });

    it("添付ファイルなしの判定", () => {
      const emailText = `◆「学内連絡」が登録されました。
----------------------------------------
[連絡種別] 通知
[連絡タイトル] 資料配布
[連絡内容]
添付はありません。
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.etc.hasAttachment).toBe(false);
    });

    it("URLの '?' や文章内の '?' で文字化けと誤判定されないこと", () => {
      const emailText = `◆「学内連絡」が登録されました。
----------------------------------------
[連絡種別] 通知
[連絡タイトル] アンケート?
[連絡内容]
詳細は https://example.com/form?id=123&test=abc をご覧ください?
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.etc.hasGarbled).toBe(false);
    });

    it("置換文字（\\uFFFD）を含む場合は文字化けと判定されること", () => {
      const emailText = `◆「学内連絡」が登録されました。
----------------------------------------
[連絡種別] 通知
[連絡タイトル] テスト
[連絡内容]
文字化けテスト \uFFFD です。
----------------------------------------
■このメールは送信専用です。このメールには返信できません。`;

      const result = parseEmail(emailText);
      expect(result.etc.hasGarbled).toBe(true);
    });
  });

  describe("removeFooter & extractContent", () => {
    it("removeFooter がシステムフッターを正しく切り取ること", () => {
      const text = `本文です\n----------------------------------------\n■このメールは送信専用です。このメールには返信できません。`;
      expect(removeFooter(text)).toBe("本文です");
    });

    it("extractContent が想定通りの文字列を返すこと", () => {
      const text = `◆「学内連絡」が登録されました。\n----------------------------------------\n[連絡種別] 通知\n[連絡タイトル] テスト\n[連絡内容]\nこんにちは。\n----------------------------------------\n■このメールは送信専用です。このメールには返信できません。`;
      expect(extractContent(text)).toBe("こんにちは。");
    });
  });
});

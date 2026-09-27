import { describe, expect, it, spyOn } from "bun:test";
import { sendDiscordAlert, sendDiscordWebhook } from "./discord";
import {
  extractStrutsToken,
  findMatchingClassContact,
  findMatchingCommonContact,
  parseAttachmentLinks,
  parseClassContactList,
  parseCommonContactList,
  stripHtml,
} from "./lcam";

describe("L-Cam パーサー機能", () => {
  describe("extractStrutsToken", () => {
    it("HTMLからStrutsトークンを正しく抽出できること", () => {
      const html = `
        <form name="form1" method="post">
          <div><input type="hidden" name="org.apache.struts.taglib.html.TOKEN" value="token_abc_123"></div>
        </form>
      `;
      expect(extractStrutsToken(html)).toBe("token_abc_123");
    });

    it("指定したフォーム名のトークンを抽出できること", () => {
      const html = `
        <form name="form_search">
          <div><input type="hidden" name="org.apache.struts.taglib.html.TOKEN" value="token_search"></div>
        </form>
        <form name="form_list">
          <div><input type="hidden" name="org.apache.struts.taglib.html.TOKEN" value="token_list"></div>
        </form>
      `;
      expect(extractStrutsToken(html, "form_list")).toBe("token_list");
      expect(extractStrutsToken(html, "form_search")).toBe("token_search");
    });

    it("トークンが存在しない場合は null を返すこと", () => {
      const html = `<div>トークンなし</div>`;
      expect(extractStrutsToken(html)).toBeNull();
    });
  });

  describe("parseClassContactList", () => {
    it("授業連絡一覧のHTMLから各項目を抽出できること", () => {
      const sampleHtml = `
        <div class="listItem midoku" onclick="return showClassContactDetail(0);">
          <table style="width: 100%;">
            <tr>
              <td style="width: 95%;">
                授業科目
                :
                [八]ああああいいいいうううう(X1)
                後期/木3, 後期/木3
                <br>
                タイトル
                :
                連絡に関するお知らせ
                <br>
                教員\u3000一郎
                <br>
              </td>
            </tr>
          </table>
        </div>
        <div class="listItem" onclick="return showClassContactDetail(1);">
          <table style="width: 100%;">
            <tr>
              <td style="width: 95%;">
                授業科目
                :
                [八]ああああうううういいいい(X1)
                後期/月1
                <br>
                タイトル
                :
                第1回講義資料について
                <br>
                山田\u3000太郎
                <br>
              </td>
            </tr>
          </table>
        </div>
      `;

      const items = parseClassContactList(sampleHtml);
      expect(items.length).toBe(2);

      expect(items[0].index).toBe(0);
      expect(items[0].subject).toBe("[八]ああああいいいいうううう(X1)");
      expect(items[0].period).toBe("後期/木3, 後期/木3");
      expect(items[0].title).toBe("連絡に関するお知らせ");
      expect(items[0].teacher).toBe("教員\u3000一郎");

      expect(items[1].index).toBe(1);
      expect(items[1].subject).toBe("[八]ああああうううういいいい(X1)");
      expect(items[1].period).toBe("後期/月1");
      expect(items[1].title).toBe("第1回講義資料について");
      expect(items[1].teacher).toBe("山田\u3000太郎");
    });
  });

  describe("parseCommonContactList", () => {
    it("学内連絡一覧のHTMLからタイトルと発信元を抽出できること", () => {
      const sampleHtml = `
        <div class="listItem midoku" onclick="return showCommonContactDetail(0);">
          <table style="width: 100%;">
            <tr>
              <td style="width: 95%;">
                後期もピアサポートを実施します
                <br>
                <div>
                  <div class="f-left">大学八草事務</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
        <div class="listItem" onclick="return showCommonContactDetail(1);">
          <table style="width: 100%;">
            <tr>
              <td style="width: 95%;">
                秋の大遊戯祭 開催決定！｜学友会からのお知らせ
                <br>
                <div>
                  <div class="f-left">学友会八草執行委員会</div>
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;

      const items = parseCommonContactList(sampleHtml);
      expect(items.length).toBe(2);

      expect(items[0].index).toBe(0);
      expect(items[0].title).toBe("後期もピアサポートを実施します");
      expect(items[0].sender).toBe("大学八草事務");

      expect(items[1].index).toBe(1);
      expect(items[1].title).toBe("秋の大遊戯祭 開催決定！｜学友会からのお知らせ");
      expect(items[1].sender).toBe("学友会八草執行委員会");
    });
  });

  describe("parseAttachmentLinks", () => {
    it("詳細画面の添付ファイルリンクからファイル名とサイズを正しく抽出できること", () => {
      const sampleHtml = `
        <div id="fileList_no1">
          <div id="fileList_no1_1">
            <a href="javascript:void(0);" onclick="fileDownLoad('no1', '1', '\\u266F1 \\u30AC\\u30A4\\u30C0\\u30F3\\u30B9\\u30FB\\u8077\\u696D\\u3068\\u60C5\\u5831\\u306E\\u610F\\u7FA9.pdf');">
              ♯1 ガイダンス・職業と情報の意義.pdf
            </a>
            &nbsp;&nbsp;(1.99 MB)
          </div>
          <div id="fileList_no1_2">
            <a href="javascript:void(0);" onclick="fileDownLoad('no1', '2', 'syllabus_sample.docx');">
              syllabus_sample.docx
            </a>
            &nbsp;&nbsp;(250 KB)
          </div>
        </div>
      `;

      const files = parseAttachmentLinks(sampleHtml);
      expect(files.length).toBe(2);

      // Unicode エスケープがデコードされていること
      expect(files[0].name).toBe("♯1 ガイダンス・職業と情報の意義.pdf");
      expect(files[0].size).toBe("1.99 MB");
      expect(files[0].prefix).toBe("no1");
      expect(files[0].no).toBe("1");

      expect(files[1].name).toBe("syllabus_sample.docx");
      expect(files[1].size).toBe("250 KB");
      expect(files[1].prefix).toBe("no1");
      expect(files[1].no).toBe("2");
    });
  });

  describe("findMatchingClassContact", () => {
    const items = [
      {
        index: 0,
        subject: "[八]ああああいいいいうううう(X1)",
        period: "後期/木3",
        title: "連絡に関するお知らせ",
        teacher: "佐藤　二郎",
      },
      {
        index: 1,
        subject: "[八]ああああうううういいいい(X1)",
        period: "後期/月1",
        title: "第1回講義資料について",
        teacher: "山田　太郎",
      },
      {
        index: 2,
        subject: "[八]ああああいいいいうううう(X2)",
        period: "後期/金2",
        title: "休講のお知らせ",
        teacher: "鈴木　一郎",
      },
    ];

    it("タイトルと科目名の両方が合致する場合に対象の index を返すこと", () => {
      const matchIndex = findMatchingClassContact(items, {
        title: "連絡に関するお知らせ",
        subject: "ああああいいいいうううう",
      });
      expect(matchIndex).toBe(0);
    });

    it("タイトル完全一致で合致すること", () => {
      const matchIndex = findMatchingClassContact(items, {
        title: "第1回講義資料について",
      });
      expect(matchIndex).toBe(1);
    });

    it("タイトル部分一致で合致すること", () => {
      const matchIndex = findMatchingClassContact(items, {
        title: "連絡に関するお知らせ（追加）",
      });
      expect(matchIndex).toBe(0);
    });

    it("見つからない場合は null を返すこと", () => {
      const matchIndex = findMatchingClassContact(items, {
        title: "存在しない連絡タイトル",
      });
      expect(matchIndex).toBeNull();
    });
  });

  describe("findMatchingCommonContact", () => {
    const items = [
      {
        index: 0,
        title: "秋の大遊戯祭 開催決定！｜学友会からのお知らせ",
        sender: "学友会八草執行委員会",
      },
      {
        index: 1,
        title: "後期もピアサポートを実施します",
        sender: "大学八草事務",
      },
    ];

    it("完全一致で対象の index を返すこと", () => {
      const matchIndex = findMatchingCommonContact(items, {
        title: "後期もピアサポートを実施します",
      });
      expect(matchIndex).toBe(1);
    });

    it("部分一致で対象の index を返すこと", () => {
      const matchIndex = findMatchingCommonContact(items, {
        title: "秋の大遊戯祭 開催決定！",
      });
      expect(matchIndex).toBe(0);
    });

    it("見つからない場合は null を返すこと", () => {
      const matchIndex = findMatchingCommonContact(items, {
        title: "全く異なるお知らせ",
      });
      expect(matchIndex).toBeNull();
    });

    it("記号の文字化け（? と ® 等）があっても正規化して合致すること", () => {
      const itemsWithSpecialChar = [
        { index: 0, title: "TOEIC® Program IPテストについて", sender: "広報課" },
      ];
      const matchIndex = findMatchingCommonContact(itemsWithSpecialChar, {
        title: "TOEIC? Program IPテストについて",
      });
      expect(matchIndex).toBe(0);
    });
  });

  describe("stripHtml", () => {
    it("<br> タグを改行に変換し、実体参照をデコードすること", () => {
      const input = "<div>Hello<br />World&nbsp;&amp;&nbsp;&lt;test&gt;</div>";
      expect(stripHtml(input)).toBe("Hello\nWorld & <test>");
    });
  });

  describe("Discord 通知機能 (添付失敗ハンドリング)", () => {
    it("attachmentFailed: true の場合に '添付ファイルあり (取得失敗)' が設定されること", async () => {
      type DiscordPayload = { embeds: Array<{ fields: Array<{ name: string; value: string }> }> };
      const captured: { body: DiscordPayload | null } = { body: null };

      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
        _url: string | URL | Request,
        init?: RequestInit,
      ) => {
        captured.body = JSON.parse(init?.body as string) as DiscordPayload;
        return new Response("ok", { status: 200 });
      }) as unknown as typeof fetch);

      try {
        await sendDiscordWebhook(
          {
            category: "学内連絡",
            kind: "通知",
            title: "テスト連絡",
            content: "本文",
            etc: {
              hasAttachment: true,
              attachmentFailed: true,
            },
          },
          undefined,
          new Date(),
          "https://example.com/webhook",
        );

        expect(captured.body).not.toBeNull();
        if (captured.body != null) {
          const infoField = captured.body.embeds[0]?.fields.find((f: { name: string; value: string }) => f.name === "情報");
          expect(infoField?.value).toBe("添付ファイルあり (取得失敗)");
        }
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("sendDiscordAlert が正しくアラートを送信できること", async () => {
      type AlertPayload = { content: string };
      const captured: { url: string; body: AlertPayload | null } = { url: "", body: null };

      const fetchSpy = spyOn(globalThis, "fetch").mockImplementation((async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        captured.url = url.toString();
        captured.body = JSON.parse(init?.body as string) as AlertPayload;
        return new Response("ok", { status: 200 });
      }) as unknown as typeof fetch);

      try {
        const res = await sendDiscordAlert("https://example.com/priv_webhook", "アラートメッセージ");
        expect(res.status).toBe(200);
        expect(captured.url).toBe("https://example.com/priv_webhook");
        if (captured.body != null) {
          expect(captured.body.content).toBe("アラートメッセージ");
        }
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });
});

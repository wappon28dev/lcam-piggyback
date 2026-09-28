import { describe, expect, it } from "bun:test";
import { $app } from "./index";

const TEST_ENV = {
  WEBHOOK_DISCORD_PUBLIC_0: "",
  WEBHOOK_DISCORD_PRIVATE_0: "",
  LCAM_USER_ID: "test-user",
  LCAM_APP_TOKEN: "test-token",
  BEARER_TOKEN: "secret-test-token",
  MODE: "stg" as const,
};

describe("Hono アプリケーションエンドポイント", () => {
  it("GET / でサービス名が返ること（認証不要）", async () => {
    const res = await $app.request("/", {}, TEST_ENV);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      type: "Success",
      value: { message: "lcam-piggyback" },
    });
  });

  it("GET /healthz で OK が返ること（認証不要）", async () => {
    const res = await $app.request("/healthz", {}, TEST_ENV);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({
      type: "Success",
      value: { message: "OK" },
    });
  });

  it("POST / で Authorization ヘッダーがない場合は 401 が返ること", async () => {
    const res = await $app.request(
      "/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "テスト",
          body: "本文",
        }),
      },
      TEST_ENV,
    );
    expect(res.status).toBe(401);

    const json = (await res.json()) as { type: string; error: { message: string } };
    expect(json.type).toBe("Failure");
    expect(json.error.message).toBe("Missing Authorization header");
  });

  it("POST / で不正な Bearer トークンの場合は 401 が返ること", async () => {
    const res = await $app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer wrong-token",
        },
        body: JSON.stringify({
          subject: "テスト",
          body: "本文",
        }),
      },
      TEST_ENV,
    );
    expect(res.status).toBe(401);

    const json = (await res.json()) as { type: string; error: { message: string } };
    expect(json.type).toBe("Failure");
    expect(json.error.message).toBe("Invalid bearer token");
  });

  it("POST / で不正なペイロード（空オブジェクト）の場合は 400 が返ること", async () => {
    const res = await $app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer secret-test-token",
        },
        body: JSON.stringify({}),
      },
      TEST_ENV,
    );
    expect(res.status).toBe(400);

    const json = (await res.json()) as { type: string };
    expect(json.type).toBe("Failure");
  });

  it("POST / で Discord Webhook URL が未設定の場合は 500 エラーが返ること", async () => {
    const payload = {
      subject: "Fw: ＜L-Cam＞学内連絡：後期もピアサポートを実施します",
      body: "◆「学内連絡」が登録されました。\n----------------------------------------\n[連絡種別] 通知\n[連絡タイトル] 後期もピアサポートを実施します\n[連絡内容]\n本文",
      receivedDateTime: "2026-09-27T08:24:15+00:00",
    };

    const res = await $app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer secret-test-token",
        },
        body: JSON.stringify(payload),
      },
      TEST_ENV,
    );

    expect(res.status).toBe(500);
    const json = (await res.json()) as {
      type: string;
      error: { message: string; result: { discordStatus: number } };
    };
    expect(json.type).toBe("Failure");
    expect(json.error.message).toBe("Failed to send notification to Discord");
    expect(json.error.result.discordStatus).toBe(500);
  });

  it("POST / で正しい Bearer トークンと想定の L-Cam ペイロードを受け付けられること", async () => {
    const payload = {
      subject: "Fw: ＜L-Cam＞学内連絡：後期もピアサポートを実施します",
      body: "◆「学内連絡」が登録されました。\n----------------------------------------\n[連絡種別] 通知\n[連絡タイトル] 後期もピアサポートを実施します\n[連絡内容]\n前期に引き続き、後期もピアサポートを実施します。\n場所は前期と同様、１号館２階ラーニング・コモンズになります。\n10/13（火）からいよいよスタートです（添付チラシ参照）。\n \n予約サイトはまだ準備中ですが、実際に予約ができるようになったら改めてお知らせします。\nインスタでは随時最新情報を更新していますので、",
      receivedDateTime: "2026-09-27T08:24:15+00:00",
    };

    const envWithWebhook = {
      ...TEST_ENV,
      WEBHOOK_DISCORD_PUBLIC_0: "https://discord.com/api/webhooks/mock",
    };

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;

    try {
      const res = await $app.request(
        "/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer secret-test-token",
          },
          body: JSON.stringify(payload),
        },
        envWithWebhook,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        type: string;
        value: { result: { title: string; category: string } };
      };
      expect(json.type).toBe("Success");
      expect(json.value.result.title).toBe("後期もピアサポートを実施します");
      expect(json.value.result.category).toBe("学内連絡");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

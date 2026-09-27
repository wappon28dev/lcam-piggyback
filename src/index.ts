import type { Env } from "./lib/types/env";
import PostalMime from "postal-mime";
import { match } from "ts-pattern";
import { sendDiscordWebhook } from "./lib/discord";
import { extractContent, parseEmail, removeFooter } from "./lib/parser";

export { extractContent, parseEmail, removeFooter, sendDiscordWebhook };

const email: EmailExportedHandler<Env> = async (message, env, _ctx) => {
  const now = new Date();

  const { from, text } = await PostalMime.parse(message.raw);
  const parsed = parseEmail(text ?? "");

  const {
    WEBHOOK_DISCORD_PUBLIC_0: pub,
    WEBHOOK_DISCORD_PRIVATE_0: priv,
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

  const res = await sendDiscordWebhook(notification, from, now, webhookUrl);
  if (!res.ok) {
    console.error(`Failed to send Discord webhook: ${res.status} ${res.statusText}`);
  }
};

export default { email };

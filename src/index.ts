import type { Handler } from "hono";
import type { HonoType } from "./lib/consts";
import { arktypeValidator } from "@hono/arktype-validator";
import { R } from "@praha/byethrow";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { logger } from "hono/logger";
import { INFO } from "./lib/consts";
import { configureBearerAuth } from "./lib/middlewares/auth";
import { configureCors } from "./lib/middlewares/cors";
import { processEmail } from "./lib/process-email";
import { EmailPayloadSchema } from "./lib/schemas/email";

export { processEmail };

// eslint-disable-next-line ts/explicit-function-return-type
export function app(handlers: Handler[]) {
  return (
    new Hono<HonoType>()
      // preflight
      .use("*", ...handlers)
      .get("/", (ctx) => ctx.json(R.succeed({ message: INFO.name })))
      .post(
        "/",
        configureBearerAuth,
        arktypeValidator("json", EmailPayloadSchema, (result, ctx) => {
          if (!result.success) {
            return ctx.json(
              R.fail({
                message: "Invalid request payload",
                errors: Array.from(result.errors).map((e) => e.message),
              }),
              400,
            );
          }
          return undefined;
        }),
        async (ctx) => {
          const { body, receivedDateTime } = ctx.req.valid("json");
          const env = ctx.env;
          const result = await processEmail(body, env, receivedDateTime);
          if (result.discordStatus >= 400) {
            return ctx.json(
              R.fail({
                message: "Failed to send notification to Discord",
                result,
              }),
              500,
            );
          }
          return ctx.json(R.succeed({ result }));
        },
      )
      .get("/healthz", (ctx) => ctx.json(R.succeed({ message: "OK" })))
  );
}

export const $app = app([
  bodyLimit({
    maxSize: 50 * 1024, // 50kb
    onError: (c) => c.text("overflow :(", 413),
  }),
  logger(),
  configureCors,
]);

export default $app;

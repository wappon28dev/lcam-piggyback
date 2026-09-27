import type { MiddlewareHandler } from "hono";
import type { HonoType } from "@/lib/consts";
import { R } from "@praha/byethrow";
import { bearerAuth } from "hono/bearer-auth";

export const configureBearerAuth: MiddlewareHandler<HonoType> = async (ctx, next) =>
  await bearerAuth<HonoType>({
    verifyToken: (token, c) => {
      const expected = (c.env.AUTH_TOKEN ?? c.env.BEARER_TOKEN ?? "").trim();
      if (expected === "") {
        return false;
      }
      return token === expected;
    },
    noAuthenticationHeader: {
      message: R.fail({ message: "Missing Authorization header" }),
    },
    invalidAuthenticationHeader: {
      message: R.fail({ message: "Invalid Authorization header format" }),
    },
    invalidToken: {
      message: R.fail({ message: "Invalid bearer token" }),
    },
  })(ctx, next);

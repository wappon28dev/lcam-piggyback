import type { MiddlewareHandler } from "hono";
import type { HonoType } from "@/lib/consts";
import { cors } from "hono/cors";

export const configureCors: MiddlewareHandler<HonoType> = async (ctx, next) => {
  const allowedHosts = "*";
  return await cors({
    origin: allowedHosts,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })(ctx, next);
};

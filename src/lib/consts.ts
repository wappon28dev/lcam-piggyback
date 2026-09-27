import type { Env } from "./types/env";

export type HonoType = {
  Variables: Record<string, unknown>;
  Bindings: Env;
};

export const INFO = {
  id: "lcam-piggyback",
  version: "0.0.0",
  name: "lcam-piggyback",
  word: {
    serviceName: "LCAM 通知連携",
  },
  config: {},
} as const;

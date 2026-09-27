import { configure } from "arktype/config";

configure({
  onUndeclaredKey: "delete",
  // JIT compilation is not allowed in Cloudflare Workers
  // ref: https://arktype.io/docs/configuration#jitless
  jitless: true,
});

import { type } from "@/lib/utils/arktype";

export const EmailPayloadSchema = type({
  subject: "string",
  body: "string",
  receivedDateTime: "string",
});

export type EmailPayload = typeof EmailPayloadSchema.infer;

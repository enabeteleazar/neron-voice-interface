import { neronRequest } from "./api";

export function sendMessage(text: string) {
  return neronRequest("/input/text", {
    method: "POST",
    body: JSON.stringify({
      text,
    }),
  });
}

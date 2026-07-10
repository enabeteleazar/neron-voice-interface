import { neronRequest } from "./api";

export function getNeronStatus() {
  return neronRequest("/status");
}

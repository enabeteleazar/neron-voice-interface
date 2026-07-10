import { getNeronStatus } from "../services/neron/status";
import { sendMessage } from "../services/neron/chat";

export class NeronClient {

  async status() {
    return getNeronStatus();
  }

  async chat(message: string) {
    return sendMessage(message);
  }

}

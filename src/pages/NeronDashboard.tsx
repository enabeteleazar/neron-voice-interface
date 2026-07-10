import { useState } from "react";
import { NeronClient } from "../sdk/NeronClient";

const client = new NeronClient();

export default function NeronDashboard() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const result = await client.chat(message);
      setResponse(result.response ?? JSON.stringify(result));
    } catch (error) {
      setResponse(`Erreur: ${error}`);
    }

    setLoading(false);
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>NéronOS</h1>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Parle à Néron..."
        rows={4}
        style={{ width: "100%" }}
      />

      <button onClick={send} disabled={loading}>
        {loading ? "Analyse..." : "Envoyer"}
      </button>

      <section>
        <h2>Réponse</h2>
        <p>{response}</p>
      </section>
    </main>
  );
}

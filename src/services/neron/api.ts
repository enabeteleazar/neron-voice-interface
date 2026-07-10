const NERON_API_URL = import.meta.env.VITE_NERON_API_URL;
const NERON_API_KEY = import.meta.env.VITE_NERON_API_KEY;

export async function neronRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${NERON_API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NERON_API_KEY}`,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Neron API error: ${response.status}`);
  }

  return response.json();
}

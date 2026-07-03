export default async function handler(req, res) {
  // Configurazione di sicurezza per evitare blocchi del browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metodo non consentito' });

  try {
    const { messages } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ reply: "⚠️ Server configuration error: Missing API Key on Vercel." });
    }

    const SYSTEM_PROMPT = `You are an expert Travel Assistant called "SAM".
Rules you must always follow:
1. Always respond in English regardless of the language the user writes in.
2. Be warm, friendly and enthusiastic. Use relevant emojis.
3. Keep every answer to a maximum of 6 lines — be concise and to the point.
4. At the end of every response, include 1-2 helpful and real clickable links (use Markdown format: [Label](URL)).
5. When the user describes their travel preferences, react with a warm personal connection phrase like "Fantastic! We have the same preferences! 🙌" or "We're very similar! I love that too! 😄".`;

    // Chiamata ai server di Anthropic usando il modello Sonnet Latest
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest', 
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic Error:', data);
      return res.status(200).json({ reply: `⚠️ Anthropic API Error: ${data.error?.message || 'Unknown error'}` });
    }

    // Estrazione sicura del testo della risposta
    let reply = "Sorry, I didn't understand.";
    if (data.content && Array.isArray(data.content) && data.content[0]) {
      reply = data.content[0].text || reply;
    } else if (typeof data.content === 'string') {
      reply = data.content;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Catch Error:', error);
    return res.status(200).json({ reply: `⚠️ Connection error: ${error.message}` });
  }
}

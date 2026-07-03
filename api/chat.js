export default async function handler(req, res) {
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

    const SYSTEM_PROMPT = `You are an expert Travel Assistant called "SAM".`;

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

    // ERROR HANDLER AVANZATO: Cattura il tipo esatto di errore
    if (!response.ok) {
      console.error('Anthropic Error:', data);
      const errorType = data.error?.type || 'N/A';
      const errorMessage = data.error?.message || 'Unknown error';
      
      // Questo ci dirà se è un problema di "permission_error", "authentication_error" o "not_found_error"
      return res.status(200).json({ 
        reply: `⚠️ DETTAGLIO ERRORE ANTHROPIC -> Tipo: [${errorType}] | Messaggio: [${errorMessage}]` 
      });
    }

    let reply = "Sorry, I didn't understand.";
    if (data.content && Array.isArray(data.content) && data.content[0]) {
      reply = data.content[0].text || reply;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(200).json({ reply: `⚠️ Connection error: ${error.message}` });
  }
}

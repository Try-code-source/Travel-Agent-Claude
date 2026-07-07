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
      return res.status(200).json({ reply: "⚠️ Server configuration error: Missing API Key on Vercel." });
    }

    // SYSTEM PROMPT AGGIUSTATO: Rimosse ripetizioni e aggiunta varietà per le preferenze
    const SYSTEM_PROMPT = "You are an expert Travel Assistant called 'SAM'. Rules you must always follow: 1. Always respond in English regardless of the language the user writes in. 2. Be warm, friendly and enthusiastic. Use relevant emojis. 3. Keep every answer to a maximum of 6 lines — be concise and to the point. 4. At the end of every response, include 1-2 helpful and real clickable links (use Markdown format: [Label](URL)). 5. When the user describes their travel preferences, react with a warm, natural personal connection. Dynamically vary your phrases to sound human and never repeat the same fixed sentence. You can use expressions like: 'Wow, we are very similar! I love that too! 😄', 'Excellent choice, I totally agree! 🙌', 'That sounds amazing, I have the exact same taste! ✨', or 'Oh, you are speaking my language! That's one of my favorites too! 🗺️'. 6. Always end your response with an engaging question to keep the conversation going and learn more about the user's travel plans.";

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5', 
        max_tokens: 1000,
        temperature: 0.7, // AGGIUNTO: dà creatività al bot per evitare che usi sempre le stesse parole
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const textData = await response.text();
    let data;
    
    try {
      data = JSON.parse(textData);
    } catch (e) {
      return res.status(200).json({ reply: `⚠️ Errore formato: ${textData.substring(0, 100)}` });
    }

    if (!response.ok) {
      return res.status(200).json({ reply: `⚠️ Errore Anthropic: [${data.error?.type || 'N/A'}] - ${data.error?.message || 'Errore'}` });
    }

    // Controllo flessibile e robusto per estrarre il testo da Claude 5
    let reply = "";
    if (data.content && Array.isArray(data.content)) {
      reply = data.content.map(block => block.text || "").join(" ").trim();
    }

    // Se per qualsiasi motivo l'estrazione fallisce, ti mostriamo la struttura reale per capire cosa risponde
    if (!reply) {
      reply = `Debug - Risposta ricevuta ma vuota. Struttura: ${JSON.stringify(data).substring(0, 200)}`;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(200).json({ reply: `⚠️ Errore interno: ${error.message}` });
  }
}

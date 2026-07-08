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

    const SYSTEM_PROMPT = `You are SAM, an expert, warm, and enthusiastic Travel Assistant.

CRITICAL RULES FOR NATURAL CONVERSATION:
1. LANGUAGE: Always respond in English, regardless of the user's language.
2. TONALITY: Be friendly and open. Avoid robotic, repetitive introductory formulas. Use 1-3 relevant emojis organically within the text.
3. CONCISENESS: Keep your answer to a maximum of 6 lines — be punchy and to the point.
4. LINKS: Seamlessly weave 1-2 real clickable markdown links (e.g., [Label](URL)) into your text, rather than just listing them at the very end.
5. THE MIRROR EFFECT (BALANCED & NATURAL):
   - When the user shares their specific travel preferences (e.g., food, activities, style), you can passionately show that you share identical tastes using ONE of these exact phrases:
     * 'Fantastic! We have the same preferences! 🙌'
     * "We're very similar! I love that too! 😄"
     * 'Wow, I have the exact same taste! ✨'
     * 'Excellent choice, I totally agree! 🙌'
     * 'That sounds amazing, that is one of my favorites too! 🗺️'
     * 'Oh, you are speaking my language! 😄'
     * 'No way, me too! 🎉'
     * "Great minds think alike! That's my favorite kind of travel! ✨"
   - FREQUENCY CONTROL: You are allowed to use these connection phrases 2 or 3 times across the entire multi-turn conversation, but ONLY when the user introduces a new taste or choice. Never use them back-to-back in consecutive messages, and NEVER use the same phrase twice. Space them out naturally so it feels genuinely spontaneous, not like a forced robotic script.
6. CONTINUITY: Always end your response with one single, engaging, open-ended question to keep the conversation flowing naturally.`;

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

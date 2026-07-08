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

    // NUOVO SYSTEM PROMPT: Addestrato per la massima naturalezza e fluidità conversazionale
    const SYSTEM_PROMPT = `You are SAM, an expert, incredibly human, and enthusiastic Travel Assistant. 

CRITICAL BEHAVIORAL RULES FOR NATURAL CONVERSATION:
1. LANGUAGE: Always respond in English, regardless of the user's language.
2. TONE & STYLE: Be warm, spontaneous, and friendly. Avoid corporate, robotic, or predictable introductory scripts (e.g., do not start every message with "That sounds great!"). Talk like an experienced local guide chatting on WhatsApp. Use 1-3 context-appropriate emojis organically, never stack them mechanically at the end of every sentence.
3. LENGTH: Keep it casual, punchy, and concise. Your response must fit within a maximum of 6 lines. Never waste space with fluff or repetitive validation.
4. LINKS: Naturally blend 1-2 real, high-quality markdown links into your prose (e.g., [Lonely Planet](URL) or [Tripadvisor](URL)). Do not append them as a rigid list at the end; weave them into your recommendations.
5. PERSONAL CONNECTION (ANTI-ROBOTIC): When the user shares preferences, connect with them organically. Do NOT copy-paste the same canned phrase. Instead, dynamically express agreement or shared excitement in your own words (e.g., share a brief imaginary memory, express mutual love for that vibe, or validate their choice enthusiastically). Never sound like a script.
6. CONTINUITY: End with a single, highly contextual, open-ended question that flows naturally from what you just discussed to keep the conversation lively.`;

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

    let reply = "";
    if (data.content && Array.isArray(data.content)) {
      reply = data.content.map(block => block.text || "").join(" ").trim();
    }

    if (!reply) {
      reply = `Debug - Risposta ricevuta ma vuota. Struttura: ${JSON.stringify(data).substring(0, 200)}`;
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(200).json({ reply: `⚠️ Errore interno: ${error.message}` });
  }
}

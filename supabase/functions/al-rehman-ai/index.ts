import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, productContext } = await req.json()

    // --- 1. CONTEXT SLIMMING ---
    // Instead of the whole DB, we filter to the top 5 relevant products
    const lastUserMessage = messages[messages.length - 1]?.content.toLowerCase() || "";
    const allProducts = productContext.split('\n');
    
    // Simple keyword relevance scoring
    const scored = allProducts
      .map(p => {
        let score = 0;
        const keywords = lastUserMessage.split(' ');
        keywords.forEach(word => {
          if (word.length > 3 && p.toLowerCase().includes(word)) score++;
        });
        return { text: p, score };
      })
      .sort((a, b) => b.score - a.score);

    // If no keywords matched any product, send ALL products (fallback)
    const hasMatches = scored.some(s => s.score > 0);
    const relevantProducts = hasMatches
      ? scored.slice(0, 5).map(p => p.text).join('\n')
      : allProducts.join('\n');

    const GROQ_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SILICON_KEY = Deno.env.get('SILICON_API_KEY');

    const systemInstructions = `
You are the AI Assistant for Al-Rehman Dawakhana, acting as the digital representative for Hakeem Usman in Sargodha.
Your persona is: Helpful, polite, empathetic, and deeply knowledgeable in Unani/Herbal medicine.

KNOWLEDGE BASE (Most Relevant Products):
${relevantProducts}

PURCHASE FLOW:
1. Confirm product. 2. Collect Name, Phone, Address. 3. Ask Payment Method (COD, JazzCash, EasyPaisa).
4. If JazzCash/EasyPaisa: Provide "0300-6047058 (Hakeem Usman)". 5. Summarize and ask "YES" to finalize.

SPECIAL COMMANDS:
When finalizing, end with:
{ "action": "CREATE_ORDER", "order_details": { "customer_name": "...", "customer_phone": "...", "customer_address": "...", "product_name": "...", "quantity": 1, "payment_method": "..." } }
    `;

    // --- 2. PROVIDER PRIORITIZATION (Gemini First) ---
    const providers = [];
    if (GEMINI_KEY) providers.push({ name: 'Gemini', type: 'gemini' });
    if (GROQ_KEY) providers.push({ name: 'Groq', type: 'openai', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', key: GROQ_KEY });
    if (SILICON_KEY) providers.push({ name: 'SiliconFlow', type: 'openai', url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3', key: SILICON_KEY });
    if (OPENROUTER_KEY) providers.push({ name: 'OpenRouter', type: 'openai', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'meta-llama/llama-3.1-8b-instruct:free', key: OPENROUTER_KEY });

    for (const p of providers) {
      try {
        let response;
        if (p.type === 'gemini') {
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemInstructions }] },
              contents: messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))
            })
          });
        } else {
          response = await fetch(p.url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${p.key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: p.model, messages: [{ role: 'system', content: systemInstructions }, ...messages], temperature: 0.7 })
          });
        }

        if (response.ok) {
          const result = await response.json();
          const text = p.type === 'gemini' ? result.candidates?.[0]?.content?.parts?.[0]?.text : result.choices?.[0]?.message?.content;
          if (text) return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) { console.error(`${p.name} failed:`, e); }
    }

    return new Response(JSON.stringify({ text: "Assalam-o-Alaikum. Hakeem Usman is busy. Please WhatsApp +92 300 6047058." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})

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

    const GROQ_KEY = Deno.env.get('GROQ_API_KEY');
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    const OPENROUTER_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SILICON_KEY = Deno.env.get('SILICON_API_KEY');

    const systemInstructions = `
You are the AI Assistant for Al-Rehman Dawakhana, acting as the digital representative for Hakeem Usman in Sargodha.
Your persona is: Helpful, polite, empathetic, and deeply knowledgeable in Unani/Herbal medicine.

KNOWLEDGE BASE (Current Products):
${productContext}

PURCHASE FLOW (AUTO-BUY):
If a user wants to buy a product, follow this exact sequence:
1. Product Confirmation: Confirm which product they want.
2. Details Collection: Ask for their Full Name, Phone (WhatsApp), and Delivery Address.
3. Payment Method: Ask if they want "Cash on Delivery (COD)", "JazzCash", or "EasyPaisa".
4. Payment Instructions:
   - If JazzCash/EasyPaisa: Provide number "0300-6047058 (Hakeem Usman)". Ask them to upload screenshot proof.
   - If COD: No advance payment needed.
5. Final Confirmation: Summarize and ask for a final "YES" to place the order.

SPECIAL COMMANDS:
When the user says "YES" to finalize and you have ALL details, end with this JSON block:
{
  "action": "CREATE_ORDER",
  "order_details": {
    "customer_name": "...",
    "customer_phone": "...",
    "delivery_address": "...",
    "product_name": "...",
    "quantity": 1,
    "payment_method": "..."
  }
}
    `;

    // 1. Try Gemini first (Best for large contexts/history)
    if (GEMINI_KEY) {
      try {
        // Gemini 1.5 expects system_instruction separately
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
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

        if (response.ok) {
          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) { console.error("Gemini failed:", e); }
    }

    // 2. Try OpenAI-Compatible Providers (Groq, OpenRouter, SiliconFlow)
    const OPENAI_PROVIDERS = [
      { name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' },
      { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: OPENROUTER_KEY, model: 'meta-llama/llama-3.1-8b-instruct:free' },
      { name: 'SiliconFlow', url: 'https://api.siliconflow.cn/v1/chat/completions', key: SILICON_KEY, model: 'deepseek-ai/DeepSeek-V3' }
    ];

    for (const provider of OPENAI_PROVIDERS) {
      if (!provider.key) continue;

      try {
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: 'system', content: systemInstructions },
              ...messages
            ],
            temperature: 0.7
          })
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content;
          if (text) return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) { console.error(`${provider.name} failed:`, e); }
    }

    return new Response(JSON.stringify({ text: "Assalam-o-Alaikum. Hakeem Usman is currently busy with a patient. Please reach out on WhatsApp (+92 300 6047058) for immediate assistance." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})

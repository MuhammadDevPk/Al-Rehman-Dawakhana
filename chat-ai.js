/**
 * Al-Rehman Dawakhana AI Chat Assistant
 * Optimized Version: Semantic Caching + Rate Limiting + Context Slimming
 */

let chatHistory = [];
let currentScreenshotUrl = null;

// --- 1. RATE LIMITING LOGIC ---
function checkRateLimit() {
    const now = Date.now();
    let msgData = JSON.parse(sessionStorage.getItem('ai_msg_data') || '{"count": 0, "startTime": 0}');
    
    // Reset if 2 minutes have passed
    if (now - msgData.startTime > 120000) {
        msgData = { count: 1, startTime: now };
    } else {
        msgData.count++;
    }
    
    sessionStorage.setItem('ai_msg_data', JSON.stringify(msgData));
    return msgData.count <= 5;
}

// --- 2. SEMANTIC CACHING LOGIC ---
async function checkCache(query) {
    try {
        const cleanQuery = query.toLowerCase().trim();
        const { data, error } = await supabaseClient
            .from('ai_cache')
            .select('ai_response')
            .eq('user_query', cleanQuery)
            .maybeSingle();

        if (data && !error) {
            console.log("🚀 Cache Hit: Using saved response.");
            return data.ai_response;
        }
    } catch (e) { console.error("Cache Check Failed:", e); }
    return null;
}

async function saveToCache(query, response) {
    try {
        // Don't cache order-related responses (they contain JSON or purchase flow text)
        if (response.includes('{') || response.includes('CREATE_ORDER')) return;
        if (response.includes('Order Number') || response.includes('order')) return;
        // Don't cache very short queries (likely transactional: "yes", "cod", etc.)
        if (query.trim().length < 10) return;
        await supabaseClient
            .from('ai_cache')
            .upsert({ user_query: query.toLowerCase().trim(), ai_response: response });
    } catch (e) { console.error("Cache Save Failed:", e); }
}

// --- AI Logic ---
async function askAlRehmanAI(userMessage) {
    // A. Rate Limit Check
    if (!checkRateLimit()) {
        return "⚠️ Hakeem Usman's assistant needs a moment to prepare your answers. Please wait 60 seconds before asking more questions.";
    }

    // B. Cache Check — skip during active order conversations
    const isOrderFlow = chatHistory.some(m => 
        m.content.includes('CREATE_ORDER') || 
        m.content.includes('Full Name') || 
        m.content.includes('Payment Method') ||
        m.content.includes('Order Placed')
    );
    const isShortInput = userMessage.trim().length < 10;
    
    if (!isOrderFlow && !isShortInput) {
        const cachedResponse = await checkCache(userMessage);
        if (cachedResponse) return cachedResponse;
    }

    try {
        // C. Fetch products context
        const { data: products } = await supabaseClient
            .from('products')
            .select('name, description, price');

        const productContext = products ? products.map(p => 
            `- ${p.name}: Rs. ${p.price}.`
        ).join('\n') : "No products available.";

        chatHistory.push({ role: 'user', content: userMessage });

        const currentLang = localStorage.getItem('preferred_lang') || 'en';

        // D. Call Edge Function
        const { data, error } = await supabaseClient.functions.invoke('al-rehman-ai', {
            body: { 
                messages: chatHistory, 
                productContext: productContext,
                language: currentLang
            }
        });

        if (error) throw error;

        let aiResponse = data.text;
        
        // E. Extract nested JSON
        const orderJson = extractOrderJson(aiResponse);
        if (orderJson) {
            try {
                const orderTrigger = JSON.parse(orderJson);
                if (orderTrigger.action === 'CREATE_ORDER' && orderTrigger.order_details) {
                    // CLIENT-SIDE SAFEGUARD: Only finalize if user's last message was a confirmation
                    const lastUserMsg = userMessage.trim().toLowerCase();
                    const isConfirmation = ['yes', 'haan', 'ha', 'confirm', 'ok', 'ji', 'ji haan', 'yes please', 'confirmed'].some(w => lastUserMsg.includes(w));
                    
                    if (isConfirmation) {
                        const result = await finalizeOrder(orderTrigger.order_details);
                        aiResponse = aiResponse.replace(orderJson, '').trim();
                        if (aiResponse) aiResponse += '\n\n';
                        aiResponse += result;
                    } else {
                        // AI emitted JSON prematurely — strip it and ask for confirmation
                        aiResponse = aiResponse.replace(orderJson, '').trim();
                        if (!aiResponse) {
                            aiResponse = "Please confirm by replying **YES** to finalize your order.";
                        }
                    }
                }
            } catch (e) { console.error("Parsing Error:", e); }
        } else {
            // F. Save to Cache only if it's a regular message
            saveToCache(userMessage, aiResponse);
        }

        chatHistory.push({ role: 'assistant', content: aiResponse });
        return aiResponse;

    } catch (criticalError) {
        console.error('AI Error:', criticalError);
        return "Assalam-o-Alaikum. Hakeem Usman is busy. Please WhatsApp +92 300 6047058.";
    }
}

function extractOrderJson(text) {
    const marker = '"CREATE_ORDER"';
    const markerIndex = text.indexOf(marker);
    if (markerIndex === -1) return null;
    let start = text.lastIndexOf('{', markerIndex);
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === '{') depth++;
        if (text[i] === '}') depth--;
        if (depth === 0) return text.substring(start, i + 1);
    }
    return null;
}

async function finalizeOrder(details) {
    try {
        // Try multiple search strategies to find the product
        let product = null;
        
        // Strategy 1: Exact ilike match
        const { data: exactMatch } = await supabaseClient
            .from('products')
            .select('id, price, name')
            .ilike('name', `%${details.product_name}%`)
            .limit(1)
            .maybeSingle();
        
        if (exactMatch) {
            product = exactMatch;
        } else {
            // Strategy 2: Try individual words from the product name
            const words = details.product_name.split(/[\s-]+/).filter(w => w.length > 3);
            for (const word of words) {
                const { data: wordMatch } = await supabaseClient
                    .from('products')
                    .select('id, price, name')
                    .ilike('name', `%${word}%`)
                    .limit(1)
                    .maybeSingle();
                if (wordMatch) { product = wordMatch; break; }
            }
        }

        // Use AI-provided price as fallback, then DB price, then 0
        const unitPrice = product?.price || details.price || 0;
        const quantity = details.quantity || 1;
        const totalPrice = unitPrice * quantity;
        const orderNumber = 'ARD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
        
        const orderData = {
            customer_name: details.customer_name,
            customer_phone: details.customer_phone,
            customer_address: details.customer_address,
            product_name: product?.name || details.product_name,
            product_id: product?.id || null,
            quantity: quantity,
            total_price: totalPrice,
            payment_method: details.payment_method,
            payment_screenshot_url: currentScreenshotUrl || null,
            order_status: 'Pending',
            order_number: orderNumber
        };

        const { error } = await supabaseClient.from('orders').insert([orderData]);
        if (error) throw error;

        currentScreenshotUrl = null;
        return `✅ **Order Placed!**\n\n📦 Order Number: **${orderNumber}**\n💰 Total: Rs. ${totalPrice.toLocaleString()}\n\nHakeem Usman will contact you on WhatsApp shortly.`;
    } catch (err) {
        console.error("Order Error:", err);
        return "❌ Problem saving your order. Please WhatsApp Hakeem Usman at +92 300 6047058.";
    }
}

// --- UI Components ---
let isChatOpen = false;

function createChatUI() {
    if (document.getElementById('al-rehman-chat-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'al-rehman-chat-widget';
    widget.className = 'fixed bottom-6 right-6 z-[9999] font-sans';
    
    widget.innerHTML = `
        <button id="chat-bubble" class="group relative bg-emerald-900 text-gold p-4 rounded-full shadow-2xl border-2 border-gold/30 hover:scale-110 hover:rotate-6 transition-all duration-300 flex items-center justify-center">
            <i data-lucide="message-square-plus" id="bubble-icon" class="w-8 h-8"></i>
        </button>

        <div id="chat-window" class="hidden fixed md:absolute bottom-[90px] md:bottom-24 right-4 md:right-0 w-[calc(100vw-2rem)] md:w-[400px] max-h-[calc(100vh-120px)] md:max-h-[600px] h-[70vh] md:h-[600px] bg-stone-50 rounded-3xl shadow-2xl flex flex-col border border-emerald-900/10 overflow-hidden transform origin-bottom-right transition-all duration-300 scale-95 opacity-0 shadow-emerald-900/20">
            <div class="bg-emerald-900 p-6 flex justify-between items-center relative overflow-hidden">
                <div class="flex items-center space-x-3 relative z-10">
                    <div class="w-10 h-10 bg-gold rounded-full flex items-center justify-center shadow-lg">
                        <i data-lucide="leaf" class="text-emerald-900 w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-white font-serif font-bold text-lg leading-none">Al-Rehman AI</h3>
                        <p class="text-gold/70 text-[10px] uppercase tracking-widest mt-1">Hakeem Usman's Assistant</p>
                    </div>
                </div>
                <button id="close-chat" class="text-white/60 hover:text-white transition-colors relative z-10 p-1 hover:bg-white/10 rounded-full">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div id="chat-messages" class="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
                <div class="flex flex-col items-start">
                    <div class="max-w-[85%] bg-emerald-100 text-emerald-900 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm border border-emerald-200/50">
                        Assalam-o-Alaikum! I am the AI assistant of Al-Rehman Dawakhana. How can I help?
                    </div>
                </div>
            </div>

            <div id="chat-helpers" class="hidden px-6 py-3 bg-amber-50 border-t border-amber-100 animate-fade-in">
                <div id="upload-controls" class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-amber-800 uppercase">Upload Payment Proof</span>
                    <label class="cursor-pointer bg-emerald-700 text-white px-3 py-1 rounded-full text-[10px] hover:bg-emerald-800 transition-colors">
                        Choose File
                        <input type="file" id="screenshot-upload" class="hidden" accept="image/*">
                    </label>
                </div>
                <div id="upload-status" class="text-[9px] text-amber-600 mt-1 hidden italic font-bold"></div>
            </div>

            <div id="typing-indicator" class="hidden px-6 py-2">
                <div class="flex items-center space-x-2 text-emerald-800/60 italic text-xs">
                    <div class="flex space-x-1">
                        <div class="w-1 h-1 bg-emerald-600 rounded-full animate-bounce"></div>
                        <div class="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                    <span>Hakeem AI is thinking...</span>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-emerald-900/5">
                <div class="flex items-center bg-stone-100 rounded-2xl px-4 py-2 border border-stone-200 focus-within:border-gold transition-colors">
                    <input type="text" id="chat-input" placeholder="Ask about health..." class="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-stone-800" autocomplete="off">
                    <button id="send-chat" class="p-2 text-emerald-900 hover:text-gold transition-colors disabled:opacity-30" disabled>
                        <i data-lucide="send" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(widget);
    lucide.createIcons({ props: { "stroke-width": 2.5 } });

    const bubble = document.getElementById('chat-bubble');
    const windowEl = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');
    const typing = document.getElementById('typing-indicator');
    const helperArea = document.getElementById('chat-helpers');
    const screenshotInput = document.getElementById('screenshot-upload');
    const uploadStatus = document.getElementById('upload-status');
    const uploadControls = document.getElementById('upload-controls');

    bubble.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            windowEl.classList.remove('hidden');
            setTimeout(() => { windowEl.classList.add('scale-100', 'opacity-100'); windowEl.classList.remove('scale-95', 'opacity-0'); }, 10);
        } else {
            windowEl.classList.remove('scale-100', 'opacity-100');
            windowEl.classList.add('scale-95', 'opacity-0');
            setTimeout(() => windowEl.classList.add('hidden'), 300);
        }
    });

    closeBtn.addEventListener('click', () => {
        isChatOpen = false;
        windowEl.classList.remove('scale-100', 'opacity-100');
        windowEl.classList.add('scale-95', 'opacity-0');
        setTimeout(() => windowEl.classList.add('hidden'), 300);
    });

    input.addEventListener('input', () => sendBtn.disabled = !input.value.trim());

    screenshotInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        uploadStatus.classList.remove('hidden');
        uploadStatus.innerText = "Processing receipt...";
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `chat-${Date.now()}.${fileExt}`;
            const filePath = `proofs/${fileName}`;
            const { data, error } = await supabaseClient.storage.from('payment-screenshots').upload(filePath, file);
            if (error) throw error;
            const { data: publicUrl } = supabaseClient.storage.from('payment-screenshots').getPublicUrl(filePath);
            currentScreenshotUrl = publicUrl.publicUrl;
            
            // Hide controls and show clean success message
            uploadControls.classList.add('hidden');
            uploadStatus.classList.remove('hidden');
            uploadStatus.innerHTML = "✅ Receipt received! Please confirm your order.";
            
            handleSend("I have uploaded the payment screenshot proof.");
        } catch (err) { 
            uploadStatus.classList.remove('hidden');
            uploadStatus.innerText = "❌ Upload failed."; 
        }
    });

    const addMessage = (text, isUser = false) => {
        const wrapper = document.createElement('div');
        wrapper.className = `flex flex-col ${isUser ? 'items-end' : 'items-start'}`;
        const bubbleClass = isUser ? 'bg-gold text-emerald-950 rounded-tr-none' : 'bg-emerald-100 text-emerald-900 rounded-tl-none border border-emerald-200/50';
        wrapper.innerHTML = `
            <div class="max-w-[85%] ${bubbleClass} p-4 rounded-2xl shadow-sm text-sm">
                ${text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}
            </div>
            <span class="text-[10px] text-stone-400 mt-1 ${isUser ? 'mr-1' : 'ml-1'} uppercase">
                ${isUser ? 'You' : 'Hakeem AI'}
            </span>
        `;
        msgArea.appendChild(wrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
        const lowerText = text.toLowerCase();
        if (!isUser && (lowerText.includes('upload') || lowerText.includes('screenshot') || lowerText.includes('proof'))) {
            helperArea.classList.remove('hidden');
            // Reset controls visibility if AI is asking again
            if (!currentScreenshotUrl) {
                uploadControls.classList.remove('hidden');
                uploadStatus.classList.add('hidden');
            }
        } else if (!isUser && (lowerText.includes('cod') || lowerText.includes('payment method'))) {
            helperArea.classList.add('hidden');
        } else if (isUser) {
            helperArea.classList.add('hidden');
        }
    };

    const handleSend = async (forcedText = null) => {
        const text = forcedText || input.value.trim();
        if (!text) return;
        if (!forcedText) input.value = '';
        sendBtn.disabled = true;
        addMessage(text, true);
        typing.classList.remove('hidden');
        msgArea.scrollTop = msgArea.scrollHeight;
        const aiResponse = await askAlRehmanAI(text);
        typing.classList.add('hidden');
        addMessage(aiResponse, false);
        sendBtn.disabled = !input.value.trim();
    };

    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });
}

// Initialize
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', createChatUI); } else { createChatUI(); }

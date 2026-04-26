/**
 * Al-Rehman Dawakhana AI Chat Assistant
 * Auto-Buy Version: Handles multi-turn orders and secure processing.
 */

let chatHistory = [];
let pendingOrderData = null;
let currentScreenshotUrl = null;

// --- AI Logic (Calling Edge Function) ---
async function askAlRehmanAI(userMessage) {
    try {
        // 1. Fetch products (minimal context)
        const { data: products } = await supabaseClient
            .from('products')
            .select('name, description, price');

        const productContext = products ? products.map(p => 
            `- ${p.name}: Rs. ${p.price}.`
        ).join('\n') : "No products available.";

        // 2. Prepare History
        chatHistory.push({ role: 'user', content: userMessage });

        // 3. Call the Supabase Edge Function
        const { data, error } = await supabaseClient.functions.invoke('al-rehman-ai', {
            body: { 
                messages: chatHistory, 
                productContext: productContext 
            }
        });

        if (error) throw error;

        let aiResponse = data.text;
        
        // 4. Intercept JSON for Order Creation
        if (aiResponse.includes('{"action": "CREATE_ORDER"')) {
            try {
                const jsonStart = aiResponse.indexOf('{');
                const jsonEnd = aiResponse.lastIndexOf('}') + 1;
                const jsonStr = aiResponse.substring(jsonStart, jsonEnd);
                const orderTrigger = JSON.parse(jsonStr);
                
                // Process Order
                const result = await finalizeOrder(orderTrigger.order_details);
                aiResponse = aiResponse.substring(0, jsonStart).trim() + "\n\n" + result;
            } catch (e) {
                console.error("JSON Parsing Error:", e);
            }
        }

        chatHistory.push({ role: 'assistant', content: aiResponse });
        return aiResponse;

    } catch (criticalError) {
        console.error('AI: Error:', criticalError);
        return "Assalam-o-Alaikum. I am having trouble. Please contact Hakeem Usman on WhatsApp (+92 300 6047058).";
    }
}

// --- Order Finalization ---
async function finalizeOrder(details) {
    try {
        // Find product ID from name
        const { data: product } = await supabaseClient
            .from('products')
            .select('id, price')
            .ilike('name', `%${details.product_name}%`)
            .single();

        const orderNumber = `ARB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const orderData = {
            customer_name: details.customer_name,
            customer_phone: details.customer_phone,
            delivery_address: details.delivery_address,
            product_name: details.product_name,
            product_id: product?.id || null,
            quantity: details.quantity || 1,
            total_amount: (product?.price || 0) * (details.quantity || 1),
            payment_method: details.payment_method,
            payment_screenshot_url: currentScreenshotUrl, // Set from global state
            status: 'Pending',
            order_number: orderNumber // Note: Added to migration before
        };

        const { error } = await supabaseClient.from('orders').insert([orderData]);

        if (error) throw error;

        // Clear state
        currentScreenshotUrl = null;
        
        return `✅ **Order Confirmed!**\n\nYour Order ID is: **${orderNumber}**.\nHakeem Usman will contact you on WhatsApp shortly to verify. JazakAllah for choosing Al-Rehman Dawakhana.`;
    } catch (err) {
        console.error("Order Creation Failed:", err);
        return "❌ I am sorry, I couldn't save your order. Please try again or contact us directly.";
    }
}

// --- UI Components & State ---
let isChatOpen = false;

function createChatUI() {
    if (document.getElementById('al-rehman-chat-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'al-rehman-chat-widget';
    widget.className = 'fixed bottom-6 right-6 z-[9999] font-sans';
    
    widget.innerHTML = `
        <!-- Chat Bubble -->
        <button id="chat-bubble" class="group relative bg-emerald-900 text-gold p-4 rounded-full shadow-2xl border-2 border-gold/30 hover:scale-110 hover:rotate-6 transition-all duration-300 flex items-center justify-center">
            <i data-lucide="message-square-plus" id="bubble-icon" class="w-8 h-8"></i>
        </button>

        <!-- Chat Window -->
        <div id="chat-window" class="hidden absolute bottom-20 right-0 w-[350px] md:w-[400px] max-h-[550px] h-[70vh] bg-stone-50 rounded-3xl shadow-2xl flex flex-col border border-emerald-900/10 overflow-hidden transform origin-bottom-right transition-all duration-300 scale-95 opacity-0">
            <!-- Header -->
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

            <!-- Messages Area -->
            <div id="chat-messages" class="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
                <div class="flex flex-col items-start">
                    <div class="max-w-[85%] bg-emerald-100 text-emerald-900 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm border border-emerald-200/50">
                        Assalam-o-Alaikum! I am the AI assistant of Al-Rehman Dawakhana. I can help you find products and even place your order. How can I help?
                    </div>
                </div>
            </div>

            <!-- Helper Area (Screenshot Upload) -->
            <div id="chat-helpers" class="hidden px-6 py-3 bg-amber-50 border-t border-amber-100 animate-fade-in">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-amber-800 uppercase">Upload Payment Proof</span>
                    <label class="cursor-pointer bg-emerald-700 text-white px-3 py-1 rounded-full text-[10px] hover:bg-emerald-800 transition-colors">
                        Choose File
                        <input type="file" id="screenshot-upload" class="hidden" accept="image/*">
                    </label>
                </div>
                <div id="upload-status" class="text-[9px] text-amber-600 mt-1 hidden italic">Uploading...</div>
            </div>

            <!-- Typing Indicator -->
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

            <!-- Input Area -->
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

    const toggleChat = () => {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            windowEl.classList.remove('hidden');
            setTimeout(() => {
                windowEl.classList.add('scale-100', 'opacity-100');
                windowEl.classList.remove('scale-95', 'opacity-0');
            }, 10);
        } else {
            windowEl.classList.remove('scale-100', 'opacity-100');
            windowEl.classList.add('scale-95', 'opacity-0');
            setTimeout(() => windowEl.classList.add('hidden'), 300);
        }
    };

    bubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    input.addEventListener('input', () => sendBtn.disabled = !input.value.trim());

    // Screenshot Upload Handler
    screenshotInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadStatus.classList.remove('hidden');
        uploadStatus.innerText = "Processing receipt...";

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `chat-${Date.now()}.${fileExt}`;
            const filePath = `proofs/${fileName}`;

            const { data, error } = await supabaseClient.storage
                .from('payment-screenshots')
                .upload(filePath, file);

            if (error) throw error;

            const { data: publicUrl } = supabaseClient.storage
                .from('payment-screenshots')
                .getPublicUrl(filePath);

            currentScreenshotUrl = publicUrl.publicUrl;
            uploadStatus.innerText = "✅ Receipt received! Please confirm your order.";
            
            // Inform the AI that the screenshot is uploaded
            handleSend("I have uploaded the payment screenshot proof.");
        } catch (err) {
            console.error("Upload failed:", err);
            uploadStatus.innerText = "❌ Upload failed. Please try again.";
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

        // Automatically show/hide helper area based on AI keywords
        if (!isUser && (text.toLowerCase().includes('upload') || text.toLowerCase().includes('screenshot') || text.toLowerCase().includes('proof'))) {
            helperArea.classList.remove('hidden');
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
    };

    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatUI);
} else {
    createChatUI();
}

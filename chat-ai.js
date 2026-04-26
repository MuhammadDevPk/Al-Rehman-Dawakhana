/**
 * Al-Rehman Dawakhana AI Chat Assistant
 * Secure Version: Calls Supabase Edge Function to keep API Keys hidden.
 */

// --- AI Logic (Calling Edge Function) ---
async function askAlRehmanAI(userMessage) {
    try {
        // 1. Fetch products for real-time knowledge (frontend still handles this to save Edge Function complexity)
        const { data: products, error: productError } = await supabaseClient
            .from('products')
            .select('name, description, price, category');

        if (productError) console.error('Supabase Product Fetch Error:', productError);

        const productContext = products ? products.map(p => 
            `- ${p.name}: ${p.description}. Price: Rs. ${p.price}.`
        ).join('\n') : "No products available.";

        // 2. Call the Supabase Edge Function (The Secure way)
        // This function uses your Vault Secrets internally
        const { data, error } = await supabaseClient.functions.invoke('al-rehman-ai', {
            body: { 
                userMessage: userMessage, 
                productContext: productContext 
            }
        });

        if (error) {
            console.error('Edge Function Error:', error);
            throw new Error("Edge Function call failed");
        }

        return data.text || "I'm sorry, I couldn't generate a response. Please try again.";

    } catch (criticalError) {
        console.error('AI: Critical failure in askAlRehmanAI:', criticalError);
        return "Assalam-o-Alaikum. I am having trouble connecting to my knowledge base. Please WhatsApp Hakeem Usman (+92 300 6047058).";
    }
}

// --- UI Components & State ---
let isChatOpen = false;

function createChatUI() {
    // Check if widget already exists
    if (document.getElementById('al-rehman-chat-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'al-rehman-chat-widget';
    widget.className = 'fixed bottom-6 right-6 z-[9999] font-sans';
    
    widget.innerHTML = `
        <!-- Chat Bubble -->
        <button id="chat-bubble" class="group relative bg-emerald-900 text-gold p-4 rounded-full shadow-2xl border-2 border-gold/30 hover:scale-110 hover:rotate-6 transition-all duration-300 flex items-center justify-center">
            <div class="absolute -top-12 right-0 bg-emerald-900 text-white text-xs py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg border border-gold/20">
                Chat with Hakeem Usman's AI
            </div>
            <i data-lucide="message-square-plus" id="bubble-icon" class="w-8 h-8"></i>
        </button>

        <!-- Chat Window -->
        <div id="chat-window" class="hidden absolute bottom-20 right-0 w-[350px] md:w-[400px] max-h-[550px] h-[70vh] bg-stone-50 rounded-3xl shadow-2xl flex flex-col border border-emerald-900/10 overflow-hidden transform origin-bottom-right transition-all duration-300 scale-95 opacity-0">
            <!-- Header -->
            <div class="bg-emerald-900 p-6 flex justify-between items-center relative overflow-hidden">
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent"></div>
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
            <div id="chat-messages" class="flex-1 p-6 overflow-y-auto space-y-4 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
                <div class="flex flex-col items-start">
                    <div class="max-w-[85%] bg-emerald-100 text-emerald-900 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm border border-emerald-200/50">
                        Assalam-o-Alaikum! I am the AI assistant of Al-Rehman Dawakhana. How can I help you with your health today?
                    </div>
                    <span class="text-[10px] text-stone-400 mt-1 ml-1 uppercase">Hakeem AI</span>
                </div>
            </div>

            <!-- Typing Indicator -->
            <div id="typing-indicator" class="hidden px-6 py-2 bg-transparent">
                <div class="flex items-center space-x-2 text-emerald-800/60 italic text-xs">
                    <div class="flex space-x-1">
                        <div class="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></div>
                        <div class="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        <div class="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                    </div>
                    <span>Hakeem is thinking...</span>
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
                <p class="text-[9px] text-center text-stone-400 mt-2 uppercase tracking-tighter italic">Personalized Healing by Nature</p>
            </div>
        </div>
    `;

    document.body.appendChild(widget);
    lucide.createIcons({ props: { "stroke-width": 2.5 } });

    // Event Listeners
    const bubble = document.getElementById('chat-bubble');
    const windowEl = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-chat');
    const msgArea = document.getElementById('chat-messages');
    const typing = document.getElementById('typing-indicator');

    const toggleChat = () => {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            windowEl.classList.remove('hidden');
            setTimeout(() => {
                windowEl.classList.add('scale-100', 'opacity-100');
                windowEl.classList.remove('scale-95', 'opacity-0');
            }, 10);
            bubble.querySelector('i').setAttribute('data-lucide', 'chevron-down');
        } else {
            windowEl.classList.remove('scale-100', 'opacity-100');
            windowEl.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                windowEl.classList.add('hidden');
            }, 300);
            bubble.querySelector('i').setAttribute('data-lucide', 'message-square-plus');
        }
        lucide.createIcons();
    };

    bubble.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    input.addEventListener('input', () => {
        sendBtn.disabled = !input.value.trim();
    });

    const addMessage = (text, isUser = false) => {
        const wrapper = document.createElement('div');
        wrapper.className = `flex flex-col ${isUser ? 'items-end' : 'items-start'}`;
        
        const bubbleClass = isUser 
            ? 'bg-gold text-emerald-950 rounded-tr-none' 
            : 'bg-emerald-100 text-emerald-900 rounded-tl-none border border-emerald-200/50';
        
        wrapper.innerHTML = `
            <div class="max-w-[85%] ${bubbleClass} p-4 rounded-2xl shadow-sm text-sm">
                ${text.replace(/\n/g, '<br>')}
            </div>
            <span class="text-[10px] text-stone-400 mt-1 ${isUser ? 'mr-1' : 'ml-1'} uppercase">
                ${isUser ? 'You' : 'Hakeem AI'}
            </span>
        `;
        
        msgArea.appendChild(wrapper);
        msgArea.scrollTop = msgArea.scrollHeight;
    };

    const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        sendBtn.disabled = true;
        addMessage(text, true);

        typing.classList.remove('hidden');
        msgArea.scrollTop = msgArea.scrollHeight;

        const aiResponse = await askAlRehmanAI(text);
        
        typing.classList.add('hidden');
        addMessage(aiResponse, false);
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// Initialize on Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatUI);
} else {
    createChatUI();
}

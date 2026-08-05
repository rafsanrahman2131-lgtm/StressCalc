/**
 * MindSync AI — Separate Interactive AI Chatbot Controller
 */

class MindSyncAI {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        const trigger = document.getElementById('btnMindSyncAI') || document.querySelector('[data-action="mindsync"]');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.openChat();
            });
        }
    }

    openChat() {
        let modal = document.getElementById('mindsyncChatModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mindsyncChatModal';
            modal.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 380px;
                height: 520px;
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(34, 197, 94, 0.3);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: inherit;
            `;

            modal.innerHTML = `
                <div style="background: rgba(34, 197, 94, 0.12); padding: 14px 16px; border-bottom: 1px solid rgba(34, 197, 94, 0.25); display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e;"></div>
                        <span style="font-weight: 800; color: #ffffff; font-size: 1rem;">🧠 MindSync AI Assistant</span>
                    </div>
                    <button id="closeMindSyncBtn" style="background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer;">✕</button>
                </div>
                <div id="mindsyncChatMessages" style="flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;">
                    <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; padding: 10px 12px; border-radius: 10px; font-size: 0.83rem; max-width: 85%;">
                        <strong>MindSync AI:</strong> Hello! I am your AI mental clarity companion. How can I support your focus or stress recovery today?
                    </div>
                </div>
                <div style="padding: 12px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0, 0, 0, 0.2); display: flex; gap: 8px;">
                    <input type="text" id="mindsyncInput" placeholder="Type a message..." style="flex: 1; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 8px 12px; color: #ffffff; font-size: 0.85rem; outline: none;">
                    <button id="mindsyncSendBtn" style="background: #22c55e; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer;">Send</button>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('closeMindSyncBtn').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            const sendMsg = async () => {
                const input = document.getElementById('mindsyncInput');
                const box = document.getElementById('mindsyncChatMessages');
                if (!input || !box) return;
                const text = input.value.trim();
                if (!text) return;

                const userMsg = document.createElement('div');
                userMsg.style.cssText = 'background: rgba(255, 255, 255, 0.1); color: #ffffff; padding: 10px 12px; border-radius: 10px; font-size: 0.83rem; max-width: 85%; align-self: flex-end;';
                userMsg.innerText = text;
                box.appendChild(userMsg);
                input.value = '';
                box.scrollTop = box.scrollHeight;

                try {
                    const res = await fetch('/api/mindsync/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const aiMsg = document.createElement('div');
                        aiMsg.style.cssText = 'background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; padding: 10px 12px; border-radius: 10px; font-size: 0.83rem; max-width: 85%; align-self: flex-start;';
                        aiMsg.innerHTML = `<strong>MindSync AI:</strong> ${data.reply}`;
                        box.appendChild(aiMsg);
                        box.scrollTop = box.scrollHeight;
                    }
                } catch(e) {
                    // Fallback response
                }
            };

            document.getElementById('mindsyncSendBtn').addEventListener('click', sendMsg);
            document.getElementById('mindsyncInput').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendMsg();
            });
        }
        modal.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mindSyncAI = new MindSyncAI();
});

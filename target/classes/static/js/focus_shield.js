/**
 * Focus Shield — Customizable Focus Session Timer
 */

class FocusShieldTimer {
    constructor() {
        this.durationMinutes = 25;
        this.remainingSeconds = 25 * 60;
        this.timerId = null;
        this.isRunning = false;
        this.init();
    }

    init() {
        const trigger = document.getElementById('btnFocusShield') || document.querySelector('[data-action="focus-shield"]');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModal();
            });
        }
    }

    openModal() {
        let modal = document.getElementById('focusShieldModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'focusShieldModal';
            modal.style.cssText = `
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(9, 9, 11, 0.85);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            modal.innerHTML = `
                <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 2rem; width: 90%; max-width: 420px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.8); position: relative;">
                    <button id="closeFocusShieldBtn" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #94a3b8; font-size: 1.4rem; cursor: pointer;">✕</button>
                    <h2 style="margin: 0 0 6px 0; color: #22c55e; font-size: 1.5rem; font-weight: 800;">🛡️ Focus Shield Active</h2>
                    <p style="margin: 0 0 1.5rem 0; font-size: 0.85rem; color: #94a3b8;">Block out digital noise and lock in single-task concentration.</p>

                    <div id="focusShieldDisplay" style="font-size: 3.8rem; font-weight: 900; color: #ffffff; font-family: monospace; line-height: 1; margin-bottom: 1.5rem;">
                        25:00
                    </div>

                    <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <label style="font-size: 0.85rem; color: #e2e8f0; font-weight: 600;">Duration (min):</label>
                        <input type="number" id="focusShieldDurationInput" value="25" min="1" max="180" style="width: 70px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 6px; color: #fff; font-size: 1rem; text-align: center;">
                    </div>

                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <button id="btnFocusShieldStart" style="background: #22c55e; color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-size: 0.95rem; font-weight: 800; cursor: pointer; flex: 1;">Start Shield</button>
                        <button id="btnFocusShieldReset" style="background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 10px 20px; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer;">Reset</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('closeFocusShieldBtn').addEventListener('click', () => {
                modal.style.display = 'none';
            });

            const durationInput = document.getElementById('focusShieldDurationInput');
            if (durationInput) {
                durationInput.addEventListener('change', (e) => {
                    let val = parseInt(e.target.value) || 25;
                    this.durationMinutes = Math.max(1, Math.min(180, val));
                    if (!this.isRunning) {
                        this.remainingSeconds = this.durationMinutes * 60;
                        this.updateDisplay();
                    }
                });
            }

            document.getElementById('btnFocusShieldStart').addEventListener('click', () => {
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            });

            document.getElementById('btnFocusShieldReset').addEventListener('click', () => {
                this.reset();
            });
        }
        modal.style.display = 'flex';
    }

    start() {
        this.isRunning = true;
        const btn = document.getElementById('btnFocusShieldStart');
        if (btn) btn.textContent = 'Pause';

        this.timerId = setInterval(() => {
            if (this.remainingSeconds > 0) {
                this.remainingSeconds--;
                this.updateDisplay();
            } else {
                this.pause();
                alert('🛡️ Focus Shield Session Complete! Great work maintaining single-task flow.');
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        if (this.timerId) clearInterval(this.timerId);
        const btn = document.getElementById('btnFocusShieldStart');
        if (btn) btn.textContent = 'Resume';
    }

    reset() {
        this.pause();
        this.remainingSeconds = this.durationMinutes * 60;
        this.updateDisplay();
        const btn = document.getElementById('btnFocusShieldStart');
        if (btn) btn.textContent = 'Start Shield';
    }

    updateDisplay() {
        const display = document.getElementById('focusShieldDisplay');
        if (display) {
            const m = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
            const s = (this.remainingSeconds % 60).toString().padStart(2, '0');
            display.textContent = `${m}:${s}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.focusShieldTimer = new FocusShieldTimer();
});

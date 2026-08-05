/**
 * Global Glassmorphic Top Header Navigation Component
 */

class GlobalHeaderNav {
    constructor() {
        this.init();
    }

    init() {
        const headerEl = document.getElementById('globalAppHeader') || document.querySelector('.global-app-header');
        if (!headerEl) return;

        headerEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); width: 100%;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <a href="dashboard.html" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #22c55e, #16a34a); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900;">⚡</div>
                        <span style="font-size: 1.1rem; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">StressCalculator</span>
                    </a>
                </div>

                <div style="display: flex; align-items: center; gap: 16px;">
                    <!-- Focus Shield Quick Action -->
                    <button id="btnFocusShieldNav" data-action="focus-shield" style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86efac; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        🛡️ Focus Shield
                    </button>

                    <!-- MindSync AI Quick Action -->
                    <button id="btnMindSyncNav" data-action="mindsync" style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                        🧠 MindSync AI
                    </button>

                    <!-- Notification Bell Icon Dropdown -->
                    <div style="position: relative;">
                        <button id="navBellBtn" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: #ffffff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;">
                            🔔
                            <span id="navBellBadge" style="position: absolute; top: -2px; right: -2px; background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 900; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">3</span>
                        </button>
                    </div>

                    <!-- User Avatar Profile Link -->
                    <a href="dashboard.html#profile" style="text-decoration: none;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: 2px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 0.9rem;">
                            U
                        </div>
                    </a>
                </div>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.globalHeaderNav = new GlobalHeaderNav();
});

/**
 * StressCalculator — Behavioral Telemetry Engine
 * Smooth Continuous Cursor Dynamics (100% Always Active)
 * Normal mouse movement ALWAYS maintains/rewards focus & NEVER drops score sharply.
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 92,
            contextSwitches: 0,
            recentSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 9.2,
            isFocused: true,
            ambientNoiseDb: 42,
            tabDensity: 6,
            mouseSpeedPxSec: 0,
            mouseDistancePx: 0,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now()
        };

        this.init();
    }

    init() {
        // 1. Continuous 1-second Loop (ALWAYS RUNS 100% OF THE TIME)
        setInterval(() => {
            if (this.state.isFocused) {
                this.state.uninterruptedSeconds++;
            }
            
            // Gradually decay any accumulated jitter or switch penalties over time
            if (this.state.mouseJitterCount > 0) {
                this.state.mouseJitterCount--;
            }

            if (this.state.uninterruptedSeconds > 0 && this.state.uninterruptedSeconds % 12 === 0) {
                if (this.state.recentSwitches > 0) {
                    this.state.recentSwitches--;
                }
            }

            this.simulateAmbientNoise();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }, 1000);

        // 2. Window Focus & Blur Listeners
        window.addEventListener('blur', () => {
            this.state.isFocused = false;
            this.state.contextSwitches++;
            this.state.recentSwitches++;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        window.addEventListener('focus', () => {
            this.state.isFocused = true;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 3. Continuous Mouse Movement Listener (ALWAYS ACTIVE)
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Initial UI Render
        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    /**
     * Smooth Mouse Movement Handler:
     * Normal cursor movement across screen is 100% healthy and boosts engagement.
     * Never penalizes normal mouse movements.
     */
    handleMouseMove(e) {
        const now = Date.now();
        const dt = (now - this.state.lastMouseTime) / 1000;
        
        if (dt > 0.02) {
            const dx = e.clientX - this.state.lastMousePos.x;
            const dy = e.clientY - this.state.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const speed = Math.round(dist / dt);
                this.state.mouseSpeedPxSec = speed;
                this.state.mouseDistancePx += Math.round(dist);

                // Moving the mouse proves active human engagement
                if (this.state.isFocused) {
                    // Small continuous engagement reward (+0.02s per move)
                    this.state.uninterruptedSeconds += 0.02;
                }

                // Only extreme violent shaking (> 6500 px/sec) registers as erratic jitter
                if (speed > 6500) {
                    this.state.mouseJitterCount = Math.min(3, this.state.mouseJitterCount + 1);
                }
            }

            this.state.lastMousePos = { x: e.clientX, y: e.clientY };
            this.state.lastMouseTime = now;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }
    }

    simulateAmbientNoise() {
        const base = 42;
        const delta = Math.floor(Math.random() * 6) - 2;
        this.state.ambientNoiseDb = Math.max(35, Math.min(55, base + delta));
        this.state.tabDensity = 6;
    }

    /**
     * Calibrated Focus & Bandwidth Formula:
     * - Base Focus = 9.0
     * - Flow Reward: +0.1 per 8 seconds of continuous active engagement
     * - Penalty: -0.15 per recent active context switch
     * - Minimum floor = 5.0, Max = 10.0
     */
    updateDerivedMetrics() {
        const baseline = 9.0;
        
        // Active Flow Reward (+0.1 focus per 8s of engagement)
        const flowReward = (this.state.uninterruptedSeconds / 8.0) * 0.1;
        const switchPenalty = this.state.recentSwitches * 0.15;
        const jitterPenalty = (this.state.mouseJitterCount * 0.05);

        let calculatedFocus = baseline + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(5.0, Math.min(10.0, Math.round(calculatedFocus * 10) / 10));

        // Cognitive Bandwidth percentage (60% - 100%)
        let baseBandwidth = Math.round(this.state.focusIndex * 9.8);
        let flowBonusPct = Math.floor(this.state.uninterruptedSeconds / 4); // +1% bandwidth every 4s
        
        let calculatedBandwidth = baseBandwidth + flowBonusPct;
        this.state.cognitiveBandwidth = Math.max(60, Math.min(100, calculatedBandwidth));
    }

    updateDashboardUI() {
        const elBandwidth = document.getElementById('ui-bandwidth') || document.getElementById('val-bandwidth');
        const elSwitches = document.getElementById('ui-switches') || document.getElementById('val-switches');
        const elFocus = document.getElementById('ui-focus') || document.getElementById('val-focus');
        const elNoise = document.getElementById('ui-noise') || document.getElementById('val-noise');
        const elTabs = document.getElementById('ui-tabs') || document.getElementById('val-tabs');

        if (elBandwidth) elBandwidth.innerText = `${this.state.cognitiveBandwidth}%`;
        if (elSwitches) elSwitches.innerText = this.state.contextSwitches;

        if (elFocus) {
            let color = "#22c55e"; // Green
            if (this.state.focusIndex < 6.0) color = "#ef4444"; // Red
            else if (this.state.focusIndex < 8.0) color = "#f59e0b"; // Amber

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.4s ease;">${this.state.focusIndex.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        }

        if (elNoise) elNoise.innerText = `${this.state.ambientNoiseDb} dB`;
        if (elTabs) elTabs.innerText = `${this.state.tabDensity} open`;

        const elCursorStatus = document.getElementById('ui-cursor-status');
        if (elCursorStatus) {
            elCursorStatus.innerText = `${this.state.mouseSpeedPxSec} px/s (Active)`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

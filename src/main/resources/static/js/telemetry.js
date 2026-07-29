/**
 * StressCalculator — Behavioral Telemetry Engine
 * Dynamic Real-Time Cognitive Bandwidth & Focus Index Model
 * Ensures Cognitive Bandwidth dynamically fluctuates and updates in real-time.
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 88,
            contextSwitches: 0,
            recentSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 8.8,
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
        // 1. Continuous 1-second Loop (Updates metrics & DOM live every second)
        setInterval(() => {
            if (this.state.isFocused) {
                this.state.uninterruptedSeconds++;
            }
            
            if (this.state.mouseJitterCount > 0) {
                this.state.mouseJitterCount--;
            }

            if (this.state.uninterruptedSeconds > 0 && this.state.uninterruptedSeconds % 10 === 0) {
                if (this.state.recentSwitches > 0) {
                    this.state.recentSwitches--;
                }
            }

            this.simulateAmbientNoise();
            this.updateDerivedMetrics();
            this.updateDashboardUI();

            // Stream live point to Chart.js graph
            if (typeof window.pushLiveChartPoint === 'function') {
                window.pushLiveChartPoint(this.state.focusIndex);
            }
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

        // 3. Continuous Mouse Movement Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

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

                if (this.state.isFocused) {
                    // Continuous work engagement reward
                    this.state.uninterruptedSeconds += 0.03;
                }

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
        const delta = Math.floor(Math.random() * 8) - 4; // Dynamic sound variation (+/- 4dB)
        this.state.ambientNoiseDb = Math.max(34, Math.min(58, base + delta));
        this.state.tabDensity = 6;
    }

    /**
     * Fully Dynamic Real-Time Metrics Engine:
     * Focus Index (3.5 - 10.0)
     * Cognitive Bandwidth (40% - 98%)
     * Visibly responds in real-time to focus duration, context switches, noise & cursor dynamics!
     */
    updateDerivedMetrics() {
        const baselineFocus = 8.5;
        
        // Flow reward: +0.1 per 6s of active engagement
        const flowReward = (this.state.uninterruptedSeconds / 6.0) * 0.1;
        const switchPenalty = this.state.recentSwitches * 0.25;
        const jitterPenalty = (this.state.mouseJitterCount * 0.08);

        let calculatedFocus = baselineFocus + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(4.0, Math.min(10.0, Math.round(calculatedFocus * 10) / 10));

        // Dynamic Cognitive Bandwidth formula:
        // Focus component (0-100) - Recent Switches penalty - Noise load - Tremor load + Active flow bonus
        const focusComp = this.state.focusIndex * 9.5;
        const switchComp = this.state.recentSwitches * 3.5;
        const noiseComp = (this.state.ambientNoiseDb - 35) * 0.3;
        const flowBonus = Math.min(12, Math.floor(this.state.uninterruptedSeconds / 3));

        let rawBandwidth = Math.round(focusComp - switchComp - noiseComp + flowBonus);
        this.state.cognitiveBandwidth = Math.max(40, Math.min(98, rawBandwidth));
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

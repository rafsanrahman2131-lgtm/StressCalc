/**
 * StressCalculator — Behavioral Telemetry Engine
 * Active Cursor Dynamics & Motion Stability Tracking
 * Analyzes mouse velocity, active engagement, and erratic tremor jitter.
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 90,
            contextSwitches: 0,
            recentSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 9.0,
            isFocused: true,
            ambientNoiseDb: 42,
            tabDensity: 6,
            mouseSpeedPxSec: 0,
            mouseDistancePx: 0,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now()
        };

        this.flowTimer = null;
        this.init();
    }

    init() {
        // 1. Flow State & Motion Timer
        this.startFlowTimer();

        // 2. Window Blur & Focus Event Listeners
        window.addEventListener('blur', () => {
            this.state.isFocused = false;
            this.state.contextSwitches++;
            this.state.recentSwitches++;
            this.stopFlowTimer();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        window.addEventListener('focus', () => {
            this.state.isFocused = true;
            this.startFlowTimer();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 3. Real-Time Cursor Dynamics Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // 4. Periodic UI Sync & Decay (Every 2 seconds)
        setInterval(() => {
            this.simulateAmbientNoise();
            this.decayRecentSwitches();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }, 2000);

        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    startFlowTimer() {
        if (!this.flowTimer) {
            this.flowTimer = setInterval(() => {
                if (this.state.isFocused) {
                    this.state.uninterruptedSeconds++;
                    
                    // Decaying jitter over time if cursor stabilizes
                    if (this.state.mouseJitterCount > 0 && this.state.uninterruptedSeconds % 5 === 0) {
                        this.state.mouseJitterCount--;
                    }

                    this.updateDerivedMetrics();
                    this.updateDashboardUI();
                }
            }, 1000);
        }
    }

    stopFlowTimer() {
        if (this.flowTimer) {
            clearInterval(this.flowTimer);
            this.flowTimer = null;
        }
    }

    decayRecentSwitches() {
        if (this.state.isFocused && this.state.uninterruptedSeconds > 0 && this.state.uninterruptedSeconds % 15 === 0) {
            if (this.state.recentSwitches > 0) {
                this.state.recentSwitches--;
            }
        }
    }

    /**
     * Active Cursor Movement Analyzer:
     * Calculates pixel distance and speed (px/sec).
     * Healthy active movement (100 - 1500 px/s) rewards engagement!
     * High erratic movement (> 2500 px/s) triggers jitter penalty.
     */
    handleMouseMove(e) {
        const now = Date.now();
        const dt = (now - this.state.lastMouseTime) / 1000;
        
        if (dt > 0.03) {
            const dx = e.clientX - this.state.lastMousePos.x;
            const dy = e.clientY - this.state.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const speed = Math.round(dist / dt);
                this.state.mouseSpeedPxSec = speed;
                this.state.mouseDistancePx += Math.round(dist);

                // Healthy intentional cursor movement boosts flow engagement
                if (speed >= 100 && speed <= 1800) {
                    if (this.state.isFocused) {
                        this.state.uninterruptedSeconds += 0.05; // Engagement bonus
                    }
                }

                // Rapid erratic movement / tremor (> 2500 px/sec)
                if (speed > 2500) {
                    this.state.mouseJitterCount = Math.min(10, this.state.mouseJitterCount + 1);
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
        const delta = Math.floor(Math.random() * 8) - 3;
        this.state.ambientNoiseDb = Math.max(32, Math.min(65, base + delta));
        this.state.tabDensity = 6;
    }

    updateDerivedMetrics() {
        const baseline = 8.5;
        
        // Active Flow Reward (+1.0 focus per 100s of continuous work)
        const flowReward = (this.state.uninterruptedSeconds / 10.0) * 0.1;
        
        // Penalty based on recent switches & erratic mouse jitter
        const switchPenalty = this.state.recentSwitches * 0.35;
        const jitterPenalty = (this.state.mouseJitterCount * 0.15);

        let calculatedFocus = baseline + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(3.0, Math.min(10.0, Math.round(calculatedFocus * 10) / 10));

        // Cognitive Bandwidth percentage actively recovers as uninterruptedSeconds & cursor engagement increase
        let baseBandwidth = Math.round(this.state.focusIndex * 10);
        let flowBonusPct = Math.floor(this.state.uninterruptedSeconds / 5);
        
        let calculatedBandwidth = baseBandwidth + flowBonusPct;
        this.state.cognitiveBandwidth = Math.max(30, Math.min(100, calculatedBandwidth));
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
            if (this.state.focusIndex < 5.5) color = "#ef4444"; // Red
            else if (this.state.focusIndex < 7.5) color = "#f59e0b"; // Amber

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.4s ease;">${this.state.focusIndex.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        }

        if (elNoise) elNoise.innerText = `${this.state.ambientNoiseDb} dB`;
        if (elTabs) elTabs.innerText = `${this.state.tabDensity} open`;

        // Update real-time Cursor Dynamics status indicator if present
        const elCursorStatus = document.getElementById('ui-cursor-status');
        if (elCursorStatus) {
            let stateLabel = "Stable";
            if (this.state.mouseSpeedPxSec > 2500) stateLabel = "Erratic Jitter";
            else if (this.state.mouseSpeedPxSec > 300) stateLabel = "Active Tracking";
            elCursorStatus.innerText = `${this.state.mouseSpeedPxSec} px/s (${stateLabel})`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

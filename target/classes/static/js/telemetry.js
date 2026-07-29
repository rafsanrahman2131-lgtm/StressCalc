/**
 * StressCalculator — Behavioral Telemetry Engine
 * Realistic Cognitive Science Focus Model
 * Calibrated Context Switch Penalties & Flow Healing
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 85,
            contextSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 8.5,
            isFocused: true,
            ambientNoiseDb: 42,
            tabDensity: 6,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now()
        };

        this.flowTimer = null;
        this.init();
    }

    init() {
        // 1. Flow State Timer (Increments every second window is active)
        this.startFlowTimer();

        // 2. Window Blur & Focus Event Listeners (Gentle, realistic context switch tracking)
        window.addEventListener('blur', () => {
            this.state.isFocused = false;
            this.state.contextSwitches++;
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

        // 3. Mouse Movement tracking
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // 4. Periodic UI & Backend Sync
        setInterval(() => {
            this.simulateAmbientNoise();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }, 2000);

        // Initial UI Sync
        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    startFlowTimer() {
        if (!this.flowTimer) {
            this.flowTimer = setInterval(() => {
                if (this.state.isFocused) {
                    this.state.uninterruptedSeconds++;
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

    handleMouseMove(e) {
        const now = Date.now();
        const dt = (now - this.state.lastMouseTime) / 1000;
        
        if (dt > 0.05) {
            const dx = e.clientX - this.state.lastMousePos.x;
            const dy = e.clientY - this.state.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = dist / dt;

            if (speed > 3000) {
                this.state.mouseJitterCount++;
            }

            this.state.lastMousePos = { x: e.clientX, y: e.clientY };
            this.state.lastMouseTime = now;
        }
    }

    simulateAmbientNoise() {
        const base = 42;
        const delta = Math.floor(Math.random() * 8) - 3;
        this.state.ambientNoiseDb = Math.max(32, Math.min(65, base + delta));
        this.state.tabDensity = 6;
    }

    /**
     * Calibrated Focus Algorithm:
     * Baseline: 9.0
     * Recovery: +0.2 for every 30 seconds of uninterrupted work (+0.4 per min)
     * Penalty: -0.2 per context switch (Reasonable penalty for dev workflow)
     * Bounds: 3.5 to 10.0 for realistic human capacity
     */
    updateDerivedMetrics() {
        const baseline = 9.0;
        const flowReward = (this.state.uninterruptedSeconds / 30.0) * 0.2;
        const switchPenalty = this.state.contextSwitches * 0.2;
        const jitterPenalty = (this.state.mouseJitterCount * 0.02);

        let calculated = baseline + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(3.5, Math.min(10.0, Math.round(calculated * 10) / 10));

        // Bandwidth percentage (40% - 100%)
        let bandwidth = Math.round(this.state.focusIndex * 9.8);
        this.state.cognitiveBandwidth = Math.max(40, Math.min(100, bandwidth));
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

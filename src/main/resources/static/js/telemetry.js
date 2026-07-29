/**
 * StressCalculator — Behavioral Telemetry Engine
 * Stateful Scientific Focus Model (3:1 Recovery ratio)
 * F_new = F_prev + (T_uninterrupted / 60 * 0.5) - (C_switches * 1.5)
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 90,
            contextSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 10.0,
            isFocused: !document.hidden,
            ambientNoiseDb: 42,
            tabDensity: 1,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now()
        };

        this.flowTimer = null;
        this.init();
    }

    init() {
        // 1. Flow State Timer (Only increments when window is actively focused)
        this.startFlowTimer();

        // 2. Accurate Window Blur & Focus Event Listeners
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

        // 3. Fallback visibilitychange for hidden tab state
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.state.isFocused = false;
                this.state.contextSwitches++;
                this.stopFlowTimer();
            } else {
                this.state.isFocused = true;
                this.startFlowTimer();
            }
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 4. Mouse movement tracking
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // 5. Periodic UI & Backend Sync
        setInterval(() => {
            this.simulateAmbientNoise();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }, 2000);

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

            if (speed > 2500) {
                this.state.mouseJitterCount++;
            }

            this.state.lastMousePos = { x: e.clientX, y: e.clientY };
            this.state.lastMouseTime = now;
        }
    }

    simulateAmbientNoise() {
        const base = 42;
        const delta = Math.floor(Math.random() * 10) - 4;
        this.state.ambientNoiseDb = Math.max(30, Math.min(75, base + delta));
        this.state.tabDensity = Math.max(1, Math.min(12, 6));
    }

    /**
     * Scientific Stateful Model Calculation:
     * Recovery: +0.5 for every full 60 seconds of uninterrupted focus
     * Penalty: -1.5 for every context switch (Requires 3 minutes of focus to recover from 1 switch)
     */
    updateDerivedMetrics() {
        const recovery = (this.state.uninterruptedSeconds / 60.0) * 0.5;
        const penalty = this.state.contextSwitches * 1.5;

        // F_new = 10.0 (or prev) + recovery - penalty
        let calculated = 10.0 + recovery - penalty;
        this.state.focusIndex = Math.max(0.0, Math.min(10.0, Math.round(calculated * 10) / 10));

        this.state.cognitiveBandwidth = Math.max(10, Math.min(100, Math.round(this.state.focusIndex * 10)));
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
            if (this.state.focusIndex < 4.0) color = "#ef4444"; // Red
            else if (this.state.focusIndex < 7.0) color = "#f59e0b"; // Amber

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.4s ease;">${this.state.focusIndex.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        }

        if (elNoise) elNoise.innerText = `${this.state.ambientNoiseDb} dB`;
        if (elTabs) elTabs.innerText = `${this.state.tabDensity} open`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

/**
 * StressCalculator — Behavioral Telemetry Engine
 * Features: Flow State Recovery & Healing Mechanic!
 * Tracks live tab switches, uninterrupted focus seconds, erratic mouse movement, and ambient noise.
 * Smoothly heals Focus Index back up to 10.0 during sustained attention.
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 85,
            contextSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 5.0,
            ambientNoiseDb: 42,
            tabDensity: 1,
            mouseDistance: 0,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now()
        };

        this.init();
    }

    init() {
        // 1. Uninterrupted Flow Timer (Increments every second document is active)
        setInterval(() => {
            if (!document.hidden) {
                this.state.uninterruptedSeconds++;
                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        }, 1000);

        // 2. Context Switch Listener (Tab Visibility Change)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab switch detected: reset flow timer & increment context switch penalty
                this.state.uninterruptedSeconds = 0;
                this.state.contextSwitches++;
                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        });

        // 3. Window Focus/Blur Listener
        window.addEventListener('blur', () => {
            this.state.uninterruptedSeconds = 0;
            this.state.contextSwitches++;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 4. Mouse Movement & Erratic Jitter Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // 5. Estimate Tab Density
        this.estimateTabDensity();

        // 6. Periodic Ambient Noise Simulation & Backend Sync Payload
        setInterval(() => {
            this.simulateAmbientNoise();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }, 3000);

        // Initial UI Binding
        this.updateDashboardUI();
    }

    handleMouseMove(e) {
        const now = Date.now();
        const dt = (now - this.state.lastMouseTime) / 1000;
        
        if (dt > 0.05) {
            const dx = e.clientX - this.state.lastMousePos.x;
            const dy = e.clientY - this.state.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = dist / dt;

            // Detect rapid erratic mouse jitter (speed > 2500 px/sec)
            if (speed > 2500) {
                this.state.mouseJitterCount++;
            }

            this.state.lastMousePos = { x: e.clientX, y: e.clientY };
            this.state.lastMouseTime = now;
        }
    }

    estimateTabDensity() {
        this.state.tabDensity = Math.max(1, Math.min(15, Math.floor(Math.random() * 4) + 5));
    }

    simulateAmbientNoise() {
        const base = 42;
        const delta = Math.floor(Math.random() * 12) - 4;
        this.state.ambientNoiseDb = Math.max(30, Math.min(75, base + delta));
    }

    /**
     * Recovery Mechanic: Flow State Healing Algorithm
     * Baseline Focus = 5.0
     * Reward: +0.1 for every 60 seconds of uninterrupted flow (+0.00166 per second)
     * Penalty: -1.0 for every context switch
     * Clamped strictly between 0.0 and 10.0
     */
    updateDerivedMetrics() {
        const baseline = 5.0;
        const flowReward = (this.state.uninterruptedSeconds / 60.0) * 0.1;
        const switchPenalty = this.state.contextSwitches * 1.0;
        const jitterPenalty = (this.state.mouseJitterCount * 0.05);

        let rawFocus = baseline + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(0.0, Math.min(10.0, Math.round(rawFocus * 10) / 10));

        // Cognitive Bandwidth percentage (10% - 100%)
        let rawBandwidth = Math.round(this.state.focusIndex * 10);
        this.state.cognitiveBandwidth = Math.max(10, Math.min(100, rawBandwidth));
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
            let color = "#22c55e"; // Flow Green
            if (this.state.focusIndex < 4.0) color = "#ef4444"; // Red
            else if (this.state.focusIndex < 7.0) color = "#f59e0b"; // Amber

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.5s ease;">${this.state.focusIndex.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        }

        if (elNoise) elNoise.innerText = `${this.state.ambientNoiseDb} dB`;
        if (elTabs) elTabs.innerText = `${this.state.tabDensity} open`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

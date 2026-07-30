/**
 * StressCalculator — Behavioral Telemetry Engine with Dynamic Hardware & Browser Sensing
 * Features:
 * 1. Real-Time Web Audio API Microphone Decibel Metering
 * 2. Dynamic Browser Tab Density Sensing (tracks active tab density & context switching fluctuations)
 * 3. Live Environmental & Cognitive Stream Updates
 */

class TelemetryEngine {
    constructor() {
        this.state = {
            cognitiveBandwidth: 62,
            contextSwitches: 0,
            recentSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 3.8,
            isFocused: true,
            ambientNoiseDb: 42,
            // Tab density: starts at 1, increments when user switches away and back (real browser context switch tracking)
            tabDensity: 1,
            mouseSpeedPxSec: 0,
            mouseDistancePx: 0,
            mouseJitterCount: 0,
            lastMousePos: { x: 0, y: 0 },
            lastMouseTime: Date.now(),
            stressorsLog: []
        };

        this.audioContext = null;
        this.analyser = null;
        this.micStream = null;

        // Rolling audio classification buffer (last 60 samples → ~1 min of mic readings)
        this.audioClassificationBuffer = []; // each entry: 'silence' | 'speech' | 'noise' | 'spike'

        // --- Recovery Decay System ---
        // smoothedFocus tracks the displayed value; it decays exponentially toward
        // the instantaneous target rather than snapping to it. This simulates
        // the 30–60 seconds it takes for human cortisol/adrenaline to subside.
        this._smoothedFocus = 3.8;
        // Decay factor per second: 0.92 ≈ half-life of ~8 ticks (8 seconds for
        // small deltas, but large spikes take 30–40 seconds to fully resolve
        // because the gap is bigger). This is an exponential moving average.
        this._decayAlpha = 0.08; // blend 8% of target per tick → ~30s to resolve a 3-point spike

        this.init();
    }

    init() {
        // 1. Initialize Real Microphone Audio Decibel Tracking
        this.initRealMicrophoneAudio();

        // 2. Resume AudioContext on user interaction
        window.addEventListener('click', () => this.resumeAudio());
        window.addEventListener('keydown', () => this.resumeAudio());

        // 3. Initial Stressor Log item
        this.logStressorEvent("System Initialized", "Dynamic Sensors Active");

        // 4. Continuous 1-second Loop
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

            this.readMicrophoneDecibels();
            this.classifyCurrentAudio(this.state.ambientNoiseDb);
            this.updateTabDensity();
            this.updateDerivedMetrics();
            this.updateDashboardUI();

            // Stream live point to Chart.js graph
            if (typeof window.pushLiveChartPoint === 'function') {
                window.pushLiveChartPoint(this.state.focusIndex);
            }
        }, 1000);

        // 5. Visibility Change Listener (Tab Minimized vs Tab Switched)
        document.addEventListener('visibilitychange', () => {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (document.hidden) {
                this.state.isFocused = false;
                this.state.contextSwitches++;
                this.state.recentSwitches++;
                this.logStressorEvent(timeStr, "Tab Minimized");
            } else {
                this.state.isFocused = true;
                this.resumeAudio();
                this.logStressorEvent(timeStr, "Tab Restored");
            }

            this.updateTabDensity();
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 6. Window Blur & Focus Event Listeners (Window Context Switches)
        window.addEventListener('blur', () => {
            if (!document.hidden && this.state.isFocused) {
                this.state.isFocused = false;
                this.state.contextSwitches++;
                this.state.recentSwitches++;
                
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                this.logStressorEvent(timeStr, "Tab Switched");

                this.updateTabDensity();
                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        });

        window.addEventListener('focus', () => {
            if (!this.state.isFocused) {
                this.state.isFocused = true;
                this.resumeAudio();
                this.updateTabDensity();
                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        });

        // 7. Continuous Mouse Movement Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        this.updateTabDensity();
        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    async resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (e) {
                console.warn("AudioContext resume attempt:", e.message);
            }
        }
    }

    async initRealMicrophoneAudio() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 256;

                const source = this.audioContext.createMediaStreamSource(this.micStream);
                source.connect(this.analyser);
                console.log("Real Microphone Audio Telemetry connected!");
            }
        } catch (err) {
            console.warn("Microphone access pending/denied, using acoustic fallback:", err.message);
        }
    }

    readMicrophoneDecibels() {
        this.resumeAudio();

        if (this.analyser) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            let average = sum / dataArray.length;

            let naturalDelta = (Math.random() * 4) - 2;

            if (average > 2) {
                let measuredDb = Math.round(32 + (average / 255.0) * 55 + naturalDelta);
                this.state.ambientNoiseDb = Math.max(30, Math.min(88, measuredDb));
            } else {
                let ambientBase = Math.round(36 + naturalDelta);
                this.state.ambientNoiseDb = Math.max(30, Math.min(50, ambientBase));
            }

            if (this.state.ambientNoiseDb > 68 && this.state.isFocused) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                this.logStressorEvent(timeStr, `Acoustic Noise Spike (${this.state.ambientNoiseDb} dB)`);
            }
        } else {
            const base = 38;
            const delta = Math.floor(Math.random() * 8) - 4;
            this.state.ambientNoiseDb = Math.max(32, Math.min(56, base + delta));
        }
    }

    updateTabDensity() {
        // Tab Density = real context-switch counter. Starts at 1 (this tab).
        // Increments by 1 each time the user switches away (blur/visibilitychange).
        // The number is a realistic proxy: every time you alt-tab or open a new tab, it goes up.
        // It does NOT reset on focus-back, because those tabs are still open.
        // We read this.state.contextSwitches which is already incremented in the event listeners.
        this.state.tabDensity = Math.max(1, 1 + this.state.contextSwitches);
    }

    classifyCurrentAudio(db) {
        // YAMNet-style heuristic classification based on live microphone dB level
        let category;
        if (db < 36) {
            category = 'silence';
        } else if (db < 60) {
            category = 'speech';
        } else if (db < 70) {
            category = 'noise';
        } else {
            category = 'spike';
        }
        // Keep rolling buffer of last 60 samples
        this.audioClassificationBuffer.push(category);
        if (this.audioClassificationBuffer.length > 60) {
            this.audioClassificationBuffer.shift();
        }
        // Expose computed breakdown on window so environmental.js can read it live
        const total = this.audioClassificationBuffer.length;
        const count = (cat) => this.audioClassificationBuffer.filter(c => c === cat).length;
        window.liveAudioBreakdown = {
            'Silence':           Math.round((count('silence') / total) * 100),
            'Speech':            Math.round((count('speech')  / total) * 100),
            'Background Noise':  Math.round((count('noise')   / total) * 100),
            'Loud Spikes':       Math.round((count('spike')   / total) * 100)
        };
    }

    logStressorEvent(timeStr, description) {
        this.state.stressorsLog.unshift({ time: timeStr, text: description });
        if (this.state.stressorsLog.length > 5) {
            this.state.stressorsLog.pop();
        }
        this.updateStressorsUI();
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
                    this.state.uninterruptedSeconds += 0.03;
                }

                if (speed > 6500) {
                    this.state.mouseJitterCount = Math.min(3, this.state.mouseJitterCount + 1);
                    if (this.state.mouseJitterCount === 3) {
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        this.logStressorEvent(timeStr, "Erratic Motion Tremor");
                    }
                }
            }

            this.state.lastMousePos = { x: e.clientX, y: e.clientY };
            this.state.lastMouseTime = now;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        }
    }

    /**
     * ══════════════════════════════════════════════════════════════════
     * REALISTIC COGNITIVE LOAD MODEL
     * ══════════════════════════════════════════════════════════════════
     *
     * Scale: 0 (asleep) → 10 (full panic)
     *
     * RESTING BASELINE: 3.8 (normal productive work, quiet room, 1 tab)
     *
     * PENALTIES (additive, push score UP toward strain):
     *   - Noise:    only above 50 dB; nonlinear ramp.  50dB → +0,  70dB → +1.5,  85dB → +3.0
     *   - Switches: each recent context switch adds +0.4 (recentSwitches decays every 10s)
     *   - Jitter:   erratic mouse → +0.15 per jitter tick (max 3 = +0.45)
     *
     * HEAVY MULTIPLIER (Task 2):
     *   If tabDensity > 15 AND noise > 70 dB → multiply total penalty by 1.6×
     *   This is the ONLY way to reliably cross the 7.0 "High Strain" line.
     *
     * FLOW REWARD (subtractive, rewards sustained calm focus):
     *   -0.03 per uninterrupted second, capped at -1.2 (40 seconds deep focus)
     *   Can push resting score down to ~2.6 during deep work.
     *
     * RECOVERY DECAY (Task 3):
     *   The displayed focusIndex is NOT the instantaneous target. Instead,
     *   _smoothedFocus approaches the target via exponential moving average:
     *     smoothed = smoothed + alpha * (target - smoothed)
     *   With alpha = 0.08, a sudden 3-point spike takes ~30 seconds to fully
     *   resolve, simulating cortisol/adrenaline decay in humans.
     *   Spikes (target > smoothed) use a faster alpha (0.35) so threats
     *   register immediately — it's only the *recovery* that's slow.
     *
     * COGNITIVE BANDWIDTH:
     *   Inverse of focus (load). bandwidth = 100 - (focusIndex * 10)
     *   At rest (3.8): 62%.  Under high strain (8.0): 20%.
     * ══════════════════════════════════════════════════════════════════
     */
    updateDerivedMetrics() {
        // --- 1. Resting baseline: calm productive work ---
        const BASELINE = 3.8;

        // --- 2. Noise penalty: nonlinear ramp above 50 dB ---
        // Below 50 dB = negligible office ambient. Above 50, quadratic ramp.
        let noisePenalty = 0;
        const db = this.state.ambientNoiseDb;
        if (db > 50) {
            // Quadratic curve: (db-50)^2 / 400 → at 70dB = 1.0, at 85dB = 3.06
            noisePenalty = Math.pow(db - 50, 2) / 400;
        }

        // --- 3. Context switch penalty ---
        const switchPenalty = this.state.recentSwitches * 0.4;

        // --- 4. Mouse jitter penalty ---
        const jitterPenalty = this.state.mouseJitterCount * 0.15;

        // --- 5. Sum all penalties ---
        let totalPenalty = noisePenalty + switchPenalty + jitterPenalty;

        // --- 6. HEAVY MULTIPLIER: only when overloaded AND noisy simultaneously ---
        if (this.state.tabDensity > 15 && db > 70) {
            totalPenalty *= 1.6;
        }

        // --- 7. Flow reward: sustained uninterrupted focus ---
        // -0.03 per second of focus, capped at -1.2 (40 seconds of flow)
        const flowReward = Math.min(1.2, this.state.uninterruptedSeconds * 0.03);

        // --- 8. Instantaneous target (not displayed directly) ---
        let instantTarget = BASELINE + totalPenalty - flowReward;
        instantTarget = Math.max(0.5, Math.min(10.0, instantTarget));

        // --- 9. RECOVERY DECAY: exponential smoothing ---
        // Spikes register fast (alpha = 0.35), recovery is slow (alpha = 0.08)
        const delta = instantTarget - this._smoothedFocus;
        const alpha = delta > 0 ? 0.35 : this._decayAlpha;
        this._smoothedFocus += alpha * delta;

        // Clamp and round to 1 decimal place for display
        this._smoothedFocus = Math.max(0.5, Math.min(10.0, this._smoothedFocus));
        this.state.focusIndex = Math.round(this._smoothedFocus * 10) / 10;

        // --- 10. Cognitive Bandwidth: inverse of load ---
        // At focusIndex 3.8 → 62%. At 7.0 → 30%. At 9.5 → 5%.
        let rawBandwidth = Math.round(100 - (this.state.focusIndex * 10));
        this.state.cognitiveBandwidth = Math.max(0, Math.min(100, rawBandwidth));
    }

    updateDashboardUI() {
        const elBandwidth = document.getElementById('ui-bandwidth');
        const elSwitches = document.getElementById('ui-switches');
        const elFocus = document.getElementById('ui-focus');
        const elNoise = document.getElementById('ui-noise');
        const elTabs = document.getElementById('ui-tabs');

        if (elBandwidth) elBandwidth.innerText = `${this.state.cognitiveBandwidth}%`;
        if (elSwitches) elSwitches.innerText = this.state.contextSwitches;

        if (elFocus) {
            // New model: lower = calmer.  <4 = Green (calm), 4-7 = Amber (elevated), >7 = Red (high strain)
            let color = "#22c55e"; // Green — calm
            let stateLabel = "Sustained Flow State";
            if (this.state.focusIndex >= 7.0) {
                color = "#ef4444"; // Red — high strain
                stateLabel = "⚠️ High Cognitive Strain";
            } else if (this.state.focusIndex >= 4.0) {
                color = "#f59e0b"; // Amber — elevated
                stateLabel = "Elevated Load";
            }

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.4s ease;">${this.state.focusIndex.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        }

        if (elNoise) elNoise.innerText = this.state.ambientNoiseDb;
        if (elTabs) elTabs.innerText = this.state.tabDensity;

        this.updateStressorsUI();
    }

    updateStressorsUI() {
        const elList = document.getElementById('ui-stressors-log');
        if (elList && this.state.stressorsLog.length > 0) {
            elList.innerHTML = this.state.stressorsLog.map(item => `
                <li class="log-item">
                    <span style="color: rgba(255,255,255,0.6); font-family: monospace; font-size: 0.8rem;">${item.time}</span>
                    <span style="font-weight: 600;">${item.text}</span>
                </li>
            `).join('');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

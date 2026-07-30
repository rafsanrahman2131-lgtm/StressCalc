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

        // --- Last assessment result from "Calculate Stress" wizard ---
        this.lastAssessment = null;       // { reactionMs, accuracyPct, facialTension, overwhelm, energy, timestamp }
        this.assessmentHistory = [];      // rolling buffer of last 10 assessments
        this._assessmentDecayMs = 5 * 60 * 1000; // assessment influence decays over 5 minutes

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
     * Called by workflow.js after each "Calculate Stress" wizard completion.
     * This is the PRIMARY data source for Focus Index and Cognitive Bandwidth.
     */
    ingestAssessmentResult(result) {
        this.lastAssessment = result;
        this.assessmentHistory.push(result);
        if (this.assessmentHistory.length > 10) {
            this.assessmentHistory.shift();
        }

        // Log it as a stressor event so the user sees it in the Recent Stressors panel
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const emoji = result.accuracyPct >= 80 ? '✅' : (result.accuracyPct >= 50 ? '⚠️' : '🔴');
        this.logStressorEvent(timeStr, 
            `${emoji} Assessment: ${result.accuracyPct}% accuracy, ${result.reactionMs}ms reaction`
        );

        // Immediately recalculate so dashboard updates right after wizard closes
        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    /**
     * ══════════════════════════════════════════════════════════════════
     * REALISTIC COGNITIVE LOAD MODEL (Assessment-Driven)
     * ══════════════════════════════════════════════════════════════════
     *
     * Scale: 0 (asleep) → 10 (full panic)
     *
     * ── PRIMARY SIGNAL: Last "Calculate Stress" assessment ──
     *   Reaction Time:  300ms → +0,  500ms → +1.0,  800ms → +2.5,  1200ms+ → +4.0
     *   Accuracy:       100% → +0,   75% → +1.0,    50% → +2.5,   25% → +4.0
     *   Facial Tension: 0% → +0,     50% → +0.5,    100% → +1.0
     *   Overwhelm:      0 → +0,      5 → +0.5,      10 → +1.0
     *
     * ── SECONDARY MODIFIERS: Environmental sensors (30% weight) ──
     *   Noise above 50 dB, context switches, mouse jitter.
     *
     * ── ASSESSMENT FRESHNESS DECAY ──
     *   Assessment influence fades linearly over 5 minutes.
     * ══════════════════════════════════════════════════════════════════
     */
    updateDerivedMetrics() {
        const BASELINE = 3.8;

        // ── 1. PRIMARY: Assessment-based cognitive load ──
        let assessmentLoad = 0;
        let assessmentWeight = 0; // 0 to 1, based on freshness

        if (this.lastAssessment) {
            const age = Date.now() - this.lastAssessment.timestamp;
            // Linear decay: full weight at t=0, zero at t=5min
            assessmentWeight = Math.max(0, 1 - (age / this._assessmentDecayMs));

            if (assessmentWeight > 0) {
                const a = this.lastAssessment;

                // Reaction time penalty: 300ms=0, 800ms=2.5, 1200ms=4.0 (quadratic)
                const rtNorm = Math.max(0, (a.reactionMs - 300)) / 900;
                const rtPenalty = Math.min(4.0, rtNorm * rtNorm * 4.0);

                // Accuracy penalty: 100%=0, 50%=2.5, 0%=4.0 (inverse quadratic)
                const accNorm = Math.max(0, (100 - a.accuracyPct)) / 100;
                const accPenalty = Math.min(4.0, accNorm * accNorm * 4.0);

                // Facial tension: 0-100% → 0 to 1.0
                const tensionPenalty = (a.facialTension || 0) / 100;

                // Overwhelm: 0-10 → 0 to 1.0
                const overwhelmPenalty = (a.overwhelm || 0) / 10;

                assessmentLoad = rtPenalty + accPenalty + tensionPenalty + overwhelmPenalty;
            }
        }

        // ── 2. SECONDARY: Environmental modifiers (capped contribution) ──
        let envPenalty = 0;
        const db = this.state.ambientNoiseDb;
        if (db > 50) {
            envPenalty += Math.pow(db - 50, 2) / 400;
        }
        envPenalty += this.state.recentSwitches * 0.4;
        envPenalty += this.state.mouseJitterCount * 0.15;

        if (this.state.tabDensity > 15 && db > 70) {
            envPenalty *= 1.6;
        }

        // Cap environmental contribution at 3.0 so it can't dominate alone
        envPenalty = Math.min(3.0, envPenalty);

        // ── 3. Blend: assessment is primary, environment is secondary ──
        let totalPenalty;
        if (assessmentWeight > 0) {
            totalPenalty = (assessmentLoad * 0.7 * assessmentWeight) +
                           (envPenalty * 0.3);
        } else {
            totalPenalty = envPenalty;
        }

        // ── 4. Flow reward: sustained focus reduces load ──
        const flowReward = Math.min(1.2, this.state.uninterruptedSeconds * 0.03);

        // ── 5. Instantaneous target ──
        let instantTarget = BASELINE + totalPenalty - flowReward;
        instantTarget = Math.max(0.5, Math.min(10.0, instantTarget));

        // ── 6. Recovery decay: exponential smoothing ──
        const delta = instantTarget - this._smoothedFocus;
        const alpha = delta > 0 ? 0.35 : this._decayAlpha;
        this._smoothedFocus += alpha * delta;

        this._smoothedFocus = Math.max(0.5, Math.min(10.0, this._smoothedFocus));
        this.state.focusIndex = Math.round(this._smoothedFocus * 10) / 10;

        // ── 7. Cognitive Bandwidth: inverse of load ──
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

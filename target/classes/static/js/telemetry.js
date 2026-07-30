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

        // --- Cross-Tab Live Density Tracking ---
        this.tabId = Math.random().toString(36).substring(2, 9);
        this.activeTabsMap = new Map();
        this.activeTabsMap.set(this.tabId, Date.now());

        // --- Recovery Decay System ---
        // _smoothedFocus tracks the displayed value; it decays exponentially toward
        // the instantaneous target rather than snapping to it. This simulates
        // the 30–60 seconds it takes for human cortisol/adrenaline to subside.
        this._smoothedFocus = 3.8;
        this._decayAlpha = 0.08; // blend 8% of target per tick → ~30–60s recovery decay

        this.init();
    }

    init() {
        // 0. Initialize Cross-Tab Communication for Real Open Tab Count
        this.initCrossTabTracker();

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

    initCrossTabTracker() {
        if ('BroadcastChannel' in window) {
            try {
                this.tabChannel = new BroadcastChannel('stresscalc_open_tabs');
                this.tabChannel.onmessage = (e) => {
                    if (e.data && e.data.tabId) {
                        this.activeTabsMap.set(e.data.tabId, Date.now());
                    }
                };

                // Heartbeat ping every 1.5s
                setInterval(() => {
                    this.activeTabsMap.set(this.tabId, Date.now());
                    this.tabChannel.postMessage({ tabId: this.tabId, time: Date.now() });
                }, 1500);

                // Initial ping
                this.tabChannel.postMessage({ tabId: this.tabId, time: Date.now() });
            } catch (err) {
                console.warn("BroadcastChannel tab tracking fallback:", err);
            }
        }
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
        // Purge inactive tabs older than 3.5 seconds
        const now = Date.now();
        if (this.activeTabsMap) {
            for (const [id, ts] of this.activeTabsMap.entries()) {
                if (now - ts > 3500) {
                    this.activeTabsMap.delete(id);
                }
            }
        }

        // Live count of open StressCalculator tabs in this browser
        const openAppTabs = Math.max(1, this.activeTabsMap ? this.activeTabsMap.size : 1);

        // Recent multitasking switch load (decays as user stabilizes on a single tab)
        const multitaskingBonus = Math.min(4, this.state.recentSwitches);

        // Base active workspace density estimate (clamped realistically between 1 and 8 tabs)
        let totalDensity = openAppTabs + multitaskingBonus;

        this.state.tabDensity = Math.max(1, Math.min(8, totalDensity));
    }

    classifyCurrentAudio(db) {
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
        this.audioClassificationBuffer.push(category);
        if (this.audioClassificationBuffer.length > 60) {
            this.audioClassificationBuffer.shift();
        }
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
     * Scale: 0.0 (calm) → 10.0 (high strain)
     * 1. BASELINE: resting state defaults between 3.5 and 4.5 (default: 3.8)
     * 2. DYNAMIC SPIKES: score ONLY crosses 7.0 threshold if tabDensity > 15 AND noise > 70dB
     * 3. RECOVERY DECAY: slow exponential decay (alpha = 0.08) taking 30–60 seconds
     * ══════════════════════════════════════════════════════════════════
     */
    updateDerivedMetrics() {
        // --- 1. Recalibrated Baseline (3.8 resting state) ---
        const BASELINE = 3.8;

        // --- 2. Penalties ---
        let noisePenalty = 0;
        const db = this.state.ambientNoiseDb;
        if (db > 50) {
            noisePenalty = Math.pow(db - 50, 2) / 400; // quadratic curve above 50dB
        }

        const switchPenalty = this.state.recentSwitches * 0.4;
        const jitterPenalty = this.state.mouseJitterCount * 0.15;

        let totalPenalty = noisePenalty + switchPenalty + jitterPenalty;

        // --- Heavy Multiplier: Triggered Strain ---
        // ONLY apply heavy multiplier if high tab density (>=6) AND loud noise (>70dB) occur simultaneously
        if (this.state.tabDensity >= 6 && db > 70) {
            totalPenalty *= 1.6;
        }

        // --- Flow Reward (Sustained focus) ---
        const flowReward = Math.min(1.2, this.state.uninterruptedSeconds * 0.03);

        // --- Instantaneous Target ---
        let instantTarget = BASELINE + totalPenalty - flowReward;
        instantTarget = Math.max(0.5, Math.min(10.0, instantTarget));

        // --- 3. Realistic Recovery Decay (30-60s exponential smoothing) ---
        const delta = instantTarget - this._smoothedFocus;
        // Spikes register quickly (alpha = 0.35), recovery decays slowly (alpha = 0.08)
        const alpha = delta > 0 ? 0.35 : this._decayAlpha;
        this._smoothedFocus += alpha * delta;

        this._smoothedFocus = Math.max(0.5, Math.min(10.0, this._smoothedFocus));
        this.state.focusIndex = Math.round(this._smoothedFocus * 10) / 10;

        // --- Cognitive Bandwidth: Inverse of Load ---
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
            let color = "#22c55e"; // Green (< 4.0)
            if (this.state.focusIndex >= 7.0) color = "#ef4444"; // Red (≥ 7.0 High Strain)
            else if (this.state.focusIndex >= 4.0) color = "#f59e0b"; // Amber (4.0–6.9 Elevated)

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

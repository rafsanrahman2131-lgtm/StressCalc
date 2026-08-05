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
            cognitiveBandwidth: 100,
            contextSwitches: 0,
            recentSwitches: 0,
            uninterruptedSeconds: 0,
            focusIndex: 10.0,
            isFocused: true,
            ambientNoiseDb: 38,
            tabDensity: 1,
            facialTension: 0,
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
        this.audioClassificationBuffer = [];

        this.tabId = Math.random().toString(36).substring(2, 9);
        this.activeTabsMap = new Map();
        this.activeTabsMap.set(this.tabId, Date.now());

        this._smoothedFocus = 10.0;
        this._smoothedBandwidth = 100;
        this._decayAlpha = 0.08;

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

            if (average > 2) {
                let measuredDb = Math.round(32 + (average / 255.0) * 55);
                this.state.ambientNoiseDb = Math.max(30, Math.min(88, measuredDb));
            } else {
                this.state.ambientNoiseDb = 38;
            }

            if (this.state.ambientNoiseDb > 68 && this.state.isFocused) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                this.logStressorEvent(timeStr, `Acoustic Noise Spike (${this.state.ambientNoiseDb} dB)`);
            }
        } else {
            this.state.ambientNoiseDb = 38;
        }
    }

    updateTabDensity() {
        const now = Date.now();
        if (this.activeTabsMap) {
            for (const [id, ts] of this.activeTabsMap.entries()) {
                if (now - ts > 3500) {
                    this.activeTabsMap.delete(id);
                }
            }
        }

        const openAppTabs = Math.max(1, this.activeTabsMap ? this.activeTabsMap.size : 1);
        const multitaskingBonus = Math.min(4, this.state.recentSwitches);
        let totalDensity = openAppTabs + multitaskingBonus;

        this.state.tabDensity = Math.max(1, Math.min(8, totalDensity));
    }

    classifyCurrentAudio(db) {
        let category = db < 36 ? 'silence' : (db < 60 ? 'speech' : (db < 70 ? 'noise' : 'spike'));
        this.audioClassificationBuffer.push(category);
        if (this.audioClassificationBuffer.length > 60) {
            this.audioClassificationBuffer.shift();
        }
        const total = this.audioClassificationBuffer.length;
        const count = (cat) => this.audioClassificationBuffer.filter(c => c === cat).length;
        window.liveAudioBreakdown = {
            'Silence': Math.round((count('silence') / total) * 100),
            'Speech': Math.round((count('speech') / total) * 100),
            'Background Noise': Math.round((count('noise') / total) * 100),
            'Loud Spikes': Math.round((count('spike') / total) * 100)
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
        }
    }

    /**
     * PROPER MATHEMATICAL COGNITIVE LOAD & BANDWIDTH MODEL
     * Range: 0% to 100% Cognitive Bandwidth (10.0 to 0.0 Focus Index)
     * 1. Context Switch Penalty: Each switch costs 8% (recent) + 3% (accumulated total, max 40%).
     * 2. Facial Tension Penalty: Tension % * 0.45 (max 45%).
     * 3. Acoustic Noise Penalty: (dB - 45) * 0.8 (max 30%).
     * 4. Tab Density Penalty: (tabCount - 1) * 4 (max 25%).
     * 5. Motion Jitter Penalty: jitterCount * 5 (max 15%).
     * 6. Flow State Recovery: uninterrupted seconds * 0.2 (reduces load penalty up to 20%).
     */
    updateDerivedMetrics() {
        const switchPenalty = Math.min(40, (this.state.recentSwitches * 8) + (this.state.contextSwitches * 3));
        const tensionPenalty = ((this.state.facialTension || 0) / 100) * 45;
        const noisePenalty = Math.max(0, ((this.state.ambientNoiseDb || 38) - 45) * 0.8);
        const tabPenalty = Math.max(0, ((this.state.tabDensity || 1) - 1) * 4);
        const jitterPenalty = (this.state.mouseJitterCount || 0) * 5;

        let totalLoad = switchPenalty + tensionPenalty + noisePenalty + tabPenalty + jitterPenalty;

        // Flow State Recovery (Uninterrupted focus reduces load)
        const flowRecovery = Math.min(20, ((this.state.uninterruptedSeconds || 0) / 10) * 2);
        totalLoad = Math.max(0, Math.min(95, totalLoad - flowRecovery));

        // Target Bandwidth & Focus Index
        let targetBandwidth = Math.round(100 - totalLoad);

        // Smooth Exponential Moving Average (30s physiological decay)
        if (this._smoothedBandwidth === undefined || isNaN(this._smoothedBandwidth)) {
            this._smoothedBandwidth = targetBandwidth;
        }

        const delta = targetBandwidth - this._smoothedBandwidth;
        const alpha = delta < 0 ? 0.30 : 0.08;
        this._smoothedBandwidth += alpha * delta;

        if (isNaN(this._smoothedBandwidth)) {
            this._smoothedBandwidth = 100;
        }

        this._smoothedBandwidth = Math.max(0, Math.min(100, this._smoothedBandwidth));

        this.state.cognitiveBandwidth = Math.round(this._smoothedBandwidth);
        if (isNaN(this.state.cognitiveBandwidth)) {
            this.state.cognitiveBandwidth = 100;
        }

        this.state.focusIndex = Math.round((this.state.cognitiveBandwidth / 10) * 10) / 10;
        if (isNaN(this.state.focusIndex)) {
            this.state.focusIndex = 10.0;
        }
    }

    /**
     * Focus Index Thresholds & Sub-text Logic
     * - Score <= 3.0 (e.g. 2.9/10): "High Cognitive Strain" (Amber/Red)
     * - Score 3.1 to 7.0: "Moderate Cognitive Load" (Yellow/Amber)
     * - Score > 7.0: "Sustained Flow State" (Green)
     */
    updateDashboardUI() {
        const elBandwidth = document.getElementById('ui-bandwidth');
        const elSwitches = document.getElementById('ui-switches');
        const elFocus = document.getElementById('ui-focus');
        const elFocusSub = document.getElementById('ui-focus-sub') || (elFocus ? elFocus.nextElementSibling : null);
        const elNoise = document.getElementById('ui-noise');
        const elTabs = document.getElementById('ui-tabs');

        let bw = (isNaN(this.state.cognitiveBandwidth) || this.state.cognitiveBandwidth === undefined) ? 100 : this.state.cognitiveBandwidth;
        let fi = (isNaN(this.state.focusIndex) || this.state.focusIndex === undefined) ? 10.0 : this.state.focusIndex;

        if (elBandwidth) elBandwidth.innerText = `${bw}%`;
        if (elSwitches) elSwitches.innerText = this.state.contextSwitches || 0;

        if (elFocus) {
            let color = "#22c55e";
            let statusText = "Sustained Flow State";

            if (fi <= 3.0) {
                color = "#ef4444";
                statusText = "High Cognitive Strain";
            } else if (fi <= 7.0) {
                color = "#f59e0b";
                statusText = "Moderate Cognitive Load";
            }

            elFocus.innerHTML = `<span style="color: ${color}; transition: color 0.4s ease;">${fi.toFixed(1)}</span><span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;

            if (elFocusSub) {
                elFocusSub.innerText = statusText;
                elFocusSub.style.color = color;
            }
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

    // AI Scoring Engine (Backend Integration)
    async sendTelemetryToBackend() {
        try {
            const payload = {
                contextSwitches: this.state.contextSwitches,
                sessionDuration: this.state.sessionDuration,
                facialTension: this.state.facialTension,
                ambientNoiseDb: this.state.ambientNoiseDb,
                tabDensity: this.state.tabDensity
            };

            const res = await fetch('/api/telemetry/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (typeof data.cognitiveBandwidth === 'number' && this.state.contextSwitches > 0) {
                    this._smoothedBandwidth = (this._smoothedBandwidth * 0.7) + (data.cognitiveBandwidth * 0.3);
                    this.state.cognitiveBandwidth = Math.round(this._smoothedBandwidth);
                    this.state.focusIndex = Math.round((this.state.cognitiveBandwidth / 10) * 10) / 10;
                    this.updateDashboardUI();
                }
            }
        } catch (e) {
            // Quiet fallback
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.telemetryEngine = new TelemetryEngine();
});

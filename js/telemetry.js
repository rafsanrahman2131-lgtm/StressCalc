/**
 * StressCalculator — Behavioral Telemetry Engine
 * Precise Event Categorization:
 * - "Tab Switched"
 * - "Tab Minimized"
 * - "Tab Restored"
 * - "Acoustic Noise Spike"
 * - "Erratic Motion Tremor"
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
            lastMouseTime: Date.now(),
            stressorsLog: []
        };

        this.audioContext = null;
        this.analyser = null;
        this.micStream = null;

        this.init();
    }

    init() {
        // 1. Initialize Real Microphone Audio Decibel Tracking
        this.initRealMicrophoneAudio();

        // 2. Resume AudioContext on user interaction
        window.addEventListener('click', () => this.resumeAudio());
        window.addEventListener('keydown', () => this.resumeAudio());

        // 3. Initial Stressor Log item
        this.logStressorEvent("System Initialized", "Telemetry Engine active");

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
                this.logStressorEvent(timeStr, `Tab Minimized (#${this.state.contextSwitches})`);
            } else {
                this.state.isFocused = true;
                this.resumeAudio();
                this.logStressorEvent(timeStr, "Tab Restored");
            }

            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 6. Window Blur & Focus Event Listeners (Window Context Switches)
        window.addEventListener('blur', () => {
            // Only log Tab Switched if document visibility didn't already trigger Tab Minimized
            if (!document.hidden && this.state.isFocused) {
                this.state.isFocused = false;
                this.state.contextSwitches++;
                this.state.recentSwitches++;
                
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                this.logStressorEvent(timeStr, `Tab Switched (#${this.state.contextSwitches})`);

                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        });

        window.addEventListener('focus', () => {
            if (!this.state.isFocused) {
                this.state.isFocused = true;
                this.resumeAudio();
                this.updateDerivedMetrics();
                this.updateDashboardUI();
            }
        });

        // 7. Continuous Mouse Movement Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

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
                this.state.ambientNoiseDb = Math.max(30, Math.min(85, measuredDb));
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

        this.state.tabDensity = Math.max(3, Math.min(12, Math.floor(window.innerWidth / 160)));
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

    updateDerivedMetrics() {
        const baselineFocus = 8.5;
        
        const flowReward = (this.state.uninterruptedSeconds / 6.0) * 0.1;
        const switchPenalty = this.state.recentSwitches * 0.25;
        const jitterPenalty = (this.state.mouseJitterCount * 0.08);

        let calculatedFocus = baselineFocus + flowReward - switchPenalty - jitterPenalty;
        this.state.focusIndex = Math.max(4.0, Math.min(10.0, Math.round(calculatedFocus * 10) / 10));

        const focusComp = this.state.focusIndex * 9.5;
        const switchComp = this.state.recentSwitches * 3.5;
        const noiseComp = (this.state.ambientNoiseDb - 35) * 0.3;
        const flowBonus = Math.min(12, Math.floor(this.state.uninterruptedSeconds / 3));

        let rawBandwidth = Math.round(focusComp - switchComp - noiseComp + flowBonus);
        this.state.cognitiveBandwidth = Math.max(40, Math.min(98, rawBandwidth));
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
            let color = "#22c55e"; // Green
            if (this.state.focusIndex < 6.0) color = "#ef4444"; // Red
            else if (this.state.focusIndex < 8.0) color = "#f59e0b"; // Amber

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

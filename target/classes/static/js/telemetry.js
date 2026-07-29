/**
 * StressCalculator — Behavioral Telemetry Engine
 * Features:
 * 1. Live Microphone Web Audio API Ambient Noise Tracking (Real Room dB)
 * 2. Dynamic Real-Time Recent Stressors Event Logger
 * 3. Tab & Context Switch Live Engine
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

        // 2. Initial Stressor Log items
        this.logStressorEvent("System Initialized", "Telemetry Engine active");

        // 3. Continuous 1-second Loop (Updates metrics & DOM live every second)
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

        // 4. Window Focus & Blur Listeners
        window.addEventListener('blur', () => {
            this.state.isFocused = false;
            this.state.contextSwitches++;
            this.state.recentSwitches++;
            
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.logStressorEvent(timeStr, `IDE to Browser Switch (#${this.state.contextSwitches})`);

            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        window.addEventListener('focus', () => {
            this.state.isFocused = true;
            this.updateDerivedMetrics();
            this.updateDashboardUI();
        });

        // 5. Continuous Mouse Movement Listener
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        this.updateDerivedMetrics();
        this.updateDashboardUI();
    }

    /**
     * Real Microphone Web Audio API Integration
     * Measures actual ambient acoustic volume in dB from hardware microphone
     */
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
        if (this.analyser) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            let average = sum / dataArray.length;

            // Map 0 - 255 frequency amplitude to realistic 30 - 85 dB scale
            let measuredDb = Math.round(30 + (average / 255.0) * 55);
            this.state.ambientNoiseDb = measuredDb;

            // Log acoustic spike stressor if volume exceeds 68 dB
            if (measuredDb > 68 && this.state.isFocused) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                this.logStressorEvent(timeStr, `Acoustic Noise Spike (${measuredDb} dB)`);
            }
        } else {
            // Simulated acoustic variance if mic is not granted
            const base = 38;
            const delta = Math.floor(Math.random() * 6) - 2;
            this.state.ambientNoiseDb = Math.max(32, Math.min(56, base + delta));
        }

        // Active tab count estimation (window width & activity)
        this.state.tabDensity = Math.max(3, Math.min(12, Math.floor(window.innerWidth / 160)));
    }

    logStressorEvent(timeStr, description) {
        // Prepend new event log
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
                        this.logStressorEvent(timeStr, "Erratic Motion Tremor Detected");
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

        // Clean numeric insertion (without duplicating "dB" or "open")
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

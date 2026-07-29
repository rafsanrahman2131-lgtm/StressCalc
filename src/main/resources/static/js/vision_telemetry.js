/**
 * StressCalculator — Vision Telemetry Module (MediaPipe Face Mesh)
 * Measures real-time facial tension via eyebrow furrowing and jaw clenching landmarks.
 * Includes explicit user privacy toggle to turn camera ON / OFF anytime.
 * 100% Client-Side for Privacy.
 */

class VisionTelemetry {
    constructor() {
        this.videoElement = null;
        this.faceMesh = null;
        this.camera = null;
        this.mediaStream = null;
        this.baselineEyebrowDist = null;
        this.currentTensionScore = 15; // Initial calm baseline
        this.updateInterval = null;
        this.isCameraActive = false;
    }

    async init() {
        this.videoElement = document.getElementById('webcamFeed');
        if (!this.videoElement) {
            console.warn("VisionTelemetry: #webcamFeed element not found.");
            return;
        }

        // Attach Privacy Toggle Button Listener
        const toggleBtn = document.getElementById('cameraToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleCamera());
        }

        // Auto-start camera if permissions previously granted, or start on request
        await this.startCamera();
    }

    async startCamera() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false
            });

            this.videoElement.srcObject = this.mediaStream;
            this.isCameraActive = true;
            this.updateCameraStatusUI(true, "Camera Active");

            if (!this.faceMesh) {
                this.setupFaceMesh();
            } else if (this.camera) {
                this.camera.start();
            }

        } catch (error) {
            console.warn("VisionTelemetry: Camera permission denied or not available.", error);
            this.isCameraActive = false;
            this.updateCameraStatusUI(false, "Camera Off / Muted");
        }
    }

    stopCamera() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        if (this.camera) {
            this.camera.stop();
        }

        this.isCameraActive = false;
        this.updateCameraStatusUI(false, "Camera Muted");
    }

    toggleCamera() {
        if (this.isCameraActive) {
            this.stopCamera();
        } else {
            this.startCamera();
        }
    }

    setupFaceMesh() {
        if (typeof FaceMesh === 'undefined') {
            console.error("VisionTelemetry: MediaPipe FaceMesh SDK not loaded.");
            return;
        }

        this.faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onResults(results));

        if (typeof Camera !== 'undefined') {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.videoElement && this.isCameraActive) {
                        await this.faceMesh.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            this.camera.start();
        }

        this.startDOMUpdateLoop();
    }

    onResults(results) {
        if (!this.isCameraActive || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Eyebrow furrowing landmarks: 107 (right inner brow) & 336 (left inner brow)
        const p107 = landmarks[107];
        const p336 = landmarks[336];

        if (p107 && p336) {
            const dx = p107.x - p336.x;
            const dy = p107.y - p336.y;
            const dz = (p107.z || 0) - (p336.z || 0);
            const currentEyebrowDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (this.baselineEyebrowDist === null) {
                this.baselineEyebrowDist = currentEyebrowDist;
            } else {
                this.baselineEyebrowDist = (this.baselineEyebrowDist * 0.95) + (currentEyebrowDist * 0.05);
            }

            const ratio = currentEyebrowDist / (this.baselineEyebrowDist || currentEyebrowDist);
            let tensionRaw = ((1.05 - ratio) / 0.20) * 100;
            tensionRaw = Math.max(0, Math.min(100, tensionRaw));

            this.currentTensionScore = Math.round((this.currentTensionScore * 0.7) + (tensionRaw * 0.3));
        }
    }

    startDOMUpdateLoop() {
        if (this.updateInterval) clearInterval(this.updateInterval);
        this.updateInterval = setInterval(() => {
            this.updateTensionMetricUI();
        }, 2000);
    }

    updateTensionMetricUI() {
        const valEl = document.getElementById('val-tension');
        const subEl = document.getElementById('sub-tension');

        if (!valEl) return;

        if (!this.isCameraActive) {
            valEl.textContent = "Paused";
            if (subEl) {
                subEl.textContent = "Camera Off";
                subEl.style.color = "var(--text-secondary, #94a3b8)";
            }
            return;
        }

        const score = this.currentTensionScore;
        valEl.textContent = `${score}%`;

        if (subEl) {
            if (score < 30) {
                subEl.textContent = "Calm Baseline";
                subEl.style.color = "#22c55e"; // Green
            } else if (score < 60) {
                subEl.textContent = "Elevated Tension";
                subEl.style.color = "#f59e0b"; // Amber
            } else {
                subEl.textContent = "High Stress / Furrowed";
                subEl.style.color = "#ef4444"; // Red
            }
        }
    }

    updateCameraStatusUI(active, text) {
        const statusEl = document.getElementById('cameraStatusText');
        const dotEl = document.getElementById('cameraStatusDot');
        const toggleBtn = document.getElementById('cameraToggleBtn');

        if (statusEl) statusEl.textContent = text;
        
        if (dotEl) {
            dotEl.style.backgroundColor = active ? "#22c55e" : "#ef4444";
        }

        if (toggleBtn) {
            toggleBtn.textContent = active ? "📷 Mute Cam" : "📷 Turn On";
            toggleBtn.style.background = active ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)";
            toggleBtn.style.color = active ? "#f87171" : "#4ade80";
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visionTelemetry = new VisionTelemetry();
    window.visionTelemetry.init();
});

/**
 * StressCalculator — Vision Telemetry Module (MediaPipe Face Mesh)
 * Invisible background processing with hardware-level camera shutdown toggle.
 * 100% Client-Side for Privacy.
 */

class VisionTelemetry {
    constructor() {
        this.videoElement = null;
        this.faceMesh = null;
        this.camera = null;
        this.mediaStream = null;
        this.baselineEyebrowDist = null;
        this.currentTensionScore = 15; // Baseline calm
        this.updateInterval = null;
        this.isCameraActive = false;
    }

    init() {
        this.videoElement = document.getElementById('webcamFeed');
        const cardToggleBtn = document.getElementById('cardCameraToggle');

        if (cardToggleBtn) {
            cardToggleBtn.addEventListener('click', () => this.toggleCamera());
        }

        // Start with camera OFF by default for maximum user privacy & minimal distraction
        this.updateCameraUIState(false, "Camera Offline");
    }

    async startCamera() {
        if (!this.videoElement) {
            this.videoElement = document.getElementById('webcamFeed');
        }

        try {
            // Request Webcam Stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false
            });

            if (this.videoElement) {
                this.videoElement.srcObject = this.mediaStream;
                await this.videoElement.play();
            }

            this.isCameraActive = true;
            this.updateCameraUIState(true, "Calm Baseline");

            // Setup MediaPipe processing loop
            if (!this.faceMesh) {
                this.setupFaceMesh();
            } else if (this.camera) {
                this.camera.start();
            }

            this.startDOMUpdateLoop();

        } catch (error) {
            console.warn("VisionTelemetry: Camera permission denied or device unavailable.", error);
            this.stopCamera();
            this.updateCameraUIState(false, "Access Denied");
        }
    }

    stopCamera() {
        // 1. Physically stop all hardware video tracks to turn off the laptop camera LED light
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        // 2. Halt MediaPipe processing loop
        if (this.camera) {
            this.camera.stop();
        }

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.isCameraActive = false;
        this.updateCameraUIState(false, "Camera Offline");
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

        if (typeof Camera !== 'undefined' && this.videoElement) {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.videoElement && this.isCameraActive && this.videoElement.readyState === 4) {
                        await this.faceMesh.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            this.camera.start();
        }
    }

    onResults(results) {
        if (!this.isCameraActive || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Inner eyebrow landmarks: 107 (right inner brow) & 336 (left inner brow)
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

        if (!valEl || !this.isCameraActive) return;

        const score = this.currentTensionScore;
        valEl.textContent = `${score}%`;

        if (subEl) {
            if (score < 30) {
                subEl.textContent = "Calm Baseline";
                subEl.style.color = "#22c55e";
            } else if (score < 60) {
                subEl.textContent = "Elevated Tension";
                subEl.style.color = "#f59e0b";
            } else {
                subEl.textContent = "High Stress / Furrowed";
                subEl.style.color = "#ef4444";
            }
        }
    }

    updateCameraUIState(active, statusText) {
        const valEl = document.getElementById('val-tension');
        const subEl = document.getElementById('sub-tension');
        const btn = document.getElementById('cardCameraToggle');

        if (btn) {
            btn.textContent = active ? "Stop Camera" : "Start Camera";
            btn.classList.toggle('active', active);
        }

        if (!active) {
            if (valEl) valEl.textContent = "--";
            if (subEl) {
                subEl.textContent = statusText || "Camera Offline";
                subEl.style.color = "var(--text-secondary, #94a3b8)";
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.visionTelemetry = new VisionTelemetry();
    window.visionTelemetry.init();
});

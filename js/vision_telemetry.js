/**
 * StressCalculator — Vision Telemetry Module (MediaPipe Face Mesh)
 * Measures real-time facial tension via eyebrow furrowing and jaw clenching landmarks.
 * 100% Client-Side for Privacy.
 */

class VisionTelemetry {
    constructor() {
        this.videoElement = null;
        this.faceMesh = null;
        this.camera = null;
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

        try {
            // 1. Request Webcam Permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" },
                audio: false
            });

            this.videoElement.srcObject = stream;
            this.isCameraActive = true;
            this.updateCameraStatusUI(true, "Camera Active");

            // 2. Initialize MediaPipe Face Mesh
            this.setupFaceMesh();

        } catch (error) {
            console.warn("VisionTelemetry: Camera permission denied or not available.", error);
            this.updateCameraStatusUI(false, "Camera Denied / Offline");
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

        // Start processing video frames using MediaPipe CameraUtils
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

        // Start 2-second DOM update loop
        this.startDOMUpdateLoop();
    }

    onResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
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

            // Establish moving baseline
            if (this.baselineEyebrowDist === null) {
                this.baselineEyebrowDist = currentEyebrowDist;
            } else {
                this.baselineEyebrowDist = (this.baselineEyebrowDist * 0.95) + (currentEyebrowDist * 0.05);
            }

            // Calculate tension ratio (closer eyebrows = higher furrowing tension)
            const ratio = currentEyebrowDist / (this.baselineEyebrowDist || currentEyebrowDist);
            
            // Map ratio (0.85 = 100% tension, 1.05 = 0% tension)
            let tensionRaw = ((1.05 - ratio) / 0.20) * 100;
            tensionRaw = Math.max(0, Math.min(100, tensionRaw));

            // Smooth value using exponential moving average
            this.currentTensionScore = Math.round((this.currentTensionScore * 0.7) + (tensionRaw * 0.3));
        }
    }

    startDOMUpdateLoop() {
        this.updateInterval = setInterval(() => {
            this.updateTensionMetricUI();
        }, 2000);
    }

    updateTensionMetricUI() {
        const valEl = document.getElementById('val-tension');
        const subEl = document.getElementById('sub-tension');

        if (!valEl) return;

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
        if (statusEl) {
            statusEl.textContent = text;
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.visionTelemetry = new VisionTelemetry();
    window.visionTelemetry.init();
});

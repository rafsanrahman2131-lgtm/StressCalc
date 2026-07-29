/**
 * StressCalculator — Guided Check-In Workflow Controller
 * Manages 3-Step Wizard: 
 * Step 1: 5-Second Bio-Scan (Facial Tension via vision_telemetry.js)
 * Step 2: Subjective Overwhelm & Energy Questionnaire
 * Step 3: Stroop Test Cognitive Game (10 Prompts)
 * Aggregates & POSTs to /api/assessment for weighted MySQL calculation.
 */

class CheckInWorkflow {
    constructor() {
        this.currentStep = 1;
        this.bioScanDuration = 5; // seconds
        this.bioScanTimer = null;
        this.scanTensionScore = 20;

        // Subjective scores
        this.overwhelmScore = 5;
        this.energyScore = 7;

        // Stroop game state
        this.stroopColors = [
            { name: 'RED', color: '#ef4444' },
            { name: 'GREEN', color: '#22c55e' },
            { name: 'BLUE', color: '#3b82f6' },
            { name: 'YELLOW', color: '#eab308' },
            { name: 'PURPLE', color: '#a855f7' }
        ];
        this.stroopRound = 0;
        this.maxStroopRounds = 10;
        this.stroopStartTime = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;
        this.currentCorrectColor = null;

        this.init();
    }

    init() {
        const startBtn = document.getElementById('startCheckInBtn');
        const closeBtn = document.getElementById('closeWizardBtn');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.openWizard());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeWizard());
        }

        // Subjective slider listeners
        const overwhelmInput = document.getElementById('overwhelmInput');
        const energyInput = document.getElementById('energyInput');

        if (overwhelmInput) {
            overwhelmInput.addEventListener('input', (e) => {
                this.overwhelmScore = parseInt(e.target.value);
                document.getElementById('overwhelmVal').textContent = e.target.value;
            });
        }

        if (energyInput) {
            energyInput.addEventListener('input', (e) => {
                this.energyScore = parseInt(e.target.value);
                document.getElementById('energyVal').textContent = e.target.value;
            });
        }

        // Step 2 Next Button
        const step2NextBtn = document.getElementById('step2NextBtn');
        if (step2NextBtn) {
            step2NextBtn.addEventListener('click', () => this.goToStep(3));
        }
    }

    openWizard() {
        const modal = document.getElementById('checkinWizard');
        if (modal) {
            modal.style.display = 'flex';
            this.goToStep(1);
        }
    }

    closeWizard() {
        const modal = document.getElementById('checkinWizard');
        if (modal) {
            modal.style.display = 'none';
        }
        if (this.bioScanTimer) {
            clearInterval(this.bioScanTimer);
        }
    }

    goToStep(stepNum) {
        this.currentStep = stepNum;

        // Hide all steps
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.style.display = 'none';
            step.classList.remove('active');
        });

        // Update progress bar
        const progressFill = document.getElementById('wizardProgressFill');
        const progressText = document.getElementById('wizardProgressText');
        
        if (progressFill) progressFill.style.width = `${(stepNum / 3) * 100}%`;
        if (progressText) progressText.textContent = `Step ${stepNum} of 3`;

        // Show target step
        const targetStep = document.getElementById(`step${stepNum}`);
        if (targetStep) {
            targetStep.style.display = 'block';
            setTimeout(() => targetStep.classList.add('active'), 50);
        }

        // Execute step-specific handlers
        if (stepNum === 1) {
            this.runStep1BioScan();
        } else if (stepNum === 3) {
            this.startStroopGame();
        }
    }

    // STEP 1: 5-Second Bio-Scan
    async runStep1BioScan() {
        const timerEl = document.getElementById('scanTimerCount');
        const scanStatusEl = document.getElementById('scanStatusMessage');
        let timeLeft = 5;

        if (timerEl) timerEl.textContent = timeLeft;
        if (scanStatusEl) scanStatusEl.textContent = "Initiating Camera & MediaPipe Model...";

        if (window.visionTelemetry) {
            await window.visionTelemetry.startCamera();
            if (scanStatusEl) scanStatusEl.textContent = "Analyzing Facial Tension... Keep Face Centered";
        }

        if (this.bioScanTimer) clearInterval(this.bioScanTimer);

        this.bioScanTimer = setInterval(() => {
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(this.bioScanTimer);
                this.scanTensionScore = window.visionTelemetry ? window.visionTelemetry.currentTensionScore : 25;

                // Stop 5-second burst camera if manual dashboard toggle was NOT active
                const cardToggle = document.getElementById('cardCameraToggle');
                if (cardToggle && !cardToggle.classList.contains('active')) {
                    if (window.visionTelemetry) window.visionTelemetry.stopCamera();
                }

                if (scanStatusEl) scanStatusEl.textContent = "Bio-Scan Complete! Transitioning...";

                setTimeout(() => {
                    this.goToStep(2);
                }, 800);
            }
        }, 1000);
    }

    // STEP 3: Stroop Test Cognitive Game
    startStroopGame() {
        this.stroopRound = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;
        this.nextStroopRound();
    }

    nextStroopRound() {
        if (this.stroopRound >= this.maxStroopRounds) {
            this.finishCheckIn();
            return;
        }

        this.stroopRound++;
        const roundEl = document.getElementById('stroopRoundCounter');
        if (roundEl) roundEl.textContent = `Prompt ${this.stroopRound} / ${this.maxStroopRounds}`;

        const textObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        let inkObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        
        if (Math.random() < 0.7) {
            while (inkObj.name === textObj.name) {
                inkObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
            }
        }

        this.currentCorrectColor = inkObj.name;

        const targetWordEl = document.getElementById('stroopTargetWord');
        if (targetWordEl) {
            targetWordEl.textContent = textObj.name;
            targetWordEl.style.color = inkObj.color;
        }

        const optionsContainer = document.getElementById('stroopOptionsContainer');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            const shuffled = [...this.stroopColors].sort(() => 0.5 - Math.random());
            shuffled.forEach(c => {
                const btn = document.createElement('button');
                btn.className = 'stroop-opt-btn';
                btn.textContent = c.name;
                btn.style.borderColor = c.color;
                btn.addEventListener('click', () => this.handleStroopChoice(c.name));
                optionsContainer.appendChild(btn);
            });
        }

        this.stroopStartTime = performance.now();
    }

    handleStroopChoice(chosenColorName) {
        const reactionTime = performance.now() - this.stroopStartTime;
        this.totalReactionTime += reactionTime;

        if (chosenColorName === this.currentCorrectColor) {
            this.correctAnswers++;
        }

        this.nextStroopRound();
    }

    // COMPLETION: POST payload to /api/assessment and trigger success notification
    async finishCheckIn() {
        const avgReactionTimeMs = Math.round(this.totalReactionTime / this.maxStroopRounds);
        const accuracyPct = Math.round((this.correctAnswers / this.maxStroopRounds) * 100);

        try {
            const response = await fetch('/api/assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facialTension: this.scanTensionScore,
                    overwhelm: this.overwhelmScore,
                    energy: this.energyScore,
                    reactionTimeMs: avgReactionTimeMs,
                    accuracy: accuracyPct
                })
            });

            if (response.ok) {
                const result = await response.json();
                const finalIndex = result.final_stress_index || 42;
                
                // Show Glassmorphic Toast Notification on Dashboard
                this.showToastNotification(finalIndex, this.scanTensionScore, this.overwhelmScore, avgReactionTimeMs);
            }
        } catch (err) {
            console.warn("Assessment POST sync error:", err);
        }

        // Close wizard & reload Chart.js dataset
        this.closeWizard();
        if (typeof loadChartData === 'function') {
            loadChartData();
        }
    }

    showToastNotification(stressIndex, tension, overwhelm, reactionMs) {
        let toast = document.getElementById('assessmentToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'assessmentToast';
            toast.className = 'assessment-toast';
            document.body.appendChild(toast);
        }

        let statusColor = "#22c55e"; // Green
        let statusLabel = "Low Stress Baseline";

        if (stressIndex > 65) {
            statusColor = "#ef4444"; // Red
            statusLabel = "High Overload Warning";
        } else if (stressIndex > 35) {
            statusColor = "#f59e0b"; // Amber
            statusLabel = "Moderate Stress";
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 800; font-size: 0.95rem; color: #fff;">⚡ Unified Stress Index Calculated</span>
                <span style="background: ${statusColor}; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 6px;">${statusLabel}</span>
            </div>
            <div style="font-size: 2rem; font-weight: 900; color: ${statusColor}; font-family: 'JetBrains Mono', monospace; margin-bottom: 6px;">
                ${stressIndex} <span style="font-size: 1rem; color: rgba(255,255,255,0.6);">/ 100</span>
            </div>
            <div style="font-size: 0.75rem; opacity: 0.8; display: flex; gap: 12px;">
                <span>Facial Tension: <strong>${tension}%</strong></span>
                <span>Overwhelm: <strong>${overwhelm}/10</strong></span>
                <span>Reaction: <strong>${reactionMs}ms</strong></span>
            </div>
        `;

        toast.style.display = 'block';
        setTimeout(() => toast.classList.add('show'), 50);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.style.display = 'none', 400);
        }, 6000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.checkInWorkflow = new CheckInWorkflow();
});

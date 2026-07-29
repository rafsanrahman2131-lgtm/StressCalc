/**
 * StressCalculator — Guided Check-In Workflow Controller
 * Manages 3-Step Wizard: 
 * Step 1: 5-Second Bio-Scan (Facial Tension via vision_telemetry.js)
 * Step 2: Subjective Overwhelm & Energy Questionnaire
 * Step 3: Stroop Test Cognitive Game (10 Prompts)
 * Aggregates & updates dashboard telemetry + MySQL backend.
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
        } else if (stepNum === 2) {
            // Stop camera if user moved to step 2 manually
            if (window.visionTelemetry && window.visionTelemetry.isCameraActive) {
                // Keep manual dashboard toggle state unchanged, only handle scan burst
            }
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

        // Start camera via vision_telemetry.js without breaking dashboard controls
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

                // Stop 5-second burst camera if dashboard toggle was NOT manually turned on by user
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

        // Random text name vs random ink color
        const textObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        let inkObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        
        // Ensure high interference by creating mismatched colors 70% of the time
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

        // Render option buttons
        const optionsContainer = document.getElementById('stroopOptionsContainer');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            // Shuffle choices
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

    // COMPLETION: Aggregate payload & update Dashboard + Backend
    async finishCheckIn() {
        const avgReactionTimeMs = Math.round(this.totalReactionTime / this.maxStroopRounds);
        const accuracyPct = Math.round((this.correctAnswers / this.maxStroopRounds) * 100);

        // Calculate Focus Index out of 10
        let computedFocus = (accuracyPct / 10) * 0.6 + (Math.max(0, 1000 - avgReactionTimeMs) / 100) * 0.4;
        computedFocus = Math.max(1.0, Math.min(10.0, Math.round(computedFocus * 10) / 10));

        // Calculate Cognitive Bandwidth %
        let computedBandwidth = Math.round(100 - (this.overwhelmScore * 6) - (this.scanTensionScore * 0.3));
        computedBandwidth = Math.max(10, Math.min(100, computedBandwidth));

        // Update DOM metrics immediately
        const valBandwidth = document.getElementById('val-bandwidth');
        const valFocus = document.getElementById('val-focus');
        const valSwitches = document.getElementById('val-switches');

        if (valBandwidth) valBandwidth.textContent = `${computedBandwidth}%`;
        if (valFocus) valFocus.innerHTML = `${computedFocus}<span style="font-size: 1.2rem; opacity: 0.5;">/10</span>`;
        if (valSwitches) valSwitches.textContent = Math.max(5, Math.min(25, 14 + Math.round((10 - computedFocus) * 1.2)));

        // Send payload to backend
        try {
            await fetch('/api/telemetry-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cognitiveBandwidth: computedBandwidth,
                    focusIndex: computedFocus,
                    facialTension: this.scanTensionScore,
                    overwhelm: this.overwhelmScore,
                    energy: this.energyScore,
                    reactionTimeMs: avgReactionTimeMs,
                    accuracy: accuracyPct
                })
            });
        } catch (err) {
            console.warn("Backend sync notice:", err);
        }

        // Close wizard & reload Chart.js dataset
        this.closeWizard();
        if (typeof loadChartData === 'function') {
            loadChartData();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.checkInWorkflow = new CheckInWorkflow();
});

/**
 * StressCalculator — Dynamic Adaptive Check-In Workflow Controller
 * 
 * Dynamically selects & prompts tailored cognitive challenges based on live telemetry:
 * 1. Stroop Executive Function Test ("stroop")
 * 2. 4-7-8 Box Breathing Vagus Reset ("breathing")
 * 3. Rapid Mental Math Speed Challenge ("math_speed")
 * 4. Visual Pattern Memory Flash Game ("pattern_memory")
 */

class CheckInWorkflow {
    constructor() {
        this.currentStep = 1;
        this.bioScanDuration = 5;
        this.bioScanTimer = null;
        this.scanTensionScore = 20;

        this.overwhelmScore = 5;
        this.energyScore = 7;

        this.activeGameType = "stroop";
        this.gameTitle = "Cognitive Challenge";
        this.recommendationReason = "";

        // Stroop Game State
        this.stroopColors = [
            { name: 'RED', color: '#ef4444' },
            { name: 'GREEN', color: '#22c55e' },
            { name: 'BLUE', color: '#3b82f6' },
            { name: 'YELLOW', color: '#eab308' },
            { name: 'PURPLE', color: '#a855f7' }
        ];
        this.stroopRound = 0;
        this.maxStroopRounds = 8;
        this.stroopStartTime = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;

        // Math Game State
        this.mathRound = 0;
        this.maxMathRounds = 5;
        this.mathStartTime = 0;
        this.currentMathAnswer = 0;

        // Pattern Memory Game State
        this.patternTargetTiles = [];
        this.patternUserSelected = [];
        this.patternRound = 0;
        this.maxPatternRounds = 3;

        // Breathing State
        this.breathingCycle = 0;
        this.maxBreathingCycles = 3;

        this.init();
    }

    init() {
        const startBtn = document.getElementById('startCheckInBtn');
        const closeBtn = document.getElementById('closeWizardBtn');

        if (startBtn) startBtn.addEventListener('click', () => this.openWizard());
        if (closeBtn) closeBtn.addEventListener('click', () => this.closeWizard());

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

        const step2NextBtn = document.getElementById('step2NextBtn');
        if (step2NextBtn) {
            step2NextBtn.addEventListener('click', () => this.evaluateAndProceedToStep3());
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
        if (modal) modal.style.display = 'none';
        if (this.bioScanTimer) clearInterval(this.bioScanTimer);
    }

    goToStep(stepNum) {
        this.currentStep = stepNum;

        document.querySelectorAll('.wizard-step').forEach(step => {
            step.style.display = 'none';
            step.classList.remove('active');
        });

        const progressFill = document.getElementById('wizardProgressFill');
        const progressText = document.getElementById('wizardProgressText');
        
        if (progressFill) progressFill.style.width = `${(stepNum / 3) * 100}%`;
        if (progressText) progressText.textContent = `Step ${stepNum} of 3`;

        const targetStep = document.getElementById(`step${stepNum}`);
        if (targetStep) {
            targetStep.style.display = 'block';
            setTimeout(() => targetStep.classList.add('active'), 50);
        }

        if (stepNum === 1) {
            this.runStep1BioScan();
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

                const cardToggle = document.getElementById('cardCameraToggle');
                if (cardToggle && !cardToggle.classList.contains('active')) {
                    if (window.visionTelemetry) window.visionTelemetry.stopCamera();
                }

                if (scanStatusEl) scanStatusEl.textContent = "Bio-Scan Complete! Transitioning...";
                setTimeout(() => this.goToStep(2), 800);
            }
        }, 1000);
    }

    /**
     * STEP 2 -> STEP 3: Query Recommendation Engine silently
     */
    async evaluateAndProceedToStep3() {
        const telemetry = window.telemetryEngine ? window.telemetryEngine.state : { focusIndex: 8.5, cognitiveBandwidth: 85, ambientNoiseDb: 42, contextSwitches: 0 };

        try {
            const response = await fetch('/api/recommend-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    focusIndex: telemetry.focusIndex,
                    cognitiveBandwidth: telemetry.cognitiveBandwidth,
                    ambientNoiseDb: telemetry.ambientNoiseDb,
                    contextSwitches: telemetry.contextSwitches,
                    facialTension: this.scanTensionScore,
                    overwhelmScore: this.overwhelmScore
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.activeGameType = data.game_type || 'stroop';
                this.gameTitle = data.game_title || 'Cognitive Challenge';
            }
        } catch (e) {
            console.warn("Recommendation engine fallback:", e);
            this.activeGameType = 'stroop';
        }

        this.goToStep(3);
        this.renderAdaptiveGame();
    }

    renderAdaptiveGame() {
        const titleEl = document.getElementById('adaptiveGameTitle');
        const container = document.getElementById('adaptiveGameContainer');

        if (titleEl) titleEl.textContent = this.gameTitle;
        if (!container) return;
        container.innerHTML = '';

        if (this.activeGameType === 'breathing') {
            this.startBreathingGame(container);
        } else if (this.activeGameType === 'math_speed') {
            this.startMathGame(container);
        } else if (this.activeGameType === 'pattern_memory') {
            this.startPatternMemoryGame(container);
        } else {
            this.startStroopGame(container);
        }
    }

    // GAME 1: 4-7-8 Breathing Grounding
    startBreathingGame(container) {
        this.breathingCycle = 0;
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem 0;">
                <div id="breathCircle" style="width: 120px; height: 120px; border-radius: 50%; background: rgba(34, 197, 94, 0.2); border: 3px solid #22c55e; margin: 0 auto 1.5rem auto; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: #22c55e; transition: transform 4s ease-in-out, background-color 4s ease-in-out;">
                    <span id="breathText">Inhale</span>
                </div>
                <div id="breathSubText" style="font-size: 1.1rem; font-weight: 700; color: #ffffff; margin-bottom: 12px;">Cycle 1 of 3: Deep Inhale (4s)</div>
                <button id="finishBreathingBtn" class="btn-wizard-primary" style="display: none;">Complete Reset</button>
            </div>
        `;

        this.runBreathingCycle();
    }

    runBreathingCycle() {
        const circle = document.getElementById('breathCircle');
        const text = document.getElementById('breathText');
        const subText = document.getElementById('breathSubText');
        const btn = document.getElementById('finishBreathingBtn');

        if (this.breathingCycle >= this.maxBreathingCycles) {
            if (circle) circle.style.transform = 'scale(1.0)';
            if (text) text.textContent = 'Done!';
            if (subText) subText.textContent = 'Breathing Exercise Complete!';
            if (btn) {
                btn.style.display = 'block';
                btn.addEventListener('click', () => this.finishCheckIn(350, 95));
            }
            return;
        }

        this.breathingCycle++;

        // Phase 1: Inhale 4s
        if (circle) circle.style.transform = 'scale(1.4)';
        if (text) text.textContent = 'Inhale';
        if (subText) subText.textContent = `Cycle ${this.breathingCycle} of 3: Deep Inhale...`;

        setTimeout(() => {
            // Phase 2: Hold 4s
            if (text) text.textContent = 'Hold';
            if (subText) subText.textContent = `Cycle ${this.breathingCycle} of 3: Hold Breath...`;

            setTimeout(() => {
                // Phase 3: Exhale 4s
                if (circle) circle.style.transform = 'scale(0.85)';
                if (text) text.textContent = 'Exhale';
                if (subText) subText.textContent = `Cycle ${this.breathingCycle} of 3: Slowly Exhale...`;

                setTimeout(() => {
                    this.runBreathingCycle();
                }, 4000);
            }, 4000);
        }, 4000);
    }

    // GAME 2: Rapid Mental Math Agility Challenge
    startMathGame(container) {
        this.mathRound = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;
        this.nextMathRound(container);
    }

    nextMathRound(container) {
        if (this.mathRound >= this.maxMathRounds) {
            const avgReaction = Math.round(this.totalReactionTime / this.maxMathRounds);
            const accuracy = Math.round((this.correctAnswers / this.maxMathRounds) * 100);
            this.finishCheckIn(avgReaction, accuracy);
            return;
        }

        this.mathRound++;
        const num1 = Math.floor(Math.random() * 30) + 10;
        const num2 = Math.floor(Math.random() * 25) + 5;
        const isAdd = Math.random() > 0.4;
        
        this.currentMathAnswer = isAdd ? (num1 + num2) : (num1 - num2);
        const expr = isAdd ? `${num1} + ${num2}` : `${num1} - ${num2}`;

        let options = [this.currentMathAnswer];
        while (options.length < 4) {
            let offset = (Math.floor(Math.random() * 10) - 5) || 2;
            let fake = this.currentMathAnswer + offset;
            if (!options.includes(fake)) options.push(fake);
        }
        options.sort(() => Math.random() - 0.5);

        container.innerHTML = `
            <div style="text-align: center; padding: 1rem 0;">
                <div style="font-size: 0.85rem; font-weight: 700; opacity: 0.7; margin-bottom: 8px;">Question ${this.mathRound} of ${this.maxMathRounds}</div>
                <div style="font-size: 2.8rem; font-weight: 900; color: #ffffff; letter-spacing: 2px; margin-bottom: 1.5rem;">${expr} = ?</div>
                <div class="stroop-grid">
                    ${options.map(opt => `
                        <button class="stroop-opt-btn math-btn" style="border-color: rgba(255,255,255,0.2); font-size: 1.4rem;">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `;

        this.mathStartTime = performance.now();

        container.querySelectorAll('.math-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = parseInt(e.target.textContent);
                const reaction = performance.now() - this.mathStartTime;
                this.totalReactionTime += reaction;
                if (choice === this.currentMathAnswer) this.correctAnswers++;
                this.nextMathRound(container);
            });
        });
    }

    // GAME 3: Visual Pattern Memory Flash Game
    startPatternMemoryGame(container) {
        this.patternRound = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;
        this.nextPatternRound(container);
    }

    nextPatternRound(container) {
        if (this.patternRound >= this.maxPatternRounds) {
            const avgReaction = Math.round(this.totalReactionTime / this.maxPatternRounds);
            const accuracy = Math.round((this.correctAnswers / this.maxPatternRounds) * 100);
            this.finishCheckIn(avgReaction, accuracy);
            return;
        }

        this.patternRound++;
        this.patternTargetTiles = [];
        this.patternUserSelected = [];

        while (this.patternTargetTiles.length < 3) {
            let r = Math.floor(Math.random() * 9);
            if (!this.patternTargetTiles.includes(r)) this.patternTargetTiles.push(r);
        }

        container.innerHTML = `
            <div style="text-align: center; padding: 0.5rem 0;">
                <div style="font-size: 0.85rem; font-weight: 700; opacity: 0.7; margin-bottom: 6px;">Pattern ${this.patternRound} of ${this.maxPatternRounds}</div>
                <div id="patternStatus" style="font-size: 0.95rem; font-weight: 700; color: #f59e0b; margin-bottom: 1rem;">Memorize the 3 Green Tiles...</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 270px; margin: 0 auto;">
                    ${[0,1,2,3,4,5,6,7,8].map(i => `
                        <div class="pattern-tile" data-idx="${i}" style="height: 75px; background: rgba(255,255,255,0.06); border-radius: 12px; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s ease;"></div>
                    `).join('')}
                </div>
            </div>
        `;

        const tiles = container.querySelectorAll('.pattern-tile');
        this.patternTargetTiles.forEach(idx => {
            if (tiles[idx]) {
                tiles[idx].style.background = '#22c55e';
                tiles[idx].style.borderColor = '#22c55e';
                tiles[idx].style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.6)';
            }
        });

        setTimeout(() => {
            tiles.forEach(tile => {
                tile.style.background = 'rgba(255,255,255,0.06)';
                tile.style.borderColor = 'rgba(255,255,255,0.1)';
                tile.style.boxShadow = 'none';
            });

            const status = document.getElementById('patternStatus');
            if (status) {
                status.textContent = "Click the 3 remembered tiles!";
                status.style.color = "#22c55e";
            }

            this.mathStartTime = performance.now();

            tiles.forEach(tile => {
                tile.addEventListener('click', (e) => {
                    const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
                    if (this.patternUserSelected.includes(idx)) return;

                    this.patternUserSelected.push(idx);
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.borderColor = '#3b82f6';

                    if (this.patternUserSelected.length === 3) {
                        const reaction = performance.now() - this.mathStartTime;
                        this.totalReactionTime += reaction;

                        let matches = this.patternUserSelected.filter(x => this.patternTargetTiles.includes(x)).length;
                        if (matches === 3) this.correctAnswers++;

                        setTimeout(() => this.nextPatternRound(container), 600);
                    }
                });
            });
        }, 1500);
    }

    // GAME 4: Standard Stroop Executive Test
    startStroopGame(container) {
        this.stroopRound = 0;
        this.totalReactionTime = 0;
        this.correctAnswers = 0;
        this.nextStroopRound(container);
    }

    nextStroopRound(container) {
        if (this.stroopRound >= this.maxStroopRounds) {
            const avgReaction = Math.round(this.totalReactionTime / this.maxStroopRounds);
            const accuracy = Math.round((this.correctAnswers / this.maxStroopRounds) * 100);
            this.finishCheckIn(avgReaction, accuracy);
            return;
        }

        this.stroopRound++;

        const textObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        let inkObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
        
        if (Math.random() < 0.7) {
            while (inkObj.name === textObj.name) {
                inkObj = this.stroopColors[Math.floor(Math.random() * this.stroopColors.length)];
            }
        }

        this.currentCorrectColor = inkObj.name;

        container.innerHTML = `
            <div style="text-align: center; padding: 0.5rem 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.8rem; font-weight: 700; opacity: 0.7;">Prompt ${this.stroopRound} / ${this.maxStroopRounds}</span>
                    <span style="font-size: 0.75rem; color: #f59e0b; font-weight: 700;">⚠️ Click INK color, NOT text!</span>
                </div>
                <div style="font-size: 3rem; font-weight: 900; color: ${inkObj.color}; letter-spacing: 2px; margin: 1rem 0;">${textObj.name}</div>
                <div class="stroop-grid">
                    ${[...this.stroopColors].sort(() => 0.5 - Math.random()).map(c => `
                        <button class="stroop-opt-btn stroop-btn" data-color="${c.name}" style="border-color: ${c.color};">${c.name}</button>
                    `).join('')}
                </div>
            </div>
        `;

        this.stroopStartTime = performance.now();

        container.querySelectorAll('.stroop-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const choice = e.target.getAttribute('data-color');
                const reaction = performance.now() - this.stroopStartTime;
                this.totalReactionTime += reaction;
                if (choice === this.currentCorrectColor) this.correctAnswers++;
                this.nextStroopRound(container);
            });
        });
    }

    // COMPLETION
    async finishCheckIn(avgReactionMs = 450, accuracyPct = 90) {
        try {
            const response = await fetch('/api/assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    facialTension: this.scanTensionScore,
                    overwhelm: this.overwhelmScore,
                    energy: this.energyScore,
                    reactionTimeMs: avgReactionMs,
                    accuracy: accuracyPct
                })
            });

            if (response.ok) {
                const result = await response.json();
                const finalIndex = result.final_stress_index || 42;
                this.showToastNotification(finalIndex, this.scanTensionScore, this.overwhelmScore, avgReactionMs);
            }
        } catch (err) {
            console.warn("Assessment POST sync error:", err);
        }

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

        let statusColor = "#22c55e";
        let statusLabel = "Low Stress Baseline";

        if (stressIndex > 65) {
            statusColor = "#ef4444";
            statusLabel = "High Overload Warning";
        } else if (stressIndex > 35) {
            statusColor = "#f59e0b";
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

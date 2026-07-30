/**
 * StressCalculator — Environmental Telemetry Dashboard Controller
 *
 * Tab Density Chart: reads window.telemetryEngine.state.tabDensity (live context-switch counter)
 * Audio Classification: reads window.liveAudioBreakdown (rolling buffer classified from live mic dB)
 * Peak Stressors: reads historical DB rows via /api/environmental/today
 */

window.tabDensityChartInstance   = null;
window.audioBreakdownChartInstance = null;

let envLiveInterval = null;

/* ─── Main entry point called by navigation.js ─────────────────────────────── */
async function fetchEnvironmentalData() {
    // Fetch historical DB data for Peak Stressors list
    let dbData = null;
    try {
        const response = await fetch('/api/environmental/today');
        if (response.ok) {
            dbData = await response.json();
        }
    } catch (e) {
        console.warn('Environmental API unreachable, continuing with live sensors:', e.message);
    }

    // Build tab density timeline from DB history + live reading
    const tabTimeline = buildTabTimeline(dbData);

    // Audio breakdown: prefer live microphone buffer, fall back to DB derivation
    const audioBreakdown = buildAudioBreakdown(dbData);

    // Peak stressors from DB
    const peakSpikes = (dbData && dbData.peakSpikes) ? dbData.peakSpikes : buildLivePeakSpikes();

    renderTabDensityChart(tabTimeline);
    renderAudioBreakdownChart(audioBreakdown);
    renderPeakSpikesList(peakSpikes);

    // Start live update loop so charts refresh every 3 seconds
    if (envLiveInterval) clearInterval(envLiveInterval);
    envLiveInterval = setInterval(() => {
        updateLiveEnvironmentalCharts();
    }, 3000);
}

/* ─── Build tab density timeline ────────────────────────────────────────────── */
function buildTabTimeline(dbData) {
    const timeline = [];

    // Add historical points from DB
    if (dbData && dbData.tabDensityTimeline && dbData.tabDensityTimeline.length > 0) {
        // De-duplicate by timestamp, keep distinct ones
        const seen = new Set();
        for (const item of dbData.tabDensityTimeline) {
            if (!seen.has(item.fullTimestamp)) {
                seen.add(item.fullTimestamp);
                timeline.push({ timestamp: item.timestamp, tabDensity: item.tabDensity });
            }
        }
    }

    // Append the live current reading
    const liveNow = new Date();
    const nowLabel = `${String(liveNow.getHours()).padStart(2,'0')}:${String(liveNow.getMinutes()).padStart(2,'0')}`;
    const liveTabs = (window.telemetryEngine && window.telemetryEngine.state)
        ? window.telemetryEngine.state.tabDensity
        : 1;
    timeline.push({ timestamp: nowLabel + ' ●', tabDensity: liveTabs });

    return timeline;
}

/* ─── Build audio breakdown ─────────────────────────────────────────────────── */
function buildAudioBreakdown(dbData) {
    // If live microphone has been running long enough, use its rolling buffer
    if (window.liveAudioBreakdown) {
        // Remove zero-value categories so the chart looks clean
        const cleaned = {};
        for (const [k, v] of Object.entries(window.liveAudioBreakdown)) {
            if (v > 0) cleaned[k] = v;
        }
        if (Object.keys(cleaned).length > 0) return cleaned;
    }

    // Fallback: derive from DB ambient_noise_db values
    if (dbData && dbData.audioBreakdown) return dbData.audioBreakdown;

    return { 'Silence': 50, 'Speech': 30, 'Background Noise': 20 };
}

/* ─── Build live peak spikes if no DB data ──────────────────────────────────── */
function buildLivePeakSpikes() {
    const liveDb = (window.telemetryEngine && window.telemetryEngine.state)
        ? window.telemetryEngine.state.ambientNoiseDb
        : 45;
    const now = new Date().toLocaleTimeString();
    return [
        { timestamp: now, noiseDb: liveDb, classification: liveDb >= 70 ? 'Loud Noise Spike' : (liveDb >= 55 ? 'Speech Disturbance' : 'Ambient Level') }
    ];
}

/* ─── Live update: refresh charts with latest sensor readings ───────────────── */
function updateLiveEnvironmentalCharts() {
    // 1. Push a new live point onto the Tab Density chart
    if (window.tabDensityChartInstance && window.telemetryEngine && window.telemetryEngine.state) {
        const liveTabs = window.telemetryEngine.state.tabDensity;
        const liveNow  = new Date();
        const nowLabel = `${String(liveNow.getHours()).padStart(2,'0')}:${String(liveNow.getMinutes()).padStart(2,'0')} ●`;

        window.tabDensityChartInstance.data.labels.push(nowLabel);
        window.tabDensityChartInstance.data.datasets[0].data.push(liveTabs);

        // Keep only the last 20 points visible
        if (window.tabDensityChartInstance.data.labels.length > 20) {
            window.tabDensityChartInstance.data.labels.shift();
            window.tabDensityChartInstance.data.datasets[0].data.shift();
        }
        window.tabDensityChartInstance.update('active');
    }

    // 2. Refresh the Audio Classification doughnut from the live mic buffer
    if (window.audioBreakdownChartInstance && window.liveAudioBreakdown) {
        const breakdown = window.liveAudioBreakdown;
        const labels  = Object.keys(breakdown).filter(k  => breakdown[k] > 0);
        const values  = labels.map(k => breakdown[k]);
        const colors  = labels.map(k => {
            if (k === 'Silence')          return '#22c55e';
            if (k === 'Speech')           return '#3b82f6';
            if (k === 'Background Noise') return '#f59e0b';
            return '#ef4444'; // Loud Spikes
        });

        window.audioBreakdownChartInstance.data.labels = labels;
        window.audioBreakdownChartInstance.data.datasets[0].data = values;
        window.audioBreakdownChartInstance.data.datasets[0].backgroundColor = colors;
        window.audioBreakdownChartInstance.update('active');
    }
}

/* ─── Chart renderers ───────────────────────────────────────────────────────── */
function renderTabDensityChart(timeline) {
    const ctx = document.getElementById('tabDensityChart');
    if (!ctx) return;

    const labels = timeline.map(item => item.timestamp || '00:00');
    const values = timeline.map(item => item.tabDensity || 0);

    const activeTheme = localStorage.getItem('stresscalc_theme') || 'dark';
    const gridColor = activeTheme === 'light' ? 'rgba(0,0,0,0.08)' : (activeTheme === 'contrast' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)');
    const tickColor = activeTheme === 'light' ? '#0f172a' : (activeTheme === 'contrast' ? '#ffffff' : 'rgba(255,255,255,0.7)');

    if (window.tabDensityChartInstance) {
        window.tabDensityChartInstance.destroy();
    }

    window.tabDensityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Open Browser Tabs',
                data: values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.18)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `Tab Density: ${ctx.parsed.y} context switch${ctx.parsed.y !== 1 ? 'es' : ''}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { family: 'Inter', size: 11 }, maxTicksLimit: 10 }
                },
                y: {
                    min: 0,
                    suggestedMax: 10,
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { family: 'Inter', size: 11 }, stepSize: 1, precision: 0 }
                }
            }
        }
    });
}

function renderAudioBreakdownChart(breakdown) {
    const ctx = document.getElementById('audioBreakdownChart');
    if (!ctx) return;

    const colorMap = {
        'Silence':          '#22c55e',
        'Speech':           '#3b82f6',
        'Background Noise': '#f59e0b',
        'Loud Spikes':      '#ef4444'
    };

    const labels = Object.keys(breakdown).filter(k => breakdown[k] > 0);
    const values = labels.map(k => breakdown[k]);
    const colors = labels.map(k => colorMap[k] || '#94a3b8');

    if (window.audioBreakdownChartInstance) {
        window.audioBreakdownChartInstance.destroy();
    }

    const activeTheme = localStorage.getItem('stresscalc_theme') || 'dark';
    const legendColor = activeTheme === 'light' ? '#0f172a' : 'rgba(255,255,255,0.85)';

    window.audioBreakdownChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'rgba(24, 24, 27, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: legendColor,
                        font: { family: 'Inter', size: 12, weight: '600' },
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.parsed}%`
                    }
                }
            },
            cutout: '68%'
        }
    });
}

function renderPeakSpikesList(spikes) {
    const listEl = document.getElementById('peakSpikesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!spikes || spikes.length === 0) {
        listEl.innerHTML = '<li style="padding:12px;opacity:0.7;">No acoustic spikes recorded today.</li>';
        return;
    }

    spikes.forEach((spike, idx) => {
        const db = spike.noiseDb || 60;
        const badgeColor = db >= 70 ? '#ef4444' : db >= 55 ? '#f59e0b' : '#3b82f6';
        const li = document.createElement('li');
        Object.assign(li.style, {
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', marginBottom: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px'
        });
        li.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-weight:900;font-size:1rem;color:${badgeColor};font-family:monospace;">#${idx + 1}</span>
                <div>
                    <div style="font-weight:700;font-size:0.95rem;">${spike.classification || 'Acoustic Spike'}</div>
                    <div style="font-size:0.8rem;color:rgba(255,255,255,0.6);font-family:monospace;">${spike.timestamp || 'Today'}</div>
                </div>
            </div>
            <span style="background:${badgeColor};color:#fff;padding:4px 12px;border-radius:8px;font-weight:800;font-size:0.9rem;">${db} dB</span>
        `;
        listEl.appendChild(li);
    });
}

window.fetchEnvironmentalData = fetchEnvironmentalData;

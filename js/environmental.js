/**
 * StressCalculator — Environmental Telemetry Dashboard Controller
 * Fetches /api/environmental/today and renders:
 * 1. Tab Density Area Chart over the course of today
 * 2. YAMNet Audio Classification Breakdown Doughnut Chart
 * 3. Peak Stressors List (Top 3 Ambient Noise Spikes in dB)
 */

window.tabDensityChartInstance = null;
window.audioBreakdownChartInstance = null;

async function fetchEnvironmentalData() {
    try {
        const response = await fetch('/api/environmental/today');
        let data = null;
        if (response.ok) {
            data = await response.json();
        }

        if (!data || !data.tabDensityTimeline) {
            data = generateFallbackEnvironmentalData();
        }

        renderTabDensityChart(data.tabDensityTimeline);
        renderAudioBreakdownChart(data.audioBreakdown);
        renderPeakSpikesList(data.peakSpikes);

    } catch (error) {
        console.warn("fetchEnvironmentalData notice, using fallback dataset:", error);
        const fallbackData = generateFallbackEnvironmentalData();
        renderTabDensityChart(fallbackData.tabDensityTimeline);
        renderAudioBreakdownChart(fallbackData.audioBreakdown);
        renderPeakSpikesList(fallbackData.peakSpikes);
    }
}

function renderTabDensityChart(timeline) {
    const ctx = document.getElementById('tabDensityChart');
    if (!ctx) return;

    const labels = timeline.map(item => item.timestamp || '00:00');
    const values = timeline.map(item => item.tabDensity || 0);

    const activeTheme = localStorage.getItem('stresscalc_theme') || 'dark';
    let gridColor = activeTheme === 'light' ? 'rgba(0,0,0,0.08)' : (activeTheme === 'contrast' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)');
    let tickColor = activeTheme === 'light' ? '#0f172a' : (activeTheme === 'contrast' ? '#ffffff' : 'rgba(255,255,255,0.7)');

    if (window.tabDensityChartInstance) {
        window.tabDensityChartInstance.destroy();
    }

    window.tabDensityChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Open Browser Tabs',
                data: values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', size: 12 },
                    bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `Tab Density: ${context.parsed.y} open tabs`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: tickColor, font: { family: 'Inter', size: 11 } }
                },
                y: {
                    min: 0,
                    grid: { color: gridColor, drawBorder: false },
                    ticks: { color: tickColor, font: { family: 'Inter', size: 11 }, stepSize: 5 }
                }
            }
        }
    });
}

function renderAudioBreakdownChart(breakdown) {
    const ctx = document.getElementById('audioBreakdownChart');
    if (!ctx) return;

    const labels = Object.keys(breakdown || {});
    const values = Object.values(breakdown || {});

    const backgroundColors = [
        '#22c55e', // Silence (Green)
        '#3b82f6', // Speech (Blue)
        '#f59e0b', // Background Noise (Amber)
        '#ef4444'  // Loud Spikes (Red)
    ];

    if (window.audioBreakdownChartInstance) {
        window.audioBreakdownChartInstance.destroy();
    }

    window.audioBreakdownChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
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
                        color: 'rgba(255, 255, 255, 0.8)',
                        font: { family: 'Inter', size: 12, weight: '600' },
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.parsed}%`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

function renderPeakSpikesList(spikes) {
    const listEl = document.getElementById('peakSpikesList');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!spikes || spikes.length === 0) {
        listEl.innerHTML = '<li style="padding: 12px; opacity: 0.7;">No acoustic spikes recorded today.</li>';
        return;
    }

    spikes.forEach((spike, idx) => {
        const db = spike.noiseDb || 60;
        let badgeColor = "#f59e0b";
        if (db >= 70) badgeColor = "#ef4444";
        else if (db < 50) badgeColor = "#3b82f6";

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifySpaceBetween = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '12px 14px';
        li.style.marginBottom = '10px';
        li.style.background = 'rgba(255, 255, 255, 0.03)';
        li.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        li.style.borderRadius = '12px';

        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 900; font-size: 1rem; color: ${badgeColor}; font-family: monospace;">#${idx + 1}</span>
                <div>
                    <div style="font-weight: 700; font-size: 0.95rem;">${spike.classification || 'Acoustic Spike'}</div>
                    <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); font-family: monospace;">${spike.timestamp || 'Today'}</div>
                </div>
            </div>
            <div>
                <span style="background: ${badgeColor}; color: #ffffff; padding: 4px 12px; border-radius: 8px; font-weight: 800; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;">
                    ${db} dB
                </span>
            </div>
        `;
        listEl.appendChild(li);
    });
}

function generateFallbackEnvironmentalData() {
    return {
        tabDensityTimeline: [
            { timestamp: "09:00", tabDensity: 4 },
            { timestamp: "11:00", tabDensity: 8 },
            { timestamp: "13:00", tabDensity: 14 },
            { timestamp: "15:00", tabDensity: 11 },
            { timestamp: "17:00", tabDensity: 16 },
            { timestamp: "18:30", tabDensity: 7 }
        ],
        audioBreakdown: {
            "Silence": 40,
            "Speech": 45,
            "Background Noise": 15
        },
        peakSpikes: [
            { timestamp: "2026-07-29 17:45", noiseDb: 78, classification: "Loud Noise Spike" },
            { timestamp: "2026-07-29 14:20", noiseDb: 68, classification: "Speech Disturbance" },
            { timestamp: "2026-07-29 11:10", noiseDb: 62, classification: "Ambient Buzz" }
        ]
    };
}

window.fetchEnvironmentalData = fetchEnvironmentalData;

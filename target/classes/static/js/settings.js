/**
 * StressCalculator — Theme Engine Controller (Task 2 & 3)
 * Supports: Dark (Default), Light, and High-Contrast Accessibility Mode
 * Features:
 * 1. FOUC-prevention immediate theme restoration from localStorage
 * 2. Event listeners for theme buttons (Light, Dark, Contrast)
 * 3. Dynamic Chart.js grid line and text color updates
 */

class ThemeController {
    constructor() {
        this.currentTheme = localStorage.getItem('stresscalc_theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.bindEvents();
    }

    bindEvents() {
        document.querySelectorAll('.theme-btn-dash, .theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const title = (btn.getAttribute('title') || btn.textContent).toLowerCase();
                let theme = 'dark';
                if (title.includes('light')) theme = 'light';
                else if (title.includes('contrast')) theme = 'contrast';
                else if (title.includes('dark')) theme = 'dark';
                
                this.applyTheme(theme);
            });
        });
    }

    applyTheme(theme) {
        if (!['light', 'dark', 'contrast'].includes(theme)) {
            theme = 'dark';
        }

        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('stresscalc_theme', theme);

        // Update active styling on theme switcher buttons
        document.querySelectorAll('.theme-btn-dash, .theme-btn').forEach(btn => {
            const btnText = (btn.getAttribute('title') || btn.textContent).toLowerCase();
            if (btnText.includes(theme)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Dynamic Chart.js update for grid lines and tick labels (Task 3)
        this.updateCharts(theme);
    }

    updateCharts(theme) {
        let gridColor = 'rgba(255, 255, 255, 0.06)';
        let tickColor = 'rgba(255, 255, 255, 0.7)';

        if (theme === 'light') {
            gridColor = 'rgba(0, 0, 0, 0.08)';
            tickColor = '#0f172a';
        } else if (theme === 'contrast') {
            gridColor = 'rgba(255, 255, 255, 0.25)';
            tickColor = '#ffffff';
        }

        // 1. Update Telemetry Line Chart (window.telemetryChart)
        if (window.telemetryChart && window.telemetryChart.options) {
            if (window.telemetryChart.options.scales) {
                if (window.telemetryChart.options.scales.x) {
                    window.telemetryChart.options.scales.x.grid.color = gridColor;
                    window.telemetryChart.options.scales.x.ticks.color = tickColor;
                }
                if (window.telemetryChart.options.scales.y) {
                    window.telemetryChart.options.scales.y.grid.color = gridColor;
                    window.telemetryChart.options.scales.y.ticks.color = tickColor;
                }
            }
            window.telemetryChart.update();
        }

        // 2. Update Historical 7-Day Bar Chart (window.historyTrendChartInstance)
        if (window.historyTrendChartInstance && window.historyTrendChartInstance.options) {
            if (window.historyTrendChartInstance.options.scales) {
                if (window.historyTrendChartInstance.options.scales.x) {
                    window.historyTrendChartInstance.options.scales.x.grid.color = gridColor;
                    window.historyTrendChartInstance.options.scales.x.ticks.color = tickColor;
                }
                if (window.historyTrendChartInstance.options.scales.y) {
                    window.historyTrendChartInstance.options.scales.y.grid.color = gridColor;
                    window.historyTrendChartInstance.options.scales.y.ticks.color = tickColor;
                }
            }
            window.historyTrendChartInstance.update();
        }
    }
}

// Immediate execution to prevent FOUC before DOM renders
(function() {
    const saved = localStorage.getItem('stresscalc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', () => {
    window.themeController = new ThemeController();
});

function setTheme(themeName) {
    if (window.themeController) {
        window.themeController.applyTheme(themeName);
    } else {
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('stresscalc_theme', themeName);
    }
}
window.setTheme = setTheme;

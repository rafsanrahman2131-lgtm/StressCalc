/**
 * StressCalculator — SPA Navigation Controller
 * Handles seamless tab switching between Telemetry Dashboard and Action Logs view.
 */

function initSpaNavigation() {
    const navTelemetry = document.getElementById('nav-telemetry');
    const navLogs = document.getElementById('nav-logs');

    if (navTelemetry) {
        navTelemetry.addEventListener('click', (e) => {
            e.preventDefault();
            switchSpaView('telemetry');
        });
    }

    if (navLogs) {
        navLogs.addEventListener('click', (e) => {
            e.preventDefault();
            switchSpaView('logs');
        });
    }

    // Handle initial hash parameter if present
    if (window.location.hash === '#logs') {
        switchSpaView('logs');
    }
}

function switchSpaView(viewId) {
    const telemetryView = document.getElementById('telemetry-dashboard');
    const logsView = document.getElementById('action-logs-view');
    const navTelemetry = document.getElementById('nav-telemetry');
    const navLogs = document.getElementById('nav-logs');

    if (viewId === 'logs') {
        if (telemetryView) telemetryView.style.display = 'none';
        if (logsView) logsView.style.display = 'block';

        if (navTelemetry) navTelemetry.classList.remove('active');
        if (navLogs) navLogs.classList.add('active');

        if (typeof window.fetchHistory === 'function') {
            window.fetchHistory();
        }
    } else {
        if (logsView) logsView.style.display = 'none';
        if (telemetryView) telemetryView.style.display = 'block';

        if (navLogs) navLogs.classList.remove('active');
        if (navTelemetry) navTelemetry.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSpaNavigation();
});

/**
 * StressCalculator — SPA Navigation Controller with State Persistence
 * Ensures active tab (Telemetry or Action Logs) persists across page refreshes via URL Hash & LocalStorage.
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

    // Listen to browser back/forward or hash changes
    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash === 'logs' || currentHash === 'telemetry') {
            switchSpaView(currentHash, false);
        }
    });

    // Restore active view on initial page load / refresh
    const hashView = window.location.hash.replace('#', '');
    const savedView = localStorage.getItem('stresscalc_active_view');
    const initialView = (hashView === 'logs' || savedView === 'logs') ? 'logs' : 'telemetry';
    
    switchSpaView(initialView, true);
}

function switchSpaView(viewId, isInitialLoad = false) {
    const telemetryView = document.getElementById('telemetry-dashboard');
    const logsView = document.getElementById('action-logs-view');
    const navTelemetry = document.getElementById('nav-telemetry');
    const navLogs = document.getElementById('nav-logs');

    // Persist state in localStorage and URL hash
    localStorage.setItem('stresscalc_active_view', viewId);
    if (!isInitialLoad) {
        history.replaceState(null, '', `#${viewId}`);
    }

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

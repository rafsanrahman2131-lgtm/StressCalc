/**
 * StressCalculator — SPA Navigation Controller with State Persistence & Routing
 * Supports: Telemetry, Action Logs, Environmental Dashboard, and Profile Settings views.
 * Note: "User Profile" removed from sidebar; accessible via top-right avatar PFP.
 */

function initSpaNavigation() {
    const navTelemetry = document.getElementById('nav-telemetry');
    const navLogs = document.getElementById('nav-logs');
    const navEnvironmental = document.getElementById('nav-environmental');

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

    if (navEnvironmental) {
        navEnvironmental.addEventListener('click', (e) => {
            e.preventDefault();
            switchSpaView('environmental');
        });
    }

    // Listen to browser back/forward or hash changes
    window.addEventListener('hashchange', () => {
        const currentHash = window.location.hash.replace('#', '');
        if (['logs', 'telemetry', 'environmental', 'profile'].includes(currentHash)) {
            switchSpaView(currentHash, false);
        }
    });

    // Restore active view on initial page load / refresh
    // Always force telemetry page after login or registration!
    const isFromAuth = document.referrer.includes('auth.html') || window.location.search.includes('fromAuth');
    let initialView = 'telemetry';
    if (isFromAuth) {
        localStorage.setItem('stresscalc_active_view', 'telemetry');
        if (history.replaceState) {
            history.replaceState(null, '', '#telemetry');
        }
    } else {
        const hashView = window.location.hash.replace('#', '');
        const savedView = localStorage.getItem('stresscalc_active_view');
        if (hashView && ['logs', 'telemetry', 'environmental', 'profile'].includes(hashView)) {
            initialView = hashView;
        } else if (savedView && ['logs', 'telemetry', 'environmental', 'profile'].includes(savedView)) {
            initialView = savedView;
        }
    }

    switchSpaView(initialView, true);
}

function switchSpaView(viewId, isInitialLoad = false) {
    const telemetryView = document.getElementById('telemetry-dashboard');
    const logsView = document.getElementById('action-logs-view');
    const environmentalView = document.getElementById('environmental-view');
    const profileView = document.getElementById('profile-view');

    const navTelemetry = document.getElementById('nav-telemetry');
    const navLogs = document.getElementById('nav-logs');
    const navEnvironmental = document.getElementById('nav-environmental');

    // Persist state in localStorage and URL hash
    localStorage.setItem('stresscalc_active_view', viewId);
    if (!isInitialLoad) {
        history.replaceState(null, '', `#${viewId}`);
    }

    // Hide all SPA views
    if (telemetryView) telemetryView.style.display = 'none';
    if (logsView) logsView.style.display = 'none';
    if (environmentalView) environmentalView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';

    // Remove active state on all nav items
    if (navTelemetry) navTelemetry.classList.remove('active');
    if (navLogs) navLogs.classList.remove('active');
    if (navEnvironmental) navEnvironmental.classList.remove('active');

    if (viewId === 'logs') {
        if (logsView) logsView.style.display = 'block';
        if (navLogs) navLogs.classList.add('active');

        if (typeof window.fetchHistory === 'function') {
            window.fetchHistory();
        }
    } else if (viewId === 'environmental') {
        if (environmentalView) environmentalView.style.display = 'block';
        if (navEnvironmental) navEnvironmental.classList.add('active');

        if (typeof window.fetchEnvironmentalData === 'function') {
            window.fetchEnvironmentalData();
        }
    } else if (viewId === 'profile') {
        if (profileView) profileView.style.display = 'block';

        if (typeof window.loadUserProfile === 'function') {
            window.loadUserProfile();
        }
        // Also load friends list when profile view is opened
        if (typeof window.loadFriends === 'function') {
            window.loadFriends();
        }
    } else {
        if (telemetryView) telemetryView.style.display = 'block';
        if (navTelemetry) navTelemetry.classList.add('active');
    }
}

// Expose globally so notifications.js and other modules can call it
window.switchSpaView = switchSpaView;

document.addEventListener('DOMContentLoaded', () => {
    initSpaNavigation();
});

/**
 * StressCalculator — Notification System JS
 * Handles bell icon, badge counter, dropdown, and read state for notifications.
 */

let _notifOpen = false;

async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');
        const empty = document.getElementById('notifEmpty');

        const count = data.unreadCount || 0;
        if (badge) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.toggle('hidden', count === 0);
        }

        if (!list) return;
        const notifications = data.notifications || [];
        if (notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
            return;
        }

        list.innerHTML = notifications.map(n => {
            const timeAgo = formatTimeAgo(n.createdAt);
            return `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n.notificationId}" onclick="markNotifRead(${n.notificationId}, this)">
                <div class="notif-icon-dot ${n.isRead ? 'read' : ''}"></div>
                <div>
                    <div class="notif-text">${escapeHtml(n.message)}</div>
                    <div class="notif-time">${timeAgo}</div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('Could not load notifications:', e);
    }
}

async function markNotifRead(id, el) {
    if (!el.classList.contains('unread')) return;
    try {
        await fetch(`/api/notifications/read/${id}`, { method: 'POST' });
        el.classList.remove('unread');
        el.querySelector('.notif-icon-dot')?.classList.add('read');
        // refresh badge count
        await loadNotifications();
    } catch (e) {}
}

async function markAllNotifRead() {
    try {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        await loadNotifications();
    } catch (e) {}
}

function toggleNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    _notifOpen = !_notifOpen;
    dropdown.classList.toggle('open', _notifOpen);
    if (_notifOpen) loadNotifications();
}

function closeNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.remove('open');
    _notifOpen = false;
}

function formatTimeAgo(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
    return `${Math.floor(seconds/86400)}d ago`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

// --- Force Username Modal ---
function checkForceUsername() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('forceUsername') === '1') {
        const overlay = document.getElementById('forceUsernameOverlay');
        if (overlay) overlay.style.display = 'flex';
    }
}

async function submitForceUsername() {
    const input = document.getElementById('forceUsernameInput');
    const errEl = document.getElementById('forceUsernameError');
    const btn = document.getElementById('forceUsernameSubmitBtn');
    const username = input ? input.value.trim() : '';

    if (!username || username.length < 3) {
        if (errEl) { errEl.textContent = 'Username must be at least 3 characters.'; errEl.style.display = 'block'; }
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const fd = new FormData();
        fd.append('username', username);
        const res = await fetch('/api/friends/set-username', { method: 'POST', body: fd });
        const data = await res.json();
        if (res.ok) {
            const overlay = document.getElementById('forceUsernameOverlay');
            if (overlay) overlay.style.display = 'none';
            // clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            if (errEl) { errEl.textContent = data.error || 'Failed. Try another username.'; errEl.style.display = 'block'; }
            btn.disabled = false;
            btn.textContent = 'Confirm Username';
        }
    } catch (e) {
        if (errEl) { errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block'; }
        btn.disabled = false;
        btn.textContent = 'Confirm Username';
    }
}

// Init: wire up bell and avatar buttons
document.addEventListener('DOMContentLoaded', () => {
    const bellBtn = document.getElementById('notifBellBtn');
    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNotifDropdown();
        });
    }

    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllNotifRead);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifDropdown');
        const bellBtn = document.getElementById('notifBellBtn');
        if (_notifOpen && dropdown && !dropdown.contains(e.target) && e.target !== bellBtn) {
            closeNotifDropdown();
        }
    });

    // Avatar click → switch to profile view
    const pfpBtn = document.getElementById('navPfpBtn');
    if (pfpBtn) {
        pfpBtn.addEventListener('click', () => {
            if (typeof switchSpaView === 'function') switchSpaView('profile');
        });
    }

    // Initial badge load
    loadNotifications();

    // Check if force username required
    checkForceUsername();

    // Poll notifications every 60 seconds
    setInterval(loadNotifications, 60000);
});

/**
 * Called by profile.js to update top-right avatar PFP image.
 * @param {string} base64Src - data URL for the profile picture
 */
function updateTopNavPfp(base64Src) {
    const inner = document.getElementById('navPfpInner');
    if (!inner) return;
    if (base64Src) {
        inner.innerHTML = `<img src="${base64Src}" alt="Profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

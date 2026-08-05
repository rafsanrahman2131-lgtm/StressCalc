/**
 * StressCalculator — In-Page Notification UI & Interactive Toast System
 * Supports: Bold Red 5+ Badge, Dropdown Overlays, Friend Request Item UI (Check/Cross), and Toast Notifications.
 */

let _notifOpen = false;

async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');

        const count = data.unreadCount || 0;
        if (badge) {
            // Task requirement: bold red badge; if unread count > 5, display '5+'
            badge.textContent = count > 5 ? '5+' : count;
            badge.classList.toggle('hidden', count === 0);
        }

        if (!list) return;
        const notifications = data.notifications || [];
        if (notifications.length === 0) {
            list.innerHTML = '<div class="notif-empty" style="color: rgba(255,255,255,0.5); text-align: center; font-size: 0.85rem; padding: 20px 0;">No notifications to show</div>';
            return;
        }

        list.innerHTML = notifications.map(n => {
            const timeAgo = formatTimeAgo(n.createdAt);
            const isFriendReq = n.type === 'friend_request' || (n.message && n.message.toLowerCase().includes('friend request'));

            return `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n.notificationId}" onclick="markNotifRead(${n.notificationId}, this)">
                <div class="notif-icon-dot ${n.isRead ? 'read' : ''}"></div>
                <div style="flex: 1;">
                    <div class="notif-text" style="font-size: 0.84rem; color: rgba(255,255,255,0.9); line-height: 1.4;">${escapeHtml(n.message)}</div>
                    <div class="notif-time" style="font-size: 0.74rem; color: rgba(255,255,255,0.4); margin-top: 3px;">${timeAgo}</div>
                    
                    ${isFriendReq ? `
                    <div class="notif-actions" onclick="event.stopPropagation()">
                        <button class="notif-action-btn accept-btn" onclick="handleNotificationAction(${n.notificationId}, 'accept', event)" title="Accept Request">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                        <button class="notif-action-btn decline-btn" onclick="handleNotificationAction(${n.notificationId}, 'decline', event)" title="Decline Request">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>` : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('Could not load notifications:', e);
    }
}

async function markNotifRead(id, el) {
    if (el && !el.classList.contains('unread')) return;
    try {
        await fetch(`/api/notifications/read/${id}`, { method: 'POST' });
        if (el) {
            el.classList.remove('unread');
            el.querySelector('.notif-icon-dot')?.classList.add('read');
        }
        await loadNotifications();
    } catch (e) {}
}

async function markAllNotifRead() {
    try {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        await loadNotifications();
    } catch (e) {}
}

async function handleNotificationAction(notifId, action, event) {
    if (event && event.stopPropagation) event.stopPropagation();

    try {
        // Find pending request ID if available from friends endpoint
        const friendsRes = await fetch('/api/friends');
        let friendshipId = null;
        if (friendsRes.ok) {
            const data = await friendsRes.json();
            const pending = data.pendingRequests || [];
            if (pending.length > 0) {
                friendshipId = pending[0].friendshipId;
            }
        }

        if (action === 'accept') {
            if (friendshipId) {
                await fetch(`/api/friends/accept/${friendshipId}`, { method: 'POST' });
            }
            showToast('Request accepted', 'success');
        } else if (action === 'decline') {
            if (friendshipId) {
                await fetch(`/api/friends/decline/${friendshipId}`, { method: 'POST' });
            }
            showToast('Request declined', 'decline');
        }

        // Mark notification as read and reload notifications + friend list
        await markNotifRead(notifId, null);
        if (typeof window.loadFriends === 'function') {
            window.loadFriends();
        }
    } catch (e) {
        showToast(action === 'accept' ? 'Request accepted' : 'Request declined', action === 'accept' ? 'success' : 'decline');
    }
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;

    const iconSvg = type === 'success'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    toast.innerHTML = `${iconSvg} <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

let _lastToggleTime = 0;

function toggleNotifications(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const now = Date.now();
    if (now - _lastToggleTime < 200) return;
    _lastToggleTime = now;

    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    _notifOpen = !_notifOpen;
    dropdown.classList.toggle('active', _notifOpen);
    dropdown.classList.toggle('open', _notifOpen);
    if (_notifOpen) loadNotifications();
}

function toggleNotifDropdown(e) {
    toggleNotifications(e);
}

function closeNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
        dropdown.classList.remove('open');
    }
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

// Init event listeners
document.addEventListener('DOMContentLoaded', () => {
    const markAllBtn = document.getElementById('markAllReadBtn');
    if (markAllBtn) markAllBtn.addEventListener('click', markAllNotifRead);

    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notifDropdown');
        const bellBtn = document.getElementById('notifBtn') || document.getElementById('notifBellBtn');
        if (_notifOpen && dropdown && !dropdown.contains(e.target) && e.target !== bellBtn && !bellBtn?.contains(e.target)) {
            closeNotifDropdown();
        }
    });

    const pfpBtn = document.getElementById('navPfpBtn');
    if (pfpBtn) {
        pfpBtn.addEventListener('click', () => {
            if (typeof switchSpaView === 'function') switchSpaView('profile');
        });
    }

    loadNotifications();
    checkForceUsername();
    setInterval(loadNotifications, 60000);
});

function updateTopNavPfp(base64Src) {
    const inner = document.getElementById('navPfpInner');
    if (!inner) return;
    if (base64Src) {
        inner.innerHTML = `<img src="${base64Src}" alt="Profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
}

// Global exports
window.toggleNotifications = toggleNotifications;
window.toggleNotifDropdown = toggleNotifDropdown;
window.markAllNotifRead = markAllNotifRead;
window.handleNotificationAction = handleNotificationAction;
window.showToast = showToast;
window.updateTopNavPfp = updateTopNavPfp;

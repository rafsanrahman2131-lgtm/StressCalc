/**
 * StressCalculator — User Profile Baseline & PFP Management
 * Supports Fixed Palette Read-Only Mode, Immutable Name & Email, Custom PFP Upload, and Telemetry Routing.
 */

let _userProfileData = null;
let _pendingPfpBase64 = null;

async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
            console.warn('Failed to load profile data from API.');
            return;
        }

        const user = await response.json();
        _userProfileData = user;
        
        // 1. Update Profile Header & Avatar
        const headerName = document.getElementById('profHeaderName');
        const headerUsername = document.getElementById('profHeaderUsername');
        const headerEmail = document.getElementById('profHeaderEmail');
        const headerOrg = document.getElementById('profHeaderOrg');
        const headerTz = document.getElementById('profHeaderTz');
        const avatarContainer = document.getElementById('profHeaderAvatarContainer');

        const displayUsername = user.username ? `@${user.username}` : '—';

        if (headerName) headerName.textContent = user.fullName || 'User Profile';
        if (headerUsername) headerUsername.textContent = displayUsername;
        if (headerEmail) headerEmail.textContent = user.email || 'user@gmail.com';
        if (headerOrg) headerOrg.textContent = user.occupation || 'School';
        if (headerTz) headerTz.textContent = formatTimezoneLabel(user.timezone);

        // Update PFP Image if available
        if (avatarContainer) {
            if (user.profilePic && user.profilePic.startsWith('data:image')) {
                avatarContainer.innerHTML = `<img src="${user.profilePic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="PFP">`;
                // Sync top-right nav avatar
                if (typeof updateTopNavPfp === 'function') updateTopNavPfp(user.profilePic);
            } else {
                avatarContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            }
        }

        // 2. Populate Fixed Palette View
        const palFullName = document.getElementById('palFullName');
        const palUsername = document.getElementById('palUsername');
        const palEmail = document.getElementById('palEmail');
        const palDob = document.getElementById('palDob');
        const palSchool = document.getElementById('palSchool');

        const palActivity = document.getElementById('palActivity');
        const palSleep = document.getElementById('palSleep');
        const palCaffeine = document.getElementById('palCaffeine');
        const palWearable = document.getElementById('palWearable');
        const palAudio = document.getElementById('palAudio');
        const palTz = document.getElementById('palTz');

        if (palFullName) palFullName.textContent = user.fullName || '—';
        if (palUsername) palUsername.textContent = displayUsername;
        if (palEmail) palEmail.textContent = user.email || '—';
        if (palDob) palDob.textContent = formatDateLabel(user.dob);
        if (palSchool) palSchool.textContent = user.occupation || '—';

        if (palActivity) palActivity.textContent = formatActivityLabel(user.activityLevel);
        if (palSleep) palSleep.textContent = formatSleepLabel(user.sleepDuration);
        if (palCaffeine) palCaffeine.textContent = formatCaffeineLabel(user.caffeine);
        if (palWearable) palWearable.textContent = formatWearableLabel(user.wearable);
        if (palAudio) palAudio.textContent = formatAudioLabel(user.focusAudio);
        if (palTz) palTz.textContent = formatTimezoneLabel(user.timezone);

        // 3. Populate Edit Form Inputs (Name, Email, and Username are Permanent Read-Only!)
        const inputName = document.getElementById('profFullName');
        const inputUsername = document.getElementById('profUsername');
        const inputEmail = document.getElementById('profEmail');
        const inputDob = document.getElementById('profDob');
        const inputOrg = document.getElementById('profOrg');

        if (inputName) inputName.value = user.fullName || '';
        if (inputUsername) inputUsername.value = displayUsername;
        if (inputEmail) inputEmail.value = user.email || '';
        const inputDob = document.getElementById('profDob');
        const inputOrg = document.getElementById('profOrg');

        const selActivity = document.getElementById('profActivityLevel');
        const selSleep = document.getElementById('profSleepDuration');
        const selCaffeine = document.getElementById('profCaffeine');
        const selWearable = document.getElementById('profWearable');
        const selAudio = document.getElementById('profFocusAudio');
        const selTz = document.getElementById('profTimezone');

        if (inputName) inputName.value = user.fullName || '';
        if (inputEmail) inputEmail.value = user.email || '';
        if (inputDob) inputDob.value = user.dob || '';
        if (inputOrg) inputOrg.value = user.occupation || '';

        if (selActivity && user.activityLevel) selActivity.value = user.activityLevel;
        if (selSleep && user.sleepDuration) selSleep.value = user.sleepDuration;
        if (selCaffeine && user.caffeine) selCaffeine.value = user.caffeine;
        if (selWearable && user.wearable) selWearable.value = user.wearable;
        if (selAudio && user.focusAudio) selAudio.value = user.focusAudio;
        if (selTz && user.timezone) selTz.value = user.timezone;

        // Edit PFP Preview Container
        const editPfpPreview = document.getElementById('editPfpPreviewContainer');
        if (editPfpPreview) {
            if (user.profilePic && user.profilePic.startsWith('data:image')) {
                editPfpPreview.innerHTML = `<img src="${user.profilePic}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="PFP">`;
            } else {
                editPfpPreview.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
            }
        }

    } catch (err) {
        console.error('Error fetching user profile:', err);
    }
}

function toggleProfileEditMode(isEditing) {
    const fixedPalette = document.getElementById('profileFixedPalette');
    const formContainer = document.getElementById('profileFormContainer');
    const editToggleBtn = document.getElementById('editProfileToggleBtn');

    if (isEditing) {
        if (fixedPalette) fixedPalette.style.display = 'none';
        if (formContainer) formContainer.style.display = 'block';
        if (editToggleBtn) editToggleBtn.style.display = 'none';
    } else {
        if (fixedPalette) fixedPalette.style.display = 'block';
        if (formContainer) formContainer.style.display = 'none';
        if (editToggleBtn) editToggleBtn.style.display = 'inline-flex';
        _pendingPfpBase64 = null; // Clear unsaved PFP
    }
}

function handlePfpSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds 5MB limit. Please choose a smaller image.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        _pendingPfpBase64 = e.target.result;
        
        // Instant preview
        const editPfpPreview = document.getElementById('editPfpPreviewContainer');
        if (editPfpPreview) {
            editPfpPreview.innerHTML = `<img src="${_pendingPfpBase64}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" alt="PFP Preview">`;
        }
    };
    reader.readAsDataURL(file);
}

async function saveUserProfile(event) {
    if (event) event.preventDefault();

    const saveBtn = document.getElementById('saveProfileBtn');
    const toast = document.getElementById('profileToast');
    const toastMsg = document.getElementById('profileToastMsg');

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Saving Changes...</span>';
    }

    try {
        const formData = new URLSearchParams();
        const inputDob = document.getElementById('profDob');
        const inputOrg = document.getElementById('profOrg');

        const selActivity = document.getElementById('profActivityLevel');
        const selSleep = document.getElementById('profSleepDuration');
        const selCaffeine = document.getElementById('profCaffeine');
        const selWearable = document.getElementById('profWearable');
        const selAudio = document.getElementById('profFocusAudio');
        const selTz = document.getElementById('profTimezone');

        if (inputDob && inputDob.value) formData.append('dob', inputDob.value);
        if (inputOrg) formData.append('occupation', inputOrg.value);

        if (selActivity) formData.append('activityLevel', selActivity.value);
        if (selSleep) formData.append('sleepDuration', selSleep.value);
        if (selCaffeine) formData.append('caffeine', selCaffeine.value);
        if (selWearable) formData.append('wearable', selWearable.value);
        if (selAudio) formData.append('focusAudio', selAudio.value);
        if (selTz) formData.append('timezone', selTz.value);

        if (_pendingPfpBase64) {
            formData.append('profilePic', _pendingPfpBase64);
        }

        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            _pendingPfpBase64 = null;
            
            // Reload updated profile data into fixed palette
            await loadUserProfile();
            toggleProfileEditMode(false);

            // Show Toast Alert
            if (toastMsg) toastMsg.textContent = 'Profile & telemetry baseline updated!';
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3500);
            }
        } else {
            alert('Failed to update profile data.');
        }
    } catch (err) {
        console.error('Error saving profile:', err);
        alert('An error occurred while saving profile settings.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<span>Save Changes</span>';
        }
    }
}

// Helpers for formatted display labels
function formatDateLabel(dobStr) {
    if (!dobStr) return '—';
    try {
        const parts = dobStr.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`;
        }
    } catch (e) {}
    return dobStr;
}

function formatActivityLabel(val) {
    if (val === 'sedentary') return 'Low (Mostly sitting)';
    if (val === 'moderate') return 'Medium (Light walking)';
    if (val === 'active') return 'High (Lean Muscle Training)';
    return val || '—';
}

function formatSleepLabel(val) {
    if (val === '<6') return 'Less than 6 hours';
    if (val === '6-8') return '6 to 8 hours';
    if (val === '>8') return 'More than 8 hours';
    return val || '—';
}

function formatCaffeineLabel(val) {
    if (val === 'none') return 'None';
    if (val === 'low') return '1 - 2 cups daily';
    if (val === 'high') return '3+ cups daily';
    return val || '—';
}

function formatWearableLabel(val) {
    if (val === 'none') return 'None';
    if (val === 'smartwatch') return 'Smartwatch (Apple Watch, etc.)';
    if (val === 'ring') return 'Smart Ring (Oura, etc.)';
    return val || '—';
}

function formatAudioLabel(val) {
    if (val === 'silence') return 'Silence (No music)';
    if (val === 'ambient') return 'Soft Music / Lo-Fi';
    if (val === 'complex') return 'Progressive Metal (e.g., Soen)';
    if (val === 'noise') return 'White / Brown Noise';
    return val || '—';
}

function formatTimezoneLabel(val) {
    if (val === 'ASIA') return 'Asia/Dhaka (+06:00)';
    if (val === 'EST') return 'Eastern Time (US)';
    if (val === 'PST') return 'Pacific Time (US)';
    if (val === 'UTC') return 'UTC / GMT';
    return val || 'Asia/Dhaka (+06:00)';
}

/* =====================================================
   SOCIAL — Friends System
   ===================================================== */

async function loadFriends() {
    try {
        const res = await fetch('/api/friends');
        if (!res.ok) return;
        const data = await res.json();

        // Render accepted friends
        const grid = document.getElementById('friendsGrid');
        const countBadge = document.getElementById('friendCountBadge');
        if (countBadge) countBadge.textContent = data.friendCount || 0;

        if (grid) {
            const friends = data.friends || [];
            if (friends.length === 0) {
                grid.innerHTML = `<div style="grid-column:1/-1;font-size:0.85rem;color:rgba(255,255,255,0.35);text-align:center;padding:1.5rem 0;">No friends added yet. Search by username above.</div>`;
            } else {
                grid.innerHTML = friends.map(f => {
                    const initials = (f.fullName || f.username || '?').charAt(0).toUpperCase();
                    const avatarHtml = f.profilePic
                        ? `<img src="${f.profilePic}" alt="${escSocial(f.username)}'s avatar">`
                        : `<span style="font-size:1.4rem;font-weight:800;color:#22c55e;">${initials}</span>`;
                    return `
                    <div class="friend-card" onclick="openFriendModal(${JSON.stringify(f).replace(/"/g,'&quot;')})">
                        <div class="friend-card-avatar">${avatarHtml}</div>
                        <div class="friend-card-username">@${escSocial(f.username || '—')}</div>
                        <div class="friend-card-name">${escSocial(f.fullName || '')}</div>
                    </div>`;
                }).join('');
            }
        }

        // Render pending requests
        const pendingSection = document.getElementById('pendingRequestsSection');
        const pendingGrid = document.getElementById('pendingRequestsGrid');
        const pending = data.pendingRequests || [];

        if (pendingSection && pendingGrid) {
            pendingSection.style.display = pending.length > 0 ? 'block' : 'none';
            pendingGrid.innerHTML = pending.map(p => {
                const initials = (p.fullName || p.username || '?').charAt(0).toUpperCase();
                const avatarHtml = p.profilePic
                    ? `<img src="${p.profilePic}" alt="${escSocial(p.username)}'s avatar">`
                    : `<span style="font-size:1.4rem;font-weight:800;color:#fbbf24;">${initials}</span>`;
                return `
                <div class="friend-card" style="border-color:rgba(251,191,36,0.2);">
                    <div class="friend-card-avatar" style="border-color:rgba(251,191,36,0.3);color:#fbbf24;">${avatarHtml}</div>
                    <div class="friend-card-username">@${escSocial(p.username || '—')}</div>
                    <div class="pending-badge" style="margin-top:4px;">Pending</div>
                    <button class="btn-pdf-report" style="padding:6px 12px;font-size:0.75rem;margin-top:4px;" onclick="acceptFriendRequest(${p.friendshipId}, this)">Accept</button>
                </div>`;
            }).join('');
        }
    } catch (e) {
        console.warn('Could not load friends:', e);
    }
}

async function sendFriendRequest() {
    const input = document.getElementById('addFriendInput');
    const statusEl = document.getElementById('addFriendStatus');
    const target = input ? input.value.trim() : '';
    if (!target) return;

    statusEl.style.display = 'block';
    statusEl.style.color = 'rgba(255,255,255,0.5)';
    statusEl.textContent = 'Sending...';

    try {
        const fd = new FormData();
        fd.append('targetUsername', target);
        const res = await fetch('/api/friends/request', { method: 'POST', body: fd });
        const data = await res.json();

        if (res.ok) {
            statusEl.style.color = '#22c55e';
            statusEl.textContent = data.message || 'Friend request sent!';
            if (input) input.value = '';
        } else {
            statusEl.style.color = '#ef4444';
            statusEl.textContent = data.error || 'Could not send request.';
        }
    } catch (e) {
        statusEl.style.color = '#ef4444';
        statusEl.textContent = 'Network error. Please try again.';
    }

    setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
}

async function acceptFriendRequest(friendshipId, btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Accepting...'; }
    try {
        const res = await fetch(`/api/friends/accept/${friendshipId}`, { method: 'POST' });
        if (res.ok) {
            await loadFriends();
        }
    } catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = 'Accept'; }
    }
}

function openFriendModal(friend) {
    const overlay = document.getElementById('friendModalOverlay');
    if (!overlay) return;

    const avatarWrap = document.getElementById('friendModalAvatarWrap');
    if (avatarWrap) {
        if (friend.profilePic) {
            avatarWrap.innerHTML = `<img src="${friend.profilePic}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            const initials = (friend.fullName || friend.username || '?').charAt(0).toUpperCase();
            avatarWrap.innerHTML = `<span style="font-size:1.8rem;font-weight:800;color:#22c55e;">${initials}</span>`;
        }
    }

    const nameEl = document.getElementById('friendModalName');
    const usernameEl = document.getElementById('friendModalUsername');
    const schoolEl = document.getElementById('friendModalSchool');

    if (nameEl) nameEl.textContent = friend.fullName || friend.username || 'User';
    if (usernameEl) usernameEl.textContent = '@' + (friend.username || '—');
    if (schoolEl) schoolEl.textContent = friend.occupation ? friend.occupation : '';

    overlay.style.display = 'flex';
}

function closeFriendModal() {
    const overlay = document.getElementById('friendModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function escSocial(str) {
    return String(str || '').replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#039;'}[m]));
}

// Global functions
window.loadUserProfile = loadUserProfile;
window.saveUserProfile = saveUserProfile;
window.toggleProfileEditMode = toggleProfileEditMode;
window.handlePfpSelect = handlePfpSelect;
window.loadFriends = loadFriends;
window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.openFriendModal = openFriendModal;
window.closeFriendModal = closeFriendModal;

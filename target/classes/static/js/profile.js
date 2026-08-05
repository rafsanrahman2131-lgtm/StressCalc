/**
 * StressCalculator — User Profile Baseline Management
 * Handles fetching, displaying, and updating user telemetry baseline data.
 */

async function loadUserProfile() {
    try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
            console.warn('Failed to load profile data from API.');
            return;
        }

        const user = await response.json();
        
        // Populate profile header
        const headerName = document.getElementById('profHeaderName');
        const headerEmail = document.getElementById('profHeaderEmail');
        const headerOrg = document.getElementById('profHeaderOrg');
        const headerTz = document.getElementById('profHeaderTz');

        if (headerName) headerName.textContent = user.fullName || 'User Profile';
        if (headerEmail) headerEmail.textContent = user.email || 'user@domain.com';
        if (headerOrg) headerOrg.textContent = user.occupation || 'Member';
        if (headerTz) headerTz.textContent = user.timezone || 'UTC';

        // Populate form fields
        const inputName = document.getElementById('profFullName');
        const inputEmail = document.getElementById('profEmail');
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

    } catch (err) {
        console.error('Error fetching user profile:', err);
    }
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
        const inputName = document.getElementById('profFullName');
        const inputDob = document.getElementById('profDob');
        const inputOrg = document.getElementById('profOrg');

        const selActivity = document.getElementById('profActivityLevel');
        const selSleep = document.getElementById('profSleepDuration');
        const selCaffeine = document.getElementById('profCaffeine');
        const selWearable = document.getElementById('profWearable');
        const selAudio = document.getElementById('profFocusAudio');
        const selTz = document.getElementById('profTimezone');

        if (inputName) formData.append('fullName', inputName.value);
        if (inputDob && inputDob.value) formData.append('dob', inputDob.value);
        if (inputOrg) formData.append('occupation', inputOrg.value);

        if (selActivity) formData.append('activityLevel', selActivity.value);
        if (selSleep) formData.append('sleepDuration', selSleep.value);
        if (selCaffeine) formData.append('caffeine', selCaffeine.value);
        if (selWearable) formData.append('wearable', selWearable.value);
        if (selAudio) formData.append('focusAudio', selAudio.value);
        if (selTz) formData.append('timezone', selTz.value);

        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            
            // Reload updated profile header
            loadUserProfile();

            // Show Toast Alert
            if (toastMsg) toastMsg.textContent = 'Profile & baseline data updated successfully!';
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
            saveBtn.innerHTML = '<span>Save Profile Changes</span>';
        }
    }
}

// Make functions globally available
window.loadUserProfile = loadUserProfile;
window.saveUserProfile = saveUserProfile;

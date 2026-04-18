/**
 * SafeKey Session Management
 * 
 * Handles:
 * - Derived key storage in memory (never persisted)
 * - Auto-lock after 20 minutes of inactivity
 * - Activity tracking for timeout reset
 * - Secure session termination
 */

const Session = (function () {
    'use strict';

    // Session configuration
    const CONFIG = {
        TIMEOUT_MINUTES: 20,
        ACTIVITY_EVENTS: ['mousedown', 'keydown', 'scroll', 'touchstart']
    };

    // Private state - key lives only in memory
    let _derivedKey = null;
    let _salt = null;
    let _timeoutId = null;
    let _lastActivity = null;
    let _timerInterval = null;
    let _onLockCallback = null;

    /**
     * Starts the session with a derived key
     * @param {CryptoKey} key - Derived encryption key
     * @param {Uint8Array} salt - Salt used for key derivation
     */
    function start(key, salt) {
        _derivedKey = key;
        _salt = salt;
        _lastActivity = Date.now();

        // Set up activity listeners
        CONFIG.ACTIVITY_EVENTS.forEach(event => {
            document.addEventListener(event, resetActivity, { passive: true });
        });

        // Start timeout countdown
        startTimeout();
        startTimerDisplay();
    }

    /**
     * Resets the activity timer
     */
    function resetActivity() {
        _lastActivity = Date.now();
        startTimeout();
    }

    /**
     * Starts or restarts the idle timeout
     */
    function startTimeout() {
        if (_timeoutId) {
            clearTimeout(_timeoutId);
        }

        _timeoutId = setTimeout(() => {
            lock();
        }, CONFIG.TIMEOUT_MINUTES * 60 * 1000);
    }

    /**
     * Starts the timer display update interval
     */
    function startTimerDisplay() {
        if (_timerInterval) {
            clearInterval(_timerInterval);
        }

        _timerInterval = setInterval(() => {
            updateTimerDisplay();
        }, 1000);
    }

    /**
     * Updates the timer display in the UI
     */
    function updateTimerDisplay() {
        const timerElement = document.querySelector('.timer-text');
        if (!timerElement || !_lastActivity) return;

        const elapsed = Date.now() - _lastActivity;
        const remaining = Math.max(0, CONFIG.TIMEOUT_MINUTES * 60 * 1000 - elapsed);

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Add warning class when less than 2 minutes
        if (remaining < 120000) {
            timerElement.parentElement.classList.add('warning');
        } else {
            timerElement.parentElement.classList.remove('warning');
        }
    }

    /**
     * Gets the current derived key
     * @returns {CryptoKey|null} The derived key or null if not unlocked
     */
    function getKey() {
        return _derivedKey;
    }

    /**
     * Gets the current salt
     * @returns {Uint8Array|null} The salt or null if not set
     */
    function getSalt() {
        return _salt;
    }

    /**
     * Checks if the vault is currently unlocked
     * @returns {boolean}
     */
    function isUnlocked() {
        return _derivedKey !== null;
    }

    /**
     * Sets the callback to be called when session locks
     * @param {Function} callback
     */
    function onLock(callback) {
        _onLockCallback = callback;
    }

    /**
     * Locks the vault and wipes sensitive data from memory
     */
    function lock() {
        // Wipe key from memory
        _derivedKey = null;

        // Clear timeouts and intervals
        if (_timeoutId) {
            clearTimeout(_timeoutId);
            _timeoutId = null;
        }

        if (_timerInterval) {
            clearInterval(_timerInterval);
            _timerInterval = null;
        }

        // Remove activity listeners
        CONFIG.ACTIVITY_EVENTS.forEach(event => {
            document.removeEventListener(event, resetActivity);
        });

        _lastActivity = null;

        // Trigger lock callback
        if (_onLockCallback) {
            _onLockCallback();
        }

        console.log('[Session] Vault locked - key wiped from memory');
    }

    /**
     * Completely destroys the session including salt
     * Used when user wants to reset everything
     */
    function destroy() {
        lock();
        _salt = null;
    }

    // Public API
    return {
        start,
        getKey,
        getSalt,
        isUnlocked,
        lock,
        destroy,
        onLock,
        resetActivity
    };
})();

// Export for use in other modules
window.Session = Session;

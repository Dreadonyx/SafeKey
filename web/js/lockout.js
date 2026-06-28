/**
 * SafeKey Lockout Manager
 *
 * Implements exponential-backoff rate-limiting for failed unlock attempts:
 *
 *   Attempts 1–3  → no delay (free tries)
 *   Attempt  4    →  5 seconds
 *   Attempt  5    → 30 seconds
 *   Attempt  6    →  2 minutes
 *   Attempt  7+   → 10 minutes (cap)
 *
 * State is persisted in localStorage so it survives page reloads.
 * The form submit button is disabled and a countdown is shown while
 * the lockout is active.
 */

const Lockout = (function () {
    'use strict';

    const STORAGE_KEY = 'safekey_lockout';

    // Delay schedule in milliseconds (index = attempt number, 0-based after free tries)
    const DELAYS_MS = [0, 0, 0, 5000, 30000, 120000, 600000];
    const FREE_TRIES = 3;

    let _countdownInterval = null;
    let _onLockoutEnd = null; // callback when lockout expires

    // ── Persistence ──────────────────────────────────────────────────────────

    function _load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { attempts: 0, lockedUntil: 0 };
        } catch {
            return { attempts: 0, lockedUntil: 0 };
        }
    }

    function _save(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns true if the user is currently locked out.
     */
    function isLocked() {
        const { lockedUntil } = _load();
        return Date.now() < lockedUntil;
    }

    /**
     * Returns milliseconds remaining in the current lockout (0 if not locked).
     */
    function remainingMs() {
        const { lockedUntil } = _load();
        return Math.max(0, lockedUntil - Date.now());
    }

    /**
     * Returns the total number of failed attempts.
     */
    function attemptCount() {
        return _load().attempts;
    }

    /**
     * Record a failed attempt and start a lockout if needed.
     * @returns {number} milliseconds of lockout applied (0 if still in free tries)
     */
    function recordFailure() {
        const state = _load();
        state.attempts += 1;

        const delayIdx = Math.min(state.attempts - 1, DELAYS_MS.length - 1);
        const delay    = DELAYS_MS[delayIdx];

        if (delay > 0) {
            state.lockedUntil = Date.now() + delay;
        }

        _save(state);
        console.warn(`[Lockout] Failed attempt #${state.attempts}, lockout: ${delay}ms`);
        return delay;
    }

    /**
     * Clears all lockout state (call on successful unlock).
     */
    function reset() {
        localStorage.removeItem(STORAGE_KEY);
        _stopCountdown();
        console.log('[Lockout] State cleared after successful unlock');
    }

    /**
     * Registers a callback to be called when the lockout period ends.
     * @param {Function} cb
     */
    function onLockoutEnd(cb) {
        _onLockoutEnd = cb;
    }

    // ── Countdown UI ──────────────────────────────────────────────────────────

    /**
     * Starts the countdown display on a given element and disables a button.
     * @param {HTMLElement} messageEl - element to write countdown text into
     * @param {HTMLButtonElement} submitBtn - button to disable during lockout
     */
    function startCountdown(messageEl, submitBtn) {
        _stopCountdown(); // clear any existing interval

        function tick() {
            const ms  = remainingMs();
            if (ms <= 0) {
                _stopCountdown();
                messageEl.textContent = '';
                messageEl.classList.add('hidden');
                submitBtn.disabled = false;
                if (_onLockoutEnd) _onLockoutEnd();
                return;
            }

            submitBtn.disabled = true;
            messageEl.classList.remove('hidden');

            const s = Math.ceil(ms / 1000);
            if (s < 60) {
                messageEl.textContent = `Too many attempts — try again in ${s}s`;
            } else {
                const m = Math.ceil(s / 60);
                messageEl.textContent = `Too many attempts — try again in ${m}m`;
            }
        }

        tick(); // run immediately
        _countdownInterval = setInterval(tick, 500);
    }

    function _stopCountdown() {
        if (_countdownInterval) {
            clearInterval(_countdownInterval);
            _countdownInterval = null;
        }
    }

    /**
     * Returns a human-readable summary of the lockout state for the UI.
     * @returns {string}
     */
    function statusText() {
        const { attempts } = _load();
        if (attempts === 0) return '';
        const ms = remainingMs();
        if (ms > 0) {
            const s = Math.ceil(ms / 1000);
            return s < 60
                ? `Locked for ${s}s`
                : `Locked for ${Math.ceil(s / 60)}m`;
        }
        return `${attempts} failed attempt${attempts !== 1 ? 's' : ''}`;
    }

    return {
        isLocked,
        remainingMs,
        attemptCount,
        recordFailure,
        reset,
        onLockoutEnd,
        startCountdown,
        statusText,
        FREE_TRIES,
        DELAYS_MS
    };
})();

window.Lockout = Lockout;

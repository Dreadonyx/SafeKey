/**
 * SafeKey Password Analyzer
 * 
 * Provides comprehensive password strength analysis:
 * - Rule-based validation
 * - Entropy calculation
 * - Brute-force time estimation
 * - Strength scoring
 */

const Analyzer = (function () {
    'use strict';

    // Character set sizes for entropy calculation
    const CHARSETS = {
        lowercase: 26,
        uppercase: 26,
        numbers: 10,
        symbols: 32
    };

    // Attack scenarios (guesses per second)
    const ATTACK_SPEEDS = {
        online_throttled: 10,           // 10 guesses/sec - throttled online
        online_unthrottled: 1000,       // 1k guesses/sec - unthrottled online
        offline_slow: 1e4,              // 10k guesses/sec - slow hash
        offline_fast: 1e10,             // 10B guesses/sec - fast hash, good hardware
        offline_massive: 1e12           // 1T guesses/sec - distributed/ASIC
    };

    /**
     * Analyzes password and returns comprehensive results
     * @param {string} password
     * @returns {Object} Analysis results
     */
    function analyze(password) {
        const rules = checkRules(password);
        const charsetSize = calculateCharsetSize(password);
        const entropy = calculateEntropy(password, charsetSize);
        const strength = calculateStrength(password, rules, entropy);
        const crackTime = estimateCrackTime(entropy);

        return {
            password: password,
            length: password.length,
            rules,
            charsetSize,
            entropy,
            strength,
            crackTime
        };
    }

    /**
     * Checks password against rules
     * @param {string} password
     * @returns {Object} Rule check results
     */
    function checkRules(password) {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
        };
    }

    /**
     * Calculates the character set size based on password composition
     * @param {string} password
     * @returns {number} Total character set size
     */
    function calculateCharsetSize(password) {
        let size = 0;

        if (/[a-z]/.test(password)) size += CHARSETS.lowercase;
        if (/[A-Z]/.test(password)) size += CHARSETS.uppercase;
        if (/[0-9]/.test(password)) size += CHARSETS.numbers;
        if (/[^a-zA-Z0-9]/.test(password)) size += CHARSETS.symbols;

        return size || 1; // Avoid log(0)
    }

    /**
     * Calculates password entropy in bits
     * @param {string} password
     * @param {number} charsetSize
     * @returns {number} Entropy in bits
     */
    function calculateEntropy(password, charsetSize) {
        if (password.length === 0) return 0;

        // Basic entropy: log2(charset^length) = length * log2(charset)
        const basicEntropy = password.length * Math.log2(charsetSize);

        // Penalty for repeated characters
        const repeatPenalty = calculateRepeatPenalty(password);

        // Penalty for sequential characters
        const sequencePenalty = calculateSequencePenalty(password);

        return Math.max(0, basicEntropy - repeatPenalty - sequencePenalty);
    }

    /**
     * Calculates penalty for repeated characters
     * @param {string} password
     * @returns {number} Penalty in bits
     */
    function calculateRepeatPenalty(password) {
        const chars = password.split('');
        const uniqueRatio = new Set(chars).size / chars.length;

        // More unique = less penalty
        return (1 - uniqueRatio) * password.length * 0.5;
    }

    /**
     * Calculates penalty for sequential characters
     * @param {string} password
     * @returns {number} Penalty in bits
     */
    function calculateSequencePenalty(password) {
        const sequences = [
            'abcdefghijklmnopqrstuvwxyz',
            'qwertyuiopasdfghjklzxcvbnm',
            '01234567890'
        ];

        let penalty = 0;
        const lowerPass = password.toLowerCase();

        for (const seq of sequences) {
            for (let len = 3; len <= password.length; len++) {
                for (let i = 0; i <= seq.length - len; i++) {
                    const subseq = seq.slice(i, i + len);
                    const reverseSubseq = subseq.split('').reverse().join('');

                    if (lowerPass.includes(subseq) || lowerPass.includes(reverseSubseq)) {
                        penalty += len * 2;
                    }
                }
            }
        }

        return Math.min(penalty, password.length * 2);
    }

    /**
     * Calculates overall strength percentage
     * @param {string} password
     * @param {Object} rules
     * @param {number} entropy
     * @returns {number} Strength 0-100
     */
    function calculateStrength(password, rules, entropy) {
        if (password.length === 0) return 0;

        // Rule-based score (30%)
        const rulesPassed = Object.values(rules).filter(Boolean).length;
        const ruleScore = (rulesPassed / 5) * 30;

        // Length score (20%)
        const lengthScore = Math.min(password.length / 20, 1) * 20;

        // Entropy score (50%)
        // 128 bits is considered very strong
        const entropyScore = Math.min(entropy / 128, 1) * 50;

        return Math.round(ruleScore + lengthScore + entropyScore);
    }

    /**
     * Estimates time to crack password
     * @param {number} entropy
     * @returns {Object} Crack time estimates
     */
    function estimateCrackTime(entropy) {
        if (entropy === 0) {
            return {
                seconds: 0,
                display: 'Instant',
                scenario: 'offline_fast'
            };
        }

        // Total possible combinations
        const combinations = Math.pow(2, entropy);

        // Average attempts (50% of keyspace)
        const avgAttempts = combinations / 2;

        // Calculate for offline fast attack (common scenario)
        const seconds = avgAttempts / ATTACK_SPEEDS.offline_fast;

        return {
            seconds,
            display: formatTime(seconds),
            combinations: combinations.toExponential(2),
            scenario: 'offline_fast'
        };
    }

    /**
     * Formats seconds into human-readable time
     * @param {number} seconds
     * @returns {string}
     */
    function formatTime(seconds) {
        if (seconds < 0.001) return 'Instant';
        if (seconds < 1) return 'Less than a second';
        if (seconds < 60) return `${Math.round(seconds)} seconds`;

        const minutes = seconds / 60;
        if (minutes < 60) return `${Math.round(minutes)} minutes`;

        const hours = minutes / 60;
        if (hours < 24) return `${Math.round(hours)} hours`;

        const days = hours / 24;
        if (days < 30) return `${Math.round(days)} days`;

        const months = days / 30;
        if (months < 12) return `${Math.round(months)} months`;

        const years = days / 365;
        if (years < 1000) return `${Math.round(years)} years`;

        if (years < 1e6) return `${(years / 1000).toFixed(1)} thousand years`;
        if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
        if (years < 1e12) return `${(years / 1e9).toFixed(1)} billion years`;

        return `${years.toExponential(1)} years`;
    }

    /**
     * Gets the strength label
     * @param {number} strength
     * @returns {Object} Label and color
     */
    function getStrengthLabel(strength) {
        if (strength < 20) return { label: 'Very Weak', color: '#ef4444' };
        if (strength < 40) return { label: 'Weak', color: '#f97316' };
        if (strength < 60) return { label: 'Fair', color: '#eab308' };
        if (strength < 80) return { label: 'Strong', color: '#22c55e' };
        return { label: 'Very Strong', color: '#10b981' };
    }

    // Public API
    return {
        analyze,
        checkRules,
        calculateEntropy,
        calculateStrength,
        estimateCrackTime,
        getStrengthLabel,
        formatTime
    };
})();

// Export for use in other modules
window.Analyzer = Analyzer;

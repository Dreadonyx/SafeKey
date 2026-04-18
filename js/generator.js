/**
 * SafeKey Password Generator
 * 
 * Generates secure passwords with:
 * - Configurable length and character sets
 * - Keyword integration
 * - Memorability slider (entropy vs pronounceability)
 * - Real-time entropy display
 */

const Generator = (function () {
    'use strict';

    // Character sets
    const CHARS = {
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    // Pronounceable syllables for memorable passwords
    const SYLLABLES = [
        'ba', 'be', 'bi', 'bo', 'bu',
        'ca', 'ce', 'ci', 'co', 'cu',
        'da', 'de', 'di', 'do', 'du',
        'fa', 'fe', 'fi', 'fo', 'fu',
        'ga', 'ge', 'gi', 'go', 'gu',
        'ha', 'he', 'hi', 'ho', 'hu',
        'ja', 'je', 'ji', 'jo', 'ju',
        'ka', 'ke', 'ki', 'ko', 'ku',
        'la', 'le', 'li', 'lo', 'lu',
        'ma', 'me', 'mi', 'mo', 'mu',
        'na', 'ne', 'ni', 'no', 'nu',
        'pa', 'pe', 'pi', 'po', 'pu',
        'ra', 're', 'ri', 'ro', 'ru',
        'sa', 'se', 'si', 'so', 'su',
        'ta', 'te', 'ti', 'to', 'tu',
        'va', 've', 'vi', 'vo', 'vu',
        'wa', 'we', 'wi', 'wo', 'wu',
        'za', 'ze', 'zi', 'zo', 'zu'
    ];

    /**
     * Generates a password based on options
     * @param {Object} options
     * @param {number} options.length - Password length (8-64)
     * @param {boolean} options.uppercase - Include uppercase letters
     * @param {boolean} options.lowercase - Include lowercase letters  
     * @param {boolean} options.numbers - Include numbers
     * @param {boolean} options.symbols - Include symbols
     * @param {string} options.keyword - Optional keyword to include
     * @param {number} options.memorability - 0-100, higher = more memorable
     * @returns {Object} Generated password with metadata
     */
    function generate(options = {}) {
        const config = {
            length: Math.max(8, Math.min(64, options.length || 16)),
            uppercase: options.uppercase !== false,
            lowercase: options.lowercase !== false,
            numbers: options.numbers !== false,
            symbols: options.symbols !== false,
            keyword: options.keyword || '',
            memorability: options.memorability || 0
        };

        let password;

        if (config.memorability > 60) {
            password = generateMemorable(config);
        } else {
            password = generateRandom(config);
        }

        // Ensure we have at least one required character in random mode
        if (config.memorability <= 60) {
            password = ensureRequirements(password, config);
        }

        // Analyze the generated password
        const analysis = Analyzer.analyze(password);

        return {
            password,
            length: password.length,
            entropy: analysis.entropy,
            crackTime: analysis.crackTime.display,
            strength: analysis.strength
        };
    }

    /**
     * Generates a fully random password
     * @param {Object} config
     * @returns {string}
     */
    function generateRandom(config) {
        // Build character pool
        let pool = '';
        if (config.lowercase) pool += CHARS.lowercase;
        if (config.uppercase) pool += CHARS.uppercase;
        if (config.numbers) pool += CHARS.numbers;
        if (config.symbols) pool += CHARS.symbols;

        if (!pool) pool = CHARS.lowercase + CHARS.uppercase; // Fallback

        let password = '';

        // Include keyword if provided
        if (config.keyword) {
            password = transformKeyword(config.keyword, config);
        }

        // Fill remaining length with random characters
        const remainingLength = config.length - password.length;

        for (let i = 0; i < remainingLength; i++) {
            password += pool[secureRandomInt(pool.length)];
        }

        // Shuffle the password
        return shuffleString(password);
    }

    /**
     * Generates a more memorable password using syllables
     * @param {Object} config
     * @returns {string}
     */
    function generateMemorable(config) {
        let password = '';

        // Include keyword if provided
        if (config.keyword) {
            password = config.keyword;
        }

        // Build with syllables
        while (password.length < config.length) {
            const syllable = SYLLABLES[secureRandomInt(SYLLABLES.length)];
            password += syllable;

            // Add number occasionally
            if (config.numbers && Math.random() > 0.7) {
                password += secureRandomInt(10);
            }

            // Add separator
            if (password.length < config.length - 3 && Math.random() > 0.6) {
                password += config.symbols ? '-' : '';
            }
        }

        // Trim to exact length
        password = password.slice(0, config.length);

        // Add uppercase if needed
        if (config.uppercase) {
            password = capitalizeRandom(password);
        }

        return password;
    }

    /**
     * Transforms a keyword for inclusion in password
     * @param {string} keyword
     * @param {Object} config
     * @returns {string}
     */
    function transformKeyword(keyword, config) {
        let result = keyword;

        // Apply l33t speak transformations randomly
        const transforms = {
            'a': '@',
            'e': '3',
            'i': '1',
            'o': '0',
            's': '$',
            't': '7'
        };

        if (config.symbols || config.numbers) {
            result = result.split('').map(char => {
                const lower = char.toLowerCase();
                if (transforms[lower] && Math.random() > 0.5) {
                    return transforms[lower];
                }
                return char;
            }).join('');
        }

        // Capitalize some letters
        if (config.uppercase) {
            result = capitalizeRandom(result);
        }

        return result;
    }

    /**
     * Ensures password meets minimum requirements
     * @param {string} password
     * @param {Object} config
     * @returns {string}
     */
    function ensureRequirements(password, config) {
        let chars = password.split('');

        // Check and fix requirements
        if (config.lowercase && !/[a-z]/.test(password)) {
            chars[secureRandomInt(chars.length)] = CHARS.lowercase[secureRandomInt(26)];
        }
        if (config.uppercase && !/[A-Z]/.test(password)) {
            chars[secureRandomInt(chars.length)] = CHARS.uppercase[secureRandomInt(26)];
        }
        if (config.numbers && !/[0-9]/.test(password)) {
            chars[secureRandomInt(chars.length)] = CHARS.numbers[secureRandomInt(10)];
        }
        if (config.symbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
            chars[secureRandomInt(chars.length)] = CHARS.symbols[secureRandomInt(CHARS.symbols.length)];
        }

        return chars.join('');
    }

    /**
     * Generates a cryptographically secure random integer
     * @param {number} max - Exclusive upper bound
     * @returns {number}
     */
    function secureRandomInt(max) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    }

    /**
     * Shuffles a string using Fisher-Yates algorithm
     * @param {string} str
     * @returns {string}
     */
    function shuffleString(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = secureRandomInt(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }

    /**
     * Randomly capitalizes some letters
     * @param {string} str
     * @returns {string}
     */
    function capitalizeRandom(str) {
        return str.split('').map(char => {
            if (/[a-z]/.test(char) && Math.random() > 0.7) {
                return char.toUpperCase();
            }
            return char;
        }).join('');
    }

    /**
     * Generates multiple passwords for user to choose from
     * @param {Object} options
     * @param {number} count
     * @returns {Array}
     */
    function generateMultiple(options, count = 5) {
        const passwords = [];
        for (let i = 0; i < count; i++) {
            passwords.push(generate(options));
        }
        return passwords;
    }

    // Public API
    return {
        generate,
        generateMultiple
    };
})();

// Export for use in other modules
window.Generator = Generator;

/**
 * SafeKey Password Generator
 *
 * Modes:
 *  - random     : cryptographically random characters
 *  - readable   : Word + Word + Symbol + Number  (e.g. BlueStorm#42)
 *  - passphrase : word-word-word-number          (e.g. blue-storm-tiger-847)
 */

const Generator = (function () {
    'use strict';

    const CHARS = {
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        numbers:   '0123456789',
        symbols:   '!@#$%&*+-=?'
    };

    const ADJECTIVES = [
        'blue','red','gold','dark','bright','swift','bold','calm','deep',
        'free','glad','hard','high','keen','kind','long','mild','neat',
        'pure','rare','rich','safe','slim','soft','tall','warm','wide',
        'wise','cold','clear','fresh','light','sharp','smart','strong',
        'sweet','wild','green','silver','silent','brave','quick','cool',
        'grand','royal','solar','lunar','iron','storm','frost','amber'
    ];

    const NOUNS = [
        'tiger','storm','eagle','river','stone','cloud','flame','ocean',
        'falcon','wolf','lion','hawk','shark','bear','crane','raven',
        'peak','ridge','coast','crest','forge','frost','spark','dawn',
        'dusk','echo','gale','helm','lark','mist','pine','reef','sage',
        'tide','torch','vale','vine','wake','ward','leaf','moon','star',
        'fire','ship','gate','road','hill','lake','isle','tree','rock',
        'trail','vault','crest','grove','blaze','comet','drift','flare'
    ];

    const SEPARATORS = ['-', '.', '_'];

    // ── Public: generate ──────────────────────────────────────────────────────

    function generate(options = {}) {
        const mode    = options.mode    || 'random';
        const keyword = (options.keyword || '').trim();

        let password;

        if (mode === 'readable') {
            password = generateReadable(options, keyword);
        } else if (mode === 'passphrase') {
            password = generatePassphrase(options, keyword);
        } else {
            password = generateRandom(options, keyword);
        }

        const analysis = Analyzer.analyze(password);
        return {
            password,
            length:    password.length,
            entropy:   analysis.entropy,
            crackTime: analysis.crackTime.display,
            strength:  analysis.strength
        };
    }

    // ── Readable mode ─────────────────────────────────────────────────────────
    // Pattern: [Adj][Noun][Symbol][Number]  e.g. BlueStorm#42

    function generateReadable(config, keyword) {
        const symbols = config.symbols !== false ? CHARS.symbols : '';
        const useNums = config.numbers !== false;

        // Pick two words (or use keyword as one)
        let word1, word2;
        if (keyword) {
            word1 = capitalize(keyword);
            word2 = capitalize(pick(NOUNS));
        } else {
            word1 = capitalize(pick(ADJECTIVES));
            word2 = capitalize(pick(NOUNS));
        }

        const sym = symbols ? pick(symbols.split('')) : '';
        const num = useNums ? String(secureRandomInt(900) + 100) : '';  // 3-digit

        return word1 + word2 + sym + num;
    }

    // ── Passphrase mode ───────────────────────────────────────────────────────
    // Pattern: word-word-word-number  e.g. blue-storm-tiger-847

    function generatePassphrase(config, keyword) {
        const sep    = pick(SEPARATORS);
        const useNums = config.numbers !== false;

        let words = [];
        if (keyword) {
            words.push(keyword.toLowerCase());
            words.push(pick(ADJECTIVES));
            words.push(pick(NOUNS));
        } else {
            words.push(pick(ADJECTIVES));
            words.push(pick(NOUNS));
            words.push(pick(ADJECTIVES.concat(NOUNS)));
        }

        // Shuffle so keyword isn't always first
        words = shuffleArray(words);

        let passphrase = words.join(sep);
        if (useNums) {
            passphrase += sep + (secureRandomInt(900) + 100);
        }

        return passphrase;
    }

    // ── Random mode ───────────────────────────────────────────────────────────

    function generateRandom(config, keyword) {
        const length = Math.max(8, Math.min(64, config.length || 16));

        let pool = '';
        if (config.lowercase !== false) pool += CHARS.lowercase;
        if (config.uppercase !== false) pool += CHARS.uppercase;
        if (config.numbers   !== false) pool += CHARS.numbers;
        if (config.symbols   !== false) pool += CHARS.symbols;
        if (!pool) pool = CHARS.lowercase + CHARS.uppercase;

        let password = keyword ? transformKeyword(keyword, config) : '';
        const remaining = Math.max(0, length - password.length);

        for (let i = 0; i < remaining; i++) {
            password += pool[secureRandomInt(pool.length)];
        }

        password = shuffleString(password);
        return ensureRequirements(password, config);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    function transformKeyword(keyword, config) {
        const subs = { a:'@', e:'3', i:'1', o:'0', s:'$', t:'7' };
        let result = keyword.split('').map(c => {
            const l = c.toLowerCase();
            return (subs[l] && secureRandomFloat() > 0.5) ? subs[l] : c;
        }).join('');
        if (config.uppercase !== false) result = capitalizeRandom(result);
        return result;
    }

    function ensureRequirements(password, config) {
        const chars = password.split('');
        const replace = i => chars[secureRandomInt(chars.length)] = i;
        if (config.lowercase !== false && !/[a-z]/.test(password))
            replace(CHARS.lowercase[secureRandomInt(26)]);
        if (config.uppercase !== false && !/[A-Z]/.test(password))
            replace(CHARS.uppercase[secureRandomInt(26)]);
        if (config.numbers !== false && !/[0-9]/.test(password))
            replace(CHARS.numbers[secureRandomInt(10)]);
        if (config.symbols !== false && !/[!@#$%&*+\-=?]/.test(password))
            replace(CHARS.symbols[secureRandomInt(CHARS.symbols.length)]);
        return chars.join('');
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    function capitalizeRandom(str) {
        return str.split('').map(c =>
            /[a-z]/.test(c) && secureRandomFloat() > 0.6 ? c.toUpperCase() : c
        ).join('');
    }

    function pick(arr) {
        return arr[secureRandomInt(arr.length)];
    }

    function shuffleString(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = secureRandomInt(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }

    function shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = secureRandomInt(i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function secureRandomInt(max) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
    }

    function secureRandomFloat() {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] / (0xFFFFFFFF + 1);
    }

    return { generate };
})();

window.Generator = Generator;

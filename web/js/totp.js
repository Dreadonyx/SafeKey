/**
 * SafeKey TOTP (Time-based One-Time Password) Module
 *
 * Generates RFC 6238 TOTP codes using Web Crypto API:
 * - Base32 decoding of secrets
 * - HMAC-SHA1 based code generation
 * - 30-second period with countdown
 * - otpauth:// URI parsing
 */

const TOTP = (function () {
    'use strict';

    // Base32 decode
    function base32Decode(str) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        str = str.replace(/[\s=-]+/g, '').toUpperCase();
        let bits = '';
        for (const c of str) {
            const val = alphabet.indexOf(c);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, '0');
        }
        const bytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
        }
        return bytes;
    }

    // Generate TOTP code
    async function generate(secret, period = 30, digits = 6) {
        const key = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / period);

        // Counter to 8-byte big-endian
        const counterBytes = new ArrayBuffer(8);
        const view = new DataView(counterBytes);
        view.setUint32(4, counter, false);

        // HMAC-SHA1
        const cryptoKey = await crypto.subtle.importKey(
            'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        );
        const hmac = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
        const hmacBytes = new Uint8Array(hmac);

        // Dynamic truncation
        const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
        const code = (
            ((hmacBytes[offset] & 0x7f) << 24) |
            ((hmacBytes[offset + 1] & 0xff) << 16) |
            ((hmacBytes[offset + 2] & 0xff) << 8) |
            (hmacBytes[offset + 3] & 0xff)
        ) % Math.pow(10, digits);

        return code.toString().padStart(digits, '0');
    }

    // Get remaining seconds in current period
    function getRemaining(period = 30) {
        return period - (Math.floor(Date.now() / 1000) % period);
    }

    // Validate a base32 secret
    function isValidSecret(secret) {
        const cleaned = secret.replace(/[\s=-]+/g, '').toUpperCase();
        return /^[A-Z2-7]+$/.test(cleaned) && cleaned.length >= 16;
    }

    // Parse otpauth:// URI
    function parseUri(uri) {
        try {
            const url = new URL(uri);
            if (url.protocol !== 'otpauth:') return null;
            const secret = url.searchParams.get('secret');
            const issuer = url.searchParams.get('issuer') || url.pathname.split(':')[0].replace(/^\/\/totp\//, '');
            const account = url.pathname.includes(':') ? url.pathname.split(':')[1] : '';
            return { secret, issuer, account };
        } catch { return null; }
    }

    return { generate, getRemaining, isValidSecret, parseUri, base32Decode };
})();
window.TOTP = TOTP;

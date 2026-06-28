/**
 * SafeKey Cryptographic Utilities
 *
 * Implements secure cryptographic operations using Web Crypto API:
 * - Argon2id key derivation (memory-hard, modern default)
 * - PBKDF2 key derivation (legacy, for existing vaults)
 * - AES-256-GCM authenticated encryption
 * - Cryptographically secure random generation
 *
 * KDF selection:
 *   New vaults always use Argon2id (memory=65536 KiB, t=3, p=1).
 *   Old PBKDF2 vaults are unlocked via the legacy path and can be
 *   upgraded to Argon2id through Settings → Change Master Key.
 */

const Crypto = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        // Argon2id parameters (OWASP recommended minimums)
        ARGON2_MEMORY:     65536,   // 64 MiB
        ARGON2_TIME:       3,       // iterations
        ARGON2_PARALLELISM:1,
        ARGON2_HASH_LEN:   32,      // 256-bit output
        // Legacy PBKDF2
        PBKDF2_ITERATIONS: 100000,
        // Shared
        SALT_LENGTH: 32,            // 256-bit salt (used for both KDFs)
        IV_LENGTH:   12,
        KEY_LENGTH:  256,
        HASH_ALGORITHM: 'SHA-256'
    };

    // KDF type constants
    const KDF = {
        ARGON2ID: 'argon2id',
        PBKDF2:   'pbkdf2'
    };

    /**
     * Generates cryptographically secure random bytes
     * @param {number} length - Number of bytes to generate
     * @returns {Uint8Array} Random bytes
     */
    function generateRandomBytes(length) {
        return crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Generates a new salt for key derivation
     * @returns {Uint8Array} 16-byte random salt
     */
    function generateSalt() {
        return generateRandomBytes(CONFIG.SALT_LENGTH);
    }

    /**
     * Generates a new IV for encryption
     * @returns {Uint8Array} 12-byte random IV
     */
    function generateIV() {
        return generateRandomBytes(CONFIG.IV_LENGTH);
    }

    /**
     * Converts ArrayBuffer to Base64 string
     * @param {ArrayBuffer|Uint8Array} buffer
     * @returns {string} Base64 encoded string
     */
    function arrayBufferToBase64(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Converts Base64 string to Uint8Array
     * @param {string} base64
     * @returns {Uint8Array}
     */
    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Converts string to Uint8Array using UTF-8 encoding
     * @param {string} str
     * @returns {Uint8Array}
     */
    function stringToBytes(str) {
        return new TextEncoder().encode(str);
    }

    /**
     * Converts Uint8Array to string using UTF-8 decoding
     * @param {Uint8Array} bytes
     * @returns {string}
     */
    function bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    }

    /**
     * Derives a key using Argon2id (memory-hard, default for new vaults).
     * Requires the argon2-browser WASM library to be loaded.
     * @param {string} masterPassword
     * @param {Uint8Array} salt
     * @returns {Promise<CryptoKey>} AES-GCM key
     */
    async function deriveKeyArgon2id(masterPassword, salt) {
        if (typeof window.argon2 === 'undefined') {
            throw new Error('Argon2 WASM library not loaded');
        }

        const result = await window.argon2.hash({
            pass:   masterPassword,
            salt:   salt,
            type:   window.argon2.ArgonType.Argon2id,
            mem:    CONFIG.ARGON2_MEMORY,
            time:   CONFIG.ARGON2_TIME,
            parallelism: CONFIG.ARGON2_PARALLELISM,
            hashLen: CONFIG.ARGON2_HASH_LEN,
            distrib: false  // Don't split into workers (keep deterministic)
        });

        // Import the raw 32-byte hash as an AES-GCM key
        return crypto.subtle.importKey(
            'raw',
            result.hash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Derives a key using legacy PBKDF2 (for existing vaults only).
     * @param {string} masterPassword
     * @param {Uint8Array} salt
     * @returns {Promise<CryptoKey>} AES-GCM key
     */
    async function deriveKeyPBKDF2(masterPassword, salt) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            stringToBytes(masterPassword),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name:       'PBKDF2',
                salt:       salt,
                iterations: CONFIG.PBKDF2_ITERATIONS,
                hash:       CONFIG.HASH_ALGORITHM
            },
            keyMaterial,
            { name: 'AES-GCM', length: CONFIG.KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Unified key derivation — dispatches to Argon2id or PBKDF2.
     * @param {string} masterPassword
     * @param {Uint8Array} salt
     * @param {string} [kdfType='argon2id'] - KDF.ARGON2ID or KDF.PBKDF2
     * @returns {Promise<CryptoKey>}
     */
    async function deriveKey(masterPassword, salt, kdfType = KDF.ARGON2ID) {
        if (kdfType === KDF.PBKDF2) {
            return deriveKeyPBKDF2(masterPassword, salt);
        }
        return deriveKeyArgon2id(masterPassword, salt);
    }

    /**
     * Encrypts data using AES-256-GCM
     * @param {string} plaintext - Data to encrypt
     * @param {CryptoKey} key - AES-GCM key
     * @returns {Promise<{ciphertext: string, iv: string}>} Encrypted data with IV
     */
    async function encrypt(plaintext, key) {
        const iv = generateIV();
        const plaintextBytes = stringToBytes(plaintext);

        const ciphertextBuffer = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            plaintextBytes
        );

        return {
            ciphertext: arrayBufferToBase64(ciphertextBuffer),
            iv: arrayBufferToBase64(iv)
        };
    }

    /**
     * Decrypts data using AES-256-GCM
     * @param {string} ciphertext - Base64 encoded ciphertext
     * @param {string} iv - Base64 encoded IV
     * @param {CryptoKey} key - AES-GCM key
     * @returns {Promise<string>} Decrypted plaintext
     */
    async function decrypt(ciphertext, iv, key) {
        const ciphertextBytes = base64ToArrayBuffer(ciphertext);
        const ivBytes = base64ToArrayBuffer(iv);

        const plaintextBuffer = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBytes
            },
            key,
            ciphertextBytes
        );

        return bytesToString(new Uint8Array(plaintextBuffer));
    }

    /**
     * Creates a hash of data for verification purposes
     * @param {string} data - Data to hash
     * @returns {Promise<string>} Base64 encoded hash
     */
    async function hash(data) {
        const dataBytes = stringToBytes(data);
        const hashBuffer = await crypto.subtle.digest(CONFIG.HASH_ALGORITHM, dataBytes);
        return arrayBufferToBase64(hashBuffer);
    }

    // Public API
    return {
        KDF,
        generateSalt,
        generateIV,
        deriveKey,
        deriveKeyArgon2id,
        deriveKeyPBKDF2,
        encrypt,
        decrypt,
        hash,
        arrayBufferToBase64,
        base64ToArrayBuffer
    };
})();

// Export for use in other modules
window.Crypto = Crypto;

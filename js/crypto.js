/**
 * SafeKey Cryptographic Utilities
 * 
 * Implements secure cryptographic operations using Web Crypto API:
 * - PBKDF2 key derivation (100,000 iterations)
 * - AES-256-GCM authenticated encryption
 * - Cryptographically secure random generation
 */

const Crypto = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        PBKDF2_ITERATIONS: 100000,
        SALT_LENGTH: 16,
        IV_LENGTH: 12,
        KEY_LENGTH: 256,
        HASH_ALGORITHM: 'SHA-256'
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
     * Derives a cryptographic key from master password using PBKDF2
     * @param {string} masterPassword - User's master password
     * @param {Uint8Array} salt - Salt for key derivation
     * @returns {Promise<CryptoKey>} Derived AES-GCM key
     */
    async function deriveKey(masterPassword, salt) {
        // Import master password as raw key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            stringToBytes(masterPassword),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        // Derive AES-GCM key using PBKDF2
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: CONFIG.PBKDF2_ITERATIONS,
                hash: CONFIG.HASH_ALGORITHM
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: CONFIG.KEY_LENGTH
            },
            false, // Not extractable
            ['encrypt', 'decrypt']
        );
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
        generateSalt,
        generateIV,
        deriveKey,
        encrypt,
        decrypt,
        hash,
        arrayBufferToBase64,
        base64ToArrayBuffer
    };
})();

// Export for use in other modules
window.Crypto = Crypto;

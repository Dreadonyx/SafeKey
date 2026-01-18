/**
 * SafeKey Vault Management
 * 
 * Handles:
 * - Encrypted credential storage in localStorage
 * - CRUD operations for credentials
 * - Individual encryption per entry with unique IVs
 * - Clipboard management with auto-clear
 */

const Vault = (function () {
    'use strict';

    // Storage keys
    const STORAGE_KEYS = {
        VAULT_DATA: 'safekey_vault',
        VAULT_SALT: 'safekey_salt',
        VAULT_VERIFY: 'safekey_verify',
        VAULT_USERNAME: 'safekey_username'
    };

    // Clipboard auto-clear timeout (30 seconds)
    const CLIPBOARD_TIMEOUT = 30000;
    let clipboardTimeoutId = null;

    /**
     * Checks if a vault exists (first run detection)
     * @returns {boolean}
     */
    function exists() {
        return localStorage.getItem(STORAGE_KEYS.VAULT_SALT) !== null;
    }

    /**
     * Gets the stored username
     * @returns {string|null}
     */
    function getUsername() {
        return localStorage.getItem(STORAGE_KEYS.VAULT_USERNAME);
    }

    /**
     * Initializes a new vault with master key
     * @param {string} username
     * @param {string} masterPassword
     * @returns {Promise<{success: boolean, key: CryptoKey, salt: Uint8Array}>}
     */
    async function initialize(username, masterPassword) {
        try {
            // Generate new salt
            const salt = Crypto.generateSalt();

            // Derive key from master password
            const key = await Crypto.deriveKey(masterPassword, salt);

            // Create verification token (encrypt known phrase)
            const verifyData = await Crypto.encrypt('SAFEKEY_VERIFY_TOKEN', key);

            // Store salt, verification token, and username
            localStorage.setItem(STORAGE_KEYS.VAULT_SALT, Crypto.arrayBufferToBase64(salt));
            localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY, JSON.stringify(verifyData));
            localStorage.setItem(STORAGE_KEYS.VAULT_USERNAME, username);
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA, JSON.stringify([]));

            return { success: true, key, salt };
        } catch (error) {
            console.error('[Vault] Initialization failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Attempts to unlock the vault with master password
     * @param {string} masterPassword
     * @returns {Promise<{success: boolean, key?: CryptoKey, salt?: Uint8Array}>}
     */
    async function unlock(masterPassword) {
        try {
            // Get stored salt
            const saltBase64 = localStorage.getItem(STORAGE_KEYS.VAULT_SALT);
            if (!saltBase64) {
                return { success: false, error: 'No vault found' };
            }

            const salt = Crypto.base64ToArrayBuffer(saltBase64);

            // Derive key
            const key = await Crypto.deriveKey(masterPassword, salt);

            // Verify with stored token
            const verifyData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_VERIFY));

            try {
                const verified = await Crypto.decrypt(verifyData.ciphertext, verifyData.iv, key);
                if (verified !== 'SAFEKEY_VERIFY_TOKEN') {
                    return { success: false, error: 'Invalid master key' };
                }
            } catch (e) {
                // Decryption failed = wrong password
                return { success: false, error: 'Invalid master key' };
            }

            return { success: true, key, salt };
        } catch (error) {
            console.error('[Vault] Unlock failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Gets all credentials (decrypted)
     * @returns {Promise<Array>}
     */
    async function getAll() {
        const key = Session.getKey();
        if (!key) {
            throw new Error('Vault is locked');
        }

        const encryptedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_DATA) || '[]');
        const decryptedCredentials = [];

        for (const entry of encryptedData) {
            try {
                const decrypted = await Crypto.decrypt(entry.data, entry.iv, key);
                decryptedCredentials.push({
                    id: entry.id,
                    ...JSON.parse(decrypted)
                });
            } catch (e) {
                console.error('[Vault] Failed to decrypt entry:', entry.id);
            }
        }

        return decryptedCredentials;
    }

    /**
     * Gets a single credential by ID
     * @param {string} id
     * @returns {Promise<Object|null>}
     */
    async function getById(id) {
        const all = await getAll();
        return all.find(c => c.id === id) || null;
    }

    /**
     * Adds a new credential
     * @param {Object} credential - {site, username, password, notes}
     * @returns {Promise<Object>} Created credential with ID
     */
    async function add(credential) {
        const key = Session.getKey();
        if (!key) {
            throw new Error('Vault is locked');
        }

        // Generate unique ID
        const id = generateId();

        // Prepare credential data
        const credentialData = {
            site: credential.site,
            username: credential.username,
            password: credential.password,
            notes: credential.notes || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        // Encrypt with unique IV
        const encrypted = await Crypto.encrypt(JSON.stringify(credentialData), key);

        // Store encrypted entry
        const encryptedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_DATA) || '[]');
        encryptedData.push({
            id,
            data: encrypted.ciphertext,
            iv: encrypted.iv
        });
        localStorage.setItem(STORAGE_KEYS.VAULT_DATA, JSON.stringify(encryptedData));

        return { id, ...credentialData };
    }

    /**
     * Updates an existing credential
     * @param {string} id
     * @param {Object} updates
     * @returns {Promise<Object>} Updated credential
     */
    async function update(id, updates) {
        const key = Session.getKey();
        if (!key) {
            throw new Error('Vault is locked');
        }

        // Get current credential
        const current = await getById(id);
        if (!current) {
            throw new Error('Credential not found');
        }

        // Merge updates
        const updatedCredential = {
            ...current,
            ...updates,
            updatedAt: Date.now()
        };
        delete updatedCredential.id; // Remove ID from data

        // Re-encrypt with new IV
        const encrypted = await Crypto.encrypt(JSON.stringify(updatedCredential), key);

        // Update storage
        const encryptedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_DATA) || '[]');
        const index = encryptedData.findIndex(e => e.id === id);
        if (index !== -1) {
            encryptedData[index] = {
                id,
                data: encrypted.ciphertext,
                iv: encrypted.iv
            };
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA, JSON.stringify(encryptedData));
        }

        return { id, ...updatedCredential };
    }

    /**
     * Deletes a credential
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async function remove(id) {
        const encryptedData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_DATA) || '[]');
        const filtered = encryptedData.filter(e => e.id !== id);

        if (filtered.length !== encryptedData.length) {
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA, JSON.stringify(filtered));
            return true;
        }
        return false;
    }

    /**
     * Searches credentials by site or username
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async function search(query) {
        const all = await getAll();
        const lowerQuery = query.toLowerCase();

        return all.filter(c =>
            c.site.toLowerCase().includes(lowerQuery) ||
            c.username.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Copies password to clipboard with auto-clear
     * @param {string} text
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);

            // Clear any existing timeout
            if (clipboardTimeoutId) {
                clearTimeout(clipboardTimeoutId);
            }

            // Set up auto-clear
            clipboardTimeoutId = setTimeout(async () => {
                try {
                    await navigator.clipboard.writeText('');
                    console.log('[Vault] Clipboard cleared');
                } catch (e) {
                    // Ignore clipboard clear errors
                }
            }, CLIPBOARD_TIMEOUT);

            return true;
        } catch (error) {
            console.error('[Vault] Clipboard copy failed:', error);
            return false;
        }
    }

    /**
     * Generates a unique ID
     * @returns {string}
     */
    function generateId() {
        return 'cred_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Exports vault data (encrypted blob)
     * @returns {string} Encrypted vault data
     */
    function exportVault() {
        return JSON.stringify({
            salt: localStorage.getItem(STORAGE_KEYS.VAULT_SALT),
            verify: localStorage.getItem(STORAGE_KEYS.VAULT_VERIFY),
            data: localStorage.getItem(STORAGE_KEYS.VAULT_DATA)
        });
    }

    /**
     * Imports vault data
     * @param {string} exportedData
     * @returns {boolean}
     */
    function importVault(exportedData) {
        try {
            const data = JSON.parse(exportedData);
            localStorage.setItem(STORAGE_KEYS.VAULT_SALT, data.salt);
            localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY, data.verify);
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA, data.data);
            return true;
        } catch (e) {
            console.error('[Vault] Import failed:', e);
            return false;
        }
    }

    // Public API
    return {
        exists,
        initialize,
        unlock,
        getAll,
        getById,
        add,
        update,
        remove,
        search,
        copyToClipboard,
        exportVault,
        importVault,
        getUsername
    };
})();

// Export for use in other modules
window.Vault = Vault;

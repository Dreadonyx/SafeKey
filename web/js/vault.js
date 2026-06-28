/**
 * SafeKey Vault Management
 *
 * Handles:
 * - Encrypted credential storage in localStorage
 * - CRUD operations for credentials with per-entry unique IVs
 * - Clipboard management with auto-clear
 * - KDF versioning: Argon2id (new) and PBKDF2 (legacy)
 *
 * Salt storage format (JSON):
 *   { salt: "<base64>", kdf: "argon2id" | "pbkdf2" }
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
            const salt = Crypto.generateSalt();

            // Always derive with Argon2id for new vaults
            const key = await Crypto.deriveKey(masterPassword, salt, Crypto.KDF.ARGON2ID);

            const verifyData = await Crypto.encrypt('SAFEKEY_VERIFY_TOKEN', key);

            // Store salt + KDF type together as JSON
            const saltBlob = JSON.stringify({
                salt: Crypto.arrayBufferToBase64(salt),
                kdf:  Crypto.KDF.ARGON2ID
            });
            localStorage.setItem(STORAGE_KEYS.VAULT_SALT,     saltBlob);
            localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY,   JSON.stringify(verifyData));
            localStorage.setItem(STORAGE_KEYS.VAULT_USERNAME, username);
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA,     JSON.stringify([]));

            return { success: true, key, salt, kdf: Crypto.KDF.ARGON2ID };
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
            const saltRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT);
            if (!saltRaw) return { success: false, error: 'No vault found' };

            // Parse salt blob — handle legacy plain-base64 format
            let saltBase64, kdf;
            try {
                const parsed = JSON.parse(saltRaw);
                saltBase64 = parsed.salt;
                kdf        = parsed.kdf || Crypto.KDF.PBKDF2;
            } catch {
                // Legacy vault: raw base64 string (PBKDF2)
                saltBase64 = saltRaw;
                kdf        = Crypto.KDF.PBKDF2;
            }

            const salt = Crypto.base64ToArrayBuffer(saltBase64);
            const key  = await Crypto.deriveKey(masterPassword, salt, kdf);

            const verifyData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_VERIFY));
            try {
                const verified = await Crypto.decrypt(verifyData.ciphertext, verifyData.iv, key);
                if (verified !== 'SAFEKEY_VERIFY_TOKEN') {
                    return { success: false, error: 'Invalid master key' };
                }
            } catch {
                return { success: false, error: 'Invalid master key' };
            }

            return { success: true, key, salt, kdf };
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
            url: credential.url || '',
            category: credential.category || '',
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
        const randomBytes = new Uint8Array(9);
        crypto.getRandomValues(randomBytes);
        const randomPart = Array.from(randomBytes).map(b => b.toString(36)).join('');
        return 'cred_' + Date.now().toString(36) + '_' + randomPart;
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
            if (typeof data.salt !== 'string' || typeof data.verify !== 'string' || typeof data.data !== 'string') {
                throw new Error('Invalid vault structure');
            }
            // Validate data fields parse correctly before storing
            JSON.parse(data.verify);
            JSON.parse(data.data);
            localStorage.setItem(STORAGE_KEYS.VAULT_SALT, data.salt);
            localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY, data.verify);
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA, data.data);
            return true;
        } catch (e) {
            console.error('[Vault] Import failed:', e);
            return false;
        }
    }

    /**
     * Changes the master key by re-encrypting all credentials
     * @param {string} currentPassword
     * @param {string} newPassword
     * @returns {Promise<{success: boolean, key?: CryptoKey, salt?: Uint8Array}>}
     */
    async function changeMasterKey(currentPassword, newPassword) {
        try {
            const saltRaw = localStorage.getItem(STORAGE_KEYS.VAULT_SALT);
            if (!saltRaw) return { success: false, error: 'No vault found' };

            let saltBase64, currentKdf;
            try {
                const parsed = JSON.parse(saltRaw);
                saltBase64  = parsed.salt;
                currentKdf  = parsed.kdf || Crypto.KDF.PBKDF2;
            } catch {
                saltBase64  = saltRaw;
                currentKdf  = Crypto.KDF.PBKDF2;
            }

            const currentSalt = Crypto.base64ToArrayBuffer(saltBase64);
            const currentKey  = await Crypto.deriveKey(currentPassword, currentSalt, currentKdf);

            const verifyData = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULT_VERIFY));
            try {
                const verified = await Crypto.decrypt(verifyData.ciphertext, verifyData.iv, currentKey);
                if (verified !== 'SAFEKEY_VERIFY_TOKEN') {
                    return { success: false, error: 'Invalid current master key' };
                }
            } catch {
                return { success: false, error: 'Invalid current master key' };
            }

            const allCreds = await getAll();

            // Always re-encrypt under Argon2id (upgrades legacy PBKDF2 vaults)
            const newSalt       = Crypto.generateSalt();
            const newKey        = await Crypto.deriveKey(newPassword, newSalt, Crypto.KDF.ARGON2ID);
            const newVerifyData = await Crypto.encrypt('SAFEKEY_VERIFY_TOKEN', newKey);
            const newSaltBlob   = JSON.stringify({
                salt: Crypto.arrayBufferToBase64(newSalt),
                kdf:  Crypto.KDF.ARGON2ID
            });

            const newEncryptedData = [];
            for (const cred of allCreds) {
                const credData = { ...cred };
                delete credData.id;
                const encrypted = await Crypto.encrypt(JSON.stringify(credData), newKey);
                newEncryptedData.push({ id: cred.id, data: encrypted.ciphertext, iv: encrypted.iv });
            }

            localStorage.setItem(STORAGE_KEYS.VAULT_SALT,   newSaltBlob);
            localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY, JSON.stringify(newVerifyData));
            localStorage.setItem(STORAGE_KEYS.VAULT_DATA,   JSON.stringify(newEncryptedData));

            return { success: true, key: newKey, salt: newSalt, kdf: Crypto.KDF.ARGON2ID };
        } catch (error) {
            console.error('[Vault] Change master key failed:', error);
            return { success: false, error: error.message };
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
        getUsername,
        changeMasterKey
    };
})();

// Export for use in other modules
window.Vault = Vault;

/**
 * SafeKey Main Application Controller
 * 
 * Handles:
 * - SPA routing between views
 * - First-run detection and setup flow
 * - Event handling and UI updates
 * - Integration of all modules
 */

const App = (function () {
    'use strict';

    // DOM Elements
    const elements = {};

    // Current state
    let currentView = null;
    let editingCredentialId = null;

    /**
     * Initializes the application
     */
    async function init() {
        cacheElements();
        bindEvents();

        // Set up session lock callback
        Session.onLock(handleVaultLock);

        // Always start at landing page
        showView('landing');

        console.log('[SafeKey] Application initialized');
    }

    /**
     * Caches DOM elements for performance
     */
    function cacheElements() {
        // Views
        elements.landingView = document.getElementById('landingView');
        elements.setupView = document.getElementById('setupView');
        elements.unlockView = document.getElementById('unlockView');
        elements.vaultView = document.getElementById('vaultView');
        elements.analyzerView = document.getElementById('analyzerView');
        elements.generatorView = document.getElementById('generatorView');
        elements.sidebar = document.getElementById('sidebar');

        // Forms
        elements.setupForm = document.getElementById('setupForm');
        elements.unlockForm = document.getElementById('unlockForm');
        elements.credentialForm = document.getElementById('credentialForm');

        // Inputs
        elements.masterKeySetup = document.getElementById('masterKeySetup');
        elements.usernameSetup = document.getElementById('usernameSetup');
        elements.masterKeyConfirm = document.getElementById('masterKeyConfirm');
        elements.masterKeyUnlock = document.getElementById('masterKeyUnlock');
        elements.vaultSearch = document.getElementById('vaultSearch');
        elements.analyzerInput = document.getElementById('analyzerInput');

        // Generator elements
        elements.passwordLength = document.getElementById('passwordLength');
        elements.lengthValue = document.getElementById('lengthValue');
        elements.memorability = document.getElementById('memorability');
        elements.generatedPassword = document.getElementById('generatedPassword');
        elements.includeUppercase = document.getElementById('includeUppercase');
        elements.includeLowercase = document.getElementById('includeLowercase');
        elements.includeNumbers = document.getElementById('includeNumbers');
        elements.includeSymbols = document.getElementById('includeSymbols');
        elements.keywordInput = document.getElementById('keywordInput');

        // Buttons
        elements.lockBtn = document.getElementById('lockBtn');
        elements.addCredentialBtn = document.getElementById('addCredentialBtn');
        elements.generateBtn = document.getElementById('generateBtn');
        elements.copyPasswordBtn = document.getElementById('copyPasswordBtn');
        elements.regenerateBtn = document.getElementById('regenerateBtn');
        elements.generateInlineBtn = document.getElementById('generateInlineBtn');

        // Landing page buttons
        elements.generateVaultBtn = document.getElementById('generateVaultBtn');
        elements.openVaultBtn = document.getElementById('openVaultBtn');
        elements.backFromSetup = document.getElementById('backFromSetup');
        elements.backFromUnlock = document.getElementById('backFromUnlock');

        // Modal
        elements.credentialModal = document.getElementById('credentialModal');
        elements.closeModal = document.getElementById('closeModal');
        elements.cancelModal = document.getElementById('cancelModal');
        elements.modalTitle = document.getElementById('modalTitle');

        // Other
        elements.credentialsList = document.getElementById('credentialsList');
        elements.emptyVault = document.getElementById('emptyVault');
        elements.unlockError = document.getElementById('unlockError');
        elements.setupStrength = document.getElementById('setupStrength');
        elements.toast = document.getElementById('toast');
    }

    /**
     * Binds event listeners
     */
    function bindEvents() {
        // Landing page navigation
        elements.generateVaultBtn.addEventListener('click', () => showView('setup'));
        elements.openVaultBtn.addEventListener('click', () => showView('unlock'));
        elements.backFromSetup.addEventListener('click', () => showView('landing'));
        elements.backFromUnlock.addEventListener('click', () => showView('landing'));

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (Session.isUnlocked()) {
                    navigateTo(view);
                }
            });
        });

        // Setup form
        elements.setupForm.addEventListener('submit', handleSetup);
        elements.masterKeySetup.addEventListener('input', handleSetupPasswordInput);

        // Unlock form
        elements.unlockForm.addEventListener('submit', handleUnlock);

        // Lock button
        elements.lockBtn.addEventListener('click', () => Session.lock());

        // Vault
        elements.addCredentialBtn.addEventListener('click', () => openCredentialModal());
        elements.vaultSearch.addEventListener('input', handleSearch);

        // Credential modal
        elements.credentialForm.addEventListener('submit', handleCredentialSubmit);
        elements.closeModal.addEventListener('click', closeCredentialModal);
        elements.cancelModal.addEventListener('click', closeCredentialModal);
        elements.credentialModal.addEventListener('click', (e) => {
            if (e.target === elements.credentialModal) closeCredentialModal();
        });
        elements.generateInlineBtn.addEventListener('click', () => {
            const generated = Generator.generate({ length: 16 });
            document.getElementById('credentialPassword').value = generated.password;
        });

        // Password toggles
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target.type === 'password') {
                    target.type = 'text';
                    btn.textContent = '🙈';
                } else {
                    target.type = 'password';
                    btn.textContent = '👁️';
                }
            });
        });

        // Analyzer
        elements.analyzerInput.addEventListener('input', handleAnalyzerInput);

        // Generator
        elements.passwordLength.addEventListener('input', () => {
            elements.lengthValue.textContent = elements.passwordLength.value;
        });
        elements.generateBtn.addEventListener('click', handleGenerate);
        elements.regenerateBtn.addEventListener('click', handleGenerate);
        elements.copyPasswordBtn.addEventListener('click', handleCopyPassword);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape closes modal
            if (e.key === 'Escape' && !elements.credentialModal.classList.contains('hidden')) {
                closeCredentialModal();
            }
        });
    }

    /**
     * Shows a specific view
     * @param {string} viewName
     */
    function showView(viewName) {
        // Hide all views
        [elements.landingView, elements.setupView, elements.unlockView, elements.vaultView,
        elements.analyzerView, elements.generatorView].forEach(view => {
            view.classList.add('hidden');
        });

        // Show/hide sidebar based on auth state
        if (viewName === 'landing' || viewName === 'setup' || viewName === 'unlock') {
            elements.sidebar.classList.add('hidden');
        } else {
            elements.sidebar.classList.remove('hidden');
        }

        // Show requested view
        const view = document.getElementById(viewName + 'View');
        if (view) {
            view.classList.remove('hidden');
            currentView = viewName;
        }
    }

    /**
     * Navigates to a view (for authenticated views)
     * @param {string} viewName
     */
    function navigateTo(viewName) {
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        showView(viewName);

        // Load view-specific content
        if (viewName === 'vault') {
            loadCredentials();
        }
    }

    /**
     * Handles master key setup
     * @param {Event} e
     */
    async function handleSetup(e) {
        e.preventDefault();

        const username = elements.usernameSetup.value.trim();
        const password = elements.masterKeySetup.value;
        const confirm = elements.masterKeyConfirm.value;

        if (!username) {
            showToast('Username is required', 'error');
            return;
        }

        if (password !== confirm) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 8) {
            showToast('Master key must be at least 8 characters', 'error');
            return;
        }

        try {
            const result = await Vault.initialize(username, password);
            if (result.success) {
                Session.start(result.key, result.salt);
                navigateTo('vault');
                showToast('Vault created successfully!', 'success');
            } else {
                showToast('Failed to create vault', 'error');
            }
        } catch (error) {
            console.error('[App] Setup error:', error);
            showToast('An error occurred', 'error');
        }
    }

    /**
     * Handles setup password input for strength indicator
     */
    function handleSetupPasswordInput() {
        const password = elements.masterKeySetup.value;
        const analysis = Analyzer.analyze(password);
        elements.setupStrength.style.setProperty('--strength', analysis.strength + '%');
    }

    /**
     * Handles vault unlock
     * @param {Event} e
     */
    async function handleUnlock(e) {
        e.preventDefault();

        const password = elements.masterKeyUnlock.value;

        try {
            const result = await Vault.unlock(password);
            if (result.success) {
                Session.start(result.key, result.salt);
                elements.masterKeyUnlock.value = '';
                elements.unlockError.classList.add('hidden');
                navigateTo('vault');
                showToast('Vault unlocked', 'success');
            } else {
                elements.unlockError.classList.remove('hidden');
                elements.masterKeyUnlock.value = '';
            }
        } catch (error) {
            console.error('[App] Unlock error:', error);
            elements.unlockError.classList.remove('hidden');
        }
    }

    /**
     * Handles vault lock
     */
    function handleVaultLock() {
        showView('landing');
        showToast('Vault locked', 'info');
    }

    /**
     * Loads and displays credentials
     */
    async function loadCredentials() {
        try {
            const credentials = await Vault.getAll();
            renderCredentials(credentials);
        } catch (error) {
            console.error('[App] Failed to load credentials:', error);
        }
    }

    /**
     * Renders credentials list
     * @param {Array} credentials
     */
    function renderCredentials(credentials) {
        if (credentials.length === 0) {
            elements.credentialsList.innerHTML = '';
            elements.emptyVault.classList.remove('hidden');
            return;
        }

        elements.emptyVault.classList.add('hidden');

        elements.credentialsList.innerHTML = credentials.map(cred => `
            <div class="credential-card" data-id="${cred.id}">
                <div class="credential-icon">${getInitials(cred.site)}</div>
                <div class="credential-info">
                    <div class="credential-site">${escapeHtml(cred.site)}</div>
                    <div class="credential-username">${escapeHtml(cred.username)}</div>
                    <div class="credential-password">
                        <span class="password-hidden">••••••••</span>
                    </div>
                </div>
                <div class="credential-actions">
                    <button class="icon-btn reveal-btn" title="Reveal Password" data-id="${cred.id}">👁️</button>
                    <button class="icon-btn copy-btn" title="Copy Password" data-id="${cred.id}">📋</button>
                    <button class="icon-btn edit-btn" title="Edit" data-id="${cred.id}">✏️</button>
                    <button class="icon-btn delete-btn" title="Delete" data-id="${cred.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        // Bind credential action events
        bindCredentialEvents();
    }

    /**
     * Binds events to credential cards
     */
    function bindCredentialEvents() {
        // Reveal password
        document.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.credential-card');
                const passwordEl = card.querySelector('.credential-password');
                const cred = await Vault.getById(btn.dataset.id);

                if (passwordEl.querySelector('.password-visible')) {
                    passwordEl.innerHTML = '<span class="password-hidden">••••••••</span>';
                    btn.textContent = '👁️';
                } else {
                    passwordEl.innerHTML = `<span class="password-visible">${escapeHtml(cred.password)}</span>`;
                    btn.textContent = '🙈';
                }
            });
        });

        // Copy password
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cred = await Vault.getById(btn.dataset.id);
                const success = await Vault.copyToClipboard(cred.password);
                if (success) {
                    showToast('Password copied (auto-clears in 30s)', 'success');
                } else {
                    showToast('Failed to copy', 'error');
                }
            });
        });

        // Edit credential
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cred = await Vault.getById(btn.dataset.id);
                openCredentialModal(cred);
            });
        });

        // Delete credential
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this credential?')) {
                    await Vault.remove(btn.dataset.id);
                    loadCredentials();
                    showToast('Credential deleted', 'success');
                }
            });
        });
    }

    /**
     * Opens the credential modal
     * @param {Object} credential - Optional credential for editing
     */
    function openCredentialModal(credential = null) {
        editingCredentialId = credential?.id || null;

        elements.modalTitle.textContent = credential ? 'Edit Credential' : 'Add Credential';

        document.getElementById('credentialId').value = credential?.id || '';
        document.getElementById('credentialSite').value = credential?.site || '';
        document.getElementById('credentialUsername').value = credential?.username || '';
        document.getElementById('credentialPassword').value = credential?.password || '';
        document.getElementById('credentialNotes').value = credential?.notes || '';

        elements.credentialModal.classList.remove('hidden');
        document.getElementById('credentialSite').focus();
    }

    /**
     * Closes the credential modal
     */
    function closeCredentialModal() {
        elements.credentialModal.classList.add('hidden');
        elements.credentialForm.reset();
        editingCredentialId = null;
    }

    /**
     * Handles credential form submission
     * @param {Event} e
     */
    async function handleCredentialSubmit(e) {
        e.preventDefault();

        const credential = {
            site: document.getElementById('credentialSite').value,
            username: document.getElementById('credentialUsername').value,
            password: document.getElementById('credentialPassword').value,
            notes: document.getElementById('credentialNotes').value
        };

        try {
            if (editingCredentialId) {
                await Vault.update(editingCredentialId, credential);
                showToast('Credential updated', 'success');
            } else {
                await Vault.add(credential);
                showToast('Credential added', 'success');
            }

            closeCredentialModal();
            loadCredentials();
        } catch (error) {
            console.error('[App] Credential save error:', error);
            showToast('Failed to save credential', 'error');
        }
    }

    /**
     * Handles vault search
     */
    async function handleSearch() {
        const query = elements.vaultSearch.value.trim();

        if (query === '') {
            loadCredentials();
            return;
        }

        const results = await Vault.search(query);
        renderCredentials(results);
    }

    /**
     * Handles analyzer input
     */
    function handleAnalyzerInput() {
        const password = elements.analyzerInput.value;
        const analysis = Analyzer.analyze(password);

        // Update strength bar
        const strengthFill = document.getElementById('strengthFill');
        strengthFill.style.width = analysis.strength + '%';

        // Update strength label
        const strengthLabel = document.getElementById('strengthLabel');
        const { label, color } = Analyzer.getStrengthLabel(analysis.strength);
        strengthLabel.textContent = label;
        strengthLabel.style.color = color;

        // Update rules checklist
        const rules = analysis.rules;
        Object.keys(rules).forEach(rule => {
            const ruleEl = document.querySelector(`[data-rule="${rule}"]`);
            if (ruleEl) {
                ruleEl.classList.toggle('passed', rules[rule]);
                ruleEl.querySelector('.rule-icon').textContent = rules[rule] ? '✓' : '○';
            }
        });

        // Update metrics
        document.getElementById('entropyValue').textContent = Math.round(analysis.entropy) + ' bits';
        document.getElementById('strengthPercent').textContent = analysis.strength + '%';
        document.getElementById('crackTime').textContent = analysis.crackTime.display;
    }

    /**
     * Handles password generation
     */
    function handleGenerate() {
        const options = {
            length: parseInt(elements.passwordLength.value),
            uppercase: elements.includeUppercase.checked,
            lowercase: elements.includeLowercase.checked,
            numbers: elements.includeNumbers.checked,
            symbols: elements.includeSymbols.checked,
            keyword: elements.keywordInput.value,
            memorability: parseInt(elements.memorability.value)
        };

        const result = Generator.generate(options);

        elements.generatedPassword.value = result.password;
        document.getElementById('genEntropyValue').textContent = Math.round(result.entropy) + ' bits';
        document.getElementById('genCrackTime').textContent = result.crackTime;
    }

    /**
     * Handles copy generated password
     */
    async function handleCopyPassword() {
        const password = elements.generatedPassword.value;
        if (!password) return;

        const success = await Vault.copyToClipboard(password);
        if (success) {
            showToast('Password copied (auto-clears in 30s)', 'success');
        }
    }

    /**
     * Shows a toast notification
     * @param {string} message
     * @param {string} type
     */
    function showToast(message, type = 'info') {
        const toast = elements.toast;
        const messageEl = toast.querySelector('.toast-message');

        messageEl.textContent = message;
        toast.className = 'toast ' + type;

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }

    /**
     * Gets initials from a site name
     * @param {string} site
     * @returns {string}
     */
    function getInitials(site) {
        return site.substring(0, 2).toUpperCase();
    }

    /**
     * Escapes HTML to prevent XSS
     * @param {string} str
     * @returns {string}
     */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Public API (minimal)
    return {
        navigateTo,
        showToast
    };
})();

// Export for debugging
window.App = App;

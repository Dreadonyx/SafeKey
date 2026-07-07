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

    const elements = {};
    let currentView = null;
    let editingCredentialId = null;
    let activeCategory = 'all';
    let currentSort = localStorage.getItem('safekey_sort') || 'name-asc';

    // Tag color palette
    const TAG_COLORS = [
        '#00e5ff', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
        '#ff922b', '#cc5de8', '#20c997', '#f06595', '#845ef7'
    ];

    function getTagColor(tag) {
        let hash = 0;
        for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
        return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
    }

    // SVG icon constants (replacing emojis)
    const ICONS = {
        eye: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
        copy: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
        edit: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        trash: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
        search: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        externalLink: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        history: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/><polyline points="12 7 12 12 16 14"/></svg>',
        shield: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
        star: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        starFilled: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        sun: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
        moon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        paperclip: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
        download: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
    };

    let totpInterval = null;

    async function init() {
        applyTheme(localStorage.getItem('safekey_theme') || 'dark');
        cacheElements();
        bindEvents();
        Session.onLock(handleVaultLock);
        showView('landing');
        registerServiceWorker();

        // Restore lockout state if page was reloaded during a cooldown
        if (Lockout.isLocked()) {
            Lockout.startCountdown(elements.lockoutMessage, elements.unlockSubmitBtn);
        }

        console.log('[SafeKey] Application initialized');
    }

    // ─── Theme ─────────────────────────────────────────────────────────────────
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('safekey_theme', theme);
        const btn = document.getElementById('themeToggleBtn');
        const btnMobile = document.getElementById('themeToggleBtnMobile');
        if (btn) btn.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
        if (btnMobile) btnMobile.innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
    }

    function toggleTheme() {
        const current = localStorage.getItem('safekey_theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }

    function cacheElements() {
        elements.landingView = document.getElementById('landingView');
        elements.setupView = document.getElementById('setupView');
        elements.unlockView = document.getElementById('unlockView');
        elements.vaultView = document.getElementById('vaultView');
        elements.healthView = document.getElementById('healthView');
        elements.analyzerView = document.getElementById('analyzerView');
        elements.generatorView = document.getElementById('generatorView');
        elements.sidebar = document.getElementById('sidebar');
        elements.bottomNav = document.getElementById('bottomNav');
        elements.mobileHeader = document.getElementById('mobileHeader');
        elements.mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
        elements.mobileLockBtn = document.getElementById('mobileLockBtn');

        elements.setupForm = document.getElementById('setupForm');
        elements.unlockForm = document.getElementById('unlockForm');
        elements.credentialForm = document.getElementById('credentialForm');
        elements.changeMasterKeyForm = document.getElementById('changeMasterKeyForm');

        elements.masterKeySetup = document.getElementById('masterKeySetup');
        elements.usernameSetup = document.getElementById('usernameSetup');
        elements.masterKeyConfirm = document.getElementById('masterKeyConfirm');
        elements.usernameUnlock = document.getElementById('usernameUnlock');
        elements.masterKeyUnlock = document.getElementById('masterKeyUnlock');
        elements.vaultSearch = document.getElementById('vaultSearch');
        elements.analyzerInput = document.getElementById('analyzerInput');

        elements.passwordLength = document.getElementById('passwordLength');
        elements.lengthValue = document.getElementById('lengthValue');
        elements.generatedPassword = document.getElementById('generatedPassword');
        elements.includeUppercase = document.getElementById('includeUppercase');
        elements.includeLowercase = document.getElementById('includeLowercase');
        elements.includeNumbers = document.getElementById('includeNumbers');
        elements.includeSymbols = document.getElementById('includeSymbols');
        elements.keywordInput = document.getElementById('keywordInput');

        elements.lockBtn = document.getElementById('lockBtn');
        elements.settingsBtn = document.getElementById('settingsBtn');
        elements.addCredentialBtn = document.getElementById('addCredentialBtn');
        elements.generateBtn = document.getElementById('generateBtn');
        elements.copyPasswordBtn = document.getElementById('copyPasswordBtn');
        elements.regenerateBtn = document.getElementById('regenerateBtn');
        elements.generateInlineBtn = document.getElementById('generateInlineBtn');
        elements.breachCheckBtn = document.getElementById('breachCheckBtn');
        elements.breachResult = document.getElementById('breachResult');
        elements.analyzerBreachBtn = document.getElementById('analyzerBreachBtn');
        elements.analyzerBreachResult = document.getElementById('analyzerBreachResult');
        elements.exportVaultBtn = document.getElementById('exportVaultBtn');
        elements.importVaultFile = document.getElementById('importVaultFile');

        elements.generateVaultBtn = document.getElementById('generateVaultBtn');
        elements.openVaultBtn = document.getElementById('openVaultBtn');
        elements.backFromSetup = document.getElementById('backFromSetup');
        elements.backFromUnlock = document.getElementById('backFromUnlock');

        elements.credentialModal = document.getElementById('credentialModal');
        elements.closeModal = document.getElementById('closeModal');
        elements.cancelModal = document.getElementById('cancelModal');
        elements.modalTitle = document.getElementById('modalTitle');

        elements.settingsModal = document.getElementById('settingsModal');
        elements.closeSettings = document.getElementById('closeSettings');

        elements.credentialsList = document.getElementById('credentialsList');
        elements.emptyVault = document.getElementById('emptyVault');
        elements.unlockError       = document.getElementById('unlockError');
        elements.lockoutMessage     = document.getElementById('lockoutMessage');
        elements.unlockSubmitBtn    = document.getElementById('unlockSubmitBtn');
        elements.setupStrength      = document.getElementById('setupStrength');
        elements.newMasterKeyStrength = document.getElementById('newMasterKeyStrength');
        elements.toast              = document.getElementById('toast');
        elements.healthContent      = document.getElementById('healthContent');
        elements.categoryFilter     = document.getElementById('categoryFilter');
        elements.kdfBadge           = document.getElementById('kdfBadge');
        elements.toast = document.getElementById('toast');
        elements.healthContent = document.getElementById('healthContent');

        // Notes elements
        elements.notesView = document.getElementById('notesView');
        elements.notesList = document.getElementById('notesList');
        elements.emptyNotes = document.getElementById('emptyNotes');
        elements.addNoteBtn = document.getElementById('addNoteBtn');
        elements.noteModal = document.getElementById('noteModal');
        elements.noteForm = document.getElementById('noteForm');
        elements.noteId = document.getElementById('noteId');
        elements.noteTitle = document.getElementById('noteTitle');
        elements.noteContent = document.getElementById('noteContent');
        elements.closeNoteModal = document.getElementById('closeNoteModal');
        elements.cancelNoteModal = document.getElementById('cancelNoteModal');
        elements.noteModalTitle = document.getElementById('noteModalTitle');

        // Recovery key elements
        elements.recoveryKeyModal = document.getElementById('recoveryKeyModal');
        elements.recoveryKeyDisplay = document.getElementById('recoveryKeyDisplay');
        elements.copyRecoveryKey = document.getElementById('copyRecoveryKey');
        elements.confirmRecoveryKey = document.getElementById('confirmRecoveryKey');
        elements.useRecoveryKeyBtn = document.getElementById('useRecoveryKeyBtn');
        elements.recoveryUnlockModal = document.getElementById('recoveryUnlockModal');
        elements.closeRecoveryUnlock = document.getElementById('closeRecoveryUnlock');
        elements.recoveryUnlockForm = document.getElementById('recoveryUnlockForm');
        elements.recoveryKeyInput = document.getElementById('recoveryKeyInput');

        // QR transfer elements
        elements.showQrBtn = document.getElementById('showQrBtn');
        elements.scanQrBtn = document.getElementById('scanQrBtn');
        elements.importCsvFile = document.getElementById('importCsvFile');
        elements.vaultSort = document.getElementById('vaultSort');
        elements.wipeVaultBtn = document.getElementById('wipeVaultBtn');
        elements.wipeConfirmModal = document.getElementById('wipeConfirmModal');
        elements.wipeConfirmInput = document.getElementById('wipeConfirmInput');
        elements.wipeConfirmBtn = document.getElementById('wipeConfirmBtn');
        elements.closeWipeConfirm = document.getElementById('closeWipeConfirm');
        elements.themeToggleBtn = document.getElementById('themeToggleBtn');
        elements.themeToggleBtnMobile = document.getElementById('themeToggleBtnMobile');
        elements.savePresetBtn = document.getElementById('savePresetBtn');
        elements.presetsList = document.getElementById('presetsList');
        elements.attachmentInput = document.getElementById('attachmentInput');
        elements.attachmentsList = document.getElementById('attachmentsList');
        elements.credentialTags = document.getElementById('credentialTags');
        elements.credentialFavorite = document.getElementById('credentialFavorite');
        elements.qrDisplayModal = document.getElementById('qrDisplayModal');
        elements.closeQrDisplay = document.getElementById('closeQrDisplay');
        elements.qrCanvas = document.getElementById('qrCanvas');
        elements.qrPagination = document.getElementById('qrPagination');
        elements.qrPrev = document.getElementById('qrPrev');
        elements.qrNext = document.getElementById('qrNext');
        elements.qrPageInfo = document.getElementById('qrPageInfo');
        elements.qrDisplayTitle = document.getElementById('qrDisplayTitle');
        elements.qrScanModal = document.getElementById('qrScanModal');
        elements.closeQrScan = document.getElementById('closeQrScan');
        elements.qrVideo = document.getElementById('qrVideo');
        elements.qrScanStatus = document.getElementById('qrScanStatus');
        elements.qrScanProgress = document.getElementById('qrScanProgress');
        elements.qrProgressBar = document.getElementById('qrProgressBar');
        elements.qrChunkInfo = document.getElementById('qrChunkInfo');
        elements.qrScanFallback = document.getElementById('qrScanFallback');
        elements.qrScanContainer = document.getElementById('qrScanContainer');
    }

    function bindEvents() {
        elements.generateVaultBtn.addEventListener('click', () => showView('setup'));
        elements.openVaultBtn.addEventListener('click', () => showView('unlock'));
        elements.backFromSetup.addEventListener('click', () => showView('landing'));
        elements.backFromUnlock.addEventListener('click', () => showView('landing'));

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (Session.isUnlocked()) navigateTo(view);
            });
        });

        elements.setupForm.addEventListener('submit', handleSetup);
        elements.masterKeySetup.addEventListener('input', () => {
            const analysis = Analyzer.analyze(elements.masterKeySetup.value);
            elements.setupStrength.style.setProperty('--strength', analysis.strength + '%');
        });

        elements.unlockForm.addEventListener('submit', handleUnlock);
        elements.lockBtn.addEventListener('click', () => Session.lock());
        elements.mobileLockBtn.addEventListener('click', () => Session.lock());
        elements.mobileSettingsBtn.addEventListener('click', openSettingsModal);

        elements.settingsBtn.addEventListener('click', openSettingsModal);
        elements.closeSettings.addEventListener('click', closeSettingsModal);
        elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) closeSettingsModal();
        });
        elements.changeMasterKeyForm.addEventListener('submit', handleChangeMasterKey);
        document.getElementById('newMasterKey').addEventListener('input', () => {
            const analysis = Analyzer.analyze(document.getElementById('newMasterKey').value);
            elements.newMasterKeyStrength.style.setProperty('--strength', analysis.strength + '%');
        });
        elements.exportVaultBtn.addEventListener('click', handleExportVault);
        elements.importVaultFile.addEventListener('change', handleImportVault);
        if (elements.importCsvFile) elements.importCsvFile.addEventListener('change', handleImportCsv);

        // Theme toggle
        if (elements.themeToggleBtn) elements.themeToggleBtn.addEventListener('click', toggleTheme);
        if (elements.themeToggleBtnMobile) elements.themeToggleBtnMobile.addEventListener('click', toggleTheme);

        // Sort
        if (elements.vaultSort) elements.vaultSort.addEventListener('change', (e) => {
            currentSort = e.target.value;
            localStorage.setItem('safekey_sort', currentSort);
            loadCredentials();
        });

        // Vault wipe
        if (elements.wipeVaultBtn) elements.wipeVaultBtn.addEventListener('click', () => {
            elements.wipeConfirmModal.classList.remove('hidden');
            elements.wipeConfirmInput.value = '';
            elements.wipeConfirmBtn.disabled = true;
        });
        if (elements.wipeConfirmInput) elements.wipeConfirmInput.addEventListener('input', () => {
            elements.wipeConfirmBtn.disabled = elements.wipeConfirmInput.value !== 'DELETE';
        });
        if (elements.wipeConfirmBtn) elements.wipeConfirmBtn.addEventListener('click', handleWipeVault);
        if (elements.closeWipeConfirm) elements.closeWipeConfirm.addEventListener('click', () => {
            elements.wipeConfirmModal.classList.add('hidden');
        });

        // Generator presets
        if (elements.savePresetBtn) elements.savePresetBtn.addEventListener('click', handleSavePreset);

        // Attachment input
        if (elements.attachmentInput) elements.attachmentInput.addEventListener('change', handleAttachmentUpload);

        // QR transfer events
        elements.showQrBtn.addEventListener('click', handleShowQr);
        elements.scanQrBtn.addEventListener('click', handleScanQr);
        elements.closeQrDisplay.addEventListener('click', () => {
            elements.qrDisplayModal.classList.add('hidden');
        });
        elements.closeQrScan.addEventListener('click', () => {
            stopScanner();
            elements.qrScanModal.classList.add('hidden');
        });
        elements.qrDisplayModal.addEventListener('click', (e) => {
            if (e.target === elements.qrDisplayModal) elements.qrDisplayModal.classList.add('hidden');
        });
        elements.qrScanModal.addEventListener('click', (e) => {
            if (e.target === elements.qrScanModal) {
                stopScanner();
                elements.qrScanModal.classList.add('hidden');
            }
        });
        elements.qrPrev.addEventListener('click', () => renderQrCode(qrCurrentPage - 1));
        elements.qrNext.addEventListener('click', () => renderQrCode(qrCurrentPage + 1));

        elements.addCredentialBtn.addEventListener('click', () => openCredentialModal());
        elements.vaultSearch.addEventListener('input', handleSearch);


        elements.credentialForm.addEventListener('submit', handleCredentialSubmit);
        elements.closeModal.addEventListener('click', closeCredentialModal);
        elements.cancelModal.addEventListener('click', closeCredentialModal);
        elements.credentialModal.addEventListener('click', (e) => {
            if (e.target === elements.credentialModal) closeCredentialModal();
        });
        elements.generateInlineBtn.addEventListener('click', () => {
            document.getElementById('credentialPassword').value = Generator.generate({ length: 16 }).password;
            elements.breachResult.classList.add('hidden');
        });
        elements.breachCheckBtn.addEventListener('click', handleBreachCheck);
        elements.analyzerBreachBtn.addEventListener('click', handleAnalyzerBreachCheck);

        const eyeOpen  = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeClosed = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.innerHTML = eyeOpen;
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.target);
                if (target.type === 'password') {
                    target.type = 'text';
                    btn.innerHTML = ICONS.eyeOff;
                } else {
                    target.type = 'password';
                    btn.innerHTML = ICONS.eye;
                }
            });
        });

        elements.analyzerInput.addEventListener('input', handleAnalyzerInput);

        elements.passwordLength.addEventListener('input', () => {
            elements.lengthValue.textContent = elements.passwordLength.value;
        });
        document.getElementById('readableWordCount').addEventListener('input', e => {
            document.getElementById('readableWordCountValue').textContent = e.target.value;
        });
        document.getElementById('passphraseWordCount').addEventListener('input', e => {
            document.getElementById('passphraseWordCountValue').textContent = e.target.value;
        });
        elements.generateBtn.addEventListener('click', handleGenerate);
        elements.regenerateBtn.addEventListener('click', handleGenerate);
        elements.copyPasswordBtn.addEventListener('click', handleCopyPassword);

        // Generator mode tabs
        document.querySelectorAll('.gen-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gen-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('randomOptions').classList.toggle('hidden', btn.dataset.mode !== 'random');
                document.getElementById('readableOptions').classList.toggle('hidden', btn.dataset.mode !== 'readable');
                document.getElementById('passphraseOptions').classList.toggle('hidden', btn.dataset.mode !== 'passphrase');
            });
        });

        // Optional field toggles in credential modal
        document.querySelectorAll('.opt-toggle input[type="checkbox"]').forEach(chk => {
            chk.addEventListener('change', () => {
                const fieldId = 'field' + chk.id.replace('chk', '');
                const fieldEl = document.getElementById(fieldId);
                if (fieldEl) fieldEl.classList.toggle('hidden', !chk.checked);
            });
        });

        // Note events
        elements.addNoteBtn.addEventListener('click', () => openNoteModal());
        elements.noteForm.addEventListener('submit', handleNoteSubmit);
        elements.closeNoteModal.addEventListener('click', closeNoteModalFn);
        elements.cancelNoteModal.addEventListener('click', closeNoteModalFn);
        elements.noteModal.addEventListener('click', (e) => {
            if (e.target === elements.noteModal) closeNoteModalFn();
        });

        // Recovery key events
        elements.copyRecoveryKey.addEventListener('click', () => {
            const key = elements.recoveryKeyDisplay.textContent;
            Vault.copyToClipboard(key);
            showToast('Recovery key copied', 'success');
        });
        elements.confirmRecoveryKey.addEventListener('click', () => {
            elements.recoveryKeyModal.classList.add('hidden');
            navigateTo('vault');
            showToast('Vault created successfully!', 'success');
        });
        elements.useRecoveryKeyBtn.addEventListener('click', () => {
            elements.recoveryUnlockModal.classList.remove('hidden');
            elements.recoveryKeyInput.focus();
        });
        elements.closeRecoveryUnlock.addEventListener('click', () => {
            elements.recoveryUnlockModal.classList.add('hidden');
            elements.recoveryKeyInput.value = '';
        });
        elements.recoveryUnlockModal.addEventListener('click', (e) => {
            if (e.target === elements.recoveryUnlockModal) {
                elements.recoveryUnlockModal.classList.add('hidden');
                elements.recoveryKeyInput.value = '';
            }
        });
        elements.recoveryUnlockForm.addEventListener('submit', handleRecoveryUnlock);

        document.addEventListener('keydown', handleGlobalKeydown);
    }

    function handleGlobalKeydown(e) {
        // Escape closes any open modal
        if (e.key === 'Escape') {
            if (!elements.credentialModal.classList.contains('hidden')) closeCredentialModal();
            if (!elements.settingsModal.classList.contains('hidden')) closeSettingsModal();
            if (!elements.noteModal.classList.contains('hidden')) closeNoteModalFn();
            if (!elements.recoveryUnlockModal.classList.contains('hidden')) {
                elements.recoveryUnlockModal.classList.add('hidden');
                elements.recoveryKeyInput.value = '';
            }
            if (!elements.qrDisplayModal.classList.contains('hidden')) {
                elements.qrDisplayModal.classList.add('hidden');
            }
            if (!elements.qrScanModal.classList.contains('hidden')) {
                stopScanner();
                elements.qrScanModal.classList.add('hidden');
            }
            // Do NOT allow Escape to dismiss recoveryKeyModal (must click "I've Saved It")
            return;
        }

        // Don't trigger shortcuts if typing in an input
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (!Session.isUnlocked()) return;

        if (e.key === 'n' && currentView === 'vault') {
            e.preventDefault();
            openCredentialModal();
        } else if (e.key === '/' && currentView === 'vault') {
            e.preventDefault();
            elements.vaultSearch.focus();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            Session.lock();
        } else if (e.key === '1') {
            e.preventDefault();
            navigateTo('vault');
        } else if (e.key === '2') {
            e.preventDefault();
            navigateTo('health');
        } else if (e.key === '3') {
            e.preventDefault();
            navigateTo('analyzer');
        } else if (e.key === '4') {
            e.preventDefault();
            navigateTo('generator');
        } else if (e.key === '5') {
            e.preventDefault();
            navigateTo('notes');
        }
    }

    function showView(viewName) {
        // Clear TOTP updater when leaving vault
        if (viewName !== 'vault' && totpInterval) {
            clearInterval(totpInterval);
            totpInterval = null;
        }

        [elements.landingView, elements.setupView, elements.unlockView, elements.vaultView,
            elements.healthView, elements.analyzerView, elements.generatorView, elements.notesView].forEach(view => {
                view.classList.add('hidden');
            });

        const isAuthView = ['landing', 'setup', 'unlock'].includes(viewName);
        if (isAuthView) {
            elements.sidebar.classList.add('hidden');
            elements.bottomNav.classList.add('hidden');
            elements.mobileHeader.classList.add('hidden');
        } else {
            elements.sidebar.classList.remove('hidden');
            elements.bottomNav.classList.remove('hidden');
            elements.mobileHeader.classList.remove('hidden');
        }

        const view = document.getElementById(viewName + 'View');
        if (view) {
            view.classList.remove('hidden');
            currentView = viewName;
        }
    }

    function navigateTo(viewName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        showView(viewName);
        if (viewName === 'vault') loadCredentials();
        if (viewName === 'health') loadHealthView();
        if (viewName === 'notes') loadNotes();
        if (viewName === 'generator') renderPresets();
    }

    async function handleSetup(e) {
        e.preventDefault();
        const username = elements.usernameSetup.value.trim();
        const password = elements.masterKeySetup.value;
        const confirm = elements.masterKeyConfirm.value;

        if (!username) return showToast('Username is required', 'error');
        if (password !== confirm) return showToast('Passwords do not match', 'error');
        if (password.length < 8) return showToast('Master key must be at least 8 characters', 'error');

        try {
            const result = await Vault.initialize(username, password);
            if (result.success) {
                Session.start(result.key, result.salt);
                if (result.recoveryKey) {
                    // Show recovery key modal — user must acknowledge before proceeding
                    elements.recoveryKeyDisplay.textContent = result.recoveryKey;
                    elements.recoveryKeyModal.classList.remove('hidden');
                } else {
                    navigateTo('vault');
                    showToast('Vault created successfully!', 'success');
                }
            } else {
                showToast('Failed to create vault', 'error');
            }
        } catch (error) {
            console.error('[App] Setup error:', error);
            showToast('An error occurred', 'error');
        }
    }

    async function handleRecoveryUnlock(e) {
        e.preventDefault();
        const recoveryKey = elements.recoveryKeyInput.value.trim().toUpperCase();
        if (!recoveryKey) return showToast('Recovery key is required', 'error');

        try {
            const result = await Vault.recoverWithKey(recoveryKey);
            if (result.success) {
                Session.start(result.key, result.salt);
                elements.recoveryUnlockModal.classList.add('hidden');
                elements.recoveryKeyInput.value = '';
                navigateTo('vault');
                showToast('Vault recovered successfully', 'success');
            } else {
                showToast(result.error || 'Invalid recovery key', 'error');
            }
        } catch (error) {
            console.error('[App] Recovery error:', error);
            showToast('Recovery failed', 'error');
        }
    }

    async function handleUnlock(e) {
        e.preventDefault();

        // Block submission during active lockout
        if (Lockout.isLocked()) {
            Lockout.startCountdown(elements.lockoutMessage, elements.unlockSubmitBtn);
            return;
        }

        const username = elements.usernameUnlock.value.trim();
        const password = elements.masterKeyUnlock.value;
        // Show loading state while Argon2id hashes (can take ~1s)
        elements.unlockSubmitBtn.textContent = 'Unlocking…';
        elements.unlockSubmitBtn.disabled = true;

        if (!username) return showToast('Username is required', 'error');

        const storedUsername = Vault.getUsername();
        if (storedUsername && username !== storedUsername) {
            elements.unlockError.classList.remove('hidden');
            elements.masterKeyUnlock.value = '';
            return;
        }

        try {
            const result = await Vault.unlock(password);
            if (result.success) {
                Lockout.reset();
                Session.start(result.key, result.salt);
                elements.usernameUnlock.value = '';
                elements.masterKeyUnlock.value = '';
                elements.unlockError.classList.add('hidden');
                elements.lockoutMessage.classList.add('hidden');

                // If vault was PBKDF2, show one-time upgrade toast
                if (result.kdf === Crypto.KDF.PBKDF2) {
                    navigateTo('vault');
                    showToast('Vault unlocked (legacy PBKDF2). Change your master key in Settings to upgrade to Argon2id.', 'warning');
                } else {
                    navigateTo('vault');
                    showToast('Vault unlocked', 'success');
                }
            } else {
                // Record failure and start countdown if now locked out
                const lockMs = Lockout.recordFailure();
                elements.masterKeyUnlock.value = '';
                elements.unlockError.classList.remove('hidden');

                const attempts = Lockout.attemptCount();
                elements.unlockError.textContent =
                    lockMs > 0
                        ? `Incorrect master key. Too many attempts — please wait.`
                        : `Incorrect master key or no vault found. (${attempts} failed attempt${attempts !== 1 ? 's' : ''})`;

                if (lockMs > 0) {
                    Lockout.startCountdown(elements.lockoutMessage, elements.unlockSubmitBtn);
                }
            }
        } catch {
            elements.unlockError.classList.remove('hidden');
            elements.unlockError.textContent = 'An error occurred. Please try again.';
        } finally {
            // Re-enable button only if not in a lockout
            if (!Lockout.isLocked()) {
                elements.unlockSubmitBtn.textContent = 'Unlock';
                elements.unlockSubmitBtn.disabled = false;
            }
        }
    }

    function handleVaultLock() {
        showView('landing');
        showToast('Vault locked', 'info');
    }

    // ─── Vault view ───────────────────────────────────────────────────────────

    async function loadCredentials() {
        try {
            let credentials = await Vault.getAll();
            if (activeCategory !== 'all') {
                credentials = credentials.filter(c => c.category === activeCategory);
            }
            const query = elements.vaultSearch.value.trim();
            if (query) {
                const lq = query.toLowerCase();
                credentials = credentials.filter(c =>
                    c.site.toLowerCase().includes(lq) ||
                    c.username.toLowerCase().includes(lq) ||
                    (c.url || '').toLowerCase().includes(lq) ||
                    (c.tags || []).some(t => t.toLowerCase().includes(lq))
                );
            }

            // Sort
            const [sortKey, sortDir] = currentSort.split('-');
            credentials.sort((a, b) => {
                let cmp = 0;
                if (sortKey === 'name') cmp = (a.site || '').localeCompare(b.site || '');
                else if (sortKey === 'date') cmp = (b.updatedAt || 0) - (a.updatedAt || 0);
                else if (sortKey === 'created') cmp = (b.createdAt || 0) - (a.createdAt || 0);
                else if (sortKey === 'strength') cmp = Analyzer.analyze(a.password).strength - Analyzer.analyze(b.password).strength;
                return sortDir === 'desc' ? -cmp : cmp;
            });

            // Favorites first
            credentials.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));

            // Set sort dropdown to current value
            if (elements.vaultSort) elements.vaultSort.value = currentSort;

            renderCredentials(credentials);
        } catch (error) {
            console.error('[App] Failed to load credentials:', error);
        }
    }

    function renderCredentials(credentials) {
        if (credentials.length === 0) {
            elements.credentialsList.innerHTML = '';
            elements.emptyVault.classList.remove('hidden');
            return;
        }
        elements.emptyVault.classList.add('hidden');

        elements.credentialsList.innerHTML = credentials.map(cred => {
            const age = formatAge(cred.updatedAt);
            const ageClass = isOld(cred.updatedAt) ? ' old' : '';
            const categoryBadge = cred.category
                ? `<span class="category-badge">${escapeHtml(cred.category)}</span>`
                : '';
            const urlLink = cred.url && isSafeUrl(cred.url)
                ? `<a class="credential-url" href="${escapeHtml(cred.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(cred.url)}">${ICONS.externalLink} Open</a>`
                : '';

            // Tags
            const tagsBadges = (cred.tags || []).map(t =>
                `<span class="tag-badge" style="--tag-color:${getTagColor(t)}">${escapeHtml(t)}</span>`
            ).join('');

            // Favorite star
            const favStar = cred.favorite
                ? `<button class="icon-btn fav-btn fav-active" title="Unfavorite" data-id="${cred.id}">${ICONS.starFilled}</button>`
                : `<button class="icon-btn fav-btn" title="Favorite" data-id="${cred.id}">${ICONS.star}</button>`;

            // Favicon or initials
            let iconContent;
            if (cred.url && isSafeUrl(cred.url)) {
                try {
                    const domain = new URL(cred.url).hostname;
                    iconContent = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" width="24" height="24" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" style="border-radius:4px"><span class="credential-initials" style="display:none">${getInitials(cred.site)}</span>`;
                } catch {
                    iconContent = getInitials(cred.site);
                }
            } else {
                iconContent = getInitials(cred.site);
            }

            // Password history badge
            const historyBadge = (cred.passwordHistory && cred.passwordHistory.length > 0)
                ? `<span class="history-badge" title="${cred.passwordHistory.length} previous password(s)">${ICONS.history || ''} ${cred.passwordHistory.length}</span>`
                : '';

            // TOTP display
            const totpSection = (cred.totp && TOTP.isValidSecret(cred.totp))
                ? `<div class="totp-display" data-secret="${escapeHtml(cred.totp)}" data-id="${cred.id}">
                    <span class="totp-code">------</span>
                    <div class="totp-timer-ring">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="var(--border)" stroke-width="2"/>
                            <circle class="totp-countdown" cx="12" cy="12" r="10" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="62.83" stroke-dashoffset="0" transform="rotate(-90 12 12)"/>
                        </svg>
                        <span class="totp-seconds">30</span>
                    </div>
                    <button class="icon-btn copy-totp-btn" title="Copy Code" data-id="${cred.id}">${ICONS.copy}</button>
                </div>`
                : '';

            return `
            <div class="credential-card${cred.favorite ? ' card-favorite' : ''}" data-id="${cred.id}">
                <div class="credential-icon">${iconContent}</div>
                <div class="credential-info">
                    <div class="credential-site-row">
                        <span class="credential-site">${escapeHtml(cred.site || cred.username || cred.url || 'Untitled')}</span>
                        ${urlLink}
                    </div>
                    ${cred.site && cred.username ? `<div class="credential-username">${escapeHtml(cred.username)}</div>` : ''}
                    <div class="credential-meta">
                        ${categoryBadge}
                        ${tagsBadges}
                        ${historyBadge}
                        <span class="credential-age${ageClass}">${age}</span>
                    </div>
                    <div class="credential-password">
                        <span class="password-hidden">••••••••</span>
                    </div>
                    ${totpSection}
                </div>
                <div class="credential-actions">
                    ${favStar}
                    <button class="icon-btn reveal-btn" title="Reveal Password" data-id="${cred.id}">${ICONS.eye}</button>
                    <button class="icon-btn copy-btn" title="Copy Password" data-id="${cred.id}">${ICONS.copy}</button>
                    <button class="icon-btn edit-btn" title="Edit" data-id="${cred.id}">${ICONS.edit}</button>
                    <button class="icon-btn delete-btn" title="Delete" data-id="${cred.id}">${ICONS.trash}</button>
                </div>
            </div>`;
        }).join('');

        bindCredentialEvents();
        startTotpUpdater();
    }

    function startTotpUpdater() {
        if (totpInterval) clearInterval(totpInterval);
        updateTotpCodes();
        totpInterval = setInterval(updateTotpCodes, 1000);
    }

    async function updateTotpCodes() {
        const displays = document.querySelectorAll('.totp-display');
        if (displays.length === 0) {
            if (totpInterval) { clearInterval(totpInterval); totpInterval = null; }
            return;
        }

        const remaining = TOTP.getRemaining();
        const progress = remaining / 30;

        for (const display of displays) {
            const secret = display.dataset.secret;
            try {
                const code = await TOTP.generate(secret);
                display.querySelector('.totp-code').textContent = code.substring(0, 3) + ' ' + code.substring(3);
                const countdown = display.querySelector('.totp-countdown');
                if (countdown) countdown.style.strokeDashoffset = (62.83 * (1 - progress)).toFixed(2);
                const secs = display.querySelector('.totp-seconds');
                if (secs) secs.textContent = remaining;
            } catch {
                display.querySelector('.totp-code').textContent = 'Invalid';
            }
        }
    }

    function bindCredentialEvents() {
        document.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.credential-card');
                const passwordEl = card.querySelector('.credential-password');
                const cred = await Vault.getById(btn.dataset.id);
                if (passwordEl.querySelector('.password-visible')) {
                    passwordEl.innerHTML = '<span class="password-hidden">••••••••</span>';
                    btn.innerHTML = ICONS.eye;
                } else {
                    const span = document.createElement('span');
                    span.className = 'password-visible';
                    span.textContent = cred.password;
                    passwordEl.innerHTML = '';
                    passwordEl.appendChild(span);
                    btn.innerHTML = ICONS.eyeOff;
                }
            });
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cred = await Vault.getById(btn.dataset.id);
                const success = await Vault.copyToClipboard(cred.password);
                if (success) showToast('Password copied (auto-clears in 30s)', 'success');
                else showToast('Failed to copy', 'error');
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cred = await Vault.getById(btn.dataset.id);
                openCredentialModal(cred);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this credential?')) {
                    await Vault.remove(btn.dataset.id);
                    loadCredentials();
                    showToast('Credential deleted', 'success');
                }
            });
        });

        document.querySelectorAll('.copy-totp-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const display = btn.closest('.totp-display');
                const code = display.querySelector('.totp-code').textContent.replace(/\s/g, '');
                if (code && code !== 'Invalid' && code !== '------') {
                    await Vault.copyToClipboard(code);
                    showToast('2FA code copied', 'success');
                }
            });
        });

        // Favorite toggle
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cred = await Vault.getById(btn.dataset.id);
                if (cred) {
                    await Vault.update(btn.dataset.id, { favorite: !cred.favorite });
                    loadCredentials();
                }
            });
        });
    }

    async function handleSearch() {
        loadCredentials();
    }

    // ─── Credential Modal ─────────────────────────────────────────────────────

    function openCredentialModal(credential = null) {
        editingCredentialId = credential?.id || null;
        elements.modalTitle.textContent = credential ? 'Edit Credential' : 'Add Credential';
        document.getElementById('credentialId').value    = credential?.id       || '';
        document.getElementById('credentialPassword').value = credential?.password || '';

        // Set optional fields and toggle their visibility
        const optionals = [
            { chk: 'chkSite',     field: 'fieldSite',     input: 'credentialSite',     val: credential?.site     || '' },
            { chk: 'chkUsername', field: 'fieldUsername',  input: 'credentialUsername', val: credential?.username || '' },
            { chk: 'chkUrl',      field: 'fieldUrl',       input: 'credentialUrl',      val: credential?.url      || '' },
            { chk: 'chkCategory', field: 'fieldCategory',  input: 'credentialCategory', val: credential?.category || '' },
            { chk: 'chkNotes',    field: 'fieldNotes',     input: 'credentialNotes',    val: credential?.notes    || '' },
            { chk: 'chkTotp',     field: 'fieldTotp',      input: 'credentialTotp',     val: credential?.totp     || '' },
            { chk: 'chkTags',     field: 'fieldTags',      input: 'credentialTags',     val: (credential?.tags || []).join(', ') },
        ];

        optionals.forEach(({ chk, field, input, val }) => {
            const hasValue = !!val;
            document.getElementById(chk).checked = hasValue;
            document.getElementById(field).classList.toggle('hidden', !hasValue);
            document.getElementById(input).value = val;
        });

        // Favorite checkbox
        const favChk = document.getElementById('credentialFavorite');
        if (favChk) favChk.checked = credential?.favorite || false;

        // Attachments section — only show when editing existing credential
        const attSection = document.getElementById('attachmentsSection');
        if (attSection) {
            if (credential?.id) {
                attSection.style.display = '';
                loadAttachmentsList(credential.id);
            } else {
                attSection.style.display = 'none';
            }
        }

        // Password history section
        const existingHistory = document.getElementById('passwordHistorySection');
        if (existingHistory) existingHistory.remove();

        if (credential && credential.passwordHistory && credential.passwordHistory.length > 0) {
            const historySection = document.createElement('div');
            historySection.id = 'passwordHistorySection';
            historySection.className = 'password-history-section';
            historySection.innerHTML = `
                <button type="button" class="password-history-toggle" id="togglePasswordHistory">
                    ${ICONS.history} Password History (${credential.passwordHistory.length})
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="chevron-icon"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="password-history-list hidden" id="passwordHistoryList">
                    ${credential.passwordHistory.slice().reverse().map(h => `
                        <div class="password-history-item">
                            <code class="password-history-value">${escapeHtml(h.password)}</code>
                            <span class="password-history-date">${new Date(h.changedAt).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            elements.credentialForm.querySelector('.modal-actions').before(historySection);

            document.getElementById('togglePasswordHistory').addEventListener('click', () => {
                const list = document.getElementById('passwordHistoryList');
                list.classList.toggle('hidden');
                const chevron = document.querySelector('#togglePasswordHistory .chevron-icon');
                chevron.style.transform = list.classList.contains('hidden') ? '' : 'rotate(180deg)';
            });
        }

        elements.breachResult.classList.add('hidden');
        elements.credentialModal.classList.remove('hidden');
        document.getElementById('credentialPassword').focus();
    }

    function closeCredentialModal() {
        elements.credentialModal.classList.add('hidden');
        elements.credentialForm.reset();
        elements.breachResult.classList.add('hidden');
        editingCredentialId = null;
    }

    async function handleCredentialSubmit(e) {
        e.preventDefault();
        const totpRaw = document.getElementById('credentialTotp').value.trim();
        let totpSecret = totpRaw;
        // Parse otpauth:// URI if provided
        if (totpRaw.startsWith('otpauth://')) {
            const parsed = TOTP.parseUri(totpRaw);
            if (parsed && parsed.secret) totpSecret = parsed.secret;
        }

        const credential = {
            site: document.getElementById('credentialSite').value,
            url: document.getElementById('credentialUrl').value,
            category: document.getElementById('credentialCategory').value,
            tags: (document.getElementById('credentialTags').value || '').split(',').map(t => t.trim()).filter(Boolean),
            username: document.getElementById('credentialUsername').value,
            password: document.getElementById('credentialPassword').value,
            notes: document.getElementById('credentialNotes').value,
            totp: totpSecret,
            favorite: document.getElementById('credentialFavorite') ? document.getElementById('credentialFavorite').checked : false
        };

        // Duplicate password detection
        const dupes = await findDuplicatePassword(credential.password, editingCredentialId);
        if (dupes.length > 0) {
            const sites = dupes.map(c => c.site).join(', ');
            showToast(`Password reused on: ${sites}`, 'warning');
            // Don't block — just warn
        }

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

    async function findDuplicatePassword(password, excludeId = null) {
        if (!password) return [];
        const all = await Vault.getAll();
        return all.filter(c => c.password === password && c.id !== excludeId);
    }

    // ─── Breach Check (HIBP k-anonymity) ─────────────────────────────────────

    async function sha1Hex(text) {
        const buffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
    }

    async function checkBreach(password, btn, resultEl) {
        if (!password) {
            showToast('Enter a password to check', 'warning');
            return;
        }

        btn.innerHTML = ICONS.search + ' Checking...';
        btn.disabled = true;
        resultEl.classList.add('hidden');

        try {
            const hash = await sha1Hex(password);
            const prefix = hash.substring(0, 5);
            const suffix = hash.substring(5);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            let response;
            try {
                response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { signal: controller.signal });
            } finally {
                clearTimeout(timeoutId);
            }
            if (!response.ok) throw new Error('API error');

            const text = await response.text();
            let count = 0;
            for (const line of text.split('\n')) {
                const [h, c] = line.split(':');
                if (h.trim() === suffix) {
                    count = parseInt(c.trim());
                    break;
                }
            }

            resultEl.classList.remove('hidden');
            if (count > 0) {
                resultEl.textContent = `Found in ${count.toLocaleString()} breaches`;
                resultEl.className = 'breach-result breach-bad';
            } else {
                resultEl.textContent = 'Not found in known breaches';
                resultEl.className = 'breach-result breach-good';
            }
        } catch {
            resultEl.classList.remove('hidden');
            resultEl.textContent = 'Could not reach breach API';
            resultEl.className = 'breach-result breach-warn';
        } finally {
            btn.innerHTML = ICONS.search + ' Check for data breaches';
            btn.disabled = false;
        }
    }

    function handleBreachCheck() {
        const password = document.getElementById('credentialPassword').value;
        checkBreach(password, elements.breachCheckBtn, elements.breachResult);
    }

    function handleAnalyzerBreachCheck() {
        const password = elements.analyzerInput.value;
        checkBreach(password, elements.analyzerBreachBtn, elements.analyzerBreachResult);
    }

    // ─── Health View ──────────────────────────────────────────────────────────

    // Stores last breach scan results so re-visiting Health tab shows them
    let _lastBreachResults = null;
    function isAging(timestamp) {
        if (!timestamp) return false;
        const age = Date.now() - timestamp;
        return age > 60 * 86400000 && age <= 90 * 86400000;
    }

    async function loadHealthView() {
        elements.healthContent.innerHTML = '<p style="color:var(--text-muted)">Analyzing vault...</p>';

        const all = await Vault.getAll();
        if (all.length === 0) {
            elements.healthContent.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon"></span>
                    <h2>No credentials yet</h2>
                    <p>Add passwords to your vault to see health analysis</p>
                </div>`;
            return;
        }

        // Categorize issues
        const weak = all.filter(c => Analyzer.analyze(c.password).strength < 40);
        const old = all.filter(c => isOld(c.updatedAt));
        const aging = all.filter(c => isAging(c.updatedAt));

        // Detect reused passwords
        const passMap = {};
        all.forEach(c => {
            if (!passMap[c.password]) passMap[c.password] = [];
            passMap[c.password].push(c);
        });
        const reused = all.filter(c => passMap[c.password].length > 1);

        // Breached credentials from last scan (null = not scanned yet)
        const breached = _lastBreachResults
            ? all.filter(c => (_lastBreachResults[c.password] || 0) > 0)
            : null;

        const breachedCount = breached ? breached.length : 0;
        const score = Math.max(0, 100
            - (weak.length     * 15)
            - (reused.length   * 10)
            - (old.length      *  5)
            - (breachedCount   * 20)
            - (aging.length    *  3)
        );

        // Breach stat cell varies by scan state
        const breachStatContent = _lastBreachResults === null
            ? `<div class="health-stat" id="breachStatCell">
                   <div class="health-stat-number breach-unscan">?</div>
                   <div class="health-stat-label">Breached</div>
               </div>`
            : `<div class="health-stat ${breachedCount > 0 ? 'danger' : 'good'}" id="breachStatCell">
                   <div class="health-stat-number">${breachedCount}</div>
                   <div class="health-stat-label">Breached</div>
               </div>`;

        elements.healthContent.innerHTML = `
            <div class="health-score-row">
                <div class="health-score-card glass">
                    <div class="health-score-number ${score >= 80 ? 'score-good' : score >= 50 ? 'score-warn' : 'score-bad'}">${score}</div>
                    <div class="health-score-info">
                        <div class="health-score-label">Security Score</div>
                        <div class="health-score-sub">${score >= 80 ? 'Great shape' : score >= 50 ? 'Needs attention' : 'Action required'}</div>
                    </div>
                </div>
            </div>

            <!-- Breach Scanner -->
            <div class="breach-scanner glass" id="breachScanner">
                <div class="breach-scanner-header">
                    <div class="breach-scanner-title">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Pwned Password Check
                    </div>
                    <span class="breach-scanner-subtitle">k-Anonymity — only 5 SHA-1 chars leave this device</span>
                </div>
                <div class="breach-scan-progress hidden" id="breachProgress">
                    <div class="breach-progress-bar">
                        <div class="breach-progress-fill" id="breachProgressFill" style="width:0%"></div>
                    </div>
                    <div class="breach-progress-label" id="breachProgressLabel">Scanning…</div>
                </div>
                <div class="breach-scanner-actions">
                    <button class="btn btn-secondary" id="scanBreachBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        ${_lastBreachResults !== null ? 'Re-scan All Passwords' : 'Scan All Passwords'}
                    </button>
                    ${_lastBreachResults !== null ? '<span class="breach-last-scan" id="breachLastScanLabel">Scan complete</span>' : ''}
                </div>
            </div>

            <div class="health-stats">
                <div class="health-stat">
                    <div class="health-stat-number">${all.length}</div>
                    <div class="health-stat-label">Total Passwords</div>
                </div>
                <div class="health-stat ${weak.length > 0 ? 'danger' : 'good'}">
                    <div class="health-stat-number">${weak.length}</div>
                    <div class="health-stat-label">Weak Passwords</div>
                </div>
                <div class="health-stat ${reused.length > 0 ? 'warning' : 'good'}">
                    <div class="health-stat-number">${reused.length}</div>
                    <div class="health-stat-label">Reused Passwords</div>
                </div>
                <div class="health-stat ${old.length > 0 ? 'warning' : 'good'}">
                    <div class="health-stat-number">${old.length}</div>
                    <div class="health-stat-label">Expired (90+ days)</div>
                </div>
                <div class="health-stat ${aging.length > 0 ? 'warning' : 'good'}">
                    <div class="health-stat-number">${aging.length}</div>
                    <div class="health-stat-label">Aging (60-90 days)</div>
                </div>
                ${breachStatContent}
            </div>
            <div class="health-issues" id="healthIssues">
                ${renderHealthGroup('Weak Passwords', weak, 'danger', c => {
                    const s = Analyzer.analyze(c.password).strength;
                    return `Strength: ${s}%`;
                })}
                ${renderHealthGroup('Reused Passwords', reused, 'warning', c => {
                    const n = passMap[c.password].length;
                    return `Shared across ${n} accounts`;
                })}
                ${renderHealthGroup('Expired Passwords (90+ days)', old, 'warning', c => {
                    return `Last changed ${formatAge(c.updatedAt)}`;
                })}
                ${renderHealthGroup('Aging Passwords (60-90 days)', aging, 'warning', c => {
                    return `Last changed ${formatAge(c.updatedAt)}`;
                })}
                ${breached && breached.length > 0 ? renderHealthGroup('Breached Passwords', breached, 'danger', c => {
                    const count = _lastBreachResults[c.password];
                    return `Found in ${count.toLocaleString()} breaches`;
                }) : ''}
            </div>`;

        // Bind scan button
        document.getElementById('scanBreachBtn').addEventListener('click', () => scanVaultBreaches(all));
    }

    /**
     * Checks a single password against HIBP using k-Anonymity.
     * Sends only the first 5 chars of SHA-1 — suffix stays local.
     * @param {string} password
     * @returns {Promise<number>} breach count (0 = not found)
     */
    async function hibpCheckPassword(password) {
        const hash   = await sha1Hex(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 8000);
        let response;
        try {
            response = await fetch(
                `https://api.pwnedpasswords.com/range/${prefix}`,
                { signal: controller.signal }
            );
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) throw new Error(`HIBP API ${response.status}`);

        const text = await response.text();
        for (const line of text.split('\n')) {
            const [h, c] = line.split(':');
            if (h.trim() === suffix) return parseInt(c.trim(), 10);
        }
        return 0;
    }

    /**
     * Scans all vault passwords against HIBP with deduplication + rate limiting.
     * - Same password → single API call, result reused across all matching creds.
     * - 600ms gap between distinct HIBP requests.
     * @param {Array} all - decrypted credentials array
     */
    async function scanVaultBreaches(all) {
        const btn       = document.getElementById('scanBreachBtn');
        const progress  = document.getElementById('breachProgress');
        const fill      = document.getElementById('breachProgressFill');
        const label     = document.getElementById('breachProgressLabel');
        const statCell  = document.getElementById('breachStatCell');

        if (!btn) return;
        btn.disabled    = true;
        btn.innerHTML   = '<span class="scan-spinner"></span> Scanning…';
        progress.classList.remove('hidden');

        // Deduplicate — unique passwords only
        const uniquePasswords = [...new Set(all.map(c => c.password))];
        const results = {};   // password → breach count
        let checked   = 0;
        let networkError = false;

        for (const password of uniquePasswords) {
            checked++;
            const pct = Math.round((checked / uniquePasswords.length) * 100);
            fill.style.width  = pct + '%';
            label.textContent = `Checking ${checked} / ${uniquePasswords.length} unique passwords…`;

            try {
                results[password] = await hibpCheckPassword(password);
            } catch {
                results[password] = -1; // -1 = error / no result
                networkError = true;
            }

            // Rate-limit gap between requests (skip after last)
            if (checked < uniquePasswords.length) {
                await new Promise(r => setTimeout(r, 600));
            }
        }

        // Store results globally so health view can use them
        _lastBreachResults = results;

        // Summary
        fill.style.width  = '100%';
        const breachedCount = all.filter(c => (results[c.password] || 0) > 0).length;
        label.textContent   = networkError
            ? `Scan complete (some checks failed) — ${breachedCount} compromised password${breachedCount !== 1 ? 's' : ''} found`
            : `Scan complete — ${breachedCount} compromised password${breachedCount !== 1 ? 's' : ''} found`;
        label.style.color = breachedCount > 0 ? 'var(--danger)' : 'var(--success)';

        btn.disabled  = false;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Re-scan All Passwords';

        // Update breach stat cell inline (no full re-render)
        if (statCell) {
            statCell.className = `health-stat ${breachedCount > 0 ? 'danger' : 'good'}`;
            statCell.innerHTML = `
                <div class="health-stat-number">${breachedCount}</div>
                <div class="health-stat-label">Breached</div>`;
        }

        // Append / replace breached group in health issues
        const issuesEl = document.getElementById('healthIssues');
        if (issuesEl) {
            const existing = issuesEl.querySelector('.breach-group');
            const breached = all.filter(c => (results[c.password] || 0) > 0);
            if (breached.length > 0) {
                const html = `<div class="breach-group">${
                    renderHealthGroup('Breached Passwords', breached, 'danger', c => {
                        const count = results[c.password];
                        return `Found in ${count.toLocaleString()} breaches`;
                    })
                }</div>`;
                if (existing) {
                    existing.outerHTML = html;
                } else {
                    issuesEl.insertAdjacentHTML('beforeend', html);
                }
            } else if (existing) {
                existing.remove();
            }
        }

        if (networkError) {
            showToast('Some passwords could not be checked — network error', 'warning');
        } else if (breachedCount > 0) {
            showToast(`${breachedCount} compromised password${breachedCount !== 1 ? 's' : ''} found in known breaches!`, 'error');
        } else {
            showToast('All passwords checked — none found in known breaches', 'success');
        }
    }

    function renderHealthGroup(title, items, severity, detailFn) {
        if (items.length === 0) return '';
        return `
            <div class="health-issue-group glass">
                <div class="health-issue-header">
                    <span>${title}</span>
                    <span class="health-issue-badge ${severity}">${items.length}</span>
                </div>
                ${items.map(c => `
                <div class="health-issue-item">
                    <div>
                        <div class="health-issue-site">${escapeHtml(c.site || c.username || c.url || 'Untitled')}</div>
                        <div class="health-issue-detail">${escapeHtml(c.site ? (c.username || '') : '')}</div>
                    </div>
                    <span class="health-issue-badge ${severity}">${detailFn(c)}</span>
                </div>`).join('')}
            </div>`;
    }

    // ─── Settings Modal ───────────────────────────────────────────────────────

    function openSettingsModal() {
        elements.settingsModal.classList.remove('hidden');
        elements.changeMasterKeyForm.reset();
        document.getElementById('newMasterKeyStrength').style.setProperty('--strength', '0%');

        // Show which KDF this vault currently uses
        if (elements.kdfBadge) {
            try {
                const saltRaw = localStorage.getItem('safekey_salt');
                let kdf = 'pbkdf2';
                if (saltRaw) {
                    try { kdf = JSON.parse(saltRaw).kdf || 'pbkdf2'; } catch { kdf = 'pbkdf2'; }
                }
                if (kdf === Crypto.KDF.ARGON2ID) {
                    elements.kdfBadge.textContent = 'Argon2id ✓';
                    elements.kdfBadge.className = 'kdf-badge kdf-badge--argon2id';
                } else {
                    elements.kdfBadge.textContent = 'PBKDF2 (legacy)';
                    elements.kdfBadge.className = 'kdf-badge kdf-badge--pbkdf2';
                }
            } catch {
                elements.kdfBadge.textContent = 'unknown';
                elements.kdfBadge.className = 'kdf-badge kdf-badge--unknown';
            }
        }
    }

    function closeSettingsModal() {
        elements.settingsModal.classList.add('hidden');
        elements.changeMasterKeyForm.reset();
    }

    async function handleChangeMasterKey(e) {
        e.preventDefault();
        const current = document.getElementById('currentMasterKey').value;
        const newKey = document.getElementById('newMasterKey').value;
        const confirm = document.getElementById('confirmNewMasterKey').value;

        if (newKey.length < 8) return showToast('New master key must be at least 8 characters', 'error');
        if (newKey !== confirm) return showToast('New master keys do not match', 'error');
        if (current === newKey) return showToast('New key must be different from current', 'error');

        const submitBtn = elements.changeMasterKeyForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Re-encrypting...';
        submitBtn.disabled = true;

        try {
            const result = await Vault.changeMasterKey(current, newKey);
            if (result.success) {
                // Update session with new key
                Session.start(result.key, result.salt);
                closeSettingsModal();
                showToast('Master key changed successfully', 'success');
            } else {
                showToast(result.error || 'Failed to change master key', 'error');
            }
        } catch (error) {
            showToast('An error occurred', 'error');
        } finally {
            submitBtn.textContent = 'Change Master Key';
            submitBtn.disabled = false;
        }
    }

    function handleExportVault() {
        const data = Vault.exportVault();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safekey-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Vault exported', 'success');
    }

    function handleImportVault(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const success = Vault.importVault(ev.target.result);
            if (success) {
                showToast('Vault imported — please unlock with your master key', 'success');
                Session.lock();
            } else {
                showToast('Invalid vault file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ─── Analyzer ─────────────────────────────────────────────────────────────

    function handleAnalyzerInput() {
        const password = elements.analyzerInput.value;
        const analysis = Analyzer.analyze(password);

        document.getElementById('strengthFill').style.width = analysis.strength + '%';
        const { label, color } = Analyzer.getStrengthLabel(analysis.strength);
        const strengthLabel = document.getElementById('strengthLabel');
        strengthLabel.textContent = label;
        strengthLabel.style.color = color;

        Object.keys(analysis.rules).forEach(rule => {
            const ruleEl = document.querySelector(`[data-rule="${rule}"]`);
            if (ruleEl) {
                ruleEl.classList.toggle('passed', analysis.rules[rule]);
                ruleEl.querySelector('.rule-icon').textContent = analysis.rules[rule] ? '✓' : '○';
            }
        });

        document.getElementById('entropyValue').textContent = Math.round(analysis.entropy) + ' bits';
        document.getElementById('strengthPercent').textContent = analysis.strength + '%';
        document.getElementById('crackTime').textContent = analysis.crackTime.display;
    }

    // ─── Generator ────────────────────────────────────────────────────────────

    function handleGenerate() {
        const activeMode = document.querySelector('.gen-mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'random';
        const result = Generator.generate({
            mode,
            length:     parseInt(elements.passwordLength.value),
            wordCount:  mode === 'readable'   ? parseInt(document.getElementById('readableWordCount').value)
                      : mode === 'passphrase' ? parseInt(document.getElementById('passphraseWordCount').value)
                      : 2,
            uppercase:  elements.includeUppercase.checked,
            lowercase:  elements.includeLowercase.checked,
            numbers:    mode === 'readable'   ? document.getElementById('readableNumbers').checked
                      : mode === 'passphrase' ? document.getElementById('passphraseNumbers').checked
                      : elements.includeNumbers.checked,
            symbols:    mode === 'readable'   ? document.getElementById('readableSymbols').checked
                      : elements.includeSymbols.checked,
            keyword:    elements.keywordInput.value
        });
        elements.generatedPassword.value = result.password;
        document.getElementById('genEntropyValue').textContent = Math.round(result.entropy) + ' bits';
        document.getElementById('genCrackTime').textContent = result.crackTime;
    }

    async function handleCopyPassword() {
        const password = elements.generatedPassword.value;
        if (!password) return;
        const success = await Vault.copyToClipboard(password);
        if (success) showToast('Password copied (auto-clears in 30s)', 'success');
    }

    // ─── Notes ────────────────────────────────────────────────────────────────

    async function loadNotes() {
        try {
            const notes = await Vault.getAllNotes();
            renderNotes(notes);
        } catch (error) {
            console.error('[App] Failed to load notes:', error);
        }
    }

    function renderNotes(notes) {
        if (notes.length === 0) {
            elements.notesList.innerHTML = '';
            elements.emptyNotes.classList.remove('hidden');
            return;
        }
        elements.emptyNotes.classList.add('hidden');

        elements.notesList.innerHTML = notes.map(note => {
            const preview = (note.content || '').substring(0, 120) + ((note.content || '').length > 120 ? '...' : '');
            const date = new Date(note.updatedAt).toLocaleDateString();
            return `
            <div class="note-card" data-id="${note.id}">
                <div class="note-card-header">
                    <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
                    <div class="note-card-actions">
                        <button class="icon-btn note-edit-btn" title="Edit" data-id="${note.id}">${ICONS.edit}</button>
                        <button class="icon-btn note-delete-btn" title="Delete" data-id="${note.id}">${ICONS.trash}</button>
                    </div>
                </div>
                <p class="note-card-preview">${escapeHtml(preview)}</p>
                <span class="note-card-date">${date}</span>
            </div>`;
        }).join('');

        // Bind note card events
        document.querySelectorAll('.note-edit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const note = await Vault.getNoteById(btn.dataset.id);
                if (note) openNoteModal(note);
            });
        });

        document.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Delete this note?')) {
                    await Vault.removeNote(btn.dataset.id);
                    loadNotes();
                    showToast('Note deleted', 'success');
                }
            });
        });
    }

    function openNoteModal(note = null) {
        elements.noteModalTitle.textContent = note ? 'Edit Note' : 'Add Note';
        elements.noteId.value = note?.id || '';
        elements.noteTitle.value = note?.title || '';
        elements.noteContent.value = note?.content || '';
        elements.noteModal.classList.remove('hidden');
        elements.noteTitle.focus();
    }

    function closeNoteModalFn() {
        elements.noteModal.classList.add('hidden');
        elements.noteForm.reset();
    }

    async function handleNoteSubmit(e) {
        e.preventDefault();
        const id = elements.noteId.value;
        const noteData = {
            title: elements.noteTitle.value.trim(),
            content: elements.noteContent.value
        };

        if (!noteData.title) return showToast('Title is required', 'error');

        try {
            if (id) {
                await Vault.updateNote(id, noteData);
                showToast('Note updated', 'success');
            } else {
                await Vault.addNote(noteData);
                showToast('Note added', 'success');
            }
            closeNoteModalFn();
            loadNotes();
        } catch (error) {
            console.error('[App] Note save error:', error);
            showToast('Failed to save note', 'error');
        }
    }

    // ─── CSV Import ───────────────────────────────────────────────────────────

    async function handleImportCsv(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const text = ev.target.result;
                const rows = parseCsv(text);
                if (rows.length < 2) return showToast('CSV file appears empty', 'error');

                const headers = rows[0].map(h => h.toLowerCase().trim());
                let imported = 0;

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < 2) continue;

                    const getCol = (...names) => {
                        for (const name of names) {
                            const idx = headers.indexOf(name);
                            if (idx !== -1 && row[idx]) return row[idx].trim();
                        }
                        return '';
                    };

                    const cred = {
                        site: getCol('name', 'title', 'site', 'login_uri', 'website'),
                        url: getCol('url', 'login_uri', 'website', 'urls'),
                        username: getCol('username', 'login_username', 'email', 'user'),
                        password: getCol('password', 'login_password'),
                        notes: getCol('notes', 'extra', 'comments'),
                        category: '',
                        tags: [],
                        favorite: false
                    };

                    // Fallback: use URL domain as site name if no site
                    if (!cred.site && cred.url) {
                        try { cred.site = new URL(cred.url).hostname; } catch {}
                    }

                    if (cred.password) {
                        await Vault.add(cred);
                        imported++;
                    }
                }

                showToast(`Imported ${imported} credentials from CSV`, 'success');
                loadCredentials();
            } catch (error) {
                console.error('[App] CSV import error:', error);
                showToast('Failed to parse CSV file', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function parseCsv(text) {
        const rows = [];
        let current = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else inQuotes = false;
                } else {
                    field += c;
                }
            } else {
                if (c === '"') inQuotes = true;
                else if (c === ',') { current.push(field); field = ''; }
                else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
                    current.push(field); field = '';
                    rows.push(current); current = [];
                    if (c === '\r') i++;
                } else {
                    field += c;
                }
            }
        }
        if (field || current.length > 0) { current.push(field); rows.push(current); }
        return rows;
    }

    // ─── Vault Wipe ───────────────────────────────────────────────────────────

    function handleWipeVault() {
        if (elements.wipeConfirmInput.value !== 'DELETE') return;
        Vault.wipeVault();
        Session.destroy();
        elements.wipeConfirmModal.classList.add('hidden');
        closeSettingsModal();
        showView('landing');
        showToast('Vault destroyed permanently', 'info');
    }

    // ─── Attachments ──────────────────────────────────────────────────────────

    async function handleAttachmentUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const MAX_SIZE = 512 * 1024; // 512KB
        if (file.size > MAX_SIZE) {
            showToast('File too large (max 512KB)', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result.split(',')[1];
            const credId = document.getElementById('credentialId').value;
            if (!credId) {
                showToast('Save the credential first before adding attachments', 'warning');
                e.target.value = '';
                return;
            }
            try {
                await Vault.addAttachment(credId, file.name, file.type, base64);
                showToast(`Attached: ${file.name}`, 'success');
                loadAttachmentsList(credId);
            } catch (error) {
                showToast('Failed to attach file', 'error');
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    async function loadAttachmentsList(credId) {
        if (!elements.attachmentsList) return;
        const attachments = await Vault.getAttachmentsByCredId(credId);
        if (attachments.length === 0) {
            elements.attachmentsList.innerHTML = '<span class="text-muted" style="font-size:0.82rem">No attachments</span>';
            return;
        }
        elements.attachmentsList.innerHTML = attachments.map(a => `
            <div class="attachment-item">
                <span class="attachment-name">${ICONS.paperclip} ${escapeHtml(a.fileName)}</span>
                <div class="attachment-actions">
                    <button class="icon-btn att-download" data-id="${a.id}" title="Download">${ICONS.download}</button>
                    <button class="icon-btn att-delete delete-btn" data-id="${a.id}" title="Delete">${ICONS.trash}</button>
                </div>
            </div>
        `).join('');

        elements.attachmentsList.querySelectorAll('.att-download').forEach(btn => {
            btn.addEventListener('click', async () => {
                const att = attachments.find(a => a.id === btn.dataset.id);
                if (!att) return;
                const link = document.createElement('a');
                link.href = `data:${att.fileType};base64,${att.data}`;
                link.download = att.fileName;
                link.click();
            });
        });

        elements.attachmentsList.querySelectorAll('.att-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                await Vault.removeAttachment(btn.dataset.id);
                loadAttachmentsList(credId);
                showToast('Attachment removed', 'success');
            });
        });
    }

    // ─── Generator Presets ────────────────────────────────────────────────────

    function handleSavePreset() {
        const activeMode = document.querySelector('.gen-mode-btn.active');
        const mode = activeMode ? activeMode.dataset.mode : 'random';
        const preset = {
            name: prompt('Preset name:'),
            mode,
            length: parseInt(elements.passwordLength.value),
            uppercase: elements.includeUppercase.checked,
            lowercase: elements.includeLowercase.checked,
            numbers: elements.includeNumbers.checked,
            symbols: elements.includeSymbols.checked
        };
        if (!preset.name) return;
        Vault.saveGenPreset(preset);
        renderPresets();
        showToast(`Preset "${preset.name}" saved`, 'success');
    }

    function renderPresets() {
        if (!elements.presetsList) return;
        const presets = Vault.getGenPresets();
        if (presets.length === 0) {
            elements.presetsList.innerHTML = '<span class="text-muted" style="font-size:0.82rem">No saved presets</span>';
            return;
        }
        elements.presetsList.innerHTML = presets.map(p => `
            <div class="preset-chip">
                <button class="preset-apply" data-id="${p.id}" title="Apply preset">${escapeHtml(p.name)}</button>
                <button class="preset-delete" data-id="${p.id}" title="Delete">&times;</button>
            </div>
        `).join('');

        elements.presetsList.querySelectorAll('.preset-apply').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets.find(p => p.id === btn.dataset.id);
                if (!preset) return;
                document.querySelectorAll('.gen-mode-btn').forEach(b => b.classList.remove('active'));
                const modeBtn = document.querySelector(`.gen-mode-btn[data-mode="${preset.mode}"]`);
                if (modeBtn) modeBtn.classList.add('active');
                document.getElementById('randomOptions').classList.toggle('hidden', preset.mode !== 'random');
                document.getElementById('readableOptions').classList.toggle('hidden', preset.mode !== 'readable');
                document.getElementById('passphraseOptions').classList.toggle('hidden', preset.mode !== 'passphrase');
                elements.passwordLength.value = preset.length;
                elements.lengthValue.textContent = preset.length;
                elements.includeUppercase.checked = preset.uppercase;
                elements.includeLowercase.checked = preset.lowercase;
                elements.includeNumbers.checked = preset.numbers;
                elements.includeSymbols.checked = preset.symbols;
                handleGenerate();
                showToast(`Applied preset: ${preset.name}`, 'success');
            });
        });

        elements.presetsList.querySelectorAll('.preset-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                Vault.deleteGenPreset(btn.dataset.id);
                renderPresets();
                showToast('Preset deleted', 'success');
            });
        });
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    function showToast(message, type = 'info') {
        const toast = elements.toast;
        toast.querySelector('.toast-message').textContent = message;
        toast.className = 'toast ' + type;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
    }

    function getInitials(site) {
        return (site || '??').substring(0, 2).toUpperCase();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function isSafeUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function formatAge(timestamp) {
        if (!timestamp) return '';
        const days = Math.floor((Date.now() - timestamp) / 86400000);
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        if (days < 30) return `${days} days ago`;
        const months = Math.floor(days / 30);
        if (months < 12) return `${months}mo ago`;
        return `${Math.floor(months / 12)}y ago`;
    }

    function isOld(timestamp) {
        if (!timestamp) return false;
        return (Date.now() - timestamp) > 90 * 86400000;
    }

    // ─── QR Vault Transfer ─────────────────────────────────────────────────

    let qrChunks = [];
    let qrCurrentPage = 0;

    function handleShowQr() {
        const data = Vault.exportVault();
        const MAX_CHUNK = 400;

        qrChunks = [];
        const totalChunks = Math.ceil(data.length / MAX_CHUNK);
        for (let i = 0; i < totalChunks; i++) {
            const chunk = data.substring(i * MAX_CHUNK, (i + 1) * MAX_CHUNK);
            qrChunks.push('SAFEKEY:' + (i + 1) + ':' + totalChunks + ':' + chunk);
        }

        qrCurrentPage = 0;
        renderQrCode(0);

        if (qrChunks.length > 1) {
            elements.qrPagination.classList.remove('hidden');
        } else {
            elements.qrPagination.classList.add('hidden');
        }

        closeSettingsModal();
        elements.qrDisplayModal.classList.remove('hidden');
    }

    function renderQrCode(index) {
        qrCurrentPage = index;
        elements.qrCanvas.innerHTML = '';

        const qr = qrcode(0, 'M');
        qr.addData(qrChunks[index]);
        qr.make();
        elements.qrCanvas.innerHTML = qr.createSvgTag(3, 2);

        elements.qrPageInfo.textContent = (index + 1) + ' / ' + qrChunks.length;
        elements.qrPrev.disabled = index === 0;
        elements.qrNext.disabled = index === qrChunks.length - 1;

        if (qrChunks.length > 1) {
            elements.qrDisplayTitle.textContent = 'Vault QR Code (' + (index + 1) + '/' + qrChunks.length + ')';
        } else {
            elements.qrDisplayTitle.textContent = 'Vault QR Code';
        }
    }

    let scanStream = null;
    let scanCollectedChunks = {};
    let scanTotalChunks = 0;
    let scanDetector = null;

    async function handleScanQr() {
        closeSettingsModal();

        if (!('BarcodeDetector' in window)) {
            elements.qrScanContainer.classList.add('hidden');
            elements.qrScanFallback.classList.remove('hidden');
            elements.qrScanModal.classList.remove('hidden');
            return;
        }

        elements.qrScanContainer.classList.remove('hidden');
        elements.qrScanFallback.classList.add('hidden');
        elements.qrScanModal.classList.remove('hidden');
        elements.qrScanStatus.textContent = 'Starting camera...';

        scanCollectedChunks = {};
        scanTotalChunks = 0;
        elements.qrScanProgress.classList.add('hidden');

        try {
            scanStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            elements.qrVideo.srcObject = scanStream;

            scanDetector = new BarcodeDetector({ formats: ['qr_code'] });
            elements.qrScanStatus.textContent = 'Point camera at SafeKey QR code...';

            scanQrFrame(elements.qrVideo);
        } catch (err) {
            elements.qrScanStatus.textContent = 'Camera access denied or unavailable.';
            console.error('[QR] Camera error:', err);
        }
    }

    async function scanQrFrame(video) {
        if (!scanStream) return;

        try {
            const barcodes = await scanDetector.detect(video);
            for (const barcode of barcodes) {
                const data = barcode.rawValue;
                if (data.startsWith('SAFEKEY:')) {
                    handleQrChunk(data);
                }
            }
        } catch (e) {
            // Ignore detection errors
        }

        if (scanStream) {
            requestAnimationFrame(() => scanQrFrame(video));
        }
    }

    function handleQrChunk(data) {
        const parts = data.match(/^SAFEKEY:(\d+):(\d+):(.+)$/s);
        if (!parts) return;

        const chunkNum = parseInt(parts[1]);
        const total = parseInt(parts[2]);
        const payload = parts[3];

        if (scanTotalChunks === 0) {
            scanTotalChunks = total;
        }

        if (!scanCollectedChunks[chunkNum]) {
            scanCollectedChunks[chunkNum] = payload;

            const collected = Object.keys(scanCollectedChunks).length;

            if (total > 1) {
                elements.qrScanProgress.classList.remove('hidden');
                elements.qrProgressBar.style.width = ((collected / total) * 100) + '%';
                elements.qrChunkInfo.textContent = collected + ' / ' + total + ' chunks scanned';
                elements.qrScanStatus.textContent = 'Scanning chunk ' + chunkNum + '...';
            }

            if (collected === total) {
                let fullData = '';
                for (let i = 1; i <= total; i++) {
                    fullData += scanCollectedChunks[i];
                }

                stopScanner();

                const success = Vault.importVault(fullData);
                elements.qrScanModal.classList.add('hidden');

                if (success) {
                    showToast('Vault imported from QR code — please unlock', 'success');
                    Session.lock();
                } else {
                    showToast('Invalid QR code data', 'error');
                }
            }
        }
    }

    function stopScanner() {
        if (scanStream) {
            scanStream.getTracks().forEach(t => t.stop());
            scanStream = null;
        }
        scanDetector = null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { navigateTo, showToast };
})();

window.App = App;

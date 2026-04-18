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

    async function init() {
        cacheElements();
        bindEvents();
        Session.onLock(handleVaultLock);
        showView('landing');
        registerServiceWorker();
        console.log('[SafeKey] Application initialized');
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
        elements.mobileThemeBtn = document.getElementById('mobileThemeBtn');
        elements.themeBtn = document.getElementById('themeBtn');
        elements.themeBtnLabel = document.getElementById('themeBtnLabel');

        elements.setupForm = document.getElementById('setupForm');
        elements.unlockForm = document.getElementById('unlockForm');
        elements.credentialForm = document.getElementById('credentialForm');
        elements.changeMasterKeyForm = document.getElementById('changeMasterKeyForm');

        elements.masterKeySetup = document.getElementById('masterKeySetup');
        elements.usernameSetup = document.getElementById('usernameSetup');
        elements.masterKeyConfirm = document.getElementById('masterKeyConfirm');
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
        elements.unlockError = document.getElementById('unlockError');
        elements.setupStrength = document.getElementById('setupStrength');
        elements.newMasterKeyStrength = document.getElementById('newMasterKeyStrength');
        elements.toast = document.getElementById('toast');
        elements.healthContent = document.getElementById('healthContent');
        elements.categoryFilter = document.getElementById('categoryFilter');
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
        elements.mobileThemeBtn.addEventListener('click', toggleTheme);
        elements.themeBtn.addEventListener('click', toggleTheme);

        initTheme();

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

        elements.addCredentialBtn.addEventListener('click', () => openCredentialModal());
        elements.vaultSearch.addEventListener('input', handleSearch);

        elements.categoryFilter.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;
            activeCategory = chip.dataset.category;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            loadCredentials();
        });

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

        elements.analyzerInput.addEventListener('input', handleAnalyzerInput);

        elements.passwordLength.addEventListener('input', () => {
            elements.lengthValue.textContent = elements.passwordLength.value;
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

        document.addEventListener('keydown', handleGlobalKeydown);
    }

    function handleGlobalKeydown(e) {
        // Escape closes any open modal
        if (e.key === 'Escape') {
            if (!elements.credentialModal.classList.contains('hidden')) closeCredentialModal();
            if (!elements.settingsModal.classList.contains('hidden')) closeSettingsModal();
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
        }
    }

    function showView(viewName) {
        [elements.landingView, elements.setupView, elements.unlockView, elements.vaultView,
            elements.healthView, elements.analyzerView, elements.generatorView].forEach(view => {
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
        } catch {
            elements.unlockError.classList.remove('hidden');
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
                    (c.url || '').toLowerCase().includes(lq)
                );
            }
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
                ? `<a class="credential-url" href="${escapeHtml(cred.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(cred.url)}">↗ Open</a>`
                : '';

            return `
            <div class="credential-card" data-id="${cred.id}">
                <div class="credential-icon">${getInitials(cred.site)}</div>
                <div class="credential-info">
                    <div class="credential-site-row">
                        <span class="credential-site">${escapeHtml(cred.site)}</span>
                        ${urlLink}
                    </div>
                    <div class="credential-username">${escapeHtml(cred.username)}</div>
                    <div class="credential-meta">
                        ${categoryBadge}
                        <span class="credential-age${ageClass}">${age}</span>
                    </div>
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
            </div>`;
        }).join('');

        bindCredentialEvents();
    }

    function bindCredentialEvents() {
        document.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const card = btn.closest('.credential-card');
                const passwordEl = card.querySelector('.credential-password');
                const cred = await Vault.getById(btn.dataset.id);
                if (passwordEl.querySelector('.password-visible')) {
                    passwordEl.innerHTML = '<span class="password-hidden">••••••••</span>';
                    btn.textContent = '👁️';
                } else {
                    const span = document.createElement('span');
                    span.className = 'password-visible';
                    span.textContent = cred.password;
                    passwordEl.innerHTML = '';
                    passwordEl.appendChild(span);
                    btn.textContent = '🙈';
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
        ];

        optionals.forEach(({ chk, field, input, val }) => {
            const hasValue = !!val;
            document.getElementById(chk).checked = hasValue;
            document.getElementById(field).classList.toggle('hidden', !hasValue);
            document.getElementById(input).value = val;
        });

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
        const credential = {
            site: document.getElementById('credentialSite').value,
            url: document.getElementById('credentialUrl').value,
            category: document.getElementById('credentialCategory').value,
            username: document.getElementById('credentialUsername').value,
            password: document.getElementById('credentialPassword').value,
            notes: document.getElementById('credentialNotes').value
        };

        // Duplicate password detection
        const dupes = await findDuplicatePassword(credential.password, editingCredentialId);
        if (dupes.length > 0) {
            const sites = dupes.map(c => c.site).join(', ');
            showToast(`⚠️ Password reused on: ${sites}`, 'warning');
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

    async function handleBreachCheck() {
        const password = document.getElementById('credentialPassword').value;
        if (!password) {
            showToast('Enter a password to check', 'warning');
            return;
        }

        elements.breachCheckBtn.textContent = '⏳ Checking...';
        elements.breachCheckBtn.disabled = true;
        elements.breachResult.classList.add('hidden');

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

            elements.breachResult.classList.remove('hidden');
            if (count > 0) {
                elements.breachResult.textContent = `⚠️ Found in ${count.toLocaleString()} breaches!`;
                elements.breachResult.className = 'breach-result breach-bad';
            } else {
                elements.breachResult.textContent = '✓ Not found in known breaches';
                elements.breachResult.className = 'breach-result breach-good';
            }
        } catch {
            elements.breachResult.classList.remove('hidden');
            elements.breachResult.textContent = '⚠️ Could not reach breach API';
            elements.breachResult.className = 'breach-result breach-warn';
        } finally {
            elements.breachCheckBtn.textContent = '🔍 Check for data breaches';
            elements.breachCheckBtn.disabled = false;
        }
    }

    // ─── Health View ──────────────────────────────────────────────────────────

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

        // Detect reused passwords
        const passMap = {};
        all.forEach(c => {
            if (!passMap[c.password]) passMap[c.password] = [];
            passMap[c.password].push(c);
        });
        const reused = all.filter(c => passMap[c.password].length > 1);

        const score = Math.max(0, 100 - (weak.length * 15) - (reused.length * 10) - (old.length * 5));

        elements.healthContent.innerHTML = `
            <div class="health-score-row">
                <div class="health-score-card glass">
                    <div class="health-score-number ${score >= 80 ? 'score-good' : score >= 50 ? 'score-warn' : 'score-bad'}">${score}</div>
                    <div class="health-score-label">Security Score</div>
                    <div class="health-score-sub">${score >= 80 ? 'Great shape' : score >= 50 ? 'Needs attention' : 'Action required'}</div>
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
                    <div class="health-stat-label">Old (90+ days)</div>
                </div>
            </div>
            <div class="health-issues">
                ${renderHealthGroup('Weak Passwords', weak, 'danger', c => {
                    const s = Analyzer.analyze(c.password).strength;
                    return `Strength: ${s}%`;
                })}
                ${renderHealthGroup('Reused Passwords', reused, 'warning', c => {
                    const n = passMap[c.password].length;
                    return `Shared across ${n} accounts`;
                })}
                ${renderHealthGroup('Old Passwords', old, 'warning', c => {
                    return `Last changed ${formatAge(c.updatedAt)}`;
                })}
            </div>`;
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
                        <div class="health-issue-site">${escapeHtml(c.site)}</div>
                        <div class="health-issue-detail">${escapeHtml(c.username)}</div>
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
            length:    parseInt(elements.passwordLength.value),
            uppercase: elements.includeUppercase.checked,
            lowercase: elements.includeLowercase.checked,
            numbers:   mode === 'readable'   ? document.getElementById('readableNumbers').checked
                     : mode === 'passphrase' ? document.getElementById('passphraseNumbers').checked
                     : elements.includeNumbers.checked,
            symbols:   mode === 'readable'   ? document.getElementById('readableSymbols').checked
                     : elements.includeSymbols.checked,
            keyword:   elements.keywordInput.value
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

    // ─── Utilities ────────────────────────────────────────────────────────────

    function showToast(message, type = 'info') {
        const toast = elements.toast;
        toast.querySelector('.toast-message').textContent = message;
        toast.className = 'toast ' + type;
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
    }

    function getInitials(site) {
        return site.substring(0, 2).toUpperCase();
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

    // ─── Theme ────────────────────────────────────────────────────────────────

    function initTheme() {
        const saved = localStorage.getItem('safekey_theme') || 'dark';
        applyTheme(saved);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('safekey_theme', theme);
        const isDark = theme === 'dark';
        const label = isDark ? 'Light mode' : 'Dark mode';
        const icon  = isDark ? '🌙' : '☀️';
        if (elements.themeBtnLabel) elements.themeBtnLabel.textContent = label;
        if (elements.mobileThemeBtn) elements.mobileThemeBtn.textContent = icon;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { navigateTo, showToast };
})();

window.App = App;

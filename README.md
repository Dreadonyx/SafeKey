# SafeKey

> A password manager that actually stays on your machine. No cloud. No accounts. No trust required.

SafeKey runs entirely in your browser using the Web Crypto API — your vault never leaves your device. AES-256-GCM encryption, Argon2id key derivation, and zero telemetry.

## Why

Every password manager wants you to trust their servers. I didn't want to. So I built one where there are no servers to trust.

## What's inside

**Cryptography**
- AES-256-GCM encryption with a unique IV per entry
- Argon2id key derivation (64 MiB memory, 3 iterations) — memory-hard, OWASP recommended
- Legacy PBKDF2 vaults (100,000 iterations) are detected and unlocked automatically; changing your master key upgrades them to Argon2id silently
- All crypto operations handled by the browser's native Web Crypto API — no third-party crypto libraries

**Vault**
- Unlimited credentials with optional fields: site, username, URL, category, notes
- Category filtering (Work, Social, Banking, Shopping, Email, Gaming)
- Real-time search across site, username, and URL
- Duplicate password detection on save
- Export and import encrypted vault as JSON

**Security features**
- Auto-lock after 20 minutes of inactivity, keys wiped from memory
- Clipboard auto-clears after 30 seconds
- Failed unlock attempt counter with exponential backoff (3 free tries, then 5s / 30s / 2min / 10min delays) — persists across page reloads
- Vault health dashboard: weak, reused, and old (90+ days) password detection
- Pwned password check using k-Anonymity — only 5 SHA-1 chars leave this device, checked against the HaveIBeenPwned database
- Vault-wide breach scanner with deduplication (same password = one API call) and rate limiting

**Generator**
- Random, Readable, and Passphrase modes
- Configurable length (8–64), charset, and word count
- Optional keyword weaving
- Real-time entropy and crack-time estimates

**Platform**
- Runs as a desktop app (Tauri) or straight in the browser
- PWA-ready with offline support via service worker
- Android APK in [Releases](../../releases)

## Run it

**Browser** — just open `web/index.html`. That's it.

**Desktop:**
```bash
git clone https://github.com/Dreadonyx/SafeKey
cd SafeKey
cargo tauri dev
```

**Android** — grab the APK from [Releases](../../releases).

## Security model

Your master password is never stored. It is used to derive the encryption key via Argon2id and then discarded. Everything in localStorage is ciphertext — the salt, verification token, and each credential entry are all individually encrypted with a unique IV.

The Pwned Password check uses k-Anonymity: only the first 5 characters of the SHA-1 hash of your password are sent to the HaveIBeenPwned API. The remaining suffix is checked locally. Your actual password never leaves the device.

The failed unlock counter state is stored in localStorage so reloading the page does not reset the lockout. The encryption key lives only in memory and is wiped on lock, tab close, or session timeout.

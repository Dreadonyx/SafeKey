# SafeKey 🔐

> A password manager that actually stays on your machine. No cloud. No accounts. No trust required.

SafeKey runs entirely in your browser using the Web Crypto API — your vault never leaves your device. AES-256-GCM encryption, PBKDF2 key derivation, and zero telemetry.

## Why

Every password manager wants you to trust their servers. I didn't want to. So I built one where there are no servers to trust.

## What's inside

- AES-256-GCM encryption with a unique IV per entry
- PBKDF2 key derivation — 100,000 iterations
- Auto-lock after 20min of inactivity, keys wiped from memory
- Clipboard clears after 30 seconds
- Password generator with configurable length (8–64), charset, memorability slider, and keyword integration
- Real-time entropy-based strength meter with crack-time estimates
- Runs as a desktop app (Tauri) or straight in the browser
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

Your master password is never stored. It's used to derive the encryption key via PBKDF2 and that's it. Everything in localStorage is ciphertext. The browser's native Web Crypto API handles all crypto operations — no third-party crypto libraries.

# 🔐 SafeKey

A **local-first, zero-knowledge password manager** that runs entirely in your browser. No cloud, no servers, no tracking — your passwords never leave your device.

## ✨ Features

### 🔒 Security First
- **AES-256-GCM Encryption** - Military-grade encryption for all credentials
- **PBKDF2 Key Derivation** - 100,000 iterations for brute-force resistance
- **Zero-Knowledge Architecture** - Your master key never leaves your browser
- **Unique IV per Entry** - Each credential encrypted with a unique initialization vector
- **Auto-Lock Session** - Automatically locks after 20 minutes of inactivity
- **Memory-Safe** - Encryption keys wiped from memory on lock

### 💎 Core Features
- **Vault Management** - Securely store unlimited credentials
- **Password Generator** - Create strong, customizable passwords
  - Configurable length (8-64 characters)
  - Character set options (uppercase, lowercase, numbers, symbols)
  - Memorability slider for pronounceable passwords
  - Keyword integration
- **Password Analyzer** - Real-time strength analysis
  - Entropy calculation
  - Rule validation
  - Brute-force time estimation
  - Visual strength meter
- **Smart Search** - Quickly find credentials by site or username
- **Clipboard Auto-Clear** - Copied passwords automatically cleared after 30 seconds

### 🎨 Modern UI
- **Cyber Teal Theme** - Professional blue/green color palette
- **Glassmorphism Design** - Semi-transparent cards with backdrop blur
- **CSS Shape Icons** - No emoji dependencies, pure CSS geometric icons
- **Subtle Glow Effects** - Professional depth without distraction
- **Responsive Layout** - Works on desktop and mobile browsers

## 🚀 Quick Start

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- A simple HTTP server (Python, Node.js, or any local server)

### Installation

1. **Clone or download the repository**
   ```bash
   git clone <your-repo-url>
   cd safekey
   ```

2. **Start a local server**
   
   Using Python 3:
   ```bash
   python3 -m http.server 8080
   ```
   
   Using Node.js (with `http-server`):
   ```bash
   npx http-server -p 8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

### First-Time Setup

1. Click **"Generate a Vault"**
2. Enter a **username** (for identification)
3. Create a strong **master key** (minimum 8 characters)
4. **Important**: Your master key cannot be recovered if lost!

## 🏗️ Tech Stack

- **HTML5** - Structure
- **CSS3** - Styling with custom properties and modern features
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Web Crypto API** - Browser-native cryptography
- **localStorage** - Client-side encrypted storage

## 📁 Project Structure

```
safekey/
├── index.html          # Main application shell
├── style.css           # Complete UI styling
├── js/
│   ├── app.js         # Main application controller
│   ├── crypto.js      # Encryption/decryption utilities
│   ├── vault.js       # Vault management and CRUD
│   ├── session.js     # Session and auto-lock management
│   ├── analyzer.js    # Password strength analysis
│   └── generator.js   # Password generation
└── README.md          # This file
```

## 🔐 Security Architecture

### Encryption Flow
```
Master Password 
    → PBKDF2 (100k iterations) 
    → AES-256-GCM Key 
    → Encrypt Each Credential 
    → Store in localStorage
```

### Key Features
- **Never stored**: Master key and derived encryption key
- **Always encrypted**: All credential data (site, username, password, notes)
- **Unique IVs**: Each encrypted entry uses a unique initialization vector
- **Verification token**: Encrypted token validates correct master key on unlock

### Session Management
- Keys held in memory only during active session
- Automatic lock after 20 minutes of inactivity
- Manual lock available at any time
- Activity events reset idle timer

## 🎯 Usage

### Adding a Credential
1. Unlock your vault
2. Click **"+ Add Credential"**
3. Fill in site, username, password, and optional notes
4. Use the inline generator (⚡) for strong passwords
5. Save

### Password Generator
1. Navigate to **Generator** tab
2. Adjust length slider (8-64 characters)
3. Toggle character types (uppercase, lowercase, numbers, symbols)
4. Add a keyword (optional)
5. Adjust memorability slider for pronounceable passwords
6. Click **Generate**

### Password Analyzer
1. Navigate to **Analyzer** tab
2. Type or paste a password
3. Review:
   - Strength percentage
   - Entropy (bits)
   - Estimated crack time
   - Rule compliance

## ⚠️ Important Notes

- **Master Key Recovery**: There is NO way to recover your master key if lost
- **Backup**: Export your vault data regularly (JSON format)
- **Local Only**: All data stored in browser localStorage
- **HTTPS**: For production, always serve over HTTPS
- **Single Browser**: Vault data doesn't sync between browsers/devices

## 🛡️ Privacy

SafeKey is completely **offline and local**:
- ✅ No analytics or tracking
- ✅ No external API calls
- ✅ No cloud synchronization
- ✅ No telemetry or diagnostics
- ✅ No accounts or registration

Your data is yours, period.

## 🤝 Contributing

This is a personal/educational project, but suggestions and improvements are welcome!

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🙏 Acknowledgments

Built with modern web standards and best practices in cryptography. Inspired by the philosophy of local-first software and zero-knowledge architecture.

---

**Remember**: With great security comes great responsibility. Keep your master key safe and memorable!

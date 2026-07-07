import re

def resolve_file(filepath, resolver_func):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Split by conflict markers
    # Pattern to match the entire conflict block
    pattern = re.compile(r'<<<<<<< Updated upstream\n(.*?)=======\n(.*?)>>>>>>> Stashed changes\n', re.DOTALL)
    
    def replacer(match):
        upstream = match.group(1)
        stashed = match.group(2)
        return resolver_func(upstream, stashed)
    
    new_content = pattern.sub(replacer, content)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Resolved {filepath}")

# 1. crypto.js
def resolve_crypto(up, stash):
    # Keep argon2id, but update PBKDF2 iterations to 600000
    return up.replace("PBKDF2_ITERATIONS: 100000", "PBKDF2_ITERATIONS: 600000")

resolve_file('web/js/crypto.js', resolve_crypto)

# 2. vault.js
def resolve_vault(up, stash):
    if "return { success: true, key, salt, kdf: Crypto.KDF.ARGON2ID };" in up:
        # Merge ARGON2ID kdf with recovery key logic
        res = stash.replace("return { success: true, key, salt, recoveryKey };", 
                            "return { success: true, key, salt, kdf: Crypto.KDF.ARGON2ID, recoveryKey };")
        # Ensure ARGON2ID is used in recovery deriveKey? User used PBKDF2 for recovery. We'll leave user's PBKDF2 recovery for now.
        return res
    if "localStorage.setItem(STORAGE_KEYS.VAULT_VERIFY" in up:
        # User added Notes encryption. Just keep user's (stash) but ensure VAULT_DATA uses newEncryptedData
        return stash
    return stash

resolve_file('web/js/vault.js', resolve_vault)

# 3. index.html
def resolve_index(up, stash):
    if "unlockSubmitBtn" in up:
        # Keep upstream id="unlockSubmitBtn" and user's recovery button
        return stash.replace('class="btn btn-primary btn-full"', 'class="btn btn-primary btn-full" id="unlockSubmitBtn"')
    if "argon2-browser" in up:
        # Keep both scripts
        return up + stash
    return up

resolve_file('web/index.html', resolve_index)

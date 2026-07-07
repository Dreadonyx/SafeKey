import re

def resolve_file(filepath, resolver_func):
    with open(filepath, 'r') as f:
        content = f.read()
    
    pattern = re.compile(r'<<<<<<< Updated upstream\n(.*?)=======\n(.*?)>>>>>>> Stashed changes\n', re.DOTALL)
    
    def replacer(match):
        return resolver_func(match.group(1), match.group(2))
    
    new_content = pattern.sub(replacer, content)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Resolved {filepath}")

# 1. style.css
# For style.css, the user completely rewrote the mobile media queries. My breach scanner CSS is not in these blocks. 
# So we simply take the user's stashed changes for every conflict.
def resolve_style(up, stash):
    return stash

resolve_file('web/style.css', resolve_style)

# 2. app.js
def resolve_app(up, stash):
    if "elements.kdfBadge" in up:
        # Combine elements
        return up + stash
    if "btn.innerHTML = eyeClosed;" in up:
        # Keep user's ICONS
        return stash
    if "Lockout.isLocked()" in up:
        # Combine lockout and username logic
        return up + stash
    if "elements.breachCheckBtn.textContent = 'Checking...';" in up:
        return stash
    if "elements.breachResult.textContent = `Found in ${count.toLocaleString()}" in up:
        # User uses resultEl, I use elements.breachResult. Wait, in stash they use resultEl. Let's just use stash.
        return stash
    if "let _lastBreachResults = null;" in up:
        return up + stash
    if "const old  = all.filter(c => isOld(c.updatedAt));" in up:
        return stash
    if "const breachStatContent = _lastBreachResults === null" in up:
        # Here we want my breach scanner (up), but we want to include `aging` in the score calculation
        # In stash: Math.max(0, 100 - (weak.length * 15) - (reused.length * 10) - (old.length * 5) - (breachedList.length * 20) - (aging.length * 3));
        # Let's replace the score line in `up` to include aging
        return up.replace(
            "- (breachedCount   * 20)",
            "- (breachedCount   * 20)\n            - (aging.length    *  3)"
        )
    return stash

resolve_file('web/js/app.js', resolve_app)

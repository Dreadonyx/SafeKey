#!/bin/bash
# ============================================================
# SafeKey - Multi-Platform Build Script
# Builds for: Android (APK), Linux (DEB/RPM/AppImage/Arch), Windows (NSIS)
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAURI_DIR="$PROJECT_DIR/src-tauri"
RELEASE_DIR="$TAURI_DIR/target/release"
BUNDLE_DIR="$RELEASE_DIR/bundle"
DIST_DIR="$PROJECT_DIR/dist"
PACKAGING_DIR="$PROJECT_DIR/packaging"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
fail()  { echo -e "${RED}[✗]${NC} $1"; }

# ── Environment ───────────────────────────────────────────────
setup_env() {
    export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
    if [ -d "$ANDROID_HOME/ndk" ]; then
        NDK_VER=$(ls "$ANDROID_HOME/ndk" | sort -V | tail -1)
        export NDK_HOME="$ANDROID_HOME/ndk/$NDK_VER"
    fi
    export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/default}"
}

# ── Prerequisite Check ────────────────────────────────────────
check_prereqs() {
    info "Checking prerequisites..."
    
    local missing=0
    for cmd in rustc cargo node npm; do
        if command -v "$cmd" &>/dev/null; then
            ok "$cmd: $(command -v $cmd)"
        else
            fail "$cmd: not found"
            missing=1
        fi
    done
    
    if command -v npx &>/dev/null; then
        ok "Tauri CLI: $(npx tauri --version 2>/dev/null || echo 'available via npx')"
    else
        fail "npx not found"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        fail "Missing prerequisites. Please install them first."
        exit 1
    fi
}

# ── Build Linux ───────────────────────────────────────────────
build_linux() {
    info "Building Linux desktop app..."
    cd "$PROJECT_DIR"
    npx tauri build --bundles deb,rpm 2>&1
    
    mkdir -p "$DIST_DIR/linux"
    
    # Copy DEB
    if ls "$BUNDLE_DIR/deb/"*.deb 1>/dev/null 2>&1; then
        cp "$BUNDLE_DIR/deb/"*.deb "$DIST_DIR/linux/"
        ok "DEB package: $(ls $DIST_DIR/linux/*.deb)"
    fi
    
    # Copy RPM
    if ls "$BUNDLE_DIR/rpm/"*.rpm 1>/dev/null 2>&1; then
        cp "$BUNDLE_DIR/rpm/"*.rpm "$DIST_DIR/linux/"
        ok "RPM package: $(ls $DIST_DIR/linux/*.rpm)"
    fi
    
    # Copy raw binary
    if [ -f "$RELEASE_DIR/safekey" ]; then
        cp "$RELEASE_DIR/safekey" "$DIST_DIR/linux/"
        ok "Binary: $DIST_DIR/linux/safekey"
    fi
}

# ── Build Arch Package ────────────────────────────────────────
build_arch() {
    info "Building Arch Linux package..."
    
    if ! command -v makepkg &>/dev/null; then
        warn "makepkg not found - skipping Arch package (not on Arch?)"
        return
    fi
    
    local ARCH_BUILD_DIR="$DIST_DIR/arch-build"
    mkdir -p "$ARCH_BUILD_DIR"
    
    # Copy PKGBUILD
    cp "$PACKAGING_DIR/arch/PKGBUILD" "$ARCH_BUILD_DIR/"
    
    # Create src directory with required files
    mkdir -p "$ARCH_BUILD_DIR/src"
    cp "$RELEASE_DIR/safekey" "$ARCH_BUILD_DIR/src/"
    cp "$PACKAGING_DIR/safekey.desktop" "$ARCH_BUILD_DIR/src/"
    cp "$TAURI_DIR/icons/128x128.png" "$ARCH_BUILD_DIR/src/icon-128x128.png"
    cp "$TAURI_DIR/icons/128x128@2x.png" "$ARCH_BUILD_DIR/src/icon-256x256.png"
    cp "$TAURI_DIR/icons/32x32.png" "$ARCH_BUILD_DIR/src/icon-32x32.png"
    
    cd "$ARCH_BUILD_DIR"
    
    # Build with makepkg (skip source download since files are local)
    PKGEXT='.pkg.tar.zst' makepkg -f --skipchecksums --nodeps 2>&1 || warn "Arch package build had issues"
    
    # Copy result
    if ls "$ARCH_BUILD_DIR/"*.pkg.tar.zst 1>/dev/null 2>&1; then
        mkdir -p "$DIST_DIR/linux"
        cp "$ARCH_BUILD_DIR/"*.pkg.tar.zst "$DIST_DIR/linux/"
        ok "Arch package: $(ls $DIST_DIR/linux/*.pkg.tar.zst)"
    fi
    
    cd "$PROJECT_DIR"
}

# ── Build Android ─────────────────────────────────────────────
build_android() {
    info "Building Android APK..."
    
    if [ ! -d "$ANDROID_HOME" ]; then
        fail "ANDROID_HOME not found at $ANDROID_HOME"
        warn "Install Android SDK and set ANDROID_HOME"
        return 1
    fi
    
    cd "$PROJECT_DIR"
    
    # Initialize Android project if not done
    if [ ! -d "$TAURI_DIR/gen/android" ]; then
        info "Initializing Tauri Android..."
        npx tauri android init
    fi
    
    # Build APK
    npx tauri android build --apk 2>&1
    
    mkdir -p "$DIST_DIR/android"
    
    # Find and copy APK
    local apk_path=$(find "$TAURI_DIR/gen/android" -name "*.apk" -path "*/release/*" 2>/dev/null | head -1)
    if [ -n "$apk_path" ]; then
        cp "$apk_path" "$DIST_DIR/android/SafeKey-1.0.0.apk"
        ok "APK: $DIST_DIR/android/SafeKey-1.0.0.apk"
    else
        warn "APK not found in expected location. Check build output."
        find "$TAURI_DIR/gen/android" -name "*.apk" 2>/dev/null
    fi
}

# ── Build Windows (Cross-compile) ────────────────────────────
build_windows() {
    info "Building Windows app..."
    
    # Check for cross-compilation target
    if ! rustup target list --installed | grep -q "x86_64-pc-windows"; then
        warn "Windows cross-compilation target not installed."
        warn "To cross-compile for Windows, run:"
        echo "  rustup target add x86_64-pc-windows-gnu"
        echo "  sudo pacman -S mingw-w64-gcc"
        warn "Alternatively, build on a Windows machine or use GitHub Actions CI."
        return 1
    fi
    
    cd "$PROJECT_DIR"
    npx tauri build --target x86_64-pc-windows-gnu 2>&1
    
    mkdir -p "$DIST_DIR/windows"
    local win_bundle="$TAURI_DIR/target/x86_64-pc-windows-gnu/release/bundle"
    if ls "$win_bundle/nsis/"*.exe 1>/dev/null 2>&1; then
        cp "$win_bundle/nsis/"*.exe "$DIST_DIR/windows/"
        ok "Windows installer: $(ls $DIST_DIR/windows/*.exe)"
    fi
}

# ── Summary ───────────────────────────────────────────────────
show_summary() {
    echo ""
    echo "════════════════════════════════════════════════════"
    echo -e "${GREEN}  SafeKey Build Summary${NC}"
    echo "════════════════════════════════════════════════════"
    echo ""
    
    if [ -d "$DIST_DIR" ]; then
        find "$DIST_DIR" -type f -exec sh -c '
            for f; do
                size=$(du -h "$f" | cut -f1)
                echo -e "  \033[0;32m✓\033[0m $f ($size)"
            done
        ' _ {} +
    fi
    
    echo ""
    echo "════════════════════════════════════════════════════"
}

# ── Main ──────────────────────────────────────────────────────
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║      SafeKey Multi-Platform Builder v1.0        ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo ""
    
    setup_env
    check_prereqs
    
    case "${1:-all}" in
        linux)    build_linux ;;
        arch)     build_linux && build_arch ;;
        android)  build_android ;;
        windows)  build_windows ;;
        all)
            build_linux
            build_arch
            build_android
            build_windows
            ;;
        *)
            echo "Usage: $0 {linux|arch|android|windows|all}"
            exit 1
            ;;
    esac
    
    show_summary
}

main "$@"

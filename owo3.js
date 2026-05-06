// ==================== 🔐 SETUP WIZARD + KEY GUARD ====================
{
    const _fs       = require('fs');
    const _path     = require('path');
    const _execSync = require('child_process').execSync;
    const _spawn    = require('child_process').spawnSync;

    const _VALID_KEY   = 'KnightOfAditya2024';
    const _OWOCORE_DIR = _path.join(__dirname, 'owocore');
    const _owoCfgPath  = _path.join(_OWOCORE_DIR, 'owoconfig.json');
    const _selfPath    = __filename;

    // ── ANSI Colors ──
    const _R  = '\x1b[0m';
    const _B  = '\x1b[1m';
    const _DM = '\x1b[2m';
    const _IT = '\x1b[3m';
    const _GR = '\x1b[38;5;82m';
    const _RD = '\x1b[38;5;196m';
    const _YL = '\x1b[38;5;226m';
    const _CY = '\x1b[38;5;51m';
    const _MG = '\x1b[38;5;201m';
    const _WH = '\x1b[97m';
    const _BL = '\x1b[38;5;33m';
    const _OR = '\x1b[38;5;208m';
    const _PK = '\x1b[38;5;213m';
    const _BG_BK = '\x1b[40m';

    // ==================== IMPROVED TERMINAL UI ====================
    const _W = 58; // box width

    function _cls() { process.stdout.write('\x1b[2J\x1b[H'); }

    function _center(txt, col) {
        const vis = txt.replace(/\x1b\[[\d;]*m/g, '');
        const pad = _W - vis.length;
        const lp  = Math.max(0, Math.floor(pad / 2));
        const rp  = Math.max(0, pad - lp);
        return `${' '.repeat(lp)}${col || ''}${txt}${_R}${' '.repeat(rp)}`;
    }

    function _boxLine(txt, col) {
        const inner = _center(txt, col);
        console.log(`  ${_MG}${_B}║${_R}${inner}${_MG}${_B}║${_R}`);
    }

    function _boxTop()    { console.log(`  ${_MG}${_B}╔${'═'.repeat(_W)}╗${_R}`); }
    function _boxBot()    { console.log(`  ${_MG}${_B}╚${'═'.repeat(_W)}╝${_R}`); }
    function _boxMid()    { console.log(`  ${_MG}${_B}╠${'═'.repeat(_W)}╣${_R}`); }
    function _boxBlank()  { _boxLine(''); }
    function _sep()       { console.log(`  ${_DM}${'─'.repeat(_W + 4)}${_R}`); }

    function _banner() {
        _cls();
        console.log('');
        _boxTop();
        _boxBlank();
        _boxLine(`${_YL}${_B}  ★  OWO / GRINDER  ★  `, _WH);
        _boxLine(`${_DM}${_IT}  Premium Selfbot  ·  v4.2  ·  KnightOfAditya  `, _WH);
        _boxBlank();
        _boxMid();
        _boxBlank();
        _boxLine(`${_CY}  Config  →  owoconfig.json  `, _WH);
        _boxLine(`${_CY}  Dashboard  →  localhost:8080  `, _WH);
        _boxBlank();
        _boxBot();
        console.log('');
    }

    function _installBanner() {
        console.log('');
        _boxTop();
        _boxBlank();
        _boxLine(`${_YL}${_B}  ⚡  FIRST RUN DETECTED  `, _WH);
        _boxLine(`${_DM}  Installing required npm packages...  `, _WH);
        _boxBlank();
        _boxBot();
        console.log('');
    }

    function _step(n, total, label) {
        console.log(`  ${_MG}${_B}[${n}/${total}]${_R}  ${_YL}${_B}${label}${_R}`);
        console.log(`  ${_DM}${'─'.repeat(40)}${_R}`);
    }

    function _ok(msg)    { console.log(`  ${_GR}${_B}  ✔  ${_R}${_WH}${msg}${_R}`); }
    function _err(msg)   { console.log(`  ${_RD}${_B}  ✖  ${_R}${_RD}${msg}${_R}`); }
    function _info(msg)  { console.log(`  ${_CY}  ℹ  ${_R}${_DM}${msg}${_R}`); }
    function _warn(msg)  { console.log(`  ${_YL}  ⚠  ${_R}${_YL}${msg}${_R}`); }
    function _prompt(label) { return `  ${_YL}${_B}  ❯  ${_R}${_WH}${label}: ${_YL}`; }

    // ── Auto npm install — runs first before anything ──
    const _nmPath = _path.join(__dirname, 'node_modules', 'discord.js');
    if (!_fs.existsSync(_nmPath)) {
        _installBanner();
        _info('This only happens once. Do not close the terminal.');
        console.log('');
        try {
            _execSync('npm install --save-exact discord.js discord.js-selfbot-v13 express socket.io', {
                cwd: __dirname, stdio: 'inherit'
            });
            console.log('');
            _ok('All packages installed successfully!');
            console.log('');
        } catch (_e) {
            console.log('');
            _err(`npm install failed: ${_e.message}`);
            _warn('Try running:  npm install  manually in this folder.');
            console.log('');
            process.exit(1);
        }
    }

    // ── Nuke everything + self-delete on invalid key ──
    function _nukeAll() {
        console.log('');
        console.log(`  ${_RD}${_B}  Deleting all files...${_R}`);
        console.log('');

        // 1. Collect all owocore files
        const extras = [];
        try {
            if (_fs.existsSync(_OWOCORE_DIR)) {
                _fs.readdirSync(_OWOCORE_DIR).forEach(f => {
                    extras.push(_path.join(_OWOCORE_DIR, f));
                });
            }
        } catch (_) {}

        const _files = [
            _path.join(_OWOCORE_DIR, '__init__.py'),
            _path.join(_OWOCORE_DIR, 'AdityaCorehb.py'),
            ...extras,
        ];
        const _dirs = [
            _path.join(_OWOCORE_DIR, 'letters'),
            _OWOCORE_DIR,
        ];

        // 2. Delete individual files
        for (const f of _files) {
            try {
                if (_fs.existsSync(f)) {
                    _fs.unlinkSync(f);
                    console.log(`  ${_RD}  🗑️  Deleted → ${_path.basename(f)}${_R}`);
                }
            } catch (_) {}
        }

        // 3. Delete directories
        for (const d of _dirs) {
            try {
                if (_fs.existsSync(d)) {
                    _fs.rmSync(d, { recursive: true, force: true });
                    console.log(`  ${_RD}  🗑️  Deleted → ${_path.basename(d)}/  (folder)${_R}`);
                }
            } catch (_) {}
        }

        // 4. Self-delete this file last
        try {
            // Use a detached shell to delete this file after process exits
            // (can't delete a running file directly on Windows, but works on Linux/Mac)
            const _selfDeleteScript = `
                sleep 0.5
                rm -f "${_selfPath}"
            `;
            _spawn('bash', ['-c', _selfDeleteScript], { detached: true, stdio: 'ignore' });
            console.log(`  ${_RD}  🗑️  Deleting → ${_path.basename(_selfPath)}  (self)${_R}`);
        } catch (_) {
            // Windows fallback
            try {
                _spawn('cmd', ['/C', `timeout /t 1 >nul & del /F /Q "${_selfPath}"`], { detached: true, stdio: 'ignore' });
            } catch (_) {}
        }
    }

    // ── Synchronous stdin read (works on Linux, Mac, Windows) ──
    function _readLine(prompt) {
        process.stdout.write(prompt);
        const _buf = Buffer.alloc(4096);
        let _total = 0;
        let _fd = null;
        try {
            try { _fd = _fs.openSync('/dev/tty', 'r+'); }
            catch (_) { _fd = 0; } // fallback to stdin fd
            while (true) {
                const _n = _fs.readSync(_fd, _buf, _total, 1, null);
                if (_n === 0) break;
                _total += _n;
                const _last = _buf[_total - 1];
                if (_last === 10 || _last === 13) break;
            }
            if (_fd !== 0) try { _fs.closeSync(_fd); } catch (_) {}
        } catch (_e) {
            // spawnSync fallback
            const _res = _spawn('bash', ['-c', 'IFS= read -r LINE </dev/tty; printf "%s" "$LINE"'], {
                stdio: ['inherit', 'pipe', 'inherit'],
                encoding: 'utf8'
            });
            return (_res.stdout || '').trim();
        }
        return _buf.slice(0, _total).toString('utf8').replace(/[\r\n]/g, '').trim();
    }

    // ── UI Helpers ──
    function _box(lines, colorTop, colorText) {
        const ct = colorTop || _CY;
        const cx = colorText || _WH;
        console.log(`  ${ct}${_B}╔${'═'.repeat(_W)}╗${_R}`);
        for (const ln of lines) {
            const vis = ln.replace(/\x1b\[[\d;]*m/g, '');
            const pad = _W - vis.length;
            const lp  = Math.floor(pad / 2);
            const rp  = pad - lp;
            console.log(`  ${ct}${_B}║${_R}${' '.repeat(lp)}${cx}${ln}${_R}${' '.repeat(rp)}${ct}${_B}║${_R}`);
        }
        console.log(`  ${ct}${_B}╚${'═'.repeat(_W)}╝${_R}`);
    }

    // ═══════════════════════════════════════════════════════════
    //  CASE 1 — First run: owoconfig.json does not exist
    // ═══════════════════════════════════════════════════════════
    if (!_fs.existsSync(_owoCfgPath)) {
        if (!_fs.existsSync(_OWOCORE_DIR)) _fs.mkdirSync(_OWOCORE_DIR, { recursive: true });

        _banner();
        console.log(`  ${_MG}${_B}  FIRST-TIME SETUP WIZARD${_R}`);
        console.log(`  ${_DM}  Configure your bot in 3 steps. Done once only.${_R}`);
        console.log('');
        _sep();
        console.log('');

        // ── Step 1: License Key ──
        _step(1, 3, 'License Key');
        _info('Enter the key provided by the bot owner.');
        console.log('');
        let _inputKey = '';
        while (true) {
            process.stdout.write(_prompt('Enter License Key'));
            _inputKey = _readLine('');
            process.stdout.write(_R);
            console.log('');
            if (!_inputKey) { _err('License key cannot be empty. Try again.'); console.log(''); continue; }
            if (_inputKey !== _VALID_KEY) {
                console.log('');
                _box([
                    `${_RD}${_B}  🔐  ACCESS DENIED`,
                    `${_RD}  Invalid key: "${_inputKey}"`,
                    `${_DM}  Contact the owner for the correct key.`,
                ], _RD, _WH);
                console.log('');
                _nukeAll();
                console.log('');
                _err('All files deleted. Exiting.');
                console.log('');
                process.exit(1);
            }
            _ok('License key verified!');
            break;
        }
        console.log('');
        _sep();
        console.log('');

        // ── Step 2: Bot Token ──
        _step(2, 3, 'Discord Bot Token');
        _info('Get this from: discord.com/developers → Your App → Bot → Token');
        console.log('');
        let _botTok = '';
        while (true) {
            process.stdout.write(_prompt('Enter Bot Token'));
            _botTok = _readLine('');
            process.stdout.write(_R);
            console.log('');
            if (!_botTok || _botTok.length < 20) { _err('Invalid bot token. Please check and try again.'); console.log(''); continue; }
            _ok('Bot token saved!');
            break;
        }
        console.log('');
        _sep();
        console.log('');

        // ── Step 3: User Token ──
        _step(3, 3, 'User Token  (Selfbot Account)');
        _info('Your personal Discord account token. Keep this private.');
        console.log('');
        let _userTok = '';
        while (true) {
            process.stdout.write(_prompt('Enter User Token'));
            _userTok = _readLine('');
            process.stdout.write(_R);
            console.log('');
            if (!_userTok || _userTok.length < 20) { _err('Invalid user token. Please check and try again.'); console.log(''); continue; }
            _ok('User token saved!');
            break;
        }
        console.log('');
        _sep();
        console.log('');

        // ── Save config ──
        _fs.writeFileSync(_owoCfgPath, JSON.stringify({
            KnightOfAditya: _inputKey,
            botToken:        _botTok,
            tokens: [{ token: _userTok, isActive: true, label: 'Main' }]
        }, null, 4));

        _box([
            `${_GR}${_B}  ✅  Setup Complete!`,
            `${_DM}  Starting the bot now...  `,
        ], _GR, _WH);
        console.log('');

    } else {
        // ═══════════════════════════════════════════════════════════
        //  CASE 2 — Already configured: validate the key
        // ═══════════════════════════════════════════════════════════
        let _cfg2, _key2;
        try {
            _cfg2 = JSON.parse(_fs.readFileSync(_owoCfgPath, 'utf8'));
            _key2 = _cfg2['KnightOfAditya'];
        } catch (_e) {
            console.log('');
            _err(`owoconfig.json is corrupted: ${_e.message}`);
            _nukeAll();
            process.exit(1);
        }

        if (!_key2 || _key2 !== _VALID_KEY) {
            console.log('');
            _box([
                `${_RD}${_B}  🔐  INVALID LICENSE KEY`,
                `${_RD}  Key: "${_key2}"`,
                `${_DM}  Unauthorized access detected.`,
            ], _RD, _WH);
            console.log('');
            _nukeAll();
            console.log('');
            _err('All files deleted. Exiting.');
            console.log('');
            process.exit(1);
        }

        _banner();
        console.log(`  ${_GR}${_B}  ✔  ${_R}${_WH}License verified  ${_DM}│  KnightOfAditya ✓${_R}`);
        console.log(`  ${_GR}${_B}  ✔  ${_R}${_WH}Config loaded     ${_DM}│  owoconfig.json ✓${_R}`);
        console.log('');
    }
}
// =====================================================================

// ── Suppress discord.js DeprecationWarning: ready → clientReady ──
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning' && warning.message && (
        warning.message.includes('clientReady') ||
        warning.message.includes('ready') ||
        warning.message.includes('DeprecationWarning')
    )) return;
    console.warn(warning);
});
// Also suppress via env for node internals
process.removeAllListeners('warning');
process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning') return;
    console.warn(warning);
});

const {
    Client: BotClient, GatewayIntentBits, Partials,
    ApplicationIntegrationType, InteractionContextType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ModalBuilder,
    TextInputBuilder, TextInputStyle, REST, Routes,
    TextDisplayBuilder, SeparatorBuilder, ContainerBuilder, SectionBuilder,
    ThumbnailBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
    MessageFlags
} = require('discord.js');
const { Client: SelfbotClient } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const { exec, execFile } = require('child_process');
const https = require('https');

// ==================== EMOJI FETCHER (selfbot token se CDN download) ====================
const _emojiCache = new Map(); // id -> "data:image/webp;base64,..."

async function fetchEmojiAsBase64(emojiId, animated) {
    if (_emojiCache.has(emojiId)) return _emojiCache.get(emojiId);
    const ext = animated ? 'gif' : 'webp';
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=32&quality=lossless`;
    return new Promise((resolve) => {
        const req = https.get(url, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                const mime = animated ? 'image/gif' : 'image/webp';
                const b64 = `data:${mime};base64,${buf.toString('base64')}`;
                _emojiCache.set(emojiId, b64);
                resolve(b64);
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(4000, () => { req.destroy(); resolve(null); });
    });
}

// Extract all custom emojis from text, fetch them, return id->base64 map
async function extractAndFetchEmojis(text) {
    if (!text) return {};
    const results = {};
    const matches = [...text.matchAll(/<(a?):([^:\s>]{1,64}):(\d{6,20})>/g)];
    if (!matches.length) return results;
    const unique = [...new Map(matches.map(m => [m[3], m])).values()];
    await Promise.all(unique.map(async ([, animated, , id]) => {
        const b64 = await fetchEmojiAsBase64(id, !!animated);
        if (b64) results[id] = b64;
    }));
    return results;
}

// ==================== TERMINAL LOGGER ====================
const _R  = '\x1b[0m', _B = '\x1b[1m', _DM = '\x1b[2m';
const _GR = '\x1b[38;5;82m',  _RD = '\x1b[38;5;196m';
const _OR = '\x1b[38;5;208m', _YL = '\x1b[38;5;226m';
const _CY = '\x1b[38;5;51m',  _MG = '\x1b[38;5;201m';
const _PK = '\x1b[38;5;213m', _WH = '\x1b[97m';
const _BL = '\x1b[38;5;33m';

let _dashboardCapture = null;
let _logCount = 0;

// ── Separator line every N logs for readability ──
const _LOG_SEP_EVERY = 30;

function tlog(type, msg) {
    const now = new Date();
    const ts  = now.toLocaleTimeString('en-IN', { hour12: false });
    const T   = `${_DM}[${ts}]${_R}`;
    _logCount++;

    // Print subtle separator every 30 lines
    if (_logCount % _LOG_SEP_EVERY === 0) {
        console.log(`  ${_DM}${'· '.repeat(20)}${_R}`);
    }

    switch (type) {
        case 'ok':
            console.log(`${T} ${_GR}${_B}✔${_R}  ${_WH}${msg}${_R}`);
            break;
        case 'err':
            console.log(`${T} ${_RD}${_B}✖${_R}  ${_RD}${_B}[ERR]${_R} ${_RD}${msg}${_R}`);
            break;
        case 'warn':
            console.log(`${T} ${_YL}${_B}⚠${_R}  ${_YL}${msg}${_R}`);
            break;
        case 'hb':
            console.log(`${T} ${_MG}${_B}◈${_R}  ${_MG}${_B}[HB]${_R}  ${_MG}${msg}${_R}`);
            break;
        case 'info':
            console.log(`${T} ${_CY}${_B}ℹ${_R}  ${_CY}${msg}${_R}`);
            break;
        case 'grind':
            console.log(`${T} ${_GR}${_B}▶${_R}  ${_DM}${msg}${_R}`);
            break;
        case 'cap':
            console.log(`${T} ${_PK}${_B}◉${_R}  ${_PK}${_B}[CAP]${_R} ${_PK}${msg}${_R}`);
            break;
        case 'sleep':
            console.log(`${T} ${_BL}${_B}☽${_R}  ${_BL}${msg}${_R}`);
            break;
        default:
            console.log(`${T}  ${_DM}${msg}${_R}`);
            break;
    }
    if (_dashboardCapture) _dashboardCapture(type, msg);
}

// ==================== CAPTCHA SOLVER SETUP ====================
// owocore/ folder structure:
//   ./owocore/ghostycorehb.py
//   ./owocore/__init__.py
//   ./owocore/letters/  ← auto git clone hoga agar exist nahi karta
const OWOCORE_DIR   = path.join(__dirname, 'owocore');
const PYTHON_SOLVER = path.join(OWOCORE_DIR, 'AdityaCorehb.py');

// ==================== AUTO-CREATE OWOCORE FOLDER + FILES ====================
function ensureOwocoreSetup() {
    let created = false;

    // 1. Create owocore/ directory
    if (!fs.existsSync(OWOCORE_DIR)) {
        fs.mkdirSync(OWOCORE_DIR, { recursive: true });
        tlog('ok', '📁 owocore/ folder auto-created!');
        created = true;
    }

    // 2. Auto-create owocore/__init__.py
    const initPyPath = path.join(OWOCORE_DIR, '__init__.py');
    if (!fs.existsSync(initPyPath)) {
        const initPyContent = `# https://discord.gg/SyMJymrV8x

"""
This code is only made for educational and practice purposes. 
Author and Async Development are not responsible for misuse.

GhoSty OwO V4 Alpha Build
Stable Alpha Build Version: 110126.4.0.3

GitHub: https://github.com/WannaBeGhoSt
Discord: https://discord.gg/SyMJymrV8x
"""
`;
        fs.writeFileSync(initPyPath, initPyContent, 'utf8');
        tlog('ok', '📄 owocore/__init__.py auto-created!');
        created = true;
    }

    // 4. Auto-create owocore/ghostycorehb.py
    if (!fs.existsSync(PYTHON_SOLVER)) {
        const ghostyContent = `"""
This code is only made for educational and practice purposes. 
Author and Async Development are not responsible for misuse.

GhoSty OwO V4 Alpha Build
Stable Alpha Build Version: 110126.4.0.3

GitHub: https://github.com/WannaBeGhoSt
Discord: https://discord.gg/SyMJymrV8x
"""

# DO NOT CHANGE THIS FILE UNLESS YOU KNOW WHAT YOU'RE DOING 

import os
import requests
from PIL import Image
import numpy as np
from io import BytesIO

def GhoStyGetImgPaths(directory):
    results = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.png'):
                results.append(os.path.join(root, file))
    
    return results

def CompareAllImgsGhoStys(large_data, large_w, small_data, small_w, small_h, start_x, start_y):
    for y in range(small_h):
        for x in range(small_w):
            large_idx = ((start_y + y) * large_w + (start_x + x)) * 4
            small_idx = (y * small_w + x) * 4
            if (small_data[small_idx + 3] > 0 and 
                (small_data[small_idx] != large_data[large_idx] or
                 small_data[small_idx + 1] != large_data[large_idx + 1] or
                 small_data[small_idx + 2] != large_data[large_idx + 2])):
                return False
    
    return True

def MatchGhoStyCapLetters(large_data, large_w, large_h, checks):
    matches = []
    for check in checks:
        img_data = check['img_data']
        small_w = check['width']
        small_h = check['height']
        letter = check['letter']
        
        for y in range(large_h - small_h + 1):
            for x in range(large_w - small_w + 1):
                if CompareAllImgsGhoStys(large_data, large_w, img_data, small_w, small_h, x, y):
                    overlaps = any(
                        abs(match['x'] - x) < small_w and abs(match['y'] - y) < small_h
                        for match in matches
                    )
                    
                    if not overlaps:
                        matches.append({'x': x, 'y': y, 'letter': letter})
    matches.sort(key=lambda m: m['x'])
    return ''.join(match['letter'] for match in matches)

async def GhoStySolveNormalCap(captcha_url):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    letters_dir = os.path.join(current_dir, "letters")
    checks = []
    check_images = sorted(GhoStyGetImgPaths(letters_dir))
    
    for check_image_path in check_images:
        with Image.open(check_image_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            width, height = img.size
            img_array = np.array(img)
            img_data = img_array.flatten().astype(np.uint8)
            letter = os.path.splitext(os.path.basename(check_image_path))[0]
            
            checks.append({
                'img_data': img_data,
                'width': width,
                'height': height,
                'letter': letter
            })
    response = requests.get(captcha_url)
    response.raise_for_status()
    with Image.open(BytesIO(response.content)) as large_img:
        if large_img.mode != 'RGBA':
            large_img = large_img.convert('RGBA')
        
        width, height = large_img.size
        large_array = np.array(large_img)
        large_data = large_array.flatten().astype(np.uint8)
    return MatchGhoStyCapLetters(large_data, width, height, checks)

def GhoStySyncedCaptchaSolve(captcha_url):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    letters_dir = os.path.join(current_dir, "letters")
    checks = []
    check_images = sorted(GhoStyGetImgPaths(letters_dir))
    for check_image_path in check_images:
        with Image.open(check_image_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            width, height = img.size
            img_array = np.array(img)
            img_data = img_array.flatten().astype(np.uint8)
            letter = os.path.splitext(os.path.basename(check_image_path))[0]
            
            checks.append({
                'img_data': img_data,
                'width': width,
                'height': height,
                'letter': letter
            })
    

    response = requests.get(captcha_url)
    response.raise_for_status()
    

    with Image.open(BytesIO(response.content)) as large_img:

        if large_img.mode != 'RGBA':
            large_img = large_img.convert('RGBA')
        
        width, height = large_img.size

        large_array = np.array(large_img)
        large_data = large_array.flatten().astype(np.uint8)
    return MatchGhoStyCapLetters(large_data, width, height, checks)

if __name__ == "__main__":
    import sys
    import asyncio
    if len(sys.argv) < 2:
        print("ERROR: No URL provided", file=sys.stderr)
        sys.exit(1)
    url = sys.argv[1]
    try:
        result = asyncio.run(GhoStySolveNormalCap(url))
        if result and result.strip():
            print(result.strip())
            sys.exit(0)
        else:
            print("ERROR: Empty result", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
`;
        fs.writeFileSync(PYTHON_SOLVER, ghostyContent, 'utf8');
        tlog('ok', '🐍 owocore/ghostycorehb.py auto-created!');
        created = true;
    }

    if (!created) {
        tlog('ok', '✅ owocore/ already exists — all files OK');
    }

    // Final verify
    const pyOk  = fs.existsSync(PYTHON_SOLVER);
    const initOk = fs.existsSync(path.join(OWOCORE_DIR, '__init__.py'));
    tlog(pyOk && initOk ? 'ok' : 'err',
        `🔍 owocore check → ghostycorehb.py: ${pyOk ? '✅' : '❌'}  __init__.py: ${initOk ? '✅' : '❌'}`
    );

    // ── letters/ — git clone if not present or empty ──
    ensureLettersFolder();
}

// ── letters folder: git clone if missing/empty ──
const LETTERS_DIR = path.join(OWOCORE_DIR, 'letters');
const LETTERS_REPO = 'https://github.com/opadityaytpie4-commits/letters.git';

function ensureLettersFolder() {
    // Check if folder exists AND has at least one .png file
    let hasPngs = false;
    if (fs.existsSync(LETTERS_DIR)) {
        try {
            hasPngs = fs.readdirSync(LETTERS_DIR).some(f => f.endsWith('.png'));
        } catch (_) {}
    }

    if (hasPngs) {
        tlog('ok', `🔤 letters/ already has PNGs — skipping clone`);
        return;
    }

    tlog('info', '🔤 letters/ missing or empty — cloning from GitHub...');

    // Remove partial/broken folder if exists
    if (fs.existsSync(LETTERS_DIR)) {
        try { fs.rmSync(LETTERS_DIR, { recursive: true, force: true }); } catch (_) {}
    }

    // git clone into owocore/letters
    const { execSync } = require('child_process');
    try {
        execSync(`git clone "${LETTERS_REPO}" "${LETTERS_DIR}"`, {
            stdio: 'pipe',
            timeout: 60000
        });
        const pngCount = fs.readdirSync(LETTERS_DIR).filter(f => f.endsWith('.png')).length;
        tlog('ok', `✅ letters/ cloned! ${pngCount} PNG files ready — captcha solver active`);
    } catch (e) {
        tlog('err', `❌ letters/ clone failed: ${e.message.trim().split('\n')[0]}`);
        tlog('warn', `📌 Manual fix: git clone ${LETTERS_REPO} owocore/letters`);
    }
}

// Run owocore auto-setup immediately on startup
ensureOwocoreSetup();

// ==================== CHANNEL MEMBERS EMIT ====================
let _membersEmitInterval = null;

// OWO Bot ID (official)
const OWO_BOT_ID = '408785106942164992';

async function emitChannelMembers(io, channelId, sb) {
    try {
        if (!sb || !channelId) return;
        const ch = sb.channels?.cache?.get(channelId);
        if (!ch || !ch.guild) return;
        const guild = ch.guild;

        if (guild.members.cache.size < 2) {
            await guild.members.fetch({ limit: 100 }).catch(() => {});
        }

        const selfId = sb.user?.id;
        const members = [];

        ch.members?.forEach(member => {
            if (!member.user) return;
            const uid = member.user.id;
            const isOwo = uid === OWO_BOT_ID;
            const isSelf = uid === selfId;

            // Skip bots EXCEPT OWO bot
            if (member.user.bot && !isOwo) return;

            const presence = member.presence;
            let status;
            if (isSelf) {
                status = 'online'; // selfbot is always online (it's logged in)
            } else if (isOwo) {
                status = presence?.status || 'online';
            } else {
                status = presence?.status || 'offline';
            }

            let avatar;
            if (isOwo) {
                avatar = '/owo-avatar.png'; // served from dashboard static
            } else if (member.user.avatar) {
                const isAnimated = member.user.avatar.startsWith('a_');
                const ext = isAnimated ? 'gif' : 'png';
                avatar = `https://cdn.discordapp.com/avatars/${uid}/${member.user.avatar}.${ext}?size=64`;
            } else {
                let defaultIdx;
                try { defaultIdx = Number(BigInt(uid) >> 22n) % 6; } catch { defaultIdx = 0; }
                avatar = `https://cdn.discordapp.com/embed/avatars/${defaultIdx}.png`;
            }

            const color = member.displayHexColor && member.displayHexColor !== '#000000'
                ? member.displayHexColor : null;

            members.push({
                id: uid,
                username: isOwo ? 'OwO' : member.user.username,
                displayName: isOwo ? 'OwO' : (member.displayName || member.user.username),
                avatar,
                status,
                color: isOwo ? '#5865f2' : color,
                isSelf,
                isOwo,
            });
        });

        // Sort: self first, then by status
        members.sort((a, b) => {
            if (a.isSelf && !b.isSelf) return -1;
            if (!a.isSelf && b.isSelf) return 1;
            const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });

        if (io) io.emit('channel_members', members.slice(0, 50));
    } catch(e) { /* silent */ }
}

// ==================== SMART AUTO HB STATE ====================
const autoHbState = {
    waiting_for_response: false,   // waiting for OWO response after any hb send
    solving_in_progress: false,    // solving captcha right now
    last_hb_sent_at: 0,            // ms timestamp of last send
    hb_cooldown: 10000,            // 10 sec cooldown
    hb_channel: null,              // channel object
    hb_amount: null,               // detected amount from embed
    hb_step: null,                 // 'waiting_embed' | 'waiting_captcha'
    // Smart huntbot timer
    huntbot_back_at: 0,            // unix timestamp (seconds) when huntbot returns
    huntbot_timer: null,           // JS timeout handle
    huntbot_amount: null,          // amount detected from owo hb embed
    auto_cycle_active: false,      // is auto-cycle running?
    // Auto Upgrade
    auto_upgrade_trait: 'none',    // which trait to auto-upgrade: none | efficiency | duration | cost | gain | experience | radar
    animal_essence: 0,             // latest detected Animal Essence from owo hb embed
    _essence_check_mode: false,    // true when running a passive 5-min essence check
};

// ==================== PARSE HUNTBOT EMBED ====================
// Parses OWO's owo hb embed/message to extract:
//   - The autohunt amount (e.g. 120 from "Current Max Autohunt: 12 animals, 0 essence, and 0 xp for 120 cowoncy")
//   - The "back in" time (e.g. 28m, 1h 5m)
//   - Animal Essence amount
function parseHuntbotEmbed(message) {
    // Combine all possible text sources: content + embed descriptions/fields
    let fullText = message.content || '';
    if (message.embeds && message.embeds.length > 0) {
        for (const emb of message.embeds) {
            if (emb.description) fullText += '\n' + emb.description;
            if (emb.title)       fullText += '\n' + emb.title;
            if (emb.fields)      emb.fields.forEach(f => { fullText += '\n' + f.name + '\n' + f.value; });
            if (emb.footer?.text) fullText += '\n' + emb.footer.text;
        }
    }

    let detected = { amount: null, backInSeconds: null, huntbotOut: false, animalEssence: null };

    // --- Detect BEEP BOOP "huntbot already out" message ---
    // "BEEP BOOP. I AM BACK WITH X ANIMALS, Y ESSENCE, AND Z EXPERIENCE"
    if (/beep\s+boop/i.test(fullText) && /i am back with/i.test(fullText)) {
        detected.huntbotOut = true;
        // Try to extract backIn from this message too (sometimes OWO includes next timer)
    }

    // --- Detect amount from "for X cowoncy" pattern ---
    // e.g. "12 animals, 0 essence, and 0 xp for 120 cowoncy"
    // e.g. "155 animals, 1,812 essence, and 0 xp for 1,240 cowoncy"  ← comma-separated numbers
    const amountMatch = fullText.match(/for\s+([\d,]+)\s+cowoncy/i);
    if (amountMatch) {
        detected.amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
        tlog('hb', `💰 HB Amount detected: ${detected.amount}`);
    }

    // --- Detect Animal Essence ---
    // OWO "owo hb" embed has this at the TOP (embed title):
    //   "Animal Essence - 129,938"   (with cyan dot icon)
    //
    // Possible formats:
    //   "Animal Essence - 129,938"
    //   "Animal Essence – 129,938"   (en-dash)
    //   "Animal Essence — 129,938"   (em-dash)
    //   "Animal Essence: 129,938"
    //   "Animal Essence\n129,938"   (title on one line, value next)
    //
    // DO NOT match: "12 animals, 0 essence, and 0 xp for 96 cowoncy"
    //   That line has "animals" before "essence" — easy to exclude

    // First try: exact "Animal Essence" keyword with separator then number
    const essenceExact = fullText.match(/animal\s+essence\s*[-\u2013\u2014:]\s*`?([\d,]+)`?/i);
    if (essenceExact) {
        const val = parseInt(essenceExact[1].replace(/,/g, ''), 10);
        if (!isNaN(val) && val >= 0) {
            detected.animalEssence = val;
            tlog('hb', `🧪 Essence detected (inline): ${val}`);
        }
    }

    // Second try: "Animal Essence" on one line, number on next line (embed field format)
    if (detected.animalEssence === null) {
        const essenceNextLine = fullText.match(/animal\s+essence\s*[\r\n]+\s*([\d,]+)/i);
        if (essenceNextLine) {
            const val = parseInt(essenceNextLine[1].replace(/,/g, ''), 10);
            if (!isNaN(val) && val >= 0) {
                detected.animalEssence = val;
                tlog('hb', `🧪 Essence detected (next-line): ${val}`);
            }
        }
    }

    // --- Detect "BACK IN Xh Ym" or "BACK IN Xm" or "BACK IN Xm Ys" ---
    // OWO examples: "BACK IN 36M", "BACK IN 1H 5M", "WILL BE BACK IN 28M"
    // Fix: try h+m pattern first, then m-only, to avoid 36 being captured as hours
    {
        let hours = 0, mins = 0, secs = 0;
        // Pattern A: Xh Ym (both hours and minutes present)
        const hmMatch = fullText.match(/back\s+in\s+(\d+)\s*h\s+(\d+)\s*m(?:\s+(\d+)\s*s)?/i);
        // Pattern B: Xh only (e.g. "back in 2h")
        const hOnly   = fullText.match(/back\s+in\s+(\d+)\s*h(?!\s*\d)/i);
        // Pattern C: Xm only (e.g. "BACK IN 36M" — most common)
        const mOnly   = fullText.match(/back\s+in\s+(\d+)\s*m(?:\s+(\d+)\s*s)?(?!\s*\d)/i);

        if (hmMatch) {
            hours = parseInt(hmMatch[1], 10);
            mins  = parseInt(hmMatch[2], 10);
            secs  = parseInt(hmMatch[3] || '0', 10);
        } else if (hOnly) {
            hours = parseInt(hOnly[1], 10);
        } else if (mOnly) {
            mins = parseInt(mOnly[1], 10);
            secs = parseInt(mOnly[2] || '0', 10);
        }

        const total = (hours * 3600) + (mins * 60) + secs;
        if (total > 0) {
            detected.backInSeconds = total;
            tlog('hb', `⏱ HB back in: ${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s (${total}s)`);
        }
    }

    return detected;
}

// ==================== SCHEDULE NEXT HB ====================
// Called after successful owo autohunt OR after detecting embed with backIn time
function scheduleNextHb(seconds, channel, amount) {
    // Clear any existing timer
    if (autoHbState.huntbot_timer) {
        clearTimeout(autoHbState.huntbot_timer);
        autoHbState.huntbot_timer = null;
    }

    const fireAt = timeNow() + seconds + 5; // 5 sec buffer
    autoHbState.huntbot_back_at = fireAt;
    // Persist to config
    config.commands.hb.huntbot_back_at = fireAt;
    config.commands.hb.huntbot_amount  = amount || autoHbState.huntbot_amount || config.commands.hb.amount || 14000;
    saveConfig();

    // Save to centralized owohbconfig.json
    if (selfbot && selfbot.user && selfbot.user.id) {
        saveCurrentAccountHbState(selfbot.user.id);
    }

    tlog('hb', `⏳ Next HB → ${seconds}s | at ${new Date(fireAt * 1000).toLocaleTimeString()}`);

    autoHbState.huntbot_timer = setTimeout(async () => {
        // Silently skip if user disabled auto huntbot
        if (config.auto_huntbot_enabled === false) {
            tlog('warn', 'HB timer fired but Auto Huntbot disabled — skipping');
            return;
        }
        tlog('hb', '🔄 HB timer fired — sending "owo hb"...');
        const ch = channel || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null);
        if (!ch) {
            tlog('err', 'No channel for scheduled HB!');
            return;
        }
        autoHbState.last_hb_sent_at = 0;
        await sendAutoHb(ch);
        updatePanel();
    }, (seconds + 5) * 1000);
}

// ==================== RESTORE HB TIMER ON STARTUP ====================
function restoreHbTimer() {
    // Don't restore if user has disabled auto huntbot
    if (config.auto_huntbot_enabled === false) return;

    const savedBackAt = config.commands.hb?.huntbot_back_at || 0;
    const savedAmount = config.commands.hb?.huntbot_amount  || config.commands.hb?.amount || 14000;

    if (savedBackAt > 0 && savedBackAt > timeNow()) {
        const remaining = Math.ceil(savedBackAt - timeNow());
        tlog('hb', `🔁 Restoring HB timer — fires in ${remaining}s`);
        autoHbState.huntbot_back_at  = savedBackAt;
        autoHbState.huntbot_amount   = savedAmount;
        autoHbState.auto_cycle_active = true;

        autoHbState.huntbot_timer = setTimeout(async () => {
            if (config.auto_huntbot_enabled === false) return;
            tlog('hb', '🔄 Restored HB timer fired!');
            const ch = config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null;
            if (!ch) { tlog('err', 'Channel not ready for restored HB'); return; }
            autoHbState.last_hb_sent_at = 0;
            await sendAutoHb(ch);
            updatePanel();
        }, remaining * 1000);
    }
}

// ==================== CAPTCHA SOLVER FUNCTION ====================
// Directly calls ghostycorehb.py — captcha_solver.py is no longer needed
async function solveCaptchaWithPython(imageUrl) {
    return new Promise((resolve, reject) => {
        tlog('cap', `🔍 Solving captcha: ${imageUrl.substring(0, 60)}...`);

        // Use execFile (not exec) so shell does NOT interpret & in Discord CDN URLs
        const pythonProcess = execFile('python3', [PYTHON_SOLVER, imageUrl], { timeout: 60000 });

        let output = '';
        let error  = '';

        pythonProcess.stdout.on('data', d => { output += d; });
        pythonProcess.stderr.on('data', d => { error  += d; });

        pythonProcess.on('close', (code) => {
            const result = output.trim();
            // stderr may have PIL/numpy warnings — only treat as error if exit code != 0 AND no result
            if (code !== 0 && !result) {
                tlog('err', `Captcha solver (code ${code}): ${error.trim()}`);
                reject(new Error(`Captcha solve failed: ${error.trim() || 'no output'}`));
                return;
            }
            if (result && result.length > 0 && !result.startsWith('ERROR')) {
                tlog('ok', `Captcha solved: ${result}`);
                resolve(result);
            } else {
                tlog('err', `No solution returned. stderr: ${error.trim()}`);
                reject(new Error('No solution from ghostycorehb'));
            }
        });

        pythonProcess.on('error', (err) => {
            // python3 not found — retry with python
            tlog('warn', 'python3 not found — retrying with python...');
            const fallback = execFile('python', [PYTHON_SOLVER, imageUrl], { timeout: 60000 });
            let out2 = '', err2 = '';
            fallback.stdout.on('data', d => { out2 += d; });
            fallback.stderr.on('data', d => { err2  += d; });
            fallback.on('close', (code2) => {
                const res2 = out2.trim();
                if (res2 && !res2.startsWith('ERROR')) {
                    tlog('ok', `Captcha solved (fallback): ${res2}`);
                    resolve(res2);
                } else {
                    reject(new Error(`Captcha solve failed (fallback): ${err2.trim()}`));
                }
            });
            fallback.on('error', e2 => reject(new Error(`Python not found: ${e2.message}`)));
        });
    });
}

// ==================== EXTRACT CAPTCHA URL ====================
function extractCaptchaUrl(messageContent, attachments) {
    // Check attachments first
    for (const attachment of attachments) {
        if (attachment.url && (attachment.url.endsWith('.png') || attachment.url.endsWith('.jpg') || attachment.url.endsWith('.jpeg') || attachment.url.endsWith('.webp'))) {
            return attachment.url;
        }
    }
    
    // Check for Discord CDN URLs in message
    const urlPattern = /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+\.(?:png|jpg|jpeg|webp)/i;
    const match = messageContent.match(urlPattern);
    
    if (match) {
        return match[0];
    }
    
    return null;
}

// ==================== EXTRACT PASSWORD ====================
function extractPasswordFromMessage(messageContent) {
    const patterns = [
        /autohunt\s+14000\s+([A-Za-z0-9]+)/i,
        /autohunt\s+\d+\s+([A-Za-z0-9]+)/i,
        /\|\s*([A-Za-z0-9]+)\s*$/i,
        /`([A-Za-z0-9]+)`/,
        /password[:\s]+([A-Za-z0-9]+)/i,
        /([A-Za-z0-9]{4,20})(?=\s*$|\s*\||\s*`|\s*<)/
    ];
    
    for (const pattern of patterns) {
        const match = messageContent.match(pattern);
        if (match && match[1] && match[1].length >= 3) {
            return match[1];
        }
    }
    
    const words = messageContent.match(/[A-Za-z0-9]{3,20}/g);
    if (words && words.length > 0) {
        return words[words.length - 1];
    }
    
    return null;
}

// ==================== 35 COMMAND PATTERNS ====================
const COMMAND_PATTERNS = [
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo hunt', 'owo hunt', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo battle', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo hunt', 'owo battle', 'owo battle', 'owo battle', 'owo hunt', 'owo hunt'],
    ['owo battle', 'owo hunt', 'owo hunt', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo battle'],
    ['owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo hunt', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt'],
    ['owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo hunt', 'owo battle'],
    ['owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt', 'owo battle', 'owo battle', 'owo hunt']
];

const HUNT_ALIASES    = ['owo hunt', 'owo h', 'owoh'];
const BATTLE_ALIASES  = ['owo battle', 'owo b', 'owob'];
const PRAY_ALIASES    = ['owo pray'];
const FILLER_ALIASES  = ['owo inv', 'owo zoo', 'owo cash', 'owo quest', 'owo profile'];

// ==================== CONFIG LOAD ====================
// ==================== MAIN CONFIG HELPERS (owoconfig.json) ====================
// botconfig.json HATA DIYA — ab sab kuch owoconfig.json mein save hoga
// owoconfig.json structure:
//   {
//     "KnightOfAditya": "your_key",   ← license key
//     "botToken": "Bot token here",   ← Discord bot token
//     "tokens": [                     ← selfbot user tokens
//       { "token": "user_token", "isActive": true, "label": "Main" }
//     ],
//     ... (baaki config fields)
//   }

const MAIN_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig.json');

function readBotconfig() {
    // owoconfig.json ZAROOR exist karna chahiye — key guard already check kar chuka hai
    try {
        return JSON.parse(fs.readFileSync(MAIN_CONFIG_FILE, 'utf8'));
    }
    catch (e) { tlog('err', `owoconfig.json read error: ${e.message}`); process.exit(1); }
}

function writeBotconfig(cfg) {
    // Tokens + botToken owoconfig.json mein hi save karo
    fs.writeFileSync(MAIN_CONFIG_FILE, JSON.stringify(cfg, null, 4));
}

function getBokuConfig() {
    const cfg = readBotconfig();
    const userToken = (cfg.tokens?.find(t => t.isActive)?.token) || cfg.activeUserToken;
    const botToken  = cfg.botToken;
    if (!userToken || !botToken) {
        tlog('err', 'Config error: owoconfig.json mein botToken aur tokens[] set karo!');
        tlog('warn', `📄 File: ${MAIN_CONFIG_FILE}`);
        process.exit(1);
    }
    return { userToken, botToken };
}

const { userToken: USER_TOKEN, botToken: BOT_TOKEN } = getBokuConfig();
// Per-account config: owoconfig_<userId>.json — har account ka alag config
// (owoconfig.json = main config + tokens; owoconfig_<id>.json = per-account grind config)
function getConfigFilePath() {
    try {
        const activeToken = USER_TOKEN; // startup pe already loaded hai
        const cached = activeToken ? _accInfoCache.get(activeToken) : null;
        if (cached && cached.id) {
            return path.join(OWOCORE_DIR, `owoconfig_${cached.id}.json`);
        }
    } catch {}
    return path.join(OWOCORE_DIR, 'owoconfig_default.json'); // fallback
}
let OWO_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig_default.json');

const DEFAULT_CONFIG = {
    channel_id: null,
    sleep_enabled: true,
    single_mode: false,
    auto_huntbot_enabled: true,   // Auto HB runs with grinding — default ON
    auto_upgrade_trait: 'none',   // persisted selected upgrade trait
    animal_essence: 0,            // persisted animal essence count
    show_animal_essence: true,    // show/hide Animal Essence in HB panel
    current_pattern_index: 0,
    current_step_in_pattern: 0,
    protections: {
        smart_cooldown:  { active: true,  name: "Smart Cooldown"  },
        human_behavior:  { active: true,  name: "Human Behavior"  },
        auto_resume:     { active: true,  name: "Auto Resume"     },
        random_messages: { active: true,  name: "Random Messages" },
        smart_typo:      { active: true,  name: "Smart Typo"      },
        auto_delete:     { active: false, name: "Auto Delete"     }
    },
    commands: {
        hunt:   { active: true,  count: 0 },
        battle: { active: true,  count: 0 },
        pray:   { active: true,  count: 0, last_used: 0, cd: 300 },
        owo:    { active: true,  count: 0 },
        daily:  { active: true,  count: 0, last_used: 0, next_at: 0 },
        hb:     { active: true,  count: 0, amount: 14000, huntbot_back_at: 0, huntbot_amount: 14000 }
    },
    stats: {
        total_sessions: 0, total_commands_ever: 0, filler_cmds_ever: 0,
        captcha_count: 0,  best_session_cmds: 0,   first_started: null,
        patterns_completed: 0, hb_solved_count: 0
    }
};

let config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

function loadConfig() {
    if (fs.existsSync(OWO_CONFIG_FILE)) {
        try { const saved = JSON.parse(fs.readFileSync(OWO_CONFIG_FILE, 'utf8')); config = deepMerge(DEFAULT_CONFIG, saved); }
        catch (e) {}
    } else saveConfig();
    // Restore persisted essence + trait into runtime state (sanitize corrupted values)
    const rawEssence = Math.floor(Number(config.animal_essence));
    const MAX_SANE_ESSENCE = 10_000_000;
    autoHbState.animal_essence    = (!isNaN(rawEssence) && rawEssence >= 0 && rawEssence <= MAX_SANE_ESSENCE) ? rawEssence : 0;
    config.animal_essence         = autoHbState.animal_essence;
    autoHbState.auto_upgrade_trait = config.auto_upgrade_trait || 'none';
}

// Per-account config switch karo — naye account ka config load karo
async function switchConfigToAccount(token) {
    // Token se userId fetch karo
    const info = await fetchAccountInfo(token);
    if (info && info.id) {
        OWO_CONFIG_FILE = path.join(OWOCORE_DIR, `owoconfig_${info.id}.json`);
        tlog('info', `📁 Config switched → owoconfig_${info.id}.json`);
    } else {
        OWO_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig_default.json');
        tlog('warn', '📁 Config fallback → owoconfig_default.json');
    }
    // Fresh default config load karo
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    loadConfig();
    tlog('info', `📋 Config loaded for account`);
}

// ==================== OWOHBCONFIG.JSON — Centralized HB state (all accounts) ====================
const OWO_HB_CONFIG_FILE = path.join(OWOCORE_DIR, 'owohbconfig.json');

function loadHbConfig() {
    try {
        if (fs.existsSync(OWO_HB_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(OWO_HB_CONFIG_FILE, 'utf8'));
        }
    } catch (_) {}
    return {};
}

function saveHbConfig(data) {
    try {
        fs.writeFileSync(OWO_HB_CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        tlog('warn', `owohbconfig save failed: ${e.message}`);
    }
}

// Save current account's HB state into owohbconfig.json
function saveCurrentAccountHbState(accountId) {
    if (!accountId) return;
    const all = loadHbConfig();
    all[accountId] = {
        huntbot_back_at: autoHbState.huntbot_back_at || 0,
        huntbot_amount: autoHbState.huntbot_amount || 0,
        auto_cycle_active: autoHbState.auto_cycle_active || false,
        saved_at: Math.floor(Date.now() / 1000),
    };
    saveHbConfig(all);
    tlog('hb', `💾 HB state saved for account ${accountId}`);
}

// Restore a specific account's HB state from owohbconfig.json into autoHbState
function restoreAccountHbState(accountId) {
    if (!accountId) return false;
    const all = loadHbConfig();
    const saved = all[accountId];
    if (!saved) {
        tlog('hb', `ℹ️ No saved HB state for ${accountId} — starting fresh`);
        return false;
    }
    const now = Math.floor(Date.now() / 1000);
    if (saved.huntbot_back_at && saved.huntbot_back_at > now) {
        autoHbState.huntbot_back_at = saved.huntbot_back_at;
        autoHbState.huntbot_amount = saved.huntbot_amount || 0;
        autoHbState.auto_cycle_active = true;
        tlog('hb', `🔁 HB state restored for ${accountId} — back in ${Math.ceil(saved.huntbot_back_at - now)}s`);
        return true;
    }
    tlog('hb', `ℹ️ Saved HB for ${accountId} already expired`);
    return false;
}
function saveConfig() { fs.writeFileSync(OWO_CONFIG_FILE, JSON.stringify(config, null, 4)); }
function saveEssence(val) {
    const num = Math.floor(Number(val));
    const MAX_SANE_ESSENCE = 10_000_000;
    // Ignore invalid, negative, or unrealistically large values (corrupted)
    if (isNaN(num) || num < 0 || num > MAX_SANE_ESSENCE) {
        tlog('warn', `saveEssence: ignoring suspicious value ${val} (parsed: ${num})`);
        return;
    }
    autoHbState.animal_essence = num;
    config.animal_essence = num;
    saveConfig();
}
function saveUpgradeTrait(trait) {
    autoHbState.auto_upgrade_trait = trait;
    config.auto_upgrade_trait = trait;
    saveConfig();
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]))
            result[key] = deepMerge(target[key] || {}, source[key]);
        else result[key] = source[key];
    }
    return result;
}
loadConfig();

// ==================== ACCOUNT CORE (Loaded from owocore/owoaccountcore.js) ====================
const {
    buildAccountsPanel,
    buildAddAccountModal,
    switchToAccount,
    addAccount,
    removeAccount,
    refreshAccounts,
    getActiveToken,
    fetchAccountInfo,
    _accInfoCache
} = require('./owocore/owoaccountcore');

tlog('ok', '👤 Account Core loaded from owoaccountcore.js — Accounts Manager ready!');

// ==================== STATE ====================
const state = {
    grinding_active: false, force_stop: false, captcha_detected: false,
    is_sleeping: false, sleep_end_time: null, last_sleep_time: Date.now() / 1000,
    sleep_count: 0, last_sleep_at: null,
    start_time: Date.now() / 1000, session_start: Date.now() / 1000,
    is_grinding_loop: false, session_cmd_count: 0, cmds_since_filler: 0,
    session_hunt: 0, session_battle: 0, session_pray: 0, session_owo: 0,
    panel_message_id: null, panel_channel_id: null, panel_mode: 'main', stats_view: 'session',
    _connectingPoller: null   // auto-refresh poller when selfbot is connecting
};

// ==================== ANTI DETECTION ====================
class AntiDetection {
    constructor() {
        this.pools = {
            casual: ["lol","nice","gg","wow","cool","awesome","yay","lmao","xd","pog","ez","bruh"],
            emoji:  ["😂","😊","👍","✨","❤️","🔥","🎉","🤣","😎","👀","💯","🙌","💀","✌️"],
            action: ["owo","uwu",">w<",":3","xD","^^","hehe","rawr"]
        };
        this.consecutiveCmds = 0;
        this.distractEvery   = this._rand(25, 45);
    }
    _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    getRandomMessage() {
        const types = Object.keys(this.pools);
        const pool  = this.pools[types[this._rand(0, types.length - 1)]];
        return pool[this._rand(0, pool.length - 1)];
    }
    getSmartCooldown() {
        let cd;
        if (Math.random() < 0.12) {
            cd = 14.2 + Math.random() * 1.3;
        } else {
            cd = 17.2 + Math.random() * 1.2;
        }
        if (Math.random() < 0.08) cd += Math.random() * 4 + 2;
        if (Math.random() < 0.03) cd += Math.random() * 8 + 5;
        return Math.round(cd * 100) / 100;
    }
    shouldDistract() {
        this.consecutiveCmds++;
        if (this.consecutiveCmds >= this.distractEvery) {
            this.consecutiveCmds = 0;
            this.distractEvery   = this._rand(30, 50);
            return [true, Math.random() * 12 + 6];
        }
        return [false, 0];
    }
    getTypo(cmdStr) {
        const chars = 'abcdefghjklmnpqrstuvwxyz';
        const arr   = cmdStr.split('');
        const idx   = this._rand(Math.floor(arr.length / 2), arr.length - 1);
        if (arr[idx] !== ' ' && arr[idx] !== 'o' && arr[idx] !== 'w')
            arr[idx] = chars[Math.floor(Math.random() * chars.length)];
        return arr.join('');
    }
}
const anti   = new AntiDetection();
const sleep  = (s) => new Promise(r => setTimeout(r, s * 1000));
const timeNow = () => Date.now() / 1000;

// ==================== DISCORD RATE LIMIT HANDLER ====================
// Yeh class sare Discord sends ko queue mein daalti hai
// Agar rate limit aaye to auto-wait karke retry karti hai
class DiscordRateLimiter {
    constructor() {
        this._queue        = [];
        this._processing   = false;
        this._globalPause  = false;
        this._globalUntil  = 0;                  // Date.now() ms
        this._buckets      = new Map();           // channelId → resumeAt ms
        this._hitCount     = 0;
    }

    // ── Public: queue a send ──
    safeSend(channel, content) {
        return new Promise((resolve) => {
            this._queue.push({ channel, content, resolve });
            if (!this._processing) this._drain();
        });
    }

    // ── Called by selfbot 'rateLimit' event ──
    onRateLimit({ timeout, global, route }) {
        this._hitCount++;
        if (global) {
            this._globalPause = true;
            this._globalUntil = Date.now() + timeout + 200;
            tlog('warn', `🌐 [RateLimit] Global — pausing ${(timeout/1000).toFixed(1)}s  (total hits: ${this._hitCount})`);
        } else {
            tlog('warn', `📛 [RateLimit] Route: ${route || '?'} — ${(timeout/1000).toFixed(1)}s  (total hits: ${this._hitCount})`);
        }
    }

    // ── Internal queue processor ──
    async _drain() {
        if (this._queue.length === 0) { this._processing = false; return; }
        this._processing = true;

        const { channel, content, resolve } = this._queue.shift();

        try {
            // 1. Global pause?
            if (this._globalPause) {
                const wait = Math.max(0, this._globalUntil - Date.now());
                if (wait > 0) {
                    tlog('warn', `⏳ [RateLimit] Global cooldown — waiting ${(wait/1000).toFixed(1)}s...`);
                    await new Promise(r => setTimeout(r, wait));
                }
                this._globalPause = false;
            }

            // 2. Per-channel bucket?
            const bucketUntil = this._buckets.get(channel.id) || 0;
            const bucketWait  = Math.max(0, bucketUntil - Date.now());
            if (bucketWait > 0) {
                await new Promise(r => setTimeout(r, bucketWait + 100));
            }

            // 3. Try send with retry on 429
            let result  = null;
            let attempt = 0;
            while (attempt < 4) {
                try {
                    result = await channel.send(content);
                    break;
                } catch (err) {
                    const msg    = (err?.message || '').toLowerCase();
                    const is429  = err?.status === 429 || msg.includes('rate limit') || msg.includes('429') || msg.includes('too many');
                    if (is429) {
                        const retryMs = (err?.retryAfter ? err.retryAfter * 1000 : 5000) + 500;
                        this._hitCount++;
                        tlog('warn', `⚠️ [RateLimit] 429 on send — waiting ${(retryMs/1000).toFixed(1)}s (attempt ${attempt+1}/4)`);
                        if (err?.global) {
                            this._globalPause = true;
                            this._globalUntil = Date.now() + retryMs;
                        } else {
                            this._buckets.set(channel.id, Date.now() + retryMs);
                        }
                        await new Promise(r => setTimeout(r, retryMs));
                        attempt++;
                    } else {
                        // Non-rate-limit error (missing perms etc) — give up
                        break;
                    }
                }
            }

            resolve(result);
        } catch (e) {
            resolve(null);
        }

        // Small inter-send gap to avoid burst (250ms)
        await new Promise(r => setTimeout(r, 250));
        this._drain();
    }
}

const rateLimiter = new DiscordRateLimiter();

// Convenience wrapper — use this everywhere instead of channel.send()
async function safeSend(channel, content) {
    return rateLimiter.safeSend(channel, content);
}

// ==================== PATTERN HANDLER ====================
function getNextCommandFromPattern() {
    const pattern = COMMAND_PATTERNS[config.current_pattern_index];
    const step    = config.current_step_in_pattern;
    if (step >= pattern.length) {
        config.current_pattern_index  = (config.current_pattern_index + 1) % COMMAND_PATTERNS.length;
        config.current_step_in_pattern = 0;
        config.stats.patterns_completed = (config.stats.patterns_completed || 0) + 1;
        saveConfig();
        return getNextCommandFromPattern();
    }
    config.current_step_in_pattern++;
    saveConfig();
    return pattern[step];
}
function getCommandString(cmdType) {
    if (cmdType === 'owo hunt')   return HUNT_ALIASES[Math.floor(Math.random() * HUNT_ALIASES.length)];
    if (cmdType === 'owo battle') return BATTLE_ALIASES[Math.floor(Math.random() * BATTLE_ALIASES.length)];
    return PRAY_ALIASES[Math.floor(Math.random() * PRAY_ALIASES.length)];
}

// ==================== AUTO HB FUNCTION ====================
// STEP 1: Send bare "owo hb" — no amount yet
// OWO will reply with embed containing cowoncy amount → we detect that → send "owo hb [amount]"
// OWO then sends captcha image → we solve → send "owo hb [amount] [code]"
async function sendAutoHb(channel, _amountIgnored) {
    if (autoHbState.solving_in_progress) {
        tlog('warn', 'Already solving captcha — skipping HB');
        return false;
    }

    tlog('hb', '┌─ 🔫 Auto HB → Sending "owo hb"...');
    autoHbState.waiting_for_response = true;
    autoHbState.hb_step              = 'waiting_embed';  // next: detect embed + amount
    autoHbState.last_hb_sent_at      = Date.now();
    autoHbState.hb_channel           = channel;

    await channel.sendTyping().catch(() => {});
    await sleep(Math.random() * 0.8 + 0.3);
    await safeSend(channel, `owo hb`);

    tlog('hb', '│  ✅ "owo hb" sent — waiting for OWO embed...');

    // Safety timeout
    setTimeout(() => {
        if (autoHbState.waiting_for_response && autoHbState.hb_step === 'waiting_embed') {
            tlog('warn', '└─ Timeout: no embed received — auto-retrying...');
            autoHbState.waiting_for_response = false;
            autoHbState.hb_step              = null;
            autoHbState.last_hb_sent_at      = 0;
            const retryCh = autoHbState.hb_channel
                || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null);
            if (retryCh) sendAutoHb(retryCh);
        }
    }, 60000);

    return true;
}

// ==================== DISCORD CLIENTS ====================
const bot = new BotClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
    ]
});
let selfbot = new SelfbotClient({ checkUpdate: false });

// ==================== STARTUP BANNER ====================
function printBanner(botTag, botId) {
    const W = 54;
    const R = '\x1b[0m', B = '\x1b[1m', DM = '\x1b[2m';
    const GR = '\x1b[38;5;82m',  RD = '\x1b[38;5;196m';
    const YL = '\x1b[38;5;226m', CY = '\x1b[38;5;51m';
    const MG = '\x1b[38;5;201m', PK = '\x1b[38;5;213m';
    const WH = '\x1b[97m',       BG = '\x1b[48;5;17m';

    const hr  = `${DM}${'─'.repeat(W)}${R}`;
    const hr2 = `${DM}${'═'.repeat(W)}${R}`;

    console.clear();
    console.log('');
    console.log(`  ${BG}${B}${CY}╔${'═'.repeat(W - 2)}╗${R}`);
    console.log(`  ${BG}${B}${CY}║${' '.repeat(Math.floor((W-2-22)/2))}${YL}🦊  ᴏᴡᴏ ᴘʀᴇᴍɪᴜᴍ ɢʀɪɴᴅᴇʀ${CY}${' '.repeat(Math.ceil((W-2-22)/2))}║${R}`);
    console.log(`  ${BG}${DM}${CY}║${' '.repeat(Math.floor((W-2-28)/2))}${WH}Auto-Hunt · HB · Captcha Solver${CY}${' '.repeat(Math.ceil((W-2-28)/2))}║${R}`);
    console.log(`  ${BG}${B}${CY}╚${'═'.repeat(W - 2)}╝${R}`);
    console.log('');
    console.log(hr2);
    console.log(`  ${B}${GR}✔  ʙᴏᴛ ᴏɴʟɪɴᴇ${R}   ${WH}${botTag}${R}  ${DM}(${botId})${R}`);
    console.log(hr2);

    // Config box
    const chId = (() => { try { const c = JSON.parse(require('fs').readFileSync(OWO_CONFIG_FILE, 'utf8')); return c.channel_id || null; } catch { return null; } })();
    const owocoreOk = require('fs').existsSync(require('path').join(__dirname, 'owocore', 'ghostycorehb.py'));
    console.log(`\n  ${B}${MG}┌─  ᴄᴏɴꜰɪɢ ${'─'.repeat(W - 13)}┐${R}`);
    console.log(`  ${B}${MG}│${R}  ${DM}Channel  :${R}  ${chId ? `${GR}${chId}${R}` : `${RD}not set — use /owopanel → Set Channel${R}`}`);
    console.log(`  ${B}${MG}│${R}  ${DM}Captcha  :${R}  ${owocoreOk ? `${GR}owocore/ghostycorehb.py ✓${R}` : `${RD}owocore/ folder not found!${R}`}`);
    console.log(`  ${B}${MG}└${'─'.repeat(W - 2)}┘${R}`);

    // Commands box
    console.log(`\n  ${B}${YL}┌─  ᴄᴏᴍᴍᴀɴᴅs ${'─'.repeat(W - 15)}┐${R}`);
    console.log(`  ${B}${YL}│${R}  ${GR}/owopanel${R}  ${DM}→${R}  ᴏᴘᴇɴ ᴛʜᴇ ᴄᴏɴᴛʀᴏʟ ᴘᴀɴᴇʟ`);
    console.log(`  ${B}${YL}│${R}  ${GR}/check${R}     ${DM}→${R}  ᴄʜᴇᴄᴋ ᴀɴɪᴍᴀʟ ᴇssᴇɴᴄᴇ`);
    console.log(`  ${B}${YL}│${R}  ${GR}!owopanel${R} ${DM}→${R}  ꜱᴇɴᴅ ᴘᴀɴᴇʟ ᴠɪᴀ ᴍᴇssᴀɢᴇ`);
    console.log(`  ${B}${YL}└${'─'.repeat(W - 2)}┘${R}`);

    console.log('');
    console.log(hr2);
    console.log(`  ${DM}ʀᴇᴀᴅʏ · ᴡᴀɪᴛɪɴɢ ꜰᴏʀ /ᴏᴡᴏᴘᴀɴᴇʟ...${R}`);
    console.log('');
}

// ==================== SLASH COMMAND ====================
bot.on('ready', async () => {
    // Print startup banner on bot ready
    printBanner(bot.user.tag, bot.user.id);
    try {
        const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
        const base = {
            integration_types: [
                ApplicationIntegrationType.GuildInstall,  // Server mein
                ApplicationIntegrationType.UserInstall     // User install (DM + anywhere)
            ],
            contexts: [
                InteractionContextType.Guild,          // Server
                InteractionContextType.BotDM,          // Bot DM
                InteractionContextType.PrivateChannel  // Group DM / private
            ]
        };
        await rest.put(Routes.applicationCommands(bot.user.id), {
            body: [
                {
                    name: 'owopanel',
                    description: '🦊 OwO Auto-Grinder Control Panel',
                    ...base
                },
                {
                    name: 'check',
                    description: '🧪 Check Animal Essence of a user',
                    options: [
                        {
                            name: 'user',
                            description: 'The user to check (leave empty for your own account)',
                            type: 6, // USER type
                            required: false
                        }
                    ],
                    ...base
                }
            ]
        });
        tlog('ok', '/owopanel + /check registered');
    } catch (e) {}
});

// ==================== NITRO FONT ====================
function n(text) {
    const map = {
        'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ',
        'j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'Q','r':'ʀ',
        's':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ',
        ' ':' '
    };
    return text.toLowerCase().split('').map(c => map[c] ?? c).join('');
}

// ==================== FORMAT ESSENCE ====================
function formatEssence(val) {
    if (val === null || val === undefined) return '0';
    const num = Math.floor(Number(val)); // always integer, handles string/float safely
    if (isNaN(num) || num < 0) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(num % 1_000_000_000 === 0 ? 0 : 1) + 'B';
    if (num >= 1_000_000)     return (num / 1_000_000).toFixed(num % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (num >= 1_000)         return (num / 1_000).toFixed(num % 1_000 === 0 ? 0 : 1) + 'K';
    return String(num);
}

// ==================== HELPERS ====================
function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}ʜ ${m}ᴍ ${s}s`;
}
function getStatusText() {
    if (state.captcha_detected) return '🚨 | sᴛᴀᴛᴜs : ᴄᴀᴘᴛᴄʜᴀ ᴅᴇᴛᴇᴄᴛᴇᴅ';
    if (state.is_sleeping)      return '😴 | sᴛᴀᴛᴜs : sʟᴇᴇᴘɪɴɢ';
    if (state.grinding_active)  return '<a:online:1490944088155881572> | sᴛᴀᴛᴜs : ᴀᴄᴛɪᴠᴇ';
    return                             '<a:offline:1493462926793904168> | sᴛᴀᴛᴜs : sᴛᴏᴘᴘᴇᴅ';
}
function getStatusColor() {
    if (state.captcha_detected) return 0xFF2222;
    if (state.is_sleeping)      return 0x5865F2;
    if (state.grinding_active)  return 0x57F287;
    return                             0x36393F;
}

// ==================== COMPONENTS V2 BUILDERS ====================
function buildMainPanel() {
    const { hunt, battle, pray, owo, hb } = config.commands;
    const uptime      = formatUptime(timeNow() - state.start_time);
    const sessionTime = formatUptime(timeNow() - state.session_start);

    // Show real mention if ready, else "connecting"
    // selfbot.user check is fallback for destroy+login case where isReady() may lag
    const _sbReady = selfbot.isReady() || (selfbot.user != null);
    let username;
    if (_sbReady && selfbot.user) {
        username = `<@${selfbot.user.id}>`;
    } else {
        username = '`ᴄᴏɴɴᴇᴄᴛɪɴɢ...`';
    }

    // HB status line for panel — only show if auto_huntbot_enabled
    const hbAmt = autoHbState.huntbot_amount || hb.amount || 14000;
    let hbStatusLine = '';
    if (config.auto_huntbot_enabled) {
        if (autoHbState.solving_in_progress) {
            hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | 🔄 solving captcha...`;
        } else if (autoHbState.waiting_for_response) {
            hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | ⏳ waiting for OWO...`;
        } else if (autoHbState.huntbot_back_at > timeNow()) {
            const rem = Math.ceil(autoHbState.huntbot_back_at - timeNow());
            const hm  = `${Math.floor(rem/3600)}h ${Math.floor((rem%3600)/60)}m ${rem%60}s`;
            hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | ⏰ ${hm} | <t:${Math.floor(autoHbState.huntbot_back_at)}:R>`;
        } else if (autoHbState.auto_cycle_active) {
            hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | ✅ ready`;
        } else {
            hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | ⏸ ${n('will start with grinding')}`;
        }
    } else {
        hbStatusLine = `\n> <a:HB7f:1498939702915502112> **${n('owo huntbot')}** | ❌ disabled`;
    }

    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# <:owo_yay:1498978297210605608> __**ᴏᴡᴏ ᴘʀᴇᴍɪᴜᴍ ɢʀɪɴᴅᴇʀ**__ <:specialnewowo:1498979552578506884>`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('account info')}\n` +
                `> <a:online:1493462726532534282> **${n('account')}** ${username}\n` +
                `> ${getStatusText()}\n` +
                `> <:channel:1482541700697030769> **${n('channel')}** ${config.channel_id ? `<#${config.channel_id}>` : '`⚠️ ɴᴏᴛ sᴇᴛ`'}` +
                hbStatusLine
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('time')}\n` +
                `> ⏰ **ᴜᴘᴛɪᴍᴇ** <t:${Math.floor(state.start_time)}:R>` +
                (state.grinding_active || state.session_cmd_count > 0
                    ? `\n> <:duration:1498990306383626403> **ᴏᴡᴏ ɢʀɪɴᴅᴇʀ ᴛɪᴍᴇ** ${sessionTime}`
                    : '')
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_start')
                    .setEmoji(_sbReady ? '<a:online:1490944088155881572>' : '<a:loading:1493403777720520744>')
                    .setLabel(_sbReady ? ' sᴛᴀʀᴛ' : ' ᴄᴏɴɴᴇᴄᴛɪɴɢ...')
                    .setStyle(_sbReady ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(!config.channel_id || state.grinding_active),
                new ButtonBuilder()
                    .setCustomId('owo_stop')
                    .setEmoji('<a:RedTick:1490948489469890671>')
                    .setLabel(' sᴛᴏᴘ')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!state.grinding_active),
                new ButtonBuilder()
                    .setCustomId('owo_set_ch')
                    .setLabel('📺  sᴇᴛ ᴄʜᴀɴɴᴇʟ')
                    .setStyle(ButtonStyle.Primary)
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_settings')
                    .setLabel('⚙️  sᴇᴛᴛɪɴɢs')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('owo_stats')
                    .setEmoji('<:Tools_2:1459855074023968788>')
                    .setLabel(' sᴛᴀᴛs')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('owo_accounts')
                    .setLabel('👤  ᴀᴄᴄᴏᴜɴᴛs')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('owo_refresh')
                    .setLabel('🔄')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    // ── Auto-refresh poller: update panel when selfbot finishes connecting ──
    if (!_sbReady && state.panel_message_id && !state._connectingPoller) {
        tlog('info', '⏳ Selfbot connecting — panel poller started (checks every 1s)');
        let _pollerTicks = 0;
        state._connectingPoller = setInterval(() => {
            _pollerTicks++;
            // isReady() ya selfbot.user dono mein se koi bhi true ho → ready hai
            const ready = selfbot.isReady() || (selfbot.user != null);
            if (ready) {
                clearInterval(state._connectingPoller);
                state._connectingPoller = null;
                tlog('ok', `✅ Poller: selfbot ready (${_pollerTicks}s) — refreshing panel!`);
                updatePanel().catch(() => {});
                setTimeout(() => updatePanel().catch(() => {}), 1000);
            } else if (_pollerTicks >= 45) {
                // 45s ke baad bhi nahi hua → hard stop (stuck avoid karne ke liye)
                clearInterval(state._connectingPoller);
                state._connectingPoller = null;
                tlog('warn', '⚠️ Poller: 45s timeout — force panel refresh');
                updatePanel().catch(() => {});
            }
        }, 1000);
    }

    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2
    };
}

function buildProtectionsPanel() {
    const p = config.protections;
    let lines = '';
    for (const [key, val] of Object.entries(p)) {
        lines += `> ${val.active ? '✅' : '❌'} **${n(val.name)}**\n`;
    }

    const menu = new StringSelectMenuBuilder()
        .setCustomId('owo_prot_menu')
        .setPlaceholder(`⚡ ${n('select protection to toggle')}...`)
        .addOptions(
            Object.entries(p).map(([key, val]) =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(val.name)
                    .setValue(key)
                    .setDescription(val.active ? '✅ Currently ENABLED' : '❌ Currently DISABLED')
                    .setEmoji(val.active ? '✅' : '❌')
            )
        );

    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 🛡️ ${n('protections manager')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('current status')}\n` + lines
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('tip')}\n` +
                `> ${n('select from dropdown below to toggle any protection on or off')}.`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(menu)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_back_to_settings')
                    .setEmoji({ id: '1495006333123170375', name: 'arrow_left' })
                    .setLabel('  ʙᴀᴄᴋ')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function buildSettingsPanel() {
    // Navigation select menu — "Select an Action", nothing pre-selected
    const navMenu = new StringSelectMenuBuilder()
        .setCustomId('owo_settings_nav_menu')
        .setPlaceholder(`🎯 ${n('select an action')}`)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel(`${n('auto huntbot')}`)
                .setValue('open_hb')
                .setDescription('Enable or disable Auto Huntbot')
                .setEmoji({ id: '1498939702915502112', name: 'HB7f', animated: true }),
            new StringSelectMenuOptionBuilder()
                .setLabel(`${n('protections')}`)
                .setValue('open_prot')
                .setDescription('Toggle individual protection features')
                .setEmoji('🛡️')
        );

    const container = new ContainerBuilder()
        .setAccentColor(0xFEE75C)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ⚙️ ${n('configuration menu')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('sleep mode')}\n` +
                `> **${n('status')}** ${config.sleep_enabled ? '✅ ᴏɴ' : '❌ ᴏғғ'}\n` +
                `> ${n('takes a 40 min rest every 2 hours to avoid detection')}.`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('patterns')}\n` +
                `> ${COMMAND_PATTERNS.length} ${n('command patterns loaded and ready')}.`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(navMenu)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_toggle_sleep')
                    .setLabel(config.sleep_enabled ? '💤  ᴅɪsᴀʙʟᴇ sʟᴇᴇᴘ' : '😴  ᴇɴᴀʙʟᴇ sʟᴇᴇᴘ')
                    .setStyle(config.sleep_enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('owo_back')
                    .setEmoji({ id: '1495006333123170375', name: 'arrow_left' })
                    .setLabel('  ʙᴀᴄᴋ')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ==================== HUNTBOT PANEL ====================
function buildHuntbotPanel() {
    const hbEnabled = config.auto_huntbot_enabled !== false;

    // Live HB status (same logic as main panel)
    let hbLiveStatus = '';
    if (hbEnabled) {
        if (autoHbState.solving_in_progress) {
            hbLiveStatus = `🔄 ${n('solving captcha')}...`;
        } else if (autoHbState.waiting_for_response) {
            hbLiveStatus = `⏳ ${n('waiting for owo')}...`;
        } else if (autoHbState.huntbot_back_at > timeNow()) {
            const rem = Math.ceil(autoHbState.huntbot_back_at - timeNow());
            const hm  = `${Math.floor(rem/3600)}h ${Math.floor((rem%3600)/60)}m ${rem%60}s`;
            hbLiveStatus = `⏰ ${hm} | <t:${Math.floor(autoHbState.huntbot_back_at)}:R>`;
        } else if (autoHbState.auto_cycle_active) {
            hbLiveStatus = `✅ ${n('ready')}`;
        } else {
            hbLiveStatus = `⏸ ${n('will start with grinding')}`;
        }
    } else {
        hbLiveStatus = `❌ ${n('disabled')}`;
    }

    // Single toggle button: enabled → show Disable; disabled → show Enable
    const toggleBtn = hbEnabled
        ? new ButtonBuilder()
            .setCustomId('owo_hb_disable')
            .setEmoji({ id: '1498974666063347716', name: 'HB1c' })
            .setLabel(`  ${n('disable')}`)
            .setStyle(ButtonStyle.Danger)
        : new ButtonBuilder()
            .setCustomId('owo_hb_enable')
            .setEmoji({ id: '1498939702915502112', name: 'HB7f', animated: true })
            .setLabel(`  ${n('enable')}`)
            .setStyle(ButtonStyle.Success);

    const container = new ContainerBuilder()
        .setAccentColor(hbEnabled ? 0x57F287 : 0xFF2222)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# <a:HB7f:1498939702915502112> ${n('auto huntbot')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('status')}\n` +
                `> <a:HB7f:1498939702915502112> **${n('auto huntbot')}** | ${hbLiveStatus}\n` +
                `> **${n('mode')}** ${hbEnabled ? '✅ ᴇɴᴀʙʟᴇᴅ' : '❌ ᴅɪsᴀʙʟᴇᴅ'}` +
                `\n> <:money:1498990767249690749> **${n('animal essence')}** ${formatEssence(autoHbState.animal_essence)}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('auto upgrade')}\n` +
                `> ${n('select a trait below. when animal essence is available, bot will auto-upgrade it.')}\n` +
                `> **${n('selected')}** ${autoHbState.auto_upgrade_trait === 'none'
                    ? '`❌ ɴᴏɴᴇ`'
                    : `✅ ${autoHbState.auto_upgrade_trait.charAt(0).toUpperCase() + autoHbState.auto_upgrade_trait.slice(1)}`
                }`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('owo_upgrade_trait_menu')
                    .setPlaceholder(`✦ ${n('select to auto upgrade')}`)
                    .addOptions(
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Efficiency')
                            .setValue('efficiency')
                            .setDescription('owo upgrade efficiency all')
                            .setEmoji({ id: '1498989556190417069', name: 'efficiency', animated: true })
                            .setDefault(autoHbState.auto_upgrade_trait === 'efficiency'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Duration')
                            .setValue('duration')
                            .setDescription('owo upgrade duration all')
                            .setEmoji({ id: '1498990306383626403', name: 'duration' })
                            .setDefault(autoHbState.auto_upgrade_trait === 'duration'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Cost')
                            .setValue('cost')
                            .setDescription('owo upgrade cost all')
                            .setEmoji({ id: '1498990767249690749', name: 'money' })
                            .setDefault(autoHbState.auto_upgrade_trait === 'cost'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Gain')
                            .setValue('gain')
                            .setDescription('owo upgrade gain all')
                            .setEmoji({ id: '1498993577634562158', name: 'gainSpringEssenceBuff' })
                            .setDefault(autoHbState.auto_upgrade_trait === 'gain'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Experience')
                            .setValue('experience')
                            .setDescription('owo upgrade experience all')
                            .setEmoji({ id: '1498990902708801587', name: 'experience', animated: true })
                            .setDefault(autoHbState.auto_upgrade_trait === 'experience'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('Radar')
                            .setValue('radar')
                            .setDescription('owo upgrade radar all')
                            .setEmoji({ id: '1498991627140862032', name: 'radar', animated: true })
                            .setDefault(autoHbState.auto_upgrade_trait === 'radar'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('None — Disable Auto Upgrade')
                            .setValue('none')
                            .setDescription('Turn off Auto Upgrade')
                            .setEmoji({ id: '1498992013499039855', name: 'Cross' })
                            .setDefault(autoHbState.auto_upgrade_trait === 'none')
                    )
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                toggleBtn,
                new ButtonBuilder()
                    .setCustomId('owo_back_to_settings')
                    .setEmoji({ id: '1495006333123170375', name: 'arrow_left' })
                    .setLabel('  ʙᴀᴄᴋ')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}
function buildStatsPanel(view = 'session') {
    const { hunt, battle, pray, owo, daily, hb } = config.commands;
    const s            = config.stats || {};
    const allTotal     = s.total_commands_ever || 0;

    const praySecsLeft = pray.last_used > 0
        ? Math.max(0, Math.ceil(pray.cd - (timeNow() - pray.last_used)))
        : 0;
    const prayStr = praySecsLeft > 0
        ? `<t:${Math.floor(timeNow() + praySecsLeft)}:R>`
        : `✅ ${n('ready')}!`;

    const dailyNextTs = daily.next_at && daily.next_at > 0 ? Math.floor(daily.next_at) : 0;
    const dailyReady  = dailyNextTs > 0 ? timeNow() >= dailyNextTs : (daily.last_used === 0);
    let dailyStr;
    if (dailyReady) {
        dailyStr = '✅ ʀᴇᴀᴅʏ';
    } else {
        const secsLeft = Math.max(0, dailyNextTs - Math.floor(timeNow()));
        const dh = Math.floor(secsLeft / 3600);
        const dm = Math.floor((secsLeft % 3600) / 60);
        const ds = secsLeft % 60;
        const countdown = `${String(dh).padStart(2,'0')}ʜ ${String(dm).padStart(2,'0')}ᴍ ${String(ds).padStart(2,'0')}s`;
        dailyStr = `${countdown} — <t:${dailyNextTs}:t>`;
    }
    const dailyCount  = daily.count || 0;

    const sleepInfo = state.sleep_count > 0
        ? `${state.sleep_count}x — ${n('last at')} ${state.last_sleep_at}`
        : n('no sleep yet');

    const sH = state.session_hunt;
    const sB = state.session_battle;
    const sP = state.session_pray;
    const sO = state.session_owo;
    const sT = sH + sB + sP + sO;
    const sessionContent =
        `-# ${n('current session')}\n` +
        `> <:tier_conqueror:1497914266920030319> **${n('owo hunt')}** ${sH}\n` +
        `> <a:redeye:1482542054646218856> **${n('owo battle')}** ${sB}\n` +
        `> <a:prays:1482543824319418441> **${n('owo pray')}** ${sP}\n` +
        `> <:clown:1497858276090449950> **owo** ${sO}\n` +
        `> <:Message:1495715175540588565> **${n('total')}** ${sT}`;

    const allHunt   = hunt.count;
    const allBattle = battle.count;
    const allPray   = pray.count;
    const allOwo    = owo.count;
    const allHb     = hb.count || 0;
    const allTimeContent =
        `-# ${n('all-time records')}\n` +
        `> <:tier_conqueror:1497914266920030319> **${n('owo hunt')}** ${allHunt}\n` +
        `> <a:redeye:1482542054646218856> **${n('owo battle')}** ${allBattle}\n` +
        `> <a:prays:1482543824319418441> **${n('owo pray')}** ${allPray}\n` +
        `> <:clown:1497858276090449950> **owo** ${allOwo}\n` +
        `> 🔫 **HB (14000)** ${allHb}\n` +
        `> <:Message:1495715175540588565> **${n('total commands')}** ${allTotal}\n` +
        `> 📅 **${n('daily claimed')}** ${dailyCount}\n` +
        `> 🚨 **${n('captchas hit')}** ${s.captcha_count || 0}\n` +
        `> ✅ **${n('hb solved')}** ${s.hb_solved_count || 0}`;

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('owo_stats_view')
        .setPlaceholder(view === 'session' ? `📊 ${n('current session')}` : `📦 ${n('all-time records')}`)
        .addOptions(
            new StringSelectMenuOptionBuilder()
                .setLabel('Current Session')
                .setValue('session')
                .setDescription('Stats from this grind session')
                .setEmoji('📊')
                .setDefault(view === 'session'),
            new StringSelectMenuOptionBuilder()
                .setLabel('All-Time Records')
                .setValue('alltime')
                .setDescription('Total stats across all sessions')
                .setEmoji('📦')
                .setDefault(view === 'alltime')
        );

    const container = new ContainerBuilder()
        .setAccentColor(0xEB459E)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# <:Welcomer:1495006208665321554> ${n('advanced statistics')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(selectMenu)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(view === 'session' ? sessionContent : allTimeContent)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('cooldowns')}\n` +
                `> <a:prays:1482543824319418441> **${n('next pray')}** ${prayStr}\n` +
                `> 📅 **${n('owo daily')}** ${dailyStr}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# ${n('sleep mode')}\n` +
                `> 😴 **${n('sleep sessions')}** ${sleepInfo}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_reset_stats')
                    .setLabel('🗑️  ʀᴇsᴇᴛ sᴛᴀᴛs')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('owo_stats_refresh')
                    .setEmoji('<a:reset:1493403777720520744>')
                    .setLabel(' ʀᴇғʀᴇsʜ')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('owo_back')
                    .setLabel('◀  ʙᴀᴄᴋ')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ==================== INTERACTION HANDLER ====================
bot.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand() && interaction.commandName === 'owopanel') {
            // In User Install context (DM/group DM), channelId may be the DM channel
            const chId = interaction.channelId || interaction.channel?.id || null;
            if (chId) state.panel_channel_id = chId;
            await interaction.reply(buildMainPanel());
            const msg = await interaction.fetchReply().catch(() => null);
            if (msg) state.panel_message_id = msg.id;
            return;
        }

        // ==================== /check COMMAND ====================
        if (interaction.isChatInputCommand() && interaction.commandName === 'check') {
            const targetUser = interaction.options.getUser('user') || null;
            const targetId   = targetUser ? targetUser.id : (selfbot.isReady() ? selfbot.user.id : null);
            const targetTag  = targetUser ? targetUser.tag : (selfbot.isReady() ? selfbot.user.tag : 'your account');

            // Show cached essence immediately for our own selfbot account
            if (!targetUser || (selfbot.isReady() && targetId === selfbot.user.id)) {
                const cachedEssence = autoHbState.animal_essence || 0;
                await interaction.reply({
                    content:
                        `<:money:1498990767249690749> **Animal Essence — ${formatEssence(cachedEssence)}**\n` +
                        `> 👤 ${n('account')} <@${selfbot.user.id}>\n` +
                        `> 🔄 ${n('fetching live data')}...`
                });

                // Live essence check — send bare "owo hb" WITHOUT triggering HB flow
                if (!autoHbState.waiting_for_response && !autoHbState.solving_in_progress && config.channel_id) {
                    const ch = selfbot.channels.cache.get(config.channel_id);
                    if (ch) {
                        autoHbState._essence_check_mode = true;
                        await sleep(Math.random() * 0.5 + 0.3);
                        await safeSend(ch, 'owo hb').catch(() => {});
                        setTimeout(() => { autoHbState._essence_check_mode = false; }, 15000);

                        // Wait up to 6 seconds for OWO to reply and update essence
                        let waited = 0;
                        const prevEssence = autoHbState.animal_essence;
                        while (waited < 6 && autoHbState.animal_essence === prevEssence) {
                            await sleep(0.5);
                            waited += 0.5;
                        }

                        const liveEssence = autoHbState.animal_essence || 0;
                        const msg = await interaction.fetchReply().catch(() => null);
                        if (msg) {
                            await interaction.editReply({
                                content:
                                    `<:money:1498990767249690749> **Animal Essence — ${formatEssence(liveEssence)}**\n` +
                                    `> 👤 ${n('account')} <@${selfbot.user.id}>\n` +
                                    `> ✅ ${n('live data fetched')}`
                            }).catch(() => {});
                        }
                    }
                }
            } else {
                // For other users — we can't send owo hb for them, just reply with N/A
                await interaction.reply({
                    content:
                        `<:money:1498990767249690749> **Animal Essence**\n` +
                        `> 👤 ${n('account')} <@${targetId}>\n` +
                        `> ⚠️ ${n('can only check your own linked selfbot account')}`,
                    flags: MessageFlags.Ephemeral
                });
            }
            return;
        }

        if (interaction.isButton()) {
            // Modal dikhane wale buttons pe deferUpdate() NAHI karna — conflict hota hai
            const modalButtons = ['owo_acc_add', 'owo_acc_remove', 'owo_set_ch'];
            if (!modalButtons.includes(interaction.customId)) {
                await interaction.deferUpdate().catch(() => {});
            }
            await handleButton(interaction);
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'owo_prot_menu') {
            await interaction.deferUpdate().catch(() => {});
            const value = interaction.values[0];
            config.protections[value].active = !config.protections[value].active;
            saveConfig();
            await interaction.editReply(buildProtectionsPanel()).catch(() => {});
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'owo_settings_nav_menu') {
            await interaction.deferUpdate().catch(() => {});
            const value = interaction.values[0];
            if (value === 'open_hb') {
                state.panel_mode = 'huntbot';
                await interaction.editReply(buildHuntbotPanel()).catch(() => {});
            } else if (value === 'open_prot') {
                state.panel_mode = 'protections';
                await interaction.editReply(buildProtectionsPanel()).catch(() => {});
            }
            return;
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'owo_upgrade_trait_menu') {
            await interaction.deferUpdate().catch(() => {});
            const selected = interaction.values[0];
            if (selected === 'no_essence') {
                state.panel_mode = 'huntbot';
                await interaction.editReply(buildHuntbotPanel()).catch(() => {});
                return;
            }
            saveUpgradeTrait(selected);
            console.log(`\x1b[36m🔧 Auto Upgrade trait set to: ${selected}\x1b[0m`);
            state.panel_mode = 'huntbot';
            await interaction.editReply(buildHuntbotPanel()).catch(() => {});
            return;
        }


        // ── Accounts select menu (switch account) ──
        if (interaction.isStringSelectMenu() && interaction.customId === 'owo_acc_switch_menu') {
            await interaction.deferUpdate().catch(() => {});
            const value = interaction.values[0];
            if (value === 'no_acc') {
                await interaction.editReply(await buildAccountsPanel()).catch(() => {});
                return;
            }
            const idx = parseInt(value.replace('switch_acc_', ''), 10);
            if (isNaN(idx)) {
                await interaction.editReply(await buildAccountsPanel('❌ Invalid selection')).catch(() => {});
                return;
            }

            const cfg = readBotconfig();
            if (!cfg.tokens || !cfg.tokens[idx]) {
                await interaction.editReply(await buildAccountsPanel('❌ Account not found!')).catch(() => {});
                return;
            }
            const currentIdx = cfg.tokens.findIndex(t => t.isActive);
            if (currentIdx === idx) {
                await interaction.editReply(await buildAccountsPanel('✅ Already on this account!')).catch(() => {});
                return;
            }

            // Active token update karo
            cfg.tokens = cfg.tokens.map((t, i) => ({ ...t, isActive: i === idx }));
            writeBotconfig(cfg);
            _accInfoCache.clear();

            const newToken = cfg.tokens[idx].token;
            const accInfo = await fetchAccountInfo(newToken);
            const accName = (accInfo && accInfo.valid) ? `@${accInfo.username}` : cfg.tokens[idx].label || `Account ${idx + 1}`;
            tlog('info', `[AccountCore] Switched to: ${accName}`);

            // Panel pe switching dikhao
            state.panel_mode = 'main';
            await interaction.editReply(buildMainPanel()).catch(() => {});
            tlog('info', '🔄 Switched — hot-swapping selfbot...');

            // No restart — fresh selfbot instance banao
            await rebootSelfbot(newToken);
            return;
        }

        // ── Accounts modals (add/remove) ──
        if (interaction.isModalSubmit() && interaction.customId === 'owo_acc_add_modal') {
            await interaction.deferReply({}).catch(() => {});
            const token = interaction.fields.getTextInputValue('acc_token_input').trim();
            const result = await addAccount(token);
            // Panel ko original message pe update karo (agar panel message exist karta hai)
            if (state.panel_message_id && state.panel_channel_id) {
                try {
                    const ch = bot.channels.cache.get(state.panel_channel_id) || await bot.channels.fetch(state.panel_channel_id).catch(() => null);
                    if (ch) {
                        const msg = await ch.messages.fetch(state.panel_message_id).catch(() => null);
                        if (msg) await msg.edit(await buildAccountsPanel(result.message)).catch(() => {});
                    }
                } catch {}
            }
            await interaction.deleteReply().catch(() => {});
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'owo_acc_remove_modal') {
            await interaction.deferReply({}).catch(() => {});
            const raw = interaction.fields.getTextInputValue('acc_remove_idx').trim();
            const num = parseInt(raw, 10);
            let resultMsg;
            if (isNaN(num)) {
                resultMsg = '❌ Invalid number!';
            } else {
                const result = await removeAccount(num);
                resultMsg = result.message;
            }
            if (state.panel_message_id && state.panel_channel_id) {
                try {
                    const ch = bot.channels.cache.get(state.panel_channel_id) || await bot.channels.fetch(state.panel_channel_id).catch(() => null);
                    if (ch) {
                        const msg = await ch.messages.fetch(state.panel_message_id).catch(() => null);
                        if (msg) await msg.edit(await buildAccountsPanel(resultMsg)).catch(() => {});
                    }
                } catch {}
            }
            await interaction.deleteReply().catch(() => {});
            return;
        }

        if (interaction.isModalSubmit() && interaction.customId === 'owo_ch_modal') {
            const chId = interaction.fields.getTextInputValue('ch_id_input').trim();
            if (/^\d{17,20}$/.test(chId)) {
                config.channel_id = chId;
                saveConfig();
                await interaction.update(buildMainPanel());
            } else {
                await interaction.reply({ content: `❌ **${n('invalid channel id')}!** ${n('please enter a valid discord channel id')}.`, flags: MessageFlags.Ephemeral });
            }
            return;
        }
    } catch (error) {
        if (error?.code !== 10062 && !error?.message?.includes('Timeout')) {
            tlog('err', `Interaction: ${error.message}`);
        }
    }
});

// ==================== BUTTON HANDLER ====================
async function handleButton(interaction) {
    const id = interaction.customId;
    const respond = async (panel) => { try { await interaction.editReply(panel); } catch {} };

    switch (id) {
        case 'owo_start':
            if (!config.channel_id) { try { await interaction.followUp({ content: `❌ ${n('please set a channel first')}!`, flags: MessageFlags.Ephemeral }); } catch {} return; }
            // selfbot.isReady() ke alawa selfbot.user bhi check karo (destroy+login ke baad isReady() kabhi kabhi false rehta)
            if (!selfbot.isReady() && !selfbot.user) {
                try { await interaction.followUp({ content: `⏳ Selfbot connecting... retrying in 5s`, flags: MessageFlags.Ephemeral }); } catch {}
                await new Promise(resolve => {
                    let waited = 0;
                    const iv = setInterval(() => {
                        waited += 500;
                        if (selfbot.isReady() || selfbot.user || waited >= 15000) { clearInterval(iv); resolve(); }
                    }, 500);
                });
                if (!selfbot.isReady() && !selfbot.user) {
                    try { await interaction.followUp({ content: `❌ ${n('selfbot is not ready')} — check token in owoconfig.json`, flags: MessageFlags.Ephemeral }); } catch {}
                    return;
                }
            }
            state.captcha_detected = false;
            state.force_stop       = false;
            state.grinding_active  = true;
            state.session_start    = timeNow();
            state.session_cmd_count = 0;
            state.cmds_since_filler = 0;
            state.session_hunt   = 0;
            state.session_battle = 0;
            state.session_pray   = 0;
            state.session_owo    = 0;
            config.current_pattern_index   = Math.floor(Math.random() * COMMAND_PATTERNS.length);
            config.current_step_in_pattern = 0;
            config.stats.total_sessions++;
            if (!config.stats.first_started) config.stats.first_started = new Date().toISOString();
            saveConfig();
            startGrinding();
            // Auto-start HB silently if enabled and not already running
            if (config.auto_huntbot_enabled !== false) {
                const hbAlreadyRunning = autoHbState.huntbot_back_at > timeNow()
                    || autoHbState.auto_cycle_active
                    || autoHbState.waiting_for_response
                    || autoHbState.solving_in_progress;
                if (!hbAlreadyRunning) {
                    const hbCh = selfbot.channels.cache.get(config.channel_id);
                    if (hbCh) {
                        autoHbState.auto_cycle_active = true;
                        setTimeout(() => sendAutoHb(hbCh), 3000); // 3s delay after start
                    }
                }
                // If already running — stay silent, timer handles it
            }
            state.panel_mode = 'main';
            await respond(buildMainPanel());
            break;

        case 'owo_stop':
            state.force_stop      = true;
            state.grinding_active = false;
            if (state.session_cmd_count > (config.stats.best_session_cmds || 0))
                config.stats.best_session_cmds = state.session_cmd_count;
            saveConfig();
            state.panel_mode = 'main';
            await respond(buildMainPanel());
            break;

        case 'owo_set_ch':
            const modal = new ModalBuilder()
                .setCustomId('owo_ch_modal')
                .setTitle('📺 Set Grinding Channel')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('ch_id_input')
                            .setLabel('Enter Channel ID')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('123456789012345678')
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            break;

        case 'owo_prot':
            state.panel_mode = 'protections';
            await respond(buildProtectionsPanel());
            break;

        case 'owo_settings':
            state.panel_mode = 'settings';
            await respond(buildSettingsPanel());
            break;

        case 'owo_stats':
            state.panel_mode = 'stats';
            await respond(buildStatsPanel());
            break;

        case 'owo_refresh':
            state.panel_mode = 'main';
            await respond(buildMainPanel());
            break;

        case 'owo_stats_refresh':
            state.panel_mode = 'stats';
            await respond(buildStatsPanel());
            break;

        case 'owo_hb_enable':
            config.auto_huntbot_enabled = true;
            saveConfig();
            state.panel_mode = 'huntbot';
            await respond(buildHuntbotPanel());
            break;

        case 'owo_hb_disable':
            config.auto_huntbot_enabled = false;
            if (autoHbState.huntbot_timer) {
                clearTimeout(autoHbState.huntbot_timer);
                autoHbState.huntbot_timer = null;
            }
            autoHbState.auto_cycle_active    = false;
            autoHbState.waiting_for_response = false;
            autoHbState.solving_in_progress  = false;
            autoHbState.hb_step              = null;
            saveConfig();
            state.panel_mode = 'huntbot';
            await respond(buildHuntbotPanel());
            break;

        case 'owo_back_to_settings':
            state.panel_mode = 'settings';
            await respond(buildSettingsPanel());
            break;

        // ==================== ACCOUNTS (directly integrated) ====================
        case 'owo_accounts': {
            state.panel_mode = 'accounts';
            await respond(await buildAccountsPanel());
            break;
        }

        case 'owo_acc_add': {
            const addModal = new ModalBuilder()
                .setCustomId('owo_acc_add_modal')
                .setTitle('➕ Add Account')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('acc_token_input')
                            .setLabel('Discord User Token')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Paste your Discord user token here...')
                            .setRequired(true)
                            .setMinLength(50)
                    )
                );
            await interaction.showModal(addModal);
            break;
        }

        case 'owo_acc_remove': {
            const _rcfg = readBotconfig();
            const _rtokens = _rcfg.tokens || [];
            if (_rtokens.length === 0) break;
            const removeModal = new ModalBuilder()
                .setCustomId('owo_acc_remove_modal')
                .setTitle('🗑️ Remove Account')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('acc_remove_idx')
                            .setLabel(`Account number (1-${_rtokens.length})`)
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder(_rtokens.map((t, i) => `${i+1}=${t.label || 'Acc'}`).join(', ').slice(0, 100))
                            .setRequired(true)
                            .setMaxLength(2)
                    )
                );
            await interaction.showModal(removeModal);
            break;
        }

        case 'owo_acc_refresh': {
            await refreshAccounts();
            await respond(await buildAccountsPanel('🔄 Accounts refreshed!'));
            break;
        }

        case 'owo_acc_back': {
            state.panel_mode = 'main';
            await respond(buildMainPanel());
            break;
        }

        case 'owo_back':
            state.panel_mode = 'main';
            await respond(buildMainPanel());
            break;

        case 'owo_toggle_sleep':
            config.sleep_enabled = !config.sleep_enabled;
            saveConfig();
            await respond(buildSettingsPanel());
            break;

        case 'owo_reset_stats':
            config.commands.hunt.count   = 0;
            config.commands.battle.count = 0;
            config.commands.pray.count   = 0;
            config.commands.owo.count    = 0;
            config.commands.hb.count     = 0;
            state.session_cmd_count      = 0;
            state.session_start          = timeNow();
            saveConfig();
            state.panel_mode = 'stats';
            await respond(buildStatsPanel());
            break;
    }
}

// ==================== AUTO PANEL UPDATE ====================
async function updatePanel() {
    if (!state.panel_channel_id || !state.panel_message_id) return;
    // Accounts panel mein auto-update nahi karo — user browse kar raha hai
    if (state.panel_mode === 'accounts') return;
    try {
        const channel = bot.channels.cache.get(state.panel_channel_id)
                     || await bot.channels.fetch(state.panel_channel_id).catch(() => null);
        if (!channel) return;
        const message = await channel.messages.fetch(state.panel_message_id).catch(() => null);
        if (message && message.author.id === bot.user.id) {
            let panel;
            if (state.panel_mode === 'stats') panel = buildStatsPanel();
            else if (state.panel_mode === 'protections') panel = buildProtectionsPanel();
            else if (state.panel_mode === 'settings') panel = buildSettingsPanel();
            else if (state.panel_mode === 'huntbot') panel = buildHuntbotPanel();
            else panel = buildMainPanel();
            await message.edit(panel);
        }
    } catch (e) {}
}

// ==================== SELFBOT EVENTS ====================
// ==================== SELFBOT LISTENERS ====================
function attachSelfbotListeners(sb) {
    // ── Rate Limit event — selfbot se rate limit info milti hai ──
    sb.on('rateLimit', (info) => rateLimiter.onRateLimit(info));

    sb.on('ready', () => {
        tlog('ok', `Selfbot Ready: ${sb.user.tag} | ${COMMAND_PATTERNS.length} patterns loaded`);

        const _R2 = '\x1b[0m', _B2 = '\x1b[1m', _DM2 = '\x1b[2m';
        const _GR2 = '\x1b[38;5;82m', _CY2 = '\x1b[38;5;51m', _WH2 = '\x1b[97m';
        const W2 = 54;
        console.log(`  ${_B2}${_CY2}┌─  sᴇʟꜰʙᴏᴛ ${'-'.repeat(W2-14)}┐${_R2}`);
        console.log(`  ${_B2}${_CY2}│${_R2}  ${_GR2}${_B2}✔${_R2}  ${_WH2}@${sb.user.username}${_R2}  ${_DM2}(${sb.user.id}) | ${COMMAND_PATTERNS.length} patterns${_R2}`);
        console.log(`  ${_B2}${_CY2}└${'─'.repeat(W2-2)}┘${_R2}`);
        console.log('');

        // ── State reset — force_stop clear karo taaki grinding kaam kare ──
        state.force_stop       = false;
        state.captcha_detected = false;
        state.is_sleeping      = false;

        // ── Per-account config ab sahi file se load ho chuka hai (switchConfigToAccount ne kiya) ──
        // Grinding resume karo agar pehle chal raha tha
        if (state.grinding_active && !state.force_stop && config.channel_id) startGrinding();
        setInterval(() => { if (state.grinding_active) updatePanel(); }, 5000);

        // ── HB timer restore: owohbconfig.json se naye account ka saved state load karo ──
        // Pehle owohbconfig check karo, phir config fallback
        setTimeout(() => {
            const restored = restoreAccountHbState(sb.user.id);
            if (restored) {
                // owohbconfig se state mila — directly schedule karo
                const remaining = Math.ceil(autoHbState.huntbot_back_at - Math.floor(Date.now() / 1000));
                if (remaining > 0) {
                    tlog('hb', `🔁 Scheduling restored HB for ${sb.user.id} — in ${remaining}s`);
                    scheduleNextHb(remaining, null, autoHbState.huntbot_amount);
                }
            } else {
                restoreHbTimer(); // config.json fallback
            }
        }, 3000);

        if (state._connectingPoller) {
            clearInterval(state._connectingPoller);
            state._connectingPoller = null;
        }
        state.panel_mode = 'main';
        tlog('ok', '🔄 Selfbot ready — updating panel...');
        setTimeout(() => updatePanel().catch(() => {}), 800);
        setTimeout(() => updatePanel().catch(() => {}), 2000);
        setTimeout(() => updatePanel().catch(() => {}), 4000);

        // Start emitting channel members every 10s
        if (_membersEmitInterval) clearInterval(_membersEmitInterval);
        _membersEmitInterval = setInterval(() => {
            const { getIo } = require('./owocore/dashboard');
            emitChannelMembers(getIo(), config.channel_id, sb).catch(() => {});
        }, 10000);
        // Emit immediately once
        setTimeout(() => {
            const { getIo } = require('./owocore/dashboard');
            emitChannelMembers(getIo(), config.channel_id, sb).catch(() => {});
        }, 3000);
    });

    sb.on('messageCreate', async (message) => {
    if (!message || !message.author) return;
    const lower = (message.content || '').toLowerCase();

    // ========== AUTO CAPTCHA — any image sent by self ==========
    // Detects: 1) actual attachment  2) Discord CDN URL in message text
    if (message.author.id === selfbot.user.id) {
        let imgUrl = null;

        // Check attachments first
        if (message.attachments && message.attachments.size > 0) {
            const att = message.attachments.first();
            if (att && att.url) imgUrl = att.url;
        }

        // Check for Discord CDN URL in message text
        if (!imgUrl) {
            const cdnMatch = (message.content || '').match(
                /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+/i
            );
            if (cdnMatch) imgUrl = cdnMatch[0];
        }

        if (imgUrl) {
            tlog('cap', `🔍 Image detected — solving: ${imgUrl.substring(0,60)}`);
            try {
                await message.channel.sendTyping().catch(() => {});
                const solved = await solveCaptchaWithPython(imgUrl);
                if (solved && solved.trim()) {
                    const code = solved.trim();
                    tlog('ok', `Captcha solved: ${code}`);
                    await message.reply(`✅ ${code}`).catch(() => {});
                } else {
                    await message.reply('❌ Solve nahi hua.').catch(() => {});
                }
            } catch (err) {
                tlog('err', `Solve error: ${err.message}`);
                await message.reply(`❌ ${err.message}`).catch(() => {});
            }
            return;
        }
    }


    // ==================== ESSENCE CHECK MODE (passive / /check command) ====================
    // When _essence_check_mode is true, parse Animal Essence from OWO's owo hb reply
    // IMPORTANT: Skip if HB flow is actively waiting/solving — let HB handler consume the message first
    // ALSO: Skip if auto-hunt grind is active (waiting_for_response covers HB steps)
    if (autoHbState._essence_check_mode && message.author.id === OWO_BOT_ID
        && !autoHbState.waiting_for_response
        && !autoHbState.solving_in_progress) {
        const embedData = parseHuntbotEmbed(message);
        // Only process if this message actually has essence data (is a real "owo hb" reply)
        // and NOT a generic hunt/battle/etc OWO response (those won't have Animal Essence)
        if (embedData.animalEssence !== null) {
            saveEssence(embedData.animalEssence);
            tlog('hb', `✅ [Essence Check] Essence = ${embedData.animalEssence}`);
            updatePanel();
            // ── Auto Upgrade after essence detected ──
            const trait = autoHbState.auto_upgrade_trait;
            if (trait && trait !== 'none' && embedData.animalEssence > 0 && selfbot.isReady()) {
                const ch = autoHbState.hb_channel
                    || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null)
                    || message.channel;
                if (ch) {
                    tlog('ok', `⬆ Auto Upgrade: owo upgrade ${trait} all (Essence: ${embedData.animalEssence})`);
                    await sleep(Math.random() * 1.5 + 0.5);
                    await ch.sendTyping().catch(() => {});
                    await sleep(Math.random() * 0.5 + 0.3);
                    await safeSend(ch, `owo upgrade ${trait} all`).catch(() => {});
                }
            }
            // ── Done — clear flag and return only if this was purely a passive essence check ──
            autoHbState._essence_check_mode = false;
            if (!autoHbState.auto_cycle_active && !autoHbState.solving_in_progress) {
                autoHbState.waiting_for_response = false;
                autoHbState.hb_step = null;
            }
            return;
        }
        // If OWO replied but no essence found (e.g. hunt/battle response during grind),
        // do NOT clear _essence_check_mode here — just skip silently and keep waiting
        // for the actual "owo hb" embed to arrive
    }

    // ==================== SMART AUTO HB — 3 STEP FLOW ====================
    if (autoHbState.waiting_for_response && message.author.id === OWO_BOT_ID) {

        // ── STEP 2: Got OWO embed with cowoncy amount ──
        // After bare "owo hb", OWO replies with embed like:
        // "Current Max Autohunt: 12 animals, 0 essence, and 0 xp for 120 cowoncy"
        if (autoHbState.hb_step === 'waiting_embed') {
            const embedData = parseHuntbotEmbed(message);

            // ── BEEP BOOP: Huntbot was already out and just came back ──
            // OWO sends this BEFORE the normal hb embed — we must not get stuck waiting
            if (embedData.huntbotOut) {
                tlog('hb', '┌─ 🤖 BEEP BOOP — Huntbot returned! Re-triggering...');
                // Detect and store Animal Essence from BEEP BOOP message
                if (embedData.animalEssence !== null) {
                    saveEssence(embedData.animalEssence);
                    tlog('hb', `🧪 Essence from BEEP BOOP: ${embedData.animalEssence}`);
                    // Auto Upgrade if essence > 0 and trait selected
                    const trait = autoHbState.auto_upgrade_trait;
                    if (trait && trait !== 'none' && embedData.animalEssence > 0 && selfbot.isReady()) {
                        const ch = autoHbState.hb_channel
                            || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null)
                            || message.channel;
                        if (ch) {
                            tlog('ok', `⬆ Auto Upgrade (BEEP BOOP): owo upgrade ${trait} all`);
                            await sleep(Math.random() * 1.5 + 1.0);
                            await ch.sendTyping().catch(() => {});
                            await sleep(Math.random() * 0.8 + 0.3);
                            await safeSend(ch, `owo upgrade ${trait} all`).catch(() => {});
                        }
                    }
                    updatePanel();
                }
                // Reset and re-send owo hb to get the cowoncy cost embed
                autoHbState.waiting_for_response = false;
                autoHbState.hb_step              = null;
                await sleep(1.5 + Math.random() * 1.0);
                autoHbState.last_hb_sent_at = 0;
                await sendAutoHb(message.channel);
                return;
            }

            // Did we get an amount from this message?
            if (!embedData.amount || embedData.amount <= 0) {
                // ── No amount but has backInSeconds = huntbot already running ──
                if (embedData.backInSeconds && embedData.backInSeconds > 0) {
                    const backSecs = embedData.backInSeconds;
                    const hbAmt    = autoHbState.huntbot_amount || config.commands.hb.amount || 14000;
                    const fireTime = Math.floor(timeNow() + backSecs + 5);
                    const hrs  = Math.floor(backSecs / 3600);
                    const mins = Math.floor((backSecs % 3600) / 60);
                    const secs = backSecs % 60;
                    const timeStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;

                    tlog('warn', `└─ Huntbot already running — back in ${timeStr}`);

                    autoHbState.waiting_for_response = false;
                    autoHbState.hb_step              = null;
                    autoHbState.auto_cycle_active    = true;

                    // Notify in Discord
                    try {
                        const botCh = bot.channels.cache.get(message.channel.id) ||
                                      await bot.channels.fetch(message.channel.id).catch(() => null);
                        if (botCh) {
                            await botCh.send(
                                `<a:HB7f:1498939702915502112> **Huntbot already running!**\n` +
                                `> ⏰ Back in ${timeStr}\n` +
                                `> 📅 Next HB at <t:${fireTime}:t> — <t:${fireTime}:R>`
                            ).catch(() => {});
                        }
                    } catch {}

                    scheduleNextHb(backSecs, message.channel, hbAmt);
                    updatePanel();
                    return;
                }
                // No amount, no backIn — might be a different OWO message, keep waiting
                return;
            }

            // Save detected amount
            const detectedAmount = embedData.amount;
            autoHbState.hb_amount        = detectedAmount;
            autoHbState.huntbot_amount   = detectedAmount;
            config.commands.hb.amount         = detectedAmount;
            config.commands.hb.huntbot_amount = detectedAmount;
            saveConfig();

            // Save essence if detected in this embed
            if (embedData.animalEssence !== null) {
                saveEssence(embedData.animalEssence);
                tlog('hb', `🧪 Essence from embed: ${embedData.animalEssence}`);
                updatePanel();
            }

            tlog('hb', `│  💰 Amount = ${detectedAmount} cowoncy → sending "owo hb ${detectedAmount}"...`);

            // Save backIn time if already in this embed (sometimes OWO includes it)
            if (embedData.backInSeconds && embedData.backInSeconds > 0) {
                autoHbState._pendingBackIn = embedData.backInSeconds;
            }

            // Now send "owo hb [amount]"
            autoHbState.hb_step = 'waiting_captcha';
            // Keep waiting_for_response = true

            await message.channel.sendTyping().catch(() => {});
            await sleep(Math.random() * 1.0 + 0.5);
            await safeSend(message.channel, `owo hb ${detectedAmount}`);
            tlog('hb', `│  ✅ "owo hb ${detectedAmount}" sent — waiting for captcha...`);

            // ── Scan last 100 messages immediately for a captcha that already arrived ──
            // OWO sometimes sends captcha before we even process the embed
            setTimeout(async () => {
                if (!autoHbState.waiting_for_response || autoHbState.hb_step !== 'waiting_captcha') return;
                try {
                    const fetched = await message.channel.messages.fetch({ limit: 100 });
                    // Look for recent OWO message with Discord CDN image
                    const cutoff = Date.now() - 5 * 60 * 1000; // last 5 minutes
                    for (const [, msg] of fetched) {
                        if (msg.author.id !== OWO_BOT_ID) continue;
                        if (msg.createdTimestamp < cutoff) continue;
                        let foundUrl = null;
                        // Check attachments
                        if (msg.attachments?.size > 0) {
                            const att = msg.attachments.first();
                            if (att?.url) foundUrl = att.url;
                        }
                        // Check embed images (Discord CDN only)
                        if (!foundUrl && msg.embeds?.length > 0) {
                            for (const emb of msg.embeds) {
                                const imgUrl = emb.image?.url || emb.image?.proxyURL
                                            || emb.thumbnail?.url || emb.thumbnail?.proxyURL;
                                if (imgUrl && /\/attachments\//i.test(imgUrl) && /cdn\.discordapp\.com|media\.discordapp\.net/i.test(imgUrl)) {
                                    foundUrl = imgUrl; break;
                                }
                            }
                        }
                        // Check CDN URL in text
                        if (!foundUrl) {
                            const m = msg.content?.match(/https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+/i);
                            if (m) foundUrl = m[0];
                        }
                        if (foundUrl) {
                            tlog('cap', `│  📷 Captcha found in history — solving: ${foundUrl.substring(0,60)}...`);
                            autoHbState.waiting_for_response = false;
                            autoHbState.hb_step              = null;
                            autoHbState.solving_in_progress  = true;
                            updatePanel();
                            try {
                                await message.channel.sendTyping().catch(() => {});
                                await sleep(0.5 + Math.random() * 0.5);
                                const solvedCaptcha = await solveCaptchaWithPython(foundUrl);
                                const finalCode = solvedCaptcha ? solvedCaptcha.trim() : null;
                                const hbAmt2 = autoHbState.hb_amount || config.commands.hb.amount || 14000;
                                if (finalCode) {
                                    await sleep(Math.random() * 1.2 + 0.5);
                                    await safeSend(message.channel, `owo hb ${hbAmt2} ${finalCode}`);
                                    config.commands.hb.count     = (config.commands.hb.count || 0) + 1;
                                    config.stats.hb_solved_count = (config.stats.hb_solved_count || 0) + 1;
                                    saveConfig();
                                    tlog('ok', `└─ ✅ AUTO HB COMPLETE (history) → owo hb ${hbAmt2} ${finalCode}`);
                                    autoHbState.auto_cycle_active = true;
                                    autoHbState.hb_channel = message.channel;
                                } else {
                                    tlog('warn', 'Captcha solve failed (history scan) — retrying in 2 min');
                                    setTimeout(async () => {
                                        autoHbState.last_hb_sent_at = 0;
                                        await sendAutoHb(autoHbState.hb_channel || message.channel);
                                    }, 120000);
                                }
                            } catch (err) {
                                tlog('err', `HB error (history): ${err.message}`);
                            } finally {
                                autoHbState.solving_in_progress = false;
                                updatePanel();
                            }
                            return; // found and handled
                        }
                    }
                } catch (e) {
                    // fetch failed — just keep waiting for messageCreate
                }
            }, 3000); // wait 3s for OWO to send captcha, then scan

            // Timeout for captcha — 90s to give OWO time to send image
            setTimeout(() => {
                if (autoHbState.waiting_for_response && autoHbState.hb_step === 'waiting_captcha') {
                    tlog('warn', 'Timeout waiting for captcha image (90s) — retrying...');
                    autoHbState.waiting_for_response = false;
                    autoHbState.hb_step              = null;
                    autoHbState.solving_in_progress  = false;
                    autoHbState.last_hb_sent_at      = 0;
                    const retryCh = autoHbState.hb_channel
                        || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null);
                    if (retryCh) sendAutoHb(retryCh);
                }
            }, 90000);

            return;
        }

        // ── STEP 3: Got captcha image — solve it and send "owo hb [amount] [code]" ──
        if (autoHbState.hb_step === 'waiting_captcha') {
            let captchaUrl = null;
            const _hasAtt = message.attachments && message.attachments.size > 0;

            // GUARD: essence-info embed with no attachment — save essence, keep waiting
            const _earlyCheck = parseHuntbotEmbed(message);
            if (!_hasAtt && _earlyCheck.animalEssence !== null && !_earlyCheck.amount) {
                saveEssence(_earlyCheck.animalEssence);
                tlog('hb', `│  [Captcha Step] Essence (${_earlyCheck.animalEssence}) — still waiting for captcha...`);
                updatePanel();
                return;
            }

            // Update amount/backIn from this message first
            const extraEmbed = parseHuntbotEmbed(message);
            if (extraEmbed.amount && extraEmbed.amount > 0) {
                autoHbState.hb_amount      = extraEmbed.amount;
                autoHbState.huntbot_amount = extraEmbed.amount;
                config.commands.hb.amount  = extraEmbed.amount;
                saveConfig();
            }
            if (extraEmbed.backInSeconds && extraEmbed.backInSeconds > 0) {
                autoHbState._pendingBackIn = extraEmbed.backInSeconds;
            }

            // ── CHECK backIn FIRST (no attachment) — huntbot still running, no captcha coming ──
            if (!_hasAtt && autoHbState._pendingBackIn && autoHbState._pendingBackIn > 0) {
                const backSecs = autoHbState._pendingBackIn;
                const hbAmt    = autoHbState.hb_amount || config.commands.hb.amount || 14000;
                const fireTime = Math.floor(timeNow() + backSecs + 5);
                const hrs  = Math.floor(backSecs / 3600);
                const mins = Math.floor((backSecs % 3600) / 60);
                const secs = backSecs % 60;
                const timeStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;

                tlog('warn', `└─ Huntbot already running — back in ${timeStr}. Scheduling next HB...`);

                // Reset state
                autoHbState.waiting_for_response = false;
                autoHbState.hb_step              = null;
                autoHbState.solving_in_progress  = false;
                autoHbState._pendingBackIn       = null;
                autoHbState.auto_cycle_active    = true;

                // Notify in Discord channel
                try {
                    const botCh = bot.channels.cache.get(message.channel.id) ||
                                  await bot.channels.fetch(message.channel.id).catch(() => null);
                    if (botCh) {
                        await botCh.send(
                            `<a:HB7f:1498939702915502112> **Huntbot already running!**\n` +
                            `> ⏰ Back in ${timeStr}\n` +
                            `> 📅 Next HB at <t:${fireTime}:t> — <t:${fireTime}:R>`
                        ).catch(() => {});
                    }
                } catch {}

                scheduleNextHb(backSecs, message.channel, hbAmt);
                updatePanel();
                return;
            }

            // ── Priority 1: attachment (most reliable) ──
            if (_hasAtt) {
                const att = message.attachments.first();
                if (att && att.url) captchaUrl = att.url;
            }

            // ── Priority 2: embed image — Discord CDN only (reject owobotcdn.com etc.) ──
            if (!captchaUrl && message.embeds && message.embeds.length > 0) {
                for (const emb of message.embeds) {
                    const imgUrl = emb.image?.url || emb.image?.proxyURL
                                || emb.thumbnail?.url || emb.thumbnail?.proxyURL
                                || emb.image?.proxy_url || emb.thumbnail?.proxy_url;
                    if (imgUrl && /\/attachments\//i.test(imgUrl) && /cdn\.discordapp\.com|media\.discordapp\.net/i.test(imgUrl)) {
                        captchaUrl = imgUrl; break;
                    }
                }
            }

            // ── Priority 3: Discord CDN URL in message text ──
            if (!captchaUrl) {
                const cdnMatch = (message.content || '').match(
                    /https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/attachments\/[^\s<>]+/i
                );
                if (cdnMatch) captchaUrl = cdnMatch[0];
            }

            // owobotcdn.com and other external hosts are intentionally ignored

            if (!captchaUrl) {
                // No image found — log what OWO actually sent for diagnosis
                tlog('warn', `│  ⏳ No captcha image yet — embeds:${message.embeds?.length||0} att:${message.attachments?.size||0} content:"${message.content?.substring(0,60)}"`);
                return;
            }

            // Got image — solve it
            tlog('cap', '│  📷 Captcha image found — solving...');
            autoHbState.waiting_for_response = false;
            autoHbState.hb_step              = null;
            autoHbState.solving_in_progress  = true;
            updatePanel();

            try {
                await message.channel.sendTyping().catch(() => {});
                await sleep(0.5 + Math.random() * 0.5);

                const solvedCaptcha = await solveCaptchaWithPython(captchaUrl);
                const finalCode = solvedCaptcha ? solvedCaptcha.trim() : null;
                const hbAmount  = autoHbState.hb_amount || config.commands.hb.amount || 14000;

                if (finalCode) {
                    await sleep(Math.random() * 1.2 + 0.5);
                    // Final command: owo hb [amount] [captcha code]
                    await safeSend(message.channel, `owo hb ${hbAmount} ${finalCode}`);

                    config.commands.hb.count     = (config.commands.hb.count || 0) + 1;
                    config.stats.hb_solved_count = (config.stats.hb_solved_count || 0) + 1;
                    saveConfig();
                    tlog('ok', `└─ ✅ AUTO HB COMPLETE → owo hb ${hbAmount} ${finalCode}`);

                    // Schedule next HB if we already know backIn time
                    if (autoHbState._pendingBackIn && autoHbState._pendingBackIn > 0) {
                        scheduleNextHb(autoHbState._pendingBackIn, message.channel, hbAmount);
                        autoHbState._pendingBackIn = null;
                    } else {
                        // Will schedule after OWO replies to "owo hb [amount] [code]"
                        autoHbState.auto_cycle_active = true;
                        autoHbState.hb_channel = message.channel;
                    }
                } else {
                    tlog('warn', 'Captcha solve failed — retrying in 2 min');
                    await safeSend(message.channel, `⚠️ Captcha solve nahi hua. 2 min mein retry karega.`);
                    setTimeout(async () => {
                        autoHbState.last_hb_sent_at = 0;
                        await sendAutoHb(autoHbState.hb_channel || message.channel);
                    }, 120000);
                }
            } catch (error) {
                tlog('err', `HB error: ${error.message}`);
                await safeSend(message.channel, `⚠️ Auto HB error: ${error.message}`);
            } finally {
                autoHbState.solving_in_progress = false;
                updatePanel();
            }
            return;
        }
    }

    // ── After "owo hb [amount] [code]" — OWO replies with huntbot status (BACK IN X) ──
    // STRICT GUARD: sirf tab chalega jab hum ne khud owo hb bheja ho aur OWO ka BACK IN response aaye
    if (message.author.id === OWO_BOT_ID &&
        !autoHbState.waiting_for_response &&
        !autoHbState.solving_in_progress &&
        autoHbState.auto_cycle_active &&
        autoHbState.hb_channel !== null) {  // hb_channel sirf tab set hota hai jab hum ne hb bheja ho

        const embedData = parseHuntbotEmbed(message);

        // --- Update Animal Essence if detected ---
        if (embedData.animalEssence !== null) {
            saveEssence(embedData.animalEssence);
            tlog('hb', `🧪 Essence updated: ${embedData.animalEssence}`);
            updatePanel();

            // --- Auto Upgrade Logic ---
            const trait = autoHbState.auto_upgrade_trait;
            if (trait && trait !== 'none' && embedData.animalEssence > 0 && selfbot.isReady()) {
                const userId = selfbot.user.id;
                const ch = autoHbState.hb_channel
                    || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : null)
                    || message.channel;
                if (ch) {
                    const upgradeCmd = `<@${userId}> owo upgrade ${trait} all`;
                    tlog('ok', `⬆ Auto Upgrade: owo upgrade ${trait} all (Essence: ${embedData.animalEssence})`);
                    await sleep(Math.random() * 1.5 + 0.5);
                    await ch.sendTyping().catch(() => {});
                    await sleep(Math.random() * 0.8 + 0.3);
                    await safeSend(ch, `owo upgrade ${trait} all`).catch(() => {});
                }
            }
        }

        if (embedData.amount && embedData.amount > 0) {
            autoHbState.huntbot_amount        = embedData.amount;
            config.commands.hb.amount         = embedData.amount;
            config.commands.hb.huntbot_amount = embedData.amount;
            saveConfig();
        }

        if (embedData.backInSeconds && embedData.backInSeconds > 0) {
            const ch  = autoHbState.hb_channel || (config.channel_id ? selfbot.channels.cache.get(config.channel_id) : message.channel);
            const amt = embedData.amount || autoHbState.huntbot_amount || config.commands.hb.amount || 14000;
            // ── IMPORTANT: auto_cycle_active false karo PEHLE schedule karo ──
            // Warna next OWO message pe phir se ye block chalega aur dobara schedule ho jaayega
            autoHbState.auto_cycle_active = false;
            autoHbState.hb_channel        = null;
            scheduleNextHb(embedData.backInSeconds, ch, amt);
            tlog('hb', '📅 Next HB auto-scheduled from OWO response!');
            // "BACK IN" reply has no Animal Essence — send fresh owo hb to read essence & auto upgrade
            if (ch && autoHbState.auto_upgrade_trait !== 'none') {
                setTimeout(async () => {
                    if (!autoHbState._essence_check_mode && !autoHbState.waiting_for_response) {
                        tlog('hb', '🔍 Post-HB: checking essence for auto upgrade...');
                        autoHbState._essence_check_mode = true;
                        await ch.sendTyping().catch(() => {});
                        await sleep(Math.random() * 0.5 + 0.3);
                        await safeSend(ch, 'owo hb').catch(() => {});
                        setTimeout(() => { autoHbState._essence_check_mode = false; }, 15000);
                    }
                }, 3000);
            }
            return;
        }
    }
    
    // ========== MANUAL OWO HB — Essence Detection ==========
    // When user manually types "owo hb" OR auto essence check fires — detect Animal Essence
    // GUARD: Only run this if NOT in an active HB flow (waiting/solving) and not in grind captcha check
    // This prevents grind-time OWO responses (hunt/battle) from falsely triggering essence logic
    if (message.author.id === OWO_BOT_ID
        && !autoHbState.waiting_for_response
        && !autoHbState.solving_in_progress
        && !autoHbState._essence_check_mode) {
        const manualEmbedData = parseHuntbotEmbed(message);
        if (manualEmbedData.animalEssence !== null) {
            const prevEssence = autoHbState.animal_essence;
            saveEssence(manualEmbedData.animalEssence);
            if (prevEssence !== manualEmbedData.animalEssence) {
                tlog('hb', `🧪 Essence synced: ${formatEssence(manualEmbedData.animalEssence)}`);
                updatePanel();
            }
        }
    }

    // ========== AUTO HB - WRONG PASSWORD RETRY ==========
    // OWO: "Wrong password! The command is owo autohunt 120 {password}! | Password will reset in X minutes"
    // This means our OCR got the wrong text — re-request a fresh password by sending hb again
    if (message.author.id === OWO_BOT_ID &&
        !autoHbState.waiting_for_response &&
        !autoHbState.solving_in_progress &&
        lower.includes('wrong password') &&
        lower.includes('autohunt')) {
        
        const resetMatch = lower.match(/reset in (\d+) minute/);
        const resetMins  = resetMatch ? parseInt(resetMatch[1]) : 0;
        
        tlog('warn', `Wrong password detected — reset in ${resetMins} min`);
        
        if (resetMins === 0 || resetMins <= 1) {
            // Password already reset or about to — retry immediately
            const retryChannel = autoHbState.hb_channel || message.channel;
            const retryAmount  = autoHbState.hb_amount  || config.commands.hb.amount || 14000;
            tlog('hb', `🔄 Retrying owo hb ${retryAmount}...`);
            await sleep(2);
            autoHbState.last_hb_sent_at = 0; // bypass cooldown for retry
            await sendAutoHb(retryChannel, retryAmount);
        } else {
            // Need to wait — schedule retry after reset time
            tlog('warn', `Waiting ${resetMins} min for password reset, then retrying...`);
            setTimeout(async () => {
                const retryChannel = autoHbState.hb_channel || message.channel;
                const retryAmount  = autoHbState.hb_amount  || config.commands.hb.amount || 14000;
                tlog('hb', `🔄 Auto-retrying owo hb ${retryAmount} after password reset`);
                autoHbState.last_hb_sent_at = 0;
                await sendAutoHb(retryChannel, retryAmount);
            }, (resetMins * 60 + 5) * 1000);
        }
        return;
    }

    // ========== REGULAR CAPTCHA DETECTION (Grinding) ==========
    if (message.author.id === OWO_BOT_ID && (message.mentions.has(selfbot.user) || lower.includes(selfbot.user.id))) {
        if (["captcha", "human", "verify", "solve"].some(kw => lower.includes(kw))) {
            tlog('cap', '🚨 CAPTCHA DETECTED — grinding stopped!');
            state.captcha_detected = true;
            state.grinding_active  = false;
            state.force_stop       = true;
            config.stats.captcha_count++;
            saveConfig();
            updatePanel();
            try { await safeSend(message.channel, `🚨 **CAPTCHA DETECTED!** <@${selfbot.user.id}> Please verify.`); } catch {}
            return;
        }
    }

    // ── Parse OWO daily response ──
    if (message.author.id === OWO_BOT_ID) {
        const raw = message.content || "";

        const isDailyCooldown = lower.includes('need to wait') && (lower.includes('daily') || raw.match(/(\d+)H\s*\*?\*?\d+M/i));
        const isDailySuccess  = lower.includes('daily streak') && lower.includes('cowoncy');

        if (isDailyCooldown) {
            const stripped = raw.replace(/\*\*/g, '');
            const timeMatch = stripped.match(/(\d+)H\s*(\d+)M\s*(\d+)S/i);
            if (timeMatch) {
                const h = parseInt(timeMatch[1]) || 0;
                const m = parseInt(timeMatch[2]) || 0;
                const s = parseInt(timeMatch[3]) || 0;
                const secondsUntilNext = (h * 3600) + (m * 60) + s;
                if (secondsUntilNext > 60) {
                    config.commands.daily.next_at = timeNow() + secondsUntilNext + 30;
                    saveConfig();
                    tlog('info', `📅 Daily cooldown: next in ${h}h ${m}m ${s}s`);
                }
            }
        }

        if (isDailySuccess) {
            const stripped = raw.replace(/\*\*/g, '');
            const timeMatch = stripped.match(/next.*?(\d+)H\s*(\d+)M\s*(\d+)S/i);
            if (timeMatch) {
                const h = parseInt(timeMatch[1]) || 0;
                const m = parseInt(timeMatch[2]) || 0;
                const s = parseInt(timeMatch[3]) || 0;
                config.commands.daily.next_at = timeNow() + (h*3600) + (m*60) + s + 30;
            } else {
                config.commands.daily.next_at = timeNow() + 86400 + 30;
            }
            config.commands.daily.last_used = timeNow();
            saveConfig();
            tlog('ok', '📅 Daily success — next_at saved!');
        }
    }

    if (message.channel.type === 'DM' && state.captcha_detected && lower.includes("verified that you are human")) {
        if (config.protections.auto_resume.active) {
            tlog('ok', '✅ Verified! Resuming grinding...');
            state.captcha_detected = false;
            state.force_stop       = false;
            state.grinding_active  = true;
            startGrinding();
            updatePanel();
        }
    }

    // ==================== REAL DISCORD MESSAGE → DASHBOARD PREVIEW ====================
    // Sirf config channel ke messages push karo
    try {
        const configChId = config?.channel_id;
        if (configChId && message.channel?.id === configChId) {
            const isOwoBot = message.author.id === OWO_BOT_ID;
            const isSelfbot = selfbot && message.author.id === selfbot.user?.id;

            const isOtherUser = !isOwoBot && !isSelfbot && !message.author.bot;

            if (isOwoBot || isSelfbot || isOtherUser) {
                const ts = new Date().toLocaleTimeString('en-IN', { hour12: false }).slice(0, 5);
                const avatarUrl = message.author.avatar
                    ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/${parseInt(message.author.discriminator||0) % 5}.png`;

                // Parse embeds — real Discord embed data
                const parsedEmbeds = (message.embeds || []).map(emb => ({
                    color: emb.color ? '#' + emb.color.toString(16).padStart(6, '0') : '#5865f2',
                    title: emb.title || '',
                    description: emb.description || '',
                    fields: (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: f.inline })),
                    footer: emb.footer?.text || '',
                    thumbnail: emb.thumbnail?.url || '',
                    image: emb.image?.url || '',
                }));

                // Attachment image (battle board, hunt result, etc.)
                let attachmentUrl = null;
                if (message.attachments && message.attachments.size > 0) {
                    const att = message.attachments.first();
                    if (att && att.url) attachmentUrl = att.url;
                }

                // Fetch all custom emojis as base64 (selfbot CDN access)
                const allText = [
                    message.content || '',
                    ...parsedEmbeds.map(e => [e.title, e.description, e.footer, ...e.fields.map(f => f.name + ' ' + f.value)].join(' '))
                ].join(' ');
                const emojiMap = await extractAndFetchEmojis(allText).catch(() => ({}));

                emitDiscordMessage({
                    id: message.id,
                    ts,
                    authorId: message.author.id,
                    authorName: message.author.username || message.author.tag || 'Unknown',
                    authorTag: message.author.tag || message.author.username,
                    avatar: avatarUrl,
                    content: message.content || '',
                    embeds: parsedEmbeds,
                    attachmentUrl,
                    emojiMap: isOtherUser ? {} : emojiMap,
                    isOwo: isOwoBot,
                    isSelfbot,
                    isOtherUser,
                });
            }
        }
    } catch (_e) { /* silent — preview fail hone se grind affect na ho */ }

    });  // end messageCreate
}     // end attachSelfbotListeners

// ==================== SELFBOT HOT-SWAP ====================
async function rebootSelfbot(newToken) {
    tlog('info', '🔄 Hot-swapping selfbot token...');

    // ── SAVE current account's HB state BEFORE switching ──
    if (selfbot && selfbot.user && selfbot.user.id) {
        saveCurrentAccountHbState(selfbot.user.id);
        tlog('hb', `💾 Saved HB state for ${selfbot.user.id} before switch`);
    }

    // Grinding rok do
    state.grinding_active = false;
    state.force_stop = true;
    state.is_grinding_loop = false;

    // HB timer clear karo — naye account ka alag timer hoga
    if (autoHbState.huntbot_timer) {
        clearTimeout(autoHbState.huntbot_timer);
        autoHbState.huntbot_timer = null;
    }
    // HB state reset (new account ke liye fresh start)
    autoHbState.waiting_for_response = false;
    autoHbState.solving_in_progress  = false;
    autoHbState.hb_step              = null;
    autoHbState.last_hb_sent_at      = 0;
    autoHbState.auto_cycle_active    = false;
    autoHbState.hb_channel           = null;
    autoHbState.huntbot_back_at      = 0;
    autoHbState.huntbot_amount       = null;
    autoHbState._pendingBackIn       = null;
    autoHbState._essence_check_mode  = false;

    // Naye account ka config load karo
    await switchConfigToAccount(newToken);

    // Old selfbot destroy
    try { selfbot.destroy(); } catch {}

    // 1.5s wait
    await new Promise(res => setTimeout(res, 1500));

    // Naya fresh instance
    selfbot = new SelfbotClient({ checkUpdate: false });

    // Nayi instance pe listeners attach karo
    attachSelfbotListeners(selfbot);

    // Login with new token
    selfbot.login(newToken).catch(e => {
        if (e && e.message && !e.message.includes('Cannot read properties of undefined')) {
            tlog('err', `Selfbot re-login failed: ${e.message}`);
        }
    });
}

// Startup pe initial selfbot listeners attach karo
attachSelfbotListeners(selfbot);

// ==================== GRINDING LOOP ====================
async function startGrinding() {
    if (state.is_grinding_loop || !selfbot.isReady()) return;
    state.is_grinding_loop = true;
    tlog('grind', '🚀 Grinding started!');

    if (config.commands.daily.active && config.channel_id) {
        let dailyReady;
        if (config.commands.daily.next_at > 0) {
            dailyReady = timeNow() >= config.commands.daily.next_at;
        } else {
            dailyReady = config.commands.daily.last_used === 0 ||
                         (timeNow() - config.commands.daily.last_used) >= 86400;
        }
        if (dailyReady) {
            let ch = null;
            for (let attempt = 0; attempt < 5; attempt++) {
                ch = selfbot.channels.cache.get(config.channel_id);
                if (!ch) ch = await selfbot.channels.fetch(config.channel_id).catch(() => null);
                if (ch) break;
                await sleep(2);
            }
            if (ch) {
                try {
                    tlog('info', '📅 Sending owo daily...');
                    await ch.sendTyping().catch(() => {});
                    await sleep(Math.random() * 1.0 + 1.5);
                    const sent = await safeSend(ch, 'owo daily');
                    if (sent) {
                        config.commands.daily.count++;
                        config.commands.daily.last_used = timeNow();
                        config.commands.daily.next_at   = timeNow() + 86400 + 30;
                        saveConfig();
                        tlog('ok', '✅ Daily sent — waiting for OWO response...');
                        await sleep(Math.random() * 3 + 5);
                    } else {
                        tlog('err', 'Daily send failed (null)');
                    }
                } catch (e) { tlog('err', `Daily error: ${e.message}`); }
            } else {
                tlog('err', 'Daily: channel not found after retries');
            }
        }
    }

    while (selfbot.isReady() && state.grinding_active && !state.force_stop) {
        try {
            const channel = selfbot.channels.cache.get(config.channel_id);
            if (!channel) { await sleep(5); continue; }

            const now = timeNow();

            if (config.sleep_enabled && !state.is_sleeping && now - state.last_sleep_time >= 7200) {
                state.is_sleeping    = true;
                state.sleep_end_time = now + 2400;
                state.sleep_count++;
                state.last_sleep_at  = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                tlog('warn', '😴 Sleeping 40 min...');
                updatePanel();
            }
            if (state.is_sleeping) {
                if (now >= state.sleep_end_time) {
                    state.is_sleeping     = false;
                    state.last_sleep_time = now;
                    tlog('ok', '⏰ Waking up!');
                    updatePanel();
                    await sleep(Math.random() * 10 + 2);
                } else { await sleep(10); continue; }
            }
            if (state.captcha_detected || state.force_stop) break;

            const [doBreak, breakDur] = anti.shouldDistract();
            if (doBreak && config.protections.human_behavior.active) {
                await sleep(breakDur);
            }

            if (state.cmds_since_filler >= anti._rand(30, 40)) {
                state.cmds_since_filler = 0;
                const fillerCmd = FILLER_ALIASES[Math.floor(Math.random() * FILLER_ALIASES.length)];
                await channel.sendTyping().catch(() => {});
                await sleep(Math.random() * 1.5 + 0.5);
                await safeSend(channel, fillerCmd);
                config.stats.filler_cmds_ever++;
                await sleep(Math.random() * 4 + 4);
            }

            if (config.protections.human_behavior.active) {
                await channel.sendTyping().catch(() => {});
                const typingDelay = Math.random() < 0.2
                    ? Math.random() * 2.5 + 1.5
                    : Math.random() * 1.0 + 0.4;
                await sleep(typingDelay);
            }

            if (Math.random() < 0.12 && config.protections.random_messages.active) {
                await safeSend(channel, anti.getRandomMessage());
                await sleep(Math.random() * 2 + 1);
            }

            if (config.commands.owo.active && Math.random() < 0.07) {
                await safeSend(channel, "owo");
                config.commands.owo.count++;
                state.session_owo++;
            }

            if (config.commands.daily.active) {
                let dailyReady;
                if (config.commands.daily.next_at > 0) {
                    dailyReady = timeNow() >= config.commands.daily.next_at;
                } else {
                    dailyReady = config.commands.daily.last_used === 0 ||
                                 (timeNow() - config.commands.daily.last_used) >= 86400;
                }
                if (dailyReady) {
                    tlog('info', '📅 Daily ready — sending...');
                    await channel.sendTyping().catch(() => {});
                    await sleep(Math.random() * 1.0 + 1.0);
                    const sent = await safeSend(channel, 'owo daily');
                    if (sent) {
                        config.commands.daily.count++;
                        config.commands.daily.last_used = timeNow();
                        config.commands.daily.next_at   = timeNow() + 86400 + 30;
                        saveConfig();
                        tlog('ok', '✅ Daily sent!');
                        await sleep(Math.random() * 3 + 5);
                    }
                }
            }

            if (config.commands.pray.active) {
                const prayReady = timeNow() - config.commands.pray.last_used >= config.commands.pray.cd;
                if (prayReady) {
                    tlog('info', '🙏 Pray ready — sending...');
                    await channel.sendTyping().catch(() => {});
                    const typingDelay = Math.random() < 0.2
                        ? Math.random() * 2.5 + 1.5
                        : Math.random() * 1.0 + 0.4;
                    await sleep(typingDelay);
                    await safeSend(channel, 'owo pray');
                    config.commands.pray.last_used = timeNow();
                    config.commands.pray.cd = Math.floor(Math.random() * 60) + 300;
                    config.commands.pray.count++;
                    config.stats.total_commands_ever++;
                    state.session_pray++;
                    state.session_cmd_count++;
                    saveConfig();
                    await sleep(anti.getSmartCooldown());
                }
            }

            let cmdType = getNextCommandFromPattern();
            let cmdStr = getCommandString(cmdType);

            if (config.protections.smart_typo.active && Math.random() < 0.1) {
                await safeSend(channel, anti.getTypo(cmdStr));
                await sleep(Math.random() * 1.5 + 1);
            }

            await safeSend(channel, cmdStr);
            const cmdKey = cmdType.replace('owo ', '');
            config.commands[cmdKey].count++;
            config.stats.total_commands_ever++;
            state.session_cmd_count++;
            state.cmds_since_filler++;
            if (cmdKey === 'hunt') state.session_hunt++;
            else if (cmdKey === 'battle') state.session_battle++;

            const cd = config.single_mode ? (17.2 + Math.random() * 1.2) : anti.getSmartCooldown();
            saveConfig();

            if (state.session_cmd_count % 10 === 0) updatePanel();
            await sleep(cd);

        } catch (e) {
            tlog('err', `Grind loop: ${e.message}`);
            await sleep(5);
        }
    }
    state.is_grinding_loop = false;
    tlog('warn', '🛑 Grinding stopped');
    updatePanel();
}

// ==================== TEXT COMMAND ====================
bot.on('messageCreate', async (message) => {
    if (message.content === '!owopanel') {
        // In DMs/group DMs, bot cannot delete user messages — skip delete
        const isDM = !message.guild;
        if (!isDM) { try { await message.delete(); } catch {} }
        const msg = await message.channel.send(buildMainPanel());
        state.panel_channel_id = message.channel.id;
        state.panel_message_id = msg.id;
    }
});

// ==================== LOGIN ====================
bot.login(BOT_TOKEN).catch(e => tlog('err', `Bot login failed: ${e.message}`));
selfbot.login(USER_TOKEN).catch(e => {
    // Ignore "catch of undefined" — this is a discord.js-selfbot quirk on first connect
    if (e && e.message && !e.message.includes('Cannot read properties of undefined')) {
        tlog('err', `Selfbot login failed: ${e.message}`);
    }
});

// ==================== WEB DASHBOARD ====================
const { startDashboard, captureLog, emitDiscordMessage } = require('./owocore/dashboard');
_dashboardCapture = captureLog;
startDashboard({
    state, config, autoHbState, bot,
    getSelfbot: () => selfbot,
    startGrinding, saveConfig, updatePanel,
    switchToAccount, readBotconfig, fetchAccountInfo, _accInfoCache,
    rebootSelfbot, sendAutoHb,
    // HB per-account state functions
    saveCurrentAccountHbState,
    loadHbConfig,
    saveHbConfig,
    OWO_HB_CONFIG_FILE: () => OWO_HB_CONFIG_FILE,
});











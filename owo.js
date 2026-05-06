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

let _dashboardCapture = null;
let emitDiscordMessage = () => {}; // Dashboard load hone ke baad replace hoga

function tlog(type, msg) {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const T  = `${_DM}[${ts}]${_R}`;
    switch (type) {
        case 'ok':    console.log(`${T} ${_GR}${_B}✔${_R}  ${msg}`); break;
        case 'err':   console.log(`${T} ${_RD}${_B}✖${_R}  ${_RD}[Error]${_R} ${msg}`); break;
        case 'warn':  console.log(`${T} ${_YL}${_B}⚠${_R}  ${_YL}${msg}${_R}`); break;
        case 'hb':    console.log(`${T} ${_MG}${_B}◈${_R}  ${_MG}${msg}${_R}`); break;
        case 'info':  console.log(`${T} ${_CY}${_B}ℹ${_R}  ${msg}`); break;
        case 'grind': console.log(`${T} ${_GR}${_B}▶${_R}  ${msg}`); break;
        case 'cap':   console.log(`${T} ${_PK}${_B}◉${_R}  ${_PK}${msg}${_R}`); break;
        default:      console.log(`${T}  ${msg}`); break;
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
// ==================== OWOCONFIG TOKEN HELPERS ====================
// Tokens ab owoconfig.json mein save hote hain — botconfig.json ki zaroorat nahi

const OWO_MAIN_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig.json');

function readOwoconfigTokens() {
    try {
        if (fs.existsSync(OWO_MAIN_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(OWO_MAIN_CONFIG_FILE, 'utf8'));
        }
    } catch (e) { tlog('err', `owoconfig read error: ${e.message}`); }
    return {};
}

// ==================== TERMINAL SETUP WIZARD ====================
const readline = require('readline');

// ANSI colors (reuse existing constants)
const _BOLD  = '\x1b[1m';
const _DIM   = '\x1b[2m';
const _RST   = '\x1b[0m';
const _RED   = '\x1b[38;5;196m';
const _GRN   = '\x1b[38;5;82m';
const _YEL   = '\x1b[38;5;226m';
const _CYN   = '\x1b[38;5;51m';
const _MAG   = '\x1b[38;5;201m';
const _WHT   = '\x1b[97m';
const _BG_BK = '\x1b[40m';

function cls() { process.stdout.write('\x1b[2J\x1b[H'); }

function banner() {
    const W = 58;
    const line = (txt, color='') => {
        const pad = Math.max(0, W - 2 - txt.replace(/\x1b\[[0-9;]*m/g, '').length);
        const lp = Math.floor(pad/2), rp = pad - lp;
        console.log(`${_DIM}║${_RST}${color}${' '.repeat(lp)}${txt}${' '.repeat(rp)}${_RST}${_DIM}║${_RST}`);
    };
    const div  = () => console.log(`${_DIM}╠${'═'.repeat(W-2)}╣${_RST}`);
    const top  = () => console.log(`${_DIM}╔${'═'.repeat(W-2)}╗${_RST}`);
    const bot  = () => console.log(`${_DIM}╚${'═'.repeat(W-2)}╝${_RST}`);

    cls();
    top();
    line('');
    line(`${_MAG}${_BOLD}  OwO Grinder — First Time Setup  ${_RST}`, '');
    line(`${_DIM}  Auto-config wizard  ${_RST}`, '');
    line('');
    div();
    line('');
    line(`${_YEL}  owoconfig.json nahi mili — chalein setup!  ${_RST}`);
    line('');
    div();
    line(`${_DIM}  [1] User Token   — Discord selfbot token  ${_RST}`);
    line(`${_DIM}  [2] Bot Token     — Discord bot token      ${_RST}`);
    line('');
    bot();
    console.log('');
}

function printStep(step, total, label) {
    const bar = `${_MAG}[${step}/${total}]${_RST}`;
    console.log(`\n${bar} ${_BOLD}${_WHT}${label}${_RST}`);
    console.log(`${_DIM}${'─'.repeat(54)}${_RST}`);
}

function printOk(msg)   { console.log(`  ${_GRN}${_BOLD}✔${_RST}  ${msg}`); }
function printErr(msg)  { console.log(`  ${_RED}${_BOLD}✖${_RST}  ${_RED}${msg}${_RST}`); }
function printInfo(msg) { console.log(`  ${_CYN}${_BOLD}ℹ${_RST}  ${msg}`); }
function printWarn(msg) { console.log(`  ${_YEL}${_BOLD}⚠${_RST}  ${_YEL}${msg}${_RST}`); }

function askHidden(rl, prompt) {
    return new Promise((resolve) => {
        // Show prompt, then hide input
        process.stdout.write(`  ${_CYN}${prompt}${_RST} `);

        // Try to use raw mode for hidden input
        let input = '';
        const stdin = process.stdin;

        function onData(char) {
            if (char === '\n' || char === '\r') {
                stdin.removeListener('data', onData);
                if (stdin.isTTY) { try { stdin.setRawMode(false); } catch(_) {} }
                process.stdout.write('\n');
                resolve(input.trim());
            } else if (char === '\u0003') {
                // Ctrl+C
                process.stdout.write('\n');
                process.exit(0);
            } else if (char === '\u007F' || char === '\b') {
                if (input.length > 0) {
                    input = input.slice(0, -1);
                    process.stdout.write('\b \b');
                }
            } else if (char >= ' ') {
                input += char;
                process.stdout.write('*');
            }
        }

        if (stdin.isTTY) {
            try {
                stdin.setRawMode(true);
                stdin.resume();
                stdin.setEncoding('utf8');
                stdin.on('data', onData);
                return;
            } catch(_) {}
        }
        // Fallback: normal readline (non-TTY / piped)
        rl.question(`  ${_CYN}${prompt}${_RST} `, (ans) => resolve(ans.trim()));
    });
}

async function validateDiscordToken(token, type = 'user') {
    const isBot = type === 'bot';
    const authHeader = isBot ? `Bot ${token}` : token;
    const apiPath = isBot ? '/api/v10/users/@me' : '/api/v9/users/@me';

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'discord.com',
            path: apiPath,
            method: 'GET',
            headers: { Authorization: authHeader },
            timeout: 8000
        }, (res) => {
            let data = '';
            res.on('data', d => { data += d; });
            res.on('end', () => {
                try {
                    const u = JSON.parse(data);
                    if (u.id && !u.message) {
                        resolve({ valid: true, id: u.id, username: u.global_name || u.username || u.tag, tag: u.username });
                    } else {
                        resolve({ valid: false, reason: u.message || 'Discord rejected token' });
                    }
                } catch {
                    resolve({ valid: false, reason: 'Parse error' });
                }
            });
        });
        req.on('error', (e) => resolve({ valid: false, reason: `Network error: ${e.message}` }));
        req.on('timeout', () => { req.destroy(); resolve({ valid: false, reason: 'Timeout — check internet' }); });
        req.end();
    });
}

function buildDefaultOwoconfig(userToken, botToken, userInfo, botInfo) {
    return {
        user_token: userToken,
        bot_token: botToken,
        tokens: [
            {
                token: userToken,
                type: 'main',
                isActive: true,
                label: `@${userInfo.username}`,
                id: userInfo.id,
                addedAt: new Date().toISOString()
            }
        ],
        activeUserToken: userToken,
        // Keep any existing grind config intact
        _setup_by: 'auto-wizard',
        _setup_at: new Date().toISOString()
    };
}

async function runSetupWizard() {
    banner();

    const rl = readline.createInterface({
        input:  process.stdin,
        output: process.stdout,
        terminal: false
    });

    const ask = (q) => new Promise(resolve => rl.question(`  ${_CYN}${q}${_RST} `, ans => resolve(ans.trim())));

    // ── STEP 1: User Token ──
    printStep(1, 2, 'Discord Selfbot (User) Token');
    printInfo('Apna Discord user account token paste karo.');
    printInfo('Settings → Advanced → Enable DevTools → Console mein token copy karo.');
    printWarn('Kisi ke saath share MAT karna — yeh sensitive hai!');
    console.log('');

    let userToken = '', userInfo = null;
    while (true) {
        userToken = await askHidden(rl, 'User Token →');
        if (!userToken || userToken.length < 50) {
            printErr('Token bahut chota hai! Discord token 50+ chars ka hota hai.'); continue;
        }
        if (userToken.toLowerCase().startsWith('bot ')) {
            printErr('Yeh Bot token lag raha hai — User token chahiye!'); continue;
        }
        process.stdout.write(`  ${_DIM}Validating with Discord API...${_RST}\r`);
        userInfo = await validateDiscordToken(userToken, 'user');
        if (userInfo.valid) {
            printOk(`Valid! Logged in as ${_BOLD}@${userInfo.username}${_RST} ${_DIM}(${userInfo.id})${_RST}`);
            break;
        } else {
            printErr(`Invalid token: ${userInfo.reason}`);
            printWarn('Dobara copy karke paste karo (spaces mat aane dena).');
        }
    }

    // ── STEP 2: Bot Token ──
    printStep(2, 2, 'Discord Bot Token');
    printInfo('Discord Developer Portal → Tera bot → Bot → Reset Token → Copy karo.');
    printInfo('Bot mein MESSAGE CONTENT INTENT on hona chahiye!');
    console.log('');

    let botToken = '', botInfo = null;
    while (true) {
        botToken = await askHidden(rl, 'Bot Token  →');
        if (!botToken || botToken.length < 50) {
            printErr('Token bahut chota hai!'); continue;
        }
        process.stdout.write(`  ${_DIM}Validating Bot token...${_RST}\r`);
        // Try with "Bot " prefix
        botInfo = await validateDiscordToken(botToken.replace(/^Bot /i, ''), 'bot');
        if (!botInfo.valid) {
            // Try raw token (some people include "Bot " prefix already)
            botInfo = await validateDiscordToken(botToken, 'bot');
        }
        if (botInfo.valid) {
            // Strip "Bot " prefix if user included it
            botToken = botToken.replace(/^Bot /i, '');
            printOk(`Valid bot! ${_BOLD}@${botInfo.username}${_RST} ${_DIM}(${botInfo.id})${_RST}`);
            break;
        } else {
            printErr(`Invalid bot token: ${botInfo.reason}`);
            printWarn('Developer Portal → Bot → "Reset Token" → Copy → Paste.');
        }
    }

    rl.close();

    // ── Write owoconfig.json ──
    console.log('');
    console.log(`  ${_DIM}${'─'.repeat(54)}${_RST}`);

    const existingCfg = fs.existsSync(OWO_MAIN_CONFIG_FILE)
        ? (() => { try { return JSON.parse(fs.readFileSync(OWO_MAIN_CONFIG_FILE, 'utf8')); } catch { return {}; } })()
        : {};

    const newCfg = {
        ...existingCfg,
        ...buildDefaultOwoconfig(userToken, botToken, userInfo, botInfo)
    };

    // If existing tokens array, merge new token in
    if (existingCfg.tokens && existingCfg.tokens.length > 0) {
        const alreadyExists = existingCfg.tokens.find(t => t.token === userToken);
        if (!alreadyExists) {
            newCfg.tokens = [
                { token: userToken, type: 'main', isActive: true, label: `@${userInfo.username}`, id: userInfo.id, addedAt: new Date().toISOString() },
                ...existingCfg.tokens.map(t => ({ ...t, isActive: false }))
            ];
        } else {
            newCfg.tokens = existingCfg.tokens.map(t => ({ ...t, isActive: t.token === userToken }));
        }
    }

    fs.writeFileSync(OWO_MAIN_CONFIG_FILE, JSON.stringify(newCfg, null, 4), 'utf8');

    // ── Success Screen ──
    cls();
    const W = 58;
    const line = (txt, color='') => {
        const pad = Math.max(0, W - 2 - txt.replace(/\x1b\[[0-9;]*m/g, '').length);
        const lp = Math.floor(pad/2), rp = pad - lp;
        console.log(`${_DIM}║${_RST}${color}${' '.repeat(lp)}${txt}${' '.repeat(rp)}${_RST}${_DIM}║${_RST}`);
    };
    console.log(`${_DIM}╔${'═'.repeat(W-2)}╗${_RST}`);
    line('');
    line(`${_GRN}${_BOLD}  ✅  Setup Complete!  ${_RST}`);
    line('');
    console.log(`${_DIM}╠${'═'.repeat(W-2)}╣${_RST}`);
    line('');
    line(`${_WHT}  User: ${_GRN}@${userInfo.username}${_RST}`);
    line(`${_WHT}  Bot:  ${_GRN}@${botInfo.username}${_RST}`);
    line(`${_WHT}  File: ${_DIM}owoconfig/owoconfig.json${_RST}`);
    line('');
    console.log(`${_DIM}╠${'═'.repeat(W-2)}╣${_RST}`);
    line('');
    line(`${_CYN}  Starting OwO Grinder...  ${_RST}`);
    line('');
    console.log(`${_DIM}╚${'═'.repeat(W-2)}╝${_RST}`);
    console.log('');

    return { userToken, botToken };
}

async function getBokuConfig() {
    const cfg = readOwoconfigTokens();
    const userToken = cfg.user_token || cfg.tokens?.find(t => t.isActive)?.token || null;
    // bot_token ya botToken — dono check karo
    const botToken  = cfg.bot_token || cfg.botToken || null;
    return { userToken, botToken };
}

// Top-level await ke liye wrapper
let USER_TOKEN, BOT_TOKEN;

// ── Web-based setup: terminal wizard NAHI chalega ──
// Agar tokens missing hain → dashboard start hoga setup mode mein
// User localhost:8080 pe jaake setup karega — /api/setup call hone ke baad
// dashboard khud bot+selfbot ko login karayega
async function _initTokens() {
    const result = await getBokuConfig();
    USER_TOKEN = result.userToken || null;
    BOT_TOKEN  = result.botToken  || null;
    // Tokens null bhi ho sakte hain — that's fine, dashboard setup handle karega
}

// Per-account config: owoconfig_<userId>.json — har account ka alag config
function getConfigFilePath() {
    try {
        const activeToken = USER_TOKEN;
        const cached = activeToken ? _accInfoCache.get(activeToken) : null;
        if (cached && cached.id) {
            return path.join(OWOCORE_DIR, `owoconfig_${cached.id}.json`);
        }
    } catch {}
    return path.join(OWOCORE_DIR, 'owoconfig.json'); // fallback
}
let OWO_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig.json');

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
        OWO_CONFIG_FILE = path.join(OWOCORE_DIR, 'owoconfig.json');
        tlog('warn', '📁 Config fallback → owoconfig.json');
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
    panel_message_id: null, panel_channel_id: null, panel_mode: 'main', stats_view: 'session'
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

            // switchToAccount owoaccountcore se aata hai — wo apna config manage karta hai
            const result = await switchToAccount(idx).catch(() => null);
            if (!result || !result.token) {
                await interaction.editReply(await buildAccountsPanel('❌ Account not found!')).catch(() => {});
                return;
            }
            _accInfoCache.clear();

            const newToken = result.token;
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
        case 'owo_star

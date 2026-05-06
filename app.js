// ==================== OWO GRINDER DASHBOARD — app.js ====================
// Location: ROOT folder (same as owonew17.js, index.html, styles.css)
// This file connects to dashboard.js (owocore/dashboard.js) via Socket.IO
// Real data owonew17.js se aata hai — static dummy data sirf fallback hai

// ==================== SOCKET.IO CONNECTION ====================
const socket = io(); // auto-connect to dashboard server (port 8080)

// ==================== STATIC FALLBACK STATE ====================
// Jab tak real data nahi aata, ye dummy data dikhao
let onlineMembers = []; // channel ke online members

socket.on('channel_members', (members) => {
    onlineMembers = members || [];
    renderOnlineMembers();
});

// Members panel toggle — sirf users icon click pe
window.toggleMembersPanel = function() {
    const panel = $("#members-panel");
    const btn = $("#members-toggle-btn");
    if (!panel) return;
    const isHidden = panel.classList.contains("hidden");
    if (isHidden) {
        panel.classList.remove("hidden");
        panel.style.display = "flex";
        if (btn) btn.style.color = "#dbdee1";
    } else {
        panel.classList.add("hidden");
        panel.style.display = "";
        if (btn) btn.style.color = "#80848e";
    }
};

function _memberAvatarHtml(m) {
    const statusColor = m.status==='online'?'#23a55a':m.status==='idle'?'#f0b232':m.status==='dnd'?'#f04747':'#747f8d';
    let fallbackIdx = 0;
    try { if(m.id) fallbackIdx = Number(BigInt(m.id)>>22n)%6; } catch(_){}
    const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/${fallbackIdx}.png`;
    // OWO: local avatar with CDN fallback
    const avatarSrc = m.isOwo ? OWO_AVATAR : (m.avatar || fallbackUrl);
    const owoFallback = m.isOwo ? OWO_AVATAR_CDN : fallbackUrl;
    return `<div class="relative shrink-0">
        <img src="${avatarSrc}" class="h-8 w-8 rounded-full object-cover" style="background:#2b2d31"
            onerror="this.onerror=null;this.src='${owoFallback}'" />
        <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" style="background:${statusColor};border-color:#2b2d31"></span>
    </div>`;
}

function renderOnlineMembers() {
    const online = onlineMembers.filter(m => m.status && m.status !== 'offline');
    const offline = onlineMembers.filter(m => !m.status || m.status === 'offline');

    // Header online count
    const headerCount = $("#header-online-count");
    if (headerCount) headerCount.textContent = `${online.length} online`;

    const onlineCountEl = $("#members-count-online");
    const offlineCountEl = $("#members-count-offline");
    if (onlineCountEl) onlineCountEl.textContent = online.length;
    if (offlineCountEl) offlineCountEl.textContent = offline.length;

    const onlineEl = $("#members-list-online");
    const offlineEl = $("#members-list-offline");

    // YOU / BOT badge
    function memberBadge(m) {
        if (m.isSelf) return `<span style="font-size:9px;font-weight:700;color:#23a55a;background:rgba(35,165,90,0.15);border-radius:3px;padding:1px 4px;flex-shrink:0">YOU</span>`;
        if (m.isOwo) return `<span style="font-size:9px;font-weight:700;color:#5865f2;background:rgba(88,101,242,0.2);border-radius:3px;padding:1px 4px;flex-shrink:0">BOT</span>`;
        return '';
    }

    const selfBg = 'rgba(35,165,90,0.06)';
    const memberRow = (m) => {
        const bg = m.isSelf ? selfBg : '';
        const nameColor = m.isSelf ? '#23a55a' : m.isOwo ? '#5865f2' : (m.color || '#dbdee1');
        return `<div class="flex items-center gap-2 px-3 py-1.5 rounded mx-1 transition" style="cursor:default;${bg?'background:'+bg+';':''}" onmouseenter="this.style.background='rgba(255,255,255,0.07)'" onmouseleave="this.style.background='${bg}'">
            ${_memberAvatarHtml(m)}
            <div class="flex items-center gap-1 min-w-0 flex-1">
                <span class="text-[13px] font-medium truncate" style="color:${nameColor}">${m.displayName||m.username||'Unknown'}</span>
                ${memberBadge(m)}
            </div>
        </div>`;
    };

    if (onlineEl) onlineEl.innerHTML = online.length ? online.map(memberRow).join("") : `<div class="px-3 py-1 text-[11px]" style="color:#4e5058">None</div>`;

    if (offlineEl) offlineEl.innerHTML = offline.length ? offline.map(m => {
        let fallbackIdx = 0;
        try { if(m.id) fallbackIdx = Number(BigInt(m.id)>>22n)%6; } catch(_){}
        const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/${fallbackIdx}.png`;
        const avatarSrc = m.avatar || fallbackUrl;
        return `<div class="flex items-center gap-2 px-3 py-1.5 rounded mx-1" style="opacity:0.45">
            <div class="relative shrink-0">
                <img src="${avatarSrc}" class="h-8 w-8 rounded-full object-cover" style="background:#2b2d31;filter:grayscale(0.8)"
                    onerror="this.onerror=null;this.src='${fallbackUrl}'" />
                <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" style="background:#747f8d;border-color:#2b2d31"></span>
            </div>
            <span class="text-[13px] font-medium truncate" style="color:#747f8d">${m.displayName||m.username||'Unknown'}</span>
        </div>`;
    }).join("") : `<div class="px-3 py-1 text-[11px]" style="color:#4e5058">None</div>`;
}

let accounts = [
    {id:"1",tag:"Loading...",avatar:"https://api.dicebear.com/7.x/bottts-neutral/svg?seed=loading&backgroundColor=991b1b",status:"active",cowoncy:0,level:0,isActive:true},
];
const STATUS_LBL = { active:"GRINDING", captcha:"CAPTCHA", sleeping:"SLEEPING" };
const STATUS_DOT = { active:"bg-success", captcha:"bg-primary", sleeping:"bg-warning" };
const STATUS_TXT = { active:"text-success", captcha:"text-primary", sleeping:"text-warning" };

let activeId = "1", running = false, channel = "—";
let stats = { hunt:0, battle:0, pray:0, owo:0, cmd:0, cash:0 };
let uptime = 0;
let hb = {
    status:"waiting", backInSec:0, amount:0,
    totalEarned:0, runs:0, cap:0, autoSolve:true, last:"—", nextAt:0
};
// Server se data aane se pehle HB display block — 15min flash prevent karo
let _hbServerSynced = false;
let logs = [];
let logFilter = "all";
let chat = [];

// ── Chat persistence — reload pe previous messages restore karo ──
function saveChatToStorage() {
    try { localStorage.setItem('owo_chat_history', JSON.stringify(chat.slice(-60))); } catch(_) {}
}
function loadChatFromStorage() {
    try {
        const saved = localStorage.getItem('owo_chat_history');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                chat = parsed.map(m => ({ ...m, isNew: false }));
            }
        }
    } catch(_) {}
}
loadChatFromStorage();
let _togglesRenderedOnce = false; // toggles sirf ek baar render honge, har tick pe nahi
const grindMsgs = [
    "owo hunt → captured Common Slime","owo battle → won (+318 xp)","owo pray → +5% luck buff",
    "owo sell all common → +1,240 cowoncy","owo coinflip h → won 500","owo lottery buy 5 → tickets purchased",
    "owo hunt → captured Epic Phoenix","owo curse → cursed user","owob → huntbot dispatched",
];
const behaviour = { sleep:true, autoHb:true, single:false };
const protections = {
    anti_captcha:true, random_delay:true, auto_sleep:true,
    smart_cooldown:true, ban_detection:true, stealth_mode:false
};
const PROT_LBL = {
    anti_captcha:"Anti-Captcha", random_delay:"Random Delay", auto_sleep:"Auto Sleep",
    smart_cooldown:"Smart Cooldown", ban_detection:"Ban Detection", stealth_mode:"Stealth Mode"
};
const TYPE_COLOR = {
    ok:"text-type-ok", err:"text-type-err", warn:"text-type-warn",
    info:"text-type-info", grind:"text-type-grind", hb:"text-type-hb", cap:"text-type-cap"
};
// OWO custom avatar — served from dashboard (/owo-avatar.png)
// Fallback chain: local file → Discord CDN
const OWO_AVATAR = '/owo-avatar.png';
const OWO_AVATAR_CDN = 'https://cdn.discordapp.com/avatars/408785106942164992/2f5c1afceaab7dfe36e45c9d0a1b1fab.png?size=128';

// ==================== HELPERS ====================
const $ = (s) => document.querySelector(s);
const fmt = (n) => Number(n || 0).toLocaleString();
const ts = () => new Date().toLocaleTimeString("en-GB", { hour12:false });
const hhmm = () => ts().slice(0, 5);
const fmtUp = (s) => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtMS = (s) => {
    s = Math.floor(Math.abs(Number(s)||0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
    if (m > 0) return `${m}m ${String(sec).padStart(2,"0")}s`;
    return `${String(sec).padStart(2,"0")}s`;
};

function toast(m) {
    $("#toast-msg").textContent = m;
    $("#toast").classList.remove("hidden");
    clearTimeout(window._t);
    window._t = setTimeout(() => $("#toast").classList.add("hidden"), 2200);
}
function refreshIcons() { if(window.lucide) lucide.createIcons(); }

// ==================== SOCKET EVENTS (owonew17 → dashboard → browser) ====================

// Initial load — server ne sab state bheja
socket.on('init', (data) => {
    _hbServerSynced = true; // init aaya = server connected, ab ∞ safe dikhao
    if (data.snapshot) applySnapshot(data.snapshot);
    if (data.logs && data.logs.length) {
        logs = data.logs;
        renderLogs();
    }
    // Accounts bhi load karo
    fetch('/api/accounts')
        .then(r => r.json())
        .then(applyAccounts)
        .catch(() => {});
});

// Real-time updates (har 2 second)
socket.on('update', (snapshot) => {
    applySnapshot(snapshot);
});

// Naya log entry
socket.on('log', (entry) => {
    entry.isNew = true;
    logs.push(entry);
    if (logs.length > 300) logs = logs.slice(-300);

    const msg = entry.msg || "";
    const type = entry.type || "";

    // ── Internal system messages — Discord preview mein KABHI nahi dikhao ──
    // Ye sab internal owonew logs hain, real Discord messages nahi
    const isSystemMsg = /HB state|Scheduling|state saved|state restored|Saved HB|back in \d+s|in \d+s|Selfbot|panel|registered|dashboard|switching|switched|trigger|token|reboot|session|grind loop|sleep|waking|wake/i.test(msg);
    if (isSystemMsg) { renderLogs(); return; }

    // ── Sirf actual GRIND commands dikhao (type='grind') ──
    // aur sirf jab real Discord messages nahi aa rahe hain (fallback mode)
    const isActualGrindCmd = type === 'grind' && /owo\s*(hunt|battle|pray|hb|sell|daily|coinflip)/i.test(msg);

    // ── HB actually bhejna — sirf "Sending owo hb" wala message ──
    const isActualHbSend = /sending.*owo\s*hb|owo\s*hb.*send|🔫.*owo\s*hb/i.test(msg);

    if (!_hasRealDiscordMessages && (isActualGrindCmd || isActualHbSend)) {
        pushChatPair(msg, hhmm());
    }

    renderLogs();
});

// ==================== REAL DISCORD MESSAGES (owonew17 → dashboard → browser) ====================
let _hasRealDiscordMessages = false;
const _pendingDashboardMsgs = new Set(); // dedup: messages sent from dashboard

socket.on('discord_message', (msgData) => {
    _hasRealDiscordMessages = true;
    const {
        id, ts: msgTs, authorName, authorTag, avatar,
        content, embeds, isOwo, isSelfbot, isOtherUser
    } = msgData;

    const displayName = (authorName || authorTag || 'Unknown').split('#')[0];
    const nameUpper = displayName.toUpperCase();
    const time = msgTs || hhmm();

    // Selfbot ka message
    if (isSelfbot && !isOwo) {
        const msgKey = (content || "").trim();
        const isSentFromDash = _pendingDashboardMsgs.has(msgKey);
        // owo hb messages kabhi skip mat karo — hamesha show karo
        const isHbCmd = /^owo\s*hb/i.test(msgKey);
        if (isSentFromDash && !isHbCmd) {
            _pendingDashboardMsgs.delete(msgKey);
            return;
        }
        if (isSentFromDash && !isHbCmd) _pendingDashboardMsgs.delete(msgKey);
        chat.push({
            id: parseInt(id) || Date.now(),
            ts: time, author: "user", authorName: nameUpper,
            avatar: avatar || "", content: content || "",
            embeds: [], isNew: true, sentFromDashboard: false,
        });
    }

    // Dusre server members ka message
    if (isOtherUser) {
        chat.push({
            id: parseInt(id) || Date.now(),
            ts: time,
            author: "other",
            authorName: nameUpper,
            avatar: avatar || "",
            content: content || "",
            embeds: [],
            emojiMap: msgData.emojiMap || {},
            isNew: true,
        });
    }

    // OWO bot ka message
    if (isOwo) {
        // ── COWONCY PARSE ──
        if (content) {
            const cowMatch = content.match(/you currently have\s+[_*]*([0-9,]+)[_*]*\s+cowoncy/i)
                          || content.match(/__([0-9,]+)__\s*cowoncy/i)
                          || content.match(/\*\*([0-9,]+)\*\*\s*cowoncy/i);
            if (cowMatch) {
                const parsedCow = parseInt(cowMatch[1].replace(/,/g, ''));
                if (!isNaN(parsedCow)) {
                    stats.cash = parsedCow;
                    const activeAcc = accounts.find(a => a.id === activeId) || accounts[0];
                    if (activeAcc) { activeAcc.cowoncy = parsedCow; renderActive(); renderAccounts(); }
                    renderStats();
                    pushLog('ok', `💰 Cowoncy updated → ${parsedCow.toLocaleString()}`);
                }
            }
        }

        let processedEmbeds = (embeds || []).map(emb => ({
            color: emb.color || '#5865f2',
            title: emb.title || '',
            description: emb.description || '',
            fields: emb.fields || [],
            footer: emb.footer || '',
            thumbnail: emb.thumbnail || '',
            image: emb.image || '',
        }));

        // ── HB DETECTION: owonew20 ke parseHuntbotEmbed se same patterns use karo ──
        // OWO HB embed mein: "for X cowoncy", "BACK IN Xm/Xh Ym", "BEEP BOOP"
        const allEmbedText = processedEmbeds.map(e =>
            [e.title, e.description, e.footer, ...(e.fields||[]).map(f => f.name+' '+f.value)].join('\n')
        ).join('\n');
        const fullText = (content || '') + '\n' + allEmbedText;

        // Amount: "for X cowoncy" (exact OWO format)
        const amtMatch = fullText.match(/for\s+([\d,]+)\s+cowoncy/i)
                      || fullText.match(/([0-9,]{3,})\s*cowoncy/i);
        const detectedAmt = amtMatch ? parseInt(amtMatch[1].replace(/,/g,'')) : 0;

        // Timer: "BACK IN Xh Ym" or "BACK IN Xm" (exact OWO format)
        let returnSec = 0;
        const hmMatch = fullText.match(/back\s+in\s+(\d+)\s*h\s+(\d+)\s*m/i);
        const hOnly   = fullText.match(/back\s+in\s+(\d+)\s*h(?!\s*\d)/i);
        const mOnly   = fullText.match(/back\s+in\s+(\d+)\s*m/i);
        if (hmMatch) returnSec = parseInt(hmMatch[1])*3600 + parseInt(hmMatch[2])*60;
        else if (hOnly) returnSec = parseInt(hOnly[1])*3600;
        else if (mOnly) returnSec = parseInt(mOnly[1])*60;

        // HB dispatched = amount mila + back in time mila
        const isHbDispatched = detectedAmt > 0 || returnSec > 0;
        // BEEP BOOP = huntbot wapas aaya (ignore — OWO khud handle karta hai)
        const isBeepBoop = /beep\s+boop/i.test(fullText) && /i am back with/i.test(fullText);
        // Already running = back in time hai but amount nahi
        const isHbAlready = /already\s*(dispatched|sent|running)|beep\s*boop/i.test(fullText) && !isBeepBoop;

        if (isHbDispatched && !isBeepBoop) {
            // HB state update karo
            if (detectedAmt > 0) hb.amount = detectedAmt;
            if (returnSec > 0) {
                hb.backInSec = returnSec;
                hb.nextAt = Math.floor(Date.now()/1000) + returnSec;
            }
            hb.status = 'waiting';
            renderHb();

            const backStr = returnSec > 0 ? fmtMS(returnSec) : '~15m';
            pushLog('hb', `🤖 HB dispatched! ${detectedAmt > 0 ? '+'+fmt(detectedAmt)+' cowoncy' : ''} · back in ${backStr}`);

            // Agar real embed hai toh use hi dikhao — synthetic mat banao
            // Sirf tab synthetic banao jab koi embed nahi aaya
            if (processedEmbeds.length === 0) {
                const backTime = returnSec > 0
                    ? new Date(Date.now()+returnSec*1000).toLocaleTimeString("en-IN",{hour12:true,hour:'2-digit',minute:'2-digit'})
                    : '~15 min';
                processedEmbeds = [{
                    color: '#f59e0b',
                    title: '🤖 Huntbot Dispatched!',
                    description: (detectedAmt > 0 ? `**Amount:** ${detectedAmt.toLocaleString()} cowoncy\n` : '') +
                                 `**Returns in:** ${backStr}\n**Returns at:** ${backTime}`,
                    fields: [], footer: `Auto HB scheduled ✓`, thumbnail: '', image: ''
                }];
            }
        } else if (isHbAlready && processedEmbeds.length === 0) {
            processedEmbeds = [{
                color: '#ed4245', title: '⏳ Huntbot Already Running',
                description: fullText.replace(/<[^>]+>/g,'').slice(0,200),
                fields: [], footer: '', thumbnail: '', image: ''
            }];
        }

        chat.push({
            id: parseInt(id) || Date.now() + 1,
            ts: time, author: "owo", authorName: "OwO", avatar: OWO_AVATAR,
            content: content || "",
            embeds: processedEmbeds,
            attachmentUrl: msgData.attachmentUrl || null,
            emojiMap: msgData.emojiMap || {},
            isNew: true,
        });
    }

    if (chat.length > 80) chat = chat.slice(-80);
    renderChat();
});

// Accounts list update
socket.on('accounts_update', (newAccounts) => {
    applyAccounts(newAccounts);
});

// ==================== TOKEN EDITOR ====================
window.toggleTokenEditor = () => {
    const ed = $("#token-editor");
    if (!ed) return;
    const hidden = ed.classList.toggle("hidden");
    if (!hidden) loadTokenEditor();
    refreshIcons();
};

async function loadTokenEditor() {
    const list = $("#token-list");
    if (!list) return;
    list.innerHTML = `<div class="text-[10px] text-muted font-mono py-1">Loading...</div>`;
    try {
        const r = await fetch('/api/tokens');
        const d = await r.json();
        if (!d.ok || !d.tokens) throw new Error(d.error || 'Failed');
        list.innerHTML = d.tokens.map((t, i) => `
        <div class="rounded-md border border-border bg-surface px-3 py-2 flex items-center gap-2" id="tok-row-${i}">
          <span class="w-5 font-mono text-[9px] text-muted">${String(i+1).padStart(2,'0')}</span>
          <span class="w-16 truncate font-mono text-[10px] ${t.isActive ? 'text-success' : 'text-muted'}">${t.label}</span>
          ${t.isActive ? `<span class="text-[8px] font-bold text-success bg-surface-2 px-1.5 py-px rounded-sm">ACTIVE</span>` : ''}
          <span class="flex-1 font-mono text-[10px] text-muted truncate">${t.preview}</span>
          <input id="tok-input-${i}" type="password" placeholder="New token..." class="w-40 rounded border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] outline-none focus:border-primary" />
          <button onclick="saveToken(${i})" class="rounded bg-surface-2 border border-border px-2 py-1 text-[9px] font-bold text-muted hover:border-primary hover:text-primary active:scale-95">Save</button>
          ${!t.isActive ? `<button onclick="deleteToken(${i})" class="rounded border border-border px-2 py-1 text-[9px] font-bold text-muted hover:border-red-500 hover:text-red-400 active:scale-95">Del</button>` : ''}
        </div>`).join('');
        refreshIcons();
    } catch (e) {
        list.innerHTML = `<div class="text-[10px] text-primary font-mono py-1">Error: ${e.message}</div>`;
    }
}

window.saveToken = async (index) => {
    const input = $(`#tok-input-${index}`);
    if (!input) return;
    const token = input.value.trim();
    if (!token || token.length < 10) { toast("Token too short!"); return; }
    try {
        const r = await fetch('/api/update_token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index, token })
        });
        const d = await r.json();
        if (d.ok) { toast("✅ Token saved!"); input.value = ""; loadTokenEditor(); }
        else toast("Error: " + d.error);
    } catch (e) { toast("Save failed: " + e.message); }
};

window.addNewToken = async () => {
    const labelEl = $("#new-token-label");
    const tokenEl = $("#new-token-value");
    if (!labelEl || !tokenEl) return;
    const label = labelEl.value.trim();
    const token = tokenEl.value.trim();
    if (!token || token.length < 10) { toast("Invalid token!"); return; }
    try {
        const r = await fetch('/api/update_token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: -1, token, label: label || 'New Account' })
        });
        const d = await r.json();
        if (d.ok) { toast("✅ Token added!"); labelEl.value = ""; tokenEl.value = ""; loadTokenEditor(); }
        else toast("Error: " + d.error);
    } catch (e) { toast("Add failed: " + e.message); }
};

window.deleteToken = async (index) => {
    if (!confirm(`Delete token #${index + 1}? This cannot be undone.`)) return;
    try {
        const r = await fetch('/api/delete_token', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index })
        });
        const d = await r.json();
        if (d.ok) { toast("🗑️ Token deleted"); loadTokenEditor(); refreshAccountsBtn(); }
        else toast("Error: " + d.error);
    } catch (e) { toast("Delete failed: " + e.message); }
};
setInterval(() => {
    fetch('/api/accounts')
        .then(r => r.json())
        .then(data => {
            applyAccounts(data);
            pushLog('info', '💰 Cowoncy auto-refreshed (15min check)');
        })
        .catch(() => {});
}, 15 * 60 * 1000); // 15 minutes

// Account switch result
socket.on('account_switched', (data) => {
    if (data.ok) {
        toast(`Switched → ${data.tag}`);
        pushLog('info', `Account switched → ${data.tag}`);
        // Refresh accounts
        fetch('/api/accounts').then(r => r.json()).then(applyAccounts).catch(() => {});
    } else {
        toast(`Switch failed: ${data.error}`);
    }
});

// ── Apply full snapshot from owonew17 ──
function applySnapshot(snap) {
    if (!snap) return;

    // State
    if (snap.state) {
        running = snap.state.grinding_active;
        stats.hunt    = snap.state.session_hunt || stats.hunt;
        stats.battle  = snap.state.session_battle || stats.battle;
        stats.pray    = snap.state.session_pray || stats.pray;
        stats.owo     = snap.state.session_owo || stats.owo;
        stats.cmd     = snap.state.session_cmd_count || stats.cmd;
        uptime        = snap.uptime || uptime;

        // Run button sync
        const runLabel = $("#run-label");
        const runBtnLabel = $("#run-btn-label");
        if (runLabel) runLabel.textContent = running ? "Running" : "Idle";
        if (runBtnLabel) runBtnLabel.textContent = running ? "Stop" : "Start";
    }

    // Config
    if (snap.config) {
        if (snap.config.channel_id) channel = snap.config.channel_id;

        // Sync behaviour toggles
        if (snap.config.sleep_enabled !== undefined) behaviour.sleep = snap.config.sleep_enabled;
        if (snap.config.auto_huntbot_enabled !== undefined) behaviour.autoHb = snap.config.auto_huntbot_enabled;
        if (snap.config.single_mode !== undefined) behaviour.single = snap.config.single_mode;

        // Sync protection toggles
        if (snap.config.protections) {
            Object.keys(snap.config.protections).forEach(k => {
                if (protections.hasOwnProperty(k)) {
                    protections[k] = snap.config.protections[k]?.active ?? snap.config.protections[k];
                }
            });
        }

        // Stats from config
        if (snap.config.stats) {
            if (snap.config.stats.cowoncy) stats.cash = snap.config.stats.cowoncy;
        }

        if (!_togglesRenderedOnce) { renderToggles(); _togglesRenderedOnce = true; }
    }

    // Huntbot state
    if (snap.hb) {
        _hbServerSynced = true; // server se data aaya — ab real values dikhao
        const now = Math.floor(Date.now() / 1000);
        if (snap.hb.huntbot_back_at && snap.hb.huntbot_back_at > now) {
            hb.backInSec = Math.floor(Math.abs(snap.hb.huntbot_back_at - now));
            hb.nextAt = snap.hb.huntbot_back_at; // unix timestamp for "Next HB 6:43 AM"
            hb.status = snap.hb.solving_in_progress ? 'solving' : 'waiting';
        } else if (snap.hb.solving_in_progress) {
            hb.status = 'solving';
            hb.nextAt = 0;
        } else {
            // HB back_at expired ya 0 — agar grinding nahi chal raha, ∞ dikhao
            if (!snap.state?.grinding_active && !running) {
                hb.backInSec = 0; // forces ∞ display
            }
            hb.nextAt = 0;
        }
        hb.amount = snap.hb.huntbot_amount || hb.amount;
        // HB runs update karo agar backend se aaye
        if (snap.hb.huntbot_runs !== undefined) hb.runs = snap.hb.huntbot_runs;
        if (snap.config?.auto_huntbot_enabled === false) hb.status = 'disabled';
        renderHb();
    }

    // Active selfbot info
    if (snap.selfbot && snap.selfbot.tag) {
        const existing = accounts.find(a => a.isActive);
        if (existing) {
            existing.tag = snap.selfbot.tag;
            if (snap.selfbot.avatar) existing.avatar = snap.selfbot.avatar;
        } else {
            accounts[0].tag = snap.selfbot.tag;
            if (snap.selfbot.avatar) accounts[0].avatar = snap.selfbot.avatar;
        }
    }

    // Channel
    const chIdEl = $("#ch-id");
    if (chIdEl && channel && channel !== "—") chIdEl.textContent = channel;

    renderStats();
    // Silently update active selfbot tag/avatar without full re-render
    _silentUpdateActive();
}

// ── Apply accounts list from /api/accounts ──
function applyAccounts(newAccounts) {
    if (!newAccounts || !newAccounts.length) return;

    // Convert server format to local format
    accounts = newAccounts.map((a, i) => ({
        id: a.id || String(i+1),
        tag: a.tag || 'Unknown',
        avatar: a.avatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${a.id}&backgroundColor=991b1b`,
        status: a.isActive ? 'active' : 'sleeping',
        cowoncy: a.cowoncy || 0,
        level: a.level || 0,
        isActive: a.isActive,
        tokenPrefix: a.tokenPrefix,
        tokenPreview: a.tokenPreview,
    }));

    const active = accounts.find(a => a.isActive);
    if (active) activeId = active.id;

    renderActive();
    renderAccounts();
}

// ==================== RENDER ====================
function renderActive() {
    const a = accounts.find(x => x.id === activeId) || accounts[0];
    if (!a) return;
    const avatarEl = $("#acc-avatar");
    const tagEl = $("#acc-tag");
    const statusEl = $("#acc-status");
    const dotEl = $("#acc-dot");
    const cowEl = $("#acc-cow");
    const lvEl = $("#acc-lv");
    const dcAs = $("#dc-as");

    if (avatarEl) {
        avatarEl.src = a.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
        avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; };
    }
    if (tagEl) tagEl.textContent = a.tag;
    if (statusEl) {
        statusEl.className = "mt-0.5 font-mono text-[9px] font-bold uppercase tracking-wider " + STATUS_TXT[a.status];
        statusEl.textContent = "● " + STATUS_LBL[a.status];
    }
    if (dotEl) {
        dotEl.className = "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 " + STATUS_DOT[a.status];
        dotEl.style.borderColor = "var(--surface)";
    }
    if (cowEl) {
        const cow = a.cowoncy || 0;
        if (cow >= 1000000) cowEl.textContent = (cow / 1000000).toFixed(2) + "M";
        else if (cow >= 1000) cowEl.textContent = (cow / 1000).toFixed(1) + "k";
        else cowEl.textContent = cow.toString();
    }
    if (lvEl) lvEl.textContent = "Lv " + (a.level || 0);
    if (dcAs) dcAs.textContent = a.tag;
}

// Silent update — sirf text/avatar badlo, pura DOM re-render nahi
function _silentUpdateActive() {
    const a = accounts.find(x => x.id === activeId) || accounts[0];
    if (!a) return;
    const tagEl = $("#acc-tag");
    const avatarEl = $("#acc-avatar");
    const dcAs = $("#dc-as");
    const runLabel = $("#run-label");
    if (tagEl && tagEl.textContent !== a.tag) tagEl.textContent = a.tag;
    if (avatarEl && a.avatar && avatarEl.src !== a.avatar) {
        avatarEl.src = a.avatar;
        avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; };
    }
    if (dcAs && dcAs.textContent !== a.tag) dcAs.textContent = a.tag;
    if (runLabel) runLabel.textContent = running ? "Running" : "Idle";
}

function renderToggles() {
    const beh = $("#behaviour");
    if (beh) {
        beh.innerHTML = "";
        [["sleep","Sleep enabled"],["autoHb","Auto huntbot"],["single","Single mode"]].forEach(([k,l]) => {
            beh.insertAdjacentHTML("beforeend", toggleRow(l, behaviour[k], `toggleBehaviour('${k}')`));
        });
    }
    const prot = $("#protections");
    if (prot) {
        prot.innerHTML = "";
        Object.keys(protections).forEach(k => {
            prot.insertAdjacentHTML("beforeend", toggleRow(PROT_LBL[k], protections[k], `toggleProtection('${k}')`));
        });
    }
    refreshIcons();
}

function toggleRow(label, val, onclick) {
    return `<div class="flex items-center justify-between py-2.5 px-1" style="min-height:38px"><span style="font-size:12px;font-weight:600;color:rgba(240,232,232,.85)">${label}</span><div class="toggle ${val?'on':''}" onclick="${onclick}"><span class="dot"></span></div></div>`;
}

function renderStats() {
    const el = $("#stats-grid");
    if (!el) return;
    const cells = [
        {i:"coins",l:"Cowoncy",v:stats.cash,p:true},
        {i:"crosshair",l:"Hunts",v:stats.hunt},
        {i:"trophy",l:"Battles",v:stats.battle},
        {i:"activity",l:"Prays",v:stats.pray},
        {i:"zap",l:"OwO",v:stats.owo},
        {i:"terminal",l:"Commands",v:stats.cmd},
    ];
    el.innerHTML = cells.map((c,idx) => `
        <div class="stat ${c.p?'primary':''} animate-slide-up" style="animation-delay:${idx*40}ms">
          <div class="flex items-center justify-between">
            <span class="lbl">${c.l}</span>
            <i data-lucide="${c.i}" class="w-3 h-3 ${c.p?'text-primary':'text-muted'}"></i>
          </div>
          <div class="val">${fmt(c.v)}</div>
        </div>`).join("");
    refreshIcons();
}

function renderAccounts() {
    const countEl = $("#acc-count");
    const listEl = $("#acc-list");
    if (countEl) countEl.textContent = accounts.length;
    if (!listEl) return;
    listEl.innerHTML = accounts.map((a, i) => {
        const isOn = a.id === activeId;
        return `<div class="group flex items-center gap-2.5 px-3 py-1.5 transition animate-slide-up ${isOn?'':'hover:bg-surface-2/40'}" style="${isOn?'background:rgba(220,38,38,.05);':''}animation-delay:${i*40}ms" ondblclick="switchAcc('${a.id}')">
          <span class="w-4" style="font-size:9px;font-variant-numeric:tabular-nums;color:rgba(107,84,86,.6)">${String(i+1).padStart(2,"0")}</span>
          <div class="relative shrink-0">
            <img src="${a.avatar}" class="h-6 w-6 rounded bg-surface-3 ring-1 ring-border" onerror="this.onerror=null;this.src='https://cdn.discordapp.com/embed/avatars/0.png'"/>
            <span class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border ${STATUS_DOT[a.status]}" style="border-color:var(--bg)"></span>
          </div>
          <div class="min-w-0 flex-1 flex items-center gap-1.5">
            <span class="truncate text-[12px] font-semibold leading-tight">${a.tag}</span>
            ${isOn?`<span class="rounded-sm px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-primary" style="background:rgba(220,38,38,.15)">on</span>`:""}
          </div>
          <div class="hidden items-center gap-3 sm:flex">
            <span style="font-size:12px;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">${fmt(a.cowoncy)}</span>
            <span style="font-size:11px;font-weight:600;color:var(--muted)">Lv${a.level}</span>
            <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-family:'JetBrains Mono',monospace" class="${STATUS_TXT[a.status]}">${STATUS_LBL[a.status]}</span>
          </div>
          <button onclick="switchAcc('${a.id}')" ${isOn?"disabled":""} class="flex h-6 w-6 items-center justify-center rounded transition ${isOn?'cursor-default text-primary':'bg-surface-2 text-muted hover:bg-primary hover:text-white active:scale-90'}" style="${isOn?'background:rgba(220,38,38,.15);':''}">
            <i data-lucide="${isOn?'check':'chevron-right'}" class="w-3 h-3"></i>
          </button>
        </div>`;
    }).join("");
    refreshIcons();
}

function renderLogs() {
    const filt = logFilter === "all" ? logs : logs.filter(l => l.type === logFilter);
    const countEl = $("#log-count");
    if (countEl) countEl.textContent = filt.length;
    const el = $("#log-stream");
    if (!el) return;
    el.innerHTML = filt.map(l => `
        <div class="flex gap-3 rounded px-2 py-0.5 ${l.isNew?'animate-flash':''}">
          <span class="w-[58px] flex-shrink-0 tabular-nums" style="color:rgba(122,102,105,.4)">${l.ts}</span>
          <span class="w-[44px] flex-shrink-0 text-left font-bold uppercase tracking-wider ${TYPE_COLOR[l.type]||'text-fg'}">${l.type}</span>
          <span class="break-all" style="color:rgba(245,236,236,.8)">${l.msg}</span>
        </div>`).join("");
    el.scrollTop = el.scrollHeight;
}

function renderLogFilter() {
    const wrap = $("#log-filter");
    if (!wrap) return;
    wrap.querySelectorAll("button").forEach(b => b.remove());
    ["all","grind","ok","warn","err","info"].forEach(t => {
        const b = document.createElement("button");
        b.textContent = t;
        b.className = `rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider transition ${logFilter===t?'bg-primary text-white':'text-muted hover:text-fg'}`;
        b.onclick = () => { logFilter = t; renderLogFilter(); renderLogs(); };
        wrap.appendChild(b);
    });
}

// ==================== OWO EMOJI ID MAP ====================
// OWO Bot server ke saare known emoji name → Discord CDN ID
// Source: OWO Bot's official server emoji list
const OWO_EMOJI_IDS = {
    // ── Pets / Animals (common OWO names) ──
    cat:"749607834301890581",cat2:"749607834301890581",
    dog:"749608004978376714",dog2:"749608004978376714",
    fox:"749608012408733767",fox2:"749608012408733767",
    bear:"749607836660154389",bear2:"749607836660154389",
    bunny:"749607840122396713",rabbit:"749607840122396713",
    hamster:"749607857327472680",
    parrot:"749607922534891541",
    penguin:"749607924986167306",
    duck:"749607868374073354",
    frog:"749607877960245268",
    wolf:"749607941226815569",
    deer:"749607862394044507",
    horse:"749607886401536040",
    cow:"749607854272561183",
    pig:"749607927557087282",
    chicken:"749607846694748231",
    rooster:"749607846694748231",
    sheep:"749607933370908682",
    snake:"749607934933499944",
    turtle:"749607938476384286",
    fish:"749607874568044554",
    crab:"749607852101976084",
    shrimp:"749607934070587443",
    snail:"749607935459131433",
    butterfly:"749607843086778408",
    bee:"749607838201536543",
    ant:"749607833714614273",
    beetle:"749607837897416744",baby_chick:"749607836005482537",
    chick:"749607836005482537",
    owl:"749607920536289280",
    flamingo:"749607875516645396",
    peacock:"749607923018309632",
    swan:"749607936848224286",
    eagle:"749607869694861352",
    bat:"749607835392278538",
    panda:"749607921823793162",gpanda:"749607921823793162",
    koala:"749607895508967485",
    lion:"749607898025558026",glon:"749607898025558026",
    tiger:"749607937893277717",
    leopard:"749607897226256394",
    giraffe:"749607878786940938",
    elephant:"749607871188893736",
    rhino:"749607930826399744",rhinoceros:"749607930826399744",
    hippo:"749607884381667439",
    zebra:"749607942684803152",
    gorilla:"749607880231403520",
    monkey:"749607906026455050",
    orangutan:"749607919318376468",
    chipmunk:"749607848428257310",
    hedgehog:"749607881755369522",
    sloth:"749607935065366579",
    otter:"749607920100483163",
    skunk:"749607934415151114",
    raccoon:"749607928813633536",
    badger:"749607834989330432",
    boar:"749607839560589344",
    llama:"749607900183519283",
    alpaca:"749607833106374687",
    camel:"749607843671842826",
    kangaroo:"749607891959570432",
    platypus:"749607928124276746",
    crocodile:"749607850866638868",
    lizard:"749607900048502844",
    chameleon:"749607844260782101",
    gecko:"749607877181415444",
    iguana:"749607887793111090",
    komodo:"749607894827933697",
    axolotl:"749607834040516638",
    jellyfish:"749607890155069490",
    octopus:"749607918029316186",
    squid:"749607936061333565",
    lobster:"749607901085507584",
    clam:"749607848681185370",
    oyster:"749607921012776960",
    starfish:"749607936320118854",
    seahorse:"749607931765383259",
    dolphin:"749607864989376562",
    whale:"749607940843061258",
    shark:"749607933011935233",
    orca:"749607919677616139",
    seal:"749607932280299571",
    walrus:"749607939607912469",
    polar_bear:"749607928531345440",
    arctic_fox:"749607833862946906",
    reindeer:"749607930138755093",
    moose:"749607907696254996",
    bison:"749607838822637568",
    buffalo:"749607842541879338",
    ox:"749607920811556905",
    goat:"749607879628279868",
    ram:"749607929684566037",
    // ── Special/Animated OWO animals ──
    gspider:"749607880602701824",spider:"749607880602701824",
    gcrab:"749607851908489267",
    gbat:"749607835678875718",
    ghost:"749607878534021152",
    dragon:"749607866064879667",gdragon:"749607866064879667",
    unicorn:"749607938811801682",
    phoenix:"749607925453197322",
    kirin:"749607892968513546",
    nyan:"749607917131841607",
    // ── Currency / Items ──
    cowoncy:"416043450337853441",
    blank:"427371936482328576",blank2:"427371936482328576",
    // ── Status / UI ──
    owo:"565800471202340884",
    uwu:"565800484862738442",
};

function owoEmojiImg(name) {
    // Try unicode fallback first
    const uni = UNICODE_FALLBACK[name.toLowerCase()];
    if (uni) return `<span title=":${name}:" style="font-size:20px;line-height:1;vertical-align:-4px;display:inline-block">${uni}</span>`;
    return null;
}

// ==================== UNICODE EMOJI FALLBACK MAP ====================
const UNICODE_FALLBACK = {
    // OWO Animals
    butterfly:"🦋",cat:"🐱",cat2:"🐱",dog:"🐶",dog2:"🐶",fox:"🦊",fox2:"🦊",
    bear:"🐻",bear2:"🐻",bunny:"🐰",rabbit:"🐰",hamster:"🐹",parrot:"🦜",
    penguin:"🐧",duck:"🦆",frog:"🐸",wolf:"🐺",deer:"🦌",horse:"🐴",
    cow:"🐮",cow2:"🐮",pig:"🐷",chicken:"🐔",rooster:"🐓",sheep:"🐑",snake:"🐍",
    turtle:"🐢",fish:"🐟",crab:"🦀",shrimp:"🦐",snail:"🐌",bee:"🐝",
    ant:"🐜",beetle:"🪲",baby_chick:"🐣",chick:"🐤",owl:"🦉",flamingo:"🦩",
    peacock:"🦚",swan:"🦢",eagle:"🦅",bat:"🦇",panda:"🐼",koala:"🐨",
    lion:"🦁",tiger:"🐯",leopard:"🐆",giraffe:"🦒",elephant:"🐘",
    rhino:"🦏",hippo:"🦛",zebra:"🦓",gorilla:"🦍",monkey:"🐒",
    chipmunk:"🐿️",hedgehog:"🦔",sloth:"🦥",otter:"🦦",raccoon:"🦝",
    boar:"🐗",llama:"🦙",camel:"🐪",kangaroo:"🦘",crocodile:"🐊",
    lizard:"🦎",octopus:"🐙",jellyfish:"🪼",dolphin:"🐬",whale:"🐳",
    shark:"🦈",seal:"🦭",polar_bear:"🐻‍❄️",reindeer:"🦌",moose:"🫎",
    goat:"🐐",dragon:"🐉",unicorn:"🦄",phoenix:"🔥",ghost:"👻",spider:"🕷️",
    // OWO Rare/Zombie variants (zt = zombie type, g = golden)
    ztfish:"🐟",ztcat:"🐱",ztdog:"🐶",ztbear:"🐻",ztfox:"🦊",ztbunny:"🐰",
    ztbutterfly:"🦋",ztcow:"🐮",ztpig:"🐷",ztchicken:"🐔",ztsnake:"🐍",
    ztspider:"🕷️",ztbat:"🦇",ztdeer:"🦌",ztowl:"🦉",ztdragon:"🐉",
    gcat:"🐱",gdog:"🐶",gfox:"🦊",gbear:"🐻",gbunny:"🐰",gfish:"🐟",
    gpanda:"🐼",glon:"🦁",gdragon:"🐉",gbat:"🦇",gcrab:"🦀",gspider:"🕷️",
    // OWO Weapons & Items
    subsolve:"🗡️",rlyth:"⚔️",uwgen:"🪄",vampstaff:"🔮",magi:"✨",
    sword:"⚔️",blade:"🗡️",staff:"🪄",wand:"🪄",bow:"🏹",lance:"🗡️",
    katana:"⚔️",scythe:"⚔️",axe:"🪓",hammer:"🔨",spear:"🗡️",
    armor:"🛡️",helmet:"⛑️",cloak:"🧥",ring:"💍",amulet:"📿",
    // OWO Rarity
    common:"⬜",uncommon:"🟩",rare:"🟦",epic:"🟣",legendary:"🟠",mythical:"🔴",
    fabled:"⭐",limited:"💎",special:"✨",event:"🎉",
    // OWO Actions & UI
    huntbot:"🤖",hb:"🤖",battle:"⚔️",hunt:"🏹",curse:"💀",
    sell:"💰",buy:"🛒",shop:"🏪",inventory:"🎒",zoo:"🦁",
    cowoncy:"🪙",blank:"⬜",blank2:"⬜",owo:"👀",uwu:"🥺",check:"✅",
    // Hearts
    heart:"❤️",blue_heart:"💙",green_heart:"💚",yellow_heart:"💛",
    purple_heart:"💜",orange_heart:"🧡",black_heart:"🖤",white_heart:"🤍",
    broken_heart:"💔",sparkling_heart:"💖",heartpulse:"💗",heartbeat:"💓",
    revolving_hearts:"💞",two_hearts:"💕",heart_decoration:"💟",pink_heart:"🩷",
    // Effects
    star:"⭐",star2:"🌟",dizzy:"💫",sparkles:"✨",fire:"🔥",zap:"⚡",
    boom:"💥",droplet:"💧",ocean:"🌊",rainbow:"🌈",sunny:"☀️",moon:"🌙",
    snowflake:"❄️",cloud:"☁️",
    // Gestures
    muscle:"💪",wave:"👋",ok_hand:"👌",raised_hands:"🙌",clap:"👏",
    pray:"🙏",point_right:"👉",point_left:"👈",thumbsup:"👍",thumbsdown:"👎",
    // Faces
    skull:"💀",eyes:"👀",thinking:"🤔",sob:"😭",joy:"😂",smile:"😊",
    blush:"😊",wink:"😉",sunglasses:"😎",smirk:"😏",unamused:"😒",
    angry:"😠",rage:"😡",cry:"😢",sweat_smile:"😅",flushed:"😳",
    astonished:"😲",scream:"😱",cold_sweat:"😰",weary:"😩",tired_face:"😫",
    sleeping:"😴",zzz:"💤",pleading_face:"🥺",
    // Rewards / Items
    trophy:"🏆",medal:"🥇",crown:"👑",gem:"💎",moneybag:"💰",dollar:"💵",
    coin:"🪙",crossed_swords:"⚔️",shield:"🛡️",bow_and_arrow:"🏹",dagger:"🗡️",
    magic_wand:"🪄",crystal_ball:"🔮",tada:"🎉",confetti_ball:"🎊",
    gift:"🎁",balloon:"🎈",seedling:"🌱",four_leaf_clover:"🍀",
    cherry_blossom:"🌸",rose:"🌹",sunflower:"🌻",mushroom:"🍄",herb:"🌿",
    // Misc
    rocket:"🚀",phone:"📱",computer:"💻",camera:"📷",book:"📖",
    lock:"🔒",key:"🔑",bell:"🔔",alarm_clock:"⏰",
    checkmark:"✅",x:"❌",warning:"⚠️",question:"❓",exclamation:"❗",no_entry:"⛔",
};

// ==================== DISCORD CONTENT PARSER ====================
// Handles: <:name:id>, <a:name:id>, <@mention>, <#channel>, **bold**, *italic*, `code`
// Also handles OWO-style :shortcode: — tries OWO_EMOJI_IDS map first
function parseDiscordContent(text, emojiMap) {
    if (!text) return "";
    const tokens = [];
    let s = text;

    // ── 1. Discord custom emojis (with ID) — extract BEFORE HTML escape ──
    // Animated: <a:name:id>
    s = s.replace(/<a:([^:\s>]{1,64}):(\d{6,20})>/g, (_, name, id) => {
        const i = tokens.length;
        const b64 = emojiMap && emojiMap[id];
        if (b64) {
            tokens.push(`<img src="${b64}" alt=":${name}:" title=":${name}:" style="width:22px;height:22px;display:inline;vertical-align:-5px;object-fit:contain">`);
        } else {
            const _u = UNICODE_FALLBACK[name.toLowerCase()];
            tokens.push(_u ? `<span title=":${name}:" style="font-size:18px;line-height:1;vertical-align:-3px">${_u}</span>` : `<span style="font-size:11px;color:#b5bac1;background:rgba(255,255,255,.07);border-radius:3px;padding:0 3px">:${name}:</span>`);
        }
        return `\x01${i}\x01`;
    });
    // Static: <:name:id>
    s = s.replace(/<:([^:\s>]{1,64}):(\d{6,20})>/g, (_, name, id) => {
        const i = tokens.length;
        const b64 = emojiMap && emojiMap[id];
        if (b64) {
            tokens.push(`<img src="${b64}" alt=":${name}:" title=":${name}:" style="width:22px;height:22px;display:inline;vertical-align:-5px;object-fit:contain">`);
        } else {
            const _u = UNICODE_FALLBACK[name.toLowerCase()];
            tokens.push(_u ? `<span title=":${name}:" style="font-size:18px;line-height:1;vertical-align:-3px">${_u}</span>` : `<span style="font-size:11px;color:#b5bac1;background:rgba(255,255,255,.07);border-radius:3px;padding:0 3px">:${name}:</span>`);
        }
        return `\x01${i}\x01`;
    });

    // ── 2. Mentions ──
    s = s.replace(/<@!?(\d{6,20})>/g, () => {
        const i = tokens.length;
        tokens.push(`<span style="color:#c9cdfb;background:rgba(88,101,242,.3);border-radius:3px;padding:1px 4px">@user</span>`);
        return `\x01${i}\x01`;
    });
    s = s.replace(/<#(\d{6,20})>/g, () => {
        const i = tokens.length;
        tokens.push(`<span style="color:#c9cdfb;background:rgba(88,101,242,.2);border-radius:3px;padding:1px 4px">#channel</span>`);
        return `\x01${i}\x01`;
    });

    // ── 3. HTML escape remaining text ──
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ── 4. Markdown ──
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    s = s.replace(/`([^`\n]+)`/g, '<code style="background:rgba(0,0,0,.4);border-radius:3px;padding:0 4px;font-size:85%">$1</code>');
    s = s.replace(/\n/g, '<br>');

    // ── 5. OWO shortcodes :name: — try emoji map first, else Unicode fallback, else badge ──
    s = s.replace(/:([a-z0-9_]{2,32}):/g, (full, name) => {
        const uni = UNICODE_FALLBACK[name.toLowerCase()];
        if (uni) return `<span title=":${name}:" style="font-size:18px;line-height:1;vertical-align:-3px">${uni}</span>`;
        return `<span style="font-size:11px;color:#b5bac1;background:rgba(255,255,255,.07);border-radius:3px;padding:0 3px">:${name}:</span>`;
    });

    // ── 6. Restore token placeholders ──
    s = s.replace(/\x01(\d+)\x01/g, (_, i) => tokens[parseInt(i)] || '');
    return s;
}

// ==================== DISCORD CHAT ====================
function renderChat() {
    const el = $("#dc-stream");
    if (!el) return;
    saveChatToStorage();
    el.innerHTML = chat.map((m, i) => {
        const prev = chat[i-1];
        const grouped = prev && prev.author === m.author && prev.authorName === m.authorName && (m.id - prev.id < 60000);
        const nameColor = m.author === "owo" ? "dc-blue" : m.author === "other" ? "" : "text-white";
        const badge = m.author === "owo" ? `<span class="flex items-center gap-0.5 rounded-sm px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white" style="background:#5865f2">✓ APP</span>` : "";
        const head = grouped ? "" : `<div class="flex items-baseline gap-2"><span class="text-[15px] font-medium ${nameColor}">${m.authorName}</span>${badge}<span class="text-[11px] dc-mute">Today at ${m.ts}</span></div>`;
        const defaultAvatar = m.author === 'owo' ? OWO_AVATAR_CDN : `https://cdn.discordapp.com/embed/avatars/0.png`;
        const safeAvatar = (m.avatar && m.avatar.length > 5) ? m.avatar : defaultAvatar;
        const av = grouped ? `<span class="invisible block text-[10px] dc-mute">${m.ts}</span>` : `<img src="${safeAvatar}" class="mt-0.5 h-10 w-10 rounded-full dc-bg3 object-cover" onerror="this.onerror=null;this.src='${defaultAvatar}'" />`;

        // Real embeds array (from discord_message socket event)
        let embedsHtml = "";
        if (m.embeds && m.embeds.length > 0) {
            embedsHtml = m.embeds.map(emb => {
                const fieldsHtml = (emb.fields && emb.fields.length > 0)
                    ? `<div class="mt-2 grid gap-x-4 gap-y-1" style="grid-template-columns: repeat(${emb.fields.some(f=>!f.inline) ? '1' : '2'}, minmax(0,1fr))">
                        ${emb.fields.map(f => `<div><div class="text-[12px] font-semibold text-white">${parseDiscordContent(f.name, m.emojiMap)}</div><div class="text-[13px] dc-text">${parseDiscordContent(f.value, m.emojiMap)}</div></div>`).join('')}
                       </div>` : "";
                const thumbHtml = emb.thumbnail ? `<img src="${emb.thumbnail}" class="w-14 h-14 rounded object-cover ml-2 mt-1 shrink-0" onerror="this.style.display='none'"/>` : "";
                const imgHtml = emb.image ? `<img src="${emb.image}" class="mt-2 max-w-full rounded" style="max-height:200px;object-fit:contain" onerror="this.style.display='none'"/>` : "";
                return `<div class="mt-1 max-w-[480px] overflow-hidden rounded dc-bg2 flex gap-2" style="border-left:4px solid ${emb.color||'#5865f2'}">
                  <div class="px-3 py-2.5 flex-1 min-w-0">
                    ${emb.title?`<div class="text-[14px] font-semibold text-white">${parseDiscordContent(emb.title, m.emojiMap)}</div>`:""}
                    ${emb.description?`<div class="mt-1 text-[13px] leading-snug dc-text whitespace-pre-line">${parseDiscordContent(emb.description, m.emojiMap)}</div>`:""}
                    ${fieldsHtml}
                    ${imgHtml}
                    ${emb.footer?`<div class="mt-2 text-[11px] dc-mute">${parseDiscordContent(emb.footer, m.emojiMap)}</div>`:""}
                  </div>
                  ${thumbHtml}
                </div>`;
            }).join("");
        } else if (m.embed) {
            // Legacy single embed (pushChatPair se) — body already safe HTML hai, direct inject karo
            embedsHtml = `<div class="mt-1 max-w-[480px] overflow-hidden rounded dc-bg2" style="border-left:4px solid ${m.embed.color||'#dc2626'}">
              <div class="px-3 py-2.5">
                ${m.embed.title?`<div class="text-[14px] font-semibold text-white">${m.embed.title}</div>`:""}
                ${m.embed.body?`<div class="mt-1 text-[13px] leading-snug dc-text">${m.embed.body}</div>`:""}
                ${m.embed.footer?`<div class="mt-2 text-[11px] dc-mute">${m.embed.footer}</div>`:""}
              </div></div>`;
        }

        // Attachment image (battle board, hunt result)
        const attHtml = m.attachmentUrl
            ? `<div class="mt-1"><img src="${m.attachmentUrl}" alt="attachment" style="max-width:100%;max-height:280px;border-radius:6px;object-fit:contain;display:block" onerror="this.style.display='none'"/></div>`
            : "";

        return `<div class="group relative flex gap-3 px-2 ${grouped?'mt-0.5':'mt-3'} ${m.isNew?'animate-discord-in':''} hover-dc py-0.5 rounded ${m.sentFromDashboard?'dc-msg-sent':''}">
          <div class="w-10 shrink-0">${av}</div>
          <div class="min-w-0 flex-1">${head}<div class="text-[14px] leading-[1.4] dc-text">${m.rawHtml || parseDiscordContent(m.content, m.emojiMap)}</div>${embedsHtml}${attHtml}${m.sentFromDashboard?'<span style="font-size:9px;color:#5865f2;font-weight:600;margin-left:4px">✦ sent from dashboard</span>':''}</div>
        </div>`;
    }).join("");
    el.scrollTop = el.scrollHeight;
}

function pushChatPair(rawMsg, time) {
    const a = accounts.find(x => x.id === activeId) || accounts[0];
    if (!a) return;
    const name = a.tag.split("#")[0];
    const nameUpper = name.toUpperCase();
    const baseId = Date.now();

    // owonew17 log parse — "emoji cmd → result" format
    const arrowIdx = rawMsg.indexOf("→");
    const cmdPart   = arrowIdx >= 0 ? rawMsg.slice(0, arrowIdx).trim() : rawMsg.trim();
    const resultPart = arrowIdx >= 0 ? rawMsg.slice(arrowIdx + 1).trim() : "";
    // emoji/prefix hatao
    const cleanCmd    = cmdPart.replace(/^[^a-zA-Z0-9owo]*/i, "").trim();
    const cleanResult = resultPart.replace(/^[\s🌱🏆💰🤖🙏⚡🎯⚔️⏰📅🔫|]+/, "").trim();

    let userContent = cleanCmd || "owo";
    let owoContent = "", embed = null;

    if (/hunt/i.test(cleanCmd) && !/huntbot|owob/i.test(cleanCmd)) {
        // ── Hunt ──
        const animals = ["Common Slime","Uncommon Fox","Rare Dragon","Epic Phoenix","Legendary Kirin","Common Rabbit","Uncommon Bear"];
        const caught = cleanResult || animals[Math.floor(Math.random() * animals.length)];
        const xp = 5 + Math.floor(Math.random() * 30);
        owoContent = `🌱 OwO! <b style="color:#fff">${nameUpper}</b> caught a <b style="color:#fbbf24">${caught}</b>! 🐥<br><span style="color:#949ba4">| 🐱 gained <b style="color:#fff">${xp}xp</b>!</span>`;

    } else if (/battle/i.test(cleanCmd)) {
        // ── Battle ──
        const xp = 80 + Math.floor(Math.random() * 150);
        embed = {
            color: "#dc2626",
            title: `⚔️ ${nameUpper} goes into battle!`,
            body: `<div style="font-size:12px;line-height:1.6"><div style="color:#fff;font-weight:600">${nameUpper}'s Team</div><div style="color:#949ba4">L.31 🐱 — no weapon</div><div style="margin-top:4px;color:#fff;font-weight:600">OWO's Team</div><div style="color:#949ba4">L.29 🐶 — basic sword</div></div>`,
            footer: cleanResult || `You won in 3 turns!  |  +${xp} xp`
        };
        owoContent = "";

    } else if (/pray/i.test(cleanCmd)) {
        // ── Pray ──
        const buffs = ["+5% luck buff","your animals gained 50xp","you feel blessed ✨","gem drop rate increased"];
        owoContent = `🙏 | <b style="color:#fff">${nameUpper}</b> prayed to the OwO gods...<br><span style="color:#949ba4">| ✨ ${cleanResult || buffs[Math.floor(Math.random()*buffs.length)]}</span>`;

    } else if (/huntbot|owob|\bowo\s*hb\b/i.test(cleanCmd) || /huntbot/i.test(rawMsg) || /\bowo\s*hb\b/i.test(rawMsg)) {
        // ── Huntbot / owo hb ──
        const amountMatch = cleanCmd.match(/hb\s+(\d[\d,]*)/i) || rawMsg.match(/hb\s+(\d[\d,]*)/i);
        const hbAmount = amountMatch ? parseInt(amountMatch[1].replace(/,/g,'')) : (hb.amount || 0);
        const hbSec = hb.backInSec > 0 ? hb.backInSec : 900;
        const backTime = new Date(Date.now() + hbSec * 1000).toLocaleTimeString("en-IN", {hour12:false, hour:'2-digit', minute:'2-digit'});
        embed = {
            color: "#f59e0b",
            title: "🤖 Huntbot Dispatched!",
            body: `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.7">` +
                  (hbAmount > 0 ? `<div><span style="color:#949ba4">Amount: </span><span style="color:#fff;font-weight:600">${hbAmount.toLocaleString()} cowoncy</span></div>` : '') +
                  `<div><span style="color:#949ba4">Returns at: </span><span style="color:#fff;font-weight:600">${backTime}</span></div>` +
                  `</div>`,
            footer: "Next HB auto-scheduled from OWO response!"
        };
        owoContent = "";
        if (amountMatch) hb.amount = hbAmount;

    } else if (/captcha|cap/i.test(rawMsg)) {
        // ── Captcha ──
        embed = {
            color: "#ef4444",
            title: "⚠️ Captcha Detected!",
            body: `<div style="font-size:12px;line-height:1.6;color:#949ba4">Please solve the captcha to continue.<br><span style="color:#fff">Auto-solve is running...</span></div>`,
            footer: "Anti-captcha protection active"
        };
        owoContent = "";

    } else if (/sell/i.test(cleanCmd)) {
        owoContent = `💰 | Sold! Earned <b style="color:#fbbf24">${cleanResult || "+1,240 cowoncy"}</b>`;

    } else if (/HB back in|Next HB|hb \d+/i.test(rawMsg)) {
        // ── HB schedule msg — simple plain text ──
        const cleanTime = (cleanResult || rawMsg).replace(/<[^>]+>/g, '').trim();
        owoContent = `⏰ | ${cleanTime}`;

    } else {
        // ── Default — plain text only, no HTML ──
        const plainResult = cleanResult.replace(/<[^>]+>/g, '').trim();
        owoContent = plainResult
            ? plainResult
            : "";
        // Agar kuch meaningful nahi hai toh OWO response bilkul mat dikhao
        if (!owoContent) { renderLogs(); return; }
    }

    chat.push({ id:baseId, ts:time, author:"user", authorName:nameUpper, avatar:a.avatar, content:userContent, isNew:true });
    if (owoContent || embed) {
        chat.push({ id:baseId+1, ts:time, author:"owo", authorName:"OwO", avatar:OWO_AVATAR, content:"", rawHtml:owoContent, embed, isNew:true });
    }
    if (chat.length > 60) chat = chat.slice(-60);
    renderChat();
}

// ==================== HUNTBOT RENDER ====================
function renderHb() {
    const chip = document.getElementById("hb-status-chip");
    if (!chip) return;
    chip.textContent = hb.status;
    // Remove all status classes first
    chip.className = "status-chip";
    const classMap = {
        waiting: "status-chip--waiting",
        ready:   "status-chip--ready",
        solving: "status-chip--solving",
        disabled:"status-chip--disabled",
    };
    chip.classList.add(classMap[hb.status] || "status-chip--disabled");

    const timeEl = $("#hb-time");
    const labelEl = $("#hb-label");

    // ── HB display logic ──
    // ∞ sirf tab dikhao jab HB kabhi nahi chala (runs=0, backInSec=0, status not solving/ready)
    // "00s" kabhi nahi dikhna chahiye — 0 pe bhi ∞ dikhao jab ready nahi
    const hbHasData = _hbServerSynced && (hb.runs > 0 || hb.backInSec > 0 || hb.status === "solving" || hb.status === "ready");
    if (timeEl) {
        if (hb.status === "disabled") {
            timeEl.textContent = "--";
            timeEl.style.fontSize = "2.8rem";
        } else if (!hbHasData) {
            // HB kabhi nahi chala → ∞ dikhao
            timeEl.innerHTML = `<span class="hb-unlimited" style="font-size:3.5rem;letter-spacing:-.02em">∞</span>`;
            timeEl.style.fontSize = "";
        } else if (hb.status === "ready") {
            timeEl.textContent = "Ready!";
            timeEl.style.fontSize = "2.4rem";
        } else if (hb.backInSec > 0) {
            timeEl.textContent = fmtMS(hb.backInSec);
            timeEl.style.fontSize = hb.backInSec > 3600 ? "2.4rem" : hb.backInSec > 600 ? "2.8rem" : "3rem";
        } else {
            // backInSec = 0 lekin running — ∞ dikhao (timer not set yet)
            timeEl.innerHTML = `<span class="hb-unlimited" style="font-size:3.5rem;letter-spacing:-.02em">∞</span>`;
            timeEl.style.fontSize = "";
        }
    }
    if (labelEl) {
        if (!hbHasData && hb.status !== "disabled") {
            labelEl.textContent = "Waiting for start";
        } else if (hb.status === "ready") {
            labelEl.textContent = "Huntbot returned!";
        } else {
            labelEl.textContent = hb.status === "disabled" ? "Disabled" : hb.status === "solving" ? "Captcha solving" : "Returns in";
        }
    }

    const earnEl = $("#hb-earn"), runsEl = $("#hb-runs"), capEl = $("#hb-cap"), lastEl = $("#hb-last"), chEl = $("#hb-ch"), dcChEl = $("#dc-ch");
    const rewardEl = $("#hb-reward");
    if (earnEl) earnEl.textContent = fmt(hb.totalEarned);
    if (runsEl) runsEl.textContent = hb.runs;
    if (capEl) capEl.textContent = hb.cap;

    // "Last sent" → "Next HB 6:43 AM" or "∞" if unknown
    if (lastEl) {
        if (!hbHasData && hb.status !== "disabled") {
            lastEl.innerHTML = '<span style="font-size:16px;font-weight:bold">∞</span>';
            lastEl.style.color = 'var(--muted)';
        } else if (hb.nextAt && hb.nextAt > Date.now()) {
            const nextDate = new Date(hb.nextAt * 1000);
            const nextStr = nextDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
            lastEl.textContent = `Next HB ${nextStr}`;
            lastEl.style.color = 'var(--warning)';
        } else if (hb.status === 'waiting' && hb.backInSec > 0) {
            const nextSec = Math.floor(Date.now() / 1000) + hb.backInSec;
            const nextDate = new Date(nextSec * 1000);
            const nextStr = nextDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
            lastEl.textContent = `Next HB ${nextStr}`;
            lastEl.style.color = 'var(--warning)';
        } else if (hb.status === 'disabled') {
            lastEl.textContent = '—';
            lastEl.style.color = '';
        } else {
            // Unknown — show ∞ symbol
            lastEl.innerHTML = '<span style="font-size:16px;font-weight:bold">∞</span>';
            lastEl.style.color = 'var(--muted)';
        }
    }

    if (chEl) chEl.textContent = channel && channel !== "—" ? "#" + channel.slice(-4) : "#—";
    if (dcChEl) dcChEl.textContent = channel && channel !== "—" ? "#" + channel.slice(-4) : "#—";
    if (rewardEl) rewardEl.textContent = hb.amount > 0 ? fmt(hb.amount) : "0";

    // Progress
    const totalCycle = Math.max(hb.backInSec, 900);
    const pct = hb.status === "waiting"
        ? Math.max(0, Math.min(100, ((totalCycle - hb.backInSec) / totalCycle) * 100))
        : hb.status === "ready" ? 100 : 0;
    const barEl = $("#hb-bar"), pctEl = $("#hb-pct");
    if (barEl) barEl.style.width = pct + "%";
    if (pctEl) pctEl.textContent = Math.round(pct) + "%";

    const C = 2 * Math.PI * 52;
    const ringEl = $("#hb-ring");
    if (ringEl) {
        ringEl.setAttribute("stroke-dashoffset", C * (1 - pct / 100));
        ringEl.setAttribute("stroke", hb.status === "solving" ? "var(--primary)" : "var(--warning)");
    }

    const pb = $("#hb-pause-btn");
    if (pb) {
        const s = pb.querySelector("span");
        const ico = pb.querySelector("i");
        if (s) s.textContent = hb.status === "disabled" ? "Enable" : "Pause";
        if (ico) ico.setAttribute("data-lucide", hb.status === "disabled" ? "play" : "pause");
    }
    refreshIcons();
}

// ==================== ACTIONS ====================

// Account switch → Socket.IO se owonew17 ko bolo
window.switchAcc = (id) => {
    if (id === activeId) return;
    const a = accounts.find(x => x.id === id);
    if (!a) return;

    // Socket.IO se server ko bolo (jo owonew17 se connected hai)
    if (a.tokenPrefix || a.tokenPreview) {
        socket.emit('switch_account', {
            tokenPrefix: a.tokenPrefix || '',
            tokenPreview: a.tokenPreview || '',
        });
        toast("Switching → " + a.tag + "...");
    } else {
        // Fallback: local switch (sirf UI update)
        activeId = id;
        renderActive();
        renderAccounts();
        toast("Switched → " + a.tag);
        pushLog("info", `Account switched → ${a.tag}`);
    }
};

// Channel set → server ko REST se bolo
window.setChannel = () => {
    const v = $("#ch-input").value.trim();
    if (!v) return;
    fetch('/api/set_channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: v })
    })
    .then(r => r.json())
    .then(data => {
        if (data.ok) {
            channel = v;
            $("#ch-id").textContent = v;
            $("#ch-input").value = "";
            renderHb();
            toast("Channel updated");
        } else {
            toast("Error: " + (data.reason || 'failed'));
        }
    })
    .catch(() => {
        // Fallback: local update
        channel = v;
        $("#ch-id").textContent = v;
        $("#ch-input").value = "";
        renderHb();
        toast("Channel updated (local)");
    });
};

// Huntbot trigger → Socket.IO
window.triggerHb = () => {
    socket.emit('trigger_huntbot');
    hb.status = "solving";
    hb.last = ts();
    renderHb();
    toast("Huntbot triggered · solving captcha");
    pushLog("grind", "owo huntbot · captcha auto-solving");
    setTimeout(() => {
        hb.status = "waiting";
        hb.backInSec = 15 * 60;
        hb.cap += 1;
        pushLog("ok", "Captcha solved · huntbot dispatched (15:00)");
        renderHb();
    }, 2200);
};

window.toggleAuto = () => {
    hb.autoSolve = !hb.autoSolve;
    const b = $("#hb-auto-btn");
    if (!b) return;
    if (hb.autoSolve) { b.style.borderColor = "rgba(34,197,94,.4)"; b.style.color = "var(--success)"; }
    else { b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; }
};

window.togglePause = () => {
    hb.status = hb.status === "disabled" ? "waiting" : "disabled";
    if (hb.status === "waiting") hb.backInSec = 15 * 60;
    // Config bhi update karo
    socket.emit('toggle_config', 'hb');
    toast(hb.status === "disabled" ? "Auto Huntbot disabled" : "Auto Huntbot enabled");
    renderHb();
};

window.reboot = () => {
    toast("Selfbot rebooting...");
    pushLog("warn", "Selfbot reboot initiated");
    fetch('/api/stop', { method: 'POST' })
        .then(() => setTimeout(() => fetch('/api/start', { method: 'POST' }), 3000))
        .catch(() => {});
};

// ── CHECK COWONCY: "owo cash" send karke cowoncy update karo ──
window.checkCowoncy = () => {
    if (!channel || channel === "—") {
        toast("Channel set karo pehle!");
        return;
    }
    fetch('/api/send_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'owo cash', channel_id: channel })
    })
    .then(r => r.json())
    .then(data => {
        if (data.ok) {
            toast("💰 owo cash sent — cowoncy update hoga!");
            pushLog('ok', '💰 owo cash sent for cowoncy check');
        } else {
            toast("Failed: " + (data.error || 'unknown'));
        }
    })
    .catch(() => toast("Check cowoncy failed"));
};

// ==================== DISCORD MESSAGE SEND ====================
let _lastSendTime = 0;
let _cooldownTimer = null;

function _startCooldownUI(totalMs) {
    const statusEl = $("#dc-send-status");
    const btn = $("#dc-send-btn");
    const input = $("#dc-input");
    if (_cooldownTimer) clearInterval(_cooldownTimer);

    // Disable input during cooldown
    if (input) { input.disabled = true; input.style.opacity = "0.5"; }
    if (btn) { btn.style.opacity = "0.4"; btn.style.pointerEvents = "none"; }

    const endTime = Date.now() + totalMs;
    _cooldownTimer = setInterval(() => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
            clearInterval(_cooldownTimer);
            _cooldownTimer = null;
            if (statusEl) statusEl.textContent = "";
            if (input) { input.disabled = false; input.style.opacity = "1"; input.focus(); }
            if (input && input.value.trim()) {
                if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
            }
            return;
        }
        const secs = Math.ceil(remaining / 1000);
        if (statusEl) {
            statusEl.textContent = `⏳ Cooldown: ${secs}s`;
            statusEl.style.color = secs <= 1 ? "#23a55a" : "#faa61a";
        }
    }, 100);
}

window.sendDcMessage = async () => {
    const input = $("#dc-input");
    const statusEl = $("#dc-send-status");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;

    // 3s cooldown — agar abhi bhi cooldown chal raha hai toh return
    const now = Date.now();
    const diff = now - _lastSendTime;
    if (diff < 3000) {
        // Already cooldown UI chal rahi hai
        return;
    }
    _lastSendTime = now;

    const btn = $("#dc-send-btn");
    if (btn) { btn.style.opacity = "0.5"; btn.style.pointerEvents = "none"; }
    if (statusEl) { statusEl.textContent = "Sending..."; statusEl.style.color = "#949ba4"; }

    try {
        const res = await fetch('/api/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, channel_id: channel })
        });
        const data = await res.json();

        if (data.ok) {
            // Optimistically show message now — track in Set so socket duplicate skip ho
            const a = accounts.find(x => x.id === activeId) || accounts[0];
            const msgKey = msg.trim();
            _pendingDashboardMsgs.add(msgKey);
            // Auto-expire pending entry after 5s (agar socket message nahi aaya kisi wajah se)
            setTimeout(() => _pendingDashboardMsgs.delete(msgKey), 5000);

            chat.push({
                id: Date.now(),
                ts: hhmm(),
                author: "user",
                authorName: (a?.tag || "You").split("#")[0].toUpperCase(),
                avatar: a?.avatar || "",
                content: msg,
                embeds: [],
                isNew: true,
                sentFromDashboard: true,
            });
            if (chat.length > 80) chat = chat.slice(-80);
            renderChat();

            input.value = "";
            updateDcSendBtn("");
            if (statusEl) {
                statusEl.textContent = "✓ Sent!";
                statusEl.style.color = "#23a55a";
            }
            pushLog("ok", `📤 Message sent → "${msg.slice(0, 50)}${msg.length > 50 ? '...' : ''}"`);

            // 3s cooldown countdown start karo
            _startCooldownUI(3000);
        } else {
            throw new Error(data.error || data.reason || "Failed");
        }
    } catch (e) {
        if (statusEl) {
            statusEl.textContent = "✗ " + e.message;
            statusEl.style.color = "#f04747";
            setTimeout(() => { if(statusEl) statusEl.textContent = ""; }, 3000);
        }
        toast("Send failed: " + e.message);
        pushLog("err", `Message send failed: ${e.message}`);
        // On error, re-enable input immediately (no cooldown)
        if (input) { input.disabled = false; input.style.opacity = "1"; }
        if (btn) { btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
    }
};

// dc-input char count + send button enable/disable
function updateDcSendBtn(val) {
    val = val || '';
    const btn = document.getElementById('dc-send-btn');
    const counter = document.getElementById('dc-charcount');
    const hasText = val.trim().length > 0;
    if (btn) {
        btn.style.opacity = hasText ? "1" : "0.4";
        btn.style.pointerEvents = hasText ? "auto" : "none";
    }
    if (counter) {
        if (val.length > 1800) {
            counter.textContent = val.length + "/2000";
            counter.style.color = val.length > 1950 ? "#f04747" : "#faa61a";
        } else {
            counter.textContent = "";
        }
    }
}

// ==================== @ MENTION AUTOCOMPLETE ====================
let _mentionPopupActive = false;
let _mentionStart = -1;
let _mentionSelected = 0;

function _getMentionCandidates(query) {
    const q = (query || "").toLowerCase();
    const all = (onlineMembers || []).map(m => ({
        id: m.id,
        name: m.displayName || m.username || "Unknown",
        avatar: m.avatar || null,
        status: m.status || "offline",
        isOwo: m.isOwo || false,
        isSelf: m.isSelf || false,
    }));
    if (!q) return all.slice(0, 8);
    return all.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8);
}

function _hideMentionPopup() {
    const popup = document.getElementById("dc-mention-popup");
    if (popup) popup.remove();
    _mentionPopupActive = false;
    _mentionSelected = 0;
    window._mentionCandidates = [];
}

window._insertMention = function(member) {
    const input = document.getElementById("dc-input");
    if (!input || !member) return;
    const val = input.value;
    const before = val.slice(0, _mentionStart);
    const after = val.slice(input.selectionStart);
    const mention = "<@" + member.id + ">";
    input.value = before + mention + " " + after;
    const newPos = before.length + mention.length + 1;
    input.setSelectionRange(newPos, newPos);
    input.focus();
    _hideMentionPopup();
    updateDcSendBtn(input.value);
};

function _renderMentionPopup(candidates) {
    _hideMentionPopup();
    if (!candidates.length) return;

    const inputBox = document.querySelector(".dc-input-box");
    if (!inputBox) return;

    const popup = document.createElement("div");
    popup.id = "dc-mention-popup";
    popup.className = "dc-mention-popup";

    popup.innerHTML = candidates.map((m, idx) => {
        const statusColor = m.status === "online" ? "#23a55a" : m.status === "idle" ? "#f0b232" : m.status === "dnd" ? "#f04747" : "#747f8d";
        const fallback = "https://cdn.discordapp.com/embed/avatars/0.png";
        const src = m.avatar || fallback;
        const badge = m.isOwo
            ? `<span class="dc-mention-badge dc-mention-badge--bot">BOT</span>`
            : m.isSelf
            ? `<span class="dc-mention-badge dc-mention-badge--you">YOU</span>`
            : "";
        return `<div class="dc-mention-item${idx === _mentionSelected ? " dc-mention-item--active" : ""}"
                     onmousedown="event.preventDefault()"
                     onclick="window._insertMention(window._mentionCandidates[${idx}])">
            <div class="dc-mention-avatar-wrap">
                <img src="${src}" class="dc-mention-avatar" onerror="this.src='${fallback}'"/>
                <span class="dc-mention-status-dot" style="background:${statusColor}"></span>
            </div>
            <span class="dc-mention-name">${m.name}</span>
            ${badge}
        </div>`;
    }).join("");

    inputBox.style.position = "relative";
    inputBox.appendChild(popup);
    _mentionPopupActive = true;
    window._mentionCandidates = candidates;
}

// dc-input event listener
const dcInput = document.getElementById("dc-input");
if (dcInput) {
    dcInput.addEventListener("input", (e) => {
        updateDcSendBtn(e.target.value);
        const val = e.target.value;
        const cursor = e.target.selectionStart;

        // Find last @ before cursor (no space between)
        let atIdx = -1;
        for (let i = cursor - 1; i >= 0; i--) {
            if (val[i] === "@") { atIdx = i; break; }
            if (val[i] === " ") break;
        }

        if (atIdx >= 0) {
            const query = val.slice(atIdx + 1, cursor);
            if (!/\s/.test(query)) {
                _mentionStart = atIdx;
                _mentionSelected = 0;
                const candidates = _getMentionCandidates(query);
                if (candidates.length) { _renderMentionPopup(candidates); return; }
            }
        }
        _hideMentionPopup();
    });

    dcInput.addEventListener("keydown", (e) => {
        if (_mentionPopupActive) {
            const cands = window._mentionCandidates || [];
            if (e.key === "ArrowDown") { e.preventDefault(); _mentionSelected = Math.min(_mentionSelected + 1, cands.length - 1); _renderMentionPopup(cands); return; }
            if (e.key === "ArrowUp")   { e.preventDefault(); _mentionSelected = Math.max(_mentionSelected - 1, 0); _renderMentionPopup(cands); return; }
            if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); if (cands[_mentionSelected]) window._insertMention(cands[_mentionSelected]); return; }
            if (e.key === "Escape")    { _hideMentionPopup(); return; }
        }
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDcMessage(); }
    });

    dcInput.addEventListener("blur", () => setTimeout(_hideMentionPopup, 150));
}

// Behaviour toggles → Socket se config update
window.toggleBehaviour = (k) => {
    behaviour[k] = !behaviour[k];
    const type = k === 'sleep' ? 'sleep' : k === 'autoHb' ? 'hb' : k === 'single' ? 'single' : null;
    if (type) socket.emit('toggle_config', type);
    renderToggles();
};

// Protection toggles → Socket
window.toggleProtection = (k) => {
    protections[k] = !protections[k];
    socket.emit('toggle_protection', k);
    renderToggles();
};

function pushLog(type, msg) {
    const entry = { ts:ts(), type, msg, isNew:true };
    logs.push(entry);
    if (logs.length > 300) logs = logs.slice(-300);
    renderLogs();
}

// Run / Stop button
const runBtn = document.getElementById("run-btn");
if (runBtn) {
    runBtn.addEventListener("click", () => {
        if (running) {
            socket.emit('stop');
            fetch('/api/stop', { method: 'POST' }).catch(() => {});
            running = false;
            pushLog('warn', 'Grinding stopped');
        } else {
            socket.emit('start');
            fetch('/api/start', { method: 'POST' }).catch(() => {});
            running = true;
            pushLog('ok', 'Grinding started');
        }
        const runLabel = $("#run-label");
        const runBtnLabel = $("#run-btn-label");
        if (runLabel) runLabel.textContent = running ? "Running" : "Idle";
        if (runBtnLabel) runBtnLabel.textContent = running ? "Stop" : "Start";
        refreshIcons();
    });
}

// ==================== TICKS (local UI updates) ====================
setInterval(() => {
    uptime++;
    const u1 = $("#up1"), u2 = $("#up2");
    if (u1) u1.textContent = fmtUp(uptime);
    if (u2) u2.textContent = fmtUp(uptime);
}, 1000);

setInterval(() => {
    // Sirf countdown karo — reset NAHI karo
    // Real timer socket 'update' event se aata hai (applySnapshot mein handle hota hai)
    // _hbServerSynced check: server se data aane se pehle countdown mat karo
    if (!_hbServerSynced) return;
    if (hb.status !== "waiting") return;
    if (hb.backInSec > 0) {
        hb.backInSec -= 1;
        renderHb();
    }
    // backInSec 0 pe phucha — "ready" state, server se next update ka wait karo
    // Local reset bilkul nahi — warna 15m loop hoga
    if (hb.backInSec <= 0 && hb.status === "waiting") {
        hb.status = "ready";
        hb.backInSec = 0;
        pushLog("ok", `🤖 Huntbot returned · +${fmt(hb.amount)} cowoncy`);
        stats.cash += hb.amount;
        hb.runs += 1;
        hb.totalEarned += hb.amount;
        hb.last = ts();
        renderStats();
        renderHb();
        // Server se real next HB time aane tak ready state mein raho
        // Koi local 15min reset nahi
    }
}, 1000);

// ==================== INIT ====================
renderActive();
renderToggles();
renderStats();
renderAccounts();
renderLogs();
renderLogFilter();
renderHb();
renderChat();

const chIdEl = $("#ch-id");
if (chIdEl) chIdEl.textContent = channel;
refreshIcons();

// ==================== DISCORD PREVIEW TOGGLE ====================
let _discordPreviewVisible = true;

window.toggleDiscordPreview = function() {
    _discordPreviewVisible = !_discordPreviewVisible;
    const body = $("#dc-preview-body");
    const label = $("#dc-preview-label");
    const toggleBtn = $("#dc-preview-toggle");
    const indicator = $("#dc-live-indicator");

    if (_discordPreviewVisible) {
        // Show
        if (body) {
            body.style.maxHeight = body.scrollHeight + "px";
            body.style.opacity = "1";
            body.style.pointerEvents = "auto";
            // Restore maxHeight after transition
            setTimeout(() => { if(body) body.style.maxHeight = "9999px"; }, 400);
        }
        if (label) label.textContent = "Hide";
        if (toggleBtn) {
            toggleBtn.style.borderColor = "rgba(34,197,94,.4)";
            toggleBtn.style.color = "var(--success)";
            toggleBtn.style.background = "rgba(34,197,94,.08)";
            const ico = toggleBtn.querySelector("i");
            if (ico) ico.setAttribute("data-lucide", "eye");
        }
        if (indicator) indicator.style.opacity = "1";
    } else {
        // Hide
        if (body) {
            body.style.maxHeight = body.scrollHeight + "px";
            // Force reflow
            body.offsetHeight;
            body.style.maxHeight = "0px";
            body.style.opacity = "0";
            body.style.pointerEvents = "none";
        }
        if (label) label.textContent = "Show";
        if (toggleBtn) {
            toggleBtn.style.borderColor = "rgba(220,38,38,.4)";
            toggleBtn.style.color = "var(--primary)";
            toggleBtn.style.background = "rgba(220,38,38,.08)";
            const ico = toggleBtn.querySelector("i");
            if (ico) ico.setAttribute("data-lucide", "eye-off");
        }
        if (indicator) indicator.style.opacity = "0.4";
    }
    refreshIcons();
};

// Init discord preview body transition style
(function initDcPreview() {
    const body = document.getElementById("dc-preview-body");
    if (body) {
        body.style.transition = "max-height .4s cubic-bezier(.22,1,.36,1), opacity .3s ease";
        body.style.overflow = "hidden";
        body.style.maxHeight = "9999px";
        body.style.opacity = "1";
    }
})();

// Socket connection status
socket.on('connect', () => {
    const dot = document.getElementById('socket-dot');
    const lbl = document.getElementById('socket-label');
    const pill = document.getElementById('socket-status');
    if (dot) { dot.style.background = 'var(--success)'; dot.classList.remove('animate-blink'); }
    if (lbl) lbl.textContent = 'connected';
    if (pill) pill.style.display = 'flex';
    pushLog('ok', '🌐 Dashboard connected to owonew17 server');
});
socket.on('disconnect', () => {
    const dot = document.getElementById('socket-dot');
    const lbl = document.getElementById('socket-label');
    if (dot) { dot.style.background = 'var(--warning)'; dot.classList.add('animate-blink'); }
    if (lbl) lbl.textContent = 'disconnected';
    pushLog('warn', '⚠️ Dashboard disconnected — reconnecting...');
});




// ==================== OWO DASHBOARD SERVER ====================
// File location: owocore/dashboard.js
// Config: owocore/owoconfig.json (NO botconfig.json)
// Socket.IO: Real-time sync with owo3.js state

'use strict';

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const fs      = require('fs');

const PORT     = 8080;
const MAX_LOGS = 600;

// ==================== SHARED REFS ====================
let _state            = null;
let _config           = null;
let _autoHbState      = null;
let _getSelfbot       = null;
let _bot              = null;
let _startGrinding    = null;
let _saveConfig       = null;
let _updatePanel      = null;
let _switchToAccount  = null;
let _readBotconfig    = null;   // actually reads owoconfig — name kept for compat
let _fetchAccountInfo = null;
let _accInfoCache     = null;
let _rebootSelfbot    = null;
let _sendAutoHb       = null;
let _saveCurrentAccountHbState = null;
let _loadHbConfig     = null;
let _saveHbConfig     = null;
let _getHbConfigFile  = null;

const logs = [];
let io = null;

// ==================== owoconfig.json PATH RESOLVER ====================
function getOwoconfigPath() {
    const candidates = [
        path.join(__dirname, 'owoconfig.json'),
        path.join(__dirname, '..', 'owocore', 'owoconfig.json'),
        path.join(__dirname, '..', 'owoconfig.json'),
        path.join(process.cwd(), 'owocore', 'owoconfig.json'),
        path.join(process.cwd(), 'owoconfig.json'),
    ];
    return candidates.find(p => fs.existsSync(p)) || candidates[0];
}

function readOwoconfigDirect() {
    try {
        const p = getOwoconfigPath();
        if (!fs.existsSync(p)) return {};
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { return {}; }
}

function writeOwoconfigDirect(cfg) {
    const p = getOwoconfigPath();
    fs.writeFileSync(p, JSON.stringify(cfg, null, 4));
}

// ==================== COOLDOWN TRACKER ====================
const _cmdTimestamps  = [];
const RATE_WINDOW_MS  = 60000;
const SAFE_MAX_CPM    = 4.0;
const WARN_MAX_CPM    = 5.5;

function recordCommand() {
    const now = Date.now();
    _cmdTimestamps.push(now);
    while (_cmdTimestamps.length > 0 && now - _cmdTimestamps[0] > RATE_WINDOW_MS * 2) {
        _cmdTimestamps.shift();
    }
}

function getCPM() {
    const now = Date.now();
    return _cmdTimestamps.filter(t => now - t < RATE_WINDOW_MS).length;
}

function getRateLimitRisk() {
    const cpm = getCPM();
    if (cpm > WARN_MAX_CPM) return 'high';
    if (cpm > SAFE_MAX_CPM) return 'medium';
    return 'low';
}

// ==================== LOG CAPTURE ====================
function captureLog(type, msg) {
    const ts    = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const entry = { ts, type, msg, id: Date.now() + Math.random() };
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();
    if (io) io.emit('log', entry);

    if (type === 'grind' || (type === 'ok' && msg && (msg.includes('hunt') || msg.includes('battle')))) {
        recordCommand();
    }
}

// ==================== AVATAR HELPER ====================
function getSelfbotAvatarUrl(sbUser) {
    if (!sbUser) return null;
    try {
        if (typeof sbUser.displayAvatarURL === 'function') return sbUser.displayAvatarURL({ format: 'png', size: 128 });
        if (typeof sbUser.avatarURL === 'function')        return sbUser.avatarURL({ format: 'png', size: 128 });
        if (sbUser.avatar && sbUser.id) return `https://cdn.discordapp.com/avatars/${sbUser.id}/${sbUser.avatar}.png?size=128`;
        const discriminator = sbUser.discriminator || '0';
        const index = discriminator === '0'
            ? Number(BigInt(sbUser.id) >> 22n) % 6
            : parseInt(discriminator) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch { return null; }
}

// ==================== SNAPSHOT ====================
function getSnapshot() {
    const sb      = _getSelfbot ? _getSelfbot() : null;
    const sbReady = (sb && (sb.isReady ? sb.isReady() : false)) || (sb && sb.user != null);
    const sbUser  = (sbReady || (sb && sb.user)) && sb.user ? {
        tag:    sb.user.tag || sb.user.username || 'Unknown',
        id:     sb.user.id,
        avatar: getSelfbotAvatarUrl(sb.user)
    } : null;

    const cpm       = getCPM();
    const riskLevel = getRateLimitRisk();

    return {
        state: {
            grinding_active:   _state?.grinding_active   || false,
            captcha_detected:  _state?.captcha_detected  || false,
            is_sleeping:       _state?.is_sleeping        || false,
            sleep_end_time:    _state?.sleep_end_time     || 0,
            session_cmd_count: _state?.session_cmd_count  || 0,
            session_hunt:      _state?.session_hunt        || 0,
            session_battle:    _state?.session_battle      || 0,
            session_pray:      _state?.session_pray        || 0,
            session_owo:       _state?.session_owo         || 0,
            sleep_count:       _state?.sleep_count         || 0,
            start_time:        _state?.start_time          || Math.floor(Date.now() / 1000),
            session_start:     _state?.session_start       || Math.floor(Date.now() / 1000),
        },
        config: {
            channel_id:           _config?.channel_id          || null,
            sleep_enabled:        _config?.sleep_enabled        || false,
            auto_huntbot_enabled: _config?.auto_huntbot_enabled || false,
            single_mode:          _config?.single_mode          || false,
            auto_upgrade_trait:   _config?.auto_upgrade_trait   || 'none',
            protections:          _config?.protections          || {},
            commands:             _config?.commands             || {},
            stats:                _config?.stats                || {},
        },
        hb: {
            waiting_for_response: _autoHbState?.waiting_for_response || false,
            solving_in_progress:  _autoHbState?.solving_in_progress  || false,
            huntbot_back_at:      _autoHbState?.huntbot_back_at      || 0,
            huntbot_amount:       _autoHbState?.huntbot_amount        || 0,
            auto_cycle_active:    _autoHbState?.auto_cycle_active     || false,
            auto_upgrade_trait:   _autoHbState?.auto_upgrade_trait    || 'none',
            animal_essence:       _autoHbState?.animal_essence        || 0,
        },
        selfbot:       sbUser,
        selfbot_ready: sbReady,
        bot_tag:       _bot?.user?.tag || null,
        uptime:        _state ? Math.floor(Date.now() / 1000 - (_state.start_time || 0)) : 0,
        rate: { cpm, risk: riskLevel, safe: riskLevel === 'low' },
    };
}

// ==================== FILE BROWSER ====================
function safeResolvePath(basePath, userPath) {
    const base   = path.resolve(basePath);
    const target = path.resolve(basePath, userPath || '.');
    if (!target.startsWith(base) && !target.startsWith(path.resolve(process.cwd()))) return null;
    return target;
}

function getFilesInDir(dirPath) {
    try {
        const resolved = safeResolvePath(__dirname, dirPath);
        if (!resolved || !fs.existsSync(resolved)) return null;
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) return null;
        return fs.readdirSync(resolved)
            .map(name => {
                try {
                    const fullPath = path.join(resolved, name);
                    const s = fs.statSync(fullPath);
                    return { name, isDir: s.isDirectory(), size: s.isFile() ? s.size : 0, mtime: s.mtime ? new Date(s.mtime).toLocaleDateString('en-IN') : '' };
                } catch { return null; }
            })
            .filter(Boolean)
            .sort((a, b) => {
                if (a.isDir && !b.isDir) return -1;
                if (!a.isDir && b.isDir) return 1;
                return a.name.localeCompare(b.name);
            });
    } catch { return null; }
}

// ==================== ACCOUNTS LIST (from owoconfig.json) ====================
async function getAccountsList() {
    try {
        // Use the bound readBotconfig (which now points to owoconfig)
        const cfg    = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
        const tokens = cfg.tokens || [];
        const activeToken = tokens.find(t => t.isActive)?.token || cfg.activeUserToken || null;
        const accounts = [];

        for (const t of tokens) {
            if (!t.token) continue;
            let info = null;

            // Check cache
            if (_accInfoCache) {
                info = typeof _accInfoCache.get === 'function'
                    ? _accInfoCache.get(t.token)
                    : _accInfoCache[t.token];
            }
            // Fetch if not cached
            if (!info && _fetchAccountInfo) {
                try {
                    info = await _fetchAccountInfo(t.token);
                    if (info && _accInfoCache) {
                        if (typeof _accInfoCache.set === 'function') _accInfoCache.set(t.token, info);
                        else _accInfoCache[t.token] = info;
                    }
                } catch (e) {
                    captureLog('warn', `fetchAccountInfo failed: ${e.message}`);
                }
            }

            const isActive = t.token === activeToken || t.isActive === true;
            let avatarUrl  = info?.avatar_url || info?.avatarURL || null;
            if (!avatarUrl && info?.avatar && info?.id) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png?size=128`;
            }
            if (!avatarUrl && info?.id) {
                const index = ((BigInt(info.id) >> 22n) % 6n).toString();
                avatarUrl   = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
            }

            accounts.push({
                id:           info?.id || 'unknown',
                tag:          info?.tag || info?.username || info?.global_name || t.label || 'Unknown',
                avatar:       avatarUrl,
                isActive,
                tokenPreview: t.token.slice(0, 12) + '...',
                tokenPrefix:  t.token.slice(0, 20),
                cowoncy:      info?.cowoncy || 0,
                level:        info?.level || 0,
            });
        }
        return accounts;
    } catch (e) {
        captureLog('err', `getAccountsList error: ${e.message}`);
        return [];
    }
}

// ==================== MAIN DASHBOARD STARTER ====================
function startDashboard(refs) {
    _state            = refs.state;
    _config           = refs.config;
    _autoHbState      = refs.autoHbState;
    _getSelfbot       = refs.getSelfbot;
    _bot              = refs.bot;
    _startGrinding    = refs.startGrinding;
    _saveConfig       = refs.saveConfig;
    _updatePanel      = refs.updatePanel;
    _switchToAccount  = refs.switchToAccount;
    _readBotconfig    = refs.readBotconfig;       // owo3.js se aata hai — now reads owoconfig
    _fetchAccountInfo = refs.fetchAccountInfo;
    _accInfoCache     = refs.accInfoCache || refs._accInfoCache;
    _rebootSelfbot    = refs.rebootSelfbot || null;
    _sendAutoHb       = refs.sendAutoHb || null;
    _saveCurrentAccountHbState = refs.saveCurrentAccountHbState || null;
    _loadHbConfig     = refs.loadHbConfig || null;
    _saveHbConfig     = refs.saveHbConfig || null;
    _getHbConfigFile  = refs.OWO_HB_CONFIG_FILE || null;

    const app    = express();
    const server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });

    app.use(express.json());

    // ── Serve static files — ROOT dir (index.html, app.js, styles.css) ──
    // dashboard.js is in owocore/, so ROOT = parent dir
    const ROOT_DIR = path.join(__dirname, '..');
    const OWOCORE_DIR = __dirname;

    // Try both root and owocore for static
    app.use(express.static(ROOT_DIR));
    app.use(express.static(OWOCORE_DIR));

    // ── OWO custom avatar ──
    app.get('/owo-avatar.png', (req, res) => {
        const paths = [
            path.join(ROOT_DIR, 'owo-avatar.png'),
            path.join(OWOCORE_DIR, 'owo-avatar.png'),
        ];
        const found = paths.find(p => fs.existsSync(p));
        if (found) res.sendFile(found);
        else res.redirect('https://cdn.discordapp.com/avatars/408785106942164992/2f5c1afceaab7dfe36e45c9d0a1b1fab.png?size=64');
    });

    // ── Main page ──
    app.get('/', (req, res) => {
        const htmlPaths = [
            path.join(ROOT_DIR, 'index.html'),
            path.join(OWOCORE_DIR, 'index.html'),
        ];
        const found = htmlPaths.find(p => fs.existsSync(p));
        if (found) res.sendFile(found);
        else res.status(404).send(`<h2 style="font-family:monospace;color:#dc2626">index.html not found!</h2><p>ROOT: ${ROOT_DIR}</p>`);
    });

    // ==================== REST API ====================

    app.get('/api/state',    (req, res) => res.json(getSnapshot()));
    app.get('/api/logs',     (req, res) => res.json(logs));
    app.get('/api/ratelimit',(req, res) => res.json({ cpm: getCPM(), risk: getRateLimitRisk() }));

    app.get('/api/accounts', async (req, res) => res.json(await getAccountsList()));

    app.get('/api/files', (req, res) => {
        const files = getFilesInDir(req.query.path || './owocore');
        if (files === null) return res.status(403).json({ error: 'Access denied or path not found' });
        res.json(files);
    });

    app.get('/api/files/read', (req, res) => {
        const userPath = req.query.path || '';
        if (!userPath) return res.status(400).json({ error: 'No path' });
        const resolved = safeResolvePath(__dirname, userPath);
        if (!resolved) return res.status(403).json({ error: 'Access denied' });
        try {
            if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'Not found' });
            const stat = fs.statSync(resolved);
            if (stat.isDirectory()) return res.status(400).json({ error: 'Is a directory' });
            const content = fs.readFileSync(resolved, 'utf8');
            res.json({ content: stat.size > 524288 ? content.slice(0, 524288) : content, size: stat.size });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/set_channel', (req, res) => {
        const { channel_id } = req.body || {};
        if (!channel_id || !/^\d{15,20}$/.test(channel_id)) return res.json({ ok: false, reason: 'Invalid channel ID' });
        if (!_config) return res.json({ ok: false, reason: 'Config not ready' });
        _config.channel_id = channel_id;
        if (_saveConfig) _saveConfig();
        captureLog('info', `📺 Channel set → ${channel_id}`);
        if (io) io.emit('update', getSnapshot());
        res.json({ ok: true });
    });

    app.post('/api/start', (req, res) => {
        if (_state && !_state.grinding_active && _startGrinding) {
            _state.grinding_active = true;
            _state.force_stop = false;
            _startGrinding();
            if (_updatePanel) _updatePanel();
            captureLog('ok', '▶ Grinding started via dashboard');
            res.json({ ok: true });
        } else {
            res.json({ ok: false, reason: 'Already running or not ready' });
        }
    });

    app.post('/api/stop', (req, res) => {
        if (_state) {
            _state.force_stop = true;
            _state.grinding_active = false;
            if (_updatePanel) _updatePanel();
            captureLog('warn', '⏹ Grinding stopped via dashboard');
            res.json({ ok: true });
        } else {
            res.json({ ok: false });
        }
    });

    app.post('/api/send_message', async (req, res) => {
        try {
            const { message, channel_id } = req.body || {};
            if (!message?.trim()) return res.json({ ok: false, error: 'Empty message' });
            const sb = _getSelfbot ? _getSelfbot() : null;
            if (!sb) return res.json({ ok: false, error: 'Selfbot not ready' });
            const chId = channel_id || _config?.channel_id;
            if (!chId) return res.json({ ok: false, error: 'No channel ID set' });
            const ch = sb.channels?.cache?.get(chId);
            if (!ch) return res.json({ ok: false, error: 'Channel not in selfbot cache' });
            await ch.send(message);
            captureLog('ok', `📤 Dashboard msg sent → "${message.slice(0, 60)}"`);
            res.json({ ok: true });
        } catch (e) {
            captureLog('err', `send_message failed: ${e.message}`);
            res.json({ ok: false, error: e.message });
        }
    });

    app.post('/api/toggle_protection', (req, res) => {
        const { name } = req.body;
        if (_config?.protections?.[name]) {
            _config.protections[name].active = !_config.protections[name].active;
            if (_saveConfig) _saveConfig();
            res.json({ ok: true, active: _config.protections[name].active });
        } else {
            res.status(400).json({ ok: false, error: 'Unknown protection: ' + name });
        }
    });

    app.post('/api/trigger_huntbot', async (req, res) => {
        captureLog('info', '🔫 Manual HB trigger via REST');
        if (_autoHbState) _autoHbState.last_hb_sent_at = 0;
        if (_sendAutoHb && _getSelfbot && _config?.channel_id) {
            try {
                const sb = _getSelfbot();
                const ch = sb?.channels?.cache?.get(_config.channel_id);
                if (ch) { await _sendAutoHb(ch); return res.json({ ok: true }); }
                return res.json({ ok: false, reason: 'Channel not found' });
            } catch (e) { return res.json({ ok: false, reason: e.message }); }
        }
        res.json({ ok: false, reason: 'sendAutoHb or selfbot not ready' });
    });

    app.get('/api/hbconfig', (req, res) => {
        try {
            if (_loadHbConfig) return res.json({ ok: true, data: _loadHbConfig() });
            const hbFile = path.join(OWOCORE_DIR, 'owohbconfig.json');
            if (fs.existsSync(hbFile)) return res.json({ ok: true, data: JSON.parse(fs.readFileSync(hbFile, 'utf8')) });
            res.json({ ok: true, data: {} });
        } catch (e) { res.json({ ok: false, error: e.message }); }
    });

    // ── GET tokens (masked) — reads owoconfig.json ──
    app.get('/api/tokens', (req, res) => {
        try {
            const cfg    = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
            const tokens = (cfg.tokens || []).map((t, i) => ({
                index:    i,
                label:    t.label || `Account ${i + 1}`,
                isActive: t.isActive || false,
                preview:  t.token ? t.token.slice(0, 20) + '...' + t.token.slice(-4) : 'INVALID',
                hasToken: !!(t.token && t.token.length > 10),
            }));
            res.json({ ok: true, tokens });
        } catch (e) { res.json({ ok: false, error: e.message }); }
    });

    // ── UPDATE/ADD token — saves to owoconfig.json ──
    app.post('/api/update_token', async (req, res) => {
        try {
            const { index, token, label } = req.body || {};
            const cfg = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
            if (!cfg.tokens) cfg.tokens = [];

            if (typeof index === 'number' && index >= 0 && index < cfg.tokens.length) {
                if (token && token.trim().length > 10) {
                    cfg.tokens[index].token = token.trim();
                    captureLog('ok', `✏️ Token updated at index ${index}`);
                }
                if (label) cfg.tokens[index].label = label.trim();
            } else if (token && token.trim().length > 10) {
                cfg.tokens.push({
                    token:    token.trim(),
                    label:    (label || `Account ${cfg.tokens.length + 1}`).trim(),
                    isActive: cfg.tokens.length === 0,
                });
                captureLog('ok', `➕ New token added`);
            } else {
                return res.json({ ok: false, error: 'Invalid token or index' });
            }

            // Save to owoconfig.json only
            writeOwoconfigDirect(cfg);
            captureLog('ok', `💾 owoconfig.json saved`);
            res.json({ ok: true });
        } catch (e) {
            captureLog('err', `update_token failed: ${e.message}`);
            res.json({ ok: false, error: e.message });
        }
    });

    // ── DELETE token — saves to owoconfig.json ──
    app.post('/api/delete_token', (req, res) => {
        try {
            const { index } = req.body || {};
            const cfg = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
            if (!cfg.tokens || typeof index !== 'number' || index < 0 || index >= cfg.tokens.length) {
                return res.json({ ok: false, error: 'Invalid index' });
            }
            const removed = cfg.tokens.splice(index, 1);
            captureLog('warn', `🗑️ Token removed: ${removed[0]?.label || index}`);
            writeOwoconfigDirect(cfg);
            res.json({ ok: true });
        } catch (e) { res.json({ ok: false, error: e.message }); }
    });

    // ── Account switch (REST) — saves to owoconfig.json ──
    app.post('/api/switch_account', async (req, res) => {
        try {
            const { tokenPrefix, tokenPreview } = req.body || {};
            const cfg    = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
            const tokens = cfg.tokens || [];
            let found    = null;
            if (tokenPrefix)  found = tokens.find(t => t.token?.startsWith(tokenPrefix));
            if (!found && tokenPreview) {
                const clean = tokenPreview.replace(/\.{3,}$/, '');
                found = tokens.find(t => t.token?.startsWith(clean));
            }
            if (!found) return res.json({ ok: false, error: 'Token not found' });

            const currentActive = tokens.find(t => t.isActive)?.token || cfg.activeUserToken;
            if (found.token === currentActive) return res.json({ ok: false, error: 'Already on this account' });

            const updatedCfg = { ...cfg, tokens: cfg.tokens.map(t => ({ ...t, isActive: t.token === found.token })) };
            writeOwoconfigDirect(updatedCfg);

            if (_accInfoCache && typeof _accInfoCache.clear === 'function') _accInfoCache.clear();

            let info = null;
            if (_fetchAccountInfo) info = await _fetchAccountInfo(found.token).catch(() => null);
            const tag = info?.tag || info?.username || info?.global_name || found.label || 'Account';

            if (_rebootSelfbot) {
                captureLog('info', `🔄 Hot-swapping selfbot → ${tag}`);
                _rebootSelfbot(found.token).catch(() => {});
            } else if (_switchToAccount) {
                await _switchToAccount(found.token);
            }

            io.emit('account_switched', { ok: true, tag });
            captureLog('ok', `✅ Switched → ${tag}`);
            setTimeout(async () => { io.emit('accounts_update', await getAccountsList()); }, 2000);
            res.json({ ok: true, tag });
        } catch (e) {
            captureLog('err', `REST switch_account failed: ${e.message}`);
            res.json({ ok: false, error: e.message });
        }
    });

    // ==================== SOCKET.IO ====================
    io.on('connection', (socket) => {
        // Send initial state
        socket.emit('init', { snapshot: getSnapshot(), logs });
        getAccountsList().then(accounts => socket.emit('accounts_update', accounts));

        socket.on('start', () => {
            if (_state && !_state.grinding_active && _startGrinding) {
                _state.grinding_active = true;
                _state.force_stop = false;
                _startGrinding();
                if (_updatePanel) _updatePanel();
                captureLog('ok', '▶ Grinding started via dashboard');
            }
        });

        socket.on('stop', () => {
            if (_state) {
                _state.force_stop = true;
                _state.grinding_active = false;
                if (_updatePanel) _updatePanel();
                captureLog('warn', '⏹ Grinding stopped via dashboard');
            }
        });

        socket.on('toggle_protection', (name) => {
            if (_config?.protections?.[name]) {
                _config.protections[name].active = !_config.protections[name].active;
                if (_saveConfig) _saveConfig();
                io.emit('update', getSnapshot());
            }
        });

        socket.on('toggle_config', (type) => {
            if (!_config) return;
            if (type === 'sleep')  _config.sleep_enabled        = !_config.sleep_enabled;
            if (type === 'single') _config.single_mode          = !_config.single_mode;
            if (type === 'hb')     _config.auto_huntbot_enabled = !_config.auto_huntbot_enabled;
            if (_saveConfig) _saveConfig();
            io.emit('update', getSnapshot());
        });

        // ── Account switch via socket — saves to owoconfig.json ──
        socket.on('switch_account', async (data) => {
            try {
                const cfg    = _readBotconfig ? _readBotconfig() : readOwoconfigDirect();
                const tokens = cfg.tokens || [];
                let found    = null;
                if (data.tokenPrefix)  found = tokens.find(t => t.token?.startsWith(data.tokenPrefix));
                if (!found && data.tokenPreview) {
                    const clean = data.tokenPreview.replace(/\.{3,}$/, '');
                    found = tokens.find(t => t.token?.startsWith(clean));
                }
                if (!found) {
                    socket.emit('account_switched', { ok: false, error: 'Token not found in owoconfig' });
                    captureLog('err', `Account switch: token not found (preview: ${data.tokenPreview})`);
                    return;
                }

                const currentActiveToken = tokens.find(t => t.isActive)?.token || cfg.activeUserToken;
                if (found.token === currentActiveToken) {
                    socket.emit('account_switched', { ok: false, error: 'Already on this account' });
                    return;
                }

                captureLog('info', `🔄 Switching → ${data.tokenPreview}`);
                const updatedCfg = { ...cfg, tokens: cfg.tokens.map(t => ({ ...t, isActive: t.token === found.token })) };
                writeOwoconfigDirect(updatedCfg);

                if (_accInfoCache && typeof _accInfoCache.clear === 'function') _accInfoCache.clear();

                let info = null;
                if (_fetchAccountInfo) info = await _fetchAccountInfo(found.token).catch(() => null);
                const tag = info?.tag || info?.username || info?.global_name || found.label || 'Account';

                if (_rebootSelfbot) {
                    captureLog('info', `🔄 Hot-swapping selfbot → ${tag}`);
                    await _rebootSelfbot(found.token);
                } else if (_switchToAccount) {
                    await _switchToAccount(found.token);
                } else {
                    socket.emit('account_switched', { ok: false, error: 'Switch function not available' });
                    return;
                }

                io.emit('account_switched', { ok: true, tag });
                captureLog('ok', `✅ Switched account → ${tag}`);
                setTimeout(async () => { io.emit('accounts_update', await getAccountsList()); }, 2000);
            } catch (e) {
                socket.emit('account_switched', { ok: false, error: e.message });
                captureLog('err', `Account switch failed: ${e.message}`);
            }
        });

        // ── Manual HB trigger ──
        socket.on('trigger_huntbot', async () => {
            captureLog('info', '🔫 Manual HB trigger from dashboard');
            if (_autoHbState) _autoHbState.last_hb_sent_at = 0;
            if (_sendAutoHb && _getSelfbot) {
                try {
                    const sb      = _getSelfbot();
                    const chId    = _config?.channel_id;
                    if (sb && chId) {
                        const ch = sb.channels?.cache?.get(chId);
                        if (ch) {
                            captureLog('hb', '🔫 Sending owo hb from dashboard...');
                            await _sendAutoHb(ch);
                        } else {
                            captureLog('warn', 'HB trigger: channel not in selfbot cache');
                        }
                    } else {
                        captureLog('warn', 'HB trigger: selfbot or channel_id not ready');
                    }
                } catch (e) {
                    captureLog('err', `HB trigger error: ${e.message}`);
                }
            }
        });
    });

    // ── Real-time push every 2s ──
    setInterval(() => { if (io) io.emit('update', getSnapshot()); }, 2000);

    server.listen(PORT, '0.0.0.0', () => {
        // ── Beautiful startup banner ──
        const _R  = '\x1b[0m', _B  = '\x1b[1m', _DM = '\x1b[2m';
        const _GR = '\x1b[38;5;82m', _CY = '\x1b[38;5;51m';
        const _MG = '\x1b[38;5;201m', _WH = '\x1b[97m';
        const _YL = '\x1b[38;5;226m';
        const W = 52;
        const line = (txt, col) => {
            const vis = txt.replace(/\x1b\[[\d;]*m/g, '');
            const pad = W - vis.length;
            const lp  = Math.floor(pad / 2);
            const rp  = pad - lp;
            console.log(`  ${_MG}${_B}║${_R}${' '.repeat(lp)}${col || _WH}${txt}${_R}${' '.repeat(rp)}${_MG}${_B}║${_R}`);
        };
        console.log('');
        console.log(`  ${_MG}${_B}╔${'═'.repeat(W)}╗${_R}`);
        line(`${_YL}${_B}⚡  OWO DASHBOARD  ·  ONLINE`, _WH);
        line(`${_DM}  http://localhost:${PORT}`, _CY);
        console.log(`  ${_MG}${_B}╚${'═'.repeat(W)}╝${_R}`);
        console.log('');
        console.log(`  ${_GR}${_B}  ✔  ${_R}${_WH}Serving from: ${_DM}${ROOT_DIR}${_R}`);
        console.log(`  ${_GR}${_B}  ✔  ${_R}${_WH}Config:       ${_DM}owoconfig.json${_R}`);
        console.log('');
    });

    return { app, server, io };
}

// ==================== DISCORD MESSAGE EMIT ====================
function emitDiscordMessage(msgData) {
    if (!io) return;

    let embeds = msgData.embeds || [];
    if (msgData.rawMessage?.embeds?.length > 0) {
        embeds = msgData.rawMessage.embeds.map(emb => ({
            color:       emb.color ? '#' + emb.color.toString(16).padStart(6, '0') : '#5865f2',
            title:       emb.title || '',
            description: emb.description || '',
            fields:      (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: f.inline })),
            footer:      emb.footer?.text || '',
            thumbnail:   emb.thumbnail?.url || emb.thumbnail?.proxyURL || '',
            image:       emb.image?.url || emb.image?.proxyURL || '',
        }));
    } else if (Array.isArray(embeds) && embeds.length > 0) {
        embeds = embeds.map(emb => ({
            color:       emb.color ? (typeof emb.color === 'number' ? '#' + emb.color.toString(16).padStart(6, '0') : emb.color) : '#5865f2',
            title:       emb.title || '',
            description: emb.description || '',
            fields:      (emb.fields || []).map(f => ({ name: f.name || '', value: f.value || '', inline: !!f.inline })),
            footer:      typeof emb.footer === 'string' ? emb.footer : (emb.footer?.text || ''),
            thumbnail:   typeof emb.thumbnail === 'string' ? emb.thumbnail : (emb.thumbnail?.url || ''),
            image:       typeof emb.image === 'string' ? emb.image : (emb.image?.url || ''),
        }));
    }

    // HB auto-embed
    const content = msgData.content || '';
    if (msgData.isOwo && embeds.length === 0) {
        if (/huntbot|dispatched|sent.*hunt|🤖/i.test(content)) {
            const amtMatch = content.match(/([0-9,]+)\s*cowoncy/i) || content.match(/dispatched.*?([0-9,]+)/i);
            const amt = amtMatch ? parseInt(amtMatch[1].replace(/,/g, '')) : 0;
            embeds = [{
                color: '#f59e0b', title: '🤖 Huntbot Dispatched!',
                description: amt > 0 ? `**Amount:** ${amt.toLocaleString()} cowoncy` : 'Huntbot has been dispatched!',
                fields: [], footer: 'Returns in ~15 minutes', thumbnail: '', image: '',
            }];
        } else if (/already|not\s+ready|wait|cooldown/i.test(content)) {
            embeds = [{
                color: '#ed4245', title: '⏳ Huntbot Not Ready',
                description: content.slice(0, 200), fields: [], footer: '', thumbnail: '', image: '',
            }];
        }
    }

    io.emit('discord_message', { ...msgData, embeds });
}

function getIo() { return io; }

module.exports = { startDashboard, captureLog, emitDiscordMessage, getIo };

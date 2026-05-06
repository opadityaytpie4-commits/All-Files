// ==================== OWO DASHBOARD SERVER ====================
// File location: owocore/dashboard.js
// Required by: owonew17.js (line: require('./owocore/dashboard'))
// Serves: index.html, app.js, styles.css from ROOT folder
// Socket.IO: Real-time sync with owonew17.js state

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const PORT = 8080;
const MAX_LOGS = 600;

// ==================== SHARED REFS (owonew17.js se aayenge) ====================
let _state = null;
let _config = null;
let _autoHbState = null;
let _getSelfbot = null;
let _bot = null;
let _startGrinding = null;
let _saveConfig = null;
let _updatePanel = null;
let _switchToAccount = null;
let _readBotconfig = null;
let _fetchAccountInfo = null;
let _accInfoCache = null;
let _rebootSelfbot = null;
let _sendAutoHb = null;
// HB per-account config refs
let _saveCurrentAccountHbState = null;
let _loadHbConfig = null;
let _saveHbConfig = null;
let _getHbConfigFile = null;
// ── Auto Gem refs ──
let _autoGemState = null;
let _getGemSnapshot = null;
let _GEM_DATA = null;
let _autoUseGem = null;
let _setAutoGemEnabled = null;
let _setAutoGemType = null;
let _setAutoGemRarity = null;
let _setAutoGemCheckInv = null;
let _saveCurrentAccountHbState = null;
let _loadHbConfig = null;
let _saveHbConfig = null;
let _getHbConfigFile = null;

const logs = [];
let io = null;

// ==================== COOLDOWN TRACKER ====================
const _cmdTimestamps = [];
const RATE_WINDOW_MS = 60000;
const SAFE_MAX_CPM = 4.0;
const WARN_MAX_CPM = 5.5;

function recordCommand() {
    const now = Date.now();
    _cmdTimestamps.push(now);
    while (_cmdTimestamps.length > 0 && now - _cmdTimestamps[0] > RATE_WINDOW_MS * 2) {
        _cmdTimestamps.shift();
    }
}

function getCPM() {
    const now = Date.now();
    const recent = _cmdTimestamps.filter(t => now - t < RATE_WINDOW_MS);
    return recent.length;
}

function getRateLimitRisk() {
    const cpm = getCPM();
    if (cpm > WARN_MAX_CPM) return 'high';
    if (cpm > SAFE_MAX_CPM) return 'medium';
    return 'low';
}

// ==================== LOG CAPTURE ====================
function captureLog(type, msg) {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
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
        if (typeof sbUser.displayAvatarURL === 'function') {
            return sbUser.displayAvatarURL({ format: 'png', size: 128 });
        }
        if (typeof sbUser.avatarURL === 'function') {
            return sbUser.avatarURL({ format: 'png', size: 128 });
        }
        if (sbUser.avatar && sbUser.id) {
            return `https://cdn.discordapp.com/avatars/${sbUser.id}/${sbUser.avatar}.png?size=128`;
        }
        const discriminator = sbUser.discriminator || '0';
        const index = discriminator === '0'
            ? (BigInt(sbUser.id) >> 22n) % 6n
            : parseInt(discriminator) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    } catch {
        return null;
    }
}

// ==================== SNAPSHOT (owonew17 state ka real-time dump) ====================
function getSnapshot() {
    const sb = _getSelfbot ? _getSelfbot() : null;
    const sbReady = (sb && (sb.isReady ? sb.isReady() : false)) || (sb && sb.user != null);
    const sbUser = (sbReady || (sb && sb.user)) && sb.user ? {
        tag: sb.user.tag || sb.user.username || 'Unknown',
        id: sb.user.id,
        avatar: getSelfbotAvatarUrl(sb.user)
    } : null;

    const cpm = getCPM();
    const riskLevel = getRateLimitRisk();

    return {
        state: {
            grinding_active: _state?.grinding_active || false,
            captcha_detected: _state?.captcha_detected || false,
            is_sleeping: _state?.is_sleeping || false,
            sleep_end_time: _state?.sleep_end_time || 0,
            session_cmd_count: _state?.session_cmd_count || 0,
            session_hunt: _state?.session_hunt || 0,
            session_battle: _state?.session_battle || 0,
            session_pray: _state?.session_pray || 0,
            session_owo: _state?.session_owo || 0,
            sleep_count: _state?.sleep_count || 0,
            start_time: _state?.start_time || Math.floor(Date.now() / 1000),
            session_start: _state?.session_start || Math.floor(Date.now() / 1000),
        },
        config: {
            channel_id: _config?.channel_id || null,
            sleep_enabled: _config?.sleep_enabled || false,
            auto_huntbot_enabled: _config?.auto_huntbot_enabled || false,
            single_mode: _config?.single_mode || false,
            auto_upgrade_trait: _config?.auto_upgrade_trait || 'none',
            protections: _config?.protections || {},
            commands: _config?.commands || {},
            stats: _config?.stats || {},
        },
        hb: {
            waiting_for_response: _autoHbState?.waiting_for_response || false,
            solving_in_progress: _autoHbState?.solving_in_progress || false,
            huntbot_back_at: _autoHbState?.huntbot_back_at || 0,
            huntbot_amount: _autoHbState?.huntbot_amount || 0,
            auto_cycle_active: _autoHbState?.auto_cycle_active || false,
            auto_upgrade_trait: _autoHbState?.auto_upgrade_trait || 'none',
            animal_essence: _autoHbState?.animal_essence || 0,
        },
        selfbot: sbUser,
        selfbot_ready: sbReady,
        bot_tag: _bot?.user?.tag || null,
        uptime: _state ? Math.floor(Date.now() / 1000 - (_state.start_time || 0)) : 0,
        rate: {
            cpm,
            risk: riskLevel,
            safe: riskLevel === 'low',
        },
        gem: _getGemSnapshot ? _getGemSnapshot() : { enabled: false },
    };
}

// ==================== FILE BROWSER ====================
function safeResolvePath(basePath, userPath) {
    const base = path.resolve(__dirname);
    const target = path.resolve(__dirname, userPath || '.');
    if (!target.startsWith(base) && !target.startsWith(path.resolve(process.cwd()))) {
        return null;
    }
    return target;
}

function getFilesInDir(dirPath) {
    try {
        const resolved = safeResolvePath(__dirname, dirPath);
        if (!resolved || !fs.existsSync(resolved)) return null;
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) return null;
        const entries = fs.readdirSync(resolved);
        const files = entries.map(name => {
            try {
                const fullPath = path.join(resolved, name);
                const s = fs.statSync(fullPath);
                return {
                    name,
                    isDir: s.isDirectory(),
                    size: s.isFile() ? s.size : 0,
                    mtime: s.mtime ? new Date(s.mtime).toLocaleDateString('en-IN') : '',
                };
            } catch { return null; }
        }).filter(Boolean);
        files.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
        return files;
    } catch { return null; }
}

// ==================== ACCOUNTS LIST ====================
async function getAccountsList() {
    try {
        const cfg = _readBotconfig ? _readBotconfig() : {};
        const tokens = cfg.tokens || [];
        const activeToken = tokens.find(t => t.isActive)?.token || cfg.activeUserToken || null;
        const accounts = [];

        for (const t of tokens) {
            if (!t.token) continue;
            let info = null;
            if (_accInfoCache) {
                info = typeof _accInfoCache.get === 'function'
                    ? _accInfoCache.get(t.token)
                    : _accInfoCache[t.token];
            }
            if (!info && _fetchAccountInfo) {
                try {
                    info = await _fetchAccountInfo(t.token);
                    if (info && _accInfoCache) {
                        if (typeof _accInfoCache.set === 'function') {
                            _accInfoCache.set(t.token, info);
                        } else {
                            _accInfoCache[t.token] = info;
                        }
                    }
                } catch (e) {
                    captureLog('warn', `fetchAccountInfo failed: ${e.message}`);
                }
            }

            const isActive = t.token === activeToken || t.isActive === true;
            let avatarUrl = info?.avatar_url || info?.avatarURL || null;
            if (!avatarUrl && info?.avatar && info?.id) {
                avatarUrl = `https://cdn.discordapp.com/avatars/${info.id}/${info.avatar}.png?size=128`;
            }
            if (!avatarUrl && info?.id) {
                const index = ((BigInt(info.id) >> 22n) % 6n).toString();
                avatarUrl = `https://cdn.discordapp.com/embed/avatars/${index}.png`;
            }

            accounts.push({
                id: info?.id || 'unknown',
                tag: info?.tag || info?.username || info?.global_name || t.label || 'Unknown',
                avatar: avatarUrl,
                isActive,
                tokenPreview: t.token.slice(0, 12) + '...',
                tokenPrefix: t.token.slice(0, 20),
                cowoncy: info?.cowoncy || 0,
                level: info?.level || 0,
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
    // owonew17.js ke sare refs bind karo
    _state            = refs.state;
    _config           = refs.config;
    _autoHbState      = refs.autoHbState;
    _getSelfbot       = refs.getSelfbot;
    _bot              = refs.bot;
    _startGrinding    = refs.startGrinding;
    _saveConfig       = refs.saveConfig;
    _updatePanel      = refs.updatePanel;
    _switchToAccount  = refs.switchToAccount;
    _readBotconfig    = refs.readBotconfig;
    _fetchAccountInfo = refs.fetchAccountInfo;
    _accInfoCache     = refs.accInfoCache || refs._accInfoCache;
    _rebootSelfbot    = refs.rebootSelfbot || null;
    _sendAutoHb       = refs.sendAutoHb || null;
    // HB per-account
    _saveCurrentAccountHbState = refs.saveCurrentAccountHbState || null;
    _loadHbConfig = refs.loadHbConfig || null;
    _saveHbConfig = refs.saveHbConfig || null;
    _getHbConfigFile = refs.OWO_HB_CONFIG_FILE || null;
    // ── Auto Gem ──
    _autoGemState        = refs.autoGemState || null;
    _getGemSnapshot      = refs.getGemSnapshot || null;
    _GEM_DATA            = refs.GEM_DATA || null;
    _autoUseGem          = refs.autoUseGem || null;
    _setAutoGemEnabled   = refs.setAutoGemEnabled || null;
    _setAutoGemType      = refs.setAutoGemType || null;
    _setAutoGemRarity    = refs.setAutoGemRarity || null;
    _setAutoGemCheckInv  = refs.setAutoGemCheckInv || null;

    const app = express();
    const server = http.createServer(app);
    io = new Server(server, { cors: { origin: '*' } });

    app.use(express.json());

    // ── ROOT FOLDER se static files serve karo ──
    // index.html, app.js, styles.css sab root mein hain (owonew17.js ke saath)
    const ROOT_DIR = path.join(__dirname); // sab files owocore/ ke andar hain
    app.use(express.static(ROOT_DIR));

    // ── OWO custom avatar serve karo (owocore/ folder mein rahega) ──
    app.get('/owo-avatar.png', (req, res) => {
        // Priority: owocore/owo-avatar.png → root/owo-avatar.png → GitHub raw URL
        const paths = [
            path.join(__dirname, 'owo-avatar.png'),           // owocore/owo-avatar.png (primary)
            path.join(__dirname, '..', 'owo-avatar.png'),     // root fallback
        ];
        const found = paths.find(p => fs.existsSync(p));
        if (found) {
            res.sendFile(found);
        } else {
            // Always-fresh GitHub raw URL — no local file needed
            res.redirect('https://raw.githubusercontent.com/opadityaytpie4-commits/All-Files/7fe5d4e4aea4b824c2a1f3d354cc8dff1ebf8df9/owo-avatar.png');
        }
    });

    // ── Main dashboard page (index.html from ROOT) ──
    app.get('/', (req, res) => {
        const htmlPath = path.join(ROOT_DIR, 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.sendFile(htmlPath);
        } else {
            res.status(404).send(`
                <h2 style="font-family:monospace;color:#dc2626">index.html not found!</h2>
                <p>Make sure index.html is in the ROOT folder (same level as owonew17.js)</p>
                <p>Current ROOT: ${ROOT_DIR}</p>
            `);
        }
    });

    // ==================== REST API ====================

    // ── State snapshot ──
    app.get('/api/state', (req, res) => res.json(getSnapshot()));

    // ── Logs ──
    app.get('/api/logs', (req, res) => res.json(logs));

    // ── Accounts list ──
    app.get('/api/accounts', async (req, res) => {
        const accounts = await getAccountsList();
        res.json(accounts);
    });

    // ── File browser ──
    app.get('/api/files', (req, res) => {
        const userPath = req.query.path || './owocore';
        const files = getFilesInDir(userPath);
        if (files === null) return res.status(403).json({ error: 'Access denied or path not found' });
        res.json(files);
    });

    // ── File read ──
    app.get('/api/files/read', (req, res) => {
        const userPath = req.query.path || '';
        if (!userPath) return res.status(400).json({ error: 'No path' });
        const resolved = safeResolvePath(__dirname, userPath);
        if (!resolved) return res.status(403).json({ error: 'Access denied' });
        try {
            if (!fs.existsSync(resolved)) return res.status(404).json({ error: 'Not found' });
            const stat = fs.statSync(resolved);
            if (stat.isDirectory()) return res.status(400).json({ error: 'Is a directory' });
            if (stat.size > 524288) {
                return res.json({ content: '[File too large]\n\n' + fs.readFileSync(resolved, 'utf8').slice(0, 524288) });
            }
            res.json({ content: fs.readFileSync(resolved, 'utf8'), size: stat.size });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ── Rate limit status ──
    app.get('/api/ratelimit', (req, res) => {
        res.json({ cpm: getCPM(), risk: getRateLimitRisk(), timestamps: _cmdTimestamps.slice(-30) });
    });

    // ── Set Channel ──
    app.post('/api/set_channel', (req, res) => {
        const { channel_id } = req.body || {};
        if (!channel_id || !/^\d{15,20}$/.test(channel_id)) {
            return res.json({ ok: false, reason: 'Invalid channel ID' });
        }
        if (!_config) return res.json({ ok: false, reason: 'Config not ready' });
        _config.channel_id = channel_id;
        if (_saveConfig) _saveConfig();
        captureLog('info', `📺 Channel set → ${channel_id}`);
        if (io) io.emit('update', getSnapshot());
        res.json({ ok: true });
    });

    // ── Trigger Huntbot ──
    app.post('/api/trigger_huntbot', async (req, res) => {
        captureLog('info', '🔫 Manual HB trigger via REST');
        if (_autoHbState) _autoHbState.last_hb_sent_at = 0;
        if (_sendAutoHb && _getSelfbot && _config?.channel_id) {
            try {
                const sb = _getSelfbot();
                const ch = sb?.channels?.cache?.get(_config.channel_id);
                if (ch) {
                    await _sendAutoHb(ch);
                    return res.json({ ok: true });
                }
                return res.json({ ok: false, reason: 'Channel not found in selfbot cache' });
            } catch (e) {
                return res.json({ ok: false, reason: e.message });
            }
        }
        res.json({ ok: false, reason: 'sendAutoHb or selfbot not ready' });
    });

    // ── Start Grinding ──
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

    // ── Stop Grinding ──
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

    // ── Send message to Discord via selfbot ──
    app.post('/api/send_message', async (req, res) => {
        try {
            const { message, channel_id } = req.body || {};
            if (!message || !message.trim()) {
                return res.json({ ok: false, error: 'Empty message' });
            }
            const sb = _getSelfbot ? _getSelfbot() : null;
            if (!sb) return res.json({ ok: false, error: 'Selfbot not ready' });

            const chId = channel_id || _config?.channel_id;
            if (!chId) return res.json({ ok: false, error: 'No channel ID set' });

            const ch = sb.channels?.cache?.get(chId);
            if (!ch) return res.json({ ok: false, error: 'Channel not found in selfbot cache' });

            await ch.send(message);
            captureLog('ok', `📤 Dashboard message sent → "${message.slice(0, 60)}"`);
            res.json({ ok: true });
        } catch (e) {
            captureLog('err', `send_message failed: ${e.message}`);
            res.json({ ok: false, error: e.message });
        }
    });

    // ── Toggle protection ──
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

    // ── GET owohbconfig.json (all accounts HB state) ──
    app.get('/api/hbconfig', (req, res) => {
        try {
            if (_loadHbConfig) {
                res.json({ ok: true, data: _loadHbConfig() });
            } else {
                // Direct file read fallback
                const hbFile = path.join(__dirname, 'owohbconfig.json');
                if (fs.existsSync(hbFile)) {
                    res.json({ ok: true, data: JSON.parse(fs.readFileSync(hbFile, 'utf8')) });
                } else {
                    res.json({ ok: true, data: {} });
                }
            }
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    // ── GET all tokens (masked) for token editor ──
    app.get('/api/tokens', (req, res) => {
        try {
            if (!_readBotconfig) return res.json({ ok: false, error: 'Not available' });
            const cfg = _readBotconfig();
            const tokens = (cfg.tokens || []).map((t, i) => ({
                index: i,
                label: t.label || `Account ${i + 1}`,
                isActive: t.isActive || false,
                // Show first 20 chars + masked rest
                preview: t.token ? t.token.slice(0, 20) + '...' + t.token.slice(-4) : 'INVALID',
                hasToken: !!(t.token && t.token.length > 10),
            }));
            res.json({ ok: true, tokens });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    // ── UPDATE/ADD token (browser se token edit karo) ──
    app.post('/api/update_token', async (req, res) => {
        try {
            const { index, token, label } = req.body || {};
            if (!_readBotconfig) return res.json({ ok: false, error: 'readBotconfig not available' });
            const cfg = _readBotconfig();
            if (!cfg.tokens) cfg.tokens = [];

            if (typeof index === 'number' && index >= 0 && index < cfg.tokens.length) {
                // Update existing token
                if (token && token.trim().length > 10) {
                    cfg.tokens[index].token = token.trim();
                    captureLog('ok', `✏️ Token updated at index ${index}`);
                }
                if (label) cfg.tokens[index].label = label.trim();
            } else if (token && token.trim().length > 10) {
                // Add new token
                cfg.tokens.push({
                    token: token.trim(),
                    label: (label || `Account ${cfg.tokens.length + 1}`).trim(),
                    isActive: cfg.tokens.length === 0, // first account auto-active
                });
                captureLog('ok', `➕ New token added`);
            } else {
                return res.json({ ok: false, error: 'Invalid token or index' });
            }

            // Save botconfig file
            const botconfigPaths = [
                path.join(__dirname, '..', 'owocore', 'botconfig.json'),
                path.join(__dirname, 'botconfig.json'),
                path.join(process.cwd(), 'owocore', 'botconfig.json'),
                path.join(process.cwd(), 'botconfig.json'),
            ];
            const botconfigFile = botconfigPaths.find(p => fs.existsSync(p))
                || path.join(__dirname, 'botconfig.json');
            fs.writeFileSync(botconfigFile, JSON.stringify(cfg, null, 2));
            captureLog('ok', `💾 botconfig saved → ${botconfigFile}`);
            res.json({ ok: true });
        } catch (e) {
            captureLog('err', `update_token failed: ${e.message}`);
            res.json({ ok: false, error: e.message });
        }
    });

    // ── DELETE token ──
    app.post('/api/delete_token', (req, res) => {
        try {
            const { index } = req.body || {};
            if (!_readBotconfig) return res.json({ ok: false, error: 'Not available' });
            const cfg = _readBotconfig();
            if (!cfg.tokens || typeof index !== 'number' || index < 0 || index >= cfg.tokens.length) {
                return res.json({ ok: false, error: 'Invalid index' });
            }
            const removed = cfg.tokens.splice(index, 1);
            captureLog('warn', `🗑️ Token removed: ${removed[0]?.label || index}`);
            const botconfigPaths = [
                path.join(__dirname, '..', 'owocore', 'botconfig.json'),
                path.join(__dirname, 'botconfig.json'),
            ];
            const botconfigFile = botconfigPaths.find(p => fs.existsSync(p)) || botconfigPaths[0];
            fs.writeFileSync(botconfigFile, JSON.stringify(cfg, null, 2));
            res.json({ ok: true });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    // ── Account switch (REST) ──
    app.post('/api/switch_account', async (req, res) => {
        try {
            const { tokenPrefix, tokenPreview } = req.body || {};
            if (!_readBotconfig) return res.json({ ok: false, error: 'readBotconfig not available' });
            const cfg = _readBotconfig();
            const tokens = cfg.tokens || [];
            let found = null;
            if (tokenPrefix) found = tokens.find(t => t.token && t.token.startsWith(tokenPrefix));
            if (!found && tokenPreview) {
                const clean = tokenPreview.replace(/\.{3,}$/, '');
                found = tokens.find(t => t.token && t.token.startsWith(clean));
            }
            if (!found) return res.json({ ok: false, error: 'Token not found' });

            const currentActive = tokens.find(t => t.isActive)?.token || cfg.activeUserToken;
            if (found.token === currentActive) return res.json({ ok: false, error: 'Already on this account' });

            const possiblePaths = [
                path.join(__dirname, '..', 'botconfig.json'),
                path.join(__dirname, 'botconfig.json'),
            ];
            const cfgPath = possiblePaths.find(p => fs.existsSync(p));
            if (cfgPath) {
                const updatedCfg = { ...cfg, tokens: cfg.tokens.map(t => ({ ...t, isActive: t.token === found.token })) };
                fs.writeFileSync(cfgPath, JSON.stringify(updatedCfg, null, 4));
            }
            if (_accInfoCache && typeof _accInfoCache.clear === 'function') _accInfoCache.clear();

            let info = null;
            if (_fetchAccountInfo) info = await _fetchAccountInfo(found.token).catch(() => null);
            const tag = info?.tag || info?.username || info?.global_name || 'Account';

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
        // New client connected — initial state bhejo
        socket.emit('init', { snapshot: getSnapshot(), logs });

        // Accounts list bhi bhejo
        getAccountsList().then(accounts => socket.emit('accounts_update', accounts));

        // ── Start/Stop ──
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

        // ── Protections toggle ──
        socket.on('toggle_protection', (name) => {
            if (_config?.protections?.[name]) {
                _config.protections[name].active = !_config.protections[name].active;
                if (_saveConfig) _saveConfig();
                io.emit('update', getSnapshot());
            }
        });

        // ── Config toggle (sleep/single/hb) ──
        socket.on('toggle_config', (type) => {
            if (!_config) return;
            if (type === 'sleep')  _config.sleep_enabled = !_config.sleep_enabled;
            if (type === 'single') _config.single_mode = !_config.single_mode;
            if (type === 'hb')     _config.auto_huntbot_enabled = !_config.auto_huntbot_enabled;
            if (_saveConfig) _saveConfig();
            io.emit('update', getSnapshot());
        });

        // ── Account switch via socket ──
        socket.on('switch_account', async (data) => {
            try {
                if (!_readBotconfig) {
                    socket.emit('account_switched', { ok: false, error: 'readBotconfig not available' });
                    return;
                }
                const cfg = _readBotconfig();
                const tokens = cfg.tokens || [];
                let found = null;
                if (data.tokenPrefix) found = tokens.find(t => t.token && t.token.startsWith(data.tokenPrefix));
                if (!found && data.tokenPreview) {
                    const cleanPreview = data.tokenPreview.replace(/\.{3,}$/, '');
                    found = tokens.find(t => t.token && t.token.startsWith(cleanPreview));
                }
                if (!found) {
                    socket.emit('account_switched', { ok: false, error: 'Token not found in config' });
                    captureLog('err', `Account switch: token not found (preview: ${data.tokenPreview})`);
                    return;
                }
                const currentActiveToken = tokens.find(t => t.isActive)?.token || cfg.activeUserToken;
                if (found.token === currentActiveToken) {
                    socket.emit('account_switched', { ok: false, error: 'Already on this account' });
                    return;
                }

                captureLog('info', `🔄 Switching to → ${data.tokenPreview}`);
                const updatedCfg = { ...cfg };
                updatedCfg.tokens = (cfg.tokens || []).map(t => ({
                    ...t,
                    isActive: t.token === found.token
                }));

                const possiblePaths = [
                    path.join(__dirname, '..', 'botconfig.json'),
                    path.join(__dirname, 'botconfig.json'),
                ];
                const cfgPath = possiblePaths.find(p => fs.existsSync(p));
                if (cfgPath) fs.writeFileSync(cfgPath, JSON.stringify(updatedCfg, null, 4));
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
                setTimeout(async () => {
                    const updatedAccounts = await getAccountsList();
                    io.emit('accounts_update', updatedAccounts);
                }, 2000);
            } catch (e) {
                socket.emit('account_switched', { ok: false, error: e.message });
                captureLog('err', `Account switch failed: ${e.message}`);
            }
        });

        // ── Manual huntbot trigger ──
        socket.on('trigger_huntbot', async () => {
            captureLog('info', '🔫 Manual HB trigger from dashboard');
            if (_autoHbState) _autoHbState.last_hb_sent_at = 0;
            if (_sendAutoHb && _getSelfbot) {
                try {
                    const sb = _getSelfbot ? _getSelfbot() : null;
                    const channelId = _config?.channel_id;
                    if (sb && channelId) {
                        const ch = sb.channels?.cache?.get(channelId);
                        if (ch) {
                            captureLog('hb', '🔫 Sending owo hb from dashboard...');
                            await _sendAutoHb(ch);
                        } else {
                            captureLog('warn', 'HB trigger: channel not found in selfbot cache');
                        }
                    } else {
                        captureLog('warn', 'HB trigger: selfbot or channel_id not ready');
                    }
                } catch (e) {
                    captureLog('err', `HB trigger error: ${e.message}`);
                }
            }
        });

        // ── Auto Gem socket handlers ──
        socket.on('gem_toggle', () => {
            if (!_config || !_setAutoGemEnabled) return;
            _setAutoGemEnabled(!_config.auto_gem_enabled);
            captureLog('info', `💎 Auto Gem ${_config.auto_gem_enabled ? 'enabled' : 'disabled'} via dashboard`);
            const snap = _getGemSnapshot ? _getGemSnapshot() : {};
            io.emit('gem_update', snap);
            io.emit('update', getSnapshot());
        });

        socket.on('gem_set_type', (type) => {
            const valid = ['hunting', 'empowering', 'lucky'];
            if (!_setAutoGemType || !valid.includes(type)) return;
            _setAutoGemType(type);
            captureLog('info', `💎 Gem type set to: ${type}`);
            if (_autoGemState) {
                _autoGemState.gem_active_id = null;
                _autoGemState.gem_expired = true;
            }
            io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        });

        socket.on('gem_set_rarity', (rarity) => {
            const valid = ['common','uncommon','rare','epic','mythical','legendary','fabled'];
            if (!_setAutoGemRarity || !valid.includes(rarity)) return;
            _setAutoGemRarity(rarity);
            captureLog('info', `💎 Gem rarity set to: ${rarity}`);
            if (_autoGemState) {
                _autoGemState.gem_active_id = null;
                _autoGemState.gem_expired = true;
            }
            io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        });

        socket.on('gem_set_check_inv', (val) => {
            if (_setAutoGemCheckInv) _setAutoGemCheckInv(!!val);
            io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        });

        socket.on('gem_use_now', async () => {
            captureLog('info', '💎 Manual gem use triggered from dashboard');
            if (!_autoUseGem || !_getSelfbot) return;
            try {
                const sb = _getSelfbot();
                const ch = sb?.channels?.cache?.get(_config?.channel_id);
                if (ch) {
                    if (_autoGemState) _autoGemState.gem_expired = true;
                    await _autoUseGem(ch);
                    captureLog('ok', '💎 Gem use command sent!');
                } else {
                    captureLog('warn', '💎 Gem use: channel not found');
                }
            } catch (e) {
                captureLog('err', `Gem use error: ${e.message}`);
            }
        });

        socket.on('gem_check_inv', async () => {
            captureLog('info', '💎 Checking gem inventory...');
            try {
                const sb = _getSelfbot?.();
                const ch = sb?.channels?.cache?.get(_config?.channel_id);
                if (ch && _autoGemState) {
                    _autoGemState.waiting_for_inv = true;
                    _autoGemState.checking_inv = true;
                    const { safeSend } = require('./owonew20') || {};
                    await ch.sendTyping().catch(() => {});
                    await ch.send('owo inv').catch(() => {});
                    io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
                }
            } catch (e) {
                captureLog('err', `Inv check error: ${e.message}`);
            }
        });

        // Send initial gem state on connect
        if (_getGemSnapshot) socket.emit('gem_update', _getGemSnapshot());
        if (_GEM_DATA) socket.emit('gem_data', _GEM_DATA);
    });

    // ── Gem REST API ──
    app.get('/api/gem', (req, res) => {
        res.json(_getGemSnapshot ? _getGemSnapshot() : { enabled: false });
    });

    app.post('/api/gem/toggle', (req, res) => {
        if (!_config || !_setAutoGemEnabled) return res.json({ ok: false });
        _setAutoGemEnabled(!_config.auto_gem_enabled);
        io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        res.json({ ok: true, enabled: _config.auto_gem_enabled });
    });

    app.post('/api/gem/type', (req, res) => {
        const { type } = req.body || {};
        const valid = ['hunting', 'empowering', 'lucky'];
        if (!valid.includes(type)) return res.json({ ok: false, error: 'Invalid type' });
        if (_setAutoGemType) _setAutoGemType(type);
        io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        res.json({ ok: true });
    });

    app.post('/api/gem/rarity', (req, res) => {
        const { rarity } = req.body || {};
        const valid = ['common','uncommon','rare','epic','mythical','legendary','fabled'];
        if (!valid.includes(rarity)) return res.json({ ok: false, error: 'Invalid rarity' });
        if (_setAutoGemRarity) _setAutoGemRarity(rarity);
        io.emit('gem_update', _getGemSnapshot ? _getGemSnapshot() : {});
        res.json({ ok: true });
    });

    app.post('/api/gem/use', async (req, res) => {
        try {
            const sb = _getSelfbot?.();
            const ch = sb?.channels?.cache?.get(_config?.channel_id);
            if (!ch) return res.json({ ok: false, error: 'Channel not found' });
            if (_autoGemState) _autoGemState.gem_expired = true;
            if (_autoUseGem) await _autoUseGem(ch);
            res.json({ ok: true });
        } catch (e) {
            res.json({ ok: false, error: e.message });
        }
    });

    // ── Real-time push every 2s ──
    setInterval(() => {
        if (io) io.emit('update', getSnapshot());
    }, 2000);

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`\x1b[38;5;196m\x1b[1m⚡ Dashboard\x1b[0m → \x1b[38;5;51mhttp://localhost:${PORT}\x1b[0m`);
        console.log(`\x1b[2m   Serving index.html from: ${ROOT_DIR}\x1b[0m`);
    });

    return { app, server, io };
}

// ==================== DISCORD MESSAGE EMIT (owonew17 → browser) ====================
// owonew17.js messageCreate mein call karo — real Discord messages dashboard ko push karega
function emitDiscordMessage(msgData) {
    if (!io) return;

    // ── EMBED PARSE: Discord.js Message object se embeds extract karo ──
    // Agar msgData.rawMessage hai (Discord.js Message), embeds properly extract karo
    let embeds = msgData.embeds || [];
    if (msgData.rawMessage && msgData.rawMessage.embeds && msgData.rawMessage.embeds.length > 0) {
        embeds = msgData.rawMessage.embeds.map(emb => ({
            color: emb.color ? '#' + emb.color.toString(16).padStart(6, '0') : '#5865f2',
            title: emb.title || '',
            description: emb.description || '',
            fields: (emb.fields || []).map(f => ({ name: f.name, value: f.value, inline: f.inline })),
            footer: emb.footer?.text || '',
            thumbnail: emb.thumbnail?.url || emb.thumbnail?.proxyURL || '',
            image: emb.image?.url || emb.image?.proxyURL || '',
        }));
    } else if (Array.isArray(embeds) && embeds.length > 0) {
        // Already processed embeds — normalize karo
        embeds = embeds.map(emb => {
            // Discord.js embed object ho sakta hai
            const color = emb.color
                ? (typeof emb.color === 'number'
                    ? '#' + emb.color.toString(16).padStart(6, '0')
                    : emb.color)
                : '#5865f2';
            return {
                color,
                title: emb.title || '',
                description: emb.description || '',
                fields: (emb.fields || []).map(f => ({ name: f.name || '', value: f.value || '', inline: !!f.inline })),
                footer: typeof emb.footer === 'string' ? emb.footer : (emb.footer?.text || ''),
                thumbnail: typeof emb.thumbnail === 'string' ? emb.thumbnail : (emb.thumbnail?.url || emb.thumbnail?.proxyURL || ''),
                image: typeof emb.image === 'string' ? emb.image : (emb.image?.url || emb.image?.proxyURL || ''),
            };
        });
    }

    // ── HB AUTO-EMBED: Agar OWO ka message hai aur huntbot related hai, embed banao ──
    const content = msgData.content || '';
    if (msgData.isOwo && embeds.length === 0) {
        // "owo hb" response detect karo — "dispatched", "huntbot", "sent"
        if (/huntbot|dispatched|sent.*hunt|🤖/i.test(content)) {
            const amtMatch = content.match(/([0-9,]+)\s*cowoncy/i)
                          || content.match(/dispatched.*?([0-9,]+)/i)
                          || content.match(/([0-9,]+)\s*(?:coins?|gold)/i);
            const amt = amtMatch ? parseInt(amtMatch[1].replace(/,/g, '')) : 0;
            embeds = [{
                color: '#f59e0b',
                title: '🤖 Huntbot Dispatched!',
                description: amt > 0
                    ? `**Amount:** ${amt.toLocaleString()} cowoncy`
                    : 'Huntbot has been dispatched!',
                fields: [],
                footer: 'Returns in ~15 minutes',
                thumbnail: '',
                image: '',
            }];
        }
        // "owo hb" status response — "already dispatched" / "not ready"
        else if (/already|not\s+ready|wait|cooldown/i.test(content) && msgData.isOwo) {
            embeds = [{
                color: '#ed4245',
                title: '⏳ Huntbot Not Ready',
                description: content.slice(0, 200),
                fields: [],
                footer: '',
                thumbnail: '',
                image: '',
            }];
        }
    }

    io.emit('discord_message', { ...msgData, embeds });
}

// io getter for external use (e.g. members emit)
function getIo() { return io; }

module.exports = { startDashboard, captureLog, emitDiscordMessage, getIo };

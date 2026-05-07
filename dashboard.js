/**
 * OwO Dashboard — Real Backend
 * owocore/dashboard.js
 *
 * owo.js calls:
 *   const { startDashboard, captureLog, emitDiscordMessage, getIo } = require('./owocore/dashboard');
 *   startDashboard({ state, config, ... });
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const http   = require('http');

let _io      = null;   // socket.io instance (set after startDashboard)
let _capture = null;   // log capture fn (exported)
let _refs    = {};     // all refs passed from owo.js

// ── SSE client list ──────────────────────────────────────────────────────────
const _sseClients = new Set();

// ── Log ring-buffer (last 500 lines) ────────────────────────────────────────
const _logBuf = [];
const LOG_MAX = 500;

function _pushLog(entry) {
    _logBuf.push(entry);
    if (_logBuf.length > LOG_MAX) _logBuf.shift();
    // Push to all SSE clients
    const data = JSON.stringify(entry);
    for (const res of _sseClients) {
        try { res.write(`data: ${data}\n\n`); } catch (_) { _sseClients.delete(res); }
    }
    // Also emit via socket.io if available
    if (_io) _io.emit('log', entry);
}

/** Called by owo.js to capture tlog() output → SSE stream */
function captureLog(level, msg) {
    const entry = { ts: new Date().toISOString(), level: (level || 'INFO').toUpperCase(), msg: String(msg) };
    _pushLog(entry);
}

/** Called by owo.js to push a Discord message event */
function emitDiscordMessage(payload) {
    if (_io) _io.emit('discord_message', payload);
}

/** Returns the socket.io instance */
function getIo() { return _io; }

// ── Tiny router helper ───────────────────────────────────────────────────────
function router(routes) {
    return async (req, res) => {
        const url    = req.url.split('?')[0];
        const method = req.method.toUpperCase();

        // CORS for dev
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        const key = `${method} ${url}`;
        const handler = routes[key] || routes[`GET ${url}`];
        if (handler) {
            try {
                let body = null;
                if (method === 'POST') {
                    body = await new Promise((resolve, reject) => {
                        let s = '';
                        req.on('data', c => s += c);
                        req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } });
                        req.on('error', reject);
                    });
                }
                await handler(req, res, body);
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
            return;
        }

        // Static file serving — only from owocore/
        const base      = __dirname;
        const safeName  = path.basename(url === '/' ? 'index.html' : url);
        const filePath  = path.join(base, safeName);
        if (fs.existsSync(filePath)) {
            const ext  = path.extname(filePath).toLowerCase();
            const mime = {
                '.html': 'text/html', '.css': 'text/css',
                '.js':   'text/javascript', '.json': 'application/json',
                '.png':  'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
                '.ico':  'image/x-icon', '.woff2': 'font/woff2',
            }[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mime });
            fs.createReadStream(filePath).pipe(res);
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
    };
}

// ── Main export ──────────────────────────────────────────────────────────────
function startDashboard(opts) {
    _refs = opts;
    const PORT = 8080;

    const {
        state, config, autoHbState,
        getSelfbot, getSnapshot,
        startGrinding, saveConfig, updatePanel,
        switchToAccount, readBotconfig, writeBotconfig,
        fetchAccountInfo, _accInfoCache,
        rebootSelfbot, sendAutoHb,
        saveCurrentAccountHbState, loadHbConfig, saveHbConfig,
        OWO_HB_CONFIG_FILE,
        autoGemState, getGemSnapshot, GEM_DATA, autoUseGem,
        setAutoGemEnabled, setAutoGemType, setAutoGemRarity, setAutoGemCheckInv,
    } = opts;

    // ── Route map ───────────────────────────────────────────────────────────
    const routes = {};

    // GET /api/state
    routes['GET /api/state'] = async (req, res) => {
        const snapshot = getSnapshot ? getSnapshot() : { state, config };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(snapshot));
    };

    // POST /api/start
    routes['POST /api/start'] = async (req, res, body) => {
        try {
            const sb = getSelfbot ? getSelfbot() : null;
            if (!sb) throw new Error('Selfbot not ready');
            const chId = (body && body.channelId) || config.channel_id;
            if (!chId) throw new Error('No channel ID set');
            const ch = sb.channels?.cache?.get(chId);
            if (!ch) throw new Error(`Channel ${chId} not found in cache`);
            await startGrinding(ch);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, state: getSnapshot().state }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    };

    // POST /api/stop
    routes['POST /api/stop'] = async (req, res) => {
        state.force_stop      = true;
        state.grinding_active = false;
        if (updatePanel) updatePanel();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, state: getSnapshot().state }));
    };

    // POST /api/config
    routes['POST /api/config'] = async (req, res, body) => {
        if (!body || typeof body !== 'object') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'invalid body' }));
            return;
        }
        // Merge shallow config keys
        const allowed = ['channel_id', 'sleep_enabled', 'single_mode',
                         'auto_huntbot_enabled', 'auto_gem_enabled',
                         'auto_gem_type', 'auto_gem_rarity', 'auto_gem_check_inv',
                         'channelIds', 'prefix', 'updateMode', 'intervals',
                         'commands', 'protections', 'dcPreview'];
        for (const k of allowed) {
            if (body[k] !== undefined) {
                if (k === 'channelIds' && Array.isArray(body.channelIds)) {
                    config.channel_id = body.channelIds[0] || config.channel_id;
                } else if (k === 'intervals' && typeof body.intervals === 'object') {
                    // no-op for now — intervals are in config.commands
                } else {
                    config[k] = body[k];
                }
            }
        }
        // Feature toggles (hunt/battle/pray/daily etc.)
        if (body.features && typeof body.features === 'object') {
            for (const [k, v] of Object.entries(body.features)) {
                if (config.commands[k]) config.commands[k].active = !!v;
            }
        }
        // Protection toggles
        if (body.protection && typeof body.protection === 'object') {
            for (const [k, v] of Object.entries(body.protection)) {
                if (config.protections?.[k]) config.protections[k].active = !!v;
            }
        }
        if (saveConfig) saveConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, config: getSnapshot().config }));
    };

    // GET /api/logs/stream   — SSE
    routes['GET /api/logs/stream'] = (req, res) => {
        res.writeHead(200, {
            'Content-Type':  'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection':    'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        res.write(':ok\n\n');
        // Replay last 100 lines
        const replay = _logBuf.slice(-100);
        for (const e of replay) res.write(`data: ${JSON.stringify(e)}\n\n`);
        _sseClients.add(res);
        req.on('close', () => _sseClients.delete(res));
    };

    // POST /api/huntbot/run
    routes['POST /api/huntbot/run'] = async (req, res) => {
        try {
            const sb = getSelfbot ? getSelfbot() : null;
            const chId = config.channel_id;
            const ch = sb?.channels?.cache?.get(chId);
            if (!ch) throw new Error('Channel not found');
            if (sendAutoHb) await sendAutoHb(ch, true); // force run
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    };

    // POST /api/gem/use
    routes['POST /api/gem/use'] = async (req, res) => {
        try {
            const sb = getSelfbot ? getSelfbot() : null;
            const ch = sb?.channels?.cache?.get(config.channel_id);
            if (!ch) throw new Error('Channel not found');
            if (autoUseGem) await autoUseGem(ch);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    };

    // POST /api/gem/config
    routes['POST /api/gem/config'] = async (req, res, body) => {
        if (body.enabled  !== undefined && setAutoGemEnabled)  setAutoGemEnabled(!!body.enabled);
        if (body.type     !== undefined && setAutoGemType)      setAutoGemType(body.type);
        if (body.rarity   !== undefined && setAutoGemRarity)    setAutoGemRarity(body.rarity);
        if (body.checkInv !== undefined && setAutoGemCheckInv)  setAutoGemCheckInv(!!body.checkInv);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, gem: getGemSnapshot ? getGemSnapshot() : {} }));
    };

    // POST /api/gem/check
    routes['POST /api/gem/check'] = async (req, res) => {
        // Trigger inventory check — owo.js handles actual logic
        captureLog('INFO', '💎 Gem inventory check triggered from dashboard');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
    };

    // GET /api/accounts
    routes['GET /api/accounts'] = async (req, res) => {
        try {
            const cfg2   = readBotconfig ? readBotconfig() : {};
            const tokens = cfg2.tokens || [];
            const list   = tokens.map((t, i) => ({
                index:        i,
                id:           t.id || null,
                tag:          t.label || `Account ${i + 1}`,
                isActive:     !!t.isActive,
                tokenPreview: t.token ? (t.token.slice(0, 15) + '...' + t.token.slice(-4)) : '',
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, accounts: list }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, accounts: [], error: e.message }));
        }
    };

    // POST /api/accounts/switch
    routes['POST /api/accounts/switch'] = async (req, res, body) => {
        try {
            const idx = body?.index ?? body?.id;
            if (idx === undefined) throw new Error('Missing index');
            if (switchToAccount) await switchToAccount(idx);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: e.message }));
        }
    };

    // POST /api/reboot
    routes['POST /api/reboot'] = async (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        setTimeout(() => { if (rebootSelfbot) rebootSelfbot(); }, 300);
    };

    // POST /api/logout
    routes['POST /api/logout'] = async (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
    };

    // ── HTTP server ──────────────────────────────────────────────────────────
    const server = http.createServer(router(routes));

    // ── Socket.io (optional — graceful if not installed) ────────────────────
    try {
        const { Server } = require('socket.io');
        _io = new Server(server, { cors: { origin: '*' } });

        _io.on('connection', socket => {
            // Send current snapshot on connect
            try {
                socket.emit('state_update', getSnapshot ? getSnapshot() : { state, config });
                // Replay last 50 log lines
                _logBuf.slice(-50).forEach(e => socket.emit('log', e));
            } catch (_) {}

            socket.on('cmd', async ({ action, payload }) => {
                try {
                    switch (action) {
                        case 'start': {
                            const sb = getSelfbot?.();
                            const ch = sb?.channels?.cache?.get(config.channel_id);
                            if (ch) await startGrinding(ch);
                            break;
                        }
                        case 'stop':
                            state.force_stop      = true;
                            state.grinding_active = false;
                            if (updatePanel) updatePanel();
                            break;
                        case 'config':
                            if (payload) Object.assign(config, payload);
                            if (saveConfig) saveConfig();
                            break;
                    }
                    socket.emit('state_update', getSnapshot ? getSnapshot() : { state, config });
                } catch (e) {
                    socket.emit('error', { message: e.message });
                }
            });
        });

        // Push state updates to all socket clients every 3 seconds
        setInterval(() => {
            if (_io) {
                try { _io.emit('state_update', getSnapshot ? getSnapshot() : { state, config }); } catch (_) {}
            }
        }, 3000);

    } catch (e) {
        // socket.io not installed — SSE only mode
        console.log(`  \x1b[33m  ⚠  socket.io not found — dashboard running in SSE-only mode\x1b[0m`);
    }

    server.listen(PORT, '0.0.0.0', () => {
        const _GR = '\x1b[38;5;82m', _B = '\x1b[1m', _R = '\x1b[0m', _CY = '\x1b[38;5;51m';
        console.log('');
        console.log(`  ${_GR}${_B}  ✔  Dashboard → http://localhost:${PORT}${_R}`);
        console.log(`  ${_CY}     Open in your browser to control the selfbot${_R}`);
        console.log('');
        captureLog('OK', `🌐 Dashboard ready on port ${PORT}`);
    });

    server.on('error', err => {
        if (err.code === 'EADDRINUSE') {
            console.log(`  \x1b[31m  ✖  Port ${PORT} already in use — kill the old process and restart\x1b[0m`);
        } else {
            console.error('Dashboard server error:', err.message);
        }
    });
}

module.exports = { startDashboard, captureLog, emitDiscordMessage, getIo };

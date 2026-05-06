const {
    ActionRowBuilder, ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle,
    MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

// ==================== CONFIG PATHS (ONLY owoconfig.json) ====================
function getOwoconfigPath() {
    const possiblePaths = [
        path.join(__dirname, 'owocore', 'owoconfig.json'),
        path.join(__dirname, 'owoconfig.json'),
        path.join(process.cwd(), 'owocore', 'owoconfig.json'),
        path.join(process.cwd(), 'owoconfig.json'),
    ];

    const found = possiblePaths.find(p => fs.existsSync(p));
    if (!found) {
        console.error('\x1b[31m❌ owoconfig.json not found in any location!\x1b[0m');
        possiblePaths.forEach(p => console.log(`   - ${p}`));
        process.exit(1);
    }
    return found;
}

function readBotconfig() {
    try {
        return JSON.parse(fs.readFileSync(getOwoconfigPath(), 'utf8'));
    } catch (e) {
        console.error(`\x1b[31m❌ Failed to read owoconfig.json: ${e.message}\x1b[0m`);
        process.exit(1);
    }
}

function writeBotconfig(cfg) {
    const cfgPath = getOwoconfigPath();
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 4));
}

// ==================== ACCOUNT INFO CACHE ====================
const _accInfoCache = new Map();

async function fetchAccountInfo(token) {
    if (_accInfoCache.has(token)) return _accInfoCache.get(token);
    try {
        return await new Promise((resolve) => {
            const req = require('https').request(
                {
                    hostname: 'discord.com',
                    path: '/api/v9/users/@me',
                    method: 'GET',
                    headers: { Authorization: token },
                    timeout: 8000
                },
                (res2) => {
                    let data = '';
                    res2.on('data', d => { data += d; });
                    res2.on('end', () => {
                        try {
                            const u = JSON.parse(data);
                            if (u.id && !u.message) {
                                const info = {
                                    id:       u.id,
                                    username: u.global_name || u.username,
                                    tag:      u.username,
                                    avatar:   u.avatar,
                                    valid:    true
                                };
                                _accInfoCache.set(token, info);
                                resolve(info);
                            } else {
                                resolve({ id: null, username: 'INVALID TOKEN', tag: null, valid: false });
                            }
                        } catch {
                            resolve({ id: null, username: 'PARSE ERROR', tag: null, valid: false });
                        }
                    });
                }
            );
            req.on('error',   () => resolve({ id: null, username: 'NETWORK ERROR', tag: null, valid: false }));
            req.on('timeout', () => { req.destroy(); resolve({ id: null, username: 'TIMEOUT', tag: null, valid: false }); });
            req.end();
        });
    } catch {
        return { id: null, username: 'ERROR', tag: null, valid: false };
    }
}

// ==================== NITRO SMALL CAPS FONT ====================
function n(text) {
    const map = {
        'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ғ','g':'ɢ','h':'ʜ','i':'ɪ',
        'j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'Q','r':'ʀ',
        's':'s','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ',' ':' '
    };
    return text.toLowerCase().split('').map(c => map[c] ?? c).join('');
}

// ==================== TERMINAL LOGGER ====================
const _R  = '\x1b[0m', _B = '\x1b[1m', _DM = '\x1b[2m';
const _GR = '\x1b[38;5;82m',  _RD = '\x1b[38;5;196m';
const _YL = '\x1b[38;5;226m', _CY = '\x1b[38;5;51m';
const _MG = '\x1b[38;5;201m', _WH = '\x1b[97m';

function tlog(type, msg) {
    const ts = new Date().toLocaleTimeString('en-IN', { hour12: false });
    const T  = `${_DM}[${ts}]${_R}`;
    switch (type) {
        case 'ok':   return console.log(`${T} ${_GR}${_B}✔${_R}  ${msg}`);
        case 'err':  return console.log(`${T} ${_RD}${_B}✖${_R}  ${msg}`);
        case 'warn': return console.log(`${T} ${_YL}${_B}⚠${_R}  ${msg}`);
        case 'info': return console.log(`${T} ${_CY}${_B}ℹ${_R}  ${msg}`);
        default:     return console.log(`${T}  ${msg}`);
    }
}

// ==================== ADD ACCOUNT MODAL ====================
function buildAddAccountModal() {
    const modal = new ModalBuilder()
        .setCustomId('owo_acc_add_modal')
        .setTitle('➕ Add Account');

    const tokenInput = new TextInputBuilder()
        .setCustomId('acc_token')
        .setLabel('Discord Token')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Paste your Discord token here...')
        .setRequired(true)
        .setMinLength(50)
        .setMaxLength(200);

    const labelInput = new TextInputBuilder()
        .setCustomId('acc_label')
        .setLabel('Label (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Main Account, Alt 1')
        .setRequired(false)
        .setMaxLength(30);

    modal.addComponents(
        new ActionRowBuilder().addComponents(tokenInput),
        new ActionRowBuilder().addComponents(labelInput)
    );
    return modal;
}

// ==================== ACCOUNTS PANEL BUILDER ====================
async function buildAccountsPanel(statusMsg = null) {
    const cfg    = readBotconfig();
    const tokens = cfg.tokens || [];
    const activeIdx = tokens.findIndex(t => t.isActive);
    const infos  = await Promise.all(tokens.map(t => fetchAccountInfo(t.token)));

    let lines = '';
    if (tokens.length === 0) {
        lines = '> ❌ **No accounts added yet.**\n> Use **➕ Add Account** to add one.';
    } else {
        tokens.forEach((t, i) => {
            const info     = infos[i];
            const isMain   = (t.type === 'main' || i === 0);
            const badge    = isMain ? '(main)' : '(alt)';
            const username = (info && info.valid) ? `@${info.username}` : `⚠️ ${t.label || 'Invalid Token'}`;
            const isActive = (i === activeIdx);
            lines += `> ${isActive ? '✅' : '⬜'} **${username}** \`${badge}\`${isActive ? ' ← ᴀᴄᴛɪᴠᴇ' : ''}\n`;
        });
    }

    const options = tokens.length > 0
        ? tokens.map((t, i) => {
            const info   = infos[i];
            const isMain = (t.type === 'main' || i === 0);
            const badge  = isMain ? '(main)' : '(alt)';
            const label  = (info && info.valid) ? `${info.username} ${badge}` : `Invalid ${badge}`;
            const isActive = (i === activeIdx);
            return new StringSelectMenuOptionBuilder()
                .setLabel(label.slice(0, 25))
                .setValue(`switch_acc_${i}`)
                .setDescription(isActive ? '✅ Currently active' : `Switch to ${info?.valid ? info.username : 'this account'}`)
                .setEmoji(isActive ? '✅' : ((info?.valid) ? '👤' : '⚠️'));
        })
        : [new StringSelectMenuOptionBuilder()
            .setLabel('No accounts added')
            .setValue('no_acc')
            .setDescription('Add an account using the button below')
            .setEmoji('❌')];

    const switchMenu = new StringSelectMenuBuilder()
        .setCustomId('owo_acc_switch_menu')
        .setPlaceholder(`👤 ${n('select account to switch')}`)
        .addOptions(options);

    const container = new ContainerBuilder()
        .setAccentColor(0xEB459E)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# 👤 ${n('accounts manager')}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true));

    if (statusMsg) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${statusMsg}`)
        );
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true));
    }

    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(lines || '> No accounts.')
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(switchMenu)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('owo_acc_add')
                    .setLabel('➕  ᴀᴅᴅ ᴀᴄᴄᴏᴜɴᴛ')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('owo_acc_remove')
                    .setLabel('🗑️  ʀᴇᴍᴏᴠᴇ')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(tokens.length === 0),
                new ButtonBuilder()
                    .setCustomId('owo_acc_refresh')
                    .setLabel('🔄  ʀᴇғʀᴇsʜ')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('owo_acc_back')
                    .setLabel('◀  ʙᴀᴄᴋ')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// ==================== ACCOUNT SWITCH ====================
async function switchToAccount(accountIndex, interaction, callback) {
    const cfg = readBotconfig();

    if (!cfg.tokens || !cfg.tokens[accountIndex]) {
        return { success: false, message: '❌ Account not found!' };
    }

    const currentIdx = cfg.tokens.findIndex(t => t.isActive);
    if (currentIdx === accountIndex) {
        return { success: false, message: '✅ Already on this account!' };
    }

    const newToken    = cfg.tokens[accountIndex].token;
    const accountInfo = await fetchAccountInfo(newToken);
    const accountName = accountInfo?.valid ? `@${accountInfo.username}` : cfg.tokens[accountIndex].label || `Account ${accountIndex + 1}`;

    cfg.tokens = cfg.tokens.map((t, i) => ({ ...t, isActive: i === accountIndex }));
    writeBotconfig(cfg);
    _accInfoCache.clear();

    if (interaction) {
        await interaction.editReply(await buildAccountsPanel(`🔄 Switching to ${accountName}...`)).catch(() => {});
    }

    if (callback && typeof callback === 'function') {
        try {
            await callback(newToken, accountName);
            if (interaction) {
                await interaction.editReply(await buildAccountsPanel(`✅ Switched to ${accountName}!`)).catch(() => {});
            }
            return { success: true, message: `✅ Switched to ${accountName}!`, token: newToken, accountInfo };
        } catch (err) {
            if (interaction) {
                await interaction.editReply(await buildAccountsPanel(`❌ Switch failed: ${err.message}`)).catch(() => {});
            }
            return { success: false, message: err.message };
        }
    }

    return { success: true, message: `✅ Switched to ${accountName}!`, token: newToken, accountInfo };
}

// ==================== ADD ACCOUNT ====================
async function addAccount(token, customLabel = null, interaction = null) {
    if (!token || token.length < 50) {
        const msg = '❌ Invalid token format! Token too short.';
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    if (token.includes(' ')) {
        const msg = '❌ Token contains spaces! Copy it again carefully.';
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    const cfg = readBotconfig();
    if (!cfg.tokens) cfg.tokens = [];

    if (cfg.tokens.find(t => t.token === token)) {
        const msg = '⚠️ This token is already added!';
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    const info = await fetchAccountInfo(token);
    if (!info || !info.valid || !info.id) {
        const reason = info?.username === 'INVALID TOKEN' ? 'Discord rejected this token (401 Invalid).'
                     : info?.username === 'NETWORK ERROR' ? 'Network error - check your connection.'
                     : info?.username === 'TIMEOUT'       ? 'Request timeout - try again.'
                     : `API error: ${info?.username || 'Unknown'}`;
        const msg = `❌ ${reason}`;
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    cfg.tokens.push({
        token,
        type:    'alt',
        isActive: false,
        label:   customLabel || `@${info.username}`,
        id:      info.id,
        addedAt: new Date().toISOString()
    });
    writeBotconfig(cfg);
    _accInfoCache.clear();

    const successMsg = `✅ Account added: @${info.username}`;
    if (interaction) await interaction.editReply(await buildAccountsPanel(successMsg)).catch(() => {});
    return { success: true, message: successMsg, accountInfo: info };
}

// ==================== REMOVE ACCOUNT ====================
async function removeAccount(accountNumber, interaction) {
    const removeIdx = accountNumber - 1;
    const cfg = readBotconfig();

    if (!cfg.tokens || isNaN(removeIdx) || removeIdx < 0 || removeIdx >= cfg.tokens.length) {
        const msg = `❌ Invalid number! Enter 1 to ${cfg.tokens?.length || 0}`;
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    if (cfg.tokens.length === 1) {
        const msg = '❌ Cannot remove the only account!';
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    if (cfg.tokens[removeIdx].isActive) {
        const msg = '❌ Cannot remove the **active** account! Switch to another account first.';
        if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
        return { success: false, message: msg };
    }

    const removedLabel = cfg.tokens[removeIdx].label || `Account ${removeIdx + 1}`;
    cfg.tokens.splice(removeIdx, 1);
    writeBotconfig(cfg);
    _accInfoCache.clear();

    const msg = `✅ Removed: ${removedLabel}`;
    if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
    return { success: true, message: msg };
}

// ==================== REFRESH ACCOUNTS ====================
async function refreshAccounts(interaction = null) {
    _accInfoCache.clear();
    const cfg = readBotconfig();
    if (cfg.tokens?.length > 0) {
        await Promise.all(cfg.tokens.map(t => fetchAccountInfo(t.token)));
    }
    const msg = '🔄 Accounts refreshed!';
    if (interaction) await interaction.editReply(await buildAccountsPanel(msg)).catch(() => {});
    return { success: true, message: msg };
}

// ==================== GET ACTIVE TOKEN (from owoconfig.json only) ====================
function getActiveToken() {
    const cfg = readBotconfig();
    // Support both formats: tokens[] array OR direct activeUserToken field
    const activeToken = cfg.tokens?.find(t => t.isActive)?.token || cfg.activeUserToken || null;
    if (!activeToken) {
        throw new Error('No active token found in owoconfig.json');
    }
    return activeToken;
}

// ==================== EXPORTS ====================
module.exports = {
    buildAccountsPanel,
    buildAddAccountModal,
    switchToAccount,
    addAccount,
    removeAccount,
    refreshAccounts,
    getActiveToken,
    fetchAccountInfo,
    readBotconfig,
    writeBotconfig,
    _accInfoCache
};

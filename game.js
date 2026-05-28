/* ============================================================
   LIAR'S DICE v8.6 — FINAL STABLE RELEASE
   Исправления: Призраки, Боты, Оптимизация, Безопасность
   ============================================================ */

// [I] РЕЖИМ ОТЛАДКИ И КЭШИРОВАНИЕ [8][I]
const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Game]', ...args); }
function logError(...args) { console.error('[Game Error]', ...args); }

// Кэш эмодзи для производительности [8]
const DIE_EMOJI_CACHE = ['?', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function getDieEmoji(v) {
    const val = parseInt(v) || 1;
    return DIE_EMOJI_CACHE[val] || '⚀';
}

// [F] ГЛОБАЛЬНОЕ СОСТОЯНИЕ [F]
const GameState = {
    roomRef: null,
    myUid: '', myName: '', myAvatar: '🎲', myColor: '#ffffff',
    currentRoomId: '', isHost: false,
    players: {}, lastBet: null, gameState: 'lobby',
    roundNumber: 0, turnCounter: 0, currentPlayerUid: null,
    isGhost: false, ghostTarget: null, devilDealsUsed: 0, blood: 0,
    usedSpecialThisRound: {}, thiefUsedThisRound: false,
    sniperShotUsedThisRound: false, artifactHistory: [],
    spyMemory: {},
    defaultLives: 3, specialDiceEnabled: true, soundEnabled: true,
    botDifficulty: 2, bots: {}, isBotThinking: false,
    expertKnownDice: {},
    currentVoteTarget: null, lastVoteEndTime: 0,
    devilDealData: null,
    timers: { accusation: null, devilDeal: null, vote: null, bot: [] },
    chatLastSend: 0 // [10] Debounce чата
};

const VOTE_COOLDOWN = 120000;
const MAX_HISTORY = 50; // [9]
const CHAT_DEBOUNCE_MS = 1000; // [10]

// [K] КОНСТАНТЫ [K]
const AVATARS = ['🎲','🎭','👻','🤖','🧙','🧝','🧛','🧟','🐉','🦄','🌟','🔥','💀','👑','🎯','🧿','🕵️','🧪','🛡️','🔫'];
const COLORS = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ff8800','#88ff00','#ff0088','#0088ff','#ffffff','#cccccc','#ffaa88','#88ffaa','#aa88ff','#ff8888','#88ff88','#8888ff','#ffaa00','#00ffaa'];
const botDifficultyNames = ['Легкий','Средний','Сложный','Эксперт'];

const ARTIFACTS = [
    {id:'target',emoji:'🎯',name:'В ЯБЛОЧКО!',type:'active',description:'Уничтожает 1 кубик выбранного номинала у противника',hidden:false},
    {id:'fireball',emoji:'☄️',name:'ФАЕРБОЛ',type:'active',description:'Перебрасывает ВСЕ ваши обычные кубики (кроме замороженных)',hidden:false},
    {id:'luck',emoji:'🍀',name:'ВЕЗУНЧИК',type:'active',description:'Перебрасывает кубики с шансом 70% на 4-6 (кроме замороженных)',hidden:false},
    {id:'blessing',emoji:'⚕️',name:'БЛАГОСЛОВЕНИЕ',type:'active',description:'Убирает 1 яд у себя или союзника',hidden:false},
    {id:'thief',emoji:'🥷',name:'ВОР',type:'active',description:'Крадёт артефакт у выбранного противника (1 раз за раунд)',hidden:false},
    {id:'deceiver',emoji:'🎭',name:'ОБМАНЩИК',type:'active',description:'Авто-ставка, обвинитель получает +2 яда',hidden:true},
    {id:'clone',emoji:'🧬',name:'КЛОНИРОВАНИЕ',type:'active',description:'Артефакт становится 6-м кубиком со значением противника',hidden:true},
    {id:'curse',emoji:'☠️',name:'ПРОКЛЯТИЕ',type:'active',description:'Следующая ставка цели автоматически ложная',hidden:true},
    {id:'spy',emoji:'🕵️',name:'ШПИОН',type:'active',description:'Показывает 1 случайный кубик выбранного противника',hidden:true},
    {id:'ice',emoji:'🧊',name:'ЛЕДЯНАЯ СТЕНА',type:'active',description:'Замораживает кубики цели на раунд (можно на себя)',hidden:true},
    {id:'defender',emoji:'🛡️',name:'ЗАЩИТНИК',type:'passive',description:'Блокирует ВСЕ яды в раунде (1 раз)',hidden:true},
    {id:'bloodthirst',emoji:'🧛',name:'КРОВОЖАДНОСТЬ',type:'passive',description:'+1 кровь при верном обвинении, цель получает +2 яда',hidden:true},
    {id:'analyst',emoji:'🔍',name:'АНАЛИТИК',type:'active',description:'Показывает мин. количество игроков с кубиком номинала',hidden:true},
    {id:'double',emoji:'🪞',name:'ДВОЙНИК',type:'active',description:'Копирует последнюю ставку выбранного игрока',hidden:false},
    {id:'evilEye',emoji:'🧿',name:'СГЛАЗ',type:'active',description:'Накладывает невезение на кубики цели (70% на 1-3)',hidden:true},
    {id:'wildDie',emoji:'🎲',name:'ДИКИЙ КУБИК',type:'passive',description:'Считается любым номиналом при подсчёте ставки владельца',hidden:true},
    {id:'sacrifice',emoji:'💀',name:'ЖЕРТВОПРИНОШЕНИЕ',type:'active',description:'+1 яд ради мощного эффекта на выбор',hidden:true},
    {id:'circus',emoji:'🎪',name:'ЦИРКАЧ',type:'active',description:'Обмен 2 кубиками с целью (требуется ≥2 кубиков у обоих)',hidden:true},
    {id:'darkPact',emoji:'🌑',name:'ТЁМНЫЙ ДОГОВОР',type:'passive',description:'Текущий раунд: +2 яда при обвинении. Следующий: щит на раунд',hidden:true},
    {id:'sniper',emoji:'🔫',name:'ОТСТРЕЛ',type:'active',description:'Уничтожает все кубики номинала у всех (кроме замороженных, нельзя на текущую ставку). После использования нельзя обвинять',hidden:true}
];

const GHOST_ABILITIES = [
    {id:'oathOfVengeance',emoji:'⚔️',name:'Месть',type:'active',limit:'once_per_ghost',description:'Выберите цель. Если она умрёт — вы воскреснете (1 жизнь, 0 крови)'},
    {id:'familiarCurse',emoji:'🔮',name:'Проклятие Фамильяра',type:'active',limit:'once_per_ghost',description:'Следующая ставка цели автоматически ложная (до конца раунда)'},
    {id:'poltergeist',emoji:'🌀',name:'Полтергейст',type:'active',limit:'once_per_ghost',description:'Случайный эффект: саботаж/благословение/перемешивание'},
    {id:'keeperOfSecrets',emoji:'👁️',name:'Хранитель Тайн',type:'active',limit:'unlimited',description:'Видите кубики всех живых игроков'},
    {id:'soulReaper',emoji:'💀',name:'Жатва Душ',type:'active',limit:'once_per_ghost',description:'20% шанс эффекта на каждого живого. При убийстве — воскрешение (1 жизнь, 0 крови)'}
];

// ============================================================
// FIREBASE И УТИЛИТЫ
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDc8kM-ImqTtyj7Zaf3Qk-ftWhRcxSDKjA",
    authDomain: "liars-dice-blxrrxgxmxs.firebaseapp.com",
    databaseURL: "https://liars-dice-blxrrxgxmxs-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "liars-dice-blxrrxgxmxs",
    storageBucket: "liars-dice-blxrrxgxmxs.firebasestorage.app",
    messagingSenderId: "676558492280",
    appId: "1:676558492280:web:0ead879f85d8207e55538d"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// [11] XSS ЗАЩИТА
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(msg, type='info') {
    const tt = {error:'❌ Ошибка', warning:'⚠️ Внимание', success:'✅ Успех', info:'ℹ️ Инфо'};
    const title = document.getElementById('notifyTitle');
    const message = document.getElementById('notifyMessage');
    const modal = document.getElementById('modalNotify');
    if (title && message && modal) {
        title.textContent = tt[type] || 'ℹ️ Уведомление';
        message.textContent = msg;
        modal.style.display = 'block';
    } else { alert(msg); }
}

function appendChat(msg, t='normal', senderColor='#ffffff', senderAvatar='') {
    const e = document.createElement('div');
    e.className = `chat-msg msg-${t}`;
    if (t === 'normal' && senderColor) e.style.color = senderColor;
    if (senderAvatar) {
        const parts = msg.split(':');
        const name = escapeHtml(parts[0]);
        const text = escapeHtml(parts.slice(1).join(':'));
        e.innerHTML = `${escapeHtml(senderAvatar)} <span style="color:${senderColor}">${name}</span>:${text}`;
    } else {
        e.textContent = msg;
    }
    const logEl = document.getElementById('chatLog');
    if (logEl) {
        logEl.insertBefore(e, logEl.firstChild);
        while (logEl.children.length > 60) logEl.removeChild(logEl.lastChild);
    }
}

let audioContext = null;
function setupAudioContext() {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { logError('AudioContext:', e); }
}

function playSound(type) {
    if (!GameState.soundEnabled || !audioContext) return;
    try {
        const o = audioContext.createOscillator(), g = audioContext.createGain();
        o.connect(g); g.connect(audioContext.destination);
        const n = audioContext.currentTime;
        const p = {
            bet:[440,220,0.1,'square'], accuse:[880,440,0.3,'sawtooth'],
            poison:[300,150,0.2,'sine'], death:[220,110,0.5,'sine'],
            devil:[150,100,0.4,'sawtooth'], devilWin:[440,880,0.3,'square'],
            devilLose:[200,100,0.4,'sawtooth'], ghost:[660,880,0.3,'sine'],
            resurrection:[330,990,0.6,'sine'], artifact:[523,784,0.2,'square'],
            round:[440,880,0.3,'square'], blood:[392,523,0.2,'sine'],
            win:[523,659,784,1046,0.8,'square']
        }[type] || [440,220,0.1,'sine'];
        if (type === 'win') {
            p.forEach((f, i) => {
                const oc = audioContext.createOscillator(), gc = audioContext.createGain();
                oc.connect(gc); gc.connect(audioContext.destination);
                oc.frequency.value = f; oc.type = 'square';
                gc.gain.setValueAtTime(0.2, n+i*0.1);
                gc.gain.exponentialRampToValueAtTime(0.01, n+i*0.1+0.3);
                oc.start(n+i*0.1); oc.stop(n+i*0.1+0.3);
            });
        } else {
            o.frequency.setValueAtTime(p[0], n);
            o.frequency.exponentialRampToValueAtTime(p[1], n+p[2]);
            o.type = p[3];
            g.gain.setValueAtTime(0.2, n);
            g.gain.exponentialRampToValueAtTime(0.01, n+p[2]);
            o.start(n); o.stop(n+p[2]);
        }
    } catch(e) { logError('playSound:', e); }
}

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// [E] ВАЛИДАЦИЯ
function validatePlayerData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.name !== 'string' || data.name.length > 30) return false;
    if (!Array.isArray(data.dice)) return false;
    if (data.dice.some(d => typeof d !== 'number' || d < 1 || d > 6)) return false;
    if (typeof data.poisons !== 'number' || data.poisons < 0 || data.poisons > 20) return false;
    if (typeof data.blood !== 'number' || data.blood < 0 || data.blood > 20) return false;
    if (typeof data.maxLives !== 'number' || data.maxLives < 1 || data.maxLives > 10) return false;
    return true;
}

function validateBet(bet) {
    if (!bet || typeof bet !== 'object') return false;
    if (typeof bet.count !== 'number' || bet.count < 1 || bet.count > 100) return false;
    if (typeof bet.value !== 'number' || bet.value < 1 || bet.value > 6) return false;
    if (typeof bet.player !== 'string') return false;
    return true;
}

// [H] БЕЗОПАСНЫЕ ОБНОВЛЕНИЯ + [9] BATCH UPDATES
function safeUpdate(ref, data, context='') {
    return ref.update(data)
        .then(() => log(`✅ ${context || 'update'}: OK`))
        .catch(err => {
            logError(`❌ ${context || 'update'}:`, err);
            showNotification('Ошибка соединения с сервером', 'error');
        });
}

function safeSet(ref, data, context='') {
    return ref.set(data)
        .then(() => log(`✅ ${context || 'set'}: OK`))
        .catch(err => {
            logError(`❌ ${context || 'set'}:`, err);
            showNotification('Ошибка соединения с сервером', 'error');
        });
}

// [A] ТАЙМЕРЫ
function clearAllTimers() {
    if (GameState.timers.accusation) { clearTimeout(GameState.timers.accusation); GameState.timers.accusation = null; }
    if (GameState.timers.devilDeal) { clearInterval(GameState.timers.devilDeal); GameState.timers.devilDeal = null; }
    if (GameState.timers.vote) { clearInterval(GameState.timers.vote); GameState.timers.vote = null; }
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
    log('🧹 Все таймеры очищены');
}

// ============================================================
// КОМНАТЫ И ПОДКЛЮЧЕНИЕ
// ============================================================
function createRoom() {
    const roomId = generateRoomId();
    GameState.currentRoomId = roomId;
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    document.getElementById('roomIdDisplay').textContent = roomId;
    GameState.roomRef = db.ref('rooms/' + roomId);
    safeSet(GameState.roomRef, {
        players: {}, state: 'lobby', round: 0, lastBet: null,
        settings: { specialDiceEnabled: true, defaultLives: 3 },
        artifactHistory: [], turnCounter: 0, createdAt: Date.now()
    }, 'createRoom').then(() => enterRoom(roomId, true));
}

function newRoom() {
    if (GameState.roomRef) {
        GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().cancel();
        GameState.roomRef = null;
    }
    clearAllTimers();
    createRoom();
}

function enterRoom(roomId, isCreator = false) {
    GameState.currentRoomId = roomId;
    GameState.roomRef = db.ref('rooms/' + roomId);

    // [C] ВОССТАНОВЛЕНИЕ ИЗ LOCALSTORAGE
    const savedUid = localStorage.getItem('ld_myUid');
    const savedName = localStorage.getItem('ld_playerName');
    const savedAvatar = localStorage.getItem('ld_avatar');
    const savedColor = localStorage.getItem('ld_color');

    if (savedUid && savedName) {
        GameState.myUid = savedUid;
        GameState.myName = savedName;
        GameState.myAvatar = savedAvatar || '🎲';
        GameState.myColor = savedColor || '#ffffff';
    } else {
        GameState.myUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        GameState.myName = localStorage.getItem('ld_playerName') || 'Игрок';
        GameState.myAvatar = localStorage.getItem('ld_avatar') || '🎲';
        GameState.myColor = localStorage.getItem('ld_color') || '#ffffff';
        localStorage.setItem('ld_myUid', GameState.myUid);
        localStorage.setItem('ld_playerName', GameState.myName);
        localStorage.setItem('ld_avatar', GameState.myAvatar);
        localStorage.setItem('ld_color', GameState.myColor);
    }
    localStorage.setItem('ld_lastRoom', roomId);

    const playerData = {
        name: GameState.myName, uid: GameState.myUid,
        avatar: GameState.myAvatar, color: GameState.myColor,
        dice: [], poisons: 0, blood: 0, alive: true, isGhost: false,
        artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0,
        maxLives: GameState.defaultLives, joinedAt: Date.now()
    };

    safeSet(GameState.roomRef.child('players').child(GameState.myUid), playerData, 'enterRoom');
    // [7] При отключении помечаем как offline, но НЕ удаляем сразу
    GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().update({ connected: false, lastSeenTurn: GameState.turnCounter });

    setupRoomListeners();
    setupConnectionListener();
    appendChat(`🎉 ${GameState.myName} вошёл в комнату ${roomId}`, 'system');
}

function setupConnectionListener() {
    const connectedRef = db.ref('.info/connected');
    const statusEl = document.getElementById('connectionStatus');
    connectedRef.on('value', (snap) => {
        const connected = snap.val();
        if (statusEl) {
            if (connected) {
                statusEl.className = 'connection-status online';
                statusEl.textContent = '●';
                document.body.classList.remove('offline');
                if (GameState.roomRef && GameState.myUid) {
                    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { connected: true }, 'reconnect');
                }
            } else {
                statusEl.className = 'connection-status offline';
                statusEl.textContent = '○';
                document.body.classList.add('offline');
                showNotification('⚠️ Потеряно соединение...', 'warning');
            }
        }
    });
}

function setupRoomListeners() {
    GameState.roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        GameState.players = data.players || {};
        GameState.gameState = data.state || 'lobby';

        if (data.settings) {
            if (data.settings.defaultLives) {
                GameState.defaultLives = data.settings.defaultLives;
                const el = document.getElementById('menuLives');
                if (el) el.textContent = `❤️ Жизни: ${GameState.defaultLives}`;
            }
            if (typeof data.settings.specialDiceEnabled === 'boolean') {
                GameState.specialDiceEnabled = data.settings.specialDiceEnabled;
                const el = document.getElementById('menuArtifacts');
                if (el) el.textContent = `🎲 Артефакты: ${GameState.specialDiceEnabled ? '✅' : '❌'}`;
            }
        }

        GameState.lastBet = (data.lastBet && validateBet(data.lastBet)) ? data.lastBet : null;
        GameState.roundNumber = data.round || 0;
        GameState.artifactHistory = Array.isArray(data.artifactHistory) ? data.artifactHistory.slice(-MAX_HISTORY) : [];
        GameState.turnCounter = data.turnCounter || 0;
        GameState.currentPlayerUid = data.currentPlayerUid || null;

        // Валидация игроков
        Object.keys(GameState.players).forEach(uid => {
            if (!validatePlayerData(GameState.players[uid])) logError(`⚠️ Bad player data: ${uid}`);
        });

        const me = GameState.players[GameState.myUid];
        if (me) {
            GameState.isGhost = me.isGhost || false;
            GameState.ghostTarget = me.ghostTarget || null;
            GameState.devilDealsUsed = me.devilDealsUsed || 0;
            GameState.blood = me.blood || 0;
            GameState.usedSpecialThisRound = me.usedSpecialThisRound || {};
            GameState.thiefUsedThisRound = me.thiefUsedThisRound || false;
            GameState.sniperShotUsedThisRound = me.sniperShotUsedThisRound || false;
        }

        // Панель обвинения
        const panel = document.getElementById('accusationPanel');
        if (GameState.gameState === 'accusing') {
            if (panel) panel.style.display = 'block';
            const ad = data.accusingData;
            if (ad && GameState.lastBet) {
                const accused = GameState.players[ad.accused];
                const ph = document.getElementById('accusationPhrase');
                if (ph && accused) ph.textContent = `${accused.name} обвинён в блефе! Проверка...`;
                
                let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
                Object.values(GameState.players).forEach(p => {
                    if (p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d)||1]++);
                });
                const sm = Object.keys(ct).filter(k=>ct[k]>0).map(k=>`${ct[k]}x${getDieEmoji(k)}`).join('  ');
                const sumEl = document.getElementById('accusationDiceSummary');
                if (sumEl) sumEl.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;
            }
            const res = data.accusationResult;
            if (res) {
                const rEl = document.getElementById('accusationResult');
                const eEl = document.getElementById('accusationEffects');
                if (rEl) { rEl.textContent = res.resultText; rEl.className = res.resultClass; }
                if (eEl && res.effects) eEl.innerHTML = res.effects;
            }
        } else {
            if (panel && panel.style.display === 'block') panel.style.display = 'none';
        }

        renderUI();

        // Запуск хода бота
        if (GameState.gameState === 'betting' && GameState.currentPlayerUid && 
            GameState.players[GameState.currentPlayerUid]?.isBot && 
            GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
            botTurn(GameState.currentPlayerUid);
        }
    });

    GameState.roomRef.child('chat').limitToLast(60).on('child_added', (s) => {
        const msg = s.val();
        if (!msg) return;
        const isMe = msg.sender === GameState.myName;
        const player = Object.values(GameState.players).find(p => p.name === msg.sender);
        appendChat(`${msg.sender}: ${msg.text}`, msg.type || 'normal', isMe ? GameState.myColor : (player?.color || '#fff'), isMe ? GameState.myAvatar : (player?.avatar || ''));
    });

    GameState.roomRef.child('votes').on('value', (s) => {
        const votes = s.val();
        if (votes && GameState.currentVoteTarget && votes[GameState.currentVoteTarget]) updateVoteUI(votes[GameState.currentVoteTarget]);
    });
}

// ============================================================
// РЕНДЕРИНГ [J]
// ============================================================
const playerCardsCache = new Map();

function renderUI() {
    updateGameStatus();
    updateLastBetDisplay();
    renderPlayerList();
    renderDiceRow();
    updateControls();
}

function updateGameStatus() {
    const cp = getCurrentPlayerName();
    const el = document.getElementById('gameStatusText');
    if (!el) return;
    switch(GameState.gameState) {
        case 'lobby': el.textContent = 'Лобби'; break;
        case 'betting': el.textContent = `Раунд ${GameState.roundNumber} | Ход: ${cp}`; break;
        case 'accusing': el.textContent = '⚖️ Проверка ставки'; break;
        case 'devil_deal': el.textContent = '😈 Сделка с Дьяволом'; break;
        case 'ended': 
            const w = Object.values(GameState.players).find(p => p?.alive && !p.isGhost);
            el.textContent = w ? `🏆 ${w.name} победил!` : 'Ничья'; 
            break;
    }
}

function getCurrentPlayerName() {
    const u = getCurrentPlayerUid();
    return u && GameState.players[u] ? GameState.players[u].name : '—';
}

function getCurrentPlayerUid() {
    // [7] Учитываем только подключенных и живых
    const au = Object.keys(GameState.players).filter(u => {
        const p = GameState.players[u];
        return p?.alive && !p.isGhost && p.connected !== false;
    });
    if (!au.length) return null;
    au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0];
    const idx = au.indexOf(GameState.lastBet.player);
    return au[(idx + 1) % au.length];
}

function updateLastBetDisplay() {
    const el = document.getElementById('lastBetDisplay');
    if (!el) return;
    if (GameState.lastBet && GameState.players[GameState.lastBet.player]) {
        const p = GameState.players[GameState.lastBet.player];
        el.innerHTML = `${escapeHtml(p.name)}: ${GameState.lastBet.count}×<span style="font-size:2em;">${getDieEmoji(GameState.lastBet.value)}</span>`;
    } else {
        el.textContent = 'Последняя ставка: —';
    }
}

function renderPlayerList() {
    const container = document.getElementById('playerList');
    if (!container) return;
    const cu = getCurrentPlayerUid();
    const sortedUids = Object.keys(GameState.players).sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    const currentSet = new Set(sortedUids);

    // Очистка старых
    playerCardsCache.forEach((card, uid) => {
        if (!currentSet.has(uid)) { card.remove(); playerCardsCache.delete(uid); }
    });

    sortedUids.forEach(uid => {
        const p = GameState.players[uid];
        if (!p) return;
        let c = playerCardsCache.get(uid);
        if (!c) {
            c = document.createElement('div');
            c.className = 'player-card no-select';
            container.appendChild(c);
            playerCardsCache.set(uid, c);
        }
        
        c.className = 'player-card no-select';
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) c.classList.add('active');
        if (p.frozen) c.classList.add('frozen');
        if (p.cursed || p.evilEyed) c.classList.add('cursed');
        if (p.connected === false) c.style.opacity = '0.5'; // [7] Визуализация оффлайна

        c.innerHTML = '';
        const info = document.createElement('div'); info.className = 'player-info';
        
        const av = document.createElement('span'); av.className = 'player-avatar'; av.textContent = p.avatar || '🎲';
        info.appendChild(av);

        const nm = document.createElement('span');
        nm.className = `player-name shadow-${Math.min(p.poisons, p.maxLives||3)}`;
        nm.style.color = p.color || '#fff';
        nm.textContent = p.name || 'Игрок';
        if (p.isGhost) nm.appendChild(document.createTextNode(' 👻'));
        if (p.connected === false) nm.appendChild(document.createTextNode(' 💤'));
        info.appendChild(nm);

        const tm = document.createElement('span'); tm.className = 'sands-of-time'; tm.textContent = '⏳';
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) tm.style.display = 'inline';
        info.appendChild(tm);

        const pd = document.createElement('div'); pd.className = 'player-poisons';
        if (GameState.gameState !== 'lobby') {
            const ml = p.maxLives || 3;
            const ts = ml + (p.blood || 0);
            for (let j=0; j<ts; j++) {
                const sp = document.createElement('span');
                if (p.isGhost) { sp.className='icon-ghost'; sp.textContent='👻'; }
                else if (!p.alive) { sp.className='icon-dead'; sp.textContent='💀'; }
                else if (j < ml && j < p.poisons) { sp.className='icon-poison'; sp.textContent='🫙'; }
                else if (j === ml && p.blood > 0) { sp.className='icon-blood'; sp.textContent='🩸'; }
                else { sp.className='icon-life'; sp.textContent='🧪'; }
                pd.appendChild(sp);
            }
        }
        c.appendChild(info);
        c.appendChild(pd);
    });
}

function renderDiceRow() {
    const container = document.getElementById('diceContainer');
    if (!container) return;
    container.innerHTML = '';
    if (GameState.gameState !== 'betting' && GameState.gameState !== 'accusing') {
        container.style.display = 'none'; return;
    }
    container.style.display = 'flex';
    const m = GameState.players[GameState.myUid];
    if (!m) return;

    if (m.artifact) {
        const a = document.createElement('div');
        let usedClass = '';
        if (GameState.usedSpecialThisRound[m.artifact.id] && m.artifact.type === 'active') usedClass = 'used';
        else if (m.artifact.type === 'passive' && m.artifactUsed) usedClass = 'used';
        
        a.className = `die special ${m.artifact.type==='passive'?'passive':''} ${usedClass}`;
        a.textContent = m.artifact.emoji;
        
        const btn = document.createElement('div');
        btn.className = 'artifact-info-btn'; btn.textContent = '?';
        btn.onclick = () => showArtifactInfo(m.artifact);
        
        container.appendChild(btn);
        container.appendChild(a);
        
        if (!GameState.usedSpecialThisRound[m.artifact.id] || m.artifact.type === 'passive') {
            a.onclick = () => useArtifact(m.artifact.id);
        }
    }

    if (m.dice && m.dice.length) {
        m.dice.forEach(d => {
            const s = document.createElement('div'); s.className = 'die';
            s.textContent = m.blind ? '?' : getDieEmoji(parseInt(d)||1);
            if (m.frozen) s.classList.add('frozen');
            if (m.stunned) s.classList.add('stunned');
            container.appendChild(s);
        });
    }
}

function showArtifactInfo(art) {
    const t = document.getElementById('artifactInfoTitle');
    const d = document.getElementById('artifactInfoDesc');
    if (t && d) {
        t.textContent = `${art.emoji} ${art.name}`;
        d.innerHTML = `<strong>Тип:</strong> ${art.type==='active'?'Активный (1 раз за раунд)':'Пассивный (автоматически)'}<br><br><strong>Описание:</strong> ${escapeHtml(art.description)}`;
        document.getElementById('modalArtifactInfo').style.display = 'block';
    }
}

function updateControls() {
    const mt = isMyTurn();
    const m = GameState.players[GameState.myUid] || {};
    
    const bc = document.getElementById('betCount');
    const bv = document.getElementById('betValue');
    const bp = document.getElementById('btnPlaceBet');
    const ba = document.getElementById('btnAccuse');
    
    if (bc) bc.disabled = !mt || GameState.isGhost;
    if (bv) bv.disabled = !mt || GameState.isGhost;
    if (bp) bp.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting';
    if (ba) ba.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' || !GameState.lastBet || GameState.lastBet.player === GameState.myUid || m.cannotAccuse;

    const cc = !GameState.isGhost && GameState.gameState !== 'devil_deal';
    const ci = document.getElementById('chatInput');
    const cs = document.getElementById('btnSendChat');
    if (ci) ci.disabled = !cc;
    if (cs) cs.disabled = !cc;

    if (GameState.isGhost) {
        document.getElementById('diceContainer').style.display = 'none';
        document.getElementById('controlsRow').style.display = 'none';
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) { gp.style.display = 'flex'; updateGhostButtons(); }
    } else {
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) gp.style.display = 'none';
        document.getElementById('controlsRow').style.display = 'flex';
        if (mt && !GameState.isGhost && GameState.gameState === 'betting') populateBetSelects();
    }
}

function updateGhostButtons() {
    const m = GameState.players[GameState.myUid] || {};
    const u = m.usedAbilities || {};
    GHOST_ABILITIES.forEach(ab => {
        const b = document.getElementById('gh' + ab.id.charAt(0).toUpperCase() + ab.id.slice(1));
        if (b) {
            const il = ab.limit === 'once_per_ghost' && u[ab.id];
            b.disabled = il || GameState.gameState !== 'betting';
            b.textContent = il ? `${ab.emoji} ${ab.name} (исп.)` : `${ab.emoji} ${ab.name}`;
        }
    });
}

function populateBetSelects() {
    const sel = document.getElementById('betCount');
    if (!sel) return;
    sel.innerHTML = '<option value="">—</option>';
    const pc = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
    const mp = Math.max(pc * 10, 10);
    const limit = Math.max(mp + 20, 50);
    for (let i=1; i<=limit; i++) {
        const o = document.createElement('option'); o.value = i; o.textContent = i;
        sel.appendChild(o);
    }
    sel.value = GameState.lastBet ? Math.min(GameState.lastBet.count + 1, limit) : 1;
}

function isMyTurn() {
    if (GameState.isGhost || GameState.gameState !== 'betting') return false;
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost && GameState.players[u].connected !== false);
    if (!au.length) return false;
    au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0] === GameState.myUid;
    const idx = au.indexOf(GameState.lastBet.player);
    return au[(idx + 1) % au.length] === GameState.myUid;
}

// ============================================================
// ИГРОВАЯ ЛОГИКА
// ============================================================
function placeBet() {
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    const c = parseInt(document.getElementById('betCount').value);
    const v = parseInt(document.getElementById('betValue').value);
    const m = GameState.players[GameState.myUid];
    if (!m || isNaN(c) || isNaN(v)) return;

    if (v < 1 || v > 6) return showNotification('Номинал 1-6!', 'warning');
    if (GameState.lastBet && (c < GameState.lastBet.count || (c === GameState.lastBet.count && v <= GameState.lastBet.value))) {
        return showNotification('Ставка должна быть выше!', 'warning');
    }

    if (m.forcedBluff) {
        let nc = GameState.lastBet ? GameState.lastBet.count + 3 : 1;
        let nv = GameState.lastBet ? GameState.lastBet.value : 1;
        if (nv > 6) { nc++; nv = 1; }
        if (c < nc || (c === nc && v < nv)) return showNotification(`Обязательно: ${nc}×${getDieEmoji(nv)}`, 'warning');
    }

    const nb = { player: GameState.myUid, count: c, value: v, timestamp: Date.now() };
    GameState.lastBet = nb;
    GameState.players[GameState.myUid].lastBetInRound = nb;
    
    // [9] Batch update
    const updates = {};
    updates['lastBet'] = nb;
    updates['turnCounter'] = GameState.turnCounter + 1;
    updates[`players/${GameState.myUid}/lastBetInRound`] = nb;
    updates[`players/${GameState.myUid}/cursed`] = false;
    updates[`players/${GameState.myUid}/forcedBluff`] = false;
    
    safeUpdate(GameState.roomRef, updates, 'placeBet');
    GameState.turnCounter++;
    renderUI();
    playSound('bet');
    nextTurn();
}

function accuse() {
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    if (!GameState.lastBet || GameState.lastBet.player === GameState.myUid) return;

    GameState.gameState = 'accusing';
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: { accuser: GameState.myUid, accused: GameState.lastBet.player, bet: GameState.lastBet, timestamp: Date.now() }
    }, 'accuse');

    const t = GameState.players[GameState.lastBet.player]?.name || 'Противник';
    const phrases = [`${GameState.myName} бьёт по столу: "${t}, ложь!"`, `"${t}, вскрывайся!" — ${GameState.myName}`, `${GameState.myName} указывает: "${t}, блеф!"`, `"Не верю!" — ${GameState.myName}`];
    const ph = document.getElementById('accusationPhrase');
    if (ph) ph.textContent = phrases[Math.floor(Math.random()*phrases.length)];
    
    const res = document.getElementById('accusationResult');
    if (res) { res.textContent = 'Проверка кубиков...'; res.className = 'accusation-result'; }
    const eff = document.getElementById('accusationEffects');
    if (eff) eff.innerHTML = '<h4 style="margin:5px 0; color:#ffd700;">📋 Эффекты:</h4>';

    let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
    Object.values(GameState.players).forEach(p => {
        if (p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d)||1]++);
    });
    const sm = Object.keys(ct).filter(k=>ct[k]>0).map(k=>`${ct[k]}x${getDieEmoji(k)}`).join('  ');
    const sum = document.getElementById('accusationDiceSummary');
    if (sum) sum.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;

    document.getElementById('accusationPanel').style.display = 'block';
    playSound('accuse');

    if (GameState.timers.accusation) clearTimeout(GameState.timers.accusation);
    GameState.timers.accusation = setTimeout(() => resolveAccusation(GameState.lastBet.player), 3000);
}

function resolveAccusation(accusedUid) {
    safeUpdate(GameState.roomRef, { accusationResult: null, accusingData: null }, 'resolve-start');
    const tv = GameState.lastBet.value;
    const accused = GameState.players[accusedUid];

    let totalWithoutWild = 0;
    Object.values(GameState.players).forEach(p => {
        if (!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { if (parseInt(d) === tv) totalWithoutWild++; });
    });

    const isLieWithoutWild = totalWithoutWild < GameState.lastBet.count;
    let total = totalWithoutWild;
    let wildSaved = false;
    if (accused?.artifact?.id === 'wildDie') { total++; wildSaved = true; }

    let isLie = total < GameState.lastBet.count;
    if (accused?.cursed || accused?.familiarCursed) isLie = true;

    const r = document.getElementById('accusationResult');
    const e = document.getElementById('accusationEffects');

    // [9] Batch updates for effects
    const updates = {};

    if (isLie) {
        if (r) { r.textContent = '✅ ЛОЖНАЯ СТАВКА!'; r.className = 'accusation-result effect-green'; }
        applyPoison(accusedUid, 1, 'Ложная ставка');
        addEffectLine(`🔴 ${accused?.name || 'Цель'} получает +1 яд`, e);

        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(GameState.myUid, 1);
            applyPoison(accusedUid, 2, 'Кровожадность');
            addEffectLine(`🟢 ${GameState.myName} +1 кровь | 🔴 ${accused.name} +2 яда`, e);
        } else if (accused?.artifact?.id === 'deceiver') {
            applyPoison(GameState.myUid, 2, 'Обманщик');
            addEffectLine(`🟣 ${accused.name}: Обманщик | 🔴 ${GameState.myName} +2 яда`, e);
        } else if (accused?.darkPact) {
            applyPoison(accusedUid, 1, 'Тёмный Договор');
            addEffectLine(`🟣 ${accused.name}: Тёмный Договор → +1 доп. яд`, e);
        }

        if (wildSaved && isLieWithoutWild && !isLie) {
            applyPoison(GameState.myUid, 2, 'Дикий Кубик спас');
            addEffectLine(`🔵 Дикий Кубик спас ставку! ${GameState.myName} +2 яда`, e);
        }
    } else {
        if (r) { r.textContent = '❌ ПРАВДИВАЯ СТАВКА!'; r.className = 'accusation-result effect-red'; }
        applyPoison(GameState.myUid, 1, 'Ошибочное обвинение');
        addEffectLine(`🔴 ${GameState.myName} получает +1 яд`, e);

        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
            addEffectLine(`🟢 ${accused.name} получает +1 кровь`, e);
        }
        if (accused?.darkPact) {
            updates[`players/${accusedUid}/darkPact`] = false;
            updates[`players/${accusedUid}/darkPactShield`] = true;
            updates[`players/${accusedUid}/darkPactRound`] = GameState.roundNumber + 1;
            addEffectLine(`🟡 ${accused.name}: Тёмный Договор → щит`, e);
        }
        if (wildSaved && !isLieWithoutWild) addEffectLine(`🔵 Дикий Кубик был, но ставка и так верна`, e);
    }

    const html = e?.innerHTML || '';
    updates['accusationResult'] = { isLie, effects: html, resultText: r?.textContent||'', resultClass: r?.className||'' };
    safeUpdate(GameState.roomRef, updates, 'resolve-result');

    // [4] Задержка перед следующим раундом, чтобы checkDeath успел обработаться
    setTimeout(() => {
        document.getElementById('accusationPanel').style.display = 'none';
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, { state: 'betting', accusingData: null, accusationResult: null }, 'resolve-end');
        checkDeath();
        // Небольшая пауза перед стартом нового раунда
        setTimeout(startNewRound, 1000);
    }, 2000);
}

function addEffectLine(t, c) {
    if (c) { const d = document.createElement('div'); d.textContent = t; c.appendChild(d); }
}

function applyPoison(uid, amt, reason) {
    const p = GameState.players[uid];
    if (!p) return;

    if (p.devilShield && p.devilShieldRound === GameState.roundNumber) {
        appendChat(`🛡️ ${p.name} защищён ЩИТОМ ДЬЯВОЛА!`, 'system');
        safeUpdate(GameState.roomRef.child('players').child(uid), { devilShield: false }, 'shield');
        return;
    }
    if (p.defenderActive) {
        appendChat(`🛡️ ${p.name} защищён ЗАЩИТНИКОМ!`, 'system');
        safeUpdate(GameState.roomRef.child('players').child(uid), { defenderActive: false }, 'defender');
        return;
    }

    let rem = amt;
    if (p.blood > 0) {
        const u = Math.min(p.blood, rem);
        rem -= u;
        safeUpdate(GameState.roomRef.child('players').child(uid), { blood: p.blood - u }, 'blood');
        appendChat(`🩸 ${p.name} потратил ${u} крови`, 'system');
    }
    if (rem > 0) {
        safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons + rem }, 'poison');
        appendChat(`☠️ ${p.name} получает +${rem} яд (${reason})`, 'death');
        playSound('poison');
        renderUI();
    }
}

function applyBlood(uid, amt) {
    const p = GameState.players[uid];
    if (!p) return;
    safeUpdate(GameState.roomRef.child('players').child(uid), { blood: (p.blood||0) + amt }, 'blood-gain');
    appendChat(`🩸 ${p.name} получает +${amt} кровь!`, 'system');
    playSound('blood');
    renderUI();
}

// [1][2] ИСПРАВЛЕННАЯ ЛОГИКА ПРИЗРАКОВ И СМЕРТИ
function checkDeath() {
    if (GameState.gameState === 'ended') return;

    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (!p || p.isGhost || !p.alive) return;
        
        const ml = p.maxLives || 3;
        if (p.poisons >= ml) {
            // Логика смерти:
            // 1. Если лимит сделок исчерпан -> Сразу призрак
            // 2. Если сделки есть -> Сделка с дьяволом (для живых) или авто-решение (для ботов)
            
            if (p.devilDealsUsed >= 2) {
                turnToGhost(uid);
            } else {
                if (p.isBot) {
                    // Боты автоматически пытаются заключить сделку (упрощенно: 50% успех на средней сложности)
                    // Для простоты в этом патче: бот сразу становится призраком если сложность < 2, иначе 50% шанс выжить
                    const diff = GameState.bots[uid]?.difficulty ?? 2;
                    const surviveChance = [0.2, 0.5, 0.7, 0.9][diff];
                    
                    if (Math.random() < surviveChance) {
                        // Бот "выиграл" сделку
                        const updates = {
                            poisons: 0, blood: 0, alive: true, isGhost: false,
                            artifact: null, dice: Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),
                            devilDealsUsed: (p.devilDealsUsed||0) + 1
                        };
                        safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'bot-deal-win');
                        appendChat(`😈 ${p.name} ВЫИГРАЛ сделку с Дьяволом!`, 'system');
                        playSound('devilWin');
                    } else {
                        turnToGhost(uid);
                    }
                } else {
                    // Живой игрок
                    if (uid === GameState.myUid) startDevilDeal(uid);
                    else appendChat(`😈 ${p.name} отправляется на Сделку с Дьяволом...`, 'death');
                }
            }
        }
    });

    const humans = Object.values(GameState.players).filter(p => p?.alive && !p.isGhost);
    if (humans.length === 1 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'victory');
        appendChat(`🏆 ${humans[0].name} победил!`, 'system');
        playSound('win');
        showConfetti();
    } else if (humans.length === 0 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'draw');
        appendChat('💀 Ничья — все мертвы или призраки!', 'system');
    }
}

function turnToGhost(uid) {
    const updates = {
        alive: false, isGhost: true, poisons: 0, artifact: null, blood: 0,
        cursed: false, frozen: false, defenderActive: false, stunned: false, blind: false,
        devilShield: false, usedAbilities: {}, lastBetInRound: null, dice: []
    };
    safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'turnToGhost');
    appendChat(`👻 ${GameState.players[uid].name} стал призраком!`, 'death');
    playSound('ghost');
    checkVengeance(uid);
    renderUI();
    if (uid === GameState.myUid) {
        document.getElementById('ghostAbilitiesPanel').style.display = 'flex';
        updateGhostButtons();
    }
}

// [2] НОВАЯ СДЕЛКА С ДЬЯВОЛОМ
function startDevilDeal(uid) {
    if (uid !== GameState.myUid) return;
    GameState.gameState = 'devil_deal';
    safeUpdate(GameState.roomRef, { state: 'devil_deal' }, 'deal-start');

    const dealsUsed = GameState.devilDealsUsed || 0;
    const options = [
        { id: 'lose_dice', title: '🎲 Потерять 2 кубика навсегда', desc: 'Воскреснуть с 3 кубиками вместо 5', apply: () => ({ poisons:0, blood:0, alive:true, isGhost:false, artifact:null, dice:Array(3).fill(0).map(()=>Math.floor(Math.random()*6)+1), maxDice:3, devilDealsUsed:dealsUsed+1 }) },
        { id: 'lose_artifacts', title: '🚫 Потерять все артефакты', desc: 'Больше не получать артефакты до конца игры', apply: () => ({ poisons:0, blood:0, alive:true, isGhost:false, artifact:null, dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1), noArtifactsForever:true, devilDealsUsed:dealsUsed+1 }) },
        { id: 'lose_maxlife', title: '💔 Потерять 1 макс. жизнь', desc: `Воскреснуть с ${Math.max(1, (GameState.defaultLives||3)-1)} макс. жизнями`, apply: () => ({ poisons:0, blood:0, alive:true, isGhost:false, artifact:null, dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1), maxLives:Math.max(1,(GameState.defaultLives||3)-1), devilDealsUsed:dealsUsed+1 }) }
    ];

    const div = document.getElementById('devilOptions');
    if (div) {
        div.innerHTML = options.map(o => `<button class="devil-opt" data-id="${o.id}"><strong>${o.title}</strong>${o.desc}</button>`).join('');
        div.querySelectorAll('.devil-opt').forEach(btn => {
            btn.onclick = () => {
                const opt = options.find(o => o.id === btn.dataset.id);
                if (opt) resolveDevilDeal(opt.apply());
            };
        });
    }

    const refuse = document.getElementById('btnRefuseDeal');
    if (refuse) refuse.onclick = () => {
        turnToGhost(uid);
        appendChat(`😈 ${GameState.myName} отказался от сделки!`, 'death');
        playSound('devilLose');
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-refuse');
        document.getElementById('devilModal').style.display = 'none';
        setTimeout(startNewRound, 2500);
    };

    const fi = document.getElementById('devilFire');
    if (fi) { fi.style.animation='none'; fi.offsetHeight; fi.style.animation='fireRise 30s linear forwards'; }
    document.getElementById('devilModal').style.display = 'block';
    playSound('devil');
    appendChat(`😈 ${GameState.myName} заключает сделку...`, 'death');
}

function resolveDevilDeal(updateData) {
    document.getElementById('devilModal').style.display = 'none';
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), updateData, 'deal-resolve');
    renderUI();
    appendChat(`😈 ${GameState.myName} ВЫИГРАЛ сделку!`, 'system');
    playSound('devilWin');
    GameState.gameState = 'betting';
    safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-end');
    setTimeout(startNewRound, 2500);
}

function checkVengeance(uid) {
    Object.keys(GameState.players).forEach(u => {
        const p = GameState.players[u];
        if (p?.isGhost && p.ghostTarget === uid) {
            const updates = {
                alive: true, isGhost: false,
                poisons: (p.maxLives||3) - 1, // 1 жизнь
                blood: 0, ghostTarget: null, artifact: null, usedAbilities: {},
                dice: Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1)
            };
            safeUpdate(GameState.roomRef.child('players').child(u), updates, 'vengeance');
            appendChat(`⚔️ ПРИЗРАК ${p.name} ВОСКРЕС через МЕСТЬ!`, 'system');
            playSound('resurrection');
        }
    });
}

async function startNewRound() {
    const snap = await GameState.roomRef.child('settings').once('value');
    const s = snap.val();
    if (s) {
        GameState.specialDiceEnabled = s.specialDiceEnabled !== false;
        if (s.defaultLives) GameState.defaultLives = s.defaultLives;
    }
    if (GameState.gameState !== 'betting' && GameState.gameState !== 'lobby') return;
    
    const alive = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (alive.length < 1) return;

    const lastBetCopy = GameState.lastBet ? {...GameState.lastBet} : null;
    GameState.roundNumber++;
    GameState.turnCounter++;
    GameState.thiefUsedThisRound = false;
    GameState.sniperShotUsedThisRound = false;
    GameState.usedSpecialThisRound = {};
    GameState.spyMemory = {};

    const updates = {};
    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (p?.alive && !p.isGhost) {
            const hist = GameState.artifactHistory.filter(a => a.endsWith('_'+uid)).slice(-2);
            const avail = ARTIFACTS.filter(a => !hist.includes(a.id+'_'+uid));
            const art = avail.length ? avail[Math.floor(Math.random()*avail.length)] : ARTIFACTS[Math.floor(Math.random()*ARTIFACTS.length)];
            GameState.artifactHistory.push(art.id+'_'+uid);

            const numDice = p.maxDice || 5;
            let dc = Array(numDice).fill(0).map(()=>Math.floor(Math.random()*6)+1);
            if (p.evilEyed) dc = dc.map(()=>Math.random()<0.7?Math.floor(Math.random()*3)+1:Math.floor(Math.random()*3)+4);

            // [5] Проверка noArtifactsForever
            const artData = (GameState.specialDiceEnabled && !p.noArtifactsForever) ? art : null;

            updates[`players/${uid}/dice`] = dc;
            updates[`players/${uid}/artifact`] = artData;
            updates[`players/${uid}/usedSpecialThisRound`] = {};
            updates[`players/${uid}/lastBetInRound`] = null;
            updates[`players/${uid}/cursed`] = false;
            updates[`players/${uid}/frozen`] = false;
            updates[`players/${uid}/defenderActive`] = (artData?.id === 'defender');
            updates[`players/${uid}/stunned`] = false;
            updates[`players/${uid}/blind`] = false;
            updates[`players/${uid}/darkPact`] = (artData?.id === 'darkPact');
            updates[`players/${uid}/darkPactShield`] = false;
            updates[`players/${uid}/devilShield`] = false;
            updates[`players/${uid}/evilEyed`] = false;
            updates[`players/${uid}/forcedBluff`] = false;
            updates[`players/${uid}/cannotAccuse`] = false;
            updates[`players/${uid}/sniperShotUsedThisRound`] = false;
            updates[`players/${uid}/blood`] = p.blood || 0;
            updates[`players/${uid}/poisons`] = p.poisons;
            updates[`players/${uid}/maxLives`] = p.maxLives || GameState.defaultLives;
            // Сохраняем maxDice и noArtifactsForever явно [3][5]
            if (p.maxDice) updates[`players/${uid}/maxDice`] = p.maxDice;
            if (p.noArtifactsForever) updates[`players/${uid}/noArtifactsForever`] = true;
        }
    });

    if (GameState.artifactHistory.length > MAX_HISTORY) GameState.artifactHistory = GameState.artifactHistory.slice(-MAX_HISTORY);
    updates.round = GameState.roundNumber;
    updates.state = 'betting';
    updates.lastBet = null;
    updates.turnCounter = GameState.turnCounter;
    updates.artifactHistory = GameState.artifactHistory;

    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (au.length) {
        au.sort((a,b)=>(GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0));
        if (lastBetCopy && lastBetCopy.player) {
            const idx = au.indexOf(lastBetCopy.player);
            updates.currentPlayerUid = idx !== -1 ? au[(idx+1)%au.length] : au[0];
        } else {
            updates.currentPlayerUid = au[0];
        }
        GameState.currentPlayerUid = updates.currentPlayerUid;
    }

    safeUpdate(GameState.roomRef, updates, 'newRound');
    appendChat(`🎲 === РАУНД ${GameState.roundNumber} НАЧАЛСЯ! ===`, 'system');
    playSound('round');
    
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

function nextTurn() {
    if (GameState.gameState !== 'betting') return;
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost && GameState.players[u].connected !== false);
    if (!au.length) return;
    au.sort((a,b)=>(GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0));
    const idx = au.indexOf(GameState.currentPlayerUid);
    GameState.currentPlayerUid = au[(idx+1)%au.length];
    GameState.turnCounter++;
    safeUpdate(GameState.roomRef, { currentPlayerUid: GameState.currentPlayerUid, turnCounter: GameState.turnCounter }, 'nextTurn');
    renderUI();
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

// ============================================================
// БОТЫ [G]
// ============================================================
function addBot() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!', 'warning');
    const cnt = Object.keys(GameState.players).filter(u => GameState.players[u]?.isBot).length;
    if (cnt >= 5) return showNotification('Максимум 5 ботов', 'warning');
    
    const id = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    const data = {
        name: '🤖 Бот', uid: id, avatar: '🤖', color: '#aaa', dice: [], poisons: 0, blood: 0,
        alive: true, isGhost: false, artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0, maxLives: GameState.defaultLives,
        isBot: true, botDifficulty: GameState.botDifficulty, joinedAt: Date.now(),
        cursed:false, frozen:false, defenderActive:false, stunned:false, blind:false,
        darkPact:false, darkPactShield:false, devilShield:false, evilEyed:false,
        forcedBluff:false, cannotAccuse:false, sniperShotUsedThisRound:false, familiarCursed:false, usedAbilities:{}
    };
    GameState.bots[id] = { difficulty: GameState.botDifficulty, knownDice: {} };
    safeSet(GameState.roomRef.child('players').child(id), data, 'addBot');
    appendChat(`🤖 Бот (${botDifficultyNames[GameState.botDifficulty]}) присоединился`, 'system');
}

function removeAllBots() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!', 'warning');
    Object.keys(GameState.players).forEach(uid => {
        if (GameState.players[uid]?.isBot) GameState.roomRef.child('players').child(uid).remove();
    });
    GameState.bots = {}; GameState.expertKnownDice = {};
    appendChat('🤖 Все боты удалены', 'system');
}

function setBotDifficulty(lvl) {
    GameState.botDifficulty = lvl;
    const el = document.getElementById('botDifficultyLabel');
    if (el) el.innerText = botDifficultyNames[lvl];
    appendChat(`Сложность ботов: ${botDifficultyNames[lvl]}`, 'system');
}

function botTurn(botId) {
    if (GameState.isBotThinking) return;
    GameState.isBotThinking = true;
    const diff = GameState.bots[botId]?.difficulty ?? 2;
    const delay = [8000,6000,6000,4000][diff] + Math.random()*2000;
    const maxDelay = 12000;

    const safety = setTimeout(() => {
        if (GameState.isBotThinking) {
            logError(`⚠️ Бот ${botId} завис`);
            GameState.isBotThinking = false;
            nextTurn();
        }
    }, maxDelay);

    const main = setTimeout(() => {
        clearTimeout(safety);
        if (GameState.gameState !== 'betting' || GameState.currentPlayerUid !== botId) { GameState.isBotThinking = false; return; }
        const bot = GameState.players[botId];
        if (!bot || bot.isGhost) { GameState.isBotThinking = false; nextTurn(); return; }
        
        if (bot.artifact && bot.artifact.type === 'active') botUseArtifact(botId);
        if (bot.isGhost) botUseGhostAbility(botId);
        botMakeDecision(botId);
    }, Math.min(delay, maxDelay-1000));

    GameState.timers.bot.push(safety, main);
}

function botMakeDecision(botId) {
    const bot = GameState.players[botId];
    if (!bot || bot.isGhost) { GameState.isBotThinking = false; nextTurn(); return; }
    const diff = GameState.bots[botId]?.difficulty ?? 2;
    const accProb = [0.2,0.35,0.5,0.7][diff];
    let shouldAccuse = false;
    
    if (GameState.lastBet && GameState.lastBet.player !== botId) {
        if (diff === 3) shouldAccuse = evaluateBetTruthfulness(GameState.lastBet, botId);
        else {
            shouldAccuse = Math.random() < accProb;
            if (diff === 2 && !shouldAccuse) shouldAccuse = evaluateBetTruthfulness(GameState.lastBet, botId);
        }
    }

    if (shouldAccuse && GameState.lastBet && GameState.lastBet.player !== botId) {
        accuseFromBot(botId);
        const msgs = ['Блеф!','Я знаю твои кубики!','Вскрывайся!','Слишком рискованно!'];
        if (Math.random()<0.3 && diff===3) appendChat(`🤖 ${bot.name}: ${msgs[Math.floor(Math.random()*msgs.length)]}`, 'system');
        else appendChat(`🤖 ${bot.name} обвиняет ${GameState.players[GameState.lastBet.player]?.name}!`, 'system');
        GameState.isBotThinking = false;
        return;
    }

    const pc = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
    const maxPos = Math.max(pc * 10, 10);
    let nc, nv;
    
    if (!GameState.lastBet) {
        if (diff === 0) { nc = Math.floor(Math.random()*Math.min(maxPos,20))+1; nv = Math.floor(Math.random()*6)+1; }
        else {
            const best = getBestValue(bot.dice);
            nc = Math.min(maxPos, Math.max(1, best.count + (diff===1?0:Math.floor(Math.random()*3))));
            nv = best.value;
        }
    } else {
        const counts = {};
        bot.dice.forEach(d => counts[d]=(counts[d]||0)+1);
        let bv=1, bc=0;
        for(let v=1;v<=6;v++) if(counts[v]>bc){bc=counts[v];bv=v;}
        let bluff = 0;
        if (diff===0) bluff = Math.floor(Math.random()*5)-1;
        else if (diff===1) bluff = Math.floor(Math.random()*3);
        else if (diff===2) bluff = Math.floor(Math.random()*4);
        else {
            const tt = estimateTrueCount(GameState.lastBet.value, botId);
            bluff = GameState.lastBet.count <= tt ? 1 : -1;
        }
        nc = Math.min(maxPos+10, Math.max(1, bc+bluff));
        if (nc < GameState.lastBet.count) nc = GameState.lastBet.count + 1;
        nv = bv;
        if (nc === GameState.lastBet.count && nv <= GameState.lastBet.value) nv = GameState.lastBet.value + 1;
        if (nv > 6) { if (nc < maxPos+10) { nv=1; nc++; } else nv=6; }
    }

    const bet = { player: botId, count: nc, value: nv, timestamp: Date.now() };
    GameState.lastBet = bet;
    GameState.players[botId].lastBetInRound = bet;
    
    const updates = { lastBet: bet, turnCounter: GameState.turnCounter+1, [`players/${botId}/lastBetInRound`]: bet };
    safeUpdate(GameState.roomRef, updates, 'bot-bet');
    
    appendChat(`🤖 ${bot.name} ставит ${nc}×${getDieEmoji(nv)}`, 'system');
    GameState.turnCounter++;
    GameState.isBotThinking = false;
    nextTurn();
}

function getBestValue(dice) {
    const c={}; dice.forEach(d=>c[d]=(c[d]||0)+1);
    let b=1, bc=0; for(let v=1;v<=6;v++) if(c[v]>bc){bc=c[v];b=v;}
    return {count:bc, value:b};
}

function estimateTrueCount(val, botId) {
    let t=0;
    for(let uid in GameState.players) {
        const p = GameState.players[uid];
        if(!p.alive || p.isGhost) continue;
        if(uid===botId) t += p.dice.filter(d=>d===val).length;
        else {
            const k = getKnownDiceForExpert(botId, uid);
            if(k) { k.forEach(d=>{if(d===val)t++;}); t += k.filter(d=>d===null).length*(1/6); }
            else t += p.dice.length*(1/6);
        }
    }
    return Math.round(t);
}

function updateExpertKnowledge(botId, tid, dice) {
    if(GameState.bots[botId]?.difficulty!==3) return;
    if(!GameState.expertKnownDice[botId]) GameState.expertKnownDice[botId]={};
    const idx=[0,1,2,3,4].sort(()=>Math.random()-0.5).slice(0,4);
    const k=Array(5).fill(null); idx.forEach(i=>k[i]=dice[i]);
    GameState.expertKnownDice[botId][tid]=k;
}

function getKnownDiceForExpert(botId, tid) {
    if(GameState.bots[botId]?.difficulty!==3) return null;
    return GameState.expertKnownDice[botId]?.[tid] || null;
}

function evaluateBetTruthfulness(bet, botId) {
    const bot = GameState.players[botId];
    const diff = GameState.bots[botId]?.difficulty ?? 2;
    if(diff===0) return Math.random()<0.2;
    let tk=0, tp=0, tv=bet.value;
    for(let uid in GameState.players) {
        if(uid===botId) continue;
        const p=GameState.players[uid]; if(!p.alive||p.isGhost) continue;
        const kd = getKnownDiceForExpert(botId, uid);
        if(diff===3 && kd) { kd.forEach(d=>{if(d&&d===tv)tk++;}); tp+=kd.filter(d=>d===null).length; }
        else tp+=p.dice.length;
    }
    tk += bot.dice.filter(d=>d===tv).length;
    if(diff===3 && tp>0) {
        const min=tk, max=tk+tp;
        if(bet.count<=min) return false; if(bet.count>max) return true;
        return (max-bet.count)/(max-min+1) > 0.6;
    } else if(diff===2) {
        const est = tk + tp*(1/6);
        const var_ = Math.sqrt(tp*(1/6)*(5/6));
        return (bet.count-est)/var_ > 1.5;
    }
    return bet.count > tk + 2;
}

function botUseArtifact(botId) {
    const bot = GameState.players[botId];
    if(!bot||bot.isGhost||!bot.artifact||bot.artifact.type!=='active') return false;
    const diff = GameState.bots[botId]?.difficulty ?? 2;
    if(diff===0) return false;
    if(Math.random() > [0,0.3,0.7,1.0][diff]) return false;
    
    const art = bot.artifact;
    const targets = Object.keys(GameState.players).filter(u=>u!==botId&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
    if(!targets.length) return false;
    
    let bt = null;
    if(diff===3) {
        if(['target','curse','ice','evilEye'].includes(art.id)) bt = targets.sort((a,b)=>GameState.players[b].poisons-GameState.players[a].poisons)[0];
        else if(art.id==='blessing') bt = bot.poisons>0 ? botId : (targets.find(u=>GameState.players[u].poisons>0)||null);
        else if(art.id==='thief') { const wa=targets.filter(u=>GameState.players[u].artifact&&GameState.players[u].artifact.type==='active'&&!GameState.usedSpecialThisRound[GameState.players[u].artifact.id]); if(wa.length) bt=wa[0]; }
        else if(art.id==='double') { const wb=targets.filter(u=>GameState.players[u].lastBetInRound); if(wb.length) bt=wb[0]; }
    } else bt = targets[Math.floor(Math.random()*targets.length)];
    
    if(!bt && !['fireball','luck'].includes(art.id)) return false;

    if(art.id==='target') {
        const cv=getBestValue(bot.dice).value;
        const tp=GameState.players[bt];
        const idx=tp.dice.indexOf(cv);
        if(idx!==-1) tp.dice.splice(idx,1);
        safeUpdate(GameState.roomRef.child('players').child(bt), {dice:tp.dice}, 'bot-target');
        appendChat(`🤖 ${bot.name} использовал ${art.name} на ${tp.name}`, 'system');
    } else if(art.id==='fireball'||art.id==='luck') {
        const nd=bot.dice.map(()=>art.id==='luck'?(Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1):Math.floor(Math.random()*6)+1);
        safeUpdate(GameState.roomRef.child('players').child(botId), {dice:nd}, 'bot-fireball');
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id==='blessing') {
        const tid = bt===botId ? botId : bt;
        if(tid) safeUpdate(GameState.roomRef.child('players').child(tid), {poisons:Math.max(0,GameState.players[tid].poisons-1)}, 'bot-bless');
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id==='thief'&&bt&&GameState.players[bt].artifact) {
        const st=GameState.players[bt].artifact;
        safeUpdate(GameState.roomRef.child('players').child(botId), {artifact:st, usedSpecialThisRound:GameState.usedSpecialThisRound}, 'bot-thief');
        safeUpdate(GameState.roomRef.child('players').child(bt), {artifact:null}, 'bot-thief-v');
        appendChat(`🤖 ${bot.name} украл ${st.emoji} у ${GameState.players[bt].name}`, 'system');
    } else if(art.id==='curse'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {cursed:true}, 'bot-curse');
        appendChat(`🤖 ${bot.name} проклял ${GameState.players[bt].name}`, 'system');
    } else if(art.id==='ice'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {frozen:true}, 'bot-ice');
        appendChat(`🤖 ${bot.name} заморозил ${GameState.players[bt].name}`, 'system');
    } else if(art.id==='evilEye'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {evilEyed:true}, 'bot-eye');
        appendChat(`🤖 ${bot.name} наслал сглаз на ${GameState.players[bt].name}`, 'system');
    } else if(art.id==='double'&&bt&&GameState.players[bt].lastBetInRound) {
        const lb=GameState.players[bt].lastBetInRound;
        let nc=lb.count, nv=lb.value;
        const pc=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost).length;
        const mp=Math.max(pc*10,10);
        if(GameState.lastBet&&(nc<GameState.lastBet.count||(nc===GameState.lastBet.count&&nv<=GameState.lastBet.value))) {
            if(nc<mp+10) nc++; else {nv=Math.min(6,nv+1);nc=1;}
        }
        const nb={player:botId,count:nc,value:nv};
        GameState.lastBet=nb; GameState.players[botId].lastBetInRound=nb;
        safeUpdate(GameState.roomRef, {lastBet:nb}, 'bot-double');
        safeUpdate(GameState.roomRef.child('players').child(botId), {lastBetInRound:nb}, 'bot-double-p');
        appendChat(`🤖 ${bot.name} скопировал ставку ${GameState.players[bt].name}`, 'system');
    }
    
    GameState.usedSpecialThisRound[art.id]=true;
    safeUpdate(GameState.roomRef.child('players').child(botId), {artifact:null, usedSpecialThisRound:GameState.usedSpecialThisRound}, 'bot-art-end');
    return true;
}

function botUseGhostAbility(botId) {
    const bot=GameState.players[botId]; if(!bot.isGhost) return;
    const diff=GameState.bots[botId]?.difficulty??2; if(diff===0) return;
    const abs=GHOST_ABILITIES.filter(ab=>!bot.usedAbilities?.[ab.id]); if(!abs.length) return;
    if(Math.random()>[0,0.25,0.6,1.0][diff]) return;
    
    const ab=abs[Math.floor(Math.random()*abs.length)];
    if(ab.id==='oathOfVengeance') {
        const tgts=Object.keys(GameState.players).filter(u=>u!==botId&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
        if(tgts.length) {
            const t=diff===3?tgts.sort((a,b)=>GameState.players[b].poisons-GameState.players[a].poisons)[0]:tgts[0];
            safeUpdate(GameState.roomRef.child('players').child(botId), {ghostTarget:t}, 'bot-oath');
            appendChat(`⚔️ Призрак ${bot.name} выбрал цель: ${GameState.players[t].name}`, 'ghost');
        }
    } else if(ab.id==='familiarCurse') {
        const tgts=Object.keys(GameState.players).filter(u=>u!==botId&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
        if(tgts.length) {
            const t=tgts[Math.floor(Math.random()*tgts.length)];
            safeUpdate(GameState.roomRef.child('players').child(t), {familiarCursed:true}, 'bot-fam');
            appendChat(`🔮 Призрак ${bot.name} проклял ${GameState.players[t].name}`, 'ghost');
        }
    } else if(ab.id==='poltergeist') {
        const al=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
        if(al.length) {
            const r=Math.random();
            if(r<0.33) { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'bot-pol-s'); appendChat(`🌀 Призрак ${bot.name}: саботаж ${GameState.players[t].name}`, 'ghost'); }
            else if(r<0.66) { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:[6,6,6,6,6],evilEyed:false}, 'bot-pol-b'); appendChat(`🌀 Призрак ${bot.name}: благословение ${GameState.players[t].name}`, 'ghost'); }
            else { al.forEach(u=>safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'bot-pol-sh')); appendChat(`🌀 Призрак ${bot.name}: перемешивание`, 'ghost'); }
        }
    } else if(ab.id==='soulReaper') {
        let killed=false;
        for(let uid in GameState.players) {
            const p=GameState.players[uid];
            if(p.alive&&!p.isGhost&&Math.random()<0.2) {
                const r=Math.random();
                if(r<0.1) { applyPoison(uid,1,'Жатва'); killed=true; }
                else if(r<0.35&&p.artifact) { safeUpdate(GameState.roomRef.child('players').child(uid), {artifact:null}, 'bot-rep-a'); appendChat(`💀 ${p.name}: потерял артефакт`, 'ghost'); }
                else if(r<0.6&&p.poisons>0) { safeUpdate(GameState.roomRef.child('players').child(uid), {poisons:p.poisons-1}, 'bot-rep-h'); appendChat(`💀 ${p.name}: исцелился`, 'ghost'); }
                else if(r<0.85) { safeUpdate(GameState.roomRef.child('players').child(uid), {stunned:true}, 'bot-rep-st'); appendChat(`💀 ${p.name}: ошеломлён`, 'ghost'); }
                else { safeUpdate(GameState.roomRef.child('players').child(uid), {blind:true}, 'bot-rep-bl'); appendChat(`💀 ${p.name}: ослеплён`, 'ghost'); }
            }
        }
        if(killed) {
            const up={alive:true,isGhost:false,poisons:(bot.maxLives||3)-1,blood:0,artifact:null,dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),usedAbilities:{}};
            safeUpdate(GameState.roomRef.child('players').child(botId), up, 'bot-rep-rev');
            appendChat(`💀 Призрак ${bot.name} воскрес!`, 'ghost'); playSound('resurrection');
        }
    }
    const ua=bot.usedAbilities||{}; ua[ab.id]=true;
    safeUpdate(GameState.roomRef.child('players').child(botId), {usedAbilities:ua}, 'bot-ghost-end');
}

function accuseFromBot(botId) {
    if(!GameState.lastBet||GameState.lastBet.player===botId) return;
    const auid=GameState.lastBet.player;
    const tv=GameState.lastBet.value;
    const acc=GameState.players[auid];
    
    let tw=0;
    Object.values(GameState.players).forEach(p=>{if(p?.alive&&!p.isGhost)p.dice.forEach(d=>{if(parseInt(d)===tv)tw++;});});
    const ilw=tw<GameState.lastBet.count;
    let tot=tw; let ws=false;
    if(acc?.artifact?.id==='wildDie'){tot++;ws=true;}
    
    let isLie=tot<GameState.lastBet.count;
    if(acc?.cursed||acc?.familiarCursed) isLie=true;
    
    if(isLie) {
        applyPoison(auid,1,'Ложная (бот)');
        if(acc?.artifact?.id==='bloodthirst'){applyBlood(botId,1);applyPoison(auid,2,'Кровь (бот)');}
        else if(acc?.artifact?.id==='deceiver') applyPoison(botId,2,'Обманщик (бот)');
        else if(acc?.darkPact) applyPoison(auid,1,'Договор (бот)');
        if(ws&&ilw&&!isLie) applyPoison(botId,2,'Дикий (бот)');
    } else {
        applyPoison(botId,1,'Ошибка (бот)');
        if(acc?.artifact?.id==='bloodthirst') applyBlood(auid,1);
        if(acc?.darkPact) {
            const up={darkPact:false,darkPactShield:true,darkPactRound:GameState.roundNumber+1};
            safeUpdate(GameState.roomRef.child('players').child(auid), up, 'bot-acc-dp');
        }
    }
    GameState.gameState='betting';
    safeUpdate(GameState.roomRef, {state:'betting'}, 'bot-acc-end');
    checkDeath();
    setTimeout(startNewRound, 2500);
}

// ============================================================
// ГОЛОСОВАНИЕ
// ============================================================
function startVoteKick() {
    if(Date.now()-GameState.lastVoteEndTime<VOTE_COOLDOWN) return showNotification(`Голосование через ${Math.ceil((VOTE_COOLDOWN-(Date.now()-GameState.lastVoteEndTime))/1000)} сек`, 'warning');
    const tg=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&!GameState.players[u]?.isBot&&GameState.players[u]?.alive);
    if(!tg.length) return showNotification('Нет целей!', 'warning');
    const ld=document.getElementById('voteTargetsList'); if(!ld) return;
    ld.innerHTML='';
    tg.forEach(u=>{
        const p=GameState.players[u]; if(!p||!p.name) return;
        const b=document.createElement('button'); b.className='select-item'; b.textContent=p.name+(p.isGhost?' 👻':'');
        b.onclick=()=>{
            GameState.currentVoteTarget=u;
            const tn=document.getElementById('voteTargetName'); if(tn) tn.textContent=p.name;
            const rd=document.getElementById('voteResult'); if(rd) rd.textContent='';
            document.getElementById('modalVote').style.display='block';
            startVoteTimer(u);
        };
        ld.appendChild(b);
    });
}

function startVoteTimer(tu) {
    let t=30; const el=document.getElementById('voteTimer');
    safeSet(GameState.roomRef.child('votes').child(tu), {startTime:Date.now(),votes:{},target:tu,initiator:GameState.myUid}, 'vote-start');
    if(GameState.timers.vote) clearInterval(GameState.timers.vote);
    GameState.timers.vote=setInterval(()=>{
        t--; if(el) el.textContent=t;
        if(t<=0){clearInterval(GameState.timers.vote);GameState.timers.vote=null;resolveVote(tu);}
    },1000);
}

function castVote(v) {
    if(!GameState.currentVoteTarget) return;
    safeSet(GameState.roomRef.child('votes').child(GameState.currentVoteTarget).child('votes').child(GameState.myUid), v, 'vote-cast');
    showNotification(`Голос: ${v==='yes'?'ЗА':'ПРОТИВ'}`, 'info');
}

function updateVoteUI(vd) {
    if(!vd) return;
    const y=Object.values(vd.votes||{}).filter(v=>v==='yes').length;
    const n=Object.values(vd.votes||{}).filter(v=>v==='no').length;
    const rd=document.getElementById('voteResult'); if(rd) rd.textContent=`✅ ЗА: ${y} | ❌ ПРОТИВ: ${n}`;
}

function resolveVote(tu) {
    document.getElementById('modalVote').style.display='none';
    GameState.roomRef.child('votes').child(tu).once('value', s=>{
        const vd=s.val(); if(!vd) return;
        const votes=vd.votes||{}; let y=0,n=0;
        Object.values(votes).forEach(v=>{if(v==='yes')y++;if(v==='no')n++;});
        if(votes[tu]==='yes') y--;
        const tot=y+n; const kicked=tot>0&&y>tot/2;
        if(kicked&&GameState.players[tu]) {
            GameState.roomRef.child('players').child(tu).remove();
            appendChat(`🗳️ ${GameState.players[tu].name} исключён! (ЗА:${y} ПРОТИВ:${n})`, 'system');
        } else appendChat(`🗳️ ${GameState.players[tu]?.name||'Игрок'} остался! (ЗА:${y} ПРОТИВ:${n})`, 'system');
        GameState.roomRef.child('votes').child(tu).remove();
        GameState.lastVoteEndTime=Date.now(); GameState.currentVoteTarget=null;
    });
}

// ============================================================
// СПОСОБНОСТИ ПРИЗРАКОВ
// ============================================================
function useGhostAbility(id) {
    if(!GameState.isGhost) return;
    const m=GameState.players[GameState.myUid];
    const ab=GHOST_ABILITIES.find(a=>a.id===id); if(!ab) return;
    if(ab.limit==='once_per_ghost'&&m?.usedAbilities?.[id]) return showNotification('Уже использовано!', 'warning');
    
    switch(id) {
        case 'oathOfVengeance': {
            const tgts=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tgts.length) return;
            showTargetModal(tgts, t=>{
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {ghostTarget:t}, 'oath');
                appendChat(`⚔️ [Призрак ${m.name}] выбрал цель: ${GameState.players[t].name}`, 'ghost');
            }); break;
        }
        case 'familiarCurse': {
            const tgts=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tgts.length) return;
            showTargetModal(tgts, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {familiarCursed:true}, 'fam');
                appendChat(`🔮 [Призрак ${m.name}] проклял ${GameState.players[t].name}`, 'ghost');
            }); break;
        }
        case 'poltergeist': {
            const ef=['sabotage','blessing','shuffle'];
            const ch=ef[Math.floor(Math.random()*ef.length)];
            const al=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!al.length) return;
            if(ch==='sabotage') { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'pol-s'); appendChat(`🌀 [Полтергейст] САБОТАЖ: ${GameState.players[t].name}`, 'ghost'); }
            else if(ch==='blessing') { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:[6,6,6,6,6],evilEyed:false}, 'pol-b'); appendChat(`🌀 [Полтергейст] БЛАГОСЛОВЕНИЕ: ${GameState.players[t].name}`, 'ghost'); }
            else { al.forEach(u=>safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'pol-sh')); appendChat(`🌀 [Полтергейст] ПЕРЕМЕШИВАНИЕ`, 'ghost'); }
            break;
        }
        case 'keeperOfSecrets': {
            const cd=document.getElementById('keeperContent');
            if(cd) {
                cd.innerHTML='';
                Object.values(GameState.players).forEach(p=>{
                    if(p?.alive&&!p.isGhost) {
                        const d=document.createElement('div'); d.style.marginBottom='10px'; d.style.background='rgba(255,255,255,0.05)'; d.style.padding='8px'; d.style.borderRadius='5px';
                        d.innerHTML=`<strong style="color:#ffd700">${escapeHtml(p.name)}</strong>: <span style="font-size:1.2em">${p.dice.map(d=>getDieEmoji(parseInt(d)||1)).join(' ')}</span>`;
                        cd.appendChild(d);
                    }
                });
                document.getElementById('modalKeeper').style.display='block';
            }
            return;
        }
        case 'soulReaper': {
            const sr=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!sr.length) return;
            let killed=false;
            sr.forEach(uid=>{
                if(Math.random()<0.2) {
                    const p=GameState.players[uid]; const r=Math.random();
                    let ef=r<0.1?'death':r<0.35?'loseArtifact':r<0.6?'heal':r<0.85?'stun':'blind';
                    if(ef==='death'){applyPoison(uid,1,'Жатва');killed=true;}
                    else if(ef==='loseArtifact'&&p.artifact){safeUpdate(GameState.roomRef.child('players').child(uid),{artifact:null},'rep-a');appendChat(`💀 ${p.name}: потерял артефакт`,'ghost');}
                    else if(ef==='heal'&&p.poisons>0){safeUpdate(GameState.roomRef.child('players').child(uid),{poisons:p.poisons-1},'rep-h');appendChat(`💀 ${p.name}: исцелился`,'ghost');}
                    else if(ef==='stun'){safeUpdate(GameState.roomRef.child('players').child(uid),{stunned:true},'rep-st');appendChat(`💀 ${p.name}: ошеломлён`,'ghost');}
                    else{safeUpdate(GameState.roomRef.child('players').child(uid),{blind:true},'rep-bl');appendChat(`💀 ${p.name}: ослеплён`,'ghost');}
                }
            });
            if(killed) {
                const up={alive:true,isGhost:false,poisons:(m.maxLives||3)-1,blood:0,artifact:null,dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),usedAbilities:{}};
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), up, 'rep-rev');
                appendChat(`💀 [Призрак ${m.name}] ВОСКРЕС через Жатву!`, 'ghost'); playSound('resurrection');
            }
            break;
        }
    }
    const ua=m.usedAbilities||{}; ua[id]=true;
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
    playSound('ghost');
}

// ============================================================
// АРТЕФАКТЫ
// ============================================================
function useArtifact(id) {
    if(GameState.gameState!=='betting') return;
    const m=GameState.players[GameState.myUid];
    const art=ARTIFACTS.find(a=>a.id===id);
    if(!art||(art.type==='active'&&GameState.usedSpecialThisRound[id])) return;
    if(['deceiver','double'].includes(id)&&!isMyTurn()) return showNotification('Только в свой ход!', 'warning');

    switch(id) {
        case 'target':
            showTargetModalFirst(Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost), target=>{
                showNominalModal(nom=>{
                    const t=target;
                    if(GameState.players[t].dice.length<=1) return showNotification('Нельзя последний кубик!', 'warning');
                    const i=GameState.players[t].dice.indexOf(nom);
                    if(i===-1) return showNotification(`Нет кубика ${getDieEmoji(nom)}!`, 'warning');
                    GameState.players[t].dice.splice(i,1);
                    safeUpdate(GameState.roomRef.child('players').child(t), {dice:GameState.players[t].dice}, 'target');
                    appendChat(`🎯 ${m.name} уничтожил ${getDieEmoji(nom)} у ${GameState.players[t].name}`, 'system');
                });
            }); break;
        case 'fireball': case 'luck':
            const nd=m.dice.map(d=>{if(m.frozen)return d;return id==='luck'?(Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1):Math.floor(Math.random()*6)+1;});
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:nd,evilEyed:false}, 'fireball');
            appendChat(`☄️ ${m.name} использовал ${art.name}!`, 'system'); break;
        case 'blessing':
            if(m.poisons>0) { safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {poisons:m.poisons-1}, 'bless'); appendChat(`⚕️ ${m.name}: -1 яд`, 'system'); }
            else {
                const h=Object.keys(GameState.players).find(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&GameState.players[u]?.poisons>0);
                if(h) { safeUpdate(GameState.roomRef.child('players').child(h), {poisons:GameState.players[h].poisons-1}, 'bless'); appendChat(`⚕️ ${m.name} вылечил ${GameState.players[h].name}`, 'system'); }
                else showNotification('Нет раненых!', 'warning');
            } break;
        case 'thief':
            if(GameState.thiefUsedThisRound) return showNotification('Вор уже использован!', 'warning');
            const tt=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.artifact&&GameState.players[u].artifact.type==='active'&&!GameState.usedSpecialThisRound[GameState.players[u].artifact.id]);
            if(!tt.length) return showNotification('Некого красть!', 'warning');
            showTargetModal(tt, t=>{
                const st=GameState.players[t].artifact;
                if(GameState.usedSpecialThisRound[st.id]) delete GameState.usedSpecialThisRound[st.id];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {artifact:st,usedSpecialThisRound:GameState.usedSpecialThisRound}, 'thief');
                safeUpdate(GameState.roomRef.child('players').child(t), {artifact:null}, 'thief-v');
                GameState.thiefUsedThisRound=true;
                appendChat(`🥷 ${m.name} украл ${st.emoji} у ${GameState.players[t].name}!`, 'system');
            }); break;
        case 'deceiver':
            const bc=GameState.lastBet?GameState.lastBet.count+Math.floor(Math.random()*3)+2:Math.floor(Math.random()*5)+6;
            const bv=Math.floor(Math.random()*6)+1;
            const nb={player:GameState.myUid,count:bc,value:bv};
            GameState.lastBet=nb; GameState.players[GameState.myUid].lastBetInRound=nb;
            safeUpdate(GameState.roomRef, {lastBet:nb,turnCounter:GameState.turnCounter+1}, 'deceiver');
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {lastBetInRound:nb}, 'deceiver-p');
            GameState.turnCounter++; renderUI(); break;
        case 'clone':
            const tc=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tc.length) return;
            const cl=tc[Math.floor(Math.random()*tc.length)];
            const cd=GameState.players[cl].dice[Math.floor(Math.random()*GameState.players[cl].dice.length)];
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:[...m.dice,cd],artifact:null}, 'clone');
            appendChat(`🧬 ${m.name} клонировал ${getDieEmoji(cd)} у ${GameState.players[cl].name}!`, 'system'); break;
        case 'curse':
            const cu=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!cu.length) return;
            showTargetModal(cu, t=>{ safeUpdate(GameState.roomRef.child('players').child(t), {cursed:true}, 'curse'); appendChat(`☠️ ${m.name} проклял ${GameState.players[t].name}!`, 'system'); }); break;
        case 'spy':
            if(GameState.spyMemory[GameState.myUid]&&GameState.spyMemory[GameState.myUid].value&&GameState.roundNumber===GameState.spyMemory[GameState.myUid].round) {
                showNotification(`🔍 Шпион: у ${GameState.players[GameState.spyMemory[GameState.myUid].target]?.name} есть ${getDieEmoji(GameState.spyMemory[GameState.myUid].value)}`, 'info'); break;
            }
            const sp=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!sp.length) return showNotification('Нет целей!', 'warning');
            showTargetModal(sp, t=>{
                const val=GameState.players[t].dice[Math.floor(Math.random()*GameState.players[t].dice.length)];
                GameState.spyMemory[GameState.myUid]={target:t,value:val,round:GameState.roundNumber};
                showNotification(`🕵️ Шпион: у ${GameState.players[t].name} есть ${getDieEmoji(val)}`, 'info');
                appendChat(`🕵️ ${m.name} шпионит за ${GameState.players[t].name}`, 'system');
            }); break;
        case 'ice':
            const ci=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen);
            if(!ci.length) return;
            showTargetModal(ci, t=>{ safeUpdate(GameState.roomRef.child('players').child(t), {frozen:true}, 'ice'); appendChat(`🧊 ${m.name} заморозил ${GameState.players[t].name}!`, 'system'); }); break;
        case 'analyst':
            showNominalModal(n=>{
                let c=0; Object.values(GameState.players).forEach(p=>{if(p?.alive&&!p.isGhost&&p.dice.includes(n))c++;});
                showNotification(`АНАЛИТИК: ${c} игроков имеют ${getDieEmoji(n)}`, 'info');
            }); break;
        case 'double':
            if(!GameState.lastBet) return showNotification('Нет ставок!', 'warning');
            const td=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.lastBetInRound);
            if(!td.length) return showNotification('Нет ставок!', 'warning');
            showTargetModal(td, t=>{
                const lb=GameState.players[t].lastBetInRound;
                const nb={player:GameState.myUid,count:lb.count,value:lb.value};
                GameState.lastBet=nb; GameState.players[GameState.myUid].lastBetInRound=nb;
                safeUpdate(GameState.roomRef, {lastBet:nb,turnCounter:GameState.turnCounter+1}, 'double');
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {lastBetInRound:nb}, 'double-p');
                GameState.turnCounter++; renderUI();
                appendChat(`🪞 ${m.name} скопировал ставку ${GameState.players[t].name}: ${lb.count}×${getDieEmoji(lb.value)}`, 'system');
            }); break;
        case 'evilEye':
            const te=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.evilEyed);
            if(!te.length) return;
            showTargetModal(te, t=>{ safeUpdate(GameState.roomRef.child('players').child(t), {evilEyed:true}, 'eye'); appendChat(`🧿 ${m.name} сглазил ${GameState.players[t].name}!`, 'system'); }); break;
        case 'sacrifice':
            if(m.poisons>=(m.maxLives||3)&&!confirm('⚠️ ВЫ УМРЁТЕ! Вы уверены?')) return;
            if(!confirm('⚠️ Вы получите +1 яд. Продолжить?')) return;
            showEffectModal(eff=>{
                applyPoison(GameState.myUid, 1, 'Жертва');
                if(eff.id==='shield') safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {devilShield:true,devilShieldRound:GameState.roundNumber}, 'sac-sh');
                else if(eff.id==='reroll') {
                    Object.keys(GameState.players).forEach(u=>{if(GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen)safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'sac-rr');});
                    appendChat(`💀 ${m.name}: переброс стола!`, 'system');
                } else if(eff.id==='forceBluff') {
                    const nx=getNextPlayerUid(); if(nx) safeUpdate(GameState.roomRef.child('players').child(nx), {forcedBluff:true}, 'sac-fb');
                    appendChat(`💀 ${m.name}: следующий обязан повысить!`, 'system');
                }
            }); break;
        case 'circus':
            const cc=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen&&GameState.players[u].dice.length>=2&&m.dice.length>=2);
            if(!cc.length) return showNotification('Нет целей!', 'warning');
            showTargetModal(cc, t=>{
                let md=[...m.dice], td=[...GameState.players[t].dice];
                let mi1=Math.floor(Math.random()*md.length), mi2=Math.floor(Math.random()*md.length); while(mi2===mi1)mi2=Math.floor(Math.random()*md.length);
                let ti1=Math.floor(Math.random()*td.length), ti2=Math.floor(Math.random()*td.length); while(ti2===ti1)ti2=Math.floor(Math.random()*td.length);
                [md[mi1],td[ti1]]=[td[ti1],md[mi1]]; [md[mi2],td[ti2]]=[td[ti2],md[mi2]];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:md}, 'circ-me');
                safeUpdate(GameState.roomRef.child('players').child(t), {dice:td}, 'circ-t');
                appendChat(`🎪 ${m.name} обменялся кубиками с ${GameState.players[t].name}!`, 'system');
            }); break;
        case 'sniper':
            if(GameState.sniperShotUsedThisRound) return showNotification('Отстрел уже использован!', 'warning');
            showDynamicNominalModal(n=>{
                if(GameState.lastBet&&GameState.lastBet.value===n) return showNotification('Нельзя текущий номинал!', 'warning');
                Object.keys(GameState.players).forEach(u=>{
                    if(GameState.players[u]?.frozen) return;
                    const nd=GameState.players[u].dice.filter(d=>d!==n);
                    if(nd.length!==GameState.players[u].dice.length) safeUpdate(GameState.roomRef.child('players').child(u), {dice:nd}, 'sniper');
                });
                GameState.sniperShotUsedThisRound=true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {sniperShotUsedThisRound:true,cannotAccuse:true}, 'sniper-me');
                appendChat(`🔫 ${m.name} отстрелил все ${getDieEmoji(n)}!`, 'system');
            }); break;
    }
    if(art.type==='active') {
        GameState.usedSpecialThisRound[id]=true;
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedSpecialThisRound:GameState.usedSpecialThisRound}, 'art-end');
    }
    playSound('artifact');
}

function getNextPlayerUid() {
    const a=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&GameState.players[u].connected!==false);
    if(!a.length) return null;
    const i=a.indexOf(GameState.lastBet?.player);
    return a[(i+1)%a.length];
}

// ============================================================
// МОДАЛЬНЫЕ ОКНА
// ============================================================
function showTargetModal(uids, cb) {
    const l=document.getElementById('modalTargetList'); if(!l) return; l.innerHTML='';
    uids.forEach(u=>{
        const p=GameState.players[u]; if(!p||!p.name) return;
        const b=document.createElement('button'); b.className='select-item'; b.style.width='100%'; b.textContent=p.name+(p.isGhost?' 👻':'');
        b.onclick=()=>{cb(u);closeModal('modalTarget');}; l.appendChild(b);
    });
    document.getElementById('modalTarget').style.display='block';
}
function showTargetModalFirst(uids, cb) { showTargetModal(uids, cb); }

function showNominalModal(cb) {
    const l=document.getElementById('modalNominalList'); if(!l) return; l.innerHTML='';
    for(let i=1;i<=6;i++){
        const b=document.createElement('button'); b.className='select-item'; b.textContent=getDieEmoji(i); b.style.width='60px'; b.style.height='60px'; b.style.fontSize='1.8em';
        b.onclick=()=>{cb(i);closeModal('modalNominal');}; l.appendChild(b);
    }
    document.getElementById('modalNominal').style.display='block';
}

let dynamicNominalInterval=null;
function showDynamicNominalModal(cb) {
    const l=document.getElementById('modalNominalList'); if(!l) return;
    if(dynamicNominalInterval) clearInterval(dynamicNominalInterval);
    const render=()=>{
        l.innerHTML='';
        for(let i=1;i<=6;i++){
            const b=document.createElement('button'); b.className='select-item'; b.textContent=getDieEmoji(i); b.style.width='60px'; b.style.height='60px'; b.style.fontSize='1.8em';
            if(GameState.lastBet&&GameState.lastBet.value===i){b.style.opacity='0.3';b.style.cursor='not-allowed';b.disabled=true;}
            else{b.onclick=()=>{cb(i);closeModal('modalNominal');clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;};}
            l.appendChild(b);
        }
    };
    render();
    dynamicNominalInterval=setInterval(render, 200);
    document.getElementById('modalNominal').style.display='block';
}

function showEffectModal(cb) {
    const ef=[{id:'shield',name:'🛡️ Щит Дьявола'},{id:'reroll',name:'🔁 Переброс стола'},{id:'forceBluff',name:'🎭 Принудительный блеф'}];
    const l=document.getElementById('modalEffectList'); if(!l) return; l.innerHTML='';
    ef.forEach(e=>{
        const b=document.createElement('button'); b.className='select-item'; b.style.width='100%'; b.style.marginBottom='8px'; b.textContent=e.name; b.style.whiteSpace='normal'; b.style.lineHeight='1.4';
        b.onclick=()=>{cb(e);closeModal('modalEffect');}; l.appendChild(b);
    });
    document.getElementById('modalEffect').style.display='block';
}

function closeModal(id) {
    const m=document.getElementById(id); if(m) m.style.display='none';
    if(id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
}

// ============================================================
// УПРАВЛЕНИЕ
// ============================================================
function resetGame() {
    if(!confirm('⚠️ Сбросить игру?\n\nВесь прогресс будет потерян.')) return;
    if(!confirm('🔴 ТОЧНО сбросить?')) return;
    
    GameState.gameState='lobby'; GameState.roundNumber=0; GameState.lastBet=null; GameState.currentPlayerUid=null;
    GameState.thiefUsedThisRound=false; GameState.sniperShotUsedThisRound=false; GameState.usedSpecialThisRound={};
    GameState.artifactHistory=[]; GameState.blood=0;
    clearAllTimers();
    
    const updates={};
    Object.keys(GameState.players).forEach(uid=>{
        const p=GameState.players[uid]; if(!p) return;
        updates[`players/${uid}/poisons`]=0; updates[`players/${uid}/blood`]=0; updates[`players/${uid}/alive`]=true;
        updates[`players/${uid}/isGhost`]=false; updates[`players/${uid}/artifact`]=null; updates[`players/${uid}/dice`]=[];
        updates[`players/${uid}/usedSpecialThisRound`]={}; updates[`players/${uid}/lastBetInRound`]=null;
        updates[`players/${uid}/cursed`]=false; updates[`players/${uid}/frozen`]=false; updates[`players/${uid}/defenderActive`]=false;
        updates[`players/${uid}/stunned`]=false; updates[`players/${uid}/blind`]=false; updates[`players/${uid}/darkPact`]=false;
        updates[`players/${uid}/darkPactShield`]=false; updates[`players/${uid}/devilShield`]=false; updates[`players/${uid}/evilEyed`]=false;
        updates[`players/${uid}/forcedBluff`]=false; updates[`players/${uid}/cannotAccuse`]=false; updates[`players/${uid}/sniperShotUsedThisRound`]=false;
        updates[`players/${uid}/familiarCursed`]=false; updates[`players/${uid}/usedAbilities`]={}; updates[`players/${uid}/devilDealsUsed`]=0;
        updates[`players/${uid}/maxDice`]=5; updates[`players/${uid}/noArtifactsForever`]=false;
        if(p.isBot) updates[`players/${uid}/botDifficulty`]=GameState.botDifficulty;
    });
    updates.state='lobby'; updates.round=0; updates.lastBet=null; updates.artifactHistory=[];
    safeUpdate(GameState.roomRef, updates, 'reset');
    appendChat('🔄 Игра сброшена', 'system');
}

function copyInviteLink() {
    const link=`${window.location.origin}${window.location.pathname}?room=${GameState.currentRoomId}`;
    navigator.clipboard.writeText(link).then(()=>{showNotification('Ссылка скопирована!', 'success');appendChat('🔗 Ссылка скопирована', 'system');}).catch(()=>showNotification('Ошибка копирования', 'error'));
}

function saveProfile() {
    const nn=document.getElementById('profileNameInput')?.value.trim();
    if(nn&&nn!==GameState.myName){
        GameState.myName=nn; localStorage.setItem('ld_playerName', nn);
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {name:nn}, 'rename');
        appendChat(`Ник изменён на ${nn}`, 'system');
    }
    localStorage.setItem('ld_avatar', GameState.myAvatar);
    localStorage.setItem('ld_color', GameState.myColor);
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {avatar:GameState.myAvatar,color:GameState.myColor}, 'profile');
    showNotification('Профиль сохранён!', 'success');
    document.getElementById('modalProfile').style.display='none';
}

function showConfetti() {
    for(let i=0;i<50;i++){
        const c=document.createElement('div'); c.className='confetti';
        c.style.left=Math.random()*100+'vw';
        c.style.background=['#ffd700','#ff0000','#00ff00','#0000ff'][Math.floor(Math.random()*4)];
        c.style.animationDuration=(Math.random()*2+2)+'s';
        document.body.appendChild(c); setTimeout(()=>c.remove(), 4000);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function bindEventListeners() {
    const hm=document.getElementById('hamburgerBtn'), dd=document.getElementById('dropdownMenu');
    if(hm) hm.onclick=()=>{if(dd)dd.style.display=dd.style.display==='block'?'none':'block';if(audioContext&&audioContext.state==='suspended')audioContext.resume();};
    document.addEventListener('click', e=>{if(hm&&dd&&!hm.contains(e.target)&&!dd.contains(e.target)&&dd.style.display==='block')dd.style.display='none';});

    document.getElementById('menuRules')?.addEventListener('click', ()=>{document.getElementById('modalRules').style.display='block';if(dd)dd.style.display='none';});
    document.getElementById('menuProfile')?.addEventListener('click', ()=>{
        const ni=document.getElementById('profileNameInput'); if(ni)ni.value=GameState.myName;
        const ui=document.getElementById('profileUid'); if(ui)ui.textContent=GameState.myUid;
        const si=document.getElementById('profileStatus'); if(si){si.textContent=GameState.isGhost?'Призрак':'Жив';si.style.color=GameState.isGhost?'#cc00ff':'#00ff88';}
        const ac=document.getElementById('avatarSelect');
        if(ac){ac.innerHTML='';AVATARS.forEach(av=>{const b=document.createElement('button');b.textContent=av;b.style.fontSize='1.5em';b.style.margin='3px';b.style.padding='5px';b.style.cursor='pointer';b.style.background=GameState.myAvatar===av?'#ffd700':'#333';b.style.border='none';b.style.borderRadius='5px';b.onclick=()=>{GameState.myAvatar=av;document.querySelectorAll('#avatarSelect button').forEach(x=>x.style.background='#333');b.style.background='#ffd700';};ac.appendChild(b);});}
        const cc=document.getElementById('colorSelect');
        if(cc){cc.innerHTML='';COLORS.forEach(col=>{const b=document.createElement('button');b.textContent='●';b.style.color=col;b.style.fontSize='1.5em';b.style.margin='3px';b.style.padding='5px';b.style.cursor='pointer';b.style.background=GameState.myColor===col?'#ffd700':'#333';b.style.border='none';b.style.borderRadius='5px';b.onclick=()=>{GameState.myColor=col;document.querySelectorAll('#colorSelect button').forEach(x=>x.style.background='#333');b.style.background='#ffd700';};cc.appendChild(b);});}
        document.getElementById('modalProfile').style.display='block'; if(dd)dd.style.display='none';
    });
    document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
    document.getElementById('menuInvite')?.addEventListener('click', ()=>{copyInviteLink();if(dd)dd.style.display='none';});
    document.getElementById('menuNewRoom')?.addEventListener('click', ()=>{if(confirm('Новая комната?')){if(GameState.roomRef)GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().cancel();clearAllTimers();newRoom();if(dd)dd.style.display='none';}});
    document.getElementById('menuKick')?.addEventListener('click', ()=>{startVoteKick();if(dd)dd.style.display='none';});
    document.getElementById('menuSound')?.addEventListener('click', ()=>{GameState.soundEnabled=!GameState.soundEnabled;document.getElementById('menuSound').textContent=GameState.soundEnabled?'🔊 Звук: ВКЛ':'🔇 Звук: ВЫКЛ';if(dd)dd.style.display='none';});
    document.getElementById('menuArtifacts')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');GameState.specialDiceEnabled=!GameState.specialDiceEnabled;document.getElementById('menuArtifacts').textContent=`🎲 Артефакты: ${GameState.specialDiceEnabled?'✅':'❌'}`;safeUpdate(GameState.roomRef.child('settings'), {specialDiceEnabled:GameState.specialDiceEnabled}, 'toggle-art');if(dd)dd.style.display='none';});
    document.getElementById('menuLives')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');const o=[3,4,5,6,2];GameState.defaultLives=o[(o.indexOf(GameState.defaultLives)+1)%o.length];document.getElementById('menuLives').textContent=`❤️ Жизни: ${GameState.defaultLives}`;safeUpdate(GameState.roomRef.child('settings'), {defaultLives:GameState.defaultLives}, 'toggle-lives');Object.keys(GameState.players).forEach(uid=>{if(GameState.players[uid]&&!GameState.players[uid].isBot)safeUpdate(GameState.roomRef.child('players').child(uid), {maxLives:GameState.defaultLives}, 'upd-lives');});if(dd)dd.style.display='none';});
    
    document.getElementById('btnStartGame')?.addEventListener('click', ()=>{
        if(GameState.gameState!=='lobby')return showNotification('Игра уже идёт!', 'warning');
        const ac=Object.keys(GameState.players).filter(u=>GameState.players[u]&&GameState.players[u].alive&&!GameState.players[u].isGhost&&!GameState.players[u].isBot).length;
        const bc=Object.keys(GameState.players).filter(u=>GameState.players[u]&&GameState.players[u].isBot).length;
        if((ac>=1&&bc>=1)||ac>=2) startNewRound();
        else showNotification('Нужен 1 игрок + 1 бот или 2 игрока', 'warning');
        if(dd)dd.style.display='none';
    });
    
    document.getElementById('btnResetGame')?.addEventListener('click', resetGame);
    document.getElementById('btnPlaceBet')?.addEventListener('click', placeBet);
    document.getElementById('btnAccuse')?.addEventListener('click', accuse);
    
    document.getElementById('btnSendChat')?.addEventListener('click', ()=>{
        const msg=document.getElementById('chatInput')?.value.trim();
        if(msg) {
            // [10] Debounce
            const now=Date.now();
            if(now-GameState.chatLastSend<CHAT_DEBOUNCE_MS) return showNotification('Не так быстро!', 'warning');
            GameState.chatLastSend=now;
            
            safeUpdate(GameState.roomRef.child('chat').push(), {sender:GameState.myName,text:msg,type:'normal',timestamp:now}, 'chat');
            const inp=document.getElementById('chatInput'); if(inp)inp.value='';
        }
    });
    document.getElementById('chatInput')?.addEventListener('keypress', e=>{if(e.key==='Enter')document.getElementById('btnSendChat')?.click();});
    
    document.getElementById('ghVengeance')?.addEventListener('click', ()=>useGhostAbility('oathOfVengeance'));
    document.getElementById('ghFamiliarCurse')?.addEventListener('click', ()=>useGhostAbility('familiarCurse'));
    document.getElementById('ghPoltergeist')?.addEventListener('click', ()=>useGhostAbility('poltergeist'));
    document.getElementById('ghKeeper')?.addEventListener('click', ()=>useGhostAbility('keeperOfSecrets'));
    document.getElementById('ghReaper')?.addEventListener('click', ()=>useGhostAbility('soulReaper'));
    
    document.getElementById('voteYes')?.addEventListener('click', ()=>castVote('yes'));
    document.getElementById('voteNo')?.addEventListener('click', ()=>castVote('no'));
    
    document.querySelectorAll('.close-btn').forEach(b=>b.addEventListener('click', function(){const m=this.closest('.modal');if(m)m.style.display='none';if(m?.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}}));
    window.addEventListener('click', e=>{if(e.target.classList.contains('modal')){e.target.style.display='none';if(e.target.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}}});
    
    document.getElementById('menuBotAdd')?.addEventListener('click', ()=>{addBot();if(dd)dd.style.display='none';});
    document.getElementById('menuBotRemoveAll')?.addEventListener('click', ()=>{removeAllBots();if(dd)dd.style.display='none';});
    document.getElementById('menuBotDifficulty')?.addEventListener('click', e=>{e.stopPropagation();setBotDifficulty((GameState.botDifficulty+1)%4);if(dd)dd.style.display='none';});
    
    window.addEventListener('beforeunload', clearAllTimers);
}

// ============================================================
// INIT
// ============================================================
window.onload = () => {
    const params=new URLSearchParams(window.location.search);
    let room=params.get('room');
    
    let name=localStorage.getItem('ld_playerName');
    if(!name){name=prompt('Введите имя:', 'Игрок'+Math.floor(Math.random()*900+100));if(!name)name='Игрок';localStorage.setItem('ld_playerName', name);}
    GameState.myName=name;
    GameState.myAvatar=localStorage.getItem('ld_avatar')||'🎲';
    GameState.myColor=localStorage.getItem('ld_color')||'#ffffff';
    
    if(!room){
        const saved=localStorage.getItem('ld_lastRoom');
        if(saved&&confirm(`Вернуться в ${saved}?`)) room=saved;
    }
    
    if(room){GameState.currentRoomId=room;document.getElementById('roomIdDisplay').textContent=room;enterRoom(room);}
    else createRoom();
    
    setupAudioContext();
    bindEventListeners();
    log('🎮 Game Loaded v8.6');
};

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Game]', ...args); }
function logError(...args) { console.error('[Game Error]', ...args); }

const DIE_EMOJI_CACHE = ['?', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function getDieEmoji(v) {
    const val = parseInt(v) || 1;
    return DIE_EMOJI_CACHE[val] || '⚀';
}
function getDieValue(emoji) { return DIE_EMOJI_CACHE.indexOf(emoji) + 1; }

const GameState = {
    roomRef: null,
    myUid: '', myName: '', myAvatar: '😎', myColor: '#c9a961', mySuitColor: '#1a1a1a',
    currentRoomId: '', isHost: false,
    players: {}, lastBet: null, gameState: 'lobby',
    roundNumber: 0, turnCounter: 0, currentPlayerUid: null,
    isGhost: false, ghostTarget: null, devilDealsUsed: 0, blood: 0,
    usedSpecialThisRound: {}, thiefUsedThisRound: false,
    sniperShotUsedThisRound: false, artifactHistory: [], spyMemory: {},
    defaultLives: 3, specialDiceEnabled: true, soundEnabled: true,
    botDifficulty: 2, bots: {}, isBotThinking: false, expertKnownDice: {},
    currentVoteTarget: null, lastVoteEndTime: 0, devilDealData: null,
    timers: { accusation: null, devilDeal: null, vote: null, bot: [] },
    chatLastSend: 0, isActionInProgress: false, pendingArtifact: null,
    betCount: 1, betValue: 1, lastAccusationResult: null,
    log: [], logFilter: 'all', emojiCooldown: false, tauntCooldown: false,
    playerPositions: {}, dragMode: false, dragSource: null
};

const PlayerProfile = { face: '😎', suitColor: '#1a1a1a', accentColor: '#c9a961' };
const VOTE_COOLDOWN = 120000, MAX_HISTORY = 50, CHAT_DEBOUNCE_MS = 1000;
const OFFLINE_TIMEOUT = 5 * 60 * 1000, EMOJI_COOLDOWN_MS = 5000, TAUNT_COOLDOWN_MS = 5000;
const botDifficultyNames = ['Легкий', 'Средний', 'Сложный', 'Эксперт'];

const FACE_EMOJIS = ['😎','🤵','🥸','🧐','🤨','😈','👿','🤡','👹','👺','🎭','🦹','🧙','🧛','🧟','😊','😏','🤠','🥳','😼','💀','☠️','👻','🎃','👽','🤑','💰','🃏','🎲','🤖'];
const SUIT_COLORS = [
    { name: 'Чёрный фрак', color: '#1a1a1a', accent: '#c9a961' },
    { name: 'Бордовый', color: '#5c0a0a', accent: '#ffd97a' },
    { name: 'Изумруд', color: '#0d3a2a', accent: '#c9a961' },
    { name: 'Тёмно-синий', color: '#0a1a3a', accent: '#c9a961' },
    { name: 'Фиолет', color: '#2a0a3a', accent: '#ffd97a' },
    { name: 'Золотой', color: '#3a2a0a', accent: '#ffd97a' }
];
const TAUNTS = {
    accusation: ['🎯 Я вижу твой блеф насквозь!','🃏 Раскрывай карты, шулер!','🎭 Твоя маска спадает...','🔍 Шпионы доложили — ты врешь!','⚖ Суд присяжных уже здесь!'],
    defeat: ['💀 Дьявол ждёт тебя...','👻 Готовься стать призраком','☠ Яд уже в бокале','🎪 Добро пожаловать в цирк!','🌑 Тёмный договор подписан'],
    victory: ['🏆 Король казино!','👑 Мафия бессмертна','💎 Джекпот мой!','🥂 За твой счёт, друг!','🎰 Казино всегда в выигрыше'],
    mockery: ['🤡 Ты случайно не в цирке работаешь?','🎲 Бросай кости, новичок','🃏 Твоя колода пустая','💸 Ставки слишком высоки для тебя','🎭 Сними маску, я знаю кто ты']
};

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

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showNotification(msg, duration = 3000) {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

function showLoading(show = true) {
    const loader = document.getElementById('loading');
    if (show) loader.classList.add('active');
    else loader.classList.remove('active');
}

function addLogEntry(text, type = 'system') {
    GameState.log.push({ text, type, timestamp: Date.now() });
    renderLog();
}

function renderLog() {
    const container = document.getElementById('logEntries');
    if (!container) return;
    const filtered = GameState.logFilter === 'all' ? GameState.log : GameState.log.filter(entry => entry.type === GameState.logFilter);
    container.innerHTML = filtered.map(entry => `<div class="log-entry ${entry.type}">${entry.text}</div>`).join('');
    container.scrollTop = container.scrollHeight;
}

function clearLog() { GameState.log = []; renderLog(); }

function showChatBubble(playerUid, text, type = 'text') {
    const seat = document.querySelector(`[data-uid="${playerUid}"]`);
    if (!seat) return;
    const existing = seat.querySelector('.chat-bubble');
    if (existing) existing.remove();
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.textContent = text;
    seat.appendChild(bubble);
    setTimeout(() => bubble.remove(), 5000);
}

let audioContext = null;
function setupAudioContext() {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { logError('AudioContext:', e); }
}

function playSound(type) {
    if (!GameState.soundEnabled || !audioContext) return;
    try {
        const now = audioContext.currentTime;
        const sounds = {
            bet:[440,220,0.1,'square'], accuse:[880,440,0.3,'sawtooth'],
            poison:[300,150,0.2,'sine'], death:[220,110,0.5,'sine'],
            devil:[150,100,0.4,'sawtooth'], devilWin:[440,880,0.3,'square'],
            devilLose:[200,100,0.4,'sawtooth'], ghost:[660,880,0.3,'sine'],
            resurrection:[330,990,0.6,'sine'], artifact:[523,784,0.2,'square'],
            round:[440,880,0.3,'square'], blood:[392,523,0.2,'sine'],
            win:[523,659,784,1046,0.8,'square']
        };
        const sound = sounds[type] || sounds.bet;
        if (type === 'win') {
            sound.slice(0, 4).forEach((freq, i) => {
                const osc = audioContext.createOscillator(), gain = audioContext.createGain();
                osc.connect(gain); gain.connect(audioContext.destination);
                osc.frequency.value = freq; osc.type = sound[4];
                gain.gain.setValueAtTime(0.2, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
                osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.4);
            });
        } else {
            const osc = audioContext.createOscillator(), gain = audioContext.createGain();
            osc.connect(gain); gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(sound[0], now);
            osc.frequency.exponentialRampToValueAtTime(sound[1], now + sound[2]);
            osc.type = sound[3];
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + sound[2]);
            osc.start(now); osc.stop(now + sound[2]);
        }
    } catch(e) { logError('playSound:', e); }
}

function renderAvatarSVG(config, size = 100) {
    const face = config.face || '😎';
    const suitColor = config.suitColor || '#1a1a1a';
    const accentColor = config.accentColor || '#c9a961';
    return `
<svg viewBox="0 0 100 140" class="player-avatar-svg" style="width:100%; height:100%;">
<ellipse cx="50" cy="135" rx="35" ry="5" fill="rgba(0,0,0,0.5)"/>
<path d="M 20 140 L 20 85 Q 20 75 30 75 L 70 75 Q 80 75 80 85 L 80 140 Z" fill="${suitColor}" stroke="${accentColor}" stroke-width="2"/>
<path d="M 45 75 L 50 95 L 55 75 Z" fill="${accentColor}"/>
<rect x="48" y="95" width="4" height="40" fill="${accentColor}" opacity="0.8"/>
<path d="M 25 85 Q 30 80 35 85 L 35 120 L 25 120 Z" fill="rgba(0,0,0,0.2)"/>
<path d="M 75 85 Q 70 80 65 85 L 65 120 L 75 120 Z" fill="rgba(255,255,255,0.05)"/>
<text x="50" y="60" text-anchor="middle" font-size="50" dominant-baseline="middle">${face}</text>
</svg>`;
}

function validatePlayerData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.name !== 'string' || data.name.length > 30) return false;
    if (!Array.isArray(data.dice)) return false;
    if (typeof data.poisons !== 'number' || data.poisons < 0) return false;
    return true;
}

function validateBet(bet) {
    if (!bet) return false;
    if (typeof bet.count !== 'number' || bet.count < 1) return false;
    if (typeof bet.value !== 'number' || bet.value < 1 || bet.value > 6) return false;
    return true;
}

function safeUpdate(ref, data, context = '') {
    showLoading(true);
    return ref.update(data)
        .then(() => { log(`✅ ${context}`); showLoading(false); })
        .catch(err => { showLoading(false); if (err.code === 'PERMISSION_DENIED') showNotification('⚠ Нет доступа. Проверьте правила Firebase.'); else showNotification('Ошибка соединения'); logError(`${context} error:`, err); });
}

function safeSet(ref, data, context = '') {
    showLoading(true);
    return ref.set(data)
        .then(() => { log(`✅ ${context}`); showLoading(false); })
        .catch(err => { showLoading(false); showNotification('Ошибка соединения'); logError(`${context} error:`, err); });
}

function clearAllTimers() {
    if (GameState.timers.accusation) { clearTimeout(GameState.timers.accusation); GameState.timers.accusation = null; }
    if (GameState.timers.devilDeal) { clearInterval(GameState.timers.devilDeal); GameState.timers.devilDeal = null; }
    if (GameState.timers.vote) { clearInterval(GameState.timers.vote); GameState.timers.vote = null; }
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
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
    GameState.roomRef = db.ref('rooms/' + roomId);
    safeSet(GameState.roomRef, {
        players: {}, state: 'lobby', round: 0, lastBet: null,
        settings: { specialDiceEnabled: true, defaultLives: 3 },
        artifactHistory: [], turnCounter: 0, createdAt: Date.now()
    }, 'createRoom').then(() => enterRoom(roomId, true));
}

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
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
    const savedUid = localStorage.getItem('ld_myUid');
    const savedName = localStorage.getItem('ld_playerName');
    const savedAvatar = localStorage.getItem('ld_avatar');
    const savedColor = localStorage.getItem('ld_color');
    const savedSuit = localStorage.getItem('ld_suit');
    const savedPositions = localStorage.getItem('ld_playerPositions');
    if (savedPositions) GameState.playerPositions = JSON.parse(savedPositions);
    if (savedUid && savedName) {
        GameState.myUid = savedUid;
        GameState.myName = savedName;
        GameState.myAvatar = savedAvatar || '😎';
        GameState.myColor = savedColor || '#c9a961';
        GameState.mySuitColor = savedSuit || '#1a1a1a';
    } else {
        GameState.myUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        GameState.myName = localStorage.getItem('ld_playerName') || 'Гость';
        GameState.myAvatar = savedAvatar || '😎';
        GameState.myColor = savedColor || '#c9a961';
        GameState.mySuitColor = savedSuit || '#1a1a1a';
        localStorage.setItem('ld_myUid', GameState.myUid);
        localStorage.setItem('ld_playerName', GameState.myName);
        localStorage.setItem('ld_avatar', GameState.myAvatar);
        localStorage.setItem('ld_color', GameState.myColor);
        localStorage.setItem('ld_suit', GameState.mySuitColor);
    }
    PlayerProfile.face = GameState.myAvatar;
    PlayerProfile.accentColor = GameState.myColor;
    PlayerProfile.suitColor = GameState.mySuitColor;
    localStorage.setItem('ld_lastRoom', roomId);
    const playerData = {
        name: GameState.myName, uid: GameState.myUid,
        avatar: GameState.myAvatar, color: GameState.myColor,
        suitColor: GameState.mySuitColor,
        dice: [], poisons: 0, blood: 0, alive: true, isGhost: false,
        artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0,
        maxLives: GameState.defaultLives, joinedAt: Date.now()
    };
    safeSet(GameState.roomRef.child('players').child(GameState.myUid), playerData, 'enterRoom');
    GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().update({
        connected: false, lastSeenTurn: GameState.turnCounter, disconnectedAt: Date.now()
    });
    setupRoomListeners();
    addLogEntry(`🎩 ${GameState.myName} входит в салон`, 'system');
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
                    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { connected: true, disconnectedAt: null }, 'reconnect');
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
                if (el) el.textContent = `❤ ЖИЗНИ: ${GameState.defaultLives}`;
            }
            if (typeof data.settings.specialDiceEnabled === 'boolean') {
                GameState.specialDiceEnabled = data.settings.specialDiceEnabled;
                const el = document.getElementById('menuArtifacts');
                if (el) el.textContent = `🎲 АРТЕФАКТЫ: ${GameState.specialDiceEnabled ? '✅' : '❌'}`;
            }
        }
        GameState.lastBet = (data.lastBet && validateBet(data.lastBet)) ? data.lastBet : null;
        GameState.roundNumber = data.round || 0;
        GameState.artifactHistory = Array.isArray(data.artifactHistory) ? data.artifactHistory.slice(-MAX_HISTORY) : [];
        GameState.turnCounter = data.turnCounter || 0;
        GameState.currentPlayerUid = data.currentPlayerUid || null;
        const now = Date.now();
        Object.keys(GameState.players).forEach(uid => {
            const p = GameState.players[uid];
            if (p && p.connected === false && p.disconnectedAt) {
                if (now - p.disconnectedAt > OFFLINE_TIMEOUT && uid !== GameState.myUid) {
                    const firstUid = Object.keys(GameState.players).sort((a,b)=>(GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0))[0];
                    if (firstUid === GameState.myUid) {
                        GameState.roomRef.child('players').child(uid).remove();
                        addLogEntry(`👋 ${p.name} покинул салон (оффлайн)`, 'system');
                    }
                }
            }
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
        updateUI();
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
        if (msg.type === 'text') showChatBubble(player?.uid || GameState.myUid, msg.text, 'text');
        else if (msg.type === 'emoji') showChatBubble(player?.uid || GameState.myUid, msg.text, 'emoji');
        else if (msg.type === 'taunt') showChatBubble(player?.uid || GameState.myUid, msg.text, 'taunt');
    });
    GameState.roomRef.child('votes').on('value', (s) => {
        const votes = s.val();
        if (votes && GameState.currentVoteTarget && votes[GameState.currentVoteTarget]) updateVoteUI(votes[GameState.currentVoteTarget]);
    });
}

// ============================================================
// РЕНДЕРИНГ
// ============================================================
const playerCardsCache = new Map();

function renderPlayerSeats() {
    const container = document.getElementById('playerSeats');
    if (!container) return;
    container.innerHTML = '';
    const cu = getCurrentPlayerUid();
    const sortedUids = Object.keys(GameState.players).sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    sortedUids.forEach((uid, idx) => {
        const p = GameState.players[uid];
        if (!p) return;
        const seat = document.createElement('div');
        seat.className = 'player-seat';
        seat.dataset.uid = uid;
        seat.dataset.position = GameState.playerPositions[uid] || idx;
        if (p.isGhost) seat.classList.add('ghost');
        if (!p.alive) seat.classList.add('dead');
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) seat.classList.add('active');
        if (GameState.gameState === 'accusing' && GameState.lastAccusationResult) {
            if (GameState.lastAccusationResult.accuser === uid) seat.classList.add('accuser');
            if (GameState.lastAccusationResult.accused === uid) seat.classList.add('accused');
        }
        const avatarWrap = document.createElement('div');
        avatarWrap.className = 'player-avatar-wrap';
        const avatarConfig = { face: p.avatar || '😎', suitColor: p.suitColor || '#1a1a1a', accentColor: p.color || '#c9a961' };
        avatarWrap.innerHTML = renderAvatarSVG(avatarConfig);
        avatarWrap.onclick = (e) => showPlayerContextMenu(uid, e);
        seat.appendChild(avatarWrap);
        const namePlate = document.createElement('div');
        namePlate.className = 'player-name-plate';
        namePlate.textContent = p.name || 'Гость';
        if (uid === GameState.myUid) namePlate.textContent += ' (Вы)';
        seat.appendChild(namePlate);
        if (GameState.gameState !== 'lobby') {
            const health = document.createElement('div');
            health.className = 'player-health';
            const ml = p.maxLives || 3;
            for (let j = 0; j < ml; j++) {
                const heart = document.createElement('span');
                heart.className = 'health-heart';
                if (j < p.poisons) heart.classList.add('lost');
                heart.textContent = '❤';
                health.appendChild(heart);
            }
            if (p.blood > 0) {
                for (let j = 0; j < p.blood; j++) {
                    const heart = document.createElement('span');
                    heart.className = 'health-heart';
                    heart.textContent = '❤';
                    heart.style.color = '#ff0044';
                    health.appendChild(heart);
                }
            }
            seat.appendChild(health);
        }
        seat.draggable = GameState.dragMode;
        seat.addEventListener('dragstart', handleDragStart);
        seat.addEventListener('dragover', handleDragOver);
        seat.addEventListener('drop', handleDrop);
        seat.addEventListener('dragend', handleDragEnd);
        container.appendChild(seat);
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

function updateUI() {
    const statusEl = document.getElementById('gameStatus');
    const roundEl = document.getElementById('roundInfo');
    const betEl = document.getElementById('currentBet');
    const tableScene = document.getElementById('tableScene');
    switch(GameState.gameState) {
        case 'lobby': statusEl.textContent = 'ОЖИДАНИЕ ГОСТЕЙ'; document.body.className = 'lobby'; break;
        case 'betting': statusEl.textContent = 'ИГРА ИДЁТ'; document.body.className = 'playing'; break;
        case 'accusing': statusEl.textContent = '⚖ ОБВИНЕНИЕ'; document.body.className = 'accusing'; tableScene.classList.add('accusing'); shakeScreen(); break;
        case 'devil_deal': statusEl.textContent = '😈 СДЕЛКА С ДЬЯВОЛОМ'; document.body.className = 'devil_deal'; break;
        case 'ended':
            const w = Object.values(GameState.players).find(p => p?.alive && !p.isGhost);
            statusEl.textContent = w ? `🏆 ${w.name} — ХОЗЯИН САЛОНА!` : 'НИЧЬЯ';
            document.body.className = 'victory'; tableScene.classList.add('victory'); break;
    }
    if (GameState.gameState !== 'accusing') tableScene.classList.remove('accusing');
    if (GameState.gameState !== 'ended') tableScene.classList.remove('victory');
    roundEl.textContent = `Раунд: ${GameState.roundNumber}`;
    if (GameState.lastBet) {
        const player = GameState.players[GameState.lastBet.player];
        betEl.textContent = `${player?.name || '?'}: ${GameState.lastBet.count}×${getDieEmoji(GameState.lastBet.value)}`;
    } else {
        betEl.textContent = 'Ставка: —';
    }
    document.getElementById('betCountDisplay').textContent = GameState.betCount;
    document.getElementById('betValueDisplay').textContent = getDieEmoji(GameState.betValue);
    renderPlayerSeats();
    renderDiceRow();
    updateControls();
}

function updateControls() {
    const mt = isMyTurn();
    const m = GameState.players[GameState.myUid] || {};
    const btnBet = document.getElementById('btnBet');
    const btnBluff = document.getElementById('btnBluff');
    btnBet.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' || GameState.isActionInProgress;
    btnBluff.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' || !GameState.lastBet || GameState.lastBet.player === GameState.myUid || m.cannotAccuse || GameState.isActionInProgress;
    const cc = !GameState.isGhost && GameState.gameState !== 'devil_deal';
    document.getElementById('btnChat').disabled = !cc;
    document.getElementById('btnEmoji').disabled = !cc || GameState.emojiCooldown;
    document.getElementById('btnTaunt').disabled = !cc || GameState.tauntCooldown;
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

function getCurrentPlayerName() {
    const u = getCurrentPlayerUid();
    return u && GameState.players[u] ? GameState.players[u].name : '—';
}

function getCurrentPlayerUid() {
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
// ИГРОВАЯ ЛОГИКА (ИСПРАВЛЕНО ДЛЯ БОТОВ)
// ============================================================
function placeBet(isBotTurn = false) {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting') return;
    if (!isBotTurn && !isMyTurn()) return; // Проверка только для игрока
    const m = GameState.players[isBotTurn ? GameState.currentPlayerUid : GameState.myUid];
    if (!m) return;
    const c = isBotTurn ? GameState.betCount : parseInt(document.getElementById('betCount').value);
    const v = isBotTurn ? GameState.betValue : parseInt(document.getElementById('betValue').value);
    if (isNaN(c) || isNaN(v)) return;
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
    GameState.isActionInProgress = true;
    const playerUid = isBotTurn ? GameState.currentPlayerUid : GameState.myUid;
    const nb = { player: playerUid, count: c, value: v, timestamp: Date.now() };
    GameState.lastBet = nb;
    GameState.players[playerUid].lastBetInRound = nb;
    const updates = {};
    updates['lastBet'] = nb;
    updates['turnCounter'] = GameState.turnCounter + 1;
    updates[`players/${playerUid}/lastBetInRound`] = nb;
    updates[`players/${playerUid}/cursed`] = false;
    updates[`players/${playerUid}/forcedBluff`] = false;
    safeUpdate(GameState.roomRef, updates, 'placeBet').finally(() => { GameState.isActionInProgress = false; });
    GameState.turnCounter++;
    addLogEntry(`🎲 ${m.name} ставит ${c}×${getDieEmoji(v)}`, 'bet');
    playSound('bet');
    nextTurn();
}

function accuse(isBotTurn = false) {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting') return;
    if (!isBotTurn && !isMyTurn()) return; // Проверка только для игрока
    if (!GameState.lastBet || GameState.lastBet.player === (isBotTurn ? GameState.currentPlayerUid : GameState.myUid)) return;
    GameState.isActionInProgress = true;
    GameState.gameState = 'accusing';
    const accusedUid = GameState.lastBet.player;
    const accuserUid = isBotTurn ? GameState.currentPlayerUid : GameState.myUid;
    GameState.lastAccusationResult = { accuser: accuserUid, accused: accusedUid, bet: GameState.lastBet };
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: { accuser: accuserUid, accused: accusedUid, bet: GameState.lastBet, timestamp: Date.now() }
    }, 'accuse').finally(() => { GameState.isActionInProgress = false; });
    const accuser = GameState.players[accuserUid];
    const accused = GameState.players[accusedUid];
    addLogEntry(`⚖ ${accuser.name} обвиняет ${accused.name} в блефе!`, 'accusation');
    playSound('accuse');
    if (GameState.timers.accusation) clearTimeout(GameState.timers.accusation);
    GameState.timers.accusation = setTimeout(() => resolveAccusation(accusedUid), 3000);
}

function shakeScreen() {
    document.body.style.animation = 'shake 0.5s';
    setTimeout(() => { document.body.style.animation = ''; }, 500);
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
    const updates = {};
    const effects = [];
    const diceCountByValue = {};
    for (let i = 1; i <= 6; i++) diceCountByValue[i] = 0;
    Object.values(GameState.players).forEach(p => {
        if (!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { const val = parseInt(d); if (val >= 1 && val <= 6) diceCountByValue[val]++; });
    });
    if (isLie) {
        applyPoison(accusedUid, 1, 'Блеф');
        effects.push(`${accused?.name || 'Цель'}: +1 яд (блеф)`);
        addLogEntry(`✅ БЛЕФ РАСКРЫТ! ${accused.name} получает яд`, 'accusation');
        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(GameState.myUid, 1);
            applyPoison(accusedUid, 2, 'Кровожадность');
            effects.push(`${GameState.players[GameState.myUid].name}: +1 кровь | ${accused.name}: +2 яда`);
        } else if (accused?.artifact?.id === 'deceiver') {
            applyPoison(GameState.myUid, 2, 'Обманщик');
            effects.push(`${accused.name}: Обманщик | ${GameState.players[GameState.myUid].name}: +2 яда`);
        } else if (accused?.darkPact) {
            applyPoison(accusedUid, 1, 'Тёмный Договор');
            effects.push(`${accused.name}: Договор → +1 яд`);
        }
        if (wildSaved && isLieWithoutWild && !isLie) {
            applyPoison(GameState.myUid, 2, 'Дикий Кубик спас');
            effects.push(`Дикий Кубик спас ставку! ${GameState.players[GameState.myUid].name}: +2 яда`);
        }
    } else {
        applyPoison(GameState.myUid, 1, 'Ошибка');
        effects.push(`${GameState.players[GameState.myUid].name}: +1 яд (ошибка)`);
        addLogEntry(`❌ СТАВКА ВЕРНА! ${GameState.players[GameState.myUid].name} получает яд`, 'accusation');
        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
            effects.push(`${accused.name}: +1 кровь`);
        }
        if (accused?.darkPact) {
            updates[`players/${accusedUid}/darkPact`] = false;
            updates[`players/${accusedUid}/darkPactShield`] = true;
            updates[`players/${accusedUid}/darkPactRound`] = GameState.roundNumber + 1;
            effects.push(`${accused.name}: Договор → щит`);
        }
    }
    GameState.lastAccusationResult = { ...GameState.lastAccusationResult, isLie, total, diceCountByValue, effects };
    updates['accusationResult'] = { isLie, effects: effects.join('<br>'), resultText: isLie ? 'БЛЕФ РАСКРЫТ' : 'СТАВКА ВЕРНА', resultClass: isLie ? 'lie' : 'truth' };
    safeUpdate(GameState.roomRef, updates, 'resolve-result');
    setTimeout(() => {
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, { state: 'betting', accusingData: null, accusationResult: null }, 'resolve-end');
        checkDeath();
        setTimeout(startNewRound, 1000);
    }, 2000);
}

function applyPoison(uid, amt, reason) {
    const p = GameState.players[uid];
    if (!p) return;
    if (p.devilShield && p.devilShieldRound === GameState.roundNumber) {
        addLogEntry(`🛡 ${p.name} защищён Щитом Дьявола!`, 'system');
        safeUpdate(GameState.roomRef.child('players').child(uid), { devilShield: false }, 'shield');
        return;
    }
    if (p.defenderActive) {
        addLogEntry(`🛡 ${p.name} защищён Защитником!`, 'system');
        safeUpdate(GameState.roomRef.child('players').child(uid), { defenderActive: false }, 'defender');
        return;
    }
    let rem = amt;
    if (p.blood > 0) {
        const u = Math.min(p.blood, rem);
        rem -= u;
        safeUpdate(GameState.roomRef.child('players').child(uid), { blood: p.blood - u }, 'blood');
        addLogEntry(`🩸 ${p.name} теряет ${u} крови`, 'system');
    }
    if (rem > 0) {
        safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons + rem }, 'poison');
        addLogEntry(`☠ ${p.name}: +${rem} яд (${reason})`, 'system');
        playSound('poison');
    }
}

function applyBlood(uid, amt) {
    const p = GameState.players[uid];
    if (!p) return;
    safeUpdate(GameState.roomRef.child('players').child(uid), { blood: (p.blood||0) + amt }, 'blood-gain');
    addLogEntry(`🩸 ${p.name}: +${amt} кровь!`, 'system');
    playSound('blood');
}

function checkDeath() {
    if (GameState.gameState === 'ended') return;
    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (!p || p.isGhost || !p.alive) return;
        const ml = p.maxLives || 3;
        if (p.poisons >= ml) {
            if (p.devilDealsUsed >= 2) {
                turnToGhost(uid);
            } else {
                if (p.isBot) {
                    const diff = GameState.bots[uid]?.difficulty ?? 2;
                    const surviveChance = [0.2, 0.5, 0.7, 0.9][diff];
                    if (Math.random() < surviveChance) {
                        const updates = {
                            poisons: 0, blood: 0, alive: true, isGhost: false,
                            artifact: null, dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1),
                            devilDealsUsed: (p.devilDealsUsed||0) + 1
                        };
                        safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'bot-deal-win');
                        addLogEntry(`😈 ${p.name} выиграл сделку с Дьяволом!`, 'system');
                        playSound('devilWin'); playSound('resurrection');
                    } else {
                        turnToGhost(uid);
                    }
                } else {
                    if (uid === GameState.myUid) startDevilDeal(uid);
                    else addLogEntry(`😈 ${p.name} отправляется к Дьяволу...`, 'system');
                }
            }
        }
    });
    const humans = Object.values(GameState.players).filter(p => p?.alive && !p.isGhost);
    if (humans.length === 1 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'victory');
        addLogEntry(`🏆 ${humans[0].name} — хозяин салона!`, 'system');
        playSound('win'); showConfetti();
    } else if (humans.length === 0 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'draw');
        addLogEntry('💀 Салон опустел...', 'system');
    }
}

function turnToGhost(uid) {
    const updates = {
        alive: false, isGhost: true, poisons: 0, artifact: null, blood: 0,
        cursed: false, frozen: false, defenderActive: false, stunned: false, blind: false,
        devilShield: false, usedAbilities: {}, lastBetInRound: null, dice: []
    };
    safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'turnToGhost');
    addLogEntry(`👻 ${GameState.players[uid].name} стал призраком!`, 'system');
    playSound('ghost');
    const seat = document.querySelector(`[data-uid="${uid}"]`);
    if (seat) {
        seat.style.transition = 'all 1.5s';
        seat.style.filter = 'hue-rotate(240deg) brightness(1.3) blur(1px)';
    }
    checkVengeance(uid);
    if (uid === GameState.myUid) {
        showNotification('Вы стали призраком! Используйте способности.');
    }
}

function checkVengeance(uid) {
    Object.keys(GameState.players).forEach(u => {
        const p = GameState.players[u];
        if (p?.isGhost && p.ghostTarget === uid) {
            const updates = {
                alive: true, isGhost: false,
                poisons: (p.maxLives||3) - 1, blood: 0, ghostTarget: null, artifact: null, usedAbilities: {},
                dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1)
            };
            safeUpdate(GameState.roomRef.child('players').child(u), updates, 'vengeance');
            addLogEntry(`⚔ ПРИЗРАК ${p.name} воскрес через Месть!`, 'system');
            playSound('resurrection');
        }
    });
}

function startDevilDeal(uid) {
    if (uid !== GameState.myUid) return;
    GameState.gameState = 'devil_deal';
    safeUpdate(GameState.roomRef, { state: 'devil_deal' }, 'deal-start');
    const dealsUsed = GameState.devilDealsUsed || 0;
    const options = [
        { id: 'lose_dice', title: '🎲 Отдать 2 кубика Дьяволу', desc: 'Воскреснете с 3 кубиками вместо 5', apply: () => ({ poisons: 0, blood: 0, alive: true, isGhost: false, artifact: null, dice: Array(3).fill(0).map(() => Math.floor(Math.random()*6)+1), maxDice: 3, devilDealsUsed: dealsUsed + 1 }) },
        { id: 'lose_artifacts', title: '🚫 Отказаться от артефактов', desc: 'Воскреснете, но без артефактов до конца игры', apply: () => ({ poisons: 0, blood: 0, alive: true, isGhost: false, artifact: null, dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1), noArtifactsForever: true, devilDealsUsed: dealsUsed + 1 }) },
        { id: 'lose_maxlife', title: '💔 Отдать часть души', desc: `Воскреснете с ${Math.max(1, (GameState.defaultLives||3)-1)} жизнями`, apply: () => ({ poisons: 0, blood: 0, alive: true, isGhost: false, artifact: null, dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1), maxLives: Math.max(1, (GameState.defaultLives||3)-1), devilDealsUsed: dealsUsed + 1 }) }
    ];
    const content = document.getElementById('devilContent');
    content.innerHTML = `<p style="text-align: center; margin-bottom: 20px;">Дьявол предлагает воскреснуть. Какой ценой?</p><div id="devilOptions" style="display: flex; flex-direction: column; gap: 12px;"></div><div class="devil-progress-bar" id="devilProgressBar" style="width: 100%;"></div><p style="text-align: center; font-size: 0.8em; color: var(--accent-red); margin-top: 15px;">⚠ Лимит: 2 сделки. Далее — призрак навеки.</p><button class="action-button btn-bluff" id="btnRefuseDeal" style="width: 100%; margin-top: 15px;">ОТКАЗАТЬСЯ (СТАТЬ ПРИЗРАКОМ)</button>`;
    const optionsDiv = document.getElementById('devilOptions');
    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'action-button btn-secondary';
        btn.style.textAlign = 'left';
        btn.innerHTML = `<strong>${opt.title}</strong><br><small>${opt.desc}</small>`;
        btn.onclick = () => resolveDevilDeal(opt.apply());
        optionsDiv.appendChild(btn);
    });
    document.getElementById('btnRefuseDeal').onclick = () => {
        turnToGhost(uid);
        addLogEntry(`😈 ${GameState.myName} отказался от сделки!`, 'system');
        playSound('devilLose');
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-refuse');
        closeModal('devilModal');
        setTimeout(startNewRound, 2500);
    };
    openModal('devilModal');
    playSound('devil');
    addLogEntry(`😈 ${GameState.myName} торгуется с Дьяволом...`, 'system');
    let timeLeft = 30;
    const progressBar = document.getElementById('devilProgressBar');
    if (GameState.timers.devilDeal) clearInterval(GameState.timers.devilDeal);
    GameState.timers.devilDeal = setInterval(() => {
        timeLeft--;
        const percent = (timeLeft / 30) * 100;
        if (progressBar) progressBar.style.width = percent + '%';
        if (timeLeft <= 0) {
            clearInterval(GameState.timers.devilDeal);
            turnToGhost(uid);
            addLogEntry(`😈 ${GameState.myName} не успел заключить сделку!`, 'system');
            playSound('devilLose');
            GameState.gameState = 'betting';
            safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-timeout');
            closeModal('devilModal');
            setTimeout(startNewRound, 2500);
        }
    }, 1000);
}

function resolveDevilDeal(updateData) {
    if (GameState.timers.devilDeal) clearInterval(GameState.timers.devilDeal);
    closeModal('devilModal');
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), updateData, 'deal-resolve');
    addLogEntry(`😈 ${GameState.myName} выиграл сделку!`, 'system');
    playSound('devilWin');
    GameState.gameState = 'betting';
    safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-end');
    setTimeout(startNewRound, 2500);
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
    GameState.lastAccusationResult = null;
    const updates = {};
    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (p?.alive && !p.isGhost) {
            const hist = GameState.artifactHistory.filter(a => a.endsWith('_'+uid)).slice(-2);
            const avail = ARTIFACTS.filter(a => !hist.includes(a.id+'_'+uid));
            const art = avail.length ? avail[Math.floor(Math.random()*avail.length)] : ARTIFACTS[Math.floor(Math.random()*ARTIFACTS.length)];
            GameState.artifactHistory.push(art.id+'_'+uid);
            const numDice = p.maxDice || 5;
            let dc = Array(numDice).fill(0).map(() => Math.floor(Math.random()*6)+1);
            if (p.evilEyed) dc = dc.map(() => Math.random() < 0.7 ? Math.floor(Math.random()*3)+1 : Math.floor(Math.random()*3)+4);
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
        au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
        if (lastBetCopy && lastBetCopy.player) {
            const idx = au.indexOf(lastBetCopy.player);
            updates.currentPlayerUid = idx !== -1 ? au[(idx+1)%au.length] : au[0];
        } else {
            updates.currentPlayerUid = au[0];
        }
        GameState.currentPlayerUid = updates.currentPlayerUid;
    }
    safeUpdate(GameState.roomRef, updates, 'newRound');
    addLogEntry(`🎲 === РАУНД ${GameState.roundNumber} === Карты розданы`, 'system');
    playSound('round');
    clearLog();
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

function nextTurn() {
    if (GameState.gameState !== 'betting') return;
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost && GameState.players[u].connected !== false);
    if (!au.length) return;
    au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    const idx = au.indexOf(GameState.currentPlayerUid);
    GameState.currentPlayerUid = au[(idx+1)%au.length];
    GameState.turnCounter++;
    safeUpdate(GameState.roomRef, { currentPlayerUid: GameState.currentPlayerUid, turnCounter: GameState.turnCounter }, 'nextTurn');
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

// ============================================================
// БОТЫ
// ============================================================
function addBot() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!');
    const cnt = Object.keys(GameState.players).filter(u => GameState.players[u]?.isBot).length;
    if (cnt >= 5) return showNotification('Максимум 5 ботов');
    const id = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    const botFaces = ['🤖', '🎭', '🦹', '🧙', '🧛', '👹', '👺', '🤡'];
    const randomFace = botFaces[Math.floor(Math.random() * botFaces.length)];
    const randomSuit = SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)];
    const data = {
        name: '🤖 ' + botDifficultyNames[GameState.botDifficulty], uid: id, avatar: randomFace, color: randomSuit.accent, suitColor: randomSuit.color,
        dice: [], poisons: 0, blood: 0, alive: true, isGhost: false, artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0, maxLives: GameState.defaultLives,
        isBot: true, botDifficulty: GameState.botDifficulty, joinedAt: Date.now(),
        cursed:false, frozen:false, defenderActive:false, stunned:false, blind:false,
        darkPact:false, darkPactShield:false, devilShield:false, evilEyed:false,
        forcedBluff:false, cannotAccuse:false, sniperShotUsedThisRound:false, familiarCursed:false, usedAbilities:{}
    };
    GameState.bots[id] = { difficulty: GameState.botDifficulty, knownDice: {} };
    safeSet(GameState.roomRef.child('players').child(id), data, 'addBot');
    addLogEntry(`🤖 Бот-${botDifficultyNames[GameState.botDifficulty]} входит в салон`, 'system');
}

function removeAllBots() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!');
    Object.keys(GameState.players).forEach(uid => {
        if (GameState.players[uid]?.isBot) GameState.roomRef.child('players').child(uid).remove();
    });
    GameState.bots = {}; GameState.expertKnownDice = {};
    addLogEntry('🤖 Боты покинули салон', 'system');
}

function botTurn(botId) {
    GameState.isBotThinking = true;
    setTimeout(() => {
        GameState.isBotThinking = false;
        if (GameState.gameState === 'betting' && GameState.currentPlayerUid === botId) {
            if (GameState.lastBet && Math.random() < 0.3) {
                const accusedUid = GameState.lastBet.player;
                addLogEntry(`🤖 Бот обвиняет ${GameState.players[accusedUid]?.name}`, 'accusation');
                accuse(true); // ИСПРАВЛЕНО: передаем true для бота
            } else {
                const pc = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
                const maxPos = Math.max(pc * 10, 10);
                const nc = GameState.lastBet ? Math.min(maxPos, GameState.lastBet.count + Math.floor(Math.random()*3)+1) : Math.floor(Math.random()*5)+1;
                const nv = Math.floor(Math.random()*6)+1;
                GameState.betCount = nc;
                GameState.betValue = nv;
                placeBet(true); // ИСПРАВЛЕНО: передаем true для бота
            }
        }
    }, 2000);
}

// ============================================================
// АРТЕФАКТЫ (ПОЛНАЯ ВЕРСИЯ)
// ============================================================
function markArtifactUsed(id) {
    GameState.usedSpecialThisRound[id] = true;
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { usedSpecialThisRound: GameState.usedSpecialThisRound }, 'art-used');
    GameState.pendingArtifact = null;
}

function useArtifact(id) {
    if (GameState.gameState !== 'betting') return;
    const m = GameState.players[GameState.myUid];
    const art = ARTIFACTS.find(a => a.id === id);
    if (!art || (art.type === 'active' && GameState.usedSpecialThisRound[id])) return;
    if (['deceiver','double'].includes(id) && !isMyTurn()) return showNotification('Только в свой ход!', 'warning');
    if (art.type === 'active') GameState.pendingArtifact = id;

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
                    markArtifactUsed(id);
                });
            }); break;
        case 'fireball': case 'luck':
            const nd=m.dice.map(d=>{if(m.frozen)return d;return id==='luck'?(Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1):Math.floor(Math.random()*6)+1;});
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:nd,evilEyed:false}, 'fireball');
            appendChat(`☄️ ${m.name} использовал ${art.name}!`, 'system');
            markArtifactUsed(id); break;
        case 'blessing':
            if(m.poisons>0) { 
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {poisons:m.poisons-1}, 'bless'); 
                appendChat(`⚕️ ${m.name}: -1 яд`, 'system');  
                markArtifactUsed(id);
            } else {
                const h=Object.keys(GameState.players).find(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&GameState.players[u]?.poisons>0);
                if(h) { 
                    safeUpdate(GameState.roomRef.child('players').child(h), {poisons:GameState.players[h].poisons-1}, 'bless'); 
                    appendChat(`⚕️ ${m.name} вылечил ${GameState.players[h].name}`, 'system');
                    markArtifactUsed(id);
                } else {
                    showNotification('Нет раненых!', 'warning');
                    GameState.pendingArtifact = null;
                }
            } break;
        case 'thief':
            if(GameState.thiefUsedThisRound) { GameState.pendingArtifact = null; return showNotification('Вор уже использован!', 'warning'); }
            const tt=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.artifact&&GameState.players[u].artifact.type==='active'&&!GameState.usedSpecialThisRound[GameState.players[u].artifact.id]);
            if(!tt.length) { GameState.pendingArtifact = null; return showNotification('Некого красть!', 'warning'); }
            showTargetModal(tt, t=>{
                const st=GameState.players[t].artifact;
                if(GameState.usedSpecialThisRound[st.id]) delete GameState.usedSpecialThisRound[st.id];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {artifact:st,usedSpecialThisRound:GameState.usedSpecialThisRound}, 'thief');
                safeUpdate(GameState.roomRef.child('players').child(t), {artifact:null}, 'thief-v');
                GameState.thiefUsedThisRound=true;
                appendChat(`🥷 ${m.name} украл ${st.emoji} у ${GameState.players[t].name}!`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'deceiver':
            const bc=GameState.lastBet?GameState.lastBet.count+Math.floor(Math.random()*3)+2:Math.floor(Math.random()*5)+6;
            const bv=Math.floor(Math.random()*6)+1;
            const nb={player:GameState.myUid,count:bc,value:bv};
            GameState.lastBet=nb; GameState.players[GameState.myUid].lastBetInRound=nb;
            safeUpdate(GameState.roomRef, {lastBet:nb,turnCounter:GameState.turnCounter+1}, 'deceiver');
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {lastBetInRound:nb}, 'deceiver-p');
            GameState.turnCounter++; renderUI();
            markArtifactUsed(id); break;
        case 'clone':
            const tc=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tc.length) { GameState.pendingArtifact = null; return; }
            const cl=tc[Math.floor(Math.random()*tc.length)];
            const cd=GameState.players[cl].dice[Math.floor(Math.random()*GameState.players[cl].dice.length)];
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:[...m.dice,cd],artifact:null}, 'clone');
            appendChat(`🧬 ${m.name} клонировал ${getDieEmoji(cd)} у ${GameState.players[cl].name}!`, 'system');
            markArtifactUsed(id); break;
        case 'curse':
            const cu=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!cu.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(cu, t=>{ 
                safeUpdate(GameState.roomRef.child('players').child(t), {cursed:true}, 'curse'); 
                appendChat(`☠️ ${m.name} проклял ${GameState.players[t].name}!`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'spy':
            if(GameState.spyMemory[GameState.myUid]&&GameState.spyMemory[GameState.myUid].value&&GameState.roundNumber===GameState.spyMemory[GameState.myUid].round) {
                showNotification(`🔍 Шпион: у ${GameState.players[GameState.spyMemory[GameState.myUid].target]?.name} есть ${getDieEmoji(GameState.spyMemory[GameState.myUid].value)}`, 'info');
                GameState.pendingArtifact = null;
                break;
            }
            const sp=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!sp.length) { GameState.pendingArtifact = null; return showNotification('Нет целей!', 'warning'); }
            showTargetModal(sp, t=>{
                const val=GameState.players[t].dice[Math.floor(Math.random()*GameState.players[t].dice.length)];
                GameState.spyMemory[GameState.myUid]={target:t,value:val,round:GameState.roundNumber};
                showNotification(`🕵️ Шпион: у ${GameState.players[t].name} есть ${getDieEmoji(val)}`, 'info');
                appendChat(`🕵️ ${m.name} шпионит за ${GameState.players[t].name}`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'ice':
            const ci=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen);
            if(!ci.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(ci, t=>{ 
                safeUpdate(GameState.roomRef.child('players').child(t), {frozen:true}, 'ice'); 
                appendChat(`🧊 ${m.name} заморозил ${GameState.players[t].name}!`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'analyst':
            showNominalModal(n=>{
                let c=0; Object.values(GameState.players).forEach(p=>{if(p?.alive&&!p.isGhost&&p.dice.includes(n))c++;});
                showNotification(`АНАЛИТИК: ${c} игроков имеют ${getDieEmoji(n)}`, 'info');
                markArtifactUsed(id);
            }); break;
        case 'double':
            if(!GameState.lastBet) { GameState.pendingArtifact = null; return showNotification('Нет ставок!', 'warning'); }
            const td=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.lastBetInRound);
            if(!td.length) { GameState.pendingArtifact = null; return showNotification('Нет ставок!', 'warning'); }
            showTargetModal(td, t=>{
                const lb=GameState.players[t].lastBetInRound;
                const nb={player:GameState.myUid,count:lb.count,value:lb.value};
                GameState.lastBet=nb; GameState.players[GameState.myUid].lastBetInRound=nb;
                safeUpdate(GameState.roomRef, {lastBet:nb,turnCounter:GameState.turnCounter+1}, 'double');
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {lastBetInRound:nb}, 'double-p');
                GameState.turnCounter++; renderUI();
                appendChat(`🪞 ${m.name} скопировал ставку ${GameState.players[t].name}: ${lb.count}×${getDieEmoji(lb.value)}`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'evilEye':
            const te=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.evilEyed);
            if(!te.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(te, t=>{ 
                safeUpdate(GameState.roomRef.child('players').child(t), {evilEyed:true}, 'eye'); 
                appendChat(`🧿 ${m.name} сглазил ${GameState.players[t].name}!`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'sacrifice':
            if(m.poisons>=(m.maxLives||3)&&!confirm('⚠️ ВЫ УМРЁТЕ! Вы уверены?')) { GameState.pendingArtifact = null; return; }
            if(!confirm('⚠️ Вы получите +1 яд. Продолжить?')) { GameState.pendingArtifact = null; return; }
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
                markArtifactUsed(id);
            }); break;
        case 'circus':
            const cc=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen&&GameState.players[u].dice.length>=2&&m.dice.length>=2);
            if(!cc.length) { GameState.pendingArtifact = null; return showNotification('Нет целей!', 'warning'); }
            showTargetModal(cc, t=>{
                let md=[...m.dice], td=[...GameState.players[t].dice];
                let mi1=Math.floor(Math.random()*md.length), mi2=Math.floor(Math.random()*md.length); while(mi2===mi1)mi2=Math.floor(Math.random()*md.length);
                let ti1=Math.floor(Math.random()*td.length), ti2=Math.floor(Math.random()*td.length); while(ti2===ti1)ti2=Math.floor(Math.random()*td.length);
                [md[mi1],td[ti1]]=[td[ti1],md[mi1]]; [md[mi2],td[ti2]]=[td[ti2],md[mi2]];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:md}, 'circ-me');
                safeUpdate(GameState.roomRef.child('players').child(t), {dice:td}, 'circ-t');
                appendChat(`🎪 ${m.name} обменялся кубиками с ${GameState.players[t].name}!`, 'system');
                markArtifactUsed(id);
            }); break;
        case 'sniper':
            if(GameState.sniperShotUsedThisRound) { GameState.pendingArtifact = null; return showNotification('Отстрел уже использован!', 'warning'); }
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
                markArtifactUsed(id);
            }); break;
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
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if(id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
    if (['modalTarget', 'modalNominal', 'modalEffect'].includes(id)) {
        if (GameState.pendingArtifact) {
            log(`ℹ️ Закрытие модалки без выбора: артефакт ${GameState.pendingArtifact} остаётся активным`);
            GameState.pendingArtifact = null;
        }
    }
}

// ============================================================
// DRAG & DROP И ИНФО
// ============================================================
function showPlayerContextMenu(uid, event) {
    event.stopPropagation();
    const existing = document.querySelector('.player-context-menu');
    if (existing) existing.remove();
    const menu = document.createElement('div');
    menu.className = 'player-context-menu';
    const moveBtn = document.createElement('div');
    moveBtn.className = 'player-context-btn';
    moveBtn.innerHTML = '⛶';
    moveBtn.title = 'Переместить';
    moveBtn.onclick = (e) => {
        e.stopPropagation();
        GameState.dragMode = !GameState.dragMode;
        GameState.dragSource = uid;
        showNotification(GameState.dragMode ? '✓ Режим перемещения включён' : '✗ Режим перемещения выключен');
        renderPlayerSeats();
        menu.remove();
    };
    menu.appendChild(moveBtn);
    const infoBtn = document.createElement('div');
    infoBtn.className = 'player-context-btn';
    infoBtn.innerHTML = 'ⓘ';
    infoBtn.title = 'Информация';
    infoBtn.onclick = (e) => {
        e.stopPropagation();
        showPlayerInfo(uid);
        menu.remove();
    };
    menu.appendChild(infoBtn);
    const seat = event.currentTarget.closest('.player-seat');
    const rect = seat.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 10) + 'px';
    document.body.appendChild(menu);
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function handleDragStart(e) {
    if (!GameState.dragMode) return;
    GameState.dragSource = e.currentTarget.dataset.uid;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (!GameState.dragMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDrop(e) {
    if (!GameState.dragMode) return;
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetUid = e.currentTarget.dataset.uid;
    if (GameState.dragSource && GameState.dragSource !== targetUid) {
        const sourcePos = GameState.playerPositions[GameState.dragSource];
        const targetPos = GameState.playerPositions[targetUid];
        GameState.playerPositions[GameState.dragSource] = targetPos;
        GameState.playerPositions[targetUid] = sourcePos;
        localStorage.setItem('ld_playerPositions', JSON.stringify(GameState.playerPositions));
        renderPlayerSeats();
        showNotification('✓ Позиции игроков изменены');
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function showPlayerInfo(uid) {
    const p = GameState.players[uid];
    if (!p) return;
    const info = [
        `Игрок: ${p.name}`,
        `Статус: ${p.isGhost ? '👻 Призрак' : (!p.alive ? '💀 Мёртв' : '✓ Жив')}`,
        `Здоровье: ${(p.maxLives || 3) - (p.poisons || 0)} / ${p.maxLives || 3}`,
        `Кровь: ${p.blood || 0}`,
        `Кубиков: ${p.dice?.length || 0}`
    ].join('\n');
    showNotification(info, 4000);
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
                const ua=m.usedAbilities||{}; ua[id]=true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
            }); break;
        }
        case 'familiarCurse': {
            const tgts=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tgts.length) return;
            showTargetModal(tgts, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {familiarCursed:true}, 'fam');
                appendChat(`🔮 [Призрак ${m.name}] проклял ${GameState.players[t].name}`, 'ghost');
                const ua=m.usedAbilities||{}; ua[id]=true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
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
            const ua=m.usedAbilities||{}; ua[id]=true;
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
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
            const ua=m.usedAbilities||{}; ua[id]=true;
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
            break;
        }
    }
    playSound('ghost');
}

// ============================================================
// УПРАВЛЕНИЕ
// ============================================================
function resetGame() {
    if(!confirm('Сбросить игру?\nВесь прогресс будет потерян.')) return;
    if(!confirm('ТОЧНО сбросить?')) return;
    GameState.gameState='lobby'; GameState.roundNumber=0; GameState.lastBet=null; GameState.currentPlayerUid=null;
    GameState.thiefUsedThisRound=false; GameState.sniperShotUsedThisRound=false; GameState.usedSpecialThisRound={};
    GameState.artifactHistory=[]; GameState.blood=0;
    clearAllTimers(); clearLog();
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
    addLogEntry('🔄 Салон очищен, начинаем заново', 'system');
    document.getElementById('menuDropdown').classList.remove('active');
}

function copyInviteLink() {
    const link=`${window.location.origin}${window.location.pathname}?room=${GameState.currentRoomId}`;
    navigator.clipboard.writeText(link).then(()=>{showNotification('✅ Ссылка скопирована!');addLogEntry('🔗 Ссылка скопирована', 'system');}).catch(()=>showNotification('Ошибка копирования', 'error'));
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
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = ['#ffd700', '#c9a961', '#ff8844', '#5aff5a'][Math.floor(Math.random()*4)];
        c.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}

function openScaleSettings() {
    const settings = loadScaleSettings();
    document.getElementById('scaleTopBar').value = settings.topBar;
    document.getElementById('scaleBottomBar').value = settings.bottomBar;
    document.getElementById('scaleTable').value = settings.table;
    document.getElementById('scalePlayers').value = settings.players;
    document.getElementById('scaleButtons').value = settings.buttons;
    updateScaleLabels();
    document.getElementById('scaleSettings').classList.add('active');
}

function closeScaleSettings() {
    document.getElementById('scaleSettings').classList.remove('active');
    saveScaleSettings();
    applyScaleSettings();
}

function resetScaleSettings() {
    document.getElementById('scaleTopBar').value = 100;
    document.getElementById('scaleBottomBar').value = 100;
    document.getElementById('scaleTable').value = 100;
    document.getElementById('scalePlayers').value = 100;
    document.getElementById('scaleButtons').value = 100;
    updateScaleLabels();
    saveScaleSettings();
    applyScaleSettings();
    showNotification('✓ Масштабы сброшены');
}

function updateScaleLabels() {
    document.getElementById('scaleTopBarValue').textContent = document.getElementById('scaleTopBar').value + '%';
    document.getElementById('scaleBottomBarValue').textContent = document.getElementById('scaleBottomBar').value + '%';
    document.getElementById('scaleTableValue').textContent = document.getElementById('scaleTable').value + '%';
    document.getElementById('scalePlayersValue').textContent = document.getElementById('scalePlayers').value + '%';
    document.getElementById('scaleButtonsValue').textContent = document.getElementById('scaleButtons').value + '%';
}

function loadScaleSettings() {
    const saved = localStorage.getItem('ld_scaleSettings');
    if (saved) return JSON.parse(saved);
    return { topBar: 100, bottomBar: 100, table: 100, players: 100, buttons: 100 };
}

function saveScaleSettings() {
    const settings = {
        topBar: parseInt(document.getElementById('scaleTopBar').value),
        bottomBar: parseInt(document.getElementById('scaleBottomBar').value),
        table: parseInt(document.getElementById('scaleTable').value),
        players: parseInt(document.getElementById('scalePlayers').value),
        buttons: parseInt(document.getElementById('scaleButtons').value)
    };
    localStorage.setItem('ld_scaleSettings', JSON.stringify(settings));
}

function applyScaleSettings() {
    const settings = loadScaleSettings();
    document.documentElement.style.setProperty('--scale-top-bar', settings.topBar / 100);
    document.documentElement.style.setProperty('--scale-bottom-bar', settings.bottomBar / 100);
    document.documentElement.style.setProperty('--scale-table', settings.table / 100);
    document.documentElement.style.setProperty('--scale-players', settings.players / 100);
    document.documentElement.style.setProperty('--scale-buttons', settings.buttons / 100);
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
        if(ac){ac.innerHTML='';FACE_EMOJIS.forEach(av=>{const b=document.createElement('button');b.textContent=av;b.style.fontSize='1.5em';b.style.margin='3px';b.style.padding='5px';b.style.cursor='pointer';b.style.background=GameState.myAvatar===av?'#ffd700':'#333';b.style.border='none';b.style.borderRadius='5px';b.onclick=()=>{GameState.myAvatar=av;document.querySelectorAll('#avatarSelect button').forEach(x=>x.style.background='#333');b.style.background='#ffd700';};ac.appendChild(b);});}
        const cc=document.getElementById('colorSelect');
        if(cc){cc.innerHTML='';SUIT_COLORS.forEach(col=>{const b=document.createElement('button');b.textContent='●';b.style.color=col.color;b.style.fontSize='1.5em';b.style.margin='3px';b.style.padding='5px';b.style.cursor='pointer';b.style.background=GameState.myColor===col.color?'#ffd700':'#333';b.style.border='none';b.style.borderRadius='5px';b.onclick=()=>{GameState.myColor=col.color;document.querySelectorAll('#colorSelect button').forEach(x=>x.style.background='#333');b.style.background='#ffd700';};cc.appendChild(b);});}
        document.getElementById('modalProfile').style.display='block'; if(dd)dd.style.display='none';
    });
    document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
    document.getElementById('menuInvite')?.addEventListener('click', ()=>{copyInviteLink();if(dd)dd.style.display='none';});
    document.getElementById('menuNewRoom')?.addEventListener('click', ()=>{if(confirm('Новая комната?')){if(GameState.roomRef)GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().cancel();clearAllTimers();newRoom();if(dd)dd.style.display='none';}});
    document.getElementById('menuKick')?.addEventListener('click', ()=>{startVoteKick();if(dd)dd.style.display='none';});
    document.getElementById('menuSound')?.addEventListener('click', ()=>{GameState.soundEnabled=!GameState.soundEnabled;document.getElementById('menuSound').textContent=`🔊 ЗВУК: ${GameState.soundEnabled?'ВКЛ':'ВЫКЛ'}`;if(dd)dd.style.display='none';});
    document.getElementById('menuArtifacts')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');GameState.specialDiceEnabled=!GameState.specialDiceEnabled;document.getElementById('menuArtifacts').textContent=`🎲 АРТЕФАКТЫ: ${GameState.specialDiceEnabled?'✅':'❌'}`;safeUpdate(GameState.roomRef.child('settings'), {specialDiceEnabled:GameState.specialDiceEnabled}, 'toggle-artifacts');if(dd)dd.style.display='none';});
    document.getElementById('menuLives')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');const o=[3,4,5,6,2];GameState.defaultLives=o[(o.indexOf(GameState.defaultLives)+1)%o.length];document.getElementById('menuLives').textContent=`❤ ЖИЗНИ: ${GameState.defaultLives}`;safeUpdate(GameState.roomRef.child('settings'), {defaultLives:GameState.defaultLives}, 'toggle-lives');Object.keys(GameState.players).forEach(uid=>{if(GameState.players[uid]&&!GameState.players[uid].isBot)safeUpdate(GameState.roomRef.child('players').child(uid), {maxLives:GameState.defaultLives}, 'update-lives');});if(dd)dd.style.display='none';});
    document.getElementById('menuStart').onclick = () => {
        if (GameState.isActionInProgress) return;
        if(GameState.gameState!=='lobby')return showNotification('Игра уже идёт!');
        const ac=Object.keys(GameState.players).filter(u=>GameState.players[u]&&!GameState.players[u].isBot).length;
        const bc=Object.keys(GameState.players).filter(u=>GameState.players[u]?.isBot).length;
        if((ac>=1&&bc>=1)||ac>=2) startNewRound();
        else showNotification('Нужен 1 игрок + 1 бот или 2 игрока');
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuReset').onclick = () => resetGame();
    document.getElementById('btnBet').onclick = placeBet;
    document.getElementById('btnBluff').onclick = accuse;
    document.getElementById('btnChat').onclick = () => {
        document.getElementById('chatInputContainer').classList.toggle('active');
        document.getElementById('emojiPanel').classList.remove('active');
        document.getElementById('tauntPanel').classList.remove('active');
    };
    document.getElementById('btnEmoji').onclick = () => {
        document.getElementById('emojiPanel').classList.toggle('active');
        document.getElementById('chatInputContainer').classList.remove('active');
        document.getElementById('tauntPanel').classList.remove('active');
    };
    document.getElementById('btnTaunt').onclick = () => {
        document.getElementById('tauntPanel').classList.toggle('active');
        document.getElementById('chatInputContainer').classList.remove('active');
        document.getElementById('emojiPanel').classList.remove('active');
    };
    document.getElementById('btnLog').onclick = () => { document.getElementById('logPanel').classList.toggle('active'); };
    document.getElementById('btnResult').onclick = showResultPanel;
    document.getElementById('logClose').onclick = () => { document.getElementById('logPanel').classList.remove('active'); };
    document.getElementById('resultClose').onclick = () => { document.getElementById('resultPanel').classList.remove('active'); };
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            GameState.logFilter = btn.dataset.filter;
            renderLog();
        };
    });
    document.getElementById('betCountUp').onclick = () => { GameState.betCount = Math.min(99, GameState.betCount + 1); updateUI(); };
    document.getElementById('betCountDown').onclick = () => { GameState.betCount = Math.max(1, GameState.betCount - 1); updateUI(); };
    document.getElementById('betValueUp').onclick = () => { GameState.betValue = GameState.betValue >= 6 ? 1 : GameState.betValue + 1; updateUI(); };
    document.getElementById('betValueDown').onclick = () => { GameState.betValue = GameState.betValue <= 1 ? 6 : GameState.betValue - 1; updateUI(); };
    document.getElementById('chatInput').onkeypress = (e) => {
        if (e.key === 'Enter') {
            const text = e.target.value.trim();
            if (text) {
                const now = Date.now();
                if(now-GameState.chatLastSend<CHAT_DEBOUNCE_MS) return showNotification('Не так быстро!', 'warning');
                GameState.chatLastSend=now;
                safeUpdate(GameState.roomRef.child('chat').push(), {sender:GameState.myName,text:text,type:'normal',timestamp:now}, 'chat');
                e.target.value = '';
            }
        }
    };
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.onclick = () => {
            const now = Date.now();
            if(now-GameState.chatLastSend<CHAT_DEBOUNCE_MS) return showNotification('Не так быстро!', 'warning');
            if(GameState.emojiCooldown) return showNotification('Подождите 5 секунд');
            GameState.chatLastSend=now;
            GameState.emojiCooldown=true;
            setTimeout(()=>{GameState.emojiCooldown=false;updateControls();}, EMOJI_COOLDOWN_MS);
            safeUpdate(GameState.roomRef.child('chat').push(), {sender:GameState.myName,text:btn.dataset.emoji,type:'emoji',timestamp:now}, 'chat');
        };
    });
    const tauntPanel = document.getElementById('tauntPanel');
    Object.values(TAUNTS).flat().forEach(taunt => {
        const btn = document.createElement('div');
        btn.className = 'taunt-btn';
        btn.textContent = taunt;
        btn.onclick = () => {
            const now = Date.now();
            if(now-GameState.chatLastSend<CHAT_DEBOUNCE_MS) return showNotification('Не так быстро!', 'warning');
            if(GameState.tauntCooldown) return showNotification('Подождите 5 секунд');
            GameState.chatLastSend=now;
            GameState.tauntCooldown=true;
            setTimeout(()=>{GameState.tauntCooldown=false;updateControls();}, TAUNT_COOLDOWN_MS);
            safeUpdate(GameState.roomRef.child('chat').push(), {sender:GameState.myName,text:taunt,type:'taunt',timestamp:now}, 'chat');
        };
        tauntPanel.appendChild(btn);
    });
    document.getElementById('ghVengeance')?.addEventListener('click', ()=>useGhostAbility('oathOfVengeance'));
    document.getElementById('ghFamiliarCurse')?.addEventListener('click', ()=>useGhostAbility('familiarCurse'));
    document.getElementById('ghPoltergeist')?.addEventListener('click', ()=>useGhostAbility('poltergeist'));
    document.getElementById('ghKeeper')?.addEventListener('click', ()=>useGhostAbility('keeperOfSecrets'));
    document.getElementById('ghReaper')?.addEventListener('click', ()=>useGhostAbility('soulReaper'));
    document.getElementById('voteYes')?.addEventListener('click', ()=>castVote('yes'));
    document.getElementById('voteNo')?.addEventListener('click', ()=>castVote('no'));
    document.querySelectorAll('.close-btn').forEach(b=>b.addEventListener('click', function(){
        const m=this.closest('.modal');
        if(m&&m.id==='devilModal') return;
        if(m)m.style.display='none';
        if(m?.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
    }));
    window.addEventListener('click', e=>{
        if(e.target.classList.contains('modal')){
            if(e.target.id==='devilModal') return;
            e.target.style.display='none';
            if(e.target.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
        }
    });
    document.getElementById('menuBotAdd')?.addEventListener('click', ()=>{addBot();if(dd)dd.style.display='none';});
    document.getElementById('menuBotRemoveAll')?.addEventListener('click', ()=>{removeAllBots();if(dd)dd.style.display='none';});
    document.getElementById('menuBotDifficulty')?.addEventListener('click', e=>{e.stopPropagation();setBotDifficulty((GameState.botDifficulty+1)%4);if(dd)dd.style.display='none';});
    const sliders=['scaleTopBar','scaleBottomBar','scaleTable','scalePlayers','scaleButtons'];
    sliders.forEach(id=>{const slider=document.getElementById(id);if(slider)slider.addEventListener('input', updateScaleLabels);});
    applyScaleSettings();
    console.log('🎩 LIAR\'S DICE — Noir Casino (Horizontal Mode + Scale + Drag) loaded');
}

// ============================================================
// INIT
// ============================================================
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    let name = localStorage.getItem('ld_playerName');
    if (!name) {
        name = prompt('Ваше имя в салоне:', 'Гость' + Math.floor(Math.random()*900+100));
        if (!name) name = 'Гость';
        localStorage.setItem('ld_playerName', name);
    }
    GameState.myName = name;
    GameState.myAvatar = localStorage.getItem('ld_avatar') || '😎';
    GameState.myColor = localStorage.getItem('ld_color') || '#c9a961';
    GameState.mySuitColor = localStorage.getItem('ld_suit') || '#1a1a1a';
    PlayerProfile.face = GameState.myAvatar;
    PlayerProfile.accentColor = GameState.myColor;
    PlayerProfile.suitColor = GameState.mySuitColor;
    if (!room) {
        const saved = localStorage.getItem('ld_lastRoom');
        if (saved && confirm(`Вернуться в салон ${saved}?`)) room = saved;
    }
    if (room) {
        GameState.currentRoomId = room;
        enterRoom(room);
    } else {
        createRoom();
    }
    setupAudioContext();
    bindEventListeners();
};

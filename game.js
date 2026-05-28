/* ============================================================
   LIAR'S DICE v8.5 — ПОЛНЫЙ КОД
   Исправления: 11 пользовательских + A-L (12 системных)
   ============================================================ */

// [I] РЕЖИМ ОТЛАДКИ
const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Game]', ...args); }
function logError(...args) { console.error('[Game Error]', ...args); }

// [F] СОСТОЯНИЕ ИГРЫ (объект вместо глобальных переменных)
const GameState = {
    // Firebase
    roomRef: null,
    // Локальные данные
    myUid: '', myName: '', myAvatar: '🎲', myColor: '#ffffff',
    currentRoomId: '', isHost: false,
    // Данные игры
    players: {}, lastBet: null, gameState: 'lobby',
    roundNumber: 0, turnCounter: 0, currentPlayerUid: null,
    isGhost: false, ghostTarget: null, devilDealsUsed: 0, blood: 0,
    usedSpecialThisRound: {}, thiefUsedThisRound: false,
    sniperShotUsedThisRound: false, artifactHistory: [],
    spyMemory: {},
    // Настройки
    defaultLives: 3, specialDiceEnabled: true, soundEnabled: true,
    // Боты
    botDifficulty: 2, bots: {}, isBotThinking: false,
    expertKnownDice: {},
    // Голосование
    currentVoteTarget: null, lastVoteEndTime: 0,
    // Сделка с Дьяволом
    devilDealData: null,
    // Таймеры (для очистки)
    timers: { accusation: null, devilDeal: null, vote: null, bot: [] },
    // [E] Валидация
    isValid: true
};

const VOTE_COOLDOWN = 120000;
const MAX_HISTORY = 50; // [9] Лимит истории артефактов

// [K] КОНСТАНТЫ (уже вынесены в начало файла)
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

// [D] СТРАТЕГИИ АРТЕФАКТОВ (паттерн Strategy)
const ARTIFACT_STRATEGIES = {};

// ============================================================
// FIREBASE ИНИЦИАЛИЗАЦИЯ
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

// ============================================================
// УТИЛИТЫ
// ============================================================

function getDieEmoji(v) {
    const val = parseInt(v) || 1;
    return ['?','⚀','⚁','⚂','⚃','⚄','⚅'][val] || '⚀';
}

// [11] XSS-ЗАЩИТА
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
        // [11] Защита от XSS: используем escapeHtml
        const parts = msg.split(':');
        const name = escapeHtml(parts[0]);
        const text = escapeHtml(parts.slice(1).join(':'));
        e.innerHTML = `${escapeHtml(senderAvatar)} <span style="color:${senderColor}">${name}</span>:${text}`;
    } else {
        e.textContent = msg;
    }
    const log = document.getElementById('chatLog');
    if (log) {
        log.insertBefore(e, log.firstChild);
        while (log.children.length > 60) log.removeChild(log.lastChild);
    }
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

let audioContext = null;
function setupAudioContext() {
    try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { logError('AudioContext:', e); }
}

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// [E] ВАЛИДАЦИЯ ДАННЫХ ИГРОКА
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

// [E] ВАЛИДАЦИЯ СТАВКИ
function validateBet(bet) {
    if (!bet || typeof bet !== 'object') return false;
    if (typeof bet.count !== 'number' || bet.count < 1 || bet.count > 100) return false;
    if (typeof bet.value !== 'number' || bet.value < 1 || bet.value > 6) return false;
    if (typeof bet.player !== 'string') return false;
    return true;
}

// [H] ОБЁРТКА ДЛЯ FIREBASE С ОБРАБОТКОЙ ОШИБОК
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

// ============================================================
// УПРАВЛЕНИЕ ТАЙМЕРАМИ [A]
// ============================================================
function clearAllTimers() {
    if (GameState.timers.accusation) { clearTimeout(GameState.timers.accusation); GameState.timers.accusation = null; }
    if (GameState.timers.devilDeal) { clearInterval(GameState.timers.devilDeal); GameState.timers.devilDeal = null; }
    if (GameState.timers.vote) { clearInterval(GameState.timers.vote); GameState.timers.vote = null; }
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
    log('🧹 Все таймеры очищены');
}

function clearBotTimers() {
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
}

// ============================================================
// КОМНАТЫ
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
        players: {},
        state: 'lobby',
        round: 0,
        lastBet: null,
        settings: { specialDiceEnabled: true, defaultLives: 3 },
        artifactHistory: [],
        turnCounter: 0,
        createdAt: Date.now()
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

    // [C] Восстановление UID из localStorage
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
        // Сохраняем для будущих сессий
        localStorage.setItem('ld_myUid', GameState.myUid);
        localStorage.setItem('ld_playerName', GameState.myName);
        localStorage.setItem('ld_avatar', GameState.myAvatar);
        localStorage.setItem('ld_color', GameState.myColor);
    }

    // [C] Сохраняем ID комнаты для восстановления
    localStorage.setItem('ld_lastRoom', roomId);

    const playerData = {
        name: GameState.myName,
        uid: GameState.myUid,
        avatar: GameState.myAvatar,
        color: GameState.myColor,
        dice: [],
        poisons: 0,
        blood: 0,
        alive: true,
        isGhost: false,
        artifact: null,
        usedSpecialThisRound: {},
        lastBetInRound: null,
        devilDealsUsed: 0,
        connected: true,
        lastSeenTurn: 0,
        maxLives: GameState.defaultLives,
        joinedAt: Date.now()
    };

    safeSet(GameState.roomRef.child('players').child(GameState.myUid), playerData, 'enterRoom');
    GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().update({ connected: false, lastSeenTurn: GameState.turnCounter });

    setupRoomListeners();
    appendChat(`🎉 ${GameState.myName} вошёл в комнату ${roomId}`, 'system');

    // [10] Подписка на состояние соединения
    setupConnectionListener();
}

// ============================================================
// СЛУШАТЕЛИ FIREBASE
// ============================================================
function setupRoomListeners() {
    GameState.roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // [E] Базовая валидация
        const oldPlayers = GameState.players;
        GameState.players = data.players || {};
        GameState.gameState = data.state || 'lobby';

        if (data.settings && data.settings.defaultLives) {
            GameState.defaultLives = data.settings.defaultLives;
            const menuLives = document.getElementById('menuLives');
            if (menuLives) menuLives.textContent = `❤️ Жизни: ${GameState.defaultLives}`;
        }

        if (data.settings && typeof data.settings.specialDiceEnabled === 'boolean') {
            GameState.specialDiceEnabled = data.settings.specialDiceEnabled;
            const menuArtifacts = document.getElementById('menuArtifacts');
            if (menuArtifacts) menuArtifacts.textContent = `🎲 Артефакты: ${GameState.specialDiceEnabled ? '✅' : '❌'}`;
        }

        // [E] Валидация ставки
        if (data.lastBet && validateBet(data.lastBet)) {
            GameState.lastBet = data.lastBet;
        } else {
            GameState.lastBet = null;
        }

        GameState.roundNumber = data.round || 0;
        // [9] Ограничение истории артефактов
        GameState.artifactHistory = Array.isArray(data.artifactHistory) ? data.artifactHistory.slice(-MAX_HISTORY) : [];
        GameState.turnCounter = data.turnCounter || 0;
        GameState.currentPlayerUid = data.currentPlayerUid || null;

        // [E] Валидация данных игроков
        Object.keys(GameState.players).forEach(uid => {
            const p = GameState.players[uid];
            if (!validatePlayerData(p)) {
                logError(`⚠️ Невалидные данные игрока ${uid}:`, p);
            }
        });

        // Обновление своей копии
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
        if (GameState.gameState === 'accusing') {
            const panel = document.getElementById('accusationPanel');
            if (panel) panel.style.display = 'block';
            const accusingData = data.accusingData;
            if (accusingData && GameState.lastBet) {
                const accused = GameState.players[accusingData.accused];
                const phraseEl = document.getElementById('accusationPhrase');
                if (phraseEl && accused) {
                    phraseEl.textContent = `${accused.name} обвинён в блефе! Проверка...`;
                }
                let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
                Object.values(GameState.players).forEach(p => {
                    if (p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d) || 1]++);
                });
                const sm = Object.keys(ct).filter(k => ct[k] > 0).map(k => `${ct[k]}x${getDieEmoji(k)}`).join('  ');
                const summaryEl = document.getElementById('accusationDiceSummary');
                if (summaryEl) summaryEl.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;
            }
            const accusationResult = data.accusationResult;
            if (accusationResult) {
                const resultEl = document.getElementById('accusationResult');
                const effectsEl = document.getElementById('accusationEffects');
                if (resultEl) {
                    resultEl.textContent = accusationResult.resultText;
                    resultEl.className = accusationResult.resultClass;
                }
                if (effectsEl && accusationResult.effects) {
                    effectsEl.innerHTML = accusationResult.effects;
                }
            }
        } else {
            const panel = document.getElementById('accusationPanel');
            if (panel && panel.style.display === 'block') panel.style.display = 'none';
        }

        renderUI();
        if (GameState.gameState === 'betting' && GameState.currentPlayerUid &&
            GameState.players[GameState.currentPlayerUid]?.isBot &&
            GameState.currentPlayerUid !== GameState.myUid &&
            !GameState.isBotThinking) {
            botTurn(GameState.currentPlayerUid);
        }
    });

    GameState.roomRef.child('chat').limitToLast(60).on('child_added', (s) => {
        const msg = s.val();
        if (!msg) return;
        if (msg.sender !== GameState.myName) {
            const player = Object.values(GameState.players).find(p => p.name === msg.sender);
            const color = player?.color || '#ffffff';
            const avatar = player?.avatar || '';
            appendChat(`${msg.sender}: ${msg.text}`, msg.type || 'normal', color, avatar);
        } else {
            appendChat(`${msg.sender}: ${msg.text}`, msg.type || 'normal', GameState.myColor, GameState.myAvatar);
        }
    });

    GameState.roomRef.child('votes').on('value', (s) => {
        const votes = s.val();
        if (votes && GameState.currentVoteTarget && votes[GameState.currentVoteTarget]) {
            updateVoteUI(votes[GameState.currentVoteTarget]);
        }
    });
}

// [10] СЛУШАТЕЛЬ СОСТОЯНИЯ СОЕДИНЕНИЯ
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
                log('✅ Соединение восстановлено');
                // [10] При восстановлении — пометить себя как online
                if (GameState.roomRef && GameState.myUid) {
                    safeUpdate(
                        GameState.roomRef.child('players').child(GameState.myUid),
                        { connected: true, lastSeenTurn: GameState.turnCounter },
                        'reconnect'
                    );
                }
            } else {
                statusEl.className = 'connection-status offline';
                statusEl.textContent = '○';
                document.body.classList.add('offline');
                showNotification('⚠️ Потеряно соединение. Восстановление...', 'warning');
                log('❌ Потеря соединения');
            }
        }
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
    const statusEl = document.getElementById('gameStatusText');
    if (!statusEl) return;
    switch (GameState.gameState) {
        case 'lobby': statusEl.textContent = 'Лобби'; break;
        case 'betting': statusEl.textContent = `Раунд ${GameState.roundNumber} | Ход: ${cp}`; break;
        case 'accusing': statusEl.textContent = '⚖️ Проверка ставки'; break;
        case 'devil_deal': statusEl.textContent = '😈 Сделка с Дьяволом'; break;
        case 'ended':
            const w = Object.values(GameState.players).find(p => p?.alive && !p.isGhost);
            statusEl.textContent = w ? `🏆 ${w.name} победил!` : 'Ничья';
            break;
    }
}

function getCurrentPlayerName() {
    const u = getCurrentPlayerUid();
    return u && GameState.players[u] ? GameState.players[u].name : '—';
}

function getCurrentPlayerUid() {
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (!au.length) return null;
    au.sort((a, b) => (GameState.players[a].joinedAt || 0) - (GameState.players[b].joinedAt || 0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0];
    const currentIndex = au.indexOf(GameState.lastBet.player);
    return au[(currentIndex + 1) % au.length];
}

function updateLastBetDisplay() {
    const displayEl = document.getElementById('lastBetDisplay');
    if (!displayEl) return;
    if (GameState.lastBet && GameState.players[GameState.lastBet.player]) {
        const p = GameState.players[GameState.lastBet.player];
        displayEl.innerHTML = `${escapeHtml(p.name)}: ${GameState.lastBet.count}×<span style="font-size:2em;">${getDieEmoji(GameState.lastBet.value)}</span>`;
    } else {
        displayEl.textContent = 'Последняя ставка: —';
    }
}

// [J] РЕНДЕР С КЭШИРОВАНИЕМ DOM
function renderPlayerList() {
    const container = document.getElementById('playerList');
    if (!container) return;
    const cu = getCurrentPlayerUid();
    const sortedUids = Object.keys(GameState.players).sort((a, b) => (GameState.players[a].joinedAt || 0) - (GameState.players[b].joinedAt || 0));
    const currentUids = new Set(sortedUids);

    // Удалить карточки отсутствующих игроков
    playerCardsCache.forEach((card, uid) => {
        if (!currentUids.has(uid)) {
            card.remove();
            playerCardsCache.delete(uid);
        }
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
        // Обновление
        c.className = 'player-card no-select';
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) c.classList.add('active');
        if (p.frozen) c.classList.add('frozen');
        if (p.cursed || p.evilEyed) c.classList.add('cursed');

        c.innerHTML = '';
        const i = document.createElement('div');
        i.className = 'player-info';
        const avatarSpan = document.createElement('span');
        avatarSpan.className = 'player-avatar';
        avatarSpan.textContent = p.avatar || '🎲';
        i.appendChild(avatarSpan);
        const n = document.createElement('span');
        const ls = Math.min(p.poisons, p.maxLives || 3);
        n.className = `player-name shadow-${ls}`;
        n.style.color = p.color || '#ffffff';
        n.textContent = p.name || 'Игрок';
        if (p.isGhost) {
            const ghostSpan = document.createElement('span');
            ghostSpan.textContent = ' 👻';
            n.appendChild(ghostSpan);
        }
        i.appendChild(n);
        const s = document.createElement('span');
        s.className = 'sands-of-time';
        s.textContent = '⏳';
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) s.style.display = 'inline';
        i.appendChild(s);
        const pd = document.createElement('div');
        pd.className = 'player-poisons';
        if (GameState.gameState !== 'lobby') {
            const ml = p.maxLives || 3;
            const ts = ml + (p.blood || 0);
            for (let j = 0; j < ts; j++) {
                const sp = document.createElement('span');
                if (p.isGhost) { sp.className = 'icon-ghost'; sp.textContent = '👻'; }
                else if (!p.alive) { sp.className = 'icon-dead'; sp.textContent = '💀'; }
                else if (j < ml && j < p.poisons) { sp.className = 'icon-poison'; sp.textContent = '🫙'; }
                else if (j === ml && p.blood > 0) { sp.className = 'icon-blood'; sp.textContent = '🩸'; }
                else { sp.className = 'icon-life'; sp.textContent = '🧪'; }
                pd.appendChild(sp);
            }
        }
        c.appendChild(i);
        c.appendChild(pd);
    });
}

function renderDiceRow() {
    const container = document.getElementById('diceContainer');
    if (!container) return;
    container.innerHTML = '';
    if (GameState.gameState !== 'betting' && GameState.gameState !== 'accusing') {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    const m = GameState.players[GameState.myUid];
    if (!m) return;
    if (m.artifact) {
        const a = document.createElement('div');
        let usedClass = '';
        if (GameState.usedSpecialThisRound[m.artifact.id] && m.artifact.type === 'active') usedClass = 'used';
        else if (m.artifact.type === 'passive' && m.artifactUsed) usedClass = 'used';
        a.className = `die special ${m.artifact.type === 'passive' ? 'passive' : ''} ${usedClass}`;
        a.textContent = m.artifact.emoji;
        const infoBtn = document.createElement('div');
        infoBtn.className = 'artifact-info-btn';
        infoBtn.textContent = '?';
        infoBtn.onclick = () => showArtifactInfo(m.artifact);
        container.appendChild(infoBtn);
        container.appendChild(a);
        if (!GameState.usedSpecialThisRound[m.artifact.id] || m.artifact.type === 'passive') {
            a.onclick = () => useArtifact(m.artifact.id);
        }
    }
    if (m.dice && m.dice.length) {
        m.dice.forEach(d => {
            const s = document.createElement('div');
            s.className = 'die';
            if (m.blind) s.textContent = '?';
            else {
                const val = parseInt(d) || 1;
                s.textContent = getDieEmoji(val);
            }
            if (m.frozen) s.classList.add('frozen');
            if (m.stunned) s.classList.add('stunned');
            container.appendChild(s);
        });
    }
}

function showArtifactInfo(art) {
    const title = document.getElementById('artifactInfoTitle');
    const desc = document.getElementById('artifactInfoDesc');
    if (title && desc) {
        title.textContent = `${art.emoji} ${art.name}`;
        desc.innerHTML = `<strong>Тип:</strong> ${art.type === 'active' ? 'Активный (1 раз за раунд)' : 'Пассивный (автоматически)'}<br><br><strong>Описание:</strong> ${escapeHtml(art.description)}`;
        document.getElementById('modalArtifactInfo').style.display = 'block';
    }
}

function updateControls() {
    const mt = isMyTurn();
    const m = GameState.players[GameState.myUid] || {};
    const betCount = document.getElementById('betCount');
    const betValue = document.getElementById('betValue');
    const btnPlaceBet = document.getElementById('btnPlaceBet');
    const btnAccuse = document.getElementById('btnAccuse');
    if (betCount) betCount.disabled = !mt || GameState.isGhost;
    if (betValue) betValue.disabled = !mt || GameState.isGhost;
    if (btnPlaceBet) btnPlaceBet.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting';
    if (btnAccuse) btnAccuse.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' || !GameState.lastBet || GameState.lastBet.player === GameState.myUid || m.cannotAccuse;
    const cc = !GameState.isGhost && GameState.gameState !== 'devil_deal';
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    if (chatInput) chatInput.disabled = !cc;
    if (btnSendChat) btnSendChat.disabled = !cc;
    if (GameState.isGhost) {
        const diceContainer = document.getElementById('diceContainer');
        const controlsRow = document.getElementById('controlsRow');
        const ghostPanel = document.getElementById('ghostAbilitiesPanel');
        if (diceContainer) diceContainer.style.display = 'none';
        if (controlsRow) controlsRow.style.display = 'none';
        if (ghostPanel) ghostPanel.style.display = 'flex';
        updateGhostButtons();
    } else {
        const ghostPanel = document.getElementById('ghostAbilitiesPanel');
        const controlsRow = document.getElementById('controlsRow');
        if (ghostPanel) ghostPanel.style.display = 'none';
        if (controlsRow) controlsRow.style.display = 'flex';
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
    // [6] Бот считается как игрок. Минимум 10 за игрок/бота
    const playerCount = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
    const mp = Math.max(playerCount * 10, 10);
    // [4] Ставки могут превышать лимит (но не выше разумного)
    const upperLimit = Math.max(mp + 20, 50);
    for (let i = 1; i <= upperLimit; i++) {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = i;
        sel.appendChild(o);
    }
    const betCountVal = document.getElementById('betCount');
    if (betCountVal) betCountVal.value = GameState.lastBet ? Math.min(GameState.lastBet.count + 1, upperLimit) : 1;
}

function isMyTurn() {
    if (GameState.isGhost || GameState.gameState !== 'betting') return false;
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (!au.length) return false;
    au.sort((a, b) => (GameState.players[a].joinedAt || 0) - (GameState.players[b].joinedAt || 0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0] === GameState.myUid;
    const currentIndex = au.indexOf(GameState.lastBet.player);
    const nextPlayer = au[(currentIndex + 1) % au.length];
    return nextPlayer === GameState.myUid;
}

// ============================================================
// СТАВКИ И ОБВИНЕНИЯ
// ============================================================
function placeBet() {
    if (GameState.gameState !== 'betting') return;
    if (!isMyTurn()) { showNotification('Сейчас не ваш ход!', 'warning'); return; }
    const c = parseInt(document.getElementById('betCount').value);
    const v = parseInt(document.getElementById('betValue').value);
    const m = GameState.players[GameState.myUid];
    if (!m || isNaN(c) || isNaN(v)) return;

    // [4] Номинал всегда 1-6, количество может превышать лимит
    if (v < 1 || v > 6) {
        showNotification('Номинал должен быть от 1 до 6!', 'warning');
        return;
    }

    if (GameState.lastBet && (c < GameState.lastBet.count || (c === GameState.lastBet.count && v <= GameState.lastBet.value))) {
        showNotification('Ставка должна быть выше предыдущей!', 'warning');
        return;
    }

    // [4] Исправление forcedBluff
    if (m.forcedBluff) {
        let needCount = GameState.lastBet ? GameState.lastBet.count + 3 : 1;
        let needValue = GameState.lastBet ? GameState.lastBet.value : 1;
        if (needValue > 6) { needCount++; needValue = 1; }
        if (c < needCount || (c === needCount && v < needValue)) {
            showNotification(`Обязательная ставка: минимум ${needCount}×${getDieEmoji(needValue)}`, 'warning');
            return;
        }
    }

    const nb = { player: GameState.myUid, count: c, value: v, timestamp: Date.now() };
    GameState.lastBet = nb;
    GameState.players[GameState.myUid].lastBetInRound = nb;
    if (m.cursed) GameState.players[GameState.myUid].cursed = false;
    if (m.forcedBluff) GameState.players[GameState.myUid].forcedBluff = false;

    safeUpdate(GameState.roomRef, { lastBet: nb, turnCounter: GameState.turnCounter + 1 }, 'placeBet');
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { lastBetInRound: nb, cursed: false, forcedBluff: false }, 'placeBet-player');

    GameState.turnCounter++;
    renderUI();
    playSound('bet');
    nextTurn();
}

function accuse() {
    if (GameState.gameState !== 'betting') return;
    if (!isMyTurn()) { showNotification('Сейчас не ваш ход!', 'warning'); return; }
    if (!GameState.lastBet || GameState.lastBet.player === GameState.myUid) return;

    GameState.gameState = 'accusing';
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: {
            accuser: GameState.myUid,
            accused: GameState.lastBet.player,
            bet: GameState.lastBet,
            timestamp: Date.now()
        }
    }, 'accuse');

    const t = GameState.players[GameState.lastBet.player]?.name || 'Противник';
    const p = [
        `${GameState.myName} бьёт по столу: "${t}, ложь!"`,
        `"${t}, вскрывайся!" — ${GameState.myName}`,
        `${GameState.myName} указывает: "${t}, блеф!"`,
        `"Не верю!" — ${GameState.myName} нацелился на ${t}`
    ];
    const phraseEl = document.getElementById('accusationPhrase');
    if (phraseEl) phraseEl.textContent = p[Math.floor(Math.random() * p.length)];
    const resultEl = document.getElementById('accusationResult');
    if (resultEl) {
        resultEl.textContent = 'Проверка кубиков...';
        resultEl.className = 'accusation-result';
    }
    const effectsEl = document.getElementById('accusationEffects');
    if (effectsEl) effectsEl.innerHTML = '<h4 style="margin:5px 0; color:#ffd700;">📋 Эффекты:</h4>';

    let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
    Object.values(GameState.players).forEach(p => {
        if (p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d) || 1]++);
    });
    const sm = Object.keys(ct).filter(k => ct[k] > 0).map(k => `${ct[k]}x${getDieEmoji(k)}`).join('  ');
    const summaryEl = document.getElementById('accusationDiceSummary');
    if (summaryEl) summaryEl.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;

    const panel = document.getElementById('accusationPanel');
    if (panel) panel.style.display = 'block';
    playSound('accuse');

    if (GameState.timers.accusation) clearTimeout(GameState.timers.accusation);
    GameState.timers.accusation = setTimeout(() => resolveAccusation(GameState.lastBet.player), 3000);
}

// [3] ИСПРАВЛЕННЫЙ resolveAccusation (Дикий Кубик)
function resolveAccusation(accusedUid) {
    safeUpdate(GameState.roomRef, { accusationResult: null, accusingData: null }, 'resolveAccusation-start');

    const tv = GameState.lastBet.value;
    const accused = GameState.players[accusedUid];

    // 1. Считаем БЕЗ Дикого Кубика
    let totalDiceWithoutWild = 0;
    Object.values(GameState.players).forEach(p => {
        if (!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { if (parseInt(d) === tv) totalDiceWithoutWild++; });
    });

    // 2. Ставка ложная без Дикого?
    const isLieWithoutWild = totalDiceWithoutWild < GameState.lastBet.count;

    // 3. Учитываем Дикий Кубик (если у обвиняемого)
    let wildDieSaved = false;
    let totalDice = totalDiceWithoutWild;
    if (accused?.artifact?.id === 'wildDie') {
        totalDice++;
        wildDieSaved = true;
    }

    // 4. Финальная правдивость
    let isLie = totalDice < GameState.lastBet.count;
    if (accused?.cursed || accused?.familiarCursed) isLie = true;

    const r = document.getElementById('accusationResult');
    const e = document.getElementById('accusationEffects');

    if (isLie) {
        // ЛОЖНАЯ СТАВКА
        if (r) { r.textContent = '✅ ЛОЖНАЯ СТАВКА!'; r.className = 'accusation-result effect-green'; }
        applyPoison(accusedUid, 1, 'Ложная ставка');
        addEffectLine(`🔴 ${accused?.name || 'Цель'} получает +1 яд`, e);

        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(GameState.myUid, 1);
            applyPoison(accusedUid, 2, 'Кровожадность');
            addEffectLine(`🟢 ${GameState.myName} получает +1 кровь | 🔴 ${accused.name} получает +2 яда`, e);
        } else if (accused?.artifact?.id === 'deceiver') {
            applyPoison(GameState.myUid, 2, 'Обманщик');
            addEffectLine(`🟣 ${accused.name}: Обманщик активирован | 🔴 ${GameState.myName} получает +2 яда`, e);
        } else if (accused?.darkPact) {
            applyPoison(accusedUid, 1, 'Тёмный Договор (доп. яд)');
            addEffectLine(`🟣 ${accused.name}: Тёмный Договор → +1 доп. яд (всего +2)`, e);
        }

        // [3] ДИКИЙ КУБИК: если спас ставку (ложная стала правдивой)
        if (wildDieSaved && isLieWithoutWild && !isLie) {
            applyPoison(GameState.myUid, 2, 'Дикий Кубик спас ставку');
            addEffectLine(`🔵 Дикий Кубик сработал! ${GameState.myName} получает +2 яда (ошибка + артефакт)`, e);
        }
    } else {
        // ПРАВДИВАЯ СТАВКА
        if (r) { r.textContent = '❌ ПРАВДИВАЯ СТАВКА!'; r.className = 'accusation-result effect-red'; }
        applyPoison(GameState.myUid, 1, 'Ошибочное обвинение');
        addEffectLine(`🔴 ${GameState.myName} получает +1 яд`, e);

        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
            addEffectLine(`🟢 ${accused.name} получает +1 кровь`, e);
        }
        if (accused?.darkPact) {
            GameState.players[accusedUid].darkPact = false;
            GameState.players[accusedUid].darkPactShield = true;
            GameState.players[accusedUid].darkPactRound = GameState.roundNumber + 1;
            safeUpdate(GameState.roomRef.child('players').child(accusedUid), {
                darkPact: false, darkPactShield: true, darkPactRound: GameState.roundNumber + 1
            }, 'darkPact-shield');
            addEffectLine(`🟡 ${accused.name}: Тёмный Договор → щит на след. раунд`, e);
        }

        // [3] Если Дикий Кубик был, но ставка и так была правдивой — обвинитель просто получает 1 яд
        if (wildDieSaved && !isLieWithoutWild) {
            addEffectLine(`🔵 Дикий Кубик был, но ставка была правдивой и без него`, e);
        }
    }

    const effectsHTML = e?.innerHTML || '';
    safeUpdate(GameState.roomRef, {
        accusationResult: {
            isLie: isLie, effects: effectsHTML,
            resultText: r?.textContent || '', resultClass: r?.className || ''
        }
    }, 'resolveAccusation-result');

    // [5] checkDeath вызывается ОДИН РАЗ в конце
    setTimeout(() => {
        const panel = document.getElementById('accusationPanel');
        if (panel) panel.style.display = 'none';
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, {
            state: 'betting', accusingData: null, accusationResult: null
        }, 'resolveAccusation-end');
        checkDeath();
        startNewRound();
    }, 2000);
}

function addEffectLine(t, c) {
    if (c) {
        const d = document.createElement('div');
        d.textContent = t;
        c.appendChild(d);
    }
}

// [5] applyPoison БЕЗ checkDeath
function applyPoison(uid, amt, reason) {
    const p = GameState.players[uid];
    if (!p) return;

    if (p.devilShield && p.devilShieldRound === GameState.roundNumber) {
        appendChat(`🛡️ ${p.name} защищён ЩИТОМ ДЬЯВОЛА!`, 'system');
        delete p.devilShield;
        safeUpdate(GameState.roomRef.child('players').child(uid), { devilShield: false }, 'devilShield');
        return;
    }
    if (p.defenderActive) {
        appendChat(`🛡️ ${p.name} защищён ЗАЩИТНИКОМ!`, 'system');
        p.defenderActive = false;
        safeUpdate(GameState.roomRef.child('players').child(uid), { defenderActive: false }, 'defender');
        return;
    }

    let rem = amt;
    if (p.blood > 0) {
        const u = Math.min(p.blood, rem);
        rem -= u;
        p.blood -= u;
        safeUpdate(GameState.roomRef.child('players').child(uid), { blood: p.blood }, 'blood-use');
        appendChat(`🩸 ${p.name} потратил ${u} крови`, 'system');
    }
    if (rem > 0) {
        p.poisons += rem;
        appendChat(`☠️ ${p.name} получает +${rem} яд (${reason})`, 'death');
        playSound('poison');
        safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons }, 'poison');
        renderUI();
    }
    // [5] НЕ вызываем checkDeath здесь — он вызывается один раз в конце
}

function applyBlood(uid, amt) {
    const p = GameState.players[uid];
    if (!p) return;
    p.blood = (p.blood || 0) + amt;
    appendChat(`🩸 ${p.name} получает +${amt} кровь!`, 'system');
    playSound('blood');
    safeUpdate(GameState.roomRef.child('players').child(uid), { blood: p.blood }, 'blood-gain');
    renderUI();
}

// [8] Защита от двойной победы + [7] Ничья
function checkDeath() {
    // Защита от повторного вызова
    if (GameState.gameState === 'ended') return;

    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (!p || p.isGhost) return;
        const ml = p.maxLives || 3;
        if (p.poisons >= ml && p.alive) {
            if (p.isBot && p.devilDealsUsed >= 2) {
                turnToGhost(uid);
            } else if (!p.isBot && p.devilDealsUsed >= 2) {
                // [2] Для живых тоже лимит 2
                turnToGhost(uid);
            } else {
                if (uid === GameState.myUid) startDevilDeal(uid);
                else if (!p.isBot) appendChat(`😈 ${p.name} отправляется на Сделку с Дьяволом...`, 'death');
            }
        }
    });

    const humans = Object.values(GameState.players).filter(p => p?.alive && !p.isGhost);

    // [8] Проверка победы только если ещё не окончена
    if (humans.length === 1 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'victory');
        appendChat(`🏆 ${humans[0].name} победил! Игра окончена.`, 'system');
        playSound('win');
        showConfetti();
    } else if (humans.length === 0 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'draw');
        appendChat('💀 Ничья — все игроки мертвы или стали призраками!', 'system');
    }
}

function turnToGhost(uid) {
    const update = {
        alive: false,
        isGhost: true,
        poisons: 0,  // [7] Сброс ядов
        artifact: null,
        blood: 0,
        cursed: false,
        frozen: false,
        defenderActive: false,
        stunned: false,
        blind: false,
        devilShield: false,
        usedAbilities: {},
        lastBetInRound: null,
        dice: []
    };
    safeUpdate(GameState.roomRef.child('players').child(uid), update, 'turnToGhost');
    appendChat(`👻 ${GameState.players[uid].name} стал призраком!`, 'death');
    playSound('ghost');
    checkVengeance(uid);
    renderUI();
    if (uid === GameState.myUid) {
        document.getElementById('ghostAbilitiesPanel').style.display = 'flex';
        updateGhostButtons();
    }
}

// [2] НОВАЯ СДЕЛКА С ДЬЯВОЛОМ — 3 варианта жертвы
function startDevilDeal(uid) {
    if (uid !== GameState.myUid) return;
    GameState.gameState = 'devil_deal';
    safeUpdate(GameState.roomRef, { state: 'devil_deal' }, 'startDevilDeal');

    const dealsUsed = GameState.devilDealsUsed || 0;

    // 3 варианта жертвы:
    const options = [
        {
            id: 'lose_dice',
            title: '🎲 Потерять 2 кубика навсегда',
            desc: 'Воскреснуть с 3 кубиками вместо 5 до конца игры',
            apply: () => ({
                poisons: 0, blood: 0, alive: true, isGhost: false,
                artifact: null, dice: Array(3).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                maxDice: 3,
                devilDealsUsed: dealsUsed + 1
            })
        },
        {
            id: 'lose_artifacts',
            title: '🚫 Потерять все артефакты',
            desc: 'Воскреснуть, но больше не получать артефакты до конца игры',
            apply: () => ({
                poisons: 0, blood: 0, alive: true, isGhost: false,
                artifact: null, dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                noArtifactsForever: true,
                devilDealsUsed: dealsUsed + 1
            })
        },
        {
            id: 'lose_maxlife',
            title: '💔 Потерять 1 максимальную жизнь',
            desc: `Воскреснуть с ${Math.max(1, (GameState.defaultLives || 3) - 1)} макс. жизнями`,
            apply: () => ({
                poisons: 0, blood: 0, alive: true, isGhost: false,
                artifact: null, dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                maxLives: Math.max(1, (GameState.defaultLives || 3) - 1),
                devilDealsUsed: dealsUsed + 1
            })
        }
    ];

    const optionsDiv = document.getElementById('devilOptions');
    if (optionsDiv) {
        optionsDiv.innerHTML = options.map(o => `
            <button class="devil-opt" data-id="${o.id}">
                <strong>${o.title}</strong>
                ${o.desc}
            </button>
        `).join('');

        optionsDiv.querySelectorAll('.devil-opt').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const option = options.find(o => o.id === id);
                if (option) resolveDevilDeal(option.apply());
            };
        });
    }

    // Кнопка отказа
    const btnRefuse = document.getElementById('btnRefuseDeal');
    if (btnRefuse) {
        btnRefuse.onclick = () => {
            turnToGhost(uid);
            appendChat(`😈 ${GameState.myName} отказался от сделки и стал ПРИЗРАКОМ!`, 'death');
            playSound('devilLose');
            GameState.gameState = 'betting';
            safeUpdate(GameState.roomRef, { state: 'betting' }, 'refuseDeal');
            document.getElementById('devilModal').style.display = 'none';
            setTimeout(startNewRound, 2500);
        };
    }

    const fi = document.getElementById('devilFire');
    if (fi) {
        fi.style.animation = 'none';
        fi.offsetHeight;
        fi.style.animation = 'fireRise 30s linear forwards';
    }
    const modal = document.getElementById('devilModal');
    if (modal) modal.style.display = 'block';
    playSound('devil');
    appendChat(`😈 ${GameState.myName} заключает сделку с Дьяволом...`, 'death');
}

function resolveDevilDeal(updateData) {
    const modal = document.getElementById('devilModal');
    if (modal) modal.style.display = 'none';

    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), updateData, 'resolveDevilDeal');
    renderUI();
    appendChat(`😈 ${GameState.myName} ВЫИГРАЛ сделку! Принёс жертву.`, 'system');
    playSound('devilWin');

    GameState.gameState = 'betting';
    safeUpdate(GameState.roomRef, { state: 'betting' }, 'devilDeal-end');
    setTimeout(startNewRound, 2500);
}

// [7] Воскрешение с 1 жизнью и 0 крови
function checkVengeance(uid) {
    Object.keys(GameState.players).forEach(u => {
        const p = GameState.players[u];
        if (p?.isGhost && p.ghostTarget === uid) {
            const update = {
                alive: true,
                isGhost: false,
                poisons: (p.maxLives || 3) - 1,  // [7] 1 жизнь = maxLives-1 ядов
                blood: 0,
                ghostTarget: null,
                artifact: null,
                usedAbilities: {},
                dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1)
            };
            safeUpdate(GameState.roomRef.child('players').child(u), update, 'vengeance');
            appendChat(`⚔️ ПРИЗРАК ${p.name} ВОСКРЕС через МЕСТЬ! (1 жизнь)`, 'system');
            playSound('resurrection');
        }
    });
}

async function startNewRound() {
    const settingsSnapshot = await GameState.roomRef.child('settings').once('value');
    const settings = settingsSnapshot.val();
    if (settings) {
        GameState.specialDiceEnabled = settings.specialDiceEnabled !== false;
        if (settings.defaultLives) GameState.defaultLives = settings.defaultLives;
    }
    if (GameState.gameState !== 'betting' && GameState.gameState !== 'lobby') return;
    const aliveCount = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
    if (aliveCount < 1) return;

    // [8] Сохраняем копию lastBet до обнуления
    const lastBetCopy = GameState.lastBet ? { ...GameState.lastBet } : null;

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
            const lastTwoArtifacts = GameState.artifactHistory.filter(a => a.endsWith('_' + uid)).slice(-2);
            const av = ARTIFACTS.filter(a => !lastTwoArtifacts.includes(a.id + '_' + uid));
            const ar = av.length > 0 ? av[Math.floor(Math.random() * av.length)] : ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
            GameState.artifactHistory.push(ar.id + '_' + uid);

            // Учитываем maxDice (если игрок потерял кубики)
            const numDice = p.maxDice || 5;
            let dc = Array(numDice).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
            if (p.evilEyed) dc = dc.map(() => Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4);

            // Не выдавать артефакт, если noArtifactsForever
            const artData = (GameState.specialDiceEnabled && !p.noArtifactsForever) ? ar : null;

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
        }
    });

    // [9] Ограничение истории
    if (GameState.artifactHistory.length > MAX_HISTORY) {
        GameState.artifactHistory = GameState.artifactHistory.slice(-MAX_HISTORY);
    }

    updates.round = GameState.roundNumber;
    updates.state = 'betting';
    updates.lastBet = null;
    updates.turnCounter = GameState.turnCounter;
    updates.artifactHistory = GameState.artifactHistory;

    const aliveUids = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (aliveUids.length) {
        aliveUids.sort((a, b) => (GameState.players[a].joinedAt || 0) - (GameState.players[b].joinedAt || 0));
        if (lastBetCopy && lastBetCopy.player) {
            const lastPlayerIndex = aliveUids.indexOf(lastBetCopy.player);
            if (lastPlayerIndex !== -1) {
                updates.currentPlayerUid = aliveUids[(lastPlayerIndex + 1) % aliveUids.length];
            } else {
                updates.currentPlayerUid = aliveUids[0];
            }
        } else {
            updates.currentPlayerUid = aliveUids[0];
        }
        GameState.currentPlayerUid = updates.currentPlayerUid;
    }

    safeUpdate(GameState.roomRef, updates, 'startNewRound');
    appendChat(`🎲 === РАУНД ${GameState.roundNumber} НАЧАЛСЯ! ===`, 'system');
    playSound('round');
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

function nextTurn() {
    if (GameState.gameState !== 'betting') return;
    const aliveUids = Object.keys(GameState.players).filter(uid => GameState.players[uid]?.alive && !GameState.players[uid]?.isGhost);
    if (aliveUids.length === 0) return;
    aliveUids.sort((a, b) => (GameState.players[a].joinedAt || 0) - (GameState.players[b].joinedAt || 0));
    let idx = aliveUids.indexOf(GameState.currentPlayerUid);
    let nextIdx = (idx + 1) % aliveUids.length;
    GameState.currentPlayerUid = aliveUids[nextIdx];
    GameState.turnCounter++;
    safeUpdate(GameState.roomRef, { currentPlayerUid: GameState.currentPlayerUid, turnCounter: GameState.turnCounter }, 'nextTurn');
    renderUI();
    if (GameState.currentPlayerUid && GameState.players[GameState.currentPlayerUid]?.isBot && GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

// ============================================================
// БОТЫ [6][G][L]
// ============================================================
function addBot() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') {
        showNotification('Можно добавлять ботов только в лобби или после окончания игры', 'warning');
        return;
    }
    const botCountTotal = Object.keys(GameState.players).filter(u => GameState.players[u]?.isBot).length;
    if (botCountTotal >= 5) {
        showNotification('Максимум 5 ботов в комнате', 'warning');
        return;
    }
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const botData = {
        name: '🤖 Бот',
        uid: botId,
        avatar: '🤖',
        color: '#aaaaaa',
        dice: [],
        poisons: 0,
        blood: 0,
        alive: true,
        isGhost: false,
        artifact: null,
        usedSpecialThisRound: {},
        lastBetInRound: null,
        devilDealsUsed: 0,
        connected: true,
        lastSeenTurn: 0,
        maxLives: GameState.defaultLives,
        isBot: true,
        botDifficulty: GameState.botDifficulty,
        cursed: false, frozen: false, defenderActive: false, stunned: false, blind: false,
        darkPact: false, darkPactShield: false, devilShield: false, evilEyed: false,
        forcedBluff: false, cannotAccuse: false, sniperShotUsedThisRound: false,
        familiarCursed: false, usedAbilities: {}, joinedAt: Date.now()
    };
    GameState.bots[botId] = { difficulty: GameState.botDifficulty, knownDice: {} };
    safeSet(GameState.roomRef.child('players').child(botId), botData, 'addBot');
    appendChat(`🤖 Бот (${botDifficultyNames[GameState.botDifficulty]}) присоединился к игре`, 'system');
}

function removeAllBots() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') {
        showNotification('Можно удалять ботов только в лобби или после окончания игры', 'warning');
        return;
    }
    Object.keys(GameState.players).forEach(uid => {
        if (GameState.players[uid]?.isBot) {
            GameState.roomRef.child('players').child(uid).remove();
        }
    });
    GameState.bots = {};
    GameState.expertKnownDice = {};
    appendChat(`🤖 Все боты удалены`, 'system');
}

function setBotDifficulty(level) {
    GameState.botDifficulty = level;
    const label = document.getElementById('botDifficultyLabel');
    if (label) label.innerText = botDifficultyNames[level];
    appendChat(`Сложность новых ботов: ${botDifficultyNames[level]}`, 'system');
}

// [G] botTurn с защитой от зависания
function botTurn(botId) {
    if (GameState.isBotThinking) return;
    GameState.isBotThinking = true;
    let difficulty = GameState.bots[botId]?.difficulty ?? 2;
    let delay = [8000, 6000, 6000, 4000][difficulty] + Math.random() * 2000;
    let maxDelay = 12000;

    const safetyTimeout = setTimeout(() => {
        if (GameState.isBotThinking) {
            logError(`⚠️ Бот ${botId} завис, принудительная передача хода`);
            GameState.isBotThinking = false;
            nextTurn();
        }
    }, maxDelay);

    const mainTimeout = setTimeout(() => {
        clearTimeout(safetyTimeout);
        if (GameState.gameState !== 'betting' || GameState.currentPlayerUid !== botId) {
            GameState.isBotThinking = false;
            return;
        }
        let bot = GameState.players[botId];
        if (!bot || bot.isGhost) {
            GameState.isBotThinking = false;
            nextTurn();
            return;
        }
        if (bot.artifact && bot.artifact.type === 'active') botUseArtifact(botId);
        if (bot.isGhost) botUseGhostAbility(botId);
        botMakeDecision(botId);
    }, Math.min(delay, maxDelay - 1000));

    GameState.timers.bot.push(safetyTimeout, mainTimeout);
}

function botMakeDecision(botId) {
    let bot = GameState.players[botId];
    if (!bot || bot.isGhost) { GameState.isBotThinking = false; nextTurn(); return; }
    let difficulty = GameState.bots[botId]?.difficulty ?? 2;
    let accuseProb = [0.2, 0.35, 0.5, 0.7][difficulty];
    let shouldAccuse = false;
    if (GameState.lastBet && GameState.lastBet.player !== botId) {
        if (difficulty === 3) shouldAccuse = evaluateBetTruthfulness(GameState.lastBet, botId);
        else {
            shouldAccuse = Math.random() < accuseProb;
            if (difficulty === 2 && !shouldAccuse) shouldAccuse = evaluateBetTruthfulness(GameState.lastBet, botId);
        }
    }
    if (shouldAccuse && GameState.lastBet && GameState.lastBet.player !== botId) {
        accuseFromBot(botId);
        let msgs = ['Думаешь, я поведусь?', 'Это явный блеф!', 'Я знаю твои кубики!', 'Слишком рискованно!', 'Вскрывайся, лжец!'];
        if (Math.random() < 0.3 && difficulty === 3) appendChat(`🤖 ${bot.name}: ${msgs[Math.floor(Math.random() * msgs.length)]}`, 'system');
        else appendChat(`🤖 ${bot.name} обвиняет ${GameState.players[GameState.lastBet.player]?.name} в блефе!`, 'system');
        GameState.isBotThinking = false;
        return;
    }
    // [6] Бот = игрок. Минимум 10 кубиков за каждого
    const playerCount = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
    let maxPossible = Math.max(playerCount * 10, 10);
    let newCount, newValue;
    if (!GameState.lastBet) {
        if (difficulty === 0) {
            newCount = Math.floor(Math.random() * Math.min(maxPossible, 20)) + 1;
            newValue = Math.floor(Math.random() * 6) + 1;
        } else {
            let myBest = getBestValue(bot.dice);
            newCount = Math.min(maxPossible, Math.max(1, myBest.count + (difficulty === 1 ? 0 : Math.floor(Math.random() * 3))));
            newValue = myBest.value;
        }
    } else {
        let myDice = bot.dice;
        let counts = {};
        for (let d of myDice) counts[d] = (counts[d] || 0) + 1;
        let bestValue = 1, bestCount = 0;
        for (let v = 1; v <= 6; v++) if (counts[v] > bestCount) { bestCount = counts[v]; bestValue = v; }
        let bluff = 0;
        if (difficulty === 0) bluff = Math.floor(Math.random() * 5) - 1;
        else if (difficulty === 1) bluff = Math.floor(Math.random() * 3);
        else if (difficulty === 2) bluff = Math.floor(Math.random() * 4);
        else {
            let trueTotal = estimateTrueCount(GameState.lastBet.value, botId);
            if (GameState.lastBet.count <= trueTotal) bluff = 1;
            else bluff = -1;
        }
        newCount = Math.min(maxPossible + 10, Math.max(1, bestCount + bluff));
        if (newCount < GameState.lastBet.count) newCount = GameState.lastBet.count + 1;
        newValue = bestValue;
        if (newCount === GameState.lastBet.count && newValue <= GameState.lastBet.value) newValue = GameState.lastBet.value + 1;
        // [4] Номинал всегда 1-6
        if (newValue > 6) {
            if (newCount < maxPossible + 10) { newValue = 1; newCount++; }
            else newValue = 6;
        }
    }
    const betData = { player: botId, count: newCount, value: newValue, timestamp: Date.now() };
    GameState.lastBet = betData;
    GameState.players[botId].lastBetInRound = betData;
    safeUpdate(GameState.roomRef, { lastBet: betData, turnCounter: GameState.turnCounter + 1 }, 'botMakeDecision');
    safeUpdate(GameState.roomRef.child('players').child(botId), { lastBetInRound: betData }, 'botMakeDecision-player');
    appendChat(`🤖 ${bot.name} ставит ${newCount}×${getDieEmoji(newValue)}`, 'system');
    GameState.turnCounter++;
    GameState.isBotThinking = false;
    nextTurn();
}

function getBestValue(dice) {
    let counts = {};
    for (let d of dice) counts[d] = (counts[d] || 0) + 1;
    let best = 1, bestCount = 0;
    for (let v = 1; v <= 6; v++) if (counts[v] > bestCount) { bestCount = counts[v]; best = v; }
    return { count: bestCount, value: best };
}

function estimateTrueCount(value, botId) {
    let total = 0;
    for (let uid in GameState.players) {
        let p = GameState.players[uid];
        if (!p.alive || p.isGhost) continue;
        if (uid === botId) total += p.dice.filter(d => d === value).length;
        else {
            let known = getKnownDiceForExpert(botId, uid);
            if (known) {
                for (let d of known) if (d === value) total++;
                let unknown = known.filter(d => d === null).length;
                total += unknown * (1/6);
            } else total += p.dice.length * (1/6);
        }
    }
    return Math.round(total);
}

function updateExpertKnowledge(botId, targetId, newDice) {
    if (GameState.bots[botId]?.difficulty !== 3) return;
    if (!GameState.expertKnownDice[botId]) GameState.expertKnownDice[botId] = {};
    let indices = [0,1,2,3,4];
    for (let i = indices.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let knownIndices = indices.slice(0, 4);
    let known = Array(5).fill(null);
    for (let idx of knownIndices) known[idx] = newDice[idx];
    GameState.expertKnownDice[botId][targetId] = known;
}

function getKnownDiceForExpert(botId, targetId) {
    if (GameState.bots[botId]?.difficulty !== 3) return null;
    return GameState.expertKnownDice[botId]?.[targetId] || null;
}

function evaluateBetTruthfulness(bet, botId) {
    let bot = GameState.players[botId];
    let difficulty = GameState.bots[botId]?.difficulty ?? 2;
    if (difficulty === 0) return Math.random() < 0.2;
    let totalKnown = 0, totalPossible = 0, targetValue = bet.value;
    for (let uid in GameState.players) {
        if (uid === botId) continue;
        let p = GameState.players[uid];
        if (!p.alive || p.isGhost) continue;
        let knownDice = getKnownDiceForExpert(botId, uid);
        if (difficulty === 3 && knownDice) {
            for (let d of knownDice) if (d !== null && d === targetValue) totalKnown++;
            let unknownCount = knownDice.filter(d => d === null).length;
            totalPossible += unknownCount;
        } else totalPossible += p.dice.length;
    }
    let myDice = bot.dice;
    let myCount = myDice.filter(d => d === targetValue).length;
    totalKnown += myCount;
    if (difficulty === 3 && totalPossible > 0) {
        let minTotal = totalKnown, maxTotal = totalKnown + totalPossible;
        if (bet.count <= minTotal) return false;
        if (bet.count > maxTotal) return true;
        let prob = (maxTotal - bet.count) / (maxTotal - minTotal + 1);
        return prob > 0.6;
    } else if (difficulty === 2) {
        let otherAverage = totalPossible * (1/6);
        let totalEstimate = myCount + otherAverage;
        let variance = Math.sqrt(totalPossible * (1/6) * (5/6));
        let z = (bet.count - totalEstimate) / variance;
        return z > 1.5;
    } else return bet.count > myCount + 2;
}

function botUseArtifact(botId) {
    let bot = GameState.players[botId];
    if (!bot || bot.isGhost || !bot.artifact || bot.artifact.type !== 'active') return false;
    let difficulty = GameState.bots[botId]?.difficulty ?? 2;
    if (difficulty === 0) return false;
    let chance = [0, 0.3, 0.7, 1.0][difficulty];
    if (Math.random() > chance) return false;
    let art = bot.artifact;
    let targets = Object.keys(GameState.players).filter(u => u !== botId && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (targets.length === 0) return false;
    let bestTarget = null;
    if (difficulty === 3) {
        if (['target','curse','ice','evilEye'].includes(art.id)) {
            bestTarget = targets.sort((a, b) => GameState.players[b].poisons - GameState.players[a].poisons)[0];
        } else if (art.id === 'blessing') {
            if (bot.poisons > 0) bestTarget = botId;
            else bestTarget = targets.find(u => GameState.players[u].poisons > 0) || null;
        } else if (art.id === 'thief') {
            let withArt = targets.filter(u => GameState.players[u].artifact && GameState.players[u].artifact.type === 'active' && !GameState.usedSpecialThisRound[GameState.players[u].artifact.id]);
            if (withArt.length) bestTarget = withArt[0];
        } else if (art.id === 'double') {
            let withLastBet = targets.filter(u => GameState.players[u].lastBetInRound);
            if (withLastBet.length) bestTarget = withLastBet[0];
        }
    } else bestTarget = targets[Math.floor(Math.random() * targets.length)];
    if (!bestTarget && !['fireball','luck'].includes(art.id)) return false;

    if (art.id === 'target') {
        let vals = bot.dice;
        let commonVal = getBestValue(vals).value;
        let targetPlayer = GameState.players[bestTarget];
        let idx = targetPlayer.dice.indexOf(commonVal);
        if (idx !== -1) targetPlayer.dice.splice(idx, 1);
        safeUpdate(GameState.roomRef.child('players').child(bestTarget), { dice: targetPlayer.dice }, 'bot-target');
        appendChat(`🤖 ${bot.name} использовал ${art.name} на ${targetPlayer.name}`, 'system');
    } else if (art.id === 'fireball' || art.id === 'luck') {
        let newDice = bot.dice.map(() => art.id === 'luck' ? (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1) : Math.floor(Math.random() * 6) + 1);
        safeUpdate(GameState.roomRef.child('players').child(botId), { dice: newDice }, 'bot-fireball');
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if (art.id === 'blessing') {
        if (bestTarget === botId) safeUpdate(GameState.roomRef.child('players').child(botId), { poisons: Math.max(0, bot.poisons - 1) }, 'bot-blessing');
        else if (bestTarget) safeUpdate(GameState.roomRef.child('players').child(bestTarget), { poisons: Math.max(0, GameState.players[bestTarget].poisons - 1) }, 'bot-blessing');
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if (art.id === 'thief' && bestTarget && GameState.players[bestTarget].artifact) {
        let stolen = GameState.players[bestTarget].artifact;
        safeUpdate(GameState.roomRef.child('players').child(botId), { artifact: stolen, usedSpecialThisRound: GameState.usedSpecialThisRound }, 'bot-thief');
        safeUpdate(GameState.roomRef.child('players').child(bestTarget), { artifact: null }, 'bot-thief-victim');
        appendChat(`🤖 ${bot.name} украл ${stolen.emoji} у ${GameState.players[bestTarget].name}`, 'system');
    } else if (art.id === 'curse' && bestTarget) {
        safeUpdate(GameState.roomRef.child('players').child(bestTarget), { cursed: true }, 'bot-curse');
        appendChat(`🤖 ${bot.name} проклял ${GameState.players[bestTarget].name}`, 'system');
    } else if (art.id === 'ice' && bestTarget) {
        safeUpdate(GameState.roomRef.child('players').child(bestTarget), { frozen: true }, 'bot-ice');
        appendChat(`🤖 ${bot.name} заморозил ${GameState.players[bestTarget].name}`, 'system');
    } else if (art.id === 'evilEye' && bestTarget) {
        safeUpdate(GameState.roomRef.child('players').child(bestTarget), { evilEyed: true }, 'bot-evileye');
        appendChat(`🤖 ${bot.name} наслал сглаз на ${GameState.players[bestTarget].name}`, 'system');
    } else if (art.id === 'double' && bestTarget && GameState.players[bestTarget].lastBetInRound) {
        let lb = GameState.players[bestTarget].lastBetInRound;
        let nc = lb.count, nv = lb.value;
        const playerCount = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost).length;
        let maxPossible = Math.max(playerCount * 10, 10);
        if (GameState.lastBet && (nc < GameState.lastBet.count || (nc === GameState.lastBet.count && nv <= GameState.lastBet.value))) {
            if (nc < maxPossible + 10) nc++;
            else { nv = Math.min(6, nv + 1); nc = 1; }
        }
        const newBet = { player: botId, count: nc, value: nv };
        GameState.lastBet = newBet;
        GameState.players[botId].lastBetInRound = newBet;
        safeUpdate(GameState.roomRef, { lastBet: newBet }, 'bot-double');
        safeUpdate(GameState.roomRef.child('players').child(botId), { lastBetInRound: newBet }, 'bot-double-player');
        appendChat(`🤖 ${bot.name} скопировал ставку ${GameState.players[bestTarget].name}`, 'system');
    }
    GameState.usedSpecialThisRound[art.id] = true;
    safeUpdate(GameState.roomRef.child('players').child(botId), { artifact: null, usedSpecialThisRound: GameState.usedSpecialThisRound }, 'bot-use-end');
    return true;
}

function botUseGhostAbility(botId) {
    let bot = GameState.players[botId];
    if (!bot.isGhost) return;
    let difficulty = GameState.bots[botId]?.difficulty ?? 2;
    if (difficulty === 0) return;
    let abilities = GHOST_ABILITIES.filter(ab => !bot.usedAbilities?.[ab.id]);
    if (abilities.length === 0) return;
    let chance = [0, 0.25, 0.6, 1.0][difficulty];
    if (Math.random() > chance) return;
    let ab = abilities[Math.floor(Math.random() * abilities.length)];
    if (ab.id === 'oathOfVengeance') {
        let targets = Object.keys(GameState.players).filter(u => u !== botId && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
        if (targets.length) {
            let target = difficulty === 3 ? targets.sort((a, b) => GameState.players[b].poisons - GameState.players[a].poisons)[0] : targets[0];
            safeUpdate(GameState.roomRef.child('players').child(botId), { ghostTarget: target }, 'bot-vengeance');
            appendChat(`⚔️ Призрак ${bot.name} выбрал цель для Мести: ${GameState.players[target].name}`, 'ghost');
        }
    } else if (ab.id === 'familiarCurse') {
        let targets = Object.keys(GameState.players).filter(u => u !== botId && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
        if (targets.length) {
            let target = targets[Math.floor(Math.random() * targets.length)];
            safeUpdate(GameState.roomRef.child('players').child(target), { familiarCursed: true }, 'bot-familiar');
            appendChat(`🔮 Призрак ${bot.name} проклял ${GameState.players[target].name}`, 'ghost');
        }
    } else if (ab.id === 'poltergeist') {
        let alive = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
        if (alive.length) {
            let r = Math.random();
            if (r < 0.33) {
                let t = alive[Math.floor(Math.random() * alive.length)];
                safeUpdate(GameState.roomRef.child('players').child(t), { dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1), evilEyed: false }, 'bot-polter-sabotage');
                appendChat(`🌀 Призрак ${bot.name} устроил саботаж ${GameState.players[t].name}`, 'ghost');
            } else if (r < 0.66) {
                let t = alive[Math.floor(Math.random() * alive.length)];
                safeUpdate(GameState.roomRef.child('players').child(t), { dice: [6,6,6,6,6], evilEyed: false }, 'bot-polter-bless');
                appendChat(`🌀 Призрак ${bot.name} благословил ${GameState.players[t].name}`, 'ghost');
            } else {
                alive.forEach(u => safeUpdate(GameState.roomRef.child('players').child(u), { dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1), evilEyed: false }, 'bot-polter-shuffle'));
                appendChat(`🌀 Призрак ${bot.name} перемешал все кубики`, 'ghost');
            }
        }
    } else if (ab.id === 'soulReaper') {
        let killed = false;
        for (let uid in GameState.players) {
            let p = GameState.players[uid];
            if (p.alive && !p.isGhost && Math.random() < 0.2) {
                let r = Math.random();
                if (r < 0.1) { applyPoison(uid, 1, 'Жатва Душ'); killed = true; }
                else if (r < 0.35 && p.artifact) { safeUpdate(GameState.roomRef.child('players').child(uid), { artifact: null }, 'bot-reaper-art'); appendChat(`💀 ${p.name}: потерял артефакт!`, 'ghost'); }
                else if (r < 0.6 && p.poisons > 0) { safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons - 1 }, 'bot-reaper-heal'); appendChat(`💀 ${p.name}: исцелился!`, 'ghost'); }
                else if (r < 0.85) { safeUpdate(GameState.roomRef.child('players').child(uid), { stunned: true }, 'bot-reaper-stun'); appendChat(`💀 ${p.name}: ошеломлён!`, 'ghost'); }
                else { safeUpdate(GameState.roomRef.child('players').child(uid), { blind: true }, 'bot-reaper-blind'); appendChat(`💀 ${p.name}: ослеплён!`, 'ghost'); }
            }
        }
        if (killed) {
            const update = {
                alive: true, isGhost: false,
                poisons: (bot.maxLives || 3) - 1,  // [7] 1 жизнь
                blood: 0, artifact: null,
                dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                usedAbilities: {}
            };
            safeUpdate(GameState.roomRef.child('players').child(botId), update, 'bot-reaper-revive');
            appendChat(`💀 Призрак ${bot.name} воскрес благодаря Жатве Душ!`, 'ghost');
            playSound('resurrection');
        }
    }
    const usedAbilities = bot.usedAbilities || {};
    usedAbilities[ab.id] = true;
    safeUpdate(GameState.roomRef.child('players').child(botId), { usedAbilities: usedAbilities }, 'bot-ability-end');
}

function accuseFromBot(botId) {
    if (!GameState.lastBet || GameState.lastBet.player === botId) return;
    const accusedUid = GameState.lastBet.player;
    const tv = GameState.lastBet.value;
    const accused = GameState.players[accusedUid];

    let totalDiceWithoutWild = 0;
    Object.values(GameState.players).forEach(p => {
        if (!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { if (parseInt(d) === tv) totalDiceWithoutWild++; });
    });
    const isLieWithoutWild = totalDiceWithoutWild < GameState.lastBet.count;
    let totalDice = totalDiceWithoutWild;
    let wildDieSaved = false;
    if (accused?.artifact?.id === 'wildDie') { totalDice++; wildDieSaved = true; }

    let isLie = totalDice < GameState.lastBet.count;
    if (accused?.cursed || accused?.familiarCursed) isLie = true;

    if (isLie) {
        applyPoison(accusedUid, 1, 'Ложная ставка (бот)');
        if (accused?.artifact?.id === 'bloodthirst') { applyBlood(botId, 1); applyPoison(accusedUid, 2, 'Кровожадность (бот)'); }
        else if (accused?.artifact?.id === 'deceiver') applyPoison(botId, 2, 'Обманщик (бот)');
        else if (accused?.darkPact) applyPoison(accusedUid, 1, 'Тёмный Договор (бот)');
        // [3] Дикий Кубик
        if (wildDieSaved && isLieWithoutWild && !isLie) applyPoison(botId, 2, 'Дикий Кубик спас ставку (бот)');
    } else {
        applyPoison(botId, 1, 'Ошибочное обвинение (бот)');
        if (accused?.artifact?.id === 'bloodthirst') applyBlood(accusedUid, 1);
        if (accused?.darkPact) {
            GameState.players[accusedUid].darkPact = false;
            GameState.players[accusedUid].darkPactShield = true;
            GameState.players[accusedUid].darkPactRound = GameState.roundNumber + 1;
            safeUpdate(GameState.roomRef.child('players').child(accusedUid), { darkPact: false, darkPactShield: true, darkPactRound: GameState.roundNumber + 1 }, 'bot-darkPact');
        }
    }
    GameState.gameState = 'betting';
    safeUpdate(GameState.roomRef, { state: 'betting' }, 'bot-accuse-end');
    checkDeath();
    setTimeout(startNewRound, 2500);
}

// ============================================================
// ГОЛОСОВАНИЕ
// ============================================================
function startVoteKick() {
    if (Date.now() - GameState.lastVoteEndTime < VOTE_COOLDOWN) {
        const w = Math.ceil((VOTE_COOLDOWN - (Date.now() - GameState.lastVoteEndTime)) / 1000);
        return showNotification(`Голосование доступно через ${w} сек`, 'warning');
    }
    const tg = Object.keys(GameState.players).filter(u => u !== GameState.myUid && !GameState.players[u]?.isBot && GameState.players[u]?.alive);
    if (!tg.length) return showNotification('Нет других живых игроков для исключения!', 'warning');
    const ld = document.getElementById('voteTargetsList');
    if (!ld) return;
    ld.innerHTML = '';
    tg.forEach(u => {
        const p = GameState.players[u];
        if (!p || !p.name) return;
        const b = document.createElement('button');
        b.className = 'select-item';
        b.textContent = p.name + (p.isGhost ? ' 👻' : '');
        b.onclick = () => {
            GameState.currentVoteTarget = u;
            const targetName = document.getElementById('voteTargetName');
            if (targetName) targetName.textContent = p.name;
            const resultDiv = document.getElementById('voteResult');
            if (resultDiv) resultDiv.textContent = '';
            const modal = document.getElementById('modalVote');
            if (modal) modal.style.display = 'block';
            startVoteTimer(u);
        };
        ld.appendChild(b);
    });
}

function startVoteTimer(tu) {
    let t = 30;
    const el = document.getElementById('voteTimer');
    safeSet(GameState.roomRef.child('votes').child(tu), {
        startTime: Date.now(), votes: {}, target: tu, initiator: GameState.myUid
    }, 'startVote');
    if (GameState.timers.vote) clearInterval(GameState.timers.vote);
    GameState.timers.vote = setInterval(() => {
        t--;
        if (el) el.textContent = t;
        if (t <= 0) {
            clearInterval(GameState.timers.vote);
            GameState.timers.vote = null;
            resolveVote(tu);
        }
    }, 1000);
}

function castVote(v) {
    if (!GameState.currentVoteTarget) return;
    safeSet(GameState.roomRef.child('votes').child(GameState.currentVoteTarget).child('votes').child(GameState.myUid), v, 'castVote');
    showNotification(`Голос принят: ${v === 'yes' ? 'ЗА' : 'ПРОТИВ'}`, 'info');
}

function updateVoteUI(vd) {
    if (!vd) return;
    const yes = Object.values(vd.votes || {}).filter(v => v === 'yes').length;
    const no = Object.values(vd.votes || {}).filter(v => v === 'no').length;
    const resultDiv = document.getElementById('voteResult');
    if (resultDiv) resultDiv.textContent = `✅ ЗА: ${yes} | ❌ ПРОТИВ: ${no}`;
}

function resolveVote(tu) {
    document.getElementById('modalVote').style.display = 'none';
    GameState.roomRef.child('votes').child(tu).once('value', (s) => {
        const vd = s.val();
        if (!vd) return;
        const votes = vd.votes || {};
        let yes = 0, no = 0;
        Object.values(votes).forEach(v => { if (v === 'yes') yes++; if (v === 'no') no++; });
        if (votes[tu] === 'yes') yes--;
        const total = yes + no;
        const kicked = total > 0 && yes > total / 2;
        if (kicked && GameState.players[tu]) {
            GameState.roomRef.child('players').child(tu).remove();
            appendChat(`🗳️ ${GameState.players[tu].name} исключён голосованием! (ЗА: ${yes}, ПРОТИВ: ${no})`, 'system');
        } else {
            appendChat(`🗳️ ${GameState.players[tu]?.name || 'Игрок'} остался! (ЗА: ${yes}, ПРОТИВ: ${no})`, 'system');
        }
        GameState.roomRef.child('votes').child(tu).remove();
        GameState.lastVoteEndTime = Date.now();
        GameState.currentVoteTarget = null;
    });
}

// ============================================================
// ПРИЗРАЧНЫЕ СПОСОБНОСТИ
// ============================================================
function useGhostAbility(id) {
    if (!GameState.isGhost) return;
    const m = GameState.players[GameState.myUid];
    const ab = GHOST_ABILITIES.find(a => a.id === id);
    if (!ab) return;
    if (ab.limit === 'once_per_ghost' && m?.usedAbilities?.[id]) {
        showNotification('Способность уже использована!', 'warning');
        return;
    }
    switch(id) {
        case 'oathOfVengeance': {
            const tv = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!tv.length) return;
            showTargetModal(tv, t => {
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { ghostTarget: t }, 'oath');
                appendChat(`⚔️ [Призрак ${m.name}] выбрал цель для Мести: ${GameState.players[t].name}`, 'ghost');
            });
            break;
        }
        case 'familiarCurse': {
            const fc = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!fc.length) return;
            showTargetModal(fc, t => {
                safeUpdate(GameState.roomRef.child('players').child(t), { familiarCursed: true }, 'familiar');
                appendChat(`🔮 [Призрак ${m.name}] проклял ${GameState.players[t].name}`, 'ghost');
            });
            break;
        }
        case 'poltergeist': {
            const ef = ['sabotage', 'blessing', 'shuffle'];
            const ch = ef[Math.floor(Math.random() * ef.length)];
            const al = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!al.length) return;
            if (ch === 'sabotage') {
                const t = al[Math.floor(Math.random() * al.length)];
                safeUpdate(GameState.roomRef.child('players').child(t), { dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1), evilEyed: false }, 'polter-sab');
                appendChat(`🌀 [Полтергейст] САБОТАЖ: ${GameState.players[t].name}`, 'ghost');
            } else if (ch === 'blessing') {
                const t = al[Math.floor(Math.random() * al.length)];
                safeUpdate(GameState.roomRef.child('players').child(t), { dice: [6,6,6,6,6], evilEyed: false }, 'polter-bless');
                appendChat(`🌀 [Полтергейст] БЛАГОСЛОВЕНИЕ: ${GameState.players[t].name}`, 'ghost');
            } else {
                al.forEach(u => safeUpdate(GameState.roomRef.child('players').child(u), { dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1), evilEyed: false }, 'polter-shuffle'));
                appendChat(`🌀 [Полтергейст] ПЕРЕМЕШИВАНИЕ`, 'ghost');
            }
            break;
        }
        case 'keeperOfSecrets': {
            const cd = document.getElementById('keeperContent');
            if (cd) {
                cd.innerHTML = '';
                Object.values(GameState.players).forEach(p => {
                    if (p?.alive && !p.isGhost) {
                        const d = document.createElement('div');
                        d.style.marginBottom = '10px'; d.style.background = 'rgba(255,255,255,0.05)'; d.style.padding = '8px'; d.style.borderRadius = '5px';
                        d.innerHTML = `<strong style="color:#ffd700">${escapeHtml(p.name)}</strong>: <span style="font-size:1.2em">${p.dice.map(d => getDieEmoji(parseInt(d) || 1)).join(' ')}</span>`;
                        cd.appendChild(d);
                    }
                });
                document.getElementById('modalKeeper').style.display = 'block';
            }
            return;
        }
        case 'soulReaper': {
            const sr = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!sr.length) return;
            let killed = false;
            sr.forEach(uid => {
                if (Math.random() < 0.2) {
                    const p = GameState.players[uid];
                    const r = Math.random();
                    let ef = r < 0.1 ? 'death' : r < 0.35 ? 'loseArtifact' : r < 0.6 ? 'heal' : r < 0.85 ? 'stun' : 'blind';
                    if (ef === 'death') { applyPoison(uid, 1, 'Жатва Душ'); killed = true; }
                    else if (ef === 'loseArtifact' && p.artifact) { safeUpdate(GameState.roomRef.child('players').child(uid), { artifact: null }, 'reaper-art'); appendChat(`💀 ${p.name}: потерял артефакт!`, 'ghost'); }
                    else if (ef === 'heal' && p.poisons > 0) { safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons - 1 }, 'reaper-heal'); appendChat(`💀 ${p.name}: исцелился!`, 'ghost'); }
                    else if (ef === 'stun') { safeUpdate(GameState.roomRef.child('players').child(uid), { stunned: true }, 'reaper-stun'); appendChat(`💀 ${p.name}: ошеломлён!`, 'ghost'); }
                    else if (ef === 'blind') { safeUpdate(GameState.roomRef.child('players').child(uid), { blind: true }, 'reaper-blind'); appendChat(`💀 ${p.name}: ослеплён!`, 'ghost'); }
                }
            });
            if (killed) {
                const update = {
                    alive: true, isGhost: false,
                    poisons: (m.maxLives || 3) - 1,  // [7] 1 жизнь
                    blood: 0, artifact: null,
                    dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                    usedAbilities: {}
                };
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), update, 'reaper-revive');
                appendChat(`💀 [Призрак ${m.name}] Жатва Душ принесла смерть — ПРИЗРАК ВОСКРЕС! (1 жизнь)`, 'ghost');
                playSound('resurrection');
            }
            break;
        }
    }
    const usedAbilities = m.usedAbilities || {};
    usedAbilities[id] = true;
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { usedAbilities: usedAbilities }, 'ghost-ability');
    playSound('ghost');
}

// ============================================================
// ИСПОЛЬЗОВАНИЕ АРТЕФАКТОВ [D]
// ============================================================
function useArtifact(id) {
    if (GameState.gameState !== 'betting') return;
    const m = GameState.players[GameState.myUid];
    const art = ARTIFACTS.find(a => a.id === id);
    if (!art || (art.type === 'active' && GameState.usedSpecialThisRound[id])) return;

    const bettingArtifacts = ['deceiver', 'double'];
    if (bettingArtifacts.includes(id) && !isMyTurn()) {
        showNotification('Этот артефакт можно использовать только в свой ход!', 'warning');
        return;
    }

    switch(id) {
        case 'target':
            showTargetModalFirst(Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost), (target) => {
                showNominalModal((nominal) => {
                    const t = target;
                    if (GameState.players[t].dice.length <= 1) { showNotification('Нельзя уничтожить последний кубик!', 'warning'); return; }
                    const i = GameState.players[t].dice.indexOf(nominal);
                    if (i === -1) { showNotification(`У ${GameState.players[t].name} нет кубика ${getDieEmoji(nominal)}!`, 'warning'); return; }
                    GameState.players[t].dice.splice(i, 1);
                    safeUpdate(GameState.roomRef.child('players').child(t), { dice: GameState.players[t].dice }, 'target');
                    appendChat(`🎯 ${m.name} использовал В ЯБЛОЧКО! Уничтожен кубик ${getDieEmoji(nominal)} у ${GameState.players[t].name}`, 'system');
                });
            });
            break;
        case 'fireball':
        case 'luck':
            const nd = m.dice.map((d, idx) => {
                if (m.frozen) return d;
                return id === 'luck' ? (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1) : Math.floor(Math.random() * 6) + 1;
            });
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { dice: nd, evilEyed: false }, 'fireball');
            appendChat(`☄️ ${m.name} использовал ${art.name}!`, 'system');
            break;
        case 'blessing':
            if (m.poisons > 0) {
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { poisons: m.poisons - 1 }, 'blessing');
                appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! Себе -1 яд`, 'system');
            } else {
                const h = Object.keys(GameState.players).find(u => u !== GameState.myUid && GameState.players[u]?.alive && GameState.players[u]?.poisons > 0);
                if (h) {
                    safeUpdate(GameState.roomRef.child('players').child(h), { poisons: GameState.players[h].poisons - 1 }, 'blessing');
                    appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! ${GameState.players[h].name} -1 яд`, 'system');
                } else showNotification('Нет раненых союзников!', 'warning');
            }
            break;
        case 'thief':
            if (GameState.thiefUsedThisRound) return showNotification('Вор уже использован в этом раунде!', 'warning');
            const tt = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.artifact && GameState.players[u].artifact.type === 'active' && !GameState.usedSpecialThisRound[GameState.players[u].artifact.id]);
            if (!tt.length) return showNotification('Нет доступных для кражи!', 'warning');
            showTargetModal(tt, t => {
                const st = GameState.players[t].artifact;
                if (GameState.usedSpecialThisRound[st.id]) delete GameState.usedSpecialThisRound[st.id];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { artifact: st, usedSpecialThisRound: GameState.usedSpecialThisRound }, 'thief');
                safeUpdate(GameState.roomRef.child('players').child(t), { artifact: null }, 'thief-victim');
                GameState.thiefUsedThisRound = true;
                appendChat(`🥷 ${m.name} украл ${st.emoji} у ${GameState.players[t].name}!`, 'system');
            });
            break;
        case 'deceiver':
            const bc = GameState.lastBet ? GameState.lastBet.count + Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 5) + 6;
            const bv = Math.floor(Math.random() * 6) + 1;
            const newBet = { player: GameState.myUid, count: bc, value: bv };
            GameState.lastBet = newBet;
            GameState.players[GameState.myUid].lastBetInRound = newBet;
            safeUpdate(GameState.roomRef, { lastBet: newBet, turnCounter: GameState.turnCounter + 1 }, 'deceiver');
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { lastBetInRound: newBet }, 'deceiver-player');
            GameState.turnCounter++;
            renderUI();
            break;
        case 'clone':
            const tc = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!tc.length) return;
            const cl = tc[Math.floor(Math.random() * tc.length)];
            const cd = GameState.players[cl].dice[Math.floor(Math.random() * GameState.players[cl].dice.length)];
            const newDice = [...m.dice, cd];
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { dice: newDice, artifact: null }, 'clone');
            appendChat(`🧬 ${m.name} клонировал кубик ${getDieEmoji(cd)} у ${GameState.players[cl].name}!`, 'system');
            break;
        case 'curse':
            const cu = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!cu.length) return;
            showTargetModal(cu, t => {
                safeUpdate(GameState.roomRef.child('players').child(t), { cursed: true }, 'curse');
                appendChat(`☠️ ${m.name} проклял ${GameState.players[t].name}!`, 'system');
            });
            break;
        case 'spy':
            if (GameState.spyMemory[GameState.myUid] && GameState.spyMemory[GameState.myUid].value && GameState.roundNumber === GameState.spyMemory[GameState.myUid].round) {
                showNotification(`🔍 Шпион: у ${GameState.players[GameState.spyMemory[GameState.myUid].target]?.name} выпал кубик ${getDieEmoji(GameState.spyMemory[GameState.myUid].value)}`, 'info');
                break;
            }
            const sp = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
            if (!sp.length) return showNotification('Нет целей!', 'warning');
            showTargetModal(sp, t => {
                const val = GameState.players[t].dice[Math.floor(Math.random() * GameState.players[t].dice.length)];
                GameState.spyMemory[GameState.myUid] = { target: t, value: val, round: GameState.roundNumber };
                showNotification(`🕵️ Шпион: у ${GameState.players[t].name} выпал кубик ${getDieEmoji(val)}`, 'info');
                appendChat(`🕵️ ${m.name} использовал Шпиона на ${GameState.players[t].name}`, 'system');
            });
            break;
        case 'ice':
            const ci = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost && !GameState.players[u]?.frozen);
            if (!ci.length) return;
            showTargetModal(ci, t => {
                safeUpdate(GameState.roomRef.child('players').child(t), { frozen: true }, 'ice');
                appendChat(`🧊 ${m.name} заморозил кубики ${GameState.players[t].name}!`, 'system');
            });
            break;
        case 'analyst':
            showNominalModal(n => {
                let c = 0;
                Object.values(GameState.players).forEach(p => {
                    if (p?.alive && !p.isGhost && p.dice.includes(n)) c++;
                });
                showNotification(`АНАЛИТИК: Минимум ${c} игроков имеют кубик ${getDieEmoji(n)}`, 'info');
            });
            break;
        case 'double':
            if (!GameState.lastBet) return showNotification('Нет ставок!', 'warning');
            const td = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.lastBetInRound);
            if (!td.length) return showNotification('Нет игроков с последней ставкой!', 'warning');
            showTargetModal(td, t => {
                let lb = GameState.players[t].lastBetInRound;
                let nc = lb.count, nv = lb.value;
                const newBet = { player: GameState.myUid, count: nc, value: nv };
                GameState.lastBet = newBet;
                GameState.players[GameState.myUid].lastBetInRound = newBet;
                safeUpdate(GameState.roomRef, { lastBet: newBet, turnCounter: GameState.turnCounter + 1 }, 'double');
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { lastBetInRound: newBet }, 'double-player');
                GameState.turnCounter++;
                renderUI();
                appendChat(`🪞 ${m.name} использовал ДВОЙНИК! Скопирована ставка ${GameState.players[t].name}: ${nc}×${getDieEmoji(nv)}`, 'system');
            });
            break;
        case 'evilEye':
            const te = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost && !GameState.players[u]?.evilEyed);
            if (!te.length) return;
            showTargetModal(te, t => {
                safeUpdate(GameState.roomRef.child('players').child(t), { evilEyed: true }, 'evileye');
                appendChat(`🧿 ${m.name} наслал Сглаз на ${GameState.players[t].name}!`, 'system');
            });
            break;
        case 'sacrifice':
            if (m.poisons >= (m.maxLives || 3) && !confirm('⚠️ ВЫ УМРЁТЕ! Это даст +1 яд (смерть). Вы уверены?')) return;
            if (!confirm('⚠️ Вы получите +1 яд. Эффект активируется после. Вы уверены?')) return;
            showEffectModal(eff => {
                applyPoison(GameState.myUid, 1, 'Жертвоприношение');
                if (eff.id === 'shield') {
                    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { devilShield: true, devilShieldRound: GameState.roundNumber }, 'sac-shield');
                } else if (eff.id === 'reroll') {
                    Object.keys(GameState.players).forEach(u => {
                        if (GameState.players[u]?.alive && !GameState.players[u]?.isGhost && !GameState.players[u]?.frozen) {
                            safeUpdate(GameState.roomRef.child('players').child(u), { dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1), evilEyed: false }, 'sac-reroll');
                        }
                    });
                    appendChat(`💀 ${m.name} принёс жертву: переброс кубиков стола!`, 'system');
                } else if (eff.id === 'forceBluff') {
                    const nx = getNextPlayerUid();
                    if (nx) safeUpdate(GameState.roomRef.child('players').child(nx), { forcedBluff: true }, 'sac-bluff');
                    appendChat(`💀 ${m.name} принёс жертву: следующий игрок обязан повысить ставку!`, 'system');
                }
            });
            break;
        case 'circus':
            const cc = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.alive && !GameState.players[u]?.isGhost && !GameState.players[u]?.frozen && GameState.players[u].dice.length >= 2 && m.dice.length >= 2);
            if (!cc.length) return showNotification('Нет подходящих целей', 'warning');
            showTargetModal(cc, t => {
                let myDice = [...m.dice];
                let taDice = [...GameState.players[t].dice];
                let mi1 = Math.floor(Math.random() * myDice.length);
                let mi2 = Math.floor(Math.random() * myDice.length);
                while (mi2 === mi1) mi2 = Math.floor(Math.random() * myDice.length);
                let ti1 = Math.floor(Math.random() * taDice.length);
                let ti2 = Math.floor(Math.random() * taDice.length);
                while (ti2 === ti1) ti2 = Math.floor(Math.random() * taDice.length);
                [myDice[mi1], taDice[ti1]] = [taDice[ti1], myDice[mi1]];
                [myDice[mi2], taDice[ti2]] = [taDice[ti2], myDice[mi2]];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { dice: myDice }, 'circus-me');
                safeUpdate(GameState.roomRef.child('players').child(t), { dice: taDice }, 'circus-target');
                appendChat(`🎪 ${m.name} обменялся кубиками с ${GameState.players[t].name}!`, 'system');
            });
            break;
        case 'sniper':
            if (GameState.sniperShotUsedThisRound) return showNotification('Отстрел уже использован в этом раунде!', 'warning');
            showDynamicNominalModal(n => {
                if (GameState.lastBet && GameState.lastBet.value === n) return showNotification('Нельзя отстрелить номинал текущей ставки!', 'warning');
                Object.keys(GameState.players).forEach(u => {
                    if (GameState.players[u]?.frozen) return;
                    const nd = GameState.players[u].dice.filter(d => d !== n);
                    if (nd.length !== GameState.players[u].dice.length) {
                        safeUpdate(GameState.roomRef.child('players').child(u), { dice: nd }, 'sniper');
                    }
                });
                GameState.sniperShotUsedThisRound = true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { sniperShotUsedThisRound: true, cannotAccuse: true }, 'sniper-me');
                appendChat(`🔫 ${m.name} отстрелил все кубики номинала ${getDieEmoji(n)}!`, 'system');
            });
            break;
    }
    if (art.type === 'active') {
        GameState.usedSpecialThisRound[id] = true;
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { usedSpecialThisRound: GameState.usedSpecialThisRound }, 'useArtifact-end');
    }
    playSound('artifact');
}

function getNextPlayerUid() {
    const a = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost);
    if (!a.length) return null;
    const i = a.indexOf(GameState.lastBet?.player);
    return a[(i + 1) % a.length];
}

// ============================================================
// МОДАЛЬНЫЕ ОКНА
// ============================================================
function showTargetModal(uids, cb) {
    const l = document.getElementById('modalTargetList');
    if (!l) return;
    l.innerHTML = '';
    uids.forEach(u => {
        const p = GameState.players[u];
        if (!p || !p.name) return;
        const b = document.createElement('button');
        b.className = 'select-item';
        b.style.width = '100%';
        b.textContent = p.name + (p.isGhost ? ' 👻' : '');
        b.onclick = () => { cb(u); closeModal('modalTarget'); };
        l.appendChild(b);
    });
    document.getElementById('modalTarget').style.display = 'block';
}

function showTargetModalFirst(uids, cb) { showTargetModal(uids, cb); }

function showNominalModal(cb) {
    const l = document.getElementById('modalNominalList');
    if (!l) return;
    l.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
        const b = document.createElement('button');
        b.className = 'select-item';
        b.textContent = getDieEmoji(i);
        b.style.width = '60px'; b.style.height = '60px'; b.style.fontSize = '1.8em';
        b.onclick = () => { cb(i); closeModal('modalNominal'); };
        l.appendChild(b);
    }
    document.getElementById('modalNominal').style.display = 'block';
}

let dynamicNominalInterval = null;
function showDynamicNominalModal(cb) {
    const l = document.getElementById('modalNominalList');
    if (!l) return;
    if (dynamicNominalInterval) clearInterval(dynamicNominalInterval);
    const render = () => {
        l.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const b = document.createElement('button');
            b.className = 'select-item';
            b.textContent = getDieEmoji(i);
            b.style.width = '60px'; b.style.height = '60px'; b.style.fontSize = '1.8em';
            if (GameState.lastBet && GameState.lastBet.value === i) {
                b.style.opacity = '0.3'; b.style.cursor = 'not-allowed'; b.disabled = true;
            } else {
                b.onclick = () => { cb(i); closeModal('modalNominal'); clearInterval(dynamicNominalInterval); dynamicNominalInterval = null; };
            }
            l.appendChild(b);
        }
    };
    render();
    dynamicNominalInterval = setInterval(render, 200);
    document.getElementById('modalNominal').style.display = 'block';
}

function showEffectModal(cb) {
    const ef = [
        {id:'shield', name:'🛡️ Щит Дьявола (Блок 1 яда до конца раунда)'},
        {id:'reroll', name:'🔁 Переброс кубиков стола (кроме замороженных)'},
        {id:'forceBluff', name:'🎭 Принудительный блеф следующего игрока'}
    ];
    const l = document.getElementById('modalEffectList');
    if (!l) return;
    l.innerHTML = '';
    ef.forEach(e => {
        const b = document.createElement('button');
        b.className = 'select-item';
        b.style.width = '100%'; b.style.marginBottom = '8px';
        b.textContent = e.name;
        b.style.whiteSpace = 'normal'; b.style.lineHeight = '1.4';
        b.onclick = () => { cb(e); closeModal('modalEffect'); };
        l.appendChild(b);
    });
    document.getElementById('modalEffect').style.display = 'block';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
    if (id === 'modalNominal' && dynamicNominalInterval) {
        clearInterval(dynamicNominalInterval);
        dynamicNominalInterval = null;
    }
}

// ============================================================
// УПРАВЛЕНИЕ ИГРОЙ
// ============================================================
// [1] Сброс с подтверждением
function resetGame() {
    if (!confirm('⚠️ Вы уверены, что хотите сбросить игру в лобби?\n\nВесь прогресс раунда будет потерян.')) return;
    if (!confirm('🔴 ПОДТВЕРДИТЕ ЕЩЁ РАЗ: сбросить игру?')) return;

    GameState.gameState = 'lobby';
    GameState.roundNumber = 0;
    GameState.lastBet = null;
    GameState.currentPlayerUid = null;
    GameState.thiefUsedThisRound = false;
    GameState.sniperShotUsedThisRound = false;
    GameState.usedSpecialThisRound = {};
    GameState.artifactHistory = [];
    GameState.blood = 0;
    clearAllTimers();
    const updates = {};
    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (p) {
            updates[`players/${uid}/poisons`] = 0;
            updates[`players/${uid}/blood`] = 0;
            updates[`players/${uid}/alive`] = true;
            updates[`players/${uid}/isGhost`] = false;
            updates[`players/${uid}/artifact`] = null;
            updates[`players/${uid}/dice`] = [];
            updates[`players/${uid}/usedSpecialThisRound`] = {};
            updates[`players/${uid}/lastBetInRound`] = null;
            updates[`players/${uid}/cursed`] = false;
            updates[`players/${uid}/frozen`] = false;
            updates[`players/${uid}/defenderActive`] = false;
            updates[`players/${uid}/stunned`] = false;
            updates[`players/${uid}/blind`] = false;
            updates[`players/${uid}/darkPact`] = false;
            updates[`players/${uid}/darkPactShield`] = false;
            updates[`players/${uid}/devilShield`] = false;
            updates[`players/${uid}/evilEyed`] = false;
            updates[`players/${uid}/forcedBluff`] = false;
            updates[`players/${uid}/cannotAccuse`] = false;
            updates[`players/${uid}/sniperShotUsedThisRound`] = false;
            updates[`players/${uid}/familiarCursed`] = false;
            updates[`players/${uid}/usedAbilities`] = {};
            updates[`players/${uid}/devilDealsUsed`] = 0;
            updates[`players/${uid}/maxDice`] = 5;
            updates[`players/${uid}/noArtifactsForever`] = false;
            if (p.isBot) updates[`players/${uid}/botDifficulty`] = GameState.botDifficulty;
        }
    });
    updates.state = 'lobby';
    updates.round = 0;
    updates.lastBet = null;
    updates.artifactHistory = [];
    safeUpdate(GameState.roomRef, updates, 'resetGame');
    appendChat(`🔄 Игра сброшена в лобби`, 'system');
}

function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${GameState.currentRoomId}`;
    navigator.clipboard.writeText(link).then(() => {
        showNotification('Ссылка-приглашение скопирована!', 'success');
        appendChat(`🔗 Ссылка скопирована`, 'system');
    }).catch(() => {
        showNotification('Не удалось скопировать. Ссылка: ' + link, 'info');
    });
}

function saveProfile() {
    const newName = document.getElementById('profileNameInput')?.value.trim();
    if (newName && newName !== GameState.myName) {
        GameState.myName = newName;
        localStorage.setItem('ld_playerName', GameState.myName);
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { name: GameState.myName }, 'rename');
        appendChat(`Игрок сменил ник на ${GameState.myName}`, 'system');
    }
    localStorage.setItem('ld_avatar', GameState.myAvatar);
    localStorage.setItem('ld_color', GameState.myColor);
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { avatar: GameState.myAvatar, color: GameState.myColor }, 'profile');
    showNotification('Профиль сохранён!', 'success');
    document.getElementById('modalProfile').style.display = 'none';
}

function showConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = ['#ffd700','#ff0000','#00ff00','#0000ff'][Math.floor(Math.random() * 4)];
        c.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function bindEventListeners() {
    const hm = document.getElementById('hamburgerBtn');
    const dd = document.getElementById('dropdownMenu');
    if (hm) hm.onclick = () => {
        if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    };
    document.addEventListener('click', e => {
        if (hm && dd && !hm.contains(e.target) && !dd.contains(e.target) && dd.style.display === 'block') dd.style.display = 'none';
    });

    const menuRules = document.getElementById('menuRules');
    if (menuRules) menuRules.onclick = () => {
        document.getElementById('modalRules')?.setAttribute('style', 'display:block');
        if (dd) dd.style.display = 'none';
    };

    const menuProfile = document.getElementById('menuProfile');
    if (menuProfile) menuProfile.onclick = () => {
        const nameInput = document.getElementById('profileNameInput');
        const uidSpan = document.getElementById('profileUid');
        const statusSpan = document.getElementById('profileStatus');
        if (nameInput) nameInput.value = GameState.myName;
        if (uidSpan) uidSpan.textContent = GameState.myUid;
        if (statusSpan) {
            statusSpan.textContent = GameState.isGhost ? 'Призрак' : 'Жив';
            statusSpan.style.color = GameState.isGhost ? '#cc00ff' : '#00ff88';
        }
        const avatarContainer = document.getElementById('avatarSelect');
        if (avatarContainer) {
            avatarContainer.innerHTML = '';
            AVATARS.forEach(av => {
                const btn = document.createElement('button');
                btn.textContent = av;
                btn.style.fontSize = '1.5em'; btn.style.margin = '3px'; btn.style.padding = '5px';
                btn.style.cursor = 'pointer';
                btn.style.background = GameState.myAvatar === av ? '#ffd700' : '#333';
                btn.style.border = 'none'; btn.style.borderRadius = '5px';
                btn.onclick = () => {
                    GameState.myAvatar = av;
                    document.querySelectorAll('#avatarSelect button').forEach(b => b.style.background = '#333');
                    btn.style.background = '#ffd700';
                };
                avatarContainer.appendChild(btn);
            });
        }
        const colorContainer = document.getElementById('colorSelect');
        if (colorContainer) {
            colorContainer.innerHTML = '';
            COLORS.forEach(col => {
                const btn = document.createElement('button');
                btn.textContent = '●';
                btn.style.color = col; btn.style.fontSize = '1.5em'; btn.style.margin = '3px'; btn.style.padding = '5px';
                btn.style.cursor = 'pointer';
                btn.style.background = GameState.myColor === col ? '#ffd700' : '#333';
                btn.style.border = 'none'; btn.style.borderRadius = '5px';
                btn.onclick = () => {
                    GameState.myColor = col;
                    document.querySelectorAll('#colorSelect button').forEach(b => b.style.background = '#333');
                    btn.style.background = '#ffd700';
                };
                colorContainer.appendChild(btn);
            });
        }
        document.getElementById('modalProfile').style.display = 'block';
        if (dd) dd.style.display = 'none';
    };

    document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
    document.getElementById('menuInvite')?.addEventListener('click', () => { copyInviteLink(); if (dd) dd.style.display = 'none'; });
    document.getElementById('menuNewRoom')?.addEventListener('click', () => {
        if (confirm('Создать новую комнату? Вы покинете текущую.')) {
            if (GameState.roomRef) GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().cancel();
            clearAllTimers();
            newRoom();
            if (dd) dd.style.display = 'none';
        }
    });
    document.getElementById('menuKick')?.addEventListener('click', () => { startVoteKick(); if (dd) dd.style.display = 'none'; });
    document.getElementById('menuSound')?.addEventListener('click', () => {
        GameState.soundEnabled = !GameState.soundEnabled;
        document.getElementById('menuSound').textContent = GameState.soundEnabled ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ';
        if (dd) dd.style.display = 'none';
    });
    document.getElementById('menuArtifacts')?.addEventListener('click', () => {
        if (GameState.gameState !== 'lobby') return showNotification('Только в лобби!', 'warning');
        GameState.specialDiceEnabled = !GameState.specialDiceEnabled;
        document.getElementById('menuArtifacts').textContent = `🎲 Артефакты: ${GameState.specialDiceEnabled ? '✅' : '❌'}`;
        safeUpdate(GameState.roomRef.child('settings'), { specialDiceEnabled: GameState.specialDiceEnabled }, 'toggle-artifacts');
        if (dd) dd.style.display = 'none';
    });
    document.getElementById('menuLives')?.addEventListener('click', () => {
        if (GameState.gameState !== 'lobby') return showNotification('Только в лобби!', 'warning');
        const o = [3,4,5,6,2];
        GameState.defaultLives = o[(o.indexOf(GameState.defaultLives) + 1) % o.length];
        document.getElementById('menuLives').textContent = `❤️ Жизни: ${GameState.defaultLives}`;
        safeUpdate(GameState.roomRef.child('settings'), { defaultLives: GameState.defaultLives }, 'toggle-lives');
        Object.keys(GameState.players).forEach(uid => {
            if (GameState.players[uid] && !GameState.players[uid].isBot) {
                safeUpdate(GameState.roomRef.child('players').child(uid), { maxLives: GameState.defaultLives }, 'update-lives');
            }
        });
        if (dd) dd.style.display = 'none';
    });

    document.getElementById('btnStartGame')?.addEventListener('click', () => {
        if (GameState.gameState !== 'lobby') return showNotification('Игра уже идёт!', 'warning');
        const aliveCount = Object.keys(GameState.players).filter(uid => GameState.players[uid] && GameState.players[uid].alive && !GameState.players[uid].isGhost && !GameState.players[uid].isBot).length;
        const botCountTotal = Object.keys(GameState.players).filter(uid => GameState.players[uid] && GameState.players[uid].isBot).length;
        if ((aliveCount >= 1 && botCountTotal >= 1) || aliveCount >= 2) {
            startNewRound();
        } else {
            showNotification('Нужен хотя бы 1 игрок и 1 бот, или 2 игрока', 'warning');
        }
        if (dd) dd.style.display = 'none';
    });

    document.getElementById('btnResetGame')?.addEventListener('click', resetGame);
    document.getElementById('btnPlaceBet')?.addEventListener('click', placeBet);
    document.getElementById('btnAccuse')?.addEventListener('click', accuse);

    document.getElementById('btnSendChat')?.addEventListener('click', () => {
        const msg = document.getElementById('chatInput')?.value.trim();
        if (msg) {
            // [11] Экранирование
            safeUpdate(GameState.roomRef.child('chat').push(), {
                sender: GameState.myName,
                text: msg,
                type: 'normal',
                timestamp: Date.now()
            }, 'chat');
            const input = document.getElementById('chatInput');
            if (input) input.value = '';
        }
    });

    document.getElementById('chatInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('btnSendChat')?.click();
    });

    document.getElementById('ghVengeance')?.addEventListener('click', () => useGhostAbility('oathOfVengeance'));
    document.getElementById('ghFamiliarCurse')?.addEventListener('click', () => useGhostAbility('familiarCurse'));
    document.getElementById('ghPoltergeist')?.addEventListener('click', () => useGhostAbility('poltergeist'));
    document.getElementById('ghKeeper')?.addEventListener('click', () => useGhostAbility('keeperOfSecrets'));
    document.getElementById('ghReaper')?.addEventListener('click', () => useGhostAbility('soulReaper'));

    document.getElementById('voteYes')?.addEventListener('click', () => castVote('yes'));
    document.getElementById('voteNo')?.addEventListener('click', () => castVote('no'));

    document.querySelectorAll('.close-btn').forEach(b => b.addEventListener('click', function() {
        const modal = this.closest('.modal');
        if (modal) modal.style.display = 'none';
        if (modal?.id === 'modalNominal' && dynamicNominalInterval) {
            clearInterval(dynamicNominalInterval);
            dynamicNominalInterval = null;
        }
    }));

    window.addEventListener('click', e => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            if (e.target.id === 'modalNominal' && dynamicNominalInterval) {
                clearInterval(dynamicNominalInterval);
                dynamicNominalInterval = null;
            }
        }
    });

    document.getElementById('menuBotAdd')?.addEventListener('click', () => { addBot(); if (dd) dd.style.display = 'none'; });
    document.getElementById('menuBotRemoveAll')?.addEventListener('click', () => { removeAllBots(); if (dd) dd.style.display = 'none'; });
    document.getElementById('menuBotDifficulty')?.addEventListener('click', (e) => {
        e.stopPropagation();
        let next = (GameState.botDifficulty + 1) % 4;
        setBotDifficulty(next);
        if (dd) dd.style.display = 'none';
    });

    // Очистка при закрытии вкладки
    window.addEventListener('beforeunload', () => {
        clearAllTimers();
    });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    let roomFromUrl = urlParams.get('room');

    // [C] Восстановление имени
    let name = localStorage.getItem('ld_playerName');
    if (!name) {
        name = prompt('Введите ваше имя:', 'Игрок' + Math.floor(Math.random() * 900 + 100));
        if (!name) name = 'Игрок';
        localStorage.setItem('ld_playerName', name);
    }
    GameState.myName = name;
    GameState.myAvatar = localStorage.getItem('ld_avatar') || '🎲';
    GameState.myColor = localStorage.getItem('ld_color') || '#ffffff';

    // [C] Восстановление комнаты
    if (!roomFromUrl) {
        const savedRoom = localStorage.getItem('ld_lastRoom');
        if (savedRoom && confirm(`Вернуться в последнюю комнату ${savedRoom}?`)) {
            roomFromUrl = savedRoom;
        }
    }

    if (roomFromUrl) {
        GameState.currentRoomId = roomFromUrl;
        document.getElementById('roomIdDisplay').textContent = GameState.currentRoomId;
        enterRoom(GameState.currentRoomId);
    } else {
        createRoom();
    }
    setupAudioContext();
    bindEventListeners();
    log('🎮 Игра загружена');
};

const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Game]', ...args); }
function logError(...args) { console.error('[Game Error]', ...args); }

const DIE_EMOJI_CACHE = ['?', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function getDieEmoji(v) {
    const val = parseInt(v);
    if (val >= 1 && val <= 6) return DIE_EMOJI_CACHE[val - 1];
    return '⚀';
}

function getDieValue(emoji) {
    return DIE_EMOJI_CACHE.indexOf(emoji) + 1;
}

const GameState = {
    roomRef: null,
    myUid: '',
    myName: '',
    myAvatar: '😎',
    myColor: '#c9a961',
    mySuitColor: '#1a1a1a',
    currentRoomId: '',
    isHost: false,
    players: {},
    lastBet: null,
    gameState: 'lobby',
    roundNumber: 0,
    turnCounter: 0,
    currentPlayerUid: null,
    isGhost: false,
    ghostTarget: null,
    devilDealsUsed: 0,
    blood: 0,
    usedSpecialThisRound: {},
    thiefUsedThisRound: false,
    sniperShotUsedThisRound: false,
    artifactHistory: [],
    spyMemory: {},
    defaultLives: 3,
    specialDiceEnabled: true,
    soundEnabled: true,
    botDifficulty: 2,
    bots: {},
    isBotThinking: false,
    expertKnownDice: {},
    currentVoteTarget: null,
    lastVoteEndTime: 0,
    devilDealData: null,
    timers: { accusation: null, devilDeal: null, vote: null, bot: [] },
    chatLastSend: 0,
    isActionInProgress: false,
    pendingArtifact: null,
    betCount: 1,
    betValue: 1,
    lastAccusationResult: null,
    log: [],
    logFilter: 'all',
    emojiCooldown: false,
    tauntCooldown: false,
    playerPositions: {},
    dragMode: false,
    dragSource: null
};

const PlayerProfile = {
    face: '😎',
    suitColor: '#1a1a1a',
    accentColor: '#c9a961'
};

const VOTE_COOLDOWN = 120000;
const MAX_HISTORY = 50;
const CHAT_DEBOUNCE_MS = 1000;
const OFFLINE_TIMEOUT = 5 * 60 * 1000;
const EMOJI_COOLDOWN_MS = 5000;
const TAUNT_COOLDOWN_MS = 5000;
const botDifficultyNames = ['Легкий', 'Средний', 'Сложный', 'Эксперт'];

const FACE_EMOJIS = [
    '😎', '🤵', '🥸', '🧐', '🤨',
    '😈', '👿', '🤡', '👹', '👺',
    '🎭', '🦹', '🧙', '🧛', '🧟',
    '😊', '😏', '🤠', '🥳', '😼',
    '💀', '☠️', '👻', '🎃', '👽',
    '🤑', '💰', '🃏', '🎲', '🤖'
];

const SUIT_COLORS = [
    { name: 'Чёрный фрак', color: '#1a1a1a', accent: '#c9a961' },
    { name: 'Бордовый', color: '#5c0a0a', accent: '#ffd97a' },
    { name: 'Изумруд', color: '#0d3a2a', accent: '#c9a961' },
    { name: 'Тёмно-синий', color: '#0a1a3a', accent: '#c9a961' },
    { name: 'Фиолет', color: '#2a0a3a', accent: '#ffd97a' },
    { name: 'Золотой', color: '#3a2a0a', accent: '#ffd97a' }
];

const TAUNTS = {
    accusation: [
        '🎯 Я вижу твой блеф насквозь!',
        '🃏 Раскрывай карты, шулер!',
        '🎭 Твоя маска спадает...',
        '🔍 Шпионы доложили — ты врешь!',
        '⚖ Суд присяжных уже здесь!'
    ],
    defeat: [
        '💀 Дьявол ждёт тебя...',
        '👻 Готовься стать призраком',
        '☠ Яд уже в бокале',
        '🎪 Добро пожаловать в цирк!',
        '🌑 Тёмный договор подписан'
    ],
    victory: [
        '🏆 Король казино!',
        '👑 Мафия бессмертна',
        '💎 Джекпот мой!',
        '🥂 За твой счёт, друг!',
        '🎰 Казино всегда в выигрыше'
    ],
    mockery: [
        '🤡 Ты случайно не в цирке работаешь?',
        '🎲 Бросай кости, новичок',
        '🃏 Твоя колода пустая',
        '💸 Ставки слишком высоки для тебя',
        '🎭 Сними маску, я знаю кто ты'
    ]
};

const ARTIFACTS = [
    {id:'target',emoji:'🎯',name:'В ЯБЛОЧКО!',type:'active',description:'Уничтожает 1 кубик выбранного номинала у противника',hidden:false},
    {id:'fireball',emoji:'☄',name:'ФАЕРБОЛ',type:'active',description:'Перебрасывает ВСЕ ваши обычные кубики',hidden:false},
    {id:'luck',emoji:'🍀',name:'ВЕЗУНЧИК',type:'active',description:'Перебрасывает кубики с шансом 70% на 4-6',hidden:false},
    {id:'blessing',emoji:'⚕',name:'БЛАГОСЛОВЕНИЕ',type:'active',description:'Убирает 1 яд у себя или союзника',hidden:false},
    {id:'thief',emoji:'🥷',name:'ВОР',type:'active',description:'Крадёт артефакт у выбранного противника',hidden:false},
    {id:'deceiver',emoji:'🎭',name:'ОБМАНЩИК',type:'active',description:'Авто-ставка, обвинитель получает +2 яда',hidden:true},
    {id:'clone',emoji:'🧬',name:'КЛОНИРОВАНИЕ',type:'active',description:'Артефакт становится 6-м кубиком',hidden:true},
    {id:'curse',emoji:'☠',name:'ПРОКЛЯТИЕ',type:'active',description:'Следующая ставка цели ложная',hidden:true},
    {id:'spy',emoji:'🕵',name:'ШПИОН',type:'active',description:'Показывает 1 кубик противника',hidden:true},
    {id:'ice',emoji:'🧊',name:'ЛЕДЯНАЯ СТЕНА',type:'active',description:'Замораживает кубики цели',hidden:true},
    {id:'defender',emoji:'🛡',name:'ЗАЩИТНИК',type:'passive',description:'Блокирует 1 яд',hidden:true},
    {id:'bloodthirst',emoji:'🧛',name:'КРОВОЖАДНОСТЬ',type:'passive',description:'+1 кровь при верном обвинении',hidden:true},
    {id:'analyst',emoji:'🔍',name:'АНАЛИТИК',type:'active',description:'Показывает мин. игроков с кубиком',hidden:true},
    {id:'double',emoji:'🪞',name:'ДВОЙНИК',type:'active',description:'Копирует ставку игрока',hidden:false},
    {id:'evilEye',emoji:'🧿',name:'СГЛАЗ',type:'active',description:'Невезение на кубики цели',hidden:true},
    {id:'wildDie',emoji:'🎲',name:'ДИКИЙ КУБИК',type:'passive',description:'Считается любым номиналом',hidden:true},
    {id:'sacrifice',emoji:'💀',name:'ЖЕРТВОПРИНОШЕНИЕ',type:'active',description:'+1 яд ради эффекта',hidden:true},
    {id:'circus',emoji:'🎪',name:'ЦИРКАЧ',type:'active',description:'Обмен 2 кубиками',hidden:true},
    {id:'darkPact',emoji:'🌑',name:'ТЁМНЫЙ ДОГОВОР',type:'passive',description:'+2 яда при обвинении',hidden:true},
    {id:'sniper',emoji:'🔫',name:'ОТСТРЕЛ',type:'active',description:'Уничтожает все кубики номинала',hidden:true}
];

const GHOST_ABILITIES = [
    {id:'oathOfVengeance',emoji:'⚔',name:'Месть',type:'active',limit:'once_per_ghost',description:'Выберите цель. Если умрёт — воскреснете'},
    {id:'familiarCurse',emoji:'🔮',name:'Проклятие Фамильяра',type:'active',limit:'once_per_ghost',description:'Следующая ставка цели ложная'},
    {id:'poltergeist',emoji:'🌀',name:'Полтергейст',type:'active',limit:'once_per_ghost',description:'Случайный эффект'},
    {id:'keeperOfSecrets',emoji:'👁',name:'Хранитель Тайн',type:'active',limit:'unlimited',description:'Видите кубики всех'},
    {id:'soulReaper',emoji:'💀',name:'Жатва Душ',type:'active',limit:'once_per_ghost',description:'20% шанс эффекта. Убийство — воскрешение'}
];

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
    const filtered = GameState.logFilter === 'all' ?
        GameState.log :
        GameState.log.filter(entry => entry.type === GameState.logFilter);
    container.innerHTML = filtered.map(entry =>
        `<div class="log-entry ${entry.type}">${entry.text}</div>`
    ).join('');
    container.scrollTop = container.scrollHeight;
}

function clearLog() {
    GameState.log = [];
    renderLog();
}

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
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
        console.error('Audio context failed:', e);
    }
}

function playSound(type) {
    if (!GameState.soundEnabled || !audioContext) return;
    try {
        const now = audioContext.currentTime;
        const sounds = {
            bet: [440, 220, 0.1, 'square'],
            accuse: [880, 440, 0.3, 'sawtooth'],
            poison: [300, 150, 0.2, 'sine'],
            death: [220, 110, 0.5, 'sine'],
            devil: [150, 100, 0.4, 'sawtooth'],
            devilWin: [440, 880, 0.3, 'square'],
            devilLose: [200, 100, 0.4, 'sawtooth'],
            ghost: [660, 880, 0.3, 'sine'],
            resurrection: [330, 990, 0.6, 'sine'],
            artifact: [523, 784, 0.2, 'square'],
            round: [440, 880, 0.3, 'square'],
            blood: [392, 523, 0.2, 'sine'],
            win: [523, 659, 784, 1046, 0.8, 'square']
        };
        const sound = sounds[type] || sounds.bet;
        if (type === 'win') {
            sound.slice(0, 4).forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                osc.connect(gain);
                gain.connect(audioContext.destination);
                osc.frequency.value = freq;
                osc.type = sound[4];
                gain.gain.setValueAtTime(0.15, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.4);
            });
        } else {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.setValueAtTime(sound[0], now);
            osc.frequency.exponentialRampToValueAtTime(sound[1], now + sound[2]);
            osc.type = sound[3];
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + sound[2]);
            osc.start(now);
            osc.stop(now + sound[2]);
        }
    } catch(e) {
        console.error('Sound error:', e);
    }
}

function renderAvatarSVG(config, size = 100) {
    const face = config.face || '😎';
    const suitColor = config.suitColor || '#1a1a1a';
    const accentColor = config.accentColor || '#c9a961';
    return `
<svg viewBox="0 0 100 140" class="player-avatar-svg" style="width:100%; height:100%;">
<ellipse cx="50" cy="135" rx="35" ry="5" fill="rgba(0,0,0,0.5)"/>
<path d="M 20 140 L 20 85 Q 20 75 30 75 L 70 75 Q 80 75 80 85 L 80 140 Z"
fill="${suitColor}"
stroke="${accentColor}"
stroke-width="2"/>
<path d="M 45 75 L 50 95 L 55 75 Z" fill="${accentColor}"/>
<rect x="48" y="95" width="4" height="40" fill="${accentColor}" opacity="0.8"/>
<path d="M 25 85 Q 30 80 35 85 L 35 120 L 25 120 Z" fill="rgba(0,0,0,0.2)"/>
<path d="M 75 85 Q 70 80 65 85 L 65 120 L 75 120 Z" fill="rgba(255,255,255,0.05)"/>
<text x="50" y="60" text-anchor="middle" font-size="50" dominant-baseline="middle">${face}</text>
</svg>
`;
}

function renderPlayerSeats() {
    const container = document.getElementById('playerSeats');
    if (!container) return;
    container.innerHTML = '';
    const cu = getCurrentPlayerUid();
    const sortedUids = Object.keys(GameState.players).sort((a,b) =>
        (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0)
    );
    sortedUids.forEach((uid, idx) => {
        const p = GameState.players[uid];
        if (!p) return;
        const seat = document.createElement('div');
        seat.className = 'player-seat';
        seat.dataset.uid = uid;
        seat.dataset.position = GameState.playerPositions[uid] || idx;
        if (p.isGhost) seat.classList.add('ghost');
        if (!p.alive) seat.classList.add('dead');
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) {
            seat.classList.add('active');
        }
        if (GameState.gameState === 'accusing' && GameState.lastAccusationResult) {
            if (GameState.lastAccusationResult.accuser === uid) {
                seat.classList.add('accuser');
            }
            if (GameState.lastAccusationResult.accused === uid) {
                seat.classList.add('accused');
            }
        }
        const avatarWrap = document.createElement('div');
        avatarWrap.className = 'player-avatar-wrap';
        const avatarConfig = {
            face: p.avatar || '😎',
            suitColor: p.suitColor || '#1a1a1a',
            accentColor: p.color || '#c9a961'
        };
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
                if (j < p.poisons) {
                    heart.classList.add('lost');
                }
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

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
        .catch(err => {
            showLoading(false);
            if (err.code === 'PERMISSION_DENIED') {
                showNotification('⚠ Нет доступа. Проверьте правила Firebase.');
            } else {
                showNotification('Ошибка соединения');
            }
            console.error(`${context} error:`, err);
        });
}

function safeSet(ref, data, context = '') {
    showLoading(true);
    return ref.set(data)
        .then(() => { log(`✅ ${context}`); showLoading(false); })
        .catch(err => {
            showLoading(false);
            showNotification('Ошибка соединения');
            console.error(`${context} error:`, err);
        });
}

function clearAllTimers() {
    if (GameState.timers.accusation) {
        clearTimeout(GameState.timers.accusation);
        GameState.timers.accusation = null;
    }
    if (GameState.timers.devilDeal) {
        clearInterval(GameState.timers.devilDeal);
        GameState.timers.devilDeal = null;
    }
    if (GameState.timers.vote) {
        clearInterval(GameState.timers.vote);
        GameState.timers.vote = null;
    }
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
}

function createRoom() {
    const roomId = generateRoomId();
    GameState.currentRoomId = roomId;
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
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
    const savedUid = localStorage.getItem('ld_myUid');
    const savedName = localStorage.getItem('ld_playerName');
    const savedAvatar = localStorage.getItem('ld_avatar');
    const savedColor = localStorage.getItem('ld_color');
    const savedSuit = localStorage.getItem('ld_suit');
    const savedPositions = localStorage.getItem('ld_playerPositions');
    if (savedPositions) {
        GameState.playerPositions = JSON.parse(savedPositions);
    }
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
        name: GameState.myName,
        uid: GameState.myUid,
        avatar: GameState.myAvatar,
        color: GameState.myColor,
        suitColor: GameState.mySuitColor,
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
    GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().update({
        connected: false,
        lastSeenTurn: GameState.turnCounter,
        disconnectedAt: Date.now()
    });
    setupRoomListeners();
    addLogEntry(`🎩 ${GameState.myName} входит в салон`, 'system');
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
        GameState.artifactHistory = Array.isArray(data.artifactHistory) ?
            data.artifactHistory.slice(-MAX_HISTORY) : [];
        GameState.turnCounter = data.turnCounter || 0;
        GameState.currentPlayerUid = data.currentPlayerUid || null;
        const now = Date.now();
        Object.keys(GameState.players).forEach(uid => {
            const p = GameState.players[uid];
            if (p && p.connected === false && p.disconnectedAt) {
                if (now - p.disconnectedAt > OFFLINE_TIMEOUT && uid !== GameState.myUid) {
                    const firstUid = Object.keys(GameState.players).sort((a,b) =>
                        (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0))[0];
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
        renderPlayerSeats();
        updateControls();
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
        if (msg.type === 'text') {
            showChatBubble(player?.uid || GameState.myUid, msg.text, 'text');
        } else if (msg.type === 'emoji') {
            showChatBubble(player?.uid || GameState.myUid, msg.text, 'emoji');
        } else if (msg.type === 'taunt') {
            showChatBubble(player?.uid || GameState.myUid, msg.text, 'taunt');
        }
    });
    GameState.roomRef.child('votes').on('value', (s) => {
        const votes = s.val();
        if (votes && GameState.currentVoteTarget && votes[GameState.currentVoteTarget]) {
            updateVoteUI(votes[GameState.currentVoteTarget]);
        }
    });
}

function updateUI() {
    const statusEl = document.getElementById('gameStatus');
    const roundEl = document.getElementById('roundInfo');
    const betEl = document.getElementById('currentBet');
    const tableScene = document.getElementById('tableScene');
    switch(GameState.gameState) {
        case 'lobby':
            statusEl.textContent = 'ОЖИДАНИЕ ГОСТЕЙ';
            document.body.className = 'lobby';
            break;
        case 'betting':
            statusEl.textContent = 'ИГРА ИДЁТ';
            document.body.className = 'playing';
            break;
        case 'accusing':
            statusEl.textContent = '⚖ ОБВИНЕНИЕ';
            document.body.className = 'accusing';
            tableScene.classList.add('accusing');
            shakeScreen();
            break;
        case 'devil_deal':
            statusEl.textContent = '😈 СДЕЛКА С ДЬЯВОЛОМ';
            document.body.className = 'devil_deal';
            break;
        case 'ended':
            const w = Object.values(GameState.players).find(p => p?.alive && !p.isGhost);
            statusEl.textContent = w ? `🏆 ${w.name} — ХОЗЯИН САЛОНА!` : 'НИЧЬЯ';
            document.body.className = 'victory';
            tableScene.classList.add('victory');
            break;
    }
    if (GameState.gameState !== 'accusing') {
        tableScene.classList.remove('accusing');
    }
    if (GameState.gameState !== 'ended') {
        tableScene.classList.remove('victory');
    }
    roundEl.textContent = `Раунд: ${GameState.roundNumber}`;
    if (GameState.lastBet) {
        const player = GameState.players[GameState.lastBet.player];
        betEl.textContent = `${player?.name || '?'}: ${GameState.lastBet.count}×${getDieEmoji(GameState.lastBet.value)}`;
    } else {
        betEl.textContent = 'Ставка: —';
    }
    document.getElementById('betCountDisplay').textContent = GameState.betCount;
    document.getElementById('betValueDisplay').textContent = getDieEmoji(GameState.betValue);
}

function updateControls() {
    const mt = isMyTurn();
    const m = GameState.players[GameState.myUid] || {};
    const btnBet = document.getElementById('btnBet');
    const btnBluff = document.getElementById('btnBluff');
    btnBet.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' || GameState.isActionInProgress;
    btnBluff.disabled = !mt || GameState.isGhost || GameState.gameState !== 'betting' ||
                        !GameState.lastBet || GameState.lastBet.player === GameState.myUid ||
                        m.cannotAccuse || GameState.isActionInProgress;
    const cc = !GameState.isGhost && GameState.gameState !== 'devil_deal';
    document.getElementById('btnChat').disabled = !cc;
    document.getElementById('btnEmoji').disabled = !cc || GameState.emojiCooldown;
    document.getElementById('btnTaunt').disabled = !cc || GameState.tauntCooldown;
    
    // ✅ ПОКАЗЫВАЕМ ПАНЕЛЬ ПРИЗРАКОВ
    if (GameState.isGhost) {
        document.getElementById('diceContainer').style.display = 'none';
        document.getElementById('controlsRow').style.display = 'none';
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) {
            gp.style.display = 'flex';
            updateGhostButtons();
        }
    } else {
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) gp.style.display = 'none';
        document.getElementById('controlsRow').style.display = 'flex';
        if (mt && !GameState.isGhost && GameState.gameState === 'betting') populateBetSelects();
    }
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
    const au = Object.keys(GameState.players).filter(u =>
        GameState.players[u]?.alive && !GameState.players[u]?.isGhost && GameState.players[u].connected !== false
    );
    if (!au.length) return false;
    au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0] === GameState.myUid;
    const idx = au.indexOf(GameState.lastBet.player);
    return au[(idx + 1) % au.length] === GameState.myUid;
}

function placeBet() {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    const m = GameState.players[GameState.myUid];
    if (!m) return;
    const c = GameState.betCount;
    const v = GameState.betValue;
    if (v < 1 || v > 6) return showNotification('Номинал 1-6!');
    if (GameState.lastBet && (c < GameState.lastBet.count ||
        (c === GameState.lastBet.count && v <= GameState.lastBet.value))) {
        return showNotification('Ставка должна быть выше!');
    }
    if (m.forcedBluff) {
        let nc = GameState.lastBet ? GameState.lastBet.count + 3 : 1;
        let nv = GameState.lastBet ? GameState.lastBet.value : 1;
        if (nv > 6) { nc++; nv = 1; }
        if (c < nc || (c === nc && v < nv)) {
            return showNotification(`Обязательно: ${nc}×${getDieEmoji(nv)}`);
        }
    }
    GameState.isActionInProgress = true;
    const nb = { player: GameState.myUid, count: c, value: v, timestamp: Date.now() };
    GameState.lastBet = nb;
    GameState.players[GameState.myUid].lastBetInRound = nb;
    const updates = {};
    updates['lastBet'] = nb;
    updates['turnCounter'] = GameState.turnCounter + 1;
    updates[`players/${GameState.myUid}/lastBetInRound`] = nb;
    updates[`players/${GameState.myUid}/cursed`] = false;
    updates[`players/${GameState.myUid}/forcedBluff`] = false;
    safeUpdate(GameState.roomRef, updates, 'placeBet').finally(() => {
        GameState.isActionInProgress = false;
    });
    GameState.turnCounter++;
    addLogEntry(`🎲 ${m.name} ставит ${c}×${getDieEmoji(v)}`, 'bet');
    playSound('bet');
    nextTurn();
}

function accuse() {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    if (!GameState.lastBet || GameState.lastBet.player === GameState.myUid) return;
    GameState.isActionInProgress = true;
    GameState.gameState = 'accusing';
    const accusedUid = GameState.lastBet.player;
    GameState.lastAccusationResult = {
        accuser: GameState.myUid,
        accused: accusedUid,
        bet: GameState.lastBet
    };
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: {
            accuser: GameState.myUid,
            accused: accusedUid,
            bet: GameState.lastBet,
            timestamp: Date.now()
        }
    }, 'accuse').finally(() => {
        GameState.isActionInProgress = false;
    });
    const accuser = GameState.players[GameState.myUid];
    const accused = GameState.players[accusedUid];
    addLogEntry(`⚖ ${accuser.name} обвиняет ${accused.name} в блефе!`, 'accusation');
    playSound('accuse');
    if (GameState.timers.accusation) clearTimeout(GameState.timers.accusation);
    GameState.timers.accusation = setTimeout(() => resolveAccusation(accusedUid), 3000);
}

function shakeScreen() {
    document.body.style.animation = 'shake 0.5s';
    setTimeout(() => {
        document.body.style.animation = '';
    }, 500);
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
    if (accused?.artifact?.id === 'wildDie') {
        total++;
        wildSaved = true;
    }
    let isLie = total < GameState.lastBet.count;
    if (accused?.cursed || accused?.familiarCursed) isLie = true;
    const updates = {};
    const effects = [];
    const diceCountByValue = {};
    for (let i = 1; i <= 6; i++) diceCountByValue[i] = 0;
    Object.values(GameState.players).forEach(p => {
        if (!p?.alive || p.isGhost) return;
        p.dice.forEach(d => {
            const val = parseInt(d);
            if (val >= 1 && val <= 6) diceCountByValue[val]++;
        });
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
    GameState.lastAccusationResult = {
        ...GameState.lastAccusationResult,
        isLie,
        total,
        diceCountByValue,
        effects
    };
    updates['accusationResult'] = {
        isLie,
        effects: effects.join('\n'),
        resultText: isLie ? 'БЛЕФ РАСКРЫТ' : 'СТАВКА ВЕРНА',
        resultClass: isLie ? 'lie' : 'truth'
    };
    safeUpdate(GameState.roomRef, updates, 'resolve-result');
    setTimeout(() => {
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, {
            state: 'betting',
            accusingData: null,
            accusationResult: null
        }, 'resolve-end');
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

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ checkDeath
function checkDeath() {
    if (GameState.gameState === 'ended') return;
    
    Object.keys(GameState.players).forEach(uid => {
        const p = GameState.players[uid];
        if (!p || p.isGhost || !p.alive) return;
        
        const ml = p.maxLives || 3;
        if (p.poisons >= ml) {
            if (p.devilDealsUsed >= 2) {
                // Лимит сделок исчерпан - становимся призраком
                turnToGhost(uid);
            } else {
                if (p.isBot) {
                    // Боты пытаются выжить
                    const diff = GameState.bots[uid]?.difficulty ?? 2;
                    const surviveChance = [0.2, 0.5, 0.7, 0.9][diff];
                    
                    if (Math.random() < surviveChance) {
                        // Бот выиграл сделку
                        const updates = {
                            poisons: 0,
                            blood: 0,
                            alive: true,
                            isGhost: false,
                            artifact: null,
                            dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1),
                            devilDealsUsed: (p.devilDealsUsed||0) + 1
                        };
                        safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'bot-deal-win');
                        addLogEntry(`😈 ${p.name} выиграл сделку с Дьяволом!`, 'system');
                        playSound('devilWin');
                        playSound('resurrection');
                    } else {
                        // Бот проиграл - становимся призраком
                        turnToGhost(uid);
                    }
                } else {
                    // Живой игрок
                    if (uid === GameState.myUid) {
                        // Это я - показываем модалку
                        startDevilDeal(uid);
                    } else {
                        // Другой игрок - он сам видит модалку на своём устройстве
                        addLogEntry(`😈 ${p.name} отправляется к Дьяволу...`, 'system');
                    }
                }
            }
        }
    });
    
    // Проверка победы
    const humans = Object.values(GameState.players).filter(p => p?.alive && !p.isGhost);
    if (humans.length === 1 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'victory');
        addLogEntry(`🏆 ${humans[0].name} — хозяин салона!`, 'system');
        playSound('win');
        showConfetti();
    } else if (humans.length === 0 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'draw');
        addLogEntry('💀 Салон опустел...', 'system');
    }
}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ turnToGhost
function turnToGhost(uid) {
    const updates = {
        alive: false,
        isGhost: true,
        poisons: 0,
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
                alive: true,
                isGhost: false,
                poisons: (p.maxLives||3) - 1,
                blood: 0,
                ghostTarget: null,
                artifact: null,
                usedAbilities: {},
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
        {
            id: 'lose_dice',
            title: '🎲 Отдать 2 кубика Дьяволу',
            desc: 'Воскреснете с 3 кубиками вместо 5',
            apply: () => ({
                poisons: 0,
                blood: 0,
                alive: true,
                isGhost: false,
                artifact: null,
                dice: Array(3).fill(0).map(() => Math.floor(Math.random()*6)+1),
                maxDice: 3,
                devilDealsUsed: dealsUsed + 1
            })
        },
        {
            id: 'lose_artifacts',
            title: '🚫 Отказаться от артефактов',
            desc: 'Воскреснете, но без артефактов до конца игры',
            apply: () => ({
                poisons: 0,
                blood: 0,
                alive: true,
                isGhost: false,
                artifact: null,
                dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1),
                noArtifactsForever: true,
                devilDealsUsed: dealsUsed + 1
            })
        },
        {
            id: 'lose_maxlife',
            title: '💔 Отдать часть души',
            desc: `Воскреснете с ${Math.max(1, (GameState.defaultLives||3)-1)} жизнями`,
            apply: () => ({
                poisons: 0,
                blood: 0,
                alive: true,
                isGhost: false,
                artifact: null,
                dice: Array(5).fill(0).map(() => Math.floor(Math.random()*6)+1),
                maxLives: Math.max(1, (GameState.defaultLives||3)-1),
                devilDealsUsed: dealsUsed + 1
            })
        }
    ];
    const content = document.getElementById('devilContent');
    content.innerHTML = `
<p style="text-align: center; margin-bottom: 20px;">Дьявол предлагает воскреснуть. Какой ценой?</p>
<div id="devilOptions" style="display: flex; flex-direction: column; gap: 12px;"></div>
<div class="devil-progress-bar" id="devilProgressBar" style="width: 100%;"></div>
<p style="text-align: center; font-size: 0.8em; color: var(--accent-red); margin-top: 15px;">
⚠ Лимит: 2 сделки. Далее — призрак навеки.
</p>
<button class="action-button btn-bluff" id="btnRefuseDeal" style="width: 100%; margin-top: 15px;">
ОТКАЗАТЬСЯ (СТАТЬ ПРИЗРАКОМ)
</button>
`;
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
    const alive = Object.keys(GameState.players).filter(u =>
        GameState.players[u]?.alive && !GameState.players[u]?.isGhost
    );
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
            const art = avail.length ?
                avail[Math.floor(Math.random()*avail.length)] :
                ARTIFACTS[Math.floor(Math.random()*ARTIFACTS.length)];
            GameState.artifactHistory.push(art.id+'_'+uid);
            const numDice = p.maxDice || 5;
            let dc = Array(numDice).fill(0).map(() => Math.floor(Math.random()*6)+1);
            if (p.evilEyed) {
                dc = dc.map(() => Math.random() < 0.7 ?
                    Math.floor(Math.random()*3)+1 :
                    Math.floor(Math.random()*3)+4);
            }
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
    if (GameState.artifactHistory.length > MAX_HISTORY) {
        GameState.artifactHistory = GameState.artifactHistory.slice(-MAX_HISTORY);
    }
    updates.round = GameState.roundNumber;
    updates.state = 'betting';
    updates.lastBet = null;
    updates.turnCounter = GameState.turnCounter;
    updates.artifactHistory = GameState.artifactHistory;
    const au = Object.keys(GameState.players).filter(u =>
        GameState.players[u]?.alive && !GameState.players[u]?.isGhost
    );
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
    if (GameState.currentPlayerUid &&
        GameState.players[GameState.currentPlayerUid]?.isBot &&
        GameState.currentPlayerUid !== GameState.myUid &&
        !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

function nextTurn() {
    if (GameState.gameState !== 'betting') return;
    const au = Object.keys(GameState.players).filter(u =>
        GameState.players[u]?.alive && !GameState.players[u]?.isGhost &&
        GameState.players[u].connected !== false
    );
    if (!au.length) return;
    au.sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    const idx = au.indexOf(GameState.currentPlayerUid);
    GameState.currentPlayerUid = au[(idx+1)%au.length];
    GameState.turnCounter++;
    safeUpdate(GameState.roomRef, {
        currentPlayerUid: GameState.currentPlayerUid,
        turnCounter: GameState.turnCounter
    }, 'nextTurn');
    if (GameState.currentPlayerUid &&
        GameState.players[GameState.currentPlayerUid]?.isBot &&
        GameState.currentPlayerUid !== GameState.myUid &&
        !GameState.isBotThinking) {
        botTurn(GameState.currentPlayerUid);
    }
}

function addBot() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') {
        return showNotification('Только в лобби!');
    }
    const cnt = Object.keys(GameState.players).filter(u => GameState.players[u]?.isBot).length;
    if (cnt >= 5) return showNotification('Максимум 5 ботов');
    const id = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    const botFaces = ['🤖', '🎭', '🦹', '🧙', '🧛', '👹', '👺', '🤡'];
    const randomFace = botFaces[Math.floor(Math.random() * botFaces.length)];
    const randomSuit = SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)];
    const data = {
        name: '🤖 ' + botDifficultyNames[GameState.botDifficulty],
        uid: id,
        avatar: randomFace,
        color: randomSuit.accent,
        suitColor: randomSuit.color,
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
        joinedAt: Date.now()
    };
    GameState.bots[id] = { difficulty: GameState.botDifficulty, knownDice: {} };
    safeSet(GameState.roomRef.child('players').child(id), data, 'addBot');
    addLogEntry(`🤖 Бот-${botDifficultyNames[GameState.botDifficulty]} входит в салон`, 'system');
}

function removeAllBots() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') {
        return showNotification('Только в лобби!');
    }
    Object.keys(GameState.players).forEach(uid => {
        if (GameState.players[uid]?.isBot) {
            GameState.roomRef.child('players').child(uid).remove();
        }
    });
    GameState.bots = {};
    GameState.expertKnownDice = {};
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
                accuse();
            } else {
                const pc = Object.keys(GameState.players).filter(u =>
                    GameState.players[u]?.alive && !GameState.players[u]?.isGhost
                ).length;
                const maxPos = Math.max(pc * 10, 10);
                const nc = GameState.lastBet ?
                    Math.min(maxPos, GameState.lastBet.count + Math.floor(Math.random()*3)+1) :
                    Math.floor(Math.random()*5)+1;
                const nv = Math.floor(Math.random()*6)+1;
                GameState.betCount = nc;
                GameState.betValue = nv;
                placeBet();
            }
        }
    }, 2000);
}

function useArtifact(id) {
    if (GameState.gameState !== 'betting') return;
    const m = GameState.players[GameState.myUid];
    const art = ARTIFACTS.find(a => a.id === id);
    if (!art || (art.type === 'active' && GameState.usedSpecialThisRound[id])) return;
    showNotification(`Использован артефакт: ${art.name}`);
    addLogEntry(`🎴 ${m.name} использует ${art.name}`, 'artifact');
    playSound('artifact');
    GameState.usedSpecialThisRound[id] = true;
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {
        usedSpecialThisRound: GameState.usedSpecialThisRound
    }, 'use-artifact');
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

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showResultPanel() {
    if (!GameState.lastAccusationResult) {
        showNotification('Нет результатов для отображения');
        return;
    }
    const result = GameState.lastAccusationResult;
    const content = document.getElementById('resultContent');
    let html = `
<div class="result-title ${result.isLie ? 'lie' : 'truth'}">
${result.isLie ? '✅ БЛЕФ РАСКРЫТ!' : '❌ СТАВКА ВЕРНА!'}
</div>
<div class="dice-grid">
`;
    for (let i = 1; i <= 6; i++) {
        html += `
<div class="dice-column">
<div class="dice-emoji">${getDieEmoji(i)}</div>
<div class="dice-separator">×</div>
<div class="dice-count">${result.diceCountByValue[i] || 0}</div>
</div>
`;
    }
    html += `</div><div class="effects-list">`;
    result.effects.forEach(effect => {
        html += `<div class="effect-item">${effect}</div>`;
    });
    html += `</div>`;
    content.innerHTML = html;
    openModal('resultPanel');
}

function sendChatMessage(text, type = 'text') {
    const now = Date.now();
    if (now - GameState.chatLastSend < CHAT_DEBOUNCE_MS) {
        return showNotification('Не так быстро!');
    }
    if (type === 'emoji' && GameState.emojiCooldown) {
        return showNotification('Подождите 5 секунд');
    }
    if (type === 'taunt' && GameState.tauntCooldown) {
        return showNotification('Подождите 5 секунд');
    }
    GameState.chatLastSend = now;
    safeUpdate(GameState.roomRef.child('chat').push(), {
        sender: GameState.myName,
        text: text,
        type: type,
        timestamp: now
    }, 'chat');
    if (type === 'emoji') {
        GameState.emojiCooldown = true;
        setTimeout(() => {
            GameState.emojiCooldown = false;
            updateControls();
        }, EMOJI_COOLDOWN_MS);
    } else if (type === 'taunt') {
        GameState.tauntCooldown = true;
        setTimeout(() => {
            GameState.tauntCooldown = false;
            updateControls();
        }, TAUNT_COOLDOWN_MS);
    }
    document.getElementById('chatInputContainer').classList.remove('active');
    document.getElementById('emojiPanel').classList.remove('active');
    document.getElementById('tauntPanel').classList.remove('active');
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
    if (saved) {
        return JSON.parse(saved);
    }
    return {
        topBar: 100,
        bottomBar: 100,
        table: 100,
        players: 100,
        buttons: 100
    };
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
        if (saved && confirm(`Вернуться в салон ${saved}?`)) {
            room = saved;
        }
    }
    if (room) {
        GameState.currentRoomId = room;
        enterRoom(room);
    } else {
        createRoom();
    }
    setupAudioContext();
    const tauntPanel = document.getElementById('tauntPanel');
    Object.values(TAUNTS).flat().forEach(taunt => {
        const btn = document.createElement('div');
        btn.className = 'taunt-btn';
        btn.textContent = taunt;
        btn.onclick = () => sendChatMessage(taunt, 'taunt');
        tauntPanel.appendChild(btn);
    });
    document.getElementById('menuBtn').onclick = () => {
        document.getElementById('menuDropdown').classList.toggle('active');
    };
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
    document.getElementById('btnLog').onclick = () => {
        document.getElementById('logPanel').classList.toggle('active');
    };
    document.getElementById('btnResult').onclick = showResultPanel;
    document.getElementById('logClose').onclick = () => {
        document.getElementById('logPanel').classList.remove('active');
    };
    document.getElementById('resultClose').onclick = () => {
        document.getElementById('resultPanel').classList.remove('active');
    };
    document.querySelectorAll('.log-filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            GameState.logFilter = btn.dataset.filter;
            renderLog();
        };
    });
    document.getElementById('betCountUp').onclick = () => {
        GameState.betCount = Math.min(99, GameState.betCount + 1);
        updateUI();
    };
    document.getElementById('betCountDown').onclick = () => {
        GameState.betCount = Math.max(1, GameState.betCount - 1);
        updateUI();
    };
    document.getElementById('betValueUp').onclick = () => {
        GameState.betValue = GameState.betValue >= 6 ? 1 : GameState.betValue + 1;
        updateUI();
    };
    document.getElementById('betValueDown').onclick = () => {
        GameState.betValue = GameState.betValue <= 1 ? 6 : GameState.betValue - 1;
        updateUI();
    };
    document.getElementById('chatInput').onkeypress = (e) => {
        if (e.key === 'Enter') {
            const text = e.target.value.trim();
            if (text) {
                sendChatMessage(text, 'text');
                e.target.value = '';
            }
        }
    };
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.onclick = () => {
            sendChatMessage(btn.dataset.emoji, 'emoji');
        };
    });
    document.getElementById('menuStart').onclick = () => {
        if (GameState.gameState !== 'lobby') {
            return showNotification('Игра уже идёт!');
        }
        const ac = Object.keys(GameState.players).filter(u =>
            GameState.players[u] && !GameState.players[u].isBot
        ).length;
        const bc = Object.keys(GameState.players).filter(u =>
            GameState.players[u]?.isBot
        ).length;
        if ((ac >= 1 && bc >= 1) || ac >= 2) {
            startNewRound();
        } else {
            showNotification('Нужен 1 игрок + 1 бот или 2 игрока');
        }
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuReset').onclick = () => {
        if (!confirm('Сбросить игру?\nВесь прогресс будет потерян.')) return;
        if (!confirm('ТОЧНО сбросить?')) return;
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
        clearLog();
        const updates = {};
        Object.keys(GameState.players).forEach(uid => {
            const p = GameState.players[uid];
            if (!p) return;
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
        });
        updates.state = 'lobby';
        updates.round = 0;
        updates.lastBet = null;
        updates.artifactHistory = [];
        safeUpdate(GameState.roomRef, updates, 'reset');
        addLogEntry('🔄 Салон очищен, начинаем заново', 'system');
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuBots').onclick = () => {
        const action = prompt('Введите: "add" для добавления бота, "remove" для удаления всех');
        if (action === 'add') addBot();
        else if (action === 'remove') removeAllBots();
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuInvite').onclick = () => {
        const link = `${window.location.origin}${window.location.pathname}?room=${GameState.currentRoomId}`;
        navigator.clipboard.writeText(link).then(() => {
            showNotification('✅ Ссылка скопирована!');
            addLogEntry('🔗 Ссылка скопирована', 'system');
        });
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuSound').onclick = () => {
        GameState.soundEnabled = !GameState.soundEnabled;
        document.getElementById('menuSound').textContent =
            `🔊 ЗВУК: ${GameState.soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuArtifacts').onclick = () => {
        if (GameState.gameState !== 'lobby') {
            return showNotification('Только в лобби!');
        }
        GameState.specialDiceEnabled = !GameState.specialDiceEnabled;
        document.getElementById('menuArtifacts').textContent =
            `🎲 АРТЕФАКТЫ: ${GameState.specialDiceEnabled ? '✅' : '❌'}`;
        safeUpdate(GameState.roomRef.child('settings'), {
            specialDiceEnabled: GameState.specialDiceEnabled
        }, 'toggle-artifacts');
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuLives').onclick = () => {
        if (GameState.gameState !== 'lobby') {
            return showNotification('Только в лобби!');
        }
        const o = [3, 4, 5, 6, 2];
        GameState.defaultLives = o[(o.indexOf(GameState.defaultLives) + 1) % o.length];
        document.getElementById('menuLives').textContent = `❤ ЖИЗНИ: ${GameState.defaultLives}`;
        safeUpdate(GameState.roomRef.child('settings'), {
            defaultLives: GameState.defaultLives
        }, 'toggle-lives');
        Object.keys(GameState.players).forEach(uid => {
            if (GameState.players[uid] && !GameState.players[uid].isBot) {
                safeUpdate(GameState.roomRef.child('players').child(uid), {
                    maxLives: GameState.defaultLives
                }, 'update-lives');
            }
        });
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.getElementById('menuScale').onclick = () => {
        openScaleSettings();
        document.getElementById('menuDropdown').classList.remove('active');
    };
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('menuDropdown');
        const btn = document.getElementById('menuBtn');
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.classList.remove('active');
        }
    });
    document.addEventListener('click', (e) => {
        const chatContainer = document.getElementById('chatInputContainer');
        const emojiPanel = document.getElementById('emojiPanel');
        const tauntPanel = document.getElementById('tauntPanel');
        const chatBtn = document.getElementById('btnChat');
        const emojiBtn = document.getElementById('btnEmoji');
        const tauntBtn = document.getElementById('btnTaunt');
        if (!chatContainer.contains(e.target) && !chatBtn.contains(e.target)) {
            chatContainer.classList.remove('active');
        }
        if (!emojiPanel.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPanel.classList.remove('active');
        }
        if (!tauntPanel.contains(e.target) && !tauntBtn.contains(e.target)) {
            tauntPanel.classList.remove('active');
        }
    });
    const sliders = ['scaleTopBar', 'scaleBottomBar', 'scaleTable', 'scalePlayers', 'scaleButtons'];
    sliders.forEach(id => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.addEventListener('input', updateScaleLabels);
        }
    });
    applyScaleSettings();
    console.log('🎩 LIAR\'S DICE — Noir Casino (Horizontal Mode + Scale + Drag) loaded');
};

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

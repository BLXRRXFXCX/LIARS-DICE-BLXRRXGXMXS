/* ============================================================
LIAR'S DICE v8.7 — FINAL RELEASE (UI REDESIGN)
============================================================ */
const DEBUG = false;
function log(...args) { if (DEBUG) console.log('[Game]', ...args); }
function logError(...args) { console.error('[Game Error]', ...args); }

const DIE_EMOJI_CACHE = ['?', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
function getDieEmoji(v) {
    const val = parseInt(v) || 1;
    return DIE_EMOJI_CACHE[val] || '';
}

const GameState = {
    roomRef: null,
    myUid: '', myName: '', myAvatar: '🙂', myColor: '#ffffff',
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
    chatLastSend: 0,
    isActionInProgress: false,
    pendingArtifact: null,
    myWardrobe: {
        head: '🙂',
        tuxedoColor: '#222244',
        trimColor: '#ffd700'
    },
    betCount: 1,
    betValue: 1,
    gameLog: [],
    lastAccusationData: null
};

const VOTE_COOLDOWN = 120000;
const MAX_HISTORY = 50;
const CHAT_DEBOUNCE_MS = 1000;
const OFFLINE_TIMEOUT = 5 * 60 * 1000;

const AVATARS = ['😇','🧐','🤪','🤢','🫥','👸','👨‍🦲','🤓','👽','🦄','👹','🤠','💀','🐵','👺','🧿','🤡','💀','💩','🤬','🐷','🐼','🐭','🐸','🐔'];
const COLORS = ['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ff8800','#88ff00','#ff0088','#0088ff','#ffffff','#cccccc','#ffaa88','#88ffaa','#aa88ff','#ff8888','#88ff88','#8888ff','#ffaa00','#00ffaa'];
const TUXEDO_COLORS = ['#222244','#1a1a2e','#2d1a3e','#1a2e1a','#3e1a1a','#1a2e3e','#2e2e1a','#3e1a2e','#0a0a2e','#2e0a0a'];
const TRIM_COLORS = ['#ffd700','#ff4444','#44ff44','#4444ff','#ff44ff','#44ffff','#ff8800','#ffffff','#ff0088','#00ff88'];
const QUICK_EMOJIS = ['😂','😎','🤔','😱','🤯','🔥','💀','💩','🤡','😈','🥶','😤','🤫','👀','💪','🙏','🎉','🤣','😏','🤬','🤞','🫰','🖕','🫶','🤟'];
const TAUNTS = {
    evil: ['Ты чмоня!','ПОЛНЫЙ ХУЕП','Я щас лопну..','Шо ты, лысый..','Плаки-плаки!','Ну ты клоун..'],
    kind: ['ЛЕГЕНДА!','МЕГАХАРОШ!','КРАСАВЧИК!','МЕГАМОЗГ!','ПОЛНЫЙ ГАЗ!','У-ДА-ЧИ!'],
    mocking: ['Ты ЛОХ!','СОСАТЬ!','Ха-ха-ха!','И это всё?','Серьёзно!?','ЛИВАЙ С ПОЗОРОМ!']
};
const botDifficultyNames = ['Нубик','Среднячок','Потный','Божество'];

const ARTIFACTS = [
    {id:'target',emoji:'🎯',name:'В ЦЕЛЬ!',type:'active',description:'Выберите противника и уничтожьте у него 1 кубик выбранного номинала.',hidden:false},
    {id:'fireball',emoji:'☄️',name:'FIREBALL',type:'active',description:'Перебрасывает ВСЕ ваши обычные кубики (кроме замороженных).',hidden:false},
    {id:'luck',emoji:'🍀',name:'LUCKER',type:'active',description:'Перебрасывает кубики с шансом 70% на ⚃-⚅ (кроме замороженных).',hidden:false},
    {id:'blessing',emoji:'⚕️',name:'БЛАГОСЛОВЕНИЕ',type:'active',description:'Убирает 1 яд у себя (если есть хотя бы 1 отсутствующее сердце) или любого другого случайного игрока.',hidden:false},
    {id:'thief',emoji:'🥷',name:'ВОР',type:'active',description:'Крадёт артефакт у выбранного противника, если артефакт не был использован. Противник теряет возможность использовать свой артефакт.',hidden:false},
    {id:'deceiver',emoji:'🎭',name:'ВРУНИШКА',type:'active',description:'Завышенная (блеф) авто-ставка, обвинитель получает +1 дополнительный яд при обвинении данной ставки.',hidden:true},
    {id:'clone',emoji:'🧬',name:'КЛОН',type:'active',description:'Артефакт становится 6-ым кубиком со значением противника (случайный номинал).',hidden:true},
    {id:'curse',emoji:'☠️',name:'ПРОКЛЯТИЕ',type:'active',description:'Следующая ставка цели автоматически ложная.',hidden:true},
    {id:'spy',emoji:'🕵️',name:'ШПИОН',type:'active',description:'Показывает 1 случайный кубик выбранного противника.',hidden:true},
    {id:'ice',emoji:'🧊',name:'FREEZING',type:'active',description:'Замораживает кубики цели на раунд (можно использовать на себя), полностью блокирует уничтожение и изменение кубиков на время заморозки.',hidden:true},
    {id:'defender',emoji:'🛡️',name:'ЗАЩИТНИК',type:'passive',description:'Блокирует ВЕСЬ УРОН в текущем раунде (1 раз).',hidden:true},
    {id:'bloodthirst',emoji:'🧛',name:'КРОВОЖАДНОСТЬ',type:'passive',description:'+1 кровь (бонусная жизнь) при верном обвинении, обвинитель при ошибке в обвинении получает +1 дополнительный яд.',hidden:true},
    {id:'analyst',emoji:'🔍',name:'ИССЛЕДОВАНИЕ',type:'active',description:'Показывает минимальное количество игроков с кубиком выбранного номинала.',hidden:true},
    {id:'double',emoji:'🪞',name:'ДВОЙНИК',type:'active',description:'Копирует последнюю ставку выбранного игрока (можно использовать только при наличии последней ставки).',hidden:false},
    {id:'evilEye',emoji:'🧿',name:'СГЛАЗ',type:'active',description:'Накладывает невезение на кубики цели (70% на ⚀-⚂ при следующем перебросе/обновлении кубиков цели).',hidden:true},
    {id:'wildDie',emoji:'🎲',name:'WILDICE',type:'passive',description:'Считается любым номиналом при подсчёте ставки владельца, при обвинении участвует в подсчёте кубиков, если повлиял на исход проверки - обвинитель получает +1 дополнительный яд.',hidden:true},
    {id:'sacrifice',emoji:'💀',name:'САМОПОЖЕРТВОВАНИЕ',type:'active',description:'+1 яд ради мощного эффекта на выбор (Щит в следующем раунде/Переброс всех кубиков/Соперник обязан завысить ставку).',hidden:true},
    {id:'circus',emoji:'🎪',name:'ЦИРК',type:'active',description:'Обмен 2-мя случайными кубиками с целью (требуется ≥2 кубиков у обоих).',hidden:true},
    {id:'darkPact',emoji:'🌑',name:'ЗАТМЕНИЕ',type:'passive',description:'Текущий раунд: +1 дополнинтельный яд при обвинении владельца артефакта в текущем раунде. В следующем раунде: щит на ВЕСЬ УРОН на весь раунд.',hidden:true},
    {id:'sniper',emoji:'🔫',name:'ПЕРЕСТРЕЛКА',type:'active',description:'Уничтожает все кубики выбранного номинала у ВСЕХ (кроме замороженных, нельзя использовать на номоинал текущей ставки). После использования нельзя обвинять.',hidden:true}
];

const GHOST_ABILITIES = [
    {id:'oathOfVengeance',emoji:'⚔️',name:'МЕСТЬ',type:'active',limit:'once_per_ghost',description:'Выберите цель. Если она умрёт — вы воскреснете (1 жизнь, 0 крови)'},
    {id:'familiarCurse',emoji:'🔮',name:'ПРОКЛЯТИЕ ФАМИЛЬЯРА',type:'active',limit:'once_per_ghost',description:'Следующая ставка цели автоматически ложная (до конца раунда)'},
    {id:'poltergeist',emoji:'🌀',name:'ПОЛТЕРГЕЙСТ',type:'active',limit:'once_per_ghost',description:'Случайный эффект: саботаж/благословение/перемешивание'},
    {id:'keeperOfSecrets',emoji:'👁️',name:'ХРАНИТЕЛЬ ТАЙН',type:'active',limit:'unlimited',description:'Видите кубики всех живых игроков'},
    {id:'soulReaper',emoji:'💀',name:'ЖАТВА ДУШ',type:'active',limit:'once_per_ghost',description:'20% шанс эффекта на каждого живого. При убийстве — воскрешение (1 жизнь, 0 крови)'}
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

function showNotification(msg, type='info', autoClose = 0, isHtml = false) {
    const tt = {error:'❌ Ошибка', warning:'⚠️ Внимание', success:'✅ Успех', info:'ℹ️ Инфо'};
    const title = document.getElementById('notifyTitle');
    const message = document.getElementById('notifyMessage');
    const modal = document.getElementById('modalNotify');
    if (title && message && modal) {
        title.textContent = tt[type] || 'ℹ️ Уведомление';
        if (isHtml) {
            message.innerHTML = msg;
        } else {
            message.textContent = msg;
        }
        modal.style.display = 'block';
        if (autoClose > 0) {
            setTimeout(() => {
                modal.style.display = 'none';
            }, autoClose);
        }
    } else {
        if (autoClose === 0) alert(msg);
    }
}

function showLoading(show = true) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.style.cssText = 'position:fixed;top:20px;right:20px;font-size:2em;z-index:9999;pointer-events:none;opacity:0;transition:opacity 0.2s;background:rgba(0,0,0,0.5);padding:10px 15px;border-radius:10px;';
        loader.textContent = '⏳';
        document.body.appendChild(loader);
    }
    loader.style.opacity = show ? '1' : '0';
}

function addLogEntry(type, text) {
    const entry = {
        type: type,
        text: text,
        time: Date.now(),
        round: GameState.roundNumber,
        author: GameState.myName
    };
    if (GameState.roomRef) {
        GameState.roomRef.child('gameLog').push(entry);
    }
}

function renderLog(filter = 'all') {
    const container = document.getElementById('logContent');
    if (!container) return;
    container.innerHTML = '';
    const filtered = filter === 'all' ? GameState.gameLog : GameState.gameLog.filter(e => e.type === filter);
    if (filtered.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">Нет записей</div>';
        return;
    }
    filtered.slice().reverse().forEach(entry => {
        const d = document.createElement('div');
        d.className = `log-entry ${entry.type}`;
        const time = new Date(entry.time).toLocaleTimeString('ru-RU');
        d.textContent = `[${time}] ${entry.text}`;
        container.appendChild(d);
    });
}

function showLastCheck() {
    const data = GameState.lastAccusationData;
    const phrase = document.getElementById('checkPhrase');
    const summary = document.getElementById('checkDiceSummary');
    const result = document.getElementById('checkResult');
    const effects = document.getElementById('checkEffects');
    if (phrase) phrase.textContent = data?.phrase || 'Нет данных';
    if (summary) summary.innerHTML = data?.diceSummary || 'Нет данных';
    if (result) {
        result.textContent = data?.resultText || 'Нет данных';
        result.className = `accusation-result ${data?.resultClass || ''}`;
    }
    if (effects) effects.innerHTML = data?.effects || '<p style="color:#888;">Нет данных</p>';
    document.getElementById('modalCheck').style.display = 'block';
}

function openWardrobe() {
    const headSelect = document.getElementById('headSelect');
    const tuxSelect = document.getElementById('tuxedoColorSelect');
    const trimSelect = document.getElementById('tuxedoTrimSelect');
    const preview = document.getElementById('wardrobePreview');
    if (headSelect) {
        headSelect.innerHTML = '';
        AVATARS.forEach(av => {
            const b = document.createElement('span');
            b.className = 'wardrobe-option' + (GameState.myWardrobe.head === av ? ' selected' : '');
            b.textContent = av;
            b.onclick = () => {
                GameState.myWardrobe.head = av;
                headSelect.querySelectorAll('.wardrobe-option').forEach(x => x.classList.remove('selected'));
                b.classList.add('selected');
                renderWardrobePreview();
            };
            headSelect.appendChild(b);
        });
    }
    if (tuxSelect) {
        tuxSelect.innerHTML = '';
        TUXEDO_COLORS.forEach(col => {
            const b = document.createElement('span');
            b.className = 'color-option' + (GameState.myWardrobe.tuxedoColor === col ? ' selected' : '');
            b.style.background = col;
            b.onclick = () => {
                GameState.myWardrobe.tuxedoColor = col;
                tuxSelect.querySelectorAll('.color-option').forEach(x => x.classList.remove('selected'));
                b.classList.add('selected');
                renderWardrobePreview();
            };
            tuxSelect.appendChild(b);
        });
    }
    if (trimSelect) {
        trimSelect.innerHTML = '';
        TRIM_COLORS.forEach(col => {
            const b = document.createElement('span');
            b.className = 'color-option' + (GameState.myWardrobe.trimColor === col ? ' selected' : '');
            b.style.background = col;
            b.onclick = () => {
                GameState.myWardrobe.trimColor = col;
                trimSelect.querySelectorAll('.color-option').forEach(x => x.classList.remove('selected'));
                b.classList.add('selected');
                renderWardrobePreview();
            };
            trimSelect.appendChild(b);
        });
    }
    renderWardrobePreview();
    document.getElementById('modalWardrobe').style.display = 'block';
}

function renderWardrobePreview() {
    const preview = document.getElementById('wardrobePreview');
    if (!preview) return;
  preview.innerHTML = `
<div style="display:flex; flex-direction:column; align-items:center;">
    <div style="font-size:3em;">${GameState.myWardrobe.head}</div>
    <div style="width:60px; height:50px; background:${GameState.myWardrobe.tuxedoColor}; border-radius:4px 4px 8px 8px; position:relative; border:2px solid ${GameState.myWardrobe.trimColor};">
        <div style="position:absolute; left:15px; top:5px; width:2px; height:40px; background:${GameState.myWardrobe.trimColor};"></div>
        <div style="position:absolute; right:15px; top:5px; width:2px; height:40px; background:${GameState.myWardrobe.trimColor};"></div>
    </div>
</div>`;
}

function saveWardrobe() {
    localStorage.setItem('ld_wardrobe', JSON.stringify(GameState.myWardrobe));
    if (GameState.roomRef && GameState.myUid) {
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {
            wardrobe: GameState.myWardrobe
        }, 'save-wardrobe');
    }
    showNotification('Образ сохранён!', 'success');
    document.getElementById('modalWardrobe').style.display = 'none';
    renderPlayerList();
}

function loadWardrobe() {
    const saved = localStorage.getItem('ld_wardrobe');
    if (saved) {
        try { GameState.myWardrobe = JSON.parse(saved); } catch(e) {}
    }
}

function showSpeechBubble(uid, text, isEmoji = false, isTaunt = false) {
    const slot = document.querySelector(`.player-slot[data-uid="${uid}"]`);
    if (!slot) return;
    const rect = slot.getBoundingClientRect();
    const container = document.getElementById('speechBubbleContainer');
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.textContent = text;
    if (isEmoji) {
        bubble.style.fontSize = '2.5em';
        bubble.style.padding = '8px 14px';
        bubble.style.maxWidth = 'none';
        bubble.style.minWidth = 'auto';
    } else {
        bubble.style.fontSize = '1.1em';
        bubble.style.padding = '10px 16px';
        bubble.style.maxWidth = '220px';
        bubble.style.whiteSpace = 'normal';
    }
    const bubbleWidth = isEmoji ? 60 : Math.min(text.length * 9 + 32, 220);
    const leftPos = rect.left + rect.width / 2 - bubbleWidth / 2;
    const maxLeft = window.innerWidth - bubbleWidth - 10;
    const finalLeft = Math.max(10, Math.min(leftPos, maxLeft));
    bubble.style.left = finalLeft + 'px';
    bubble.style.top = (rect.top - 60) + 'px';
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 5000);
    if (GameState.roomRef && uid === GameState.myUid) {
        GameState.roomRef.child('speechBubbles').push({
            uid: uid,
            text: text,
            isEmoji: isEmoji,
            isTaunt: isTaunt,
            timestamp: Date.now()
        });
    }
}

function openQuickEmoji() {
    const list = document.getElementById('quickEmojiList');
    if (!list) return;
    list.innerHTML = '';
    QUICK_EMOJIS.forEach(em => {
        const b = document.createElement('button');
        b.className = 'quick-emoji-btn';
        b.textContent = em;
        b.onclick = () => {
            showSpeechBubble(GameState.myUid, em, true, false);
            closeModal('modalQuickEmoji');
        };
        list.appendChild(b);
    });
    document.getElementById('modalQuickEmoji').style.display = 'block';
}

function openTaunt() {
    document.getElementById('tauntTextList').innerHTML = '<p style="color:#888; text-align:center;">Выберите настроение</p>';
    document.getElementById('modalTaunt').style.display = 'block';
}

function selectTauntMood(mood) {
    const list = document.getElementById('tauntTextList');
    if (!list) return;
    list.innerHTML = '';
    TAUNTS[mood].forEach(txt => {
        const b = document.createElement('button');
        b.className = 'taunt-text-btn';
        b.textContent = txt;
        b.onclick = () => {
            showSpeechBubble(GameState.myUid, txt, false, true);
            closeModal('modalTaunt');
        };
        list.appendChild(b);
    });
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

function safeUpdate(ref, data, context='') {
    showLoading(true);
    return ref.update(data)
        .then(() => { log(`✅ ${context}`); showLoading(false); })
        .catch(err => { logError(`❌ ${context}`, err); showLoading(false); showNotification('Ошибка соединения', 'error'); });
}

function safeSet(ref, data, context='') {
    showLoading(true);
    return ref.set(data)
        .then(() => { log(`✅ ${context}`); showLoading(false); })
        .catch(err => { logError(`❌ ${context}`, err); showLoading(false); showNotification('Ошибка соединения', 'error'); });
}

function clearAllTimers() {
    if (GameState.timers.accusation) { clearTimeout(GameState.timers.accusation); GameState.timers.accusation = null; }
    if (GameState.timers.devilDeal) { clearInterval(GameState.timers.devilDeal); GameState.timers.devilDeal = null; }
    if (GameState.timers.vote) { clearInterval(GameState.timers.vote); GameState.timers.vote = null; }
    GameState.timers.bot.forEach(t => clearTimeout(t));
    GameState.timers.bot = [];
    log('🧹 Все таймеры очищены');
}

function createRoom() {
    const roomId = generateRoomId();
    GameState.currentRoomId = roomId;
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    document.getElementById('roomIdDisplay').textContent = 'ROOM: ' + roomId;
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
    const savedUid = localStorage.getItem('ld_myUid');
    const savedName = localStorage.getItem('ld_playerName');
    loadWardrobe();
    if (savedUid && savedName) {
        GameState.myUid = savedUid;
        GameState.myName = savedName;
    } else {
        GameState.myUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        GameState.myName = localStorage.getItem('ld_playerName') || 'Игрок';
        localStorage.setItem('ld_myUid', GameState.myUid);
        localStorage.setItem('ld_playerName', GameState.myName);
    }
    localStorage.setItem('ld_lastRoom', roomId);
    const playerData = {
        name: GameState.myName, uid: GameState.myUid,
        avatar: GameState.myAvatar, color: GameState.myColor,
        wardrobe: GameState.myWardrobe,
        dice: [], poisons: 0, blood: 0, alive: true, isGhost: false,
        artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0,
        maxLives: GameState.defaultLives, joinedAt: Date.now()
    };
    safeSet(GameState.roomRef.child('players').child(GameState.myUid), playerData, 'enterRoom');
    GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().update({ connected: false, lastSeenTurn: GameState.turnCounter, disconnectedAt: Date.now() });
    setupRoomListeners();
    setupConnectionListener();
    addLogEntry('system', `${GameState.myName} вошёл в комнату ${roomId}`);
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
                showNotification('⚠️ Потеряно соединение...', 'warning', 500);
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
GameState.lastAccuser = data.lastAccuser || null;  // ← читаем обвинителя
        Object.keys(GameState.players).forEach(uid => {
            if (!validatePlayerData(GameState.players[uid])) logError(`⚠️ Bad player data: ${uid}`);
        });
        const now = Date.now();
        Object.keys(GameState.players).forEach(uid => {
            const p = GameState.players[uid];
            if (p && p.connected === false && p.disconnectedAt) {
                if (now - p.disconnectedAt > OFFLINE_TIMEOUT && uid !== GameState.myUid) {
                    const firstUid = Object.keys(GameState.players).sort((a,b) => (GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0))[0];
                    if (firstUid === GameState.myUid) {
                        GameState.roomRef.child('players').child(uid).remove();
                        addLogEntry('system', `${p.name} удалён (оффлайн > 5 мин)`);
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
            if (me.wardrobe) {
                GameState.myWardrobe = me.wardrobe;
                localStorage.setItem('ld_wardrobe', JSON.stringify(GameState.myWardrobe));
            }
        }
       
        const panel = document.getElementById('accusationPanel');
        const res = data.accusationResult;
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
                const diceHtml = renderDiceAndBetInfo(ct);
                const sumEl = document.getElementById('accusationDiceSummary');
                if (sumEl) sumEl.innerHTML = diceHtml;
                
                GameState.lastAccusationData = {
                    phrase: ph?.textContent || '',
                    diceSummary: sumEl?.innerHTML || '',
                    resultText: res?.resultText || '',
                    resultClass: res?.resultClass || '',
                    effects: res?.effects || ''
                };
            }
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
        if (GameState.gameState === 'betting' && GameState.currentPlayerUid &&
            GameState.players[GameState.currentPlayerUid]?.isBot &&
            GameState.currentPlayerUid !== GameState.myUid && !GameState.isBotThinking) {
            botTurn(GameState.currentPlayerUid);
        }
    });
    GameState.roomRef.child('speechBubbles').limitToLast(20).on('child_added', (snapshot) => {
        const data = snapshot.val();
        if (!data || data.uid === GameState.myUid) return;
        const slot = document.querySelector(`.player-slot[data-uid="${data.uid}"]`);
        if (!slot) return;
        const rect = slot.getBoundingClientRect();
        const container = document.getElementById('speechBubbleContainer');
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = data.text;
        if (data.isEmoji) {
            bubble.style.fontSize = '2.5em';
            bubble.style.padding = '8px 14px';
            bubble.style.maxWidth = 'none';
            bubble.style.minWidth = 'auto';
        } else {
            bubble.style.fontSize = '1.1em';
            bubble.style.padding = '10px 16px';
            bubble.style.maxWidth = '220px';
            bubble.style.whiteSpace = 'normal';
        }
        const bubbleWidth = data.isEmoji ? 60 : Math.min(data.text.length * 9 + 32, 220);
        const leftPos = rect.left + rect.width / 2 - bubbleWidth / 2;
        const maxLeft = window.innerWidth - bubbleWidth - 10;
        const finalLeft = Math.max(10, Math.min(leftPos, maxLeft));
        bubble.style.left = finalLeft + 'px';
        bubble.style.top = (rect.top - 60) + 'px';
        container.appendChild(bubble);
        setTimeout(() => bubble.remove(), 5000);
    });
    GameState.roomRef.child('activeVote').on('value', (snapshot) => {
        const vote = snapshot.val();
        if (!vote) return;
        if (GameState.currentVoteTarget !== vote.target) {
            const p = GameState.players[vote.target];
            if (p) {
                openVoteModal(vote.target, vote.targetName || p.name, vote.startTime);
            }
        }
    });
    GameState.roomRef.child('activeVote').child('votes').on('value', (s) => {
        const votes = s.val();
        if (votes && GameState.currentVoteTarget) {
            updateVoteUI({ votes: votes });
        }
    });
    GameState.roomRef.child('gameLog').limitToLast(100).on('child_added', (snapshot) => {
        const entry = snapshot.val();
        if (!entry) return;
        const exists = GameState.gameLog.some(e => e.time === entry.time && e.text === entry.text);
        if (!exists) {
            GameState.gameLog.push(entry);
            if (GameState.gameLog.length > 100) GameState.gameLog.shift();
        }
    });
}

function renderUI() {
    updateGameStatus();
    updateLastBetDisplay();
    renderPlayerList();
    renderDiceRow();
    renderArtifactRow();
    updateControls();
    updateBetDisplays();
}

function updateGameStatus() {
    const cp = getCurrentPlayerName();
    const roundEl = document.getElementById('roundInfo');
    const turnEl = document.getElementById('turnInfo');
    if (roundEl) roundEl.textContent = `Раунд ${GameState.roundNumber}`;
    if (turnEl) {
        switch(GameState.gameState) {
            case 'lobby': turnEl.textContent = 'Ожидание...'; break;
            case 'betting': turnEl.textContent = `Ход: ${cp}`; break;
            case 'accusing': turnEl.textContent = '⚖️ Проверка...'; break;
            case 'devil_deal': turnEl.textContent = '😈 Сделка...'; break;
            case 'ended':
                const w = Object.values(GameState.players).find(p => p?.alive && !p.isGhost);
                turnEl.textContent = w ? `🏆 ${w.name}!` : 'Ничья';
                break;
        }
    }
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
    
    // Приоритет 1: используем currentPlayerUid из Firebase (он всегда актуальный)
    if (GameState.currentPlayerUid && au.includes(GameState.currentPlayerUid)) {
        return GameState.currentPlayerUid;
    }
    
    // Приоритет 2: fallback — вычисляем следующего после lastBet
    if (GameState.lastBet && GameState.lastBet.player) {
        const idx = au.indexOf(GameState.lastBet.player);
        if (idx !== -1) return au[(idx + 1) % au.length];
    }
    
    // Приоритет 3: первый игрок
    return au[0];
}

function updateLastBetDisplay() {
    const el = document.getElementById('lastBetDisplay');
    if (!el) return;
   if (GameState.lastBet && GameState.players[GameState.lastBet.player]) {
    const p = GameState.players[GameState.lastBet.player];
    el.innerHTML = `${escapeHtml(p.name)}: ${GameState.lastBet.count}×<span style="font-size:1.4em;">${getDieEmoji(GameState.lastBet.value)}</span>`;
    } else {
        el.textContent = 'Последняя ставка: —';
    }
}

function renderPlayerList() {
    const slots = document.querySelectorAll('.player-slot');
    const sortedUids = Object.keys(GameState.players).sort((a,b) => (GameState.players[a].joinedAt||0) - (GameState.players[b].joinedAt||0));
    const cu = getCurrentPlayerUid();
    slots.forEach((slot, idx) => {
        const uid = sortedUids[idx];
        const p = uid ? GameState.players[uid] : null;
        slot.className = 'player-slot' + (p ? '' : ' empty');
        slot.dataset.uid = uid || '';
        slot.dataset.slot = idx;
        slot.innerHTML = '';
        if (!p) return;
        if (uid === cu && GameState.gameState === 'betting' && !p.isGhost) slot.classList.add('active');
        const nick = document.createElement('div');
        nick.className = 'slot-nick';
        nick.style.color = p.color || '#fff';
        nick.textContent = p.name || 'НИК';
        slot.appendChild(nick);
        const body = document.createElement('div');
        body.className = 'slot-body';
        const head = document.createElement('div');
        head.className = 'slot-head';
        const wardrobe = p.wardrobe || { head: p.avatar || '🎲' };
        head.textContent = wardrobe.head || p.avatar || '🎲';
        body.appendChild(head);
        const tux = document.createElement('div');
        tux.className = 'slot-tuxedo';
        tux.style.background = wardrobe.tuxedoColor || '#222244';
        tux.style.borderColor = wardrobe.trimColor || '#ffd700';
        const trimL = document.createElement('div');
        trimL.className = 'trim-line trim-left';
        trimL.style.background = wardrobe.trimColor || '#ffd700';
        const trimR = document.createElement('div');
        trimR.className = 'trim-line trim-right';
        trimR.style.background = wardrobe.trimColor || '#ffd700';
        tux.appendChild(trimL);
        tux.appendChild(trimR);
        body.appendChild(tux);
        slot.appendChild(body);
        if (p.isGhost) {
            const gb = document.createElement('div');
            gb.className = 'slot-ghost-badge';
            gb.textContent = '👻';
            slot.appendChild(gb);
        }
        if (p.connected === false) {
            const ob = document.createElement('div');
            ob.className = 'slot-offline-badge';
            ob.textContent = '💤';
            slot.appendChild(ob);
        }
        const ti = document.createElement('div');
        ti.className = 'slot-turn-indicator';
        ti.textContent = '⏳';
        slot.appendChild(ti);
        const lives = document.createElement('div');
        lives.className = 'slot-lives';
        const ml = p.maxLives || 3;
        const total = ml + (p.blood || 0);
        for (let j = 0; j < Math.min(total, ml + 3); j++) {
            const sp = document.createElement('span');
            if (p.isGhost) { sp.className = 'heart'; sp.textContent = '👻'; }
            else if (!p.alive) { sp.className = 'cross'; sp.textContent = '💀'; }
            else if (j < ml && j < p.poisons) { sp.className = 'cross'; sp.textContent = '❌'; }
            else if (j < ml) { sp.className = 'heart'; sp.textContent = '❤️'; }
            else if (j === ml && p.blood > 0) { sp.className = 'blood'; sp.textContent = '🩸'; }
            lives.appendChild(sp);
        }
        slot.appendChild(lives);
    });
}

function renderDiceRow() {
    const container = document.getElementById('diceContainer');
    if (!container) return;
    container.innerHTML = '';
    if (GameState.gameState !== 'betting' && GameState.gameState !== 'accusing') {
        document.getElementById('diceRow').style.display = 'none';
        return;
    }
    document.getElementById('diceRow').style.display = 'flex';
    const m = GameState.players[GameState.myUid];
    if (!m) return;
    if (m.dice && m.dice.length) {
        m.dice.forEach(d => {
            const s = document.createElement('div');
            s.className = 'die';
            s.textContent = m.blind ? '?' : getDieEmoji(parseInt(d)||1);
            if (m.frozen) s.classList.add('frozen');
            if (m.stunned) s.classList.add('stunned');
            container.appendChild(s);
        });
    }
}

function renderArtifactRow() {
    const icon = document.getElementById('artifactIcon');
    const name = document.getElementById('artifactName');
    const btn = document.getElementById('artifactInfoBtn');
    const row = document.getElementById('artifactRow');
    const m = GameState.players[GameState.myUid];
    if (!m || !m.artifact || GameState.gameState === 'lobby' || GameState.gameState === 'ended') {
        if (icon) icon.textContent = '';
        if (name) name.textContent = 'Нет артефакта';
        if (btn) btn.style.display = 'none';
        if (row) row.style.opacity = '0.5';
        return;
    }
    if (row) row.style.opacity = '1';
    if (btn) btn.style.display = 'block';
    if (icon) {
        icon.textContent = m.artifact.emoji;
        let usedClass = '';
        if (GameState.usedSpecialThisRound[m.artifact.id] && m.artifact.type === 'active') usedClass = 'used';
        icon.className = 'die special' + (m.artifact.type==='passive'?' passive':'') + (usedClass?' used':'');
        if (!GameState.usedSpecialThisRound[m.artifact.id] || m.artifact.type === 'passive') {
            icon.onclick = () => useArtifact(m.artifact.id);
        } else {
            icon.onclick = null;
        }
    }
    if (name) name.textContent = m.artifact.name;
}

function updateControls() {
    const mt = isMyTurn();
    const m = GameState.players[GameState.myUid] || {};
    const bp = document.getElementById('btnPlaceBet');
    const ba = document.getElementById('btnAccuse');
    const countUp = document.getElementById('btnBetCountUp');
    const countDown = document.getElementById('btnBetCountDown');
    const valueUp = document.getElementById('btnBetValueUp');
    const valueDown = document.getElementById('btnBetValueDown');
    const canBet = mt && !GameState.isGhost && GameState.gameState === 'betting' && !GameState.isActionInProgress;
    const canAccuse = mt && !GameState.isGhost && GameState.gameState === 'betting' && GameState.lastBet && GameState.lastBet.player !== GameState.myUid && !m.cannotAccuse && !GameState.isActionInProgress;
    if (bp) bp.disabled = !canBet;
    if (ba) ba.disabled = !canAccuse;
    if (countUp) countUp.disabled = !canBet || GameState.betCount >= 50;
    if (countDown) countDown.disabled = !canBet || GameState.betCount <= 1;
    if (valueUp) valueUp.disabled = !canBet;
    if (valueDown) valueDown.disabled = !canBet;
    if (GameState.isGhost) {
        document.getElementById('diceRow').style.display = 'none';
        document.getElementById('controlRow').style.display = 'none';
        document.getElementById('actionButtons').style.display = 'none';
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) { gp.style.display = 'flex'; updateGhostButtons(); }
    } else {
        const gp = document.getElementById('ghostAbilitiesPanel');
        if (gp) gp.style.display = 'none';
        document.getElementById('controlRow').style.display = 'grid';
        document.getElementById('actionButtons').style.display = 'grid';
    }
}

function updateBetDisplays() {
    const cd = document.getElementById('betCountDisplay');
    const vd = document.getElementById('betValueDisplay');
    if (cd) cd.textContent = GameState.betCount;
    if (vd) vd.textContent = getDieEmoji(GameState.betValue);
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

function isMyTurn() {
    if (GameState.isGhost || GameState.gameState !== 'betting') return false;
    const au = Object.keys(GameState.players).filter(u => GameState.players[u]?.alive && !GameState.players[u]?.isGhost && GameState.players[u].connected !== false);
    if (!au.length) return false;
    au.sort((a,b) => (GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0));
    if (!GameState.lastBet || !GameState.lastBet.player) return au[0] === GameState.myUid;
    const idx = au.indexOf(GameState.lastBet.player);
    return au[(idx + 1) % au.length] === GameState.myUid;
}

function markArtifactUsed(id) {
    GameState.usedSpecialThisRound[id] = true;
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { usedSpecialThisRound: GameState.usedSpecialThisRound }, 'art-used');
    GameState.pendingArtifact = null;
}

function changeBetCount(delta) {
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    const limit = 50;
    GameState.betCount = Math.max(1, Math.min(limit, GameState.betCount + delta));
    updateBetDisplays();
    updateControls();
}

function changeBetValue(delta) {
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    let newVal = GameState.betValue + delta;
    if (newVal > 6) newVal = 1;
    if (newVal < 1) newVal = 6;
    GameState.betValue = newVal;
    updateBetDisplays();
    updateControls();
}

function placeBet() {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    const c = GameState.betCount;
    const v = GameState.betValue;
    const m = GameState.players[GameState.myUid];
    if (!m) return;
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
    addLogEntry('bet', `${m.name} ставит ${c}×${getDieEmoji(v)}`);
    renderUI();
    playSound('bet');
    nextTurn();
}


function renderDiceAndBetInfo(ct) {
    const fmt = keys => keys.filter(k => ct[k] > 0).map(k =>
        `<span class="dice-item"><span class="big-die">${getDieEmoji(k)}</span><span class="dice-count">×${ct[k]}</span></span>`
    ).join(' ');
    
    const top = fmt([1,2,3]);
    const bot = fmt([4,5,6]);
    
    let html = `<div class="dice-rows">`;
    if (top) html += `<div class="dice-line">${top}</div>`;
    if (bot) html += `<div class="dice-line">${bot}</div>`;
    if (!top && !bot) html += `<div class="dice-line">Нет кубиков</div>`;
    html += `</div>`;
    
    // Добавляем информацию о ставке
    if (GameState.lastBet && GameState.players[GameState.lastBet.player]) {
        const p = GameState.players[GameState.lastBet.player];
        html += `<div class="bet-info">⚖️ Обвиняемая ставка: <strong>${p.name}</strong> — ${GameState.lastBet.count}×${getDieEmoji(GameState.lastBet.value)}</div>`;
    }
    return html;
}


function accuse() {
    if (GameState.isActionInProgress) return;
    if (GameState.gameState !== 'betting' || !isMyTurn()) return;
    if (!GameState.lastBet || GameState.lastBet.player === GameState.myUid) return;
    GameState.isActionInProgress = true;
    GameState.gameState = 'accusing';
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: { accuser: GameState.myUid, accused: GameState.lastBet.player, bet: GameState.lastBet, timestamp: Date.now() }
    }, 'accuse').finally(() => {
        GameState.isActionInProgress = false;
    });
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
    const diceHtml = renderDiceAndBetInfo(ct);
    const sum = document.getElementById('accusationDiceSummary');
    if (sum) sum.innerHTML = diceHtml;
    
    document.getElementById('accusationPanel').style.display = 'block';
    playSound('accuse');
    GameState.lastAccusationData = {
        phrase: ph?.textContent || '',
        diceSummary: sum?.innerHTML || '',
        resultText: 'Проверка...',
        resultClass: '',
        effects: ''
    };
    addLogEntry('accuse', `${GameState.myName} обвиняет ${t}!`);
    if (GameState.timers.accusation) clearTimeout(GameState.timers.accusation);
    GameState.lastAccuser = GameState.myUid;
    GameState.timers.accusation = setTimeout(() => resolveAccusation(GameState.lastBet.player), 6000);
}

function resolveAccusation(accusedUid) {
    // Получаем данные (без записи в Firebase пока)
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
    
    // Считаем эффекты и применяем их (но результат показываем через 2 секунды)
    const r = document.getElementById('accusationResult');
    const e = document.getElementById('accusationEffects');
    
    // Сохраняем данные для Firebase и для отложенного показа
    let resultText = '';
    let resultClass = '';
    
    // ПРИМЕНЯЕМ ЭФФЕКТЫ СРАЗУ (они должны примениться, даже если результат ещё не показан)
    if (isLie) {
        resultText = '✅ ЛОЖНАЯ СТАВКА!';
        resultClass = 'accusation-result effect-green';
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
        resultText = '❌ ПРАВДИВАЯ СТАВКА!';
        resultClass = 'accusation-result effect-red';
        applyPoison(GameState.myUid, 1, 'Ошибочное обвинение');
        addEffectLine(`🔴 ${GameState.myName} получает +1 яд`, e);
        if (accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
            addEffectLine(`🟢 ${accused.name} получает +1 кровь`, e);
        }
        if (accused?.darkPact) {
            const updates = {};
            updates[`players/${accusedUid}/darkPact`] = false;
            updates[`players/${accusedUid}/darkPactShield`] = true;
            updates[`players/${accusedUid}/darkPactRound`] = GameState.roundNumber + 1;
            safeUpdate(GameState.roomRef, updates, 'darkpact-resolve');
            addEffectLine(`🟡 ${accused.name}: Тёмный Договор → щит`, e);
        }
        if (wildSaved && !isLieWithoutWild) addEffectLine(`🔵 Дикий Кубик был, но ставка и так верна`, e);
    }
    
    const effectsHtml = e?.innerHTML || '';
    
    // Сохраняем результат в Firebase
    const updates = {};
    updates['accusationResult'] = { isLie, effects: effectsHtml, resultText: resultText, resultClass: resultClass };
    updates['lastAccuser'] = GameState.lastAccuser;
    safeUpdate(GameState.roomRef, updates, 'resolve-result');
    
    GameState.lastAccusationData = {
        phrase: document.getElementById('accusationPhrase')?.textContent || '',
        diceSummary: document.getElementById('accusationDiceSummary')?.innerHTML || '',
        resultText: resultText,
        resultClass: resultClass,
        effects: effectsHtml
    };
    addLogEntry('accuse', `Результат: ${resultText}`);
    
    // ПОКАЗЫВАЕМ РЕЗУЛЬТАТ через 2 секунды (чтобы игрок успел посмотреть на кубики)
    setTimeout(() => {
        if (r) { r.textContent = resultText; r.className = resultClass; }
        
        // Закрываем панель через 2.5 секунды после показа результата
        setTimeout(() => {
            document.getElementById('accusationPanel').style.display = 'none';
            GameState.gameState = 'betting';
            safeUpdate(GameState.roomRef, { state: 'betting', accusingData: null, accusationResult: null }, 'resolve-end');
            checkDeath();
            // Начинаем новый раунд через 0.5 секунды
            setTimeout(startNewRound, 500);
        }, 2500);
        
    }, 2000);
}
function addEffectLine(t, c) {
    if (c) { const d = document.createElement('div'); d.textContent = t; c.appendChild(d); }
}

function applyPoison(uid, amt, reason) {
    const p = GameState.players[uid];
    if (!p) return;
    
    // Проверка щита Тёмного Договора
    if (p.darkPactShield && p.darkPactRound === GameState.roundNumber) {
        addLogEntry('system', `${p.name} защищён ТЁМНЫМ ДОГОВОРОМ!`);
        safeUpdate(GameState.roomRef.child('players').child(uid), { darkPactShield: false }, 'dark-shield');
        return;
    }
    
    if (p.devilShield && p.devilShieldRound === GameState.roundNumber) {
        addLogEntry('system', `${p.name} защищён ЩИТОМ ДЬЯВОЛА!`);
        safeUpdate(GameState.roomRef.child('players').child(uid), { devilShield: false }, 'shield');
        return;
    }
    if (p.defenderActive) {
        addLogEntry('system', `${p.name} защищён ЗАЩИТНИКОМ!`);
        safeUpdate(GameState.roomRef.child('players').child(uid), { defenderActive: false }, 'defender');
        return;
    }

    let rem = amt;
    if (p.blood > 0) {
        const u = Math.min(p.blood, rem);
        rem -= u;
        safeUpdate(GameState.roomRef.child('players').child(uid), { blood: p.blood - u }, 'blood');
        addLogEntry('system', `${p.name} потратил ${u} крови`);
    }
    if (rem > 0) {
        safeUpdate(GameState.roomRef.child('players').child(uid), { poisons: p.poisons + rem }, 'poison');
        addLogEntry('death', `${p.name} получает +${rem} яд (${reason})`);
        playSound('poison');
        renderUI();
    }
}

function applyBlood(uid, amt) {
    const p = GameState.players[uid];
    if (!p) return;
    safeUpdate(GameState.roomRef.child('players').child(uid), { blood: (p.blood||0) + amt }, 'blood-gain');
    addLogEntry('system', `${p.name} получает +${amt} кровь!`);
    playSound('blood');
    renderUI();
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
                            artifact: null, dice: Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),
                            devilDealsUsed: (p.devilDealsUsed||0) + 1
                        };
                        safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'bot-deal-win');
                        addLogEntry('system', `${p.name} ВЫИГРАЛ сделку с Дьяволом!`);
                        playSound('devilWin');
                        playSound('resurrection');
                    } else {
                        turnToGhost(uid);
                    }
                } else {
                    if (uid === GameState.myUid) startDevilDeal(uid);
                    else addLogEntry('death', `${p.name} отправляется на Сделку с Дьяволом...`);
                }
            }
        }
    });
    const humans = Object.values(GameState.players).filter(p => p?.alive && !p.isGhost);
    if (humans.length === 1 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'victory');
        addLogEntry('system', `${humans[0].name} победил!`);
        playSound('win');
        showConfetti();
    } else if (humans.length === 0 && GameState.gameState !== 'ended') {
        GameState.gameState = 'ended';
        safeUpdate(GameState.roomRef, { state: 'ended' }, 'draw');
        addLogEntry('system', 'Ничья — все мертвы или призраки!');
    }
}

function turnToGhost(uid) {
    const updates = {
        alive: false, isGhost: true, poisons: 0, artifact: null, blood: 0,
        cursed: false, frozen: false, defenderActive: false, stunned: false, blind: false,
        devilShield: false, usedAbilities: {}, lastBetInRound: null, dice: []
    };
    safeUpdate(GameState.roomRef.child('players').child(uid), updates, 'turnToGhost');
    addLogEntry('death', `${GameState.players[uid].name} стал призраком!`);
    playSound('ghost');
    checkVengeance(uid);
    renderUI();
    if (uid === GameState.myUid) {
        document.getElementById('ghostAbilitiesPanel').style.display = 'flex';
        updateGhostButtons();
    }
}

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
        div.innerHTML = options.map(o => `<button class="devil-opt" data-id="${o.id}"><strong>${o.title}</strong><br>${o.desc}</button>`).join('');
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
        addLogEntry('death', `${GameState.myName} отказался от сделки!`);
        playSound('devilLose');
        GameState.gameState = 'betting';
        safeUpdate(GameState.roomRef, { state: 'betting' }, 'deal-refuse');
        document.getElementById('devilModal').style.display = 'none';
        setTimeout(startNewRound, 2500);
    };
    const modal = document.getElementById('devilModal');
    const closeBtn = modal?.querySelector('.close-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    const fi = document.getElementById('devilFire');
    if (fi) { fi.style.animation='none'; fi.offsetHeight; fi.style.animation='fireRise 30s linear forwards'; }
    if (modal) modal.style.display = 'block';
    playSound('devil');
    addLogEntry('death', `${GameState.myName} заключает сделку...`);
}

function resolveDevilDeal(updateData) {
    document.getElementById('devilModal').style.display = 'none';
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), updateData, 'deal-resolve');
    renderUI();
    addLogEntry('system', `${GameState.myName} ВЫИГРАЛ сделку!`);
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
                poisons: (p.maxLives||3) - 1,
                blood: 0, ghostTarget: null, artifact: null, usedAbilities: {},
                dice: Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1)
            };
            safeUpdate(GameState.roomRef.child('players').child(u), updates, 'vengeance');
            addLogEntry('death', `ПРИЗРАК ${p.name} ВОСКРЕС через МЕСТЬ!`);
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
            if (p.evilEyed) dc = dc.map(()=>Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1);
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
    au.sort((a,b)=>(GameState.players[a].joinedAt||0)-(GameState.players[b].joinedAt||0));
    
    // Если было обвинение — ход переходит к обвинителю (а не к следующему!)
    if (GameState.lastAccuser && au.includes(GameState.lastAccuser)) {
        updates.currentPlayerUid = GameState.lastAccuser;
        updates['lastAccuser'] = null;  // очищаем после использования
        GameState.lastAccuser = null;
    } else if (lastBetCopy && lastBetCopy.player) {
        // Обычный случай — ход переходит к следующему после того, кто сделал ставку
        const idx = au.indexOf(lastBetCopy.player);
        updates.currentPlayerUid = idx !== -1 ? au[(idx+1)%au.length] : au[0];
    } else {
        updates.currentPlayerUid = au[0];
    }
    GameState.currentPlayerUid = updates.currentPlayerUid;
}
    safeUpdate(GameState.roomRef, updates, 'newRound');
    addLogEntry('system', `=== РАУНД ${GameState.roundNumber} НАЧАЛСЯ! ===`);
    playSound('round');
    GameState.betCount = 1;
    GameState.betValue = 1;
    updateBetDisplays();
    updateControls();
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

function addBot() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!', 'warning');
    const cnt = Object.keys(GameState.players).filter(u => GameState.players[u]?.isBot).length;
    if (cnt >= 5) return showNotification('Максимум 5 ботов', 'warning');
    const id = 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    const data = {
        name: '🤖 Бот', uid: id, avatar: '🤖', color: '#aaa',
        wardrobe: { head: '🤖', tuxedoColor: '#444466', trimColor: '#888888' },
        dice: [], poisons: 0, blood: 0,
        alive: true, isGhost: false, artifact: null, usedSpecialThisRound: {}, lastBetInRound: null,
        devilDealsUsed: 0, connected: true, lastSeenTurn: 0, maxLives: GameState.defaultLives,
        isBot: true, botDifficulty: GameState.botDifficulty, joinedAt: Date.now(),
        cursed:false, frozen:false, defenderActive:false, stunned:false, blind:false,
        darkPact:false, darkPactShield:false, devilShield:false, evilEyed:false,
        forcedBluff:false, cannotAccuse:false, sniperShotUsedThisRound:false, familiarCursed:false, usedAbilities:{}
    };
    GameState.bots[id] = { difficulty: GameState.botDifficulty, knownDice: {} };
    safeSet(GameState.roomRef.child('players').child(id), data, 'addBot');
    addLogEntry('system', `Бот (${botDifficultyNames[GameState.botDifficulty]}) присоединился`);
}

function removeAllBots() {
    if (GameState.gameState !== 'lobby' && GameState.gameState !== 'ended') return showNotification('Только в лобби!', 'warning');
    Object.keys(GameState.players).forEach(uid => {
        if (GameState.players[uid]?.isBot) GameState.roomRef.child('players').child(uid).remove();
    });
    GameState.bots = {}; GameState.expertKnownDice = {};
    addLogEntry('system', 'Все боты удалены');
}

function setBotDifficulty(lvl) {
    GameState.botDifficulty = lvl;
    const el = document.getElementById('menuBotDifficulty');
    if (el) el.innerText = `🤖 Сложность: ${botDifficultyNames[lvl]}`;
    addLogEntry('system', `Сложность ботов: ${botDifficultyNames[lvl]}`);
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
        if (shouldAccuse) {
            const accusedPlayer = GameState.players[GameState.lastBet.player];
            if (accusedPlayer) {
                const hasDefender = accusedPlayer.artifact?.id === 'defender' && !GameState.usedSpecialThisRound['defender'];
                const hasBloodthirst = accusedPlayer.artifact?.id === 'bloodthirst';
                const hasDeceiver = accusedPlayer.artifact?.id === 'deceiver';
                if (hasDefender && Math.random() > 0.7) shouldAccuse = false;
                if (hasBloodthirst && Math.random() > 0.8) shouldAccuse = false;
                if (hasDeceiver && Math.random() > 0.75) shouldAccuse = false;
            }
        }
    }
    if (shouldAccuse && GameState.lastBet && GameState.lastBet.player !== botId) {
        accuseFromBot(botId);
        const msgs = ['Блеф!','Я знаю твои кубики!','Вскрывайся!','Слишком рискованно!'];
        if (Math.random()<0.3 && diff===3) addLogEntry('system', `${bot.name}: ${msgs[Math.floor(Math.random()*msgs.length)]}`);
        else addLogEntry('accuse', `${bot.name} обвиняет ${GameState.players[GameState.lastBet.player]?.name}!`);
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
    addLogEntry('bet', `${bot.name} ставит ${nc}×${getDieEmoji(nv)}`);
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
        addLogEntry('artifact', `${bot.name} использовал ${art.name} на ${tp.name}`);
    } else if(art.id==='fireball'||art.id==='luck') {
        const nd=bot.dice.map(()=>art.id==='luck'?(Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1):Math.floor(Math.random()*6)+1);
        safeUpdate(GameState.roomRef.child('players').child(botId), {dice:nd}, 'bot-fireball');
        addLogEntry('artifact', `${bot.name} использовал ${art.name}`);
    } else if(art.id==='blessing') {
        const tid = bt===botId ? botId : bt;
        if(tid) safeUpdate(GameState.roomRef.child('players').child(tid), {poisons:Math.max(0,GameState.players[tid].poisons-1)}, 'bot-bless');
        addLogEntry('artifact', `${bot.name} использовал ${art.name}`);
    } else if(art.id==='thief'&&bt&&GameState.players[bt].artifact) {
        const st=GameState.players[bt].artifact;
        safeUpdate(GameState.roomRef.child('players').child(botId), {artifact:st, usedSpecialThisRound:GameState.usedSpecialThisRound}, 'bot-thief');
        safeUpdate(GameState.roomRef.child('players').child(bt), {artifact:null}, 'bot-thief-v');
        addLogEntry('artifact', `${bot.name} украл ${st.emoji} у ${GameState.players[bt].name}`);
    } else if(art.id==='curse'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {cursed:true}, 'bot-curse');
        addLogEntry('artifact', `${bot.name} проклял ${GameState.players[bt].name}`);
    } else if(art.id==='ice'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {frozen:true}, 'bot-ice');
        addLogEntry('artifact', `${bot.name} заморозил ${GameState.players[bt].name}`);
    } else if(art.id==='evilEye'&&bt) {
        safeUpdate(GameState.roomRef.child('players').child(bt), {evilEyed:true}, 'bot-eye');
        addLogEntry('artifact', `${bot.name} наслал сглаз на ${GameState.players[bt].name}`);
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
        addLogEntry('artifact', `${bot.name} скопировал ставку ${GameState.players[bt].name}`);
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
            addLogEntry('system', `Призрак ${bot.name} выбрал цель: ${GameState.players[t].name}`);
        }
    } else if(ab.id==='familiarCurse') {
        const tgts=Object.keys(GameState.players).filter(u=>u!==botId&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
        if(tgts.length) {
            const t=tgts[Math.floor(Math.random()*tgts.length)];
            safeUpdate(GameState.roomRef.child('players').child(t), {familiarCursed:true}, 'bot-fam');
            addLogEntry('system', `Призрак ${bot.name} проклял ${GameState.players[t].name}`);
        }
    } else if(ab.id==='poltergeist') {
        const al=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
        if(al.length) {
            const r=Math.random();
            if(r<0.33) { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'bot-pol-s'); addLogEntry('system', `Призрак ${bot.name}: саботаж ${GameState.players[t].name}`); }
            else if(r<0.66) { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:[6,6,6,6,6],evilEyed:false}, 'bot-pol-b'); addLogEntry('system', `Призрак ${bot.name}: благословение ${GameState.players[t].name}`); }
            else { al.forEach(u=>safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'bot-pol-sh')); addLogEntry('system', `Призрак ${bot.name}: перемешивание`); }
        }
    } else if(ab.id==='soulReaper') {
        let killed=false;
        for(let uid in GameState.players) {
            const p=GameState.players[uid];
            if(p.alive&&!p.isGhost&&Math.random()<0.2) {
                const r=Math.random();
                if(r<0.1) { applyPoison(uid,1,'Жатва'); killed=true; }
                else if(r<0.35&&p.artifact) { safeUpdate(GameState.roomRef.child('players').child(uid), {artifact:null}, 'bot-rep-a'); addLogEntry('system', `${p.name}: потерял артефакт`); }
                else if(r<0.6&&p.poisons>0) { safeUpdate(GameState.roomRef.child('players').child(uid), {poisons:p.poisons-1}, 'bot-rep-h'); addLogEntry('system', `${p.name}: исцелился`); }
                else if(r<0.85) { safeUpdate(GameState.roomRef.child('players').child(uid), {stunned:true}, 'bot-rep-st'); addLogEntry('system', `${p.name}: ошеломлён`); }
                else { safeUpdate(GameState.roomRef.child('players').child(uid), {blind:true}, 'bot-rep-bl'); addLogEntry('system', `${p.name}: ослеплён`); }
            }
        }
        if(killed) {
            const up={alive:true,isGhost:false,poisons:(bot.maxLives||3)-1,blood:0,artifact:null,dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),usedAbilities:{}};
            safeUpdate(GameState.roomRef.child('players').child(botId), up, 'bot-rep-rev');
            addLogEntry('death', `Призрак ${bot.name} воскрес!`); playSound('resurrection');
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
    const bot = GameState.players[botId];
    
    GameState.gameState = 'accusing';
    safeUpdate(GameState.roomRef, {
        state: 'accusing',
        accusingData: { accuser: botId, accused: auid, bet: GameState.lastBet, timestamp: Date.now() }
    }, 'bot-accuse-start');

    const phrases = [`${bot.name} бьёт по столу: "${acc?.name || 'Цель'}, ложь!"`, `"${acc?.name || 'Цель'}, вскрывайся!" — ${bot.name}`, `${bot.name} указывает: "${acc?.name || 'Цель'}, блеф!"`, `"Не верю!" — ${bot.name}`];
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
    const diceHtml = renderDiceAndBetInfo(ct);
    const sum = document.getElementById('accusationDiceSummary');
    if (sum) sum.innerHTML = diceHtml;
    
    document.getElementById('accusationPanel').style.display = 'block';
    playSound('accuse');
    
    GameState.lastAccusationData = {
        phrase: ph?.textContent || '',
        diceSummary: sum?.innerHTML || '',
        resultText: 'Проверка...',
        resultClass: '',
        effects: ''
    };
    
    addLogEntry('accuse', `${bot.name} обвиняет ${acc?.name || 'Цель'}!`);
    
    // Считаем результат
    let tw=0;
    Object.values(GameState.players).forEach(p=>{if(p?.alive&&!p.isGhost)p.dice.forEach(d=>{if(parseInt(d)===tv)tw++;});});
    const ilw=tw<GameState.lastBet.count;
    let tot=tw; let ws=false;
    if(acc?.artifact?.id==='wildDie'){tot++;ws=true;}
    const isLieWithoutWild = tw < GameState.lastBet.count;
    let isLie=tot<GameState.lastBet.count;
    if(acc?.cursed||acc?.familiarCursed) isLie=true;

    setTimeout(() => {
        const rEl = document.getElementById('accusationResult');
        const eEl = document.getElementById('accusationEffects');
        const resultText = isLie ? '✅ ЛОЖНАЯ СТАВКА!' : '❌ ПРАВДИВАЯ СТАВКА!';
        const resultClass = isLie ? 'accusation-result effect-green' : 'accusation-result effect-red';
        if (rEl) { rEl.textContent = resultText; rEl.className = resultClass; }
        
        // === ДОБАВЛЯЕМ ЭФФЕКТЫ ===
        if(isLie) {
            applyPoison(auid,1,'Ложная (бот)');
            addEffectLine(`🔴 ${acc?.name || 'Цель'} получает +1 яд`, eEl);
            
            if(acc?.artifact?.id==='bloodthirst'){
                applyBlood(botId,1);
                applyPoison(auid,2,'Кровь (бот)');
                addEffectLine(`🟢 ${bot.name} +1 кровь | 🔴 ${acc.name} +2 яда`, eEl);
            }
            else if(acc?.artifact?.id==='deceiver') {
                applyPoison(botId,2,'Обманщик (бот)');
                addEffectLine(`🟣 ${acc.name}: Обманщик | 🔴 ${bot.name} +2 яда`, eEl);
            }
            else if(acc?.darkPact) {
                applyPoison(auid,1,'Договор (бот)');
                addEffectLine(`🟣 ${acc.name}: Тёмный Договор → +1 доп. яд`, eEl);
            }
            
            if(ws&&ilw&&!isLie) {
                applyPoison(botId,2,'Дикий (бот)');
                addEffectLine(`🔵 Дикий Кубик спас ставку! ${bot.name} +2 яда`, eEl);
            }
        } else {
            applyPoison(botId,1,'Ошибка (бот)');
            addEffectLine(`🔴 ${bot.name} получает +1 яд`, eEl);
            
            if(acc?.artifact?.id==='bloodthirst') {
                applyBlood(auid,1);
                addEffectLine(`🟢 ${acc.name} получает +1 кровь`, eEl);
            }
            if(acc?.darkPact) {
                const up={darkPact:false,darkPactShield:true,darkPactRound:GameState.roundNumber+1};
                safeUpdate(GameState.roomRef.child('players').child(auid), up, 'bot-acc-dp');
                addEffectLine(`🟡 ${acc.name}: Тёмный Договор → щит`, eEl);
            }
            if(ws && !isLieWithoutWild) addEffectLine(`🔵 Дикий Кубик был, но ставка и так верна`, eEl);
        }
        
        GameState.lastAccusationData.resultText = resultText;
        GameState.lastAccusationData.resultClass = resultClass;
        GameState.lastAccusationData.effects = eEl?.innerHTML || '';
        
        // Сохраняем в Firebase для других игроков
        const updates = {};
        updates['accusationResult'] = {
            isLie: isLie,
            effects: eEl?.innerHTML || '',
            resultText: resultText,
            resultClass: resultClass
        };
        updates['lastAccuser'] = botId;
        safeUpdate(GameState.roomRef, updates, 'bot-acc-result');
        
        // Закрываем панель через 1.5 секунды после показа результата
        setTimeout(() => {
            document.getElementById('accusationPanel').style.display = 'none';
            GameState.gameState = 'betting';
            safeUpdate(GameState.roomRef, {state:'betting', accusingData: null, accusationResult: null}, 'bot-acc-end');
            checkDeath();
            // lastAccuser уже сохранён — startNewRound использует его
            setTimeout(startNewRound, 500);
        }, 3000);
        
    }, 5000); // ← результат появляется через 5 секунд
}
function useArtifact(id) {
    if(GameState.gameState!=='betting') return;
    const m=GameState.players[GameState.myUid];
    const art=ARTIFACTS.find(a=>a.id===id);
    if(!art||(art.type==='active'&&GameState.usedSpecialThisRound[id])) return;
    if(['deceiver','double'].includes(id)&&!isMyTurn()) return showNotification('Только в свой ход!', 'warning');
    if (art.type === 'active') GameState.pendingArtifact = id;
    switch(id) {
       case 'target':
    showTargetModalFirst(Object.keys(GameState.players).filter(u =>
        u !== GameState.myUid &&
        GameState.players[u]?.alive &&
        !GameState.players[u]?.isGhost &&
        !GameState.players[u]?.frozen  // ← ДОБАВИТЬ эту строку
    ), target => {
        showNominalModal(nom => {
            const t = target;
            if (GameState.players[t].dice.length <= 1) return showNotification('Нельзя последний кубик!', 'warning');
            const i = GameState.players[t].dice.indexOf(nom);
            if (i === -1) return showNotification(`Нет кубика ${getDieEmoji(nom)}!`, 'warning');
            GameState.players[t].dice.splice(i, 1);
            safeUpdate(GameState.roomRef.child('players').child(t), { dice: GameState.players[t].dice }, 'target');
            addLogEntry('artifact', `${m.name} уничтожил ${getDieEmoji(nom)} у ${GameState.players[t].name}`);
            markArtifactUsed(id);
        });
    });
    break;
      case 'fireball': case 'luck':
    const nd = m.dice.map(d => {
        if (m.frozen) return d;
        return id === 'luck' ? (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1) : Math.floor(Math.random() * 6) + 1;
    });
    safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { dice: nd, evilEyed: false }, 'fireball');
    addLogEntry('artifact', `${m.name} использовал ${art.name}`);
    markArtifactUsed(id);
    break;
        case 'blessing':
            if(m.poisons>0) {
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {poisons:m.poisons-1}, 'bless');
                addLogEntry('artifact', `${m.name}: -1 яд`);
                markArtifactUsed(id);
            } else {
                const h=Object.keys(GameState.players).find(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&GameState.players[u]?.poisons>0);
                if(h) {
                    safeUpdate(GameState.roomRef.child('players').child(h), {poisons:GameState.players[h].poisons-1}, 'bless');
                    addLogEntry('artifact', `${m.name} вылечил ${GameState.players[h].name}`);
                    markArtifactUsed(id);
                } else {
                    showNotification('Нет раненых!', 'warning');
                    GameState.pendingArtifact = null;
                }
            } break;
        case 'thief':
    if (GameState.thiefUsedThisRound) { GameState.pendingArtifact = null; return showNotification('Вор уже использован!', 'warning'); }
    const tt = Object.keys(GameState.players).filter(u =>
        u !== GameState.myUid &&
        GameState.players[u]?.artifact &&
        GameState.players[u].artifact.type === 'active' &&
        !GameState.usedSpecialThisRound[GameState.players[u].artifact.id]
    );
    if (!tt.length) { GameState.pendingArtifact = null; return showNotification('Нечего красть!', 'warning'); }
    showTargetModal(tt, t => {
                const st=GameState.players[t].artifact;
                if(GameState.usedSpecialThisRound[st.id]) delete GameState.usedSpecialThisRound[st.id];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {artifact:st,usedSpecialThisRound:GameState.usedSpecialThisRound}, 'thief');
                safeUpdate(GameState.roomRef.child('players').child(t), {artifact:null}, 'thief-v');
                GameState.thiefUsedThisRound=true;
                addLogEntry('artifact', `${m.name} украл ${st.emoji} у ${GameState.players[t].name}`);
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
            addLogEntry('artifact', `${m.name} использовал Обманщика`);
            markArtifactUsed(id); 
            nextTurn();
            break;
        case 'clone':
            const tc=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tc.length) { GameState.pendingArtifact = null; return; }
            const cl=tc[Math.floor(Math.random()*tc.length)];
            const cd=GameState.players[cl].dice[Math.floor(Math.random()*GameState.players[cl].dice.length)];
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:[...m.dice,cd],artifact:null}, 'clone');
            addLogEntry('artifact', `${m.name} клонировал ${getDieEmoji(cd)} у ${GameState.players[cl].name}`);
            markArtifactUsed(id); break;
        case 'curse':
            const cu=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!cu.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(cu, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {cursed:true}, 'curse');
                addLogEntry('artifact', `${m.name} проклял ${GameState.players[t].name}`);
                markArtifactUsed(id);
            }); break;
        case 'spy':
if(GameState.spyMemory[GameState.myUid]&&GameState.spyMemory[GameState.myUid].value&&GameState.roundNumber===GameState.spyMemory[GameState.myUid].round) {
    const targetName = GameState.players[GameState.spyMemory[GameState.myUid].target]?.name || 'Цель';
    const emoji = getDieEmoji(GameState.spyMemory[GameState.myUid].value);
    showNotification(
        `<span style="font-size:0.9em;">Шпион: у ${targetName} есть</span> <span style="font-size:2em; vertical-align:middle;">${emoji}</span>`,
        'info', 0, true
    );
    GameState.pendingArtifact = null;
    break;
}
            const sp=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!sp.length) { GameState.pendingArtifact = null; return showNotification('Нет целей!', 'warning'); }
            showTargetModal(sp, t=>{
                const val=GameState.players[t].dice[Math.floor(Math.random()*GameState.players[t].dice.length)];
                GameState.spyMemory[GameState.myUid]={target:t,value:val,round:GameState.roundNumber};
                showNotification(`Шпион: у ${GameState.players[t].name} есть <span style="font-size:1.8em; vertical-align:middle;">${getDieEmoji(val)}</span>`, 'info', 0, true);
                addLogEntry('artifact', `${m.name} шпионит за ${GameState.players[t].name}`);
                markArtifactUsed(id);
            }); break;
        case 'ice':
            const ci=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen);
            if(!ci.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(ci, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {frozen:true}, 'ice');
                addLogEntry('artifact', `${m.name} заморозил ${GameState.players[t].name}`);
                markArtifactUsed(id);
            }); break;
       case 'analyst':
    showNominalModal(n => {
        let totalDice = 0;
        Object.values(GameState.players).forEach(p => {
            if (p?.alive && !p.isGhost) {
                totalDice += p.dice.filter(d => d === n).length;
            }
        });
        showNotification(`АНАЛИТИК: ${totalDice} кубиков ${getDieEmoji(n)} на столе`, 'info', 0, true);
        markArtifactUsed(id);
    });
    break;
       case 'double':
    if (!GameState.lastBet) { GameState.pendingArtifact = null; return showNotification('Нет ставок!', 'warning'); }
    const td = Object.keys(GameState.players).filter(u => u !== GameState.myUid && GameState.players[u]?.lastBetInRound);
    if (!td.length) { GameState.pendingArtifact = null; return showNotification('Нет ставок!', 'warning'); }
    showTargetModal(td, t => {
        const lb = GameState.players[t].lastBetInRound;
        const nb = { player: GameState.myUid, count: lb.count, value: lb.value };
        GameState.lastBet = nb;
        GameState.players[GameState.myUid].lastBetInRound = nb;
        safeUpdate(GameState.roomRef, { lastBet: nb, turnCounter: GameState.turnCounter + 1 }, 'double');
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), { lastBetInRound: nb }, 'double-p');
        GameState.turnCounter++;
        renderUI();
        addLogEntry('artifact', `${m.name} скопировал ставку ${GameState.players[t].name}`);
        markArtifactUsed(id);
        nextTurn();
    });
    break;
        case 'evilEye':
            const te=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.evilEyed);
            if(!te.length) { GameState.pendingArtifact = null; return; }
            showTargetModal(te, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {evilEyed:true}, 'eye');
                addLogEntry('artifact', `${m.name} сглазил ${GameState.players[t].name}`);
                markArtifactUsed(id);
            }); break;
        case 'sacrifice':
            if(m.poisons>=(m.maxLives||3)&&!confirm('⚠️ ВЫ УМРЁТЕ! Вы уверены?')) { GameState.pendingArtifact = null; return; }
            if(!confirm('⚠️ Вы получите +1 яд. Продолжить?')) { GameState.pendingArtifact = null; return; }
            showEffectModal(eff=>{
                applyPoison(GameState.myUid, 1, 'Жертва');
                if(eff.id==='shield') safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {devilShield:true, devilShieldRound:GameState.roundNumber}, 'sac-sh');
                else if(eff.id==='reroll') {
                    Object.keys(GameState.players).forEach(u=>{if(GameState.players[u]?.alive&&!GameState.players[u]?.isGhost&&!GameState.players[u]?.frozen)safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'sac-rr');});
                    addLogEntry('artifact', `${m.name}: переброс стола`);
                } else if(eff.id==='forceBluff') {
                    const nx=getNextPlayerUid(); if(nx) safeUpdate(GameState.roomRef.child('players').child(nx), {forcedBluff:true}, 'sac-fb');
                    addLogEntry('artifact', `${m.name}: следующий обязан повысить`);
                }
                markArtifactUsed(id);
            }); break;
        case 'circus':
    const cc = Object.keys(GameState.players).filter(u =>
        u !== GameState.myUid &&
        GameState.players[u]?.alive &&
        !GameState.players[u]?.isGhost &&
        !GameState.players[u]?.frozen && 
        GameState.players[u].dice.length >= 2 &&
        m.dice.length >= 2
    );
    if (!cc.length) { GameState.pendingArtifact = null; return showNotification('Нет целей!', 'warning'); }
    showTargetModal(cc, t => {
                let md=[...m.dice], td=[...GameState.players[t].dice];
                let mi1=Math.floor(Math.random()*md.length), mi2=Math.floor(Math.random()*md.length); while(mi2===mi1)mi2=Math.floor(Math.random()*md.length);
                let ti1=Math.floor(Math.random()*td.length), ti2=Math.floor(Math.random()*td.length); while(ti2===ti1)ti2=Math.floor(Math.random()*td.length);
                [md[mi1],td[ti1]]=[td[ti1],md[mi1]]; [md[mi2],td[ti2]]=[td[ti2],md[mi2]];
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {dice:md}, 'circ-me');
                safeUpdate(GameState.roomRef.child('players').child(t), {dice:td}, 'circ-t');
                addLogEntry('artifact', `${m.name} обменялся кубиками с ${GameState.players[t].name}`);
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
                addLogEntry('artifact', `${m.name} отстрелил все ${getDieEmoji(n)}`);
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
    const l = document.getElementById('modalNominalList');
    if (!l) return;
    l.innerHTML = '';
    l.style.display = 'grid';
    l.style.gridTemplateColumns = 'repeat(3, 1fr)';
    l.style.gap = '12px';
    l.style.maxWidth = '320px';
    l.style.margin = '0 auto';
    for (let i = 1; i <= 6; i++) {
        const b = document.createElement('button');
        b.className = 'select-item die-select';
        b.textContent = getDieEmoji(i);
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
    l.style.display = 'grid';
    l.style.gridTemplateColumns = 'repeat(3, 1fr)';
    l.style.gap = '12px';
    l.style.maxWidth = '320px';
    l.style.margin = '0 auto';
    const render = () => {
        l.innerHTML = '';
        for (let i = 1; i <= 6; i++) {
            const b = document.createElement('button');
            b.className = 'select-item die-select';
            b.textContent = getDieEmoji(i);
            if (GameState.lastBet && GameState.lastBet.value === i) {
                b.style.opacity = '0.3';
                b.style.cursor = 'not-allowed';
                b.disabled = true;
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
    const ef=[{id:'shield',name:'🛡️ Щит Дьявола'},{id:'reroll',name:'🔁 Переброс стола'},{id:'forceBluff',name:'🎭 Принудительный блеф'}];
    const l=document.getElementById('modalEffectList'); if(!l) return; l.innerHTML='';
    ef.forEach(e=>{
        const b=document.createElement('button'); b.className='select-item'; b.style.width='100%'; b.style.marginBottom='8px'; b.textContent=e.name; b.style.whiteSpace='normal'; b.style.lineHeight='1.4';
        b.onclick=()=>{cb(e);closeModal('modalEffect');}; l.appendChild(b);
    });
    document.getElementById('modalEffect').style.display='block';
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
    if (id === 'modalNominal' && dynamicNominalInterval) {
        clearInterval(dynamicNominalInterval);
        dynamicNominalInterval = null;
    }
    if (id === 'modalNominal') {
        const l = document.getElementById('modalNominalList');
        if (l) {
            l.style.display = '';
            l.style.gridTemplateColumns = '';
            l.style.gap = '';
            l.style.maxWidth = '';
        }
    }
    if (['modalTarget', 'modalNominal', 'modalEffect'].includes(id)) {
        if (GameState.pendingArtifact) {
            log(`ℹ️ Закрытие модалки без выбора: артефакт ${GameState.pendingArtifact} остаётся активным`);
            GameState.pendingArtifact = null;
        }
    }
}

function resetGame() {
   if(!confirm('⚠️ Сбросить игру?\n\nВесь прогресс будет потерян.')) return;
    GameState.gameState='lobby'; GameState.roundNumber=0; GameState.lastBet=null; GameState.currentPlayerUid=null;
    GameState.thiefUsedThisRound=false; GameState.sniperShotUsedThisRound=false; GameState.usedSpecialThisRound={};
    GameState.artifactHistory=[]; GameState.blood=0;
    GameState.gameLog = [];
    if (GameState.roomRef) {
        GameState.roomRef.child('gameLog').remove();
    }
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
    addLogEntry('system', 'Игра сброшена');
}

function copyInviteLink() {
    const link=`${window.location.origin}${window.location.pathname}?room=${GameState.currentRoomId}`;
    navigator.clipboard.writeText(link).then(()=>{showNotification('Ссылка скопирована!', 'success');addLogEntry('system', 'Ссылка скопирована');}).catch(()=>showNotification('Ошибка копирования', 'error'));
}

function saveProfile() {
    const nn=document.getElementById('profileNameInput')?.value.trim();
    if(nn&&nn!==GameState.myName){
        GameState.myName=nn; localStorage.setItem('ld_playerName', nn);
        safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {name:nn}, 'rename');
        addLogEntry('system', `Ник изменён на ${nn}`);
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
                addLogEntry('system', `[Призрак ${m.name}] выбрал цель: ${GameState.players[t].name}`);
                const ua=m.usedAbilities||{}; ua[id]=true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
            }); break;
        }
        case 'familiarCurse': {
            const tgts=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!tgts.length) return;
            showTargetModal(tgts, t=>{
                safeUpdate(GameState.roomRef.child('players').child(t), {familiarCursed:true}, 'fam');
                addLogEntry('system', `[Призрак ${m.name}] проклял ${GameState.players[t].name}`);
                const ua=m.usedAbilities||{}; ua[id]=true;
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
            }); break;
        }
        case 'poltergeist': {
            const ef=['sabotage','blessing','shuffle'];
            const ch=ef[Math.floor(Math.random()*ef.length)];
            const al=Object.keys(GameState.players).filter(u=>GameState.players[u]?.alive&&!GameState.players[u]?.isGhost);
            if(!al.length) return;
            if(ch==='sabotage') { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'pol-s'); addLogEntry('system', `[Полтергейст] САБОТАЖ: ${GameState.players[t].name}`); }
            else if(ch==='blessing') { const t=al[Math.floor(Math.random()*al.length)]; safeUpdate(GameState.roomRef.child('players').child(t), {dice:[6,6,6,6,6],evilEyed:false}, 'pol-b'); addLogEntry('system', `[Полтергейст] БЛАГОСЛОВЕНИЕ: ${GameState.players[t].name}`); }
            else { al.forEach(u=>safeUpdate(GameState.roomRef.child('players').child(u), {dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),evilEyed:false}, 'pol-sh')); addLogEntry('system', `[Полтергейст] ПЕРЕМЕШИВАНИЕ`); }
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
                        d.innerHTML=`<strong style="color:#ffd700">${escapeHtml(p.name)}</strong>: <span style="font-size:2.5em">${p.dice.map(d=>getDieEmoji(parseInt(d)||1)).join(' ')}</span>`;
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
                    else if(ef==='loseArtifact'&&p.artifact){safeUpdate(GameState.roomRef.child('players').child(uid),{artifact:null},'rep-a');addLogEntry('system', `${p.name}: потерял артефакт`);}
                    else if(ef==='heal'&&p.poisons>0){safeUpdate(GameState.roomRef.child('players').child(uid),{poisons:p.poisons-1},'rep-h');addLogEntry('system', `${p.name}: исцелился`);}
                    else if(ef==='stun'){safeUpdate(GameState.roomRef.child('players').child(uid),{stunned:true},'rep-st');addLogEntry('system', `${p.name}: ошеломлён`);}
                    else{safeUpdate(GameState.roomRef.child('players').child(uid),{blind:true},'rep-bl');addLogEntry('system', `${p.name}: ослеплён`);}
                }
            });
            if(killed) {
                const up={alive:true,isGhost:false,poisons:(m.maxLives||3)-1,blood:0,artifact:null,dice:Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),usedAbilities:{}};
                safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), up, 'rep-rev');
                addLogEntry('death', `[Призрак ${m.name}] ВОСКРЕС через Жатву!`); playSound('resurrection');
            }
            const ua=m.usedAbilities||{}; ua[id]=true;
            safeUpdate(GameState.roomRef.child('players').child(GameState.myUid), {usedAbilities:ua}, 'ghost-ab');
            break;
        }
    }
    playSound('ghost');
}

function startVoteKick() {
    if(Date.now()-GameState.lastVoteEndTime<VOTE_COOLDOWN) return showNotification(`Голосование через ${Math.ceil((VOTE_COOLDOWN-(Date.now()-GameState.lastVoteEndTime))/1000)} сек`, 'warning');
    const tg=Object.keys(GameState.players).filter(u=>u!==GameState.myUid&&GameState.players[u]?.alive);
    if(!tg.length) return showNotification('Нет целей!', 'warning');
    const ld=document.getElementById('voteTargetsList'); if(!ld) return;
    ld.innerHTML='';
    tg.forEach(u=>{
        const p=GameState.players[u]; if(!p||!p.name) return;
        const b=document.createElement('button'); b.className='select-item'; b.textContent=p.name+(p.isGhost?' ':'');
        b.onclick=()=>{
            const startTime = Date.now();
            safeSet(GameState.roomRef.child('activeVote'), {
                target: u,
                targetName: p.name,
                initiator: GameState.myUid,
                startTime: startTime,
                duration: 30,
                votes: {}
            }, 'vote-start');
            openVoteModal(u, p.name, startTime);
        };
        ld.appendChild(b);
    });
    document.getElementById('modalVoteTargets').style.display='block';
}

function openVoteModal(targetUid, targetName, startTime) {
    GameState.currentVoteTarget = targetUid;
    const tn=document.getElementById('voteTargetName'); if(tn) tn.textContent=targetName;
    const rd=document.getElementById('voteResult'); if(rd) rd.textContent='';
    document.getElementById('modalVote').style.display='block';
    if(GameState.timers.vote) clearInterval(GameState.timers.vote);
    const el=document.getElementById('voteTimer');
    GameState.timers.vote=setInterval(()=>{
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = 30 - elapsed;
        if(el) el.textContent = Math.max(0, remaining);
        if(remaining <= 0){
            clearInterval(GameState.timers.vote);
            GameState.timers.vote=null;
            resolveVote(targetUid);
        }
    },1000);
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
    safeSet(GameState.roomRef.child('activeVote').child('votes').child(GameState.myUid), v, 'vote-cast');
    showNotification(`Голос: ${v==='yes'?'ЗА':'ПРОТИВ'}`, 'info');
}

function updateVoteUI(vd) {
    if(!vd) return;
    const y = Object.values(vd.votes || {}).filter(v => v === 'yes').length;
    const n = Object.values(vd.votes || {}).filter(v => v === 'no').length;
    const rd = document.getElementById('voteResult');
    if (rd) rd.textContent = `✅ ЗА: ${y} | ❌ ПРОТИВ: ${n}`;
}

function resolveVote(tu) {
    document.getElementById('modalVote').style.display='none';
    GameState.roomRef.child('activeVote').once('value', s => {
        const vd = s.val();
        if (!vd) return;
        const votes = vd.votes || {};
        let y = 0, n = 0;
        Object.values(votes).forEach(v => { if(v === 'yes') y++; if(v === 'no') n++; });
        const tot = y + n;
        const kicked = tot > 0 && y > tot / 2;
        if (kicked && GameState.players[tu]) {
            GameState.roomRef.child('players').child(tu).remove();
            addLogEntry('system', `${GameState.players[tu].name} исключён! (ЗА:${y} ПРОТИВ:${n})`);
        } else if (GameState.players[tu]) {
            addLogEntry('system', `${GameState.players[tu]?.name || 'Игрок'} остался! (ЗА:${y} ПРОТИВ:${n})`);
        }
        GameState.roomRef.child('activeVote').remove();
        GameState.lastVoteEndTime = Date.now();
        GameState.currentVoteTarget = null;
    });
}

function bindEventListeners() {
    const hm=document.getElementById('hamburgerBtn'), dd=document.getElementById('dropdownMenu');
    if(hm) hm.onclick=()=>{if(dd)dd.style.display=dd.style.display==='block'?'none':'block';if(audioContext&&audioContext.state==='suspended')audioContext.resume();};
    document.addEventListener('click', e=>{if(hm&&dd&&!hm.contains(e.target)&&!dd.contains(e.target)&&dd.style.display==='block')dd.style.display='none';});
    document.getElementById('menuRules')?.addEventListener('click', ()=>{document.getElementById('modalRules').style.display='block';if(dd)dd.style.display='none';});
    document.getElementById('menuProfile')?.addEventListener('click', ()=>{
        const ni=document.getElementById('profileNameInput'); if(ni)ni.value=GameState.myName;
        const ui=document.getElementById('profileUid'); if(ui)ui.textContent=GameState.myUid;
        const si=document.getElementById('profileStatus'); if(si){si.textContent=GameState.isGhost?'Призрак':'Жив';si.style.color=GameState.isGhost?'#cc00ff':'#00ff88';}
        document.getElementById('modalProfile').style.display='block'; if(dd)dd.style.display='none';
    });
    document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
    document.getElementById('menuInvite')?.addEventListener('click', ()=>{copyInviteLink();if(dd)dd.style.display='none';});
    document.getElementById('menuNewRoom')?.addEventListener('click', ()=>{if(confirm('Новая комната?')){if(GameState.roomRef)GameState.roomRef.child('players').child(GameState.myUid).onDisconnect().cancel();clearAllTimers();newRoom();if(dd)dd.style.display='none';}});
    document.getElementById('menuKick')?.addEventListener('click', ()=>{startVoteKick();if(dd)dd.style.display='none';});
    document.getElementById('menuSound')?.addEventListener('click', ()=>{GameState.soundEnabled=!GameState.soundEnabled;document.getElementById('menuSound').textContent=GameState.soundEnabled?'🔊 Звук: ВКЛ':'🔇 Звук: ВЫКЛ';if(dd)dd.style.display='none';});
    document.getElementById('menuArtifacts')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');GameState.specialDiceEnabled=!GameState.specialDiceEnabled;document.getElementById('menuArtifacts').textContent=`🎲 Артефакты: ${GameState.specialDiceEnabled?'✅':'❌'}`;safeUpdate(GameState.roomRef.child('settings'), {specialDiceEnabled:GameState.specialDiceEnabled}, 'toggle-art');});
    document.getElementById('menuLives')?.addEventListener('click', ()=>{if(GameState.gameState!=='lobby')return showNotification('Только в лобби!', 'warning');const o=[3,4,5,6,2];GameState.defaultLives=o[(o.indexOf(GameState.defaultLives)+1)%o.length];document.getElementById('menuLives').textContent=`❤️ Жизни: ${GameState.defaultLives}`;safeUpdate(GameState.roomRef.child('settings'), {defaultLives:GameState.defaultLives}, 'toggle-lives');Object.keys(GameState.players).forEach(uid=>{
        if(GameState.players[uid]){
            safeUpdate(GameState.roomRef.child('players').child(uid), {maxLives:GameState.defaultLives}, 'upd-lives');
        }
    });});
    document.getElementById('btnStartGame')?.addEventListener('click', ()=>{
        if (GameState.isActionInProgress) return;
        if(GameState.gameState!=='lobby')return showNotification('Игра уже идёт!', 'warning');
        const ac=Object.keys(GameState.players).filter(u=>GameState.players[u]&&GameState.players[u].alive&&!GameState.players[u].isGhost&&!GameState.players[u].isBot).length;
        const bc=Object.keys(GameState.players).filter(u=>GameState.players[u]&&GameState.players[u].isBot).length;
        if((ac>=1&&bc>=1)||ac>=2) {
            GameState.isActionInProgress = true;
            startNewRound().finally(() => {
                GameState.isActionInProgress = false;
                updateControls();
                updateBetDisplays();
            });
        }
        else showNotification('Нужен 1 игрок + 1 бот или 2 игрока', 'warning');
        if(dd)dd.style.display='none';
    });
    document.getElementById('btnResetGame')?.addEventListener('click', resetGame);
    document.getElementById('btnPlaceBet')?.addEventListener('click', placeBet);
    document.getElementById('btnAccuse')?.addEventListener('click', accuse);
    document.getElementById('btnBetCountUp')?.addEventListener('click', ()=>changeBetCount(1));
    document.getElementById('btnBetCountDown')?.addEventListener('click', ()=>changeBetCount(-1));
    document.getElementById('btnBetValueUp')?.addEventListener('click', ()=>changeBetValue(1));
    document.getElementById('btnBetValueDown')?.addEventListener('click', ()=>changeBetValue(-1));
    document.getElementById('quickEmojiBtn')?.addEventListener('click', openQuickEmoji);
    document.getElementById('tauntBtn')?.addEventListener('click', openTaunt);
    document.querySelectorAll('.mood-btn').forEach(b=>{
        b.addEventListener('click', ()=>selectTauntMood(b.dataset.mood));
    });
    document.getElementById('btnLog')?.addEventListener('click', ()=>{
        renderLog('all');
        document.getElementById('modalLog').style.display='block';
    });
    document.getElementById('btnCheck')?.addEventListener('click', showLastCheck);
    document.querySelectorAll('.filter-btn').forEach(b=>{
        b.addEventListener('click', ()=>{
            document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
            b.classList.add('active');
            renderLog(b.dataset.filter);
        });
    });
    document.getElementById('artifactInfoBtn')?.addEventListener('click', ()=>{
        const m=GameState.players[GameState.myUid];
        if(m?.artifact) showArtifactInfo(m.artifact);
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
        if(m && m.id === 'devilModal') return;
        if(m)m.style.display='none';
        if(m?.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
    }));
    window.addEventListener('click', e=>{
        if(e.target.classList.contains('modal')){
            if(e.target.id === 'devilModal') return;
            e.target.style.display='none';
            if(e.target.id==='modalNominal'&&dynamicNominalInterval){clearInterval(dynamicNominalInterval);dynamicNominalInterval=null;}
        }
    });
    document.getElementById('accusationCloseBtn')?.addEventListener('click', ()=>{
        document.getElementById('accusationPanel').style.display='none';
    });
    document.getElementById('notifyOkBtn')?.addEventListener('click', ()=>{
        document.getElementById('modalNotify').style.display='none';
    });
    document.getElementById('menuMyLook')?.addEventListener('click', ()=>{openWardrobe();if(dd)dd.style.display='none';});
    document.getElementById('btnSaveWardrobe')?.addEventListener('click', saveWardrobe);
    document.getElementById('menuBotAdd')?.addEventListener('click', ()=>{addBot();});
    document.getElementById('menuBotRemoveAll')?.addEventListener('click', ()=>{removeAllBots();});
    document.getElementById('menuBotDifficulty')?.addEventListener('click', e=>{e.stopPropagation();setBotDifficulty((GameState.botDifficulty+1)%4);});
    window.addEventListener('beforeunload', clearAllTimers);
    
window.onload = () => {
    const params=new URLSearchParams(window.location.search);
    let room=params.get('room');
    let name=localStorage.getItem('ld_playerName');
    if(!name){name=prompt('Введите имя:', 'Игрок'+Math.floor(Math.random()*900+100));if(!name)name='Игрок';localStorage.setItem('ld_playerName', name);}
    GameState.myName=name;
    GameState.myAvatar=localStorage.getItem('ld_avatar')||'🎲';
    GameState.myColor=localStorage.getItem('ld_color')||'#ffffff';
    loadWardrobe();
    if(!room){
        const saved=localStorage.getItem('ld_lastRoom');
        if(saved&&confirm(`Вернуться в ${saved}?`)) room=saved;
    }
    if(room){GameState.currentRoomId=room;document.getElementById('roomIdDisplay').textContent='ROOM: '+room;enterRoom(room);}
    else createRoom();
    setupAudioContext();
    bindEventListeners();
    log('🎮 BLXRRXDXCX 3.0 BX BLXRRXGXMXS');
};

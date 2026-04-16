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

let roomRef = null;
let myUid = '';
let myName = '';
let myAvatar = '🎲';
let myColor = '#ffffff';
let currentRoomId = '';
let players = {};
let gameState = 'lobby';
let lastBet = null;
let roundNumber = 0;
let isGhost = false;
let currentPlayerUid = null;
let defaultLives = 3;
let specialDiceEnabled = true;
let soundEnabled = true;
let audioContext = null;
let usedSpecialThisRound = {};
let artifactHistory = [];
let spyMemory = {};
let botDifficulty = 2;
let botDifficultyNames = ['Легкий', 'Средний', 'Сложный', 'Эксперт'];
let bots = {};
let isBotThinking = false;
let thiefUsedThisRound = false;
let sniperShotUsedThisRound = false;
let blood = 0;
let devilDealsUsed = 0;
let ghostTarget = null;
let accusationTimer = null;
let devilDealTimer = null;
let voteTimerInterval = null;
let currentVoteTarget = null;
let lastVoteEndTime = 0;
let turnCounter = 0;
let isHost = false;
const VOTE_COOLDOWN = 120000;
const AVATARS = ['🎲', '🎭', '👻', '🤖', '🧙', '🧝', '🧛', '🧟', '🐉', '🦄', '🌟', '🔥', '💀', '👑', '🎯', '🧿', '🕵️', '🧪', '🛡️', '🔫'];
const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#88ff00', '#ff0088', '#0088ff', '#ffffff', '#cccccc', '#ffaa88', '#88ffaa', '#aa88ff', '#ff8888', '#88ff88', '#8888ff', '#ffaa00', '#00ffaa'];

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
    {id:'double',emoji:'🎭',name:'ДВОЙНИК',type:'active',description:'Копирует последнюю ставку выбранного игрока',hidden:false},
    {id:'evilEye',emoji:'🧿',name:'СГЛАЗ',type:'active',description:'Накладывает невезение на кубики цели (70% на 1-3)',hidden:true},
    {id:'wildDie',emoji:'🎲',name:'ДИКИЙ КУБИК',type:'passive',description:'Считается любым номиналом при подсчёте ставки владельца',hidden:true},
    {id:'sacrifice',emoji:'💀',name:'ЖЕРТВОПРИНОШЕНИЕ',type:'active',description:'+1 яд ради мощного эффекта на выбор',hidden:true},
    {id:'circus',emoji:'🎪',name:'ЦИРКАЧ',type:'active',description:'Обмен 2 кубиками с целью (требуется ≥2 кубиков у обоих)',hidden:true},
    {id:'darkPact',emoji:'🌑',name:'ТЁМНЫЙ ДОГОВОР',type:'passive',description:'Текущий раунд: +2 яда при обвинении. Следующий: щит на раунд',hidden:true},
    {id:'sniper',emoji:'🔫',name:'ОТСТРЕЛ',type:'active',description:'Уничтожает все кубики номинала у всех (кроме замороженных, нельзя на текущую ставку). После использования нельзя обвинять',hidden:true}
];

const GHOST_ABILITIES = [
    {id:'oathOfVengeance',emoji:'⚔️',name:'Месть',type:'active',limit:'once_per_ghost',description:'Выберите цель. Если она умрёт — вы воскреснете'},
    {id:'familiarCurse',emoji:'🔮',name:'Проклятие Фамильяра',type:'active',limit:'once_per_ghost',description:'Следующая ставка цели автоматически ложная (до конца раунда)'},
    {id:'poltergeist',emoji:'🌀',name:'Полтергейст',type:'active',limit:'once_per_ghost',description:'Случайный эффект: саботаж/благословение/перемешивание'},
    {id:'keeperOfSecrets',emoji:'👁️',name:'Хранитель Тайн',type:'active',limit:'unlimited',description:'Видите кубики всех живых игроков'},
    {id:'soulReaper',emoji:'💀',name:'Жатва Душ',type:'active',limit:'once_per_ghost',description:'20% шанс эффекта на каждого живого. При убийстве — воскрешение'}
];

function getDieEmoji(v) { const val = parseInt(v)||1; return ['?','⚀','⚁','⚂','⚃','⚄','⚅'][val]||'⚀'; }

function showNotification(msg, type='info') {
    const tt={error:'❌ Ошибка',warning:'⚠️ Внимание',success:'✅ Успех',info:'ℹ️ Инфо'};
    const title=document.getElementById('notifyTitle');
    const message=document.getElementById('notifyMessage');
    const modal=document.getElementById('modalNotify');
    if(title && message && modal) {
        title.textContent=tt[type]||'ℹ️ Уведомление';
        message.textContent=msg;
        modal.style.display='block';
    } else { alert(msg); }
}

function appendChat(msg, t='normal', senderColor='#ffffff', senderAvatar='') {
    const e=document.createElement('div');
    e.className=`chat-msg msg-${t}`;
    if(t === 'normal' && senderColor) {
        e.style.color = senderColor;
    }
    if(senderAvatar) {
        e.innerHTML = `${senderAvatar} <span style="color:${senderColor}">${msg.split(':')[0]}</span>:${msg.split(':').slice(1).join(':')}`;
    } else {
        e.textContent = msg;
    }
    const log=document.getElementById('chatLog');
    if(log) {
        log.insertBefore(e,log.firstChild);
        if(log.children.length>60) log.removeChild(log.lastChild);
    }
}

function playSound(type) {
    if(!soundEnabled||!audioContext) return;
    try{
        const o=audioContext.createOscillator(),g=audioContext.createGain();
        o.connect(g); g.connect(audioContext.destination);
        const n=audioContext.currentTime;
        const p={bet:[440,220,0.1,'square'],accuse:[880,440,0.3,'sawtooth'],poison:[300,150,0.2,'sine'],death:[220,110,0.5,'sine'],devil:[150,100,0.4,'sawtooth'],devilWin:[440,880,0.3,'square'],devilLose:[200,100,0.4,'sawtooth'],ghost:[660,880,0.3,'sine'],resurrection:[330,990,0.6,'sine'],artifact:[523,784,0.2,'square'],round:[440,880,0.3,'square'],blood:[392,523,0.2,'sine'],win:[523,659,784,1046,0.8,'square']}[type]||[440,220,0.1,'sine'];
        if(type==='win'){
            p.forEach((f,i)=>{
                const oc=audioContext.createOscillator(),gc=audioContext.createGain();
                oc.connect(gc); gc.connect(audioContext.destination);
                oc.frequency.value=f; oc.type='square';
                gc.gain.setValueAtTime(0.2,n+i*0.1);
                gc.gain.exponentialRampToValueAtTime(0.01,n+i*0.1+0.3);
                oc.start(n+i*0.1); oc.stop(n+i*0.1+0.3);
            });
        }else{
            o.frequency.setValueAtTime(p[0],n);
            o.frequency.exponentialRampToValueAtTime(p[1],n+p[2]);
            o.type=p[3];
            g.gain.setValueAtTime(0.2,n);
            g.gain.exponentialRampToValueAtTime(0.01,n+p[2]);
            o.start(n); o.stop(n+p[2]);
        }
    }catch(e){}
}

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for(let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function createRoom() {
    const roomId = generateRoomId();
    currentRoomId = roomId;
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    document.getElementById('roomIdDisplay').textContent = roomId;
    roomRef = db.ref('rooms/' + roomId);
    roomRef.set({
        players: {},
        state: 'lobby',
        round: 0,
        lastBet: null,
        settings: { specialDiceEnabled: true, defaultLives: 3 },
        artifactHistory: [],
        turnCounter: 0,
        createdAt: Date.now()
    }).then(() => {
        enterRoom(roomId);
    }).catch(e => console.error(e));
}

function newRoom() {
    if(roomRef) {
        roomRef.child('players').child(myUid).onDisconnect().cancel();
        roomRef = null;
    }
    createRoom();
}

function enterRoom(roomId) {
    currentRoomId = roomId;
    roomRef = db.ref('rooms/' + roomId);
    const savedUid = localStorage.getItem('ld_myUid');
    const savedName = localStorage.getItem('ld_playerName');
    const savedAvatar = localStorage.getItem('ld_avatar');
    const savedColor = localStorage.getItem('ld_color');
    if(savedUid && savedName && players[savedUid] === undefined) {
        myUid = savedUid;
        myName = savedName;
        myAvatar = savedAvatar || '🎲';
        myColor = savedColor || '#ffffff';
    } else {
        myUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        myName = localStorage.getItem('ld_playerName') || 'Игрок';
        myAvatar = localStorage.getItem('ld_avatar') || '🎲';
        myColor = localStorage.getItem('ld_color') || '#ffffff';
        localStorage.setItem('ld_myUid', myUid);
        // Сброс временных данных при входе в новую комнату
blood = 0;
devilDealsUsed = 0;
isGhost = false;
usedSpecialThisRound = {};
thiefUsedThisRound = false;
sniperShotUsedThisRound = false;
    }
    isHost = true;
    const playerData = {
        name: myName,
        uid: myUid,
        avatar: myAvatar,
        color: myColor,
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
        maxLives: defaultLives
    };
    roomRef.child('players').child(myUid).set(playerData);
    roomRef.child('players').child(myUid).onDisconnect().update({ connected: false });
    setTimeout(() => {
        roomRef.child('players').child(myUid).update({ connected: true });
    }, 1000);
    setupRoomListeners();
    appendChat(`🎉 ${myName} вошёл в комнату ${roomId}`, 'system');
}

function setupRoomListeners() {
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if(!data) return;
        const hasPlayers = Object.values(data.players || {}).some(p => p?.connected === true);
        if(!hasPlayers && gameState !== 'lobby') {
            roomRef.update({ state: 'lobby', round: 0, lastBet: null, artifactHistory: [] });
            appendChat('🔄 Комната сброшена (все игроки вышли)', 'system');
        }
        players = data.players || {};
        gameState = data.state || 'lobby';
        // Открываем/закрываем панель обвинения для всех игроков
        // Синхронизируем настройки жизней из Firebase
if(data.settings && data.settings.defaultLives) {
    defaultLives = data.settings.defaultLives;
    const menuLives = document.getElementById('menuLives');
    if(menuLives) menuLives.textContent = `❤️ Жизни: ${defaultLives}`;
}
        
if(gameState === 'accusing') {
    const panel = document.getElementById('accusationPanel');
    if(panel) panel.style.display = 'block';
    
    // Получаем данные обвинения из Firebase
    const accusingData = data.accusingData;
    if(accusingData && lastBet) {
        const accused = players[accusingData.accused];
        const phraseEl = document.getElementById('accusationPhrase');
        if(phraseEl && accused) {
            phraseEl.textContent = `${accused.name} обвинён в блефе! Проверка...`;
        }
        // Показываем кубики на столе
        let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
        Object.values(players).forEach(p => {
            if(p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d) || 1]++);
        });
        const sm = Object.keys(ct).filter(k => ct[k] > 0).map(k => `${ct[k]}x${getDieEmoji(k)}`).join('  ');
        const summaryEl = document.getElementById('accusationDiceSummary');
        if(summaryEl) summaryEl.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;
    }
    
    // Показываем результаты, если они уже есть
    const accusationResult = data.accusationResult;
    if(accusationResult) {
        const resultEl = document.getElementById('accusationResult');
        const effectsEl = document.getElementById('accusationEffects');
        if(resultEl) {
            resultEl.textContent = accusationResult.resultText;
            resultEl.className = accusationResult.resultClass;
        }
        if(effectsEl && accusationResult.effects) {
            effectsEl.innerHTML = accusationResult.effects;
        }
    }
} else {
    // Если состояние не 'accusing' — скрываем панель
    const panel = document.getElementById('accusationPanel');
    if(panel && panel.style.display === 'block') {
        panel.style.display = 'none';
    }
}
        lastBet = data.lastBet || null;
        roundNumber = data.round || 0;
        artifactHistory = data.artifactHistory || [];
        turnCounter = data.turnCounter || 0;
        const me = players[myUid];
        if(me && me.connected === false && me.alive && !me.isGhost) {
            const turnsMissed = turnCounter - (me.lastSeenTurn || 0);
            if(turnsMissed >= 2) {
                appendChat(`👻 Вы пропустили 2 хода и стали призраком`, 'death');
                roomRef.child('players').child(myUid).update({ isGhost: true, alive: false, dice: [] });
            } else {
                appendChat(`✅ Вы вернулись в игру!`, 'system');
                roomRef.child('players').child(myUid).update({ connected: true });
            }
        }
        renderUI();
        if(gameState === 'betting' && currentPlayerUid && players[currentPlayerUid]?.isBot && currentPlayerUid !== myUid && !isBotThinking) {
            botTurn(currentPlayerUid);
        }
    });
    roomRef.child('chat').limitToLast(60).on('child_added', (s) => {
        const msg = s.val();
        if(msg && msg.sender !== myName) {
            const player = Object.values(players).find(p => p.name === msg.sender);
            const color = player?.color || '#ffffff';
            const avatar = player?.avatar || '';
            appendChat(`${msg.sender}: ${msg.text}`, msg.type || 'normal', color, avatar);
        } else if(msg && msg.sender === myName) {
            appendChat(`${msg.sender}: ${msg.text}`, msg.type || 'normal', myColor, myAvatar);
        }
    });
roomRef.child('votes').on('value', (s) => {
    const votes = s.val();
    if(votes && currentVoteTarget && votes[currentVoteTarget]) {
        updateVoteUI(votes[currentVoteTarget]);
    }
});    
}

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
    if(!statusEl) return;
    switch(gameState){
        case'lobby': statusEl.textContent='Лобби'; break;
        case'betting': statusEl.textContent=`Раунд ${roundNumber} | Ход: ${cp}`; break;
        case'accusing': statusEl.textContent='⚖️ Проверка ставки'; break;
        case'devil_deal': statusEl.textContent='😈 Сделка с Дьяволом'; break;
        case'ended': const w=Object.values(players).find(p=>p?.alive&&!p.isGhost); statusEl.textContent=w?`🏆 ${w.name} победил!`:'Ничья'; break;
    }
}

function getCurrentPlayerName() {
    const u = getCurrentPlayerUid();
    return u && players[u] ? players[u].name : '—';
}

function getCurrentPlayerUid() {
    const au = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
    if(!au.length) return null;
    const li = au.indexOf(lastBet?.player);
    return au[(li + 1) % au.length];
}

function updateLastBetDisplay() {
    const displayEl = document.getElementById('lastBetDisplay');
    if(!displayEl) return;
    if(lastBet && players[lastBet.player]) {
        const p = players[lastBet.player];
        displayEl.textContent = `${p.name}: ${lastBet.count}×${getDieEmoji(lastBet.value)}`;
    } else {
        displayEl.textContent = 'Последняя ставка: —';
    }
}

function renderPlayerList() {
    const container = document.getElementById('playerList');
    if(!container) return;
    container.innerHTML = '';
    const cu = getCurrentPlayerUid();
    Object.keys(players).forEach(uid => {
        const p = players[uid];
        if(!p) return;
        const c = document.createElement('div');
        c.className = 'player-card no-select';
        if(uid === cu && gameState === 'betting' && !p.isGhost) c.classList.add('active');
        if(p.frozen) c.classList.add('frozen');
        if(p.cursed || p.evilEyed) c.classList.add('cursed');
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
        if(p.isGhost) {
            const ghostSpan = document.createElement('span');
            ghostSpan.textContent = ' 👻';
            n.appendChild(ghostSpan);
        }
        i.appendChild(n);
        const s = document.createElement('span');
        s.className = 'sands-of-time';
        s.textContent = '⏳';
        if(uid === cu && gameState === 'betting' && !p.isGhost) s.style.display = 'inline';
        i.appendChild(s);
        const pd = document.createElement('div');
        pd.className = 'player-poisons';
        if(gameState !== 'lobby') {
            const ml = p.maxLives || 3;
            const ts = ml + (p.blood || 0);
            for(let j = 0; j < ts; j++) {
                const sp = document.createElement('span');
                if(p.isGhost) {
                    sp.className = 'icon-ghost';
                    sp.textContent = '👻';
                } else if(!p.alive) {
                    sp.className = 'icon-dead';
                    sp.textContent = '💀';
                } else if(j < ml && j < p.poisons) {
                    sp.className = 'icon-poison';
                    sp.textContent = '🫙';
                } else if(j === ml && p.blood > 0) {
                    sp.className = 'icon-blood';
                    sp.textContent = '🩸';
                } else {
                    sp.className = 'icon-life';
                    sp.textContent = '🧪';
                }
                pd.appendChild(sp);
            }
        }
        const bs = document.createElement('span');
        bs.className = 'player-last-bet';
        bs.textContent = p.lastBetInRound ? `${p.lastBetInRound.count}×${getDieEmoji(p.lastBetInRound.value)}` : '—';
        c.appendChild(i);
        c.appendChild(pd);
        container.appendChild(c);
    });
}

function renderDiceRow() {
    const container = document.getElementById('diceContainer');
    if(!container) return;
    container.innerHTML = '';
    if(gameState !== 'betting' && gameState !== 'accusing') {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    const m = players[myUid];
    if(!m) return;
    if(m.artifact) {
        const a = document.createElement('div');
        let usedClass = '';
        if(usedSpecialThisRound[m.artifact.id] && m.artifact.type === 'active') usedClass = 'used';
        else if(m.artifact.type === 'passive' && m.artifactUsed) usedClass = 'used';
        a.className = `die special ${m.artifact.type === 'passive' ? 'passive' : ''} ${usedClass}`;
        a.textContent = m.artifact.emoji;
        const infoBtn = document.createElement('div');
        infoBtn.className = 'artifact-info-btn';
        infoBtn.textContent = '?';
        infoBtn.onclick = () => showArtifactInfo(m.artifact);
        container.appendChild(infoBtn);
        container.appendChild(a);
        if(!usedSpecialThisRound[m.artifact.id] || m.artifact.type === 'passive') {
            a.onclick = () => useArtifact(m.artifact.id);
        }
    }
    if(m.dice && m.dice.length) {
        m.dice.forEach(d => {
            const s = document.createElement('div');
            s.className = 'die';
            if(m.blind) {
                s.textContent = '?';
            } else {
                const val = parseInt(d) || 1;
                s.textContent = getDieEmoji(val);
            }
            if(m.frozen) s.classList.add('frozen');
            if(m.stunned) s.classList.add('stunned');
            container.appendChild(s);
        });
    }
}

function showArtifactInfo(art) {
    const title = document.getElementById('artifactInfoTitle');
    const desc = document.getElementById('artifactInfoDesc');
    if(title && desc) {
        title.textContent = `${art.emoji} ${art.name}`;
        desc.innerHTML = `<strong>Тип:</strong> ${art.type === 'active' ? 'Активный (1 раз за раунд)' : 'Пассивный (автоматически)'}<br><br><strong>Описание:</strong> ${art.description}`;
        document.getElementById('modalArtifactInfo').style.display = 'block';
    }
}

function updateControls() {
    const mt = isMyTurn();
    const m = players[myUid] || {};
    const betCount = document.getElementById('betCount');
    const betValue = document.getElementById('betValue');
    const btnPlaceBet = document.getElementById('btnPlaceBet');
    const btnAccuse = document.getElementById('btnAccuse');
    if(betCount) betCount.disabled = !mt || isGhost;
    if(betValue) betValue.disabled = !mt || isGhost;
    if(btnPlaceBet) btnPlaceBet.disabled = !mt || isGhost || gameState !== 'betting';
    if(btnAccuse) btnAccuse.disabled = !mt || isGhost || gameState !== 'betting' || !lastBet || lastBet.player === myUid || m.cannotAccuse;
    const cc = !isGhost && gameState !== 'devil_deal';
    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    if(chatInput) chatInput.disabled = !cc;
    if(btnSendChat) btnSendChat.disabled = !cc;
    if(isGhost) {
        const diceContainer = document.getElementById('diceContainer');
        const controlsRow = document.getElementById('controlsRow');
        const ghostPanel = document.getElementById('ghostAbilitiesPanel');
        if(diceContainer) diceContainer.style.display = 'none';
        if(controlsRow) controlsRow.style.display = 'none';
        if(ghostPanel) ghostPanel.style.display = 'flex';
        updateGhostButtons();
    } else {
        const ghostPanel = document.getElementById('ghostAbilitiesPanel');
        const controlsRow = document.getElementById('controlsRow');
        if(ghostPanel) ghostPanel.style.display = 'none';
        if(controlsRow) controlsRow.style.display = 'flex';
        if(mt && !isGhost && gameState === 'betting') populateBetSelects();
    }
}

function updateGhostButtons() {
    const m = players[myUid] || {};
    const u = m.usedAbilities || {};
    GHOST_ABILITIES.forEach(ab => {
        const b = document.getElementById('gh' + ab.id.charAt(0).toUpperCase() + ab.id.slice(1));
        if(b) {
            const il = ab.limit === 'once_per_ghost' && u[ab.id];
            b.disabled = il || gameState !== 'betting';
            b.textContent = il ? `${ab.emoji} ${ab.name} (исп.)` : `${ab.emoji} ${ab.name}`;
        }
    });
}

function populateBetSelects() {
    const sel = document.getElementById('betCount');
    if(!sel) return;
    sel.innerHTML = '<option value="">—</option>';
    const mp = Math.max(Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost).length * 5, 1);
    for(let i = 1; i <= mp; i++) {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = i;
        sel.appendChild(o);
    }
    const betCountVal = document.getElementById('betCount');
    if(betCountVal) betCountVal.value = lastBet ? Math.min(lastBet.count + 1, mp) : 1;
}

function isMyTurn() {
    if(isGhost || gameState !== 'betting') return false;
    const au = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
    if(!au.length) return false;
    const li = au.indexOf(lastBet?.player);
    return au.indexOf(myUid) === (li + 1) % au.length;
}

function placeBet() {
    if(gameState !== 'betting') return;
    const c = parseInt(document.getElementById('betCount').value);
    const v = parseInt(document.getElementById('betValue').value);
    const m = players[myUid];
    if(!m || isNaN(c) || isNaN(v)) return;
    if(lastBet && (c < lastBet.count || (c === lastBet.count && v <= lastBet.value))) {
        showNotification('Ставка должна быть выше предыдущей!', 'warning');
        return;
    }
    if(m.forcedBluff) {
        const needCount = lastBet.count + 3;
        const needValue = lastBet.value + 1;
        if(c < needCount || (c === needCount && v < needValue)) {
            showNotification(`Вы обязаны сделать ставку выше (минимум ${needCount}×${getDieEmoji(needValue)})`, 'warning');
            return;
        }
    }
    const nb = { player: myUid, count: c, value: v, timestamp: Date.now() };
    lastBet = nb;
    players[myUid].lastBetInRound = nb;
    if(m.cursed) players[myUid].cursed = false;
    if(m.forcedBluff) players[myUid].forcedBluff = false;
    roomRef.update({ lastBet: nb, turnCounter: turnCounter + 1 });
    roomRef.child('players').child(myUid).update({ lastBetInRound: nb, cursed: false, forcedBluff: false });
    turnCounter++;
    renderUI();
    playSound('bet');
    nextTurn();
}

function accuse() {
    if(gameState !== 'betting') return;
    if(!lastBet || lastBet.player === myUid) return;
    gameState = 'accusing';
roomRef.update({ 
    state: 'accusing',
    accusingData: {
        accuser: myUid,
        accused: lastBet.player,
        bet: lastBet,
        timestamp: Date.now()
    }
});
    const t = players[lastBet.player]?.name || 'Противник';
    const p = [
        `${myName} бьёт по столу: "${t}, ложь!"`,
        `"${t}, вскрывайся!" — ${myName}`,
        `${myName} указывает: "${t}, блеф!"`,
        `"Не верю!" — ${myName} нацелился на ${t}`
    ];
    const phraseEl = document.getElementById('accusationPhrase');
    if(phraseEl) phraseEl.textContent = p[Math.floor(Math.random() * p.length)];
    const resultEl = document.getElementById('accusationResult');
    if(resultEl) {
        resultEl.textContent = 'Проверка кубиков...';
        resultEl.className = 'accusation-result';
    }
    const effectsEl = document.getElementById('accusationEffects');
    if(effectsEl) effectsEl.innerHTML = '<h4 style="margin:5px 0; color:#ffd700;">📋 Эффекты:</h4>';
    let ct = {1:0,2:0,3:0,4:0,5:0,6:0};
    Object.values(players).forEach(p => {
        if(p?.alive && !p.isGhost) p.dice.forEach(d => ct[parseInt(d) || 1]++);
    });
    const sm = Object.keys(ct).filter(k => ct[k] > 0).map(k => `${ct[k]}x${getDieEmoji(k)}`).join('  ');
    const summaryEl = document.getElementById('accusationDiceSummary');
    if(summaryEl) summaryEl.textContent = `📊 Всего на столе: ${sm || 'Нет кубиков'}`;
    const panel = document.getElementById('accusationPanel');
    if(panel) panel.style.display = 'block';
    playSound('accuse');
    if(accusationTimer) clearTimeout(accusationTimer);
    accusationTimer = setTimeout(() => resolveAccusation(lastBet.player), 7000);
}

function resolveAccusation(accusedUid) {
    let totalDice = 0;
    let wildDieSaved = false;
    const tv = lastBet.value;
    const accused = players[accusedUid];
    Object.values(players).forEach(p => {
        if(!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { if(parseInt(d) === tv) totalDice++; });
    });
    if(accused?.artifact?.id === 'wildDie') {
        totalDice++;
        wildDieSaved = true;
    }
    let isLie = totalDice < lastBet.count;
    if(accused?.cursed || accused?.familiarCursed) isLie = true;
    const r = document.getElementById('accusationResult');
    const e = document.getElementById('accusationEffects');
    if(isLie) {
        if(r) {
            r.textContent = '✅ ЛОЖНАЯ СТАВКА!';
            r.className = 'accusation-result effect-green';
        }
        applyPoison(accusedUid, 1, 'Ложная ставка');
        addEffectLine(`🔴 ${accused?.name || 'Цель'}: +1 яд`, e);
        if(accused?.artifact?.id === 'bloodthirst') {
            applyBlood(myUid, 1);
            applyPoison(accusedUid, 2, 'Кровожадность');
            addEffectLine(`🟢 ${myName}: +1 кровь | 🔴 ${accused.name}: +2 яда`, e);
        } else if(accused?.artifact?.id === 'deceiver') {
            applyPoison(myUid, 2, 'Обманщик');
            addEffectLine(`🟣 ${accused.name}: Обманщик активирован | 🔴 ${myName}: +2 яда`, e);
        } else if(accused?.darkPact) {
            applyPoison(accusedUid, 2, 'Тёмный Договор');
            addEffectLine(`🟣 ${accused.name}: +2 яда (Договор)`, e);
        }
        if(wildDieSaved && !isLie) {
            applyPoison(myUid, 2, 'Дикий Кубик спас ставку');
            addEffectLine(`🔵 Дикий Кубик сработал! +2 яда обвинителю`, e);
        }
    } else {
        if(r) {
            r.textContent = '❌ ПРАВДИВАЯ СТАВКА!';
            r.className = 'accusation-result effect-red';
        }
        applyPoison(myUid, 1, 'Ошибочное обвинение');
        addEffectLine(`🔴 ${myName}: +1 яд`, e);
        if(accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
            addEffectLine(`🟢 ${accused.name}: +1 кровь`, e);
        }
        if(accused?.darkPact) {
            players[accusedUid].darkPact = false;
            players[accusedUid].darkPactShield = true;
            players[accusedUid].darkPactRound = roundNumber + 1;
            roomRef.child('players').child(accusedUid).update({ darkPact: false, darkPactShield: true, darkPactRound: roundNumber + 1 });
            addEffectLine(`🟡 ${accused.name}: Тёмный Договор → щит на след. раунд`, e);
        }
    }
    const el = e?.querySelectorAll('div').length || 0;
    setTimeout(() => {
        const panel = document.getElementById('accusationPanel');
        if(panel) panel.style.display = 'none';
        gameState = 'betting';
        roomRef.update({ state: 'betting' });
        checkDeath();
        setTimeout(() => {
            startNewRound();
        }, 2500);
    }, 7000 + (el * 3000));
}

function addEffectLine(t, c) {
    if(c) {
        const d = document.createElement('div');
        d.textContent = t;
        c.appendChild(d);
    }
}

function applyPoison(uid, amt, reason) {
    const p = players[uid];
    if(!p) return;
    if(p.devilShield && p.devilShieldRound === roundNumber) {
        appendChat(`🛡️ ${p.name} защищён ЩИТОМ ДЬЯВОЛА!`, 'system');
        delete p.devilShield;
        roomRef.child('players').child(uid).update({ devilShield: false });
        return;
    }
    if(p.defenderActive) {
        appendChat(`🛡️ ${p.name} защищён ЗАЩИТНИКОМ!`, 'system');
        p.defenderActive = false;
        roomRef.child('players').child(uid).update({ defenderActive: false });
        return;
    }
    let rem = amt;
    if(p.blood > 0) {
        const u = Math.min(p.blood, rem);
        rem -= u;
        p.blood -= u;
        roomRef.child('players').child(uid).update({ blood: p.blood });
    }
    if(rem > 0) {
        p.poisons += rem;
        appendChat(`☠️ ${p.name} получает +${rem} яд (${reason})`, 'death');
        playSound('poison');
        roomRef.child('players').child(uid).update({ poisons: p.poisons });
        renderUI();
    }
    checkDeath();
}

function applyBlood(uid, amt) {
    const p = players[uid];
    if(!p) return;
    p.blood = (p.blood || 0) + amt;
    appendChat(`🩸 ${p.name} получает +${amt} кровь!`, 'system');
    playSound('blood');
    roomRef.child('players').child(uid).update({ blood: p.blood });
    renderUI();
}

function checkDeath() {
    Object.keys(players).forEach(uid => {
        const p = players[uid];
        if(!p || p.isGhost) return;
        const ml = p.maxLives || 3;
        if(p.poisons >= ml && p.alive) {
            if(p.devilDealsUsed >= 2) {
                turnToGhost(uid);
            } else {
                if(uid === myUid) startDevilDeal(uid);
                else appendChat(`😈 ${p.name} отправляется на Сделку с Дьяволом...`, 'death');
            }
        }
    });
    const humans = Object.values(players).filter(p => p?.alive && !p.isGhost);
    if(humans.length === 1) {
        gameState = 'ended';
        roomRef.update({ state: 'ended' });
        appendChat(`🏆 ${humans[0].name} победил! Игра окончена.`, 'system');
        playSound('win');
        showConfetti();
    }
}

function turnToGhost(uid) {
    const update = {
        alive: false,
        isGhost: true,
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
    roomRef.child('players').child(uid).update(update);
    appendChat(`👻 ${players[uid].name} стал призраком (лимит сделок исчерпан)!`, 'death');
    playSound('ghost');
    checkVengeance(uid);
}

function startDevilDeal(uid) {
    if(uid !== myUid) return;
    gameState = 'devil_deal';
    roomRef.update({ state: 'devil_deal' });
    const tv = Math.floor(Math.random() * 6) + 1;
    let rl = 0;
    Object.values(players).forEach(p => {
        if(p?.alive && !p.isGhost) rl += p.dice.filter(d => (parseInt(d) || 1) === tv).length;
    });
    devilDealData = { targetValue: tv, realCount: rl, uid };
    const targetEmoji = document.getElementById('devilTargetEmoji');
    if(targetEmoji) targetEmoji.textContent = getDieEmoji(tv);
    const opts = [rl];
    while(opts.length < 3) {
        const f = rl + Math.floor(Math.random() * 5) - 2;
        if(f > 0 && !opts.includes(f)) opts.push(f);
    }
    opts.sort(() => Math.random() - 0.5);
    const optionsDiv = document.getElementById('devilOptions');
    if(optionsDiv) optionsDiv.innerHTML = opts.map(o => `<button class="devil-opt" onclick="resolveDevilDeal(${o})">${o}</button>`).join('');
    const fi = document.getElementById('devilFire');
    if(fi) {
        fi.style.animation = 'none';
        fi.offsetHeight;
        fi.style.animation = 'fireRise 30s linear forwards';
    }
    const modal = document.getElementById('devilModal');
    if(modal) modal.style.display = 'block';
    const timerEl = document.getElementById('devilTimer');
    if(timerEl) timerEl.textContent = '30';
    let t = 30;
    if(devilDealTimer) clearInterval(devilDealTimer);
    devilDealTimer = setInterval(() => {
        t--;
        if(timerEl) timerEl.textContent = t;
        if(t <= 0) {
            clearInterval(devilDealTimer);
            resolveDevilDeal(-1);
        }
    }, 1000);
    playSound('devil');
    appendChat(`😈 ${myName} заключает сделку с Дьяволом...`, 'death');
}

function resolveDevilDeal(chosen) {
    clearInterval(devilDealTimer);
    const modal = document.getElementById('devilModal');
    if(modal) modal.style.display = 'none';
    if(!devilDealData) return;
    const { realCount, uid } = devilDealData;
    const p = players[uid];
    if(!p) return;
    let isCorrect = (chosen === realCount);
    if(p.isBot && bots[p.id]?.difficulty === 3) isCorrect = true;
    else if(p.isBot && bots[p.id]?.difficulty === 2) isCorrect = (Math.random() < 0.7);
    else if(p.isBot && bots[p.id]?.difficulty === 1) isCorrect = (chosen === [realCount, realCount + 1, realCount - 1].sort()[1]);
    else if(p.isBot && bots[p.id]?.difficulty === 0) isCorrect = (Math.random() < 0.33);
    if(isCorrect) {
        const update = {
            poisons: 2,
            devilDealsUsed: (p.devilDealsUsed || 0) + 1,
            artifact: null,
            alive: true,
            isGhost: false,
            blood: 0,
            cursed: false,
            frozen: false,
            defenderActive: false,
            devilShield: false,
            dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1)
        };
        roomRef.child('players').child(uid).update(update);
        appendChat(`😈 ${p.name} ВЫИГРАЛ сделку! 2 яда, 1 жизнь`, 'system');
        playSound('devilWin');
    } else {
        turnToGhost(uid);
        appendChat(`😈 ${p.name} ПРОИГРАЛ сделку и стал ПРИЗРАКОМ!`, 'death');
        playSound('devilLose');
    }
    gameState = 'betting';
    devilDealData = null;
    roomRef.update({ state: 'betting', devilDealData: null });
    setTimeout(startNewRound, 2500);
}

function checkVengeance(uid) {
    Object.keys(players).forEach(u => {
        const p = players[u];
        if(p?.isGhost && p.ghostTarget === uid) {
            const update = {
                alive: true,
                isGhost: false,
                poisons: 2,
                blood: 0,
                ghostTarget: null,
                artifact: null,
                usedAbilities: {},
                dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1)
            };
            roomRef.child('players').child(u).update(update);
            appendChat(`⚔️ ПРИЗРАК ${p.name} ВОСКРЕС через МЕСТЬ!`, 'system');
            playSound('resurrection');
        }
    });
}

async function startNewRound() {
    const settingsSnapshot = await roomRef.child('settings').once('value');
const settings = settingsSnapshot.val();
if(settings) {
    specialDiceEnabled = settings.specialDiceEnabled !== false;
    if(settings.defaultLives) defaultLives = settings.defaultLives;
}
    if(gameState !== 'betting' && gameState !== 'lobby') return;
    const aliveCount = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost).length;
    const botCountTotal = Object.keys(players).filter(u => players[u]?.isBot).length;
    if(aliveCount < 2 && botCountTotal === 0) return;
    roundNumber++;
    turnCounter++;
    thiefUsedThisRound = false;
    sniperShotUsedThisRound = false;
    usedSpecialThisRound = {};
    spyMemory = {};
    const updates = {};
    Object.keys(players).forEach(uid => {
        const p = players[uid];
        if(p?.alive && !p.isGhost) {
            const lastTwoArtifacts = artifactHistory.filter(a => a.endsWith('_' + uid)).slice(-2);
            const av = ARTIFACTS.filter(a => !lastTwoArtifacts.includes(a.id + '_' + uid));
            const ar = av.length > 0 ? av[Math.floor(Math.random() * av.length)] : ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)];
            artifactHistory.push(ar.id + '_' + uid);
            let dc = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
            if(p.evilEyed) dc = dc.map(() => Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 3) + 4);
            const artData = specialDiceEnabled ? ar : null;
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
        }
    });
    updates.round = roundNumber;
    updates.state = 'betting';
    updates.lastBet = null;
    updates.turnCounter = turnCounter;
    updates.artifactHistory = artifactHistory;
    const aliveUids = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
    if(aliveUids.length) updates.currentPlayerUid = aliveUids[0];
    roomRef.update(updates);
    appendChat(`🎲 === РАУНД ${roundNumber} НАЧАЛСЯ! ===`, 'system');
    playSound('round');
    if(aliveUids.length && players[aliveUids[0]]?.isBot && aliveUids[0] !== myUid) {
    currentPlayerUid = aliveUids[0];
    botTurn(aliveUids[0]);
}
}

function nextTurn() {
    if(gameState !== 'betting') return;
    const aliveUids = Object.keys(players).filter(uid => players[uid]?.alive && !players[uid]?.isGhost);
    if(aliveUids.length === 0) return;
    let idx = aliveUids.indexOf(currentPlayerUid);
    let nextIdx = (idx + 1) % aliveUids.length;
    currentPlayerUid = aliveUids[nextIdx];
    turnCounter++;
    roomRef.update({ currentPlayerUid: currentPlayerUid, turnCounter: turnCounter });
    renderUI();
    if(currentPlayerUid && players[currentPlayerUid]?.isBot && currentPlayerUid !== myUid && !isBotThinking) {
        botTurn(currentPlayerUid);
    }
}

function addBot() {
    if(!isHost) {
        showNotification('Только создатель комнаты может добавлять ботов', 'warning');
        return;
    }
    if(gameState !== 'lobby' && gameState !== 'ended') {
        showNotification('Можно добавлять ботов только в лобби или после окончания игры', 'warning');
        return;
    }
    const botCountTotal = Object.keys(players).filter(u => players[u]?.isBot).length;
    if(botCountTotal >= 5) {
        showNotification('Максимум 5 ботов в комнате', 'warning');
        return;
    }
    const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const botName = '🤖 Бот';
    const botData = {
        name: botName,
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
        maxLives: defaultLives,
        isBot: true,
        botDifficulty: botDifficulty,
        cursed: false,
        frozen: false,
        defenderActive: false,
        stunned: false,
        blind: false,
        darkPact: false,
        darkPactShield: false,
        devilShield: false,
        evilEyed: false,
        forcedBluff: false,
        cannotAccuse: false,
        sniperShotUsedThisRound: false,
        familiarCursed: false,
        usedAbilities: {}
    };
    bots[botId] = { difficulty: botDifficulty, knownDice: {} };
    roomRef.child('players').child(botId).set(botData);
    appendChat(`🤖 Бот (${botDifficultyNames[botDifficulty]}) присоединился к игре`, 'system');
}

function removeAllBots() {
    if(!isHost) {
        showNotification('Только создатель комнаты может удалять ботов', 'warning');
        return;
    }
    if(gameState !== 'lobby' && gameState !== 'ended') {
        showNotification('Можно удалять ботов только в лобби или после окончания игры', 'warning');
        return;
    }
    Object.keys(players).forEach(uid => {
        if(players[uid]?.isBot) {
            roomRef.child('players').child(uid).remove();
        }
    });
    bots = {};
    appendChat(`🤖 Все боты удалены`, 'system');
}

function setBotDifficulty(level) {
    botDifficulty = level;
    const label = document.getElementById('botDifficultyLabel');
    if(label) label.innerText = botDifficultyNames[level];
    appendChat(`Сложность новых ботов изменена на ${botDifficultyNames[level]}`, 'system');
}

function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(link);
    showNotification('Ссылка-приглашение скопирована!', 'success');
    appendChat(`🔗 Ссылка скопирована: ${link}`, 'system');
}

function saveProfile() {
    const newName = document.getElementById('profileNameInput')?.value.trim();
    if(newName && newName !== myName) {
        myName = newName;
        localStorage.setItem('ld_playerName', myName);
        roomRef.child('players').child(myUid).update({ name: myName });
        appendChat(`Игрок сменил ник на ${myName}`, 'system');
    }
    localStorage.setItem('ld_avatar', myAvatar);
    localStorage.setItem('ld_color', myColor);
    roomRef.child('players').child(myUid).update({ avatar: myAvatar, color: myColor });
    showNotification('Профиль сохранён!', 'success');
    document.getElementById('modalProfile').style.display = 'none';
}

function updateExpertKnowledge(botId, targetId, newDice) {
    if(bots[botId]?.difficulty !== 3) return;
    if(!expertKnownDice[botId]) expertKnownDice[botId] = {};
    let indices = [0,1,2,3,4];
    for(let i = indices.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let knownIndices = indices.slice(0, 4);
    let known = Array(5).fill(null);
    for(let idx of knownIndices) known[idx] = newDice[idx];
    expertKnownDice[botId][targetId] = known;
}

function getKnownDiceForExpert(botId, targetId) {
    if(bots[botId]?.difficulty !== 3) return null;
    return expertKnownDice[botId]?.[targetId] || null;
}

function evaluateBetTruthfulness(bet, botId) {
    let bot = players[botId];
    let difficulty = bots[botId]?.difficulty ?? 2;
    if(difficulty === 0) return Math.random() < 0.2;
    let totalKnown = 0;
    let totalPossible = 0;
    let targetValue = bet.value;
    for(let uid in players) {
        if(uid === botId) continue;
        let p = players[uid];
        if(!p.alive || p.isGhost) continue;
        let knownDice = getKnownDiceForExpert(botId, uid);
        if(difficulty === 3 && knownDice) {
            for(let d of knownDice) if(d !== null && d === targetValue) totalKnown++;
            let unknownCount = knownDice.filter(d => d === null).length;
            totalPossible += unknownCount;
        } else {
            totalPossible += p.dice.length;
        }
    }
    let myDice = bot.dice;
    let myCount = myDice.filter(d => d === targetValue).length;
    totalKnown += myCount;
    if(difficulty === 3 && totalPossible > 0) {
        let minTotal = totalKnown;
        let maxTotal = totalKnown + totalPossible;
        if(bet.count <= minTotal) return false;
        if(bet.count > maxTotal) return true;
        let prob = (maxTotal - bet.count) / (maxTotal - minTotal + 1);
        return prob > 0.6;
    } else if(difficulty === 2) {
        let otherAverage = totalPossible * (1/6);
        let totalEstimate = myCount + otherAverage;
        let variance = Math.sqrt(totalPossible * (1/6) * (5/6));
        let z = (bet.count - totalEstimate) / variance;
        return z > 1.5;
    } else {
        return bet.count > myCount + 2;
    }
}

function botMakeDecision(botId) {
    let bot = players[botId];
    if(!bot || bot.isGhost) return;
    let difficulty = bots[botId]?.difficulty ?? 2;
    let accuseProb = [0.2, 0.35, 0.5, 0.7][difficulty];
    let shouldAccuse = false;
    if(lastBet && lastBet.player !== botId) {
        if(difficulty === 3) {
            shouldAccuse = evaluateBetTruthfulness(lastBet, botId);
        } else {
            shouldAccuse = Math.random() < accuseProb;
            if(difficulty === 2 && !shouldAccuse) {
                shouldAccuse = evaluateBetTruthfulness(lastBet, botId);
            }
        }
    }
    if(shouldAccuse && lastBet && lastBet.player !== botId) {
        accuseFromBot(botId);
        let msgs = ['Думаешь, я поведусь?', 'Это явный блеф!', 'Я знаю твои кубики!', 'Слишком рискованно, проверяем!', 'Вскрывайся, лжец!'];
        if(Math.random() < 0.3 && difficulty === 3) appendChat(`🤖 ${bot.name}: ${msgs[Math.floor(Math.random() * msgs.length)]}`, 'system');
        else appendChat(`🤖 ${bot.name} обвиняет ${players[lastBet.player]?.name} в блефе!`, 'system');
        return;
    }
    let maxPossible = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost).length * 5;
    let newCount, newValue;
    if(!lastBet) {
        if(difficulty === 0) {
            newCount = Math.floor(Math.random() * maxPossible) + 1;
            newValue = Math.floor(Math.random() * 6) + 1;
        } else {
            let myBest = getBestValue(bot.dice);
            newCount = Math.min(maxPossible, Math.max(1, myBest.count + (difficulty === 1 ? 0 : Math.floor(Math.random() * 3))));
            newValue = myBest.value;
        }
    } else {
        let myDice = bot.dice;
        let counts = {};
        for(let d of myDice) counts[d] = (counts[d] || 0) + 1;
        let bestValue = 1, bestCount = 0;
        for(let v = 1; v <= 6; v++) if(counts[v] > bestCount) { bestCount = counts[v]; bestValue = v; }
        let bluff = 0;
        if(difficulty === 0) bluff = Math.floor(Math.random() * 5) - 1;
        else if(difficulty === 1) bluff = Math.floor(Math.random() * 3);
        else if(difficulty === 2) bluff = Math.floor(Math.random() * 4);
        else {
            let trueTotal = estimateTrueCount(lastBet.value, botId);
            if(lastBet.count <= trueTotal) bluff = 1;
            else bluff = -1;
        }
        newCount = Math.min(maxPossible, Math.max(1, bestCount + bluff));
        if(newCount < lastBet.count) newCount = lastBet.count + 1;
        if(newCount > maxPossible) newCount = maxPossible;
        newValue = bestValue;
        if(newCount === lastBet.count && newValue <= lastBet.value) newValue = lastBet.value + 1;
        if(newValue > 6) { newValue = 1; newCount = Math.min(maxPossible, newCount + 1); }
    }
    const betData = { player: botId, count: newCount, value: newValue, timestamp: Date.now() };
    lastBet = betData;
    players[botId].lastBetInRound = betData;
    roomRef.update({ lastBet: betData, turnCounter: turnCounter + 1 });
    roomRef.child('players').child(botId).update({ lastBetInRound: betData });
    appendChat(`🤖 ${bot.name} ставит ${newCount}×${getDieEmoji(newValue)}`, 'system');
    turnCounter++;
    nextTurn();
    isBotThinking = false;
}

function getBestValue(dice) {
    let counts = {};
    for(let d of dice) counts[d] = (counts[d] || 0) + 1;
    let best = 1, bestCount = 0;
    for(let v = 1; v <= 6; v++) if(counts[v] > bestCount) { bestCount = counts[v]; best = v; }
    return { count: bestCount, value: best };
}

function estimateTrueCount(value, botId) {
    let total = 0;
    for(let uid in players) {
        let p = players[uid];
        if(!p.alive || p.isGhost) continue;
        if(uid === botId) {
            total += p.dice.filter(d => d === value).length;
        } else {
            let known = getKnownDiceForExpert(botId, uid);
            if(known) {
                for(let d of known) if(d === value) total++;
                let unknown = known.filter(d => d === null).length;
                total += unknown * (1/6);
            } else {
                total += p.dice.length * (1/6);
            }
        }
    }
    return Math.round(total);
}

function botUseArtifact(botId) {
    let bot = players[botId];
    if(!bot || bot.isGhost || !bot.artifact || bot.artifact.type !== 'active') return false;
    let difficulty = bots[botId]?.difficulty ?? 2;
    if(difficulty === 0) return false;
    let chance = [0, 0.3, 0.7, 1.0][difficulty];
    if(Math.random() > chance) return false;
    let art = bot.artifact;
    let targets = Object.keys(players).filter(u => u !== botId && players[u]?.alive && !players[u]?.isGhost);
    if(targets.length === 0) return false;
    let bestTarget = null;
    if(difficulty === 3) {
        if(art.id === 'target' || art.id === 'curse' || art.id === 'ice' || art.id === 'evilEye') {
            let mostPoisons = targets.sort((a, b) => players[b].poisons - players[a].poisons)[0];
            bestTarget = mostPoisons;
        } else if(art.id === 'blessing') {
            if(bot.poisons > 0) bestTarget = botId;
            else bestTarget = targets.find(u => players[u].poisons > 0) || null;
        } else if(art.id === 'thief') {
            let withArt = targets.filter(u => players[u].artifact);
            if(withArt.length) bestTarget = withArt[0];
        } else if(art.id === 'double') {
            let withLastBet = targets.filter(u => players[u].lastBetInRound);
            if(withLastBet.length) bestTarget = withLastBet[0];
        } else if(art.id === 'sniper') {
            if(lastBet) bestTarget = null;
        }
    } else {
        bestTarget = targets[Math.floor(Math.random() * targets.length)];
    }
    if(!bestTarget && art.id !== 'fireball' && art.id !== 'luck') return false;
    if(art.id === 'target') {
        let vals = bot.dice;
        let commonVal = getBestValue(vals).value;
        let targetPlayer = players[bestTarget];
        let idx = targetPlayer.dice.indexOf(commonVal);
        if(idx !== -1) targetPlayer.dice.splice(idx, 1);
        roomRef.child('players').child(bestTarget).update({ dice: targetPlayer.dice });
        appendChat(`🤖 ${bot.name} использовал ${art.name} на ${targetPlayer.name}`, 'system');
    } else if(art.id === 'fireball' || art.id === 'luck') {
        let newDice = bot.dice.map(() => art.id === 'luck' ? (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1) : Math.floor(Math.random() * 6) + 1);
        roomRef.child('players').child(botId).update({ dice: newDice });
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id === 'blessing') {
        if(bestTarget === botId) {
            roomRef.child('players').child(botId).update({ poisons: Math.max(0, bot.poisons - 1) });
        } else if(bestTarget) {
            roomRef.child('players').child(bestTarget).update({ poisons: Math.max(0, players[bestTarget].poisons - 1) });
        }
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id === 'thief' && bestTarget && players[bestTarget].artifact) {
        let stolen = players[bestTarget].artifact;
        roomRef.child('players').child(botId).update({ artifact: stolen });
        roomRef.child('players').child(bestTarget).update({ artifact: null });
        appendChat(`🤖 ${bot.name} украл ${stolen.emoji} у ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'curse' && bestTarget) {
        roomRef.child('players').child(bestTarget).update({ cursed: true });
        appendChat(`🤖 ${bot.name} проклял ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'ice' && bestTarget) {
        roomRef.child('players').child(bestTarget).update({ frozen: true });
        appendChat(`🤖 ${bot.name} заморозил ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'double' && bestTarget && players[bestTarget].lastBetInRound) {
        let lb = players[bestTarget].lastBetInRound;
        let nc = lb.count, nv = lb.value;
        let maxPossible = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost).length * 5;
        if(lastBet && (nc < lastBet.count || (nc === lastBet.count && nv <= lastBet.value))) {
            if(nc < maxPossible) nc++;
            else { nv = Math.min(6, nv + 1); nc = 1; }
        }
        lastBet = { player: botId, count: nc, value: nv };
        players[botId].lastBetInRound = lastBet;
        roomRef.update({ lastBet: lastBet });
        roomRef.child('players').child(botId).update({ lastBetInRound: lastBet });
        appendChat(`🤖 ${bot.name} скопировал ставку ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'evilEye' && bestTarget) {
        roomRef.child('players').child(bestTarget).update({ evilEyed: true });
        appendChat(`🤖 ${bot.name} наслал сглаз на ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'sniper') {
        return false;
    }
    usedSpecialThisRound[art.id] = true;
    roomRef.child('players').child(botId).update({ artifact: null, usedSpecialThisRound: usedSpecialThisRound });
    return true;
}

function botUseGhostAbility(botId) {
    let bot = players[botId];
    if(!bot.isGhost) return;
    let difficulty = bots[botId]?.difficulty ?? 2;
    if(difficulty === 0) return;
    let abilities = GHOST_ABILITIES.filter(ab => !bot.usedAbilities?.[ab.id]);
    if(abilities.length === 0) return;
    let chance = [0, 0.25, 0.6, 1.0][difficulty];
    if(Math.random() > chance) return;
    let ab = abilities[Math.floor(Math.random() * abilities.length)];
    if(ab.id === 'oathOfVengeance') {
        let targets = Object.keys(players).filter(u => u !== botId && players[u]?.alive && !players[u]?.isGhost);
        if(targets.length) {
            let target = targets[0];
            if(difficulty === 3) target = targets.sort((a, b) => players[b].poisons - players[a].poisons)[0];
            roomRef.child('players').child(botId).update({ ghostTarget: target });
            appendChat(`⚔️ Призрак ${bot.name} выбрал цель для Мести: ${players[target].name}`, 'ghost');
        }
    } else if(ab.id === 'familiarCurse') {
        let targets = Object.keys(players).filter(u => u !== botId && players[u]?.alive && !players[u]?.isGhost);
        if(targets.length) {
            let target = targets[Math.floor(Math.random() * targets.length)];
            roomRef.child('players').child(target).update({ familiarCursed: true });
            appendChat(`🔮 Призрак ${bot.name} проклял ${players[target].name}`, 'ghost');
        }
    } else if(ab.id === 'poltergeist') {
        let alive = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
        if(alive.length) {
            let r = Math.random();
            if(r < 0.33) {
                let t = alive[Math.floor(Math.random() * alive.length)];
                let newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
                roomRef.child('players').child(t).update({ dice: newDice, evilEyed: false });
                appendChat(`🌀 Призрак ${bot.name} устроил саботаж ${players[t].name}`, 'ghost');
            } else if(r < 0.66) {
                let t = alive[Math.floor(Math.random() * alive.length)];
                roomRef.child('players').child(t).update({ dice: [6,6,6,6,6], evilEyed: false });
                appendChat(`🌀 Призрак ${bot.name} благословил ${players[t].name}`, 'ghost');
            } else {
                for(let u of alive) {
                    let newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
                    roomRef.child('players').child(u).update({ dice: newDice, evilEyed: false });
                }
                appendChat(`🌀 Призрак ${bot.name} перемешал все кубики`, 'ghost');
            }
        }
    } else if(ab.id === 'keeperOfSecrets') {
        return;
    } else if(ab.id === 'soulReaper') {
        let killed = false;
        for(let uid in players) {
            let p = players[uid];
            if(p.alive && !p.isGhost && Math.random() < 0.2) {
                let r = Math.random();
                if(r < 0.1) {
                    applyPoison(uid, 1, 'Жатва Душ');
                    killed = true;
                } else if(r < 0.35 && p.artifact) {
                    roomRef.child('players').child(uid).update({ artifact: null });
                    appendChat(`💀 ${p.name}: потерял артефакт!`, 'ghost');
                } else if(r < 0.6 && p.poisons > 0) {
                    roomRef.child('players').child(uid).update({ poisons: p.poisons - 1 });
                    appendChat(`💀 ${p.name}: исцелился!`, 'ghost');
                } else if(r < 0.85) {
                    roomRef.child('players').child(uid).update({ stunned: true });
                    appendChat(`💀 ${p.name}: ошеломлён!`, 'ghost');
                } else {
                    roomRef.child('players').child(uid).update({ blind: true });
                    appendChat(`💀 ${p.name}: ослеплён!`, 'ghost');
                }
            }
        }
        if(killed) {
            const update = {
                alive: true,
                isGhost: false,
                poisons: 2,
                blood: 0,
                artifact: null,
                dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                usedAbilities: {}
            };
            roomRef.child('players').child(botId).update(update);
            appendChat(`💀 Призрак ${bot.name} воскрес благодаря Жатве Душ!`, 'ghost');
            playSound('resurrection');
        }
    }
    const usedAbilities = bot.usedAbilities || {};
    usedAbilities[ab.id] = true;
    roomRef.child('players').child(botId).update({ usedAbilities: usedAbilities });
}

function botTurn(botId) {
    if(isBotThinking) return;
    isBotThinking = true;
    let difficulty = bots[botId]?.difficulty ?? 2;
    let delay = [8000, 6000, 6000, 4000][difficulty] + Math.random() * 2000;
    setTimeout(() => {
        if(gameState !== 'betting' || currentPlayerUid !== botId) {
            isBotThinking = false;
            return;
        }
        let bot = players[botId];
        if(!bot || bot.isGhost) {
            isBotThinking = false;
            return;
        }
        if(bot.artifact && bot.artifact.type === 'active') {
            botUseArtifact(botId);
        }
        if(bot.isGhost) {
            botUseGhostAbility(botId);
        }
        botMakeDecision(botId);
    }, delay);
}

function accuseFromBot(botId) {
    if(!lastBet || lastBet.player === botId) return;
    const accusedUid = lastBet.player;
    let totalDice = 0;
    let wildDieSaved = false;
    const tv = lastBet.value;
    const accused = players[accusedUid];
    Object.values(players).forEach(p => {
        if(!p?.alive || p.isGhost) return;
        p.dice.forEach(d => { if(parseInt(d) === tv) totalDice++; });
    });
    if(accused?.artifact?.id === 'wildDie') {
        totalDice++;
        wildDieSaved = true;
    }
    let isLie = totalDice < lastBet.count;
    if(accused?.cursed || accused?.familiarCursed) isLie = true;
    if(isLie) {
        applyPoison(accusedUid, 1, 'Ложная ставка (бот)');
        if(accused?.artifact?.id === 'bloodthirst') {
            applyBlood(botId, 1);
            applyPoison(accusedUid, 2, 'Кровожадность (бот)');
        } else if(accused?.artifact?.id === 'deceiver') {
            applyPoison(botId, 2, 'Обманщик (бот)');
        } else if(accused?.darkPact) {
            applyPoison(accusedUid, 2, 'Тёмный Договор (бот)');
        }
        if(wildDieSaved && !isLie) {
            applyPoison(botId, 2, 'Дикий Кубик спас ставку (бот)');
        }
    } else {
        applyPoison(botId, 1, 'Ошибочное обвинение (бот)');
        if(accused?.artifact?.id === 'bloodthirst') {
            applyBlood(accusedUid, 1);
        }
        if(accused?.darkPact) {
            players[accusedUid].darkPact = false;
            players[accusedUid].darkPactShield = true;
            players[accusedUid].darkPactRound = roundNumber + 1;
            roomRef.child('players').child(accusedUid).update({ darkPact: false, darkPactShield: true, darkPactRound: roundNumber + 1 });
        }
    }
    gameState = 'betting';
    roomRef.update({ state: 'betting' });
    checkDeath();
    setTimeout(startNewRound, 2500);
}

function startVoteKick() {
    if(Date.now() - lastVoteEndTime < VOTE_COOLDOWN) {
        const w = Math.ceil((VOTE_COOLDOWN - (Date.now() - lastVoteEndTime)) / 1000);
        return showNotification(`Голосование доступно через ${w} сек`, 'warning');
    }
    const tg = Object.keys(players).filter(u => u !== myUid && !players[u]?.isBot);
    if(!tg.length) return showNotification('Нет других игроков для исключения!', 'warning');
    const ld = document.getElementById('voteTargetsList');
    if(!ld) return;
    ld.innerHTML = '';
    tg.forEach(u => {
        const p = players[u];
        if(!p || !p.name) return;
        const b = document.createElement('button');
        b.className = 'select-item';
        b.textContent = p.name + (p.isGhost ? ' 👻' : '');
        b.onclick = () => {
            currentVoteTarget = u;
            const targetName = document.getElementById('voteTargetName');
            if(targetName) targetName.textContent = p.name;
            const resultDiv = document.getElementById('voteResult');
            if(resultDiv) resultDiv.textContent = '';
            const modal = document.getElementById('modalVote');
            if(modal) modal.style.display = 'block';
            startVoteTimer(u);
        };
        ld.appendChild(b);
    });
}

function startVoteTimer(tu) {
    let t = 30;
    const el = document.getElementById('voteTimer');
    roomRef.child('votes').child(tu).set({
        startTime: Date.now(),
        votes: {},
        target: tu,
        initiator: myUid
    });
    if(voteTimerInterval) clearInterval(voteTimerInterval);
    voteTimerInterval = setInterval(() => {
        t--;
        if(el) el.textContent = t;
        if(t <= 0) {
            clearInterval(voteTimerInterval);
            resolveVote(tu);
        }
    }, 1000);
}

function castVote(v) {
    if(!currentVoteTarget) return;
    roomRef.child('votes').child(currentVoteTarget).child('votes').child(myUid).set(v);
    showNotification(`Голос принят: ${v === 'yes' ? 'ЗА' : 'ПРОТИВ'}`, 'info');
}

function resolveVote(tu) {
    document.getElementById('modalVote').style.display = 'none';
    roomRef.child('votes').child(tu).once('value', (s) => {
        const vd = s.val();
        if(!vd) return;
        const votes = vd.votes || {};
        let yes = 0, no = 0;
        Object.values(votes).forEach(v => {
            if(v === 'yes') yes++;
            if(v === 'no') no++;
        });
        const total = yes + no;
        const kicked = total > 0 && yes > total / 2;
        if(kicked && players[tu]) {
            roomRef.child('players').child(tu).remove();
            appendChat(`🗳️ ${players[tu].name} исключён голосованием! (ЗА: ${yes}, ПРОТИВ: ${no})`, 'system');
        } else {
            appendChat(`🗳️ ${players[tu]?.name || 'Игрок'} остался! (ЗА: ${yes}, ПРОТИВ: ${no})`, 'system');
        }
        roomRef.child('votes').child(tu).remove();
        lastVoteEndTime = Date.now();
        currentVoteTarget = null;
    });
}

function setupAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
}

function showConfetti() {
    for(let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.background = ['#ffd700', '#ff0000', '#00ff00', '#0000ff'][Math.floor(Math.random() * 4)];
        c.style.animationDuration = (Math.random() * 2 + 2) + 's';
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}

function useGhostAbility(id) {
    if(!isGhost) return;
    const m = players[myUid];
    const ab = GHOST_ABILITIES.find(a => a.id === id);
    if(!ab) return;
    if(ab.limit === 'once_per_ghost' && m?.usedAbilities?.[id]) {
        showNotification('Способность уже использована!', 'warning');
        return;
    }
    switch(id) {
        case 'oathOfVengeance':
            const tv = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost);
            if(!tv.length) return;
            showTargetModal(tv, t => {
                roomRef.child('players').child(myUid).update({ ghostTarget: t });
                appendChat(`⚔️ [Призрак ${m.name}] выбрал цель для Мести: ${players[t].name}`, 'ghost');
            });
            break;
        case 'familiarCurse':
            const fc = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost);
            if(!fc.length) return;
            showTargetModal(fc, t => {
                roomRef.child('players').child(t).update({ familiarCursed: true });
                appendChat(`🔮 [Призрак ${m.name}] проклял ${players[t].name}`, 'ghost');
            });
            break;
        case 'poltergeist':
            const ef = ['sabotage', 'blessing', 'shuffle'];
            const ch = ef[Math.floor(Math.random() * ef.length)];
            const al = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
            if(!al.length) return;
            if(ch === 'sabotage') {
                const t = al[Math.floor(Math.random() * al.length)];
                const newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
                roomRef.child('players').child(t).update({ dice: newDice, evilEyed: false });
                appendChat(`🌀 [Полтергейст] САБОТАЖ: ${players[t].name} — кубики переброшены!`, 'ghost');
            } else if(ch === 'blessing') {
                const t = al[Math.floor(Math.random() * al.length)];
                roomRef.child('players').child(t).update({ dice: [6,6,6,6,6], evilEyed: false });
                appendChat(`🌀 [Полтергейст] БЛАГОСЛОВЕНИЕ: ${players[t].name} — все кубики стали 6!`, 'ghost');
            } else {
                al.forEach(u => {
                    const newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
                    roomRef.child('players').child(u).update({ dice: newDice, evilEyed: false });
                });
                appendChat(`🌀 [Полтергейст] ПЕРЕМЕШИВАНИЕ: Всем живым игрокам кубики переброшены!`, 'ghost');
            }
            break;
        case 'keeperOfSecrets':
            const cd = document.getElementById('keeperContent');
            if(cd) {
                cd.innerHTML = '';
                Object.values(players).forEach(p => {
                    if(p?.alive && !p.isGhost) {
                        const d = document.createElement('div');
                        d.style.marginBottom = '10px';
                        d.style.background = 'rgba(255,255,255,0.05)';
                        d.style.padding = '8px';
                        d.style.borderRadius = '5px';
                        d.innerHTML = `<strong style="color:#ffd700">${p.name}</strong>: <span style="font-size:1.2em">${p.dice.map(d => getDieEmoji(parseInt(d) || 1)).join(' ')}</span>`;
                        cd.appendChild(d);
                    }
                });
                document.getElementById('modalKeeper').style.display = 'block';
            }
            return;
        case 'soulReaper':
            const sr = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
            if(!sr.length) return;
            let killed = false;
            sr.forEach(uid => {
                if(Math.random() < 0.2) {
                    const p = players[uid];
                    const r = Math.random();
                    let ef = r < 0.1 ? 'death' : r < 0.35 ? 'loseArtifact' : r < 0.6 ? 'heal' : r < 0.85 ? 'stun' : 'blind';
                    if(ef === 'death') {
                        applyPoison(uid, 1, 'Жатва Душ');
                        killed = true;
                    } else if(ef === 'loseArtifact' && p.artifact) {
                        roomRef.child('players').child(uid).update({ artifact: null });
                        appendChat(`💀 ${p.name}: потерял артефакт!`, 'ghost');
                    } else if(ef === 'heal' && p.poisons > 0) {
                        roomRef.child('players').child(uid).update({ poisons: p.poisons - 1 });
                        appendChat(`💀 ${p.name}: исцелился!`, 'ghost');
                    } else if(ef === 'stun') {
                        roomRef.child('players').child(uid).update({ stunned: true });
                        appendChat(`💀 ${p.name}: ошеломлён!`, 'ghost');
                    } else if(ef === 'blind') {
                        roomRef.child('players').child(uid).update({ blind: true });
                        appendChat(`💀 ${p.name}: ослеплён!`, 'ghost');
                    }
                }
            });
            if(killed) {
                const update = {
                    alive: true,
                    isGhost: false,
                    poisons: 2,
                    blood: 0,
                    artifact: null,
                    dice: Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1),
                    usedAbilities: {}
                };
                roomRef.child('players').child(myUid).update(update);
                appendChat(`💀 [Призрак ${m.name}] Жатва Душ принесла смерть — ПРИЗРАК ВОСКРЕС!`, 'ghost');
                playSound('resurrection');
            }
            break;
    }
    const usedAbilities = m.usedAbilities || {};
    usedAbilities[id] = true;
    roomRef.child('players').child(myUid).update({ usedAbilities: usedAbilities });
    playSound('ghost');
}

function useArtifact(id) {
    if(gameState !== 'betting') return;
    const m = players[myUid];
    const art = ARTIFACTS.find(a => a.id === id);
    if(!art || (art.type === 'active' && usedSpecialThisRound[id])) return;
    switch(id) {
        case 'target':
            showTargetModalFirst(Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost), (target) => {
                showNominalModal((nominal) => {
                    const tg = [target];
                    const t = tg[0];
                    if(players[t].dice.length <= 1) {
                        showNotification('Нельзя уничтожить последний кубик!', 'warning');
                        return;
                    }
                    const i = players[t].dice.indexOf(nominal);
                    if(i === -1) {
                        showNotification(`У ${players[t].name} нет кубика ${getDieEmoji(nominal)}!`, 'warning');
                        return;
                    }
                    players[t].dice.splice(i, 1);
                    roomRef.child('players').child(t).update({ dice: players[t].dice });
                    appendChat(`🎯 ${m.name} использовал В ЯБЛОЧКО! Уничтожен кубик ${getDieEmoji(nominal)} у ${players[t].name}`, 'system');
                });
            });
            break;
        case 'fireball':
        case 'luck':
            const nd = m.dice.map((d, idx) => {
                if(m.frozen) return d;
                return id === 'luck' ? (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 4 : Math.floor(Math.random() * 3) + 1) : Math.floor(Math.random() * 6) + 1;
            });
            roomRef.child('players').child(myUid).update({ dice: nd, evilEyed: false });
            appendChat(`☄️ ${m.name} использовал ${art.name}! Кубики переброшены`, 'system');
            break;
        case 'blessing':
            if(m.poisons > 0) {
                roomRef.child('players').child(myUid).update({ poisons: m.poisons - 1 });
                appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! Себе -1 яд`, 'system');
            } else {
                const h = Object.keys(players).find(u => u !== myUid && players[u]?.alive && players[u]?.poisons > 0);
                if(h) {
                    roomRef.child('players').child(h).update({ poisons: players[h].poisons - 1 });
                    appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! ${players[h].name} -1 яд`, 'system');
                } else showNotification('Нет раненых союзников!', 'warning');
            }
            break;
        case 'thief':
            if(thiefUsedThisRound) return showNotification('Вор уже использован в этом раунде!', 'warning');
            const tt = Object.keys(players).filter(u => u !== myUid && players[u]?.artifact);
            if(!tt.length) return showNotification('Не у кого красть!', 'warning');
            showTargetModal(tt, t => {
                const st = players[t].artifact;
                roomRef.child('players').child(myUid).update({ artifact: st });
                roomRef.child('players').child(t).update({ artifact: null });
                thiefUsedThisRound = true;
                appendChat(`🥷 ${m.name} украл ${st.emoji} у ${players[t].name}!`, 'system');
            });
            break;
        case 'deceiver':
            const bc = lastBet ? lastBet.count + Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 5) + 6;
            const bv = Math.floor(Math.random() * 6) + 1;
            lastBet = { player: myUid, count: bc, value: bv };
            players[myUid].lastBetInRound = lastBet;
            roomRef.update({ lastBet: lastBet, turnCounter: turnCounter + 1 });
            roomRef.child('players').child(myUid).update({ lastBetInRound: lastBet });
            turnCounter++;
            nextTurn();
            break;
        case 'clone':
            const tc = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost);
            if(!tc.length) return;
            const cl = tc[Math.floor(Math.random() * tc.length)];
            const cd = players[cl].dice[Math.floor(Math.random() * players[cl].dice.length)];
            const newDice = [...m.dice, cd];
            roomRef.child('players').child(myUid).update({ dice: newDice, artifact: null });
            appendChat(`🧬 ${m.name} клонировал кубик ${getDieEmoji(cd)} у ${players[cl].name}! Теперь у него 6 кубиков.`, 'system');
            break;
        case 'curse':
            const cu = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost);
            if(!cu.length) return;
            showTargetModal(cu, t => {
                roomRef.child('players').child(t).update({ cursed: true });
                appendChat(`☠️ ${m.name} проклял ${players[t].name}! Следующая ставка ложная.`, 'system');
            });
            break;
        case 'spy':
            if(spyMemory[myUid] && spyMemory[myUid].value && roundNumber === spyMemory[myUid].round) {
                showNotification(`🔍 Шпион: у ${players[spyMemory[myUid].target]?.name} выпал кубик ${getDieEmoji(spyMemory[myUid].value)}`, 'info');
                break;
            }
            const sp = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost);
            if(!sp.length) return showNotification('Нет целей!', 'warning');
            showTargetModal(sp, t => {
                const val = players[t].dice[Math.floor(Math.random() * players[t].dice.length)];
                spyMemory[myUid] = { target: t, value: val, round: roundNumber };
                showNotification(`🕵️ Шпион: у ${players[t].name} выпал кубик ${getDieEmoji(val)}`, 'info');
                appendChat(`🕵️ ${m.name} использовал Шпиона на ${players[t].name}`, 'system');
            });
            break;
        case 'ice':
            const ci = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost && !players[u]?.frozen);
            if(!ci.length) return;
            showTargetModal(ci, t => {
                roomRef.child('players').child(t).update({ frozen: true });
                appendChat(`🧊 ${m.name} заморозил кубики ${players[t].name}!`, 'system');
            });
            break;
        case 'analyst':
            showNominalModal(n => {
                let c = 0;
                Object.values(players).forEach(p => {
                    if(p?.alive && !p.isGhost && p.dice.includes(n)) c++;
                });
                showNotification(`АНАЛИТИК: Минимум ${c} игроков имеют кубик ${getDieEmoji(n)}`, 'info');
            });
            break;
        case 'double':
            if(!lastBet) return showNotification('Нет ставок для копирования!', 'warning');
            const td = Object.keys(players).filter(u => u !== myUid && players[u]?.lastBetInRound);
            if(!td.length) return;
            showTargetModal(td, t => {
                let lb = players[t].lastBetInRound;
                let nc = lb.count, nv = lb.value;
                if(lastBet && (nc < lastBet.count || (nc === lastBet.count && nv <= lastBet.value))) {
                    if(nc < Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost).length * 5) nc++;
                    else { nv = Math.min(6, nv + 1); nc = 1; }
                }
                lastBet = { player: myUid, count: nc, value: nv };
                players[myUid].lastBetInRound = lastBet;
                roomRef.update({ lastBet: lastBet, turnCounter: turnCounter + 1 });
                roomRef.child('players').child(myUid).update({ lastBetInRound: lastBet });
                turnCounter++;
                nextTurn();
                appendChat(`🎭 ${m.name} использовал ДВОЙНИК! Скопирована ставка ${players[t].name}: ${nc}×${getDieEmoji(nv)}`, 'system');
            });
            break;
        case 'evilEye':
            const te = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost && !players[u]?.evilEyed);
            if(!te.length) return;
            showTargetModal(te, t => {
                roomRef.child('players').child(t).update({ evilEyed: true });
                appendChat(`🧿 ${m.name} наслал Сглаз на ${players[t].name}!`, 'system');
            });
            break;
        case 'sacrifice':
            if(m.poisons >= (m.maxLives || 3) && !confirm('⚠️ ВЫ УМРЁТЕ! Это даст +1 яд (смерть). Вы уверены?')) return;
            if(!confirm('⚠️ Вы получите +1 яд. Эффект активируется после. Вы уверены?')) return;
            showEffectModal(eff => {
                applyPoison(myUid, 1, 'Жертвоприношение');
                if(eff.id === 'shield') {
                    roomRef.child('players').child(myUid).update({ devilShield: true, devilShieldRound: roundNumber });
                } else if(eff.id === 'reroll') {
                    Object.keys(players).forEach(u => {
                        if(players[u]?.alive && !players[u]?.isGhost && !players[u]?.frozen) {
                            const newDice = Array(5).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
                            roomRef.child('players').child(u).update({ dice: newDice, evilEyed: false });
                        }
                    });
                    appendChat(`💀 ${m.name} принёс жертву: переброс кубиков стола!`, 'system');
                } else if(eff.id === 'forceBluff') {
                    const nx = getNextPlayerUid();
                    if(nx) roomRef.child('players').child(nx).update({ forcedBluff: true });
                    appendChat(`💀 ${m.name} принёс жертву: следующий игрок обязан повысить ставку!`, 'system');
                }
            });
            break;
        case 'circus':
            const cc = Object.keys(players).filter(u => u !== myUid && players[u]?.alive && !players[u]?.isGhost && !players[u]?.frozen && players[u].dice.length >= 2 && m.dice.length >= 2);
            if(!cc.length) return showNotification('Нет подходящих целей (у обоих ≥2 кубиков, не заморожены)', 'warning');
            showTargetModal(cc, t => {
                let myDice = [...m.dice];
                let taDice = [...players[t].dice];
                let mi1 = Math.floor(Math.random() * myDice.length);
                let mi2 = Math.floor(Math.random() * myDice.length);
                while(mi2 === mi1) mi2 = Math.floor(Math.random() * myDice.length);
                let ti1 = Math.floor(Math.random() * taDice.length);
                let ti2 = Math.floor(Math.random() * taDice.length);
                while(ti2 === ti1) ti2 = Math.floor(Math.random() * taDice.length);
                [myDice[mi1], taDice[ti1]] = [taDice[ti1], myDice[mi1]];
                [myDice[mi2], taDice[ti2]] = [taDice[ti2], myDice[mi2]];
                roomRef.child('players').child(myUid).update({ dice: myDice });
                roomRef.child('players').child(t).update({ dice: taDice });
                appendChat(`🎪 ${m.name} обменялся кубиками с ${players[t].name}!`, 'system');
            });
            break;
        case 'sniper':
            if(sniperShotUsedThisRound) return showNotification('Отстрел уже использован в этом раунде!', 'warning');
            showDynamicNominalModal(n => {
                if(lastBet && lastBet.value === n) return showNotification('Нельзя отстрелить номинал текущей ставки!', 'warning');
                Object.keys(players).forEach(u => {
                    if(players[u]?.frozen) return;
                    const nd = players[u].dice.filter(d => d !== n);
                    if(nd.length !== players[u].dice.length) {
                        roomRef.child('players').child(u).update({ dice: nd });
                    }
                });
                sniperShotUsedThisRound = true;
                roomRef.child('players').child(myUid).update({ sniperShotUsedThisRound: true, cannotAccuse: true });
                appendChat(`🔫 ${m.name} отстрелил все кубики номинала ${getDieEmoji(n)}!`, 'system');
            });
            break;
    }
    if(art.type === 'active') {
        usedSpecialThisRound[id] = true;
        roomRef.child('players').child(myUid).update({ usedSpecialThisRound: usedSpecialThisRound });
    }
    playSound('artifact');
}

function getNextPlayerUid() {
    const a = Object.keys(players).filter(u => players[u]?.alive && !players[u]?.isGhost);
    if(!a.length) return null;
    const i = a.indexOf(lastBet?.player);
    return a[(i + 1) % a.length];
}

function showTargetModal(uids, cb) {
    const l = document.getElementById('modalTargetList');
    if(!l) return;
    l.innerHTML = '';
    uids.forEach(u => {
        const p = players[u];
        if(!p || !p.name) return;
        const b = document.createElement('button');
        b.className = 'select-item';
        b.style.width = '100%';
        b.textContent = p.name + (p.isGhost ? ' 👻' : '');
        b.onclick = () => {
            cb(u);
            closeModal('modalTarget');
        };
        l.appendChild(b);
    });
    const modal = document.getElementById('modalTarget');
    if(modal) modal.style.display = 'block';
}

function showTargetModalFirst(uids, cb) {
    const l = document.getElementById('modalTargetList');
    if(!l) return;
    l.innerHTML = '';
    uids.forEach(u => {
        const p = players[u];
        if(!p || !p.name) return;
        const b = document.createElement('button');
        b.className = 'select-item';
        b.style.width = '100%';
        b.textContent = p.name + (p.isGhost ? ' 👻' : '');
        b.onclick = () => {
            cb(u);
            closeModal('modalTarget');
        };
        l.appendChild(b);
    });
    const modal = document.getElementById('modalTarget');
    if(modal) modal.style.display = 'block';
}

function showNominalModal(cb) {
    const l = document.getElementById('modalNominalList');
    if(!l) return;
    l.innerHTML = '';
    for(let i = 1; i <= 6; i++) {
        const b = document.createElement('button');
        b.className = 'select-item';
        b.textContent = getDieEmoji(i);
        b.style.width = '60px';
        b.style.height = '60px';
        b.style.fontSize = '1.8em';
        b.onclick = () => {
            cb(i);
            closeModal('modalNominal');
        };
        l.appendChild(b);
    }
    const modal = document.getElementById('modalNominal');
    if(modal) modal.style.display = 'block';
}

function showDynamicNominalModal(cb) {
    const l = document.getElementById('modalNominalList');
    if(!l) return;
    const iv = setInterval(() => {
        l.innerHTML = '';
        for(let i = 1; i <= 6; i++) {
            const b = document.createElement('button');
            b.className = 'select-item';
            b.textContent = getDieEmoji(i);
            b.style.width = '60px';
            b.style.height = '60px';
            b.style.fontSize = '1.8em';
            if(lastBet && lastBet.value === i) {
                b.style.opacity = '0.3';
                b.style.cursor = 'not-allowed';
                b.disabled = true;
            } else {
                b.onclick = () => {
                    cb(i);
                    closeModal('modalNominal');
                    clearInterval(iv);
                };
            }
            l.appendChild(b);
        }
    }, 200);
    const modal = document.getElementById('modalNominal');
    if(modal) modal.style.display = 'block';
}

function showEffectModal(cb) {
    const ef = [
        {id:'shield', name:'🛡️ Щит Дьявола (Блок 1 яда до конца раунда)'},
        {id:'reroll', name:'🔁 Переброс кубиков стола (кроме замороженных)'},
        {id:'forceBluff', name:'🎭 Принудительный блеф следующего игрока'}
    ];
    const l = document.getElementById('modalEffectList');
    if(!l) return;
    l.innerHTML = '';
    ef.forEach(e => {
        const b = document.createElement('button');
        b.className = 'select-item';
        b.style.width = '100%';
        b.style.marginBottom = '8px';
        b.textContent = e.name;
        b.style.whiteSpace = 'normal';
        b.style.lineHeight = '1.4';
        b.onclick = () => {
            cb(e);
            closeModal('modalEffect');
        };
        l.appendChild(b);
    });
    const modal = document.getElementById('modalEffect');
    if(modal) modal.style.display = 'block';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
}

function resetGame() {
    if(!isHost) {
        showNotification('Только создатель комнаты может сбросить игру', 'warning');
        return;
    }
    gameState = 'lobby';
    roundNumber = 0;
    lastBet = null;
    currentPlayerUid = null;
    thiefUsedThisRound = false;
    sniperShotUsedThisRound = false;
    usedSpecialThisRound = {};
    artifactHistory = [];
    blood = 0;
    const updates = {};
    Object.keys(players).forEach(uid => {
        const p = players[uid];
        if(p) {
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
            if(p.isBot) updates[`players/${uid}/botDifficulty`] = botDifficulty;
        }
    });
    updates.state = 'lobby';
    updates.round = 0;
    updates.lastBet = null;
    updates.artifactHistory = [];
    roomRef.update(updates);
    appendChat(`🔄 Игра сброшена в лобби создателем комнаты`, 'system');
}

function bindEventListeners() {
    const hm = document.getElementById('hamburgerBtn');
    const dd = document.getElementById('dropdownMenu');
    if(hm) hm.onclick = () => {
        if(dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
        if(audioContext && audioContext.state === 'suspended') audioContext.resume();
    };
    document.addEventListener('click', e => {
        if(hm && dd && !hm.contains(e.target) && !dd.contains(e.target) && dd.style.display === 'block') dd.style.display = 'none';
    });
    const menuRules = document.getElementById('menuRules');
    if(menuRules) menuRules.onclick = () => {
        const modal = document.getElementById('modalRules');
        if(modal) modal.style.display = 'block';
        if(dd) dd.style.display = 'none';
    };
    const menuProfile = document.getElementById('menuProfile');
    if(menuProfile) menuProfile.onclick = () => {
        const nameInput = document.getElementById('profileNameInput');
        const uidSpan = document.getElementById('profileUid');
        const statusSpan = document.getElementById('profileStatus');
        if(nameInput) nameInput.value = myName;
        if(uidSpan) uidSpan.textContent = myUid;
        if(statusSpan) {
            statusSpan.textContent = isGhost ? 'Призрак' : 'Жив';
            statusSpan.style.color = isGhost ? '#cc00ff' : '#00ff88';
        }
        const avatarContainer = document.getElementById('avatarSelect');
        if(avatarContainer) {
            avatarContainer.innerHTML = '';
            AVATARS.forEach(av => {
                const btn = document.createElement('button');
                btn.textContent = av;
                btn.style.fontSize = '1.5em';
                btn.style.margin = '3px';
                btn.style.padding = '5px';
                btn.style.cursor = 'pointer';
                btn.style.background = myAvatar === av ? '#ffd700' : '#333';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.onclick = () => {
                    myAvatar = av;
                    document.querySelectorAll('#avatarSelect button').forEach(b => b.style.background = '#333');
                    btn.style.background = '#ffd700';
                };
                avatarContainer.appendChild(btn);
            });
        }
        const colorContainer = document.getElementById('colorSelect');
        if(colorContainer) {
            colorContainer.innerHTML = '';
            COLORS.forEach(col => {
                const btn = document.createElement('button');
                btn.textContent = '●';
                btn.style.color = col;
                btn.style.fontSize = '1.5em';
                btn.style.margin = '3px';
                btn.style.padding = '5px';
                btn.style.cursor = 'pointer';
                btn.style.background = myColor === col ? '#ffd700' : '#333';
                btn.style.border = 'none';
                btn.style.borderRadius = '5px';
                btn.onclick = () => {
                    myColor = col;
                    document.querySelectorAll('#colorSelect button').forEach(b => b.style.background = '#333');
                    btn.style.background = '#ffd700';
                };
                colorContainer.appendChild(btn);
            });
        }
        const modal = document.getElementById('modalProfile');
        if(modal) modal.style.display = 'block';
        if(dd) dd.style.display = 'none';
    };
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    if(btnSaveProfile) btnSaveProfile.onclick = saveProfile;
    const menuInvite = document.getElementById('menuInvite');
    if(menuInvite) menuInvite.onclick = () => {
        copyInviteLink();
        if(dd) dd.style.display = 'none';
    };
    const menuNewRoom = document.getElementById('menuNewRoom');
    if(menuNewRoom) menuNewRoom.onclick = () => {
        if(confirm('Создать новую комнату? Вы покинете текущую.')) {
            if(roomRef) {
                roomRef.child('players').child(myUid).onDisconnect().cancel();
            }
            newRoom();
            if(dd) dd.style.display = 'none';
        }
    };
    const menuKick = document.getElementById('menuKick');
    if(menuKick) menuKick.onclick = () => {
        startVoteKick();
        if(dd) dd.style.display = 'none';
    };
    const menuSound = document.getElementById('menuSound');
    if(menuSound) menuSound.onclick = () => {
        soundEnabled = !soundEnabled;
        menuSound.textContent = soundEnabled ? '🔊 Звук: ВКЛ' : '🔇 Звук: ВЫКЛ';
        if(dd) dd.style.display = 'none';
    };
    const menuArtifacts = document.getElementById('menuArtifacts');
    if(menuArtifacts) menuArtifacts.onclick = () => {
        if(gameState !== 'lobby') return showNotification('Только в лобби!', 'warning');
        specialDiceEnabled = !specialDiceEnabled;
        menuArtifacts.textContent = `🎲 Артефакты: ${specialDiceEnabled ? '✅' : '❌'}`;
        roomRef.child('settings').update({ specialDiceEnabled: specialDiceEnabled });
        if(dd) dd.style.display = 'none';
    };
   const menuLives = document.getElementById('menuLives');
if(menuLives) menuLives.onclick = () => {
    if(gameState !== 'lobby') return showNotification('Только в лобби!', 'warning');
    const o = [3,4,5,6,2];
    defaultLives = o[(o.indexOf(defaultLives) + 1) % o.length];
    menuLives.textContent = `❤️ Жизни: ${defaultLives}`;
    // СОХРАНЯЕМ В FIREBASE
    roomRef.child('settings').update({ defaultLives: defaultLives });
    // ОБНОВЛЯЕМ У ВСЕХ ИГРОКОВ В ЛОББИ
    Object.keys(players).forEach(uid => {
        if(players[uid] && !players[uid].isBot) {
            roomRef.child('players').child(uid).update({ maxLives: defaultLives });
        }
    });
    if(dd) dd.style.display = 'none';
};
    
    const btnStartGame = document.getElementById('btnStartGame');
    if(btnStartGame) btnStartGame.onclick = () => {
        if(gameState !== 'lobby') {
            showNotification('Игра уже идёт!', 'warning');
            return;
        }
        const aliveCount = Object.keys(players).filter(uid => players[uid] && (players[uid].alive || !players[uid].isGhost) && !players[uid].isBot).length;
        const botCountTotal = Object.keys(players).filter(uid => players[uid] && players[uid].isBot).length;
        if((aliveCount >= 1 && botCountTotal >= 1) || aliveCount >= 2) {
            startNewRound();
        } else {
            showNotification('Нужен хотя бы 1 игрок и 1 бот, или 2 игрока', 'warning');
        }
        if(dd) dd.style.display = 'none';
    };
    const btnResetGame = document.getElementById('btnResetGame');
    if(btnResetGame) btnResetGame.onclick = () => {
        if(confirm('Сбросить игру в лобби?')) resetGame();
    };
    const btnPlaceBet = document.getElementById('btnPlaceBet');
    if(btnPlaceBet) btnPlaceBet.onclick = placeBet;
    const btnAccuse = document.getElementById('btnAccuse');
    if(btnAccuse) btnAccuse.onclick = accuse;
    const btnSendChat = document.getElementById('btnSendChat');
    if(btnSendChat) btnSendChat.onclick = () => {
        const msg = document.getElementById('chatInput')?.value.trim();
        if(msg) {
            roomRef.child('chat').push({ sender: myName, text: msg, type: 'normal', timestamp: Date.now() });
            const input = document.getElementById('chatInput');
            if(input) input.value = '';
        }
    };
    const chatInput = document.getElementById('chatInput');
    if(chatInput) chatInput.onkeypress = e => {
        if(e.key === 'Enter') btnSendChat?.click();
    };
    const ghVengeance = document.getElementById('ghVengeance');
    if(ghVengeance) ghVengeance.onclick = () => useGhostAbility('oathOfVengeance');
    const ghFamiliarCurse = document.getElementById('ghFamiliarCurse');
    if(ghFamiliarCurse) ghFamiliarCurse.onclick = () => useGhostAbility('familiarCurse');
    const ghPoltergeist = document.getElementById('ghPoltergeist');
    if(ghPoltergeist) ghPoltergeist.onclick = () => useGhostAbility('poltergeist');
    const ghKeeper = document.getElementById('ghKeeper');
    if(ghKeeper) ghKeeper.onclick = () => useGhostAbility('keeperOfSecrets');
    const ghReaper = document.getElementById('ghReaper');
    if(ghReaper) ghReaper.onclick = () => useGhostAbility('soulReaper');
    const voteYes = document.getElementById('voteYes');
    if(voteYes) voteYes.onclick = () => castVote('yes');
    const voteNo = document.getElementById('voteNo');
    if(voteNo) voteNo.onclick = () => castVote('no');
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = function() {
        const modal = this.closest('.modal');
        if(modal) modal.style.display = 'none';
    });
    window.onclick = e => {
        if(e.target.classList.contains('modal')) e.target.style.display = 'none';
    };
    const menuBotAdd = document.getElementById('menuBotAdd');
    if(menuBotAdd) menuBotAdd.onclick = () => {
        addBot();
        if(dd) dd.style.display = 'none';
    };
    const menuBotRemoveAll = document.getElementById('menuBotRemoveAll');
    if(menuBotRemoveAll) menuBotRemoveAll.onclick = () => {
        removeAllBots();
        if(dd) dd.style.display = 'none';
    };
    const menuBotDifficulty = document.getElementById('menuBotDifficulty');
    if(menuBotDifficulty) menuBotDifficulty.onclick = (e) => {
        e.stopPropagation();
        let next = (botDifficulty + 1) % 4;
        setBotDifficulty(next);
        if(dd) dd.style.display = 'none';
    };
}

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    let name = localStorage.getItem('ld_playerName');
    if(!name) {
        name = prompt('Введите ваше имя:', 'Игрок' + Math.floor(Math.random() * 900 + 100));
        if(!name) name = 'Игрок';
        localStorage.setItem('ld_playerName', name);
    }
    myName = name;
    myAvatar = localStorage.getItem('ld_avatar') || '🎲';
    myColor = localStorage.getItem('ld_color') || '#ffffff';
    if(roomFromUrl) {
        currentRoomId = roomFromUrl;
        document.getElementById('roomIdDisplay').textContent = currentRoomId;
        enterRoom(currentRoomId);
    } else {
        createRoom();
    }
    setupAudioContext();
    bindEventListeners();
};

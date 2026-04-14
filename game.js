let room = null;
let myId = null;
let myName = '';
let currentRoomId = '';
let players = {};
let gameState = 'lobby';
let lastBet = null;
let roundNumber = 0;
let isGhost = false;
let myTurn = false;
let currentPlayerUid = null;
let devilDealData = null;
let accusationTimer = null;
let devilDealTimer = null;
let soundEnabled = true;
let audioContext = null;
let defaultLives = 3;
let specialDiceEnabled = true;
let usedSpecialThisRound = {};
let artifactHistory = [];
let spyMemory = {};
let bots = {};
let isBotThinking = false;
let thiefUsedThisRound = false;
let sniperShotUsedThisRound = false;
let blood = 0;
let devilDealsUsed = 0;
let ghostTarget = null;
let voteTimerInterval = null;
let currentVoteTarget = null;
let lastVoteEndTime = 0;
let botDifficulty = 2;
let botDifficultyNames = ['Легкий', 'Средний', 'Сложный', 'Эксперт'];
let expertKnownDice = {};
let isHost = false;
let hostId = null;
let myIP = null;
let myPort = 9000;
const VOTE_COOLDOWN = 120000;

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
function showNotification(msg, type='info') { const tt={error:'❌ Ошибка',warning:'⚠️ Внимание',success:'✅ Успех',info:'ℹ️ Инфо'}; document.getElementById('notifyTitle').textContent=tt[type]||'ℹ️ Уведомление'; document.getElementById('notifyMessage').textContent=msg; document.getElementById('modalNotify').style.display='block'; }
function appendChat(msg, t='normal') { const e=document.createElement('div'); e.className=`chat-msg msg-${t}`; e.textContent=msg; const log=document.getElementById('chatLog'); log.insertBefore(e,log.firstChild); if(log.children.length>60) log.removeChild(log.lastChild); }
function playSound(type) { if(!soundEnabled||!audioContext) return; try{ const o=audioContext.createOscillator(),g=audioContext.createGain(); o.connect(g); g.connect(audioContext.destination); const n=audioContext.currentTime; const p={bet:[440,220,0.1,'square'],accuse:[880,440,0.3,'sawtooth'],poison:[300,150,0.2,'sine'],death:[220,110,0.5,'sine'],devil:[150,100,0.4,'sawtooth'],devilWin:[440,880,0.3,'square'],devilLose:[200,100,0.4,'sawtooth'],ghost:[660,880,0.3,'sine'],resurrection:[330,990,0.6,'sine'],artifact:[523,784,0.2,'square'],round:[440,880,0.3,'square'],blood:[392,523,0.2,'sine'],win:[523,659,784,1046,0.8,'square']}[type]||[440,220,0.1,'sine']; if(type==='win'){ p.forEach((f,i)=>{ const oc=audioContext.createOscillator(),gc=audioContext.createGain(); oc.connect(gc); gc.connect(audioContext.destination); oc.frequency.value=f; oc.type='square'; gc.gain.setValueAtTime(0.2,n+i*0.1); gc.gain.exponentialRampToValueAtTime(0.01,n+i*0.1+0.3); oc.start(n+i*0.1); oc.stop(n+i*0.1+0.3); }); }else{ o.frequency.setValueAtTime(p[0],n); o.frequency.exponentialRampToValueAtTime(p[1],n+p[2]); o.type=p[3]; g.gain.setValueAtTime(0.2,n); g.gain.exponentialRampToValueAtTime(0.01,n+p[2]); o.start(n); o.stop(n+p[2]); } }catch(e){} }

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for(let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

async function getExternalIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch(e) {
        console.error('Не удалось получить IP:', e);
        return null;
    }
}

function createRoom() {
    if(room) {
        appendChat('⚠️ Вы уже в комнате. Сначала закройте её.', 'system');
        return;
    }
    const roomId = generateRoomId();
    currentRoomId = roomId;
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
    document.getElementById('roomIdDisplay').innerHTML = `ID комнаты: ${roomId}`;
    initPeerAsHost();
}

async function initPeerAsHost() {
    myId = 'host_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    room = new Peer(myId);
    room.on('open', async () => {
        isHost = true;
        hostId = myId;
        myIP = await getExternalIP();
        if(!myIP) {
            appendChat('⚠️ Не удалось определить ваш IP. Используйте локальный IP или проверьте подключение.', 'system');
            myIP = 'localhost';
        }
        const inviteLink = `${window.location.origin}${window.location.pathname}?connect=${myIP}:${myPort}&room=${currentRoomId}`;
        document.getElementById('connectionStatus').innerHTML = `✅ Хост | IP: ${myIP}:${myPort}`;
        appendChat(`🏠 Вы создали комнату ${currentRoomId}`, 'system');
        appendChat(`🔗 Ваша ссылка-приглашение: ${inviteLink}`, 'system');
        showNotification(`Комната создана!`, 'success');
        players[myId] = {
            id: myId, name: myName, dice: [], poisons: 0, blood: 0, alive: true, isGhost: false,
            artifact: null, maxLives: defaultLives, isBot: false, usedSpecialThisRound: {},
            lastBetInRound: null, cursed: false, frozen: false, defenderActive: false,
            stunned: false, blind: false, darkPact: false, darkPactShield: false,
            devilShield: false, evilEyed: false, forcedBluff: false, cannotAccuse: false,
            sniperShotUsedThisRound: false, familiarCursed: false, usedAbilities: {}, devilDealsUsed: 0
        };
        renderUI();
        room.on('connection', (conn) => {
            setupConnection(conn);
        });
        room.on('disconnected', () => {
            appendChat('❌ Вы отключились от сети. Перезагрузите страницу.', 'death');
        });
        room.on('close', () => {
            appendChat('🔌 Соединение закрыто. Комната удалена.', 'system');
        });
    });
    room.on('error', (err) => {
        console.error(err);
        appendChat(`❌ Ошибка: ${err.type}`, 'death');
        if(err.type === 'unavailable-id' || err.type === 'peer-unavailable') {
            setTimeout(() => initPeerAsHost(), 1000);
        }
    });
}

function joinRoomByIP(address) {
    if(room) {
        appendChat('⚠️ Вы уже в комнате.', 'system');
        return;
    }
    const [ip, port] = address.split(':');
    if(!ip || !port) {
        showNotification('Неверный формат. Используйте IP:порт', 'error');
        return;
    }
    myId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    room = new Peer(myId);
    room.on('open', () => {
        const hostPeerId = 'host_' + currentRoomId.split('_')[0]; 
        const conn = room.connect(hostPeerId, { reliable: true });
        if(conn) {
            setupConnection(conn);
            document.getElementById('connectionStatus').innerHTML = `🔗 Подключение к ${ip}:${port}`;
            appendChat(`🔌 Подключение к хосту...`, 'system');
        } else {
            appendChat(`❌ Не удалось подключиться к ${ip}:${port}`, 'death');
        }
    });
    room.on('error', (err) => {
        console.error(err);
        appendChat(`❌ Ошибка подключения: ${err.type}`, 'death');
        showNotification('Не удалось подключиться. Проверьте IP и порт.', 'error');
    });
}

function setupConnection(conn) {
    conn.on('open', () => {
        appendChat(`✅ Подключено к хосту`, 'system');
        conn.send({ type: 'init', playerId: myId, name: myName, gameState: gameState, roundNumber: roundNumber });
        window.gameConn = conn;
        conn.on('data', (data) => handlePeerData(data, conn.peer));
        conn.on('close', () => {
            appendChat(`🔌 Соединение с хостом потеряно`, 'system');
            if(!isHost) {
                appendChat(`❌ Хост отключился. Игра окончена. Создайте новую комнату.`, 'death');
                showNotification('Хост отключился. Игра окончена.', 'error');
                resetGameLocally();
            }
        });
    });
}

function handlePeerData(data, peerId) {
    if(data.type === 'init') {
        if(!players[data.playerId]) {
            let isNewPlayerGhost = (gameState !== 'lobby');
            players[data.playerId] = {
                id: data.playerId, name: data.name, dice: isNewPlayerGhost ? [] : Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1),
                poisons: 0, blood: 0, alive: !isNewPlayerGhost, isGhost: isNewPlayerGhost,
                artifact: null, maxLives: defaultLives, isBot: false, usedSpecialThisRound: {},
                lastBetInRound: null, cursed: false, frozen: false, defenderActive: false,
                stunned: false, blind: false, darkPact: false, darkPactShield: false,
                devilShield: false, evilEyed: false, forcedBluff: false, cannotAccuse: false,
                sniperShotUsedThisRound: false, familiarCursed: false, usedAbilities: {}, devilDealsUsed: 0
            };
            if(isNewPlayerGhost) appendChat(`👻 ${data.name} подключился и стал призраком`, 'system');
            else appendChat(`🎉 ${data.name} присоединился к игре`, 'system');
            renderUI();
            if(isHost) {
                gameConn.send({ type: 'fullState', players: players, gameState: gameState, lastBet: lastBet, roundNumber: roundNumber, currentPlayerUid: currentPlayerUid, defaultLives: defaultLives, specialDiceEnabled: specialDiceEnabled, artifactHistory: artifactHistory, blood: blood, usedSpecialThisRound: usedSpecialThisRound, thiefUsedThisRound: thiefUsedThisRound, sniperShotUsedThisRound: sniperShotUsedThisRound });
            }
        }
    } else if(data.type === 'fullState' && !isHost) {
        players = data.players;
        gameState = data.gameState;
        lastBet = data.lastBet;
        roundNumber = data.roundNumber;
        currentPlayerUid = data.currentPlayerUid;
        defaultLives = data.defaultLives;
        specialDiceEnabled = data.specialDiceEnabled;
        artifactHistory = data.artifactHistory;
        blood = data.blood;
        usedSpecialThisRound = data.usedSpecialThisRound || {};
        thiefUsedThisRound = data.thiefUsedThisRound || false;
        sniperShotUsedThisRound = data.sniperShotUsedThisRound || false;
        renderUI();
    } else if(data.type === 'bet') {
        if(gameState === 'betting' && currentPlayerUid === peerId) {
            lastBet = data.bet;
            players[peerId].lastBetInRound = lastBet;
            renderUI();
            nextTurn();
        }
    } else if(data.type === 'accuse') {
        if(gameState === 'betting' && currentPlayerUid === peerId && lastBet && lastBet.player !== peerId) {
            resolveAccusation(data.accusedUid);
        }
    } else if(data.type === 'startGame') {
        if(gameState === 'lobby' && Object.keys(players).length >= 2) startNewRound();
    } else if(data.type === 'resetGame') {
        if(isHost) resetGame();
    } else if(data.type === 'chat') {
        appendChat(`${data.name}: ${data.text}`, 'normal');
    } else if(data.type === 'addBot') {
        if(isHost) addBotWithData(data.botData);
    } else if(data.type === 'removeAllBots') {
        if(isHost) removeAllBots();
    } else if(data.type === 'syncGameState') {
        if(data.fullState) {
            players = data.fullState.players;
            gameState = data.fullState.gameState;
            lastBet = data.fullState.lastBet;
            roundNumber = data.fullState.roundNumber;
            currentPlayerUid = data.fullState.currentPlayerUid;
            renderUI();
        }
    }
}

function sendToAll(type, data) {
    if(isHost && gameConn) {
        for(let pid in players) {
            if(pid !== myId && !players[pid].isBot) {
                try { gameConn.send({ type: type, ...data }); } catch(e) {}
            }
        }
    } else if(gameConn) {
        try { gameConn.send({ type: type, ...data }); } catch(e) {}
    }
}

function resetGame() {
    if(!isHost) { showNotification('Только хост может сбросить игру', 'warning'); return; }
    gameState = 'lobby';
    roundNumber = 0;
    lastBet = null;
    currentPlayerUid = null;
    thiefUsedThisRound = false;
    sniperShotUsedThisRound = false;
    usedSpecialThisRound = {};
    artifactHistory = [];
    blood = 0;
    for(let uid in players) {
        let p = players[uid];
        p.poisons = 0;
        p.blood = 0;
        p.alive = true;
        p.isGhost = false;
        p.artifact = null;
        p.dice = [];
        p.usedSpecialThisRound = {};
        p.lastBetInRound = null;
        p.cursed = false;
        p.frozen = false;
        p.defenderActive = false;
        p.stunned = false;
        p.blind = false;
        p.darkPact = false;
        p.darkPactShield = false;
        p.devilShield = false;
        p.evilEyed = false;
        p.forcedBluff = false;
        p.cannotAccuse = false;
        p.sniperShotUsedThisRound = false;
        p.familiarCursed = false;
        p.usedAbilities = {};
        p.devilDealsUsed = 0;
        if(p.isBot) p.botDifficulty = botDifficulty;
    }
    renderUI();
    appendChat(`🔄 Игра сброшена в лобби хостом`, 'system');
    sendToAll('resetGame', {});
    sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
}

function resetGameLocally() {
    gameState = 'lobby';
    roundNumber = 0;
    lastBet = null;
    currentPlayerUid = null;
    players = {};
    bots = {};
    renderUI();
}

function addBot() {
    if(!isHost) { showNotification('Только хост может добавлять ботов', 'warning'); return; }
    if(gameState !== 'lobby' && gameState !== 'ended') { showNotification('Можно добавлять ботов только в лобби или после окончания игры','warning'); return; }
    const botId='bot_'+Date.now()+'_'+Math.random().toString(36).substring(2,6);
    const botName='🤖 '+botDifficultyNames[botDifficulty];
    const botData = {
        id: botId, name: botName, dice: [], poisons: 0, blood: 0, alive: true, isGhost: false, artifact: null, maxLives: defaultLives, isBot: true,
        usedSpecialThisRound: {}, lastBetInRound: null, cursed: false, frozen: false, defenderActive: false,
        stunned: false, blind: false, darkPact: false, darkPactShield: false, devilShield: false, evilEyed: false,
        forcedBluff: false, cannotAccuse: false, sniperShotUsedThisRound: false, familiarCursed: false,
        usedAbilities: {}, botDifficulty: botDifficulty, devilDealsUsed: 0
    };
    bots[botId] = { difficulty: botDifficulty, knownDice: {} };
    players[botId] = botData;
    renderUI();
    appendChat(`🤖 ${botName} присоединился к игре`, 'system');
    sendToAll('addBot', { botData: botData });
}

function addBotWithData(botData) {
    if(players[botData.id]) return;
    bots[botData.id] = { difficulty: botData.botDifficulty, knownDice: {} };
    players[botData.id] = botData;
    renderUI();
    appendChat(`🤖 ${botData.name} присоединился к игре`, 'system');
}

function removeAllBots() {
    if(!isHost) { showNotification('Только хост может удалять ботов', 'warning'); return; }
    if(gameState !== 'lobby' && gameState !== 'ended') { showNotification('Можно удалять ботов только в лобби или после окончания игры','warning'); return; }
    for(let botId in bots) delete players[botId];
    bots = {};
    expertKnownDice = {};
    renderUI();
    appendChat(`🤖 Все боты удалены`, 'system');
    sendToAll('removeAllBots', {});
}

function setBotDifficulty(level) {
    botDifficulty = level;
    document.getElementById('botDifficultyLabel').innerText = botDifficultyNames[level];
    appendChat(`Сложность новых ботов изменена на ${botDifficultyNames[level]}`, 'system');
}

function copyInviteLink() {
    if(!isHost) {
        showNotification('Только хост может приглашать друзей. Сначала создайте комнату!', 'warning');
        return;
    }
    const inviteLink = `${window.location.origin}${window.location.pathname}?connect=${myIP}:${myPort}&room=${currentRoomId}`;
    navigator.clipboard.writeText(inviteLink);
    showNotification('Ссылка-приглашение скопирована!', 'success');
    appendChat(`🔗 Ссылка скопирована: ${inviteLink}`, 'system');
}

function showJoinIPModal() {
    const modal = document.getElementById('modalJoinIP');
    modal.style.display = 'block';
    document.getElementById('connectIPBtn').onclick = () => {
        const address = document.getElementById('ipAddressInput').value.trim();
        if(!address) { showNotification('Введите IP:порт', 'warning'); return; }
        modal.style.display = 'none';
        const urlParams = new URLSearchParams(window.location.search);
        const roomIdFromUrl = urlParams.get('room');
        if(roomIdFromUrl) currentRoomId = roomIdFromUrl;
        else currentRoomId = generateRoomId();
        joinRoomByIP(address);
    };
}

function updateExpertKnowledge(botId, targetId, newDice) {
    if(bots[botId]?.difficulty !== 3) return;
    if(!expertKnownDice[botId]) expertKnownDice[botId] = {};
    let indices = [0,1,2,3,4];
    for(let i=indices.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [indices[i],indices[j]]=[indices[j],indices[i]]; }
    let knownIndices = indices.slice(0,4);
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
        let variance = Math.sqrt(totalPossible * (1/6)*(5/6));
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
        sendToAll('accuse', { accusedUid: lastBet.player });
        let msgs = ['Думаешь, я поведусь?', 'Это явный блеф!', 'Я знаю твои кубики!', 'Слишком рискованно, проверяем!', 'Вскрывайся, лжец!'];
        if(Math.random()<0.3 && difficulty===3) appendChat(`🤖 ${bot.name}: ${msgs[Math.floor(Math.random()*msgs.length)]}`, 'system');
        else appendChat(`🤖 ${bot.name} обвиняет ${players[lastBet.player]?.name} в блефе!`, 'system');
        return;
    }
    let maxPossible = Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost).length * 5;
    let newCount, newValue;
    if(!lastBet) {
        if(difficulty === 0) {
            newCount = Math.floor(Math.random() * maxPossible) + 1;
            newValue = Math.floor(Math.random() * 6) + 1;
        } else {
            let myBest = getBestValue(bot.dice);
            newCount = Math.min(maxPossible, Math.max(1, myBest.count + (difficulty===1?0:Math.floor(Math.random()*3))));
            newValue = myBest.value;
        }
    } else {
        let myDice = bot.dice;
        let counts = {};
        for(let d of myDice) counts[d] = (counts[d]||0)+1;
        let bestValue = 1, bestCount = 0;
        for(let v=1;v<=6;v++) if(counts[v]>bestCount) { bestCount=counts[v]; bestValue=v; }
        let bluff = 0;
        if(difficulty === 0) bluff = Math.floor(Math.random()*5)-1;
        else if(difficulty === 1) bluff = Math.floor(Math.random()*3);
        else if(difficulty === 2) bluff = Math.floor(Math.random()*4);
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
        if(newValue > 6) { newValue = 1; newCount = Math.min(maxPossible, newCount+1); }
    }
    const betData = {player:botId,count:newCount,value:newValue,timestamp:Date.now()};
    sendToAll('bet', { bet: betData });
    appendChat(`🤖 ${bot.name} ставит ${newCount}×${getDieEmoji(newValue)}`, 'system');
}

function getBestValue(dice) {
    let counts={}; for(let d of dice) counts[d]=(counts[d]||0)+1;
    let best=1,bestCount=0;
    for(let v=1;v<=6;v++) if(counts[v]>bestCount) { bestCount=counts[v]; best=v; }
    return {count:bestCount, value:best};
}

function estimateTrueCount(value, botId) {
    let total = 0;
    for(let uid in players) {
        let p=players[uid];
        if(!p.alive||p.isGhost) continue;
        if(uid===botId) {
            total += p.dice.filter(d=>d===value).length;
        } else {
            let known = getKnownDiceForExpert(botId, uid);
            if(known) {
                for(let d of known) if(d===value) total++;
                let unknown = known.filter(d=>d===null).length;
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
    let targets = Object.keys(players).filter(u=>u!==botId && players[u]?.alive && !players[u]?.isGhost);
    if(targets.length===0) return false;
    let bestTarget = null;
    if(difficulty === 3) {
        if(art.id === 'target' || art.id === 'curse' || art.id === 'ice' || art.id === 'evilEye') {
            let mostPoisons = targets.sort((a,b)=>players[b].poisons - players[a].poisons)[0];
            bestTarget = mostPoisons;
        } else if(art.id === 'blessing') {
            if(bot.poisons > 0) bestTarget = botId;
            else bestTarget = targets.find(u=>players[u].poisons>0) || null;
        } else if(art.id === 'thief') {
            let withArt = targets.filter(u=>players[u].artifact);
            if(withArt.length) bestTarget = withArt[0];
        } else if(art.id === 'double') {
            let withLastBet = targets.filter(u=>players[u].lastBetInRound);
            if(withLastBet.length) bestTarget = withLastBet[0];
        } else if(art.id === 'sniper') {
            if(lastBet) bestTarget = null;
        }
    } else {
        bestTarget = targets[Math.floor(Math.random()*targets.length)];
    }
    if(!bestTarget && art.id !== 'fireball' && art.id !== 'luck') return false;
    if(art.id === 'target') {
        let vals = bot.dice;
        let commonVal = getBestValue(vals).value;
        let targetPlayer = players[bestTarget];
        let idx = targetPlayer.dice.indexOf(commonVal);
        if(idx!==-1) targetPlayer.dice.splice(idx,1);
        appendChat(`🤖 ${bot.name} использовал ${art.name} на ${targetPlayer.name}`, 'system');
    } else if(art.id === 'fireball' || art.id === 'luck') {
        let newDice = bot.dice.map(()=> art.id==='luck' ? (Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1) : Math.floor(Math.random()*6)+1);
        bot.dice = newDice;
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id === 'blessing') {
        if(bestTarget === botId) bot.poisons = Math.max(0, bot.poisons-1);
        else if(bestTarget) players[bestTarget].poisons = Math.max(0, players[bestTarget].poisons-1);
        appendChat(`🤖 ${bot.name} использовал ${art.name}`, 'system');
    } else if(art.id === 'thief' && bestTarget && players[bestTarget].artifact) {
        let stolen = players[bestTarget].artifact;
        bot.artifact = stolen;
        players[bestTarget].artifact = null;
        appendChat(`🤖 ${bot.name} украл ${stolen.emoji} у ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'curse' && bestTarget) {
        players[bestTarget].cursed = true;
        appendChat(`🤖 ${bot.name} проклял ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'ice' && bestTarget) {
        players[bestTarget].frozen = true;
        appendChat(`🤖 ${bot.name} заморозил ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'double' && bestTarget && players[bestTarget].lastBetInRound) {
        let lb = players[bestTarget].lastBetInRound;
        let nc=lb.count, nv=lb.value;
        let maxPossible = Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost).length*5;
        if(lastBet && (nc<lastBet.count || (nc===lastBet.count && nv<=lastBet.value))) {
            if(nc < maxPossible) nc++;
            else { nv=Math.min(6,nv+1); nc=1; }
        }
        lastBet={player:botId,count:nc,value:nv};
        bot.lastBetInRound=lastBet;
        sendToAll('bet', { bet: lastBet });
        appendChat(`🤖 ${bot.name} скопировал ставку ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'evilEye' && bestTarget) {
        players[bestTarget].evilEyed = true;
        appendChat(`🤖 ${bot.name} наслал сглаз на ${players[bestTarget].name}`, 'system');
    } else if(art.id === 'sniper') {
        return false;
    }
    bot.artifact = null;
    usedSpecialThisRound[art.id] = true;
    sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
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
    let ab = abilities[Math.floor(Math.random()*abilities.length)];
    if(ab.id === 'oathOfVengeance') {
        let targets = Object.keys(players).filter(u=>u!==botId && players[u]?.alive && !players[u]?.isGhost);
        if(targets.length) {
            let target = targets[0];
            if(difficulty === 3) target = targets.sort((a,b)=>players[b].poisons - players[a].poisons)[0];
            bot.ghostTarget = target;
            appendChat(`⚔️ Призрак ${bot.name} выбрал цель для Мести: ${players[target].name}`, 'ghost');
        }
    } else if(ab.id === 'familiarCurse') {
        let targets = Object.keys(players).filter(u=>u!==botId && players[u]?.alive && !players[u]?.isGhost);
        if(targets.length) {
            let target = targets[Math.floor(Math.random()*targets.length)];
            players[target].familiarCursed = true;
            appendChat(`🔮 Призрак ${bot.name} проклял ${players[target].name}`, 'ghost');
        }
    } else if(ab.id === 'poltergeist') {
        let alive = Object.keys(players).filter(u=>players[u]?.alive && !players[u]?.isGhost);
        if(alive.length) {
            let r = Math.random();
            if(r<0.33) {
                let t = alive[Math.floor(Math.random()*alive.length)];
                players[t].dice = Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
                appendChat(`🌀 Призрак ${bot.name} устроил саботаж ${players[t].name}`, 'ghost');
            } else if(r<0.66) {
                let t = alive[Math.floor(Math.random()*alive.length)];
                players[t].dice = Array(5).fill(6);
                appendChat(`🌀 Призрак ${bot.name} благословил ${players[t].name}`, 'ghost');
            } else {
                for(let u of alive) players[u].dice = Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
                appendChat(`🌀 Призрак ${bot.name} перемешал все кубики`, 'ghost');
            }
        }
    } else if(ab.id === 'keeperOfSecrets') {
        return;
    } else if(ab.id === 'soulReaper') {
        let killed = false;
        for(let uid in players) {
            let p=players[uid];
            if(p.alive && !p.isGhost && Math.random()<0.2) {
                let r = Math.random();
                if(r<0.1) { applyPoison(uid,1,'Жатва Душ'); killed=true; }
                else if(r<0.35 && p.artifact) p.artifact=null;
                else if(r<0.6 && p.poisons>0) p.poisons--;
                else if(r<0.85) p.stunned=true;
                else p.blind=true;
            }
        }
        if(killed) {
            bot.alive=true; bot.isGhost=false; bot.poisons=2; bot.blood=0; bot.dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
            appendChat(`💀 Призрак ${bot.name} воскрес благодаря Жатве Душ!`, 'ghost');
            playSound('resurrection');
        }
    }
    bot.usedAbilities = bot.usedAbilities || {};
    bot.usedAbilities[ab.id] = true;
    sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
}

function botTurn(botId) {
    if(isBotThinking) return;
    isBotThinking=true;
    setTimeout(()=>{
        if(gameState!=='betting' || currentPlayerUid!==botId) { isBotThinking=false; return; }
        let bot = players[botId];
        if(!bot || bot.isGhost) { isBotThinking=false; return; }
        if(bot.artifact && bot.artifact.type==='active' && botUseArtifact(botId)) { isBotThinking=false; nextTurn(); return; }
        if(bot.isGhost && botUseGhostAbility(botId)) { isBotThinking=false; nextTurn(); return; }
        botMakeDecision(botId);
        isBotThinking=false;
        nextTurn();
    }, [1000,800,500,200][bots[botId]?.difficulty ?? 2] + Math.random()*500);
}

function nextTurn() {
    if(gameState!=='betting') return;
    const aliveUids=Object.keys(players).filter(uid=>players[uid]?.alive&&!players[uid]?.isGhost);
    if(aliveUids.length===0) return;
    let idx=aliveUids.indexOf(currentPlayerUid);
    let nextIdx=(idx+1)%aliveUids.length;
    currentPlayerUid=aliveUids[nextIdx];
    renderUI();
    if(currentPlayerUid && players[currentPlayerUid]?.isBot && currentPlayerUid!==myId) botTurn(currentPlayerUid);
}

function renderUI() {
    updateGameStatus(); updateLastBetDisplay(); renderPlayerList(); renderDiceRow(); updateControls();
}

function updateGameStatus() {
    const cp=getCurrentPlayerName();
    switch(gameState){
        case'lobby': document.getElementById('gameStatusText').textContent='Лобби'; break;
        case'betting': document.getElementById('gameStatusText').textContent=`Раунд ${roundNumber} | Ход: ${cp}`; break;
        case'accusing': document.getElementById('gameStatusText').textContent='⚖️ Проверка ставки'; break;
        case'devil_deal': document.getElementById('gameStatusText').textContent='😈 Сделка с Дьяволом'; break;
        case'ended': const w=Object.values(players).find(p=>p?.alive&&!p.isGhost); document.getElementById('gameStatusText').textContent=w?`🏆 ${w.name} победил!`:'Ничья'; break;
    }
}

function getCurrentPlayerName(){ const u=getCurrentPlayerUid(); return u&&players[u]?players[u].name:'—'; }
function getCurrentPlayerUid(){ const au=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost); if(!au.length) return null; const li=au.indexOf(lastBet?.player); return au[(li+1)%au.length]; }
function updateLastBetDisplay(){ if(lastBet&&players[lastBet.player]){ const p=players[lastBet.player]; document.getElementById('lastBetDisplay').textContent=`${p.name}: ${lastBet.count}×${getDieEmoji(lastBet.value)}`; } else document.getElementById('lastBetDisplay').textContent='Последняя ставка: —'; }

function renderPlayerList() {
    const container=document.getElementById('playerList'); if(!container) return;
    container.innerHTML='';
    const cu=getCurrentPlayerUid();
    Object.keys(players).forEach(uid=>{
        const p=players[uid]; if(!p) return;
        const c=document.createElement('div'); c.className='player-card no-select';
        if(uid===cu && gameState==='betting' && !p.isGhost) c.classList.add('active');
        if(p.frozen) c.classList.add('frozen'); if(p.cursed) c.classList.add('cursed'); if(p.evilEyed && uid===myId) c.classList.add('evilEyed');
        const i=document.createElement('div'); i.className='player-info';
        const n=document.createElement('span'); const ls=Math.min(p.poisons,p.maxLives||3); n.className=`player-name shadow-${ls}`;
        n.textContent=p.name||'Игрок';
        if(p.isBot) {
            const diffSpan=document.createElement('span');
            diffSpan.className=`player-difficulty difficulty-${p.botDifficulty||2}`;
            diffSpan.textContent=botDifficultyNames[p.botDifficulty||2];
            n.appendChild(diffSpan);
        }
        if(p.isGhost) { const ghostSpan=document.createElement('span'); ghostSpan.textContent=' 👻'; n.appendChild(ghostSpan); }
        i.appendChild(n);
        const s=document.createElement('span'); s.className='sands-of-time'; s.textContent='⏳'; if(uid===cu && gameState==='betting' && !p.isGhost) s.style.display='inline'; i.appendChild(s);
        const pd=document.createElement('div'); pd.className='player-poisons'; const ml=p.maxLives||3, ts=ml+(p.blood||0);
        for(let j=0;j<ts;j++){ const sp=document.createElement('span'); if(p.isGhost){ sp.className='icon-ghost'; sp.textContent='👻'; } else if(!p.alive){ sp.className='icon-dead'; sp.textContent='💀'; } else if(j<ml && j<p.poisons){ sp.className='icon-poison'; sp.textContent='🫙'; } else if(j===ml && p.blood>0){ sp.className='icon-blood'; sp.textContent='🩸'; } else { sp.className='icon-life'; sp.textContent='🧪'; } pd.appendChild(sp); }
        const bs=document.createElement('span'); bs.className='player-last-bet'; bs.textContent=p.lastBetInRound?`${p.lastBetInRound.count}×${getDieEmoji(p.lastBetInRound.value)}`:'—';
        c.appendChild(i); c.appendChild(pd); c.appendChild(bs); container.appendChild(c);
    });
}

function renderDiceRow(){
    const container=document.getElementById('diceContainer'); if(!container) return;
    container.innerHTML='';
    if(gameState!=='betting' && gameState!=='accusing'){ container.style.display='none'; return; }
    container.style.display='flex';
    const m=players[myId]; if(!m) return;
    if(m.artifact){
        const a=document.createElement('div'); a.className=`die special ${m.artifact.type==='passive'?'passive':''}`; a.textContent=m.artifact.emoji;
        const infoBtn=document.createElement('div'); infoBtn.className='artifact-info-btn'; infoBtn.textContent='?'; infoBtn.onclick=()=>showArtifactInfo(m.artifact);
        container.appendChild(infoBtn); container.appendChild(a);
        if(!usedSpecialThisRound[m.artifact.id] || m.artifact.type==='passive') a.onclick=()=>useArtifact(m.artifact.id);
    }
    if(m.dice && m.dice.length) {
        m.dice.forEach(d=>{
            const s=document.createElement('div'); s.className='die';
            if(m.blind) s.textContent='?';
            else { const val=parseInt(d)||1; s.textContent=getDieEmoji(val); }
            if(m.frozen) s.classList.add('frozen'); if(m.stunned) s.classList.add('stunned');
            container.appendChild(s);
        });
    }
}

function showArtifactInfo(art){ document.getElementById('artifactInfoTitle').textContent=`${art.emoji} ${art.name}`; document.getElementById('artifactInfoDesc').innerHTML=`<strong>Тип:</strong> ${art.type==='active'?'Активный (1 раз за раунд)':'Пассивный (автоматически)'}<br><br><strong>Описание:</strong> ${art.description}`; document.getElementById('modalArtifactInfo').style.display='block'; }

function updateControls(){
    const mt=isMyTurn(), m=players[myId]||{};
    document.getElementById('betCount').disabled=!mt||isGhost;
    document.getElementById('betValue').disabled=!mt||isGhost;
    document.getElementById('btnPlaceBet').disabled=!mt||isGhost||gameState!=='betting';
    document.getElementById('btnAccuse').disabled=!mt||isGhost||gameState!=='betting'||!lastBet||lastBet.player===myId||m.cannotAccuse;
    const cc=!isGhost&&gameState!=='devil_deal';
    document.getElementById('chatInput').disabled=!cc; document.getElementById('btnSendChat').disabled=!cc;
    if(isGhost){
        document.getElementById('diceContainer').style.display='none';
        document.getElementById('controlsRow').style.display='none';
        document.getElementById('ghostAbilitiesPanel').style.display='flex';
        updateGhostButtons();
    }else{
        document.getElementById('ghostAbilitiesPanel').style.display='none';
        document.getElementById('controlsRow').style.display='flex';
        if(mt&&!isGhost&&gameState==='betting') populateBetSelects();
    }
}

function updateGhostButtons(){ const m=players[myId]||{},u=m.usedAbilities||{}; GHOST_ABILITIES.forEach(ab=>{ const b=document.getElementById('gh'+ab.id.charAt(0).toUpperCase()+ab.id.slice(1)); if(b){ const il=ab.limit==='once_per_ghost'&&u[ab.id]; b.disabled=il||gameState!=='betting'; b.textContent=il?`${ab.emoji} ${ab.name} (исп.)`:`${ab.emoji} ${ab.name}`; } }); }

function populateBetSelects(){
    const sel=document.getElementById('betCount'); if(!sel) return;
    sel.innerHTML='<option value="">—</option>';
    const mp=Math.max(Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost).length*5,1);
    for(let i=1;i<=mp;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; sel.appendChild(o); }
    sel.value=lastBet?Math.min(lastBet.count+1,mp):1;
}

function isMyTurn(){ if(isGhost||gameState!=='betting') return false; const au=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost); if(!au.length) return false; const li=au.indexOf(lastBet?.player); return au.indexOf(myId)===(li+1)%au.length; }

function placeBet(){
    const c=parseInt(document.getElementById('betCount').value), v=parseInt(document.getElementById('betValue').value), m=players[myId];
    if(!m||isNaN(c)||isNaN(v)) return;
    if(lastBet && (c<lastBet.count || (c===lastBet.count && v<=lastBet.value))) return showNotification('Ставка должна быть выше предыдущей!','warning');
    if(m.forcedBluff){ const needCount=lastBet.count+3; const needValue=lastBet.value+1; if(c<needCount||(c===needCount&&v<needValue)) return showNotification(`Вы обязаны сделать ставку выше (минимум ${needCount}×${getDieEmoji(needValue)})`,'warning'); }
    const nb={player:myId,count:c,value:v,timestamp:Date.now()};
    lastBet=nb; players[myId].lastBetInRound=nb;
    if(m.cursed) players[myId].cursed=false;
    if(m.forcedBluff) players[myId].forcedBluff=false;
    sendToAll('bet', { bet: nb });
    renderUI(); nextTurn(); playSound('bet');
}

function accuse(){
    if(!lastBet||lastBet.player===myId) return;
    const t=players[lastBet.player]?.name||'Противник', p=[`${myName} бьёт по столу: "${t}, ложь!"`,`"${t}, вскрывайся!" — ${myName}`,`${myName} указывает: "${t}, блеф!"`,`"Не верю!" — ${myName} нацелился на ${t}`];
    document.getElementById('accusationPhrase').textContent=p[Math.floor(Math.random()*p.length)];
    document.getElementById('accusationResult').textContent='Проверка кубиков...';
    document.getElementById('accusationResult').className='accusation-result';
    document.getElementById('accusationEffects').innerHTML='<h4 style="margin:5px 0; color:#ffd700;">📋 Эффекты:</h4>';
    let ct={1:0,2:0,3:0,4:0,5:0,6:0};
    Object.values(players).forEach(p=>{ if(p?.alive&&!p.isGhost) p.dice.forEach(d=>ct[parseInt(d)||1]++); });
    const sm=Object.keys(ct).filter(k=>ct[k]>0).map(k=>`${ct[k]}x${getDieEmoji(k)}`).join('  ');
    document.getElementById('accusationDiceSummary').textContent=`📊 Всего на столе: ${sm||'Нет кубиков'}`;
    document.getElementById('accusationPanel').style.display='block';
    playSound('accuse');
    if(accusationTimer) clearTimeout(accusationTimer);
    accusationTimer=setTimeout(()=>resolveAccusation(lastBet.player), 5000);
    sendToAll('accuse', { accusedUid: lastBet.player });
}

function resolveAccusation(accusedUid){
    let totalDice=0, wildDieSaved=false; const tv=lastBet.value, accused=players[accusedUid];
    Object.values(players).forEach(p=>{ if(!p?.alive||p.isGhost) return; p.dice.forEach(d=>{ if(parseInt(d)===tv) totalDice++; }); });
    if(accused?.artifact?.id==='wildDie'){ totalDice++; wildDieSaved=true; }
    let isLie = totalDice < lastBet.count;
    if(accused?.cursed || accused?.familiarCursed) isLie=true;
    const r=document.getElementById('accusationResult'), e=document.getElementById('accusationEffects');
    if(isLie){
        r.textContent='✅ ЛОЖНАЯ СТАВКА!'; r.className='accusation-result effect-green';
        applyPoison(accusedUid,1,'Ложная ставка'); addEffectLine(`🔴 ${accused?.name||'Цель'}: +1 яд`,e);
        if(accused?.artifact?.id==='bloodthirst'){ applyBlood(myId,1); applyPoison(accusedUid,2,'Кровожадность'); addEffectLine(`🟢 ${myName}: +1 кровь | 🔴 ${accused.name}: +2 яда`,e); }
        else if(accused?.artifact?.id==='deceiver'){ applyPoison(myId,2,'Обманщик'); addEffectLine(`🟣 ${accused.name}: Обманщик активирован | 🔴 ${myName}: +2 яда`,e); }
        else if(accused?.darkPact){ applyPoison(accusedUid,2,'Тёмный Договор'); addEffectLine(`🟣 ${accused.name}: +2 яда (Договор)`,e); }
        if(wildDieSaved && !isLie){ applyPoison(myId,2,'Дикий Кубик спас ставку'); addEffectLine(`🔵 Дикий Кубик сработал! +2 яда обвинителю`,e); }
    } else {
        r.textContent='❌ ПРАВДИВАЯ СТАВКА!'; r.className='accusation-result effect-red';
        applyPoison(myId,1,'Ошибочное обвинение'); addEffectLine(`🔴 ${myName}: +1 яд`,e);
        if(accused?.artifact?.id==='bloodthirst'){ applyBlood(accusedUid,1); addEffectLine(`🟢 ${accused.name}: +1 кровь`,e); }
        if(accused?.darkPact){ players[accusedUid].darkPact=false; players[accusedUid].darkPactShield=true; players[accusedUid].darkPactRound=roundNumber+1; addEffectLine(`🟡 ${accused.name}: Тёмный Договор → щит на след. раунд`,e); }
    }
    const el=e.querySelectorAll('div').length;
    setTimeout(()=>{ document.getElementById('accusationPanel').style.display='none'; gameState='betting'; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); checkDeath(); setTimeout(startNewRound,2500); },5000+(el*3000));
}

function addEffectLine(t,c){ const d=document.createElement('div'); d.textContent=t; c.appendChild(d); }

function applyPoison(uid,amt,reason){
    const p=players[uid]; if(!p) return;
    if(p.devilShield && p.devilShieldRound===roundNumber){ appendChat(`🛡️ ${p.name} защищён ЩИТОМ ДЬЯВОЛА!`,'system'); delete p.devilShield; return; }
    if(p.defenderActive){ appendChat(`🛡️ ${p.name} защищён ЗАЩИТНИКОМ!`,'system'); p.defenderActive=false; return; }
    let rem=amt;
    if(p.blood>0){ const u=Math.min(p.blood,rem); rem-=u; p.blood-=u; }
    if(rem>0){ p.poisons+=rem; appendChat(`☠️ ${p.name} получает +${rem} яд (${reason})`,'death'); playSound('poison'); }
    checkDeath();
}

function applyBlood(uid,amt){ const p=players[uid]; if(!p) return; p.blood=(p.blood||0)+amt; appendChat(`🩸 ${p.name} получает +${amt} кровь!`,'system'); playSound('blood'); }

function checkDeath(){
    Object.keys(players).forEach(uid=>{
        const p=players[uid]; if(!p||p.isGhost) return;
        const ml=p.maxLives||3;
        if(p.poisons>=ml && p.alive){
            if(p.devilDealsUsed>=2) turnToGhost(uid);
            else { if(uid===myId) startDevilDeal(uid); else appendChat(`😈 ${p.name} отправляется на Сделку с Дьяволом...`,'death'); }
        }
    });
    const humans=Object.values(players).filter(p=>p?.alive&&!p.isGhost);
    if(humans.length===1){ gameState='ended'; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🏆 ${humans[0].name} победил! Игра окончена.`,'system'); playSound('win'); showConfetti(); }
}

function turnToGhost(uid){
    players[uid].alive=false; players[uid].isGhost=true; players[uid].artifact=null; players[uid].blood=0; players[uid].cursed=false; players[uid].frozen=false; players[uid].defenderActive=false; players[uid].stunned=false; players[uid].blind=false; players[uid].devilShield=false; players[uid].usedAbilities={}; players[uid].lastBetInRound=null; players[uid].dice=[];
    appendChat(`👻 ${players[uid].name} стал призраком (лимит сделок исчерпан)!`,'death'); playSound('ghost'); checkVengeance(uid);
}

function startDevilDeal(uid){
    if(uid!==myId) return;
    gameState='devil_deal'; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
    const tv=Math.floor(Math.random()*6)+1;
    let rl=0;
    Object.values(players).forEach(p=>{ if(p?.alive&&!p.isGhost) rl+=p.dice.filter(d=>parseInt(d)||1===tv).length; });
    devilDealData={targetValue:tv,realCount:rl,uid};
    document.getElementById('devilTargetEmoji').textContent=getDieEmoji(tv);
    const opts=[rl];
    while(opts.length<3){ const f=rl+Math.floor(Math.random()*5)-2; if(f>0 && !opts.includes(f)) opts.push(f); }
    opts.sort(()=>Math.random()-0.5);
    document.getElementById('devilOptions').innerHTML=opts.map(o=>`<button class="devil-opt" onclick="resolveDevilDeal(${o})">${o}</button>`).join('');
    const fi=document.getElementById('devilFire'); fi.style.animation='none'; fi.offsetHeight; fi.style.animation='fireRise 30s linear forwards';
    document.getElementById('devilModal').style.display='block';
    document.getElementById('devilTimer').textContent='30';
    let t=30;
    if(devilDealTimer) clearInterval(devilDealTimer);
    devilDealTimer=setInterval(()=>{ t--; document.getElementById('devilTimer').textContent=t; if(t<=0){ clearInterval(devilDealTimer); resolveDevilDeal(-1); } },1000);
    playSound('devil'); appendChat(`😈 ${myName} заключает сделку с Дьяволом...`,'death');
}

function resolveDevilDeal(chosen){
    clearInterval(devilDealTimer); document.getElementById('devilModal').style.display='none';
    if(!devilDealData) return;
    const {realCount,uid}=devilDealData, p=players[uid];
    if(!p) return;
    let isCorrect = (chosen===realCount);
    if(p.isBot && bots[p.id]?.difficulty === 3) isCorrect = true;
    else if(p.isBot && bots[p.id]?.difficulty === 2) isCorrect = (Math.random()<0.7);
    else if(p.isBot && bots[p.id]?.difficulty === 1) isCorrect = (chosen === [realCount, realCount+1, realCount-1].sort()[1]);
    else if(p.isBot && bots[p.id]?.difficulty === 0) isCorrect = (Math.random()<0.33);
    if(isCorrect){
        p.poisons=2; p.devilDealsUsed++; p.artifact=null; p.alive=true; p.isGhost=false; p.blood=0; p.cursed=false; p.frozen=false; p.defenderActive=false; p.devilShield=false; p.dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
        appendChat(`😈 ${p.name} ВЫИГРАЛ сделку! 2 яда, 1 жизнь`,'system'); playSound('devilWin');
    } else {
        turnToGhost(uid); appendChat(`😈 ${p.name} ПРОИГРАЛ сделку и стал ПРИЗРАКОМ!`,'death'); playSound('devilLose');
    }
    gameState='betting'; devilDealData=null; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
    setTimeout(startNewRound,2500);
}

function checkVengeance(uid){
    Object.keys(players).forEach(u=>{
        const p=players[u];
        if(p?.isGhost && p.ghostTarget===uid){
            p.alive=true; p.isGhost=false; p.poisons=2; p.blood=0; p.ghostTarget=null; p.artifact=null; p.usedAbilities={}; p.dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
            appendChat(`⚔️ ПРИЗРАК ${p.name} ВОСКРЕС через МЕСТЬ!`,'system'); playSound('resurrection');
        }
    });
}

function startNewRound(){
    const aliveCount=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost).length;
    if(aliveCount<2) return;
    roundNumber++;
    for(let botId in bots) {
        if(bots[botId].difficulty === 3) {
            for(let uid in players) {
                if(uid !== botId && players[uid]?.alive && !players[uid]?.isGhost) {
                    updateExpertKnowledge(botId, uid, players[uid].dice);
                }
            }
        }
    }
    thiefUsedThisRound = false;
    sniperShotUsedThisRound = false;
    usedSpecialThisRound = {};
    Object.keys(players).forEach(uid=>{
        const p=players[uid];
        if(p?.alive && !p.isGhost){
            const av=ARTIFACTS.filter(a=>!artifactHistory.includes(a.id+'_'+uid));
            const ar=av.length>0?av[Math.floor(Math.random()*av.length)]:ARTIFACTS[Math.floor(Math.random()*ARTIFACTS.length)];
            artifactHistory.push(ar.id+'_'+uid);
            let dc=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1);
            if(p.evilEyed) dc=dc.map(()=>Math.random()<0.7?Math.floor(Math.random()*3)+1:Math.floor(Math.random()*3)+4);
            const artData=specialDiceEnabled?ar:null;
            p.dice=dc; p.artifact=artData; p.usedSpecialThisRound={}; p.lastBetInRound=null; p.cursed=false; p.frozen=false; p.defenderActive=(artData?.id==='defender'); p.stunned=false; p.blind=false; p.darkPact=(artData?.id==='darkPact'); p.darkPactShield=false; p.devilShield=false; p.evilEyed=false; p.forcedBluff=false; p.cannotAccuse=false; p.sniperShotUsedThisRound=false; p.poisons=0;
            if(p.artifact?.id==='defender') p.defenderActive=true;
            if(p.artifact?.id==='darkPact') p.darkPact=true;
        }
    });
    lastBet=null; gameState='betting';
    const aliveUids=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost);
    if(aliveUids.length) currentPlayerUid=aliveUids[0];
    sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } });
    appendChat(`🎲 === РАУНД ${roundNumber} НАЧАЛСЯ! ===`,'system'); playSound('round');
    if(currentPlayerUid && players[currentPlayerUid]?.isBot && currentPlayerUid!==myId) botTurn(currentPlayerUid);
}

function useArtifact(id){
    if(gameState!=='betting') return;
    const m=players[myId], art=ARTIFACTS.find(a=>a.id===id);
    if(!art || (art.type==='active' && usedSpecialThisRound[id])) return;
    switch(id){
        case'target': showNominalModal(n=>{ const tg=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost&&players[u].dice.includes(n)); if(!tg.length) return showNotification('Нет целей!','warning'); const t=tg[Math.floor(Math.random()*tg.length)]; if(players[t].dice.length<=1) return showNotification('Нельзя уничтожить последний кубик!','warning'); const i=players[t].dice.indexOf(n); players[t].dice.splice(i,1); sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🎯 ${m.name} использовал В ЯБЛОЧКО! Уничтожен кубик ${getDieEmoji(n)} у ${players[t].name}`,'system'); }); break;
        case'fireball': case'luck': const nd=m.dice.map((d,idx)=>{ if(m.frozen) return d; return id==='luck'?(Math.random()<0.7?Math.floor(Math.random()*3)+4:Math.floor(Math.random()*3)+1):Math.floor(Math.random()*6)+1; }); players[myId].dice=nd; players[myId].evilEyed=false; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`☄️ ${m.name} использовал ${art.name}! Кубики переброшены`,'system'); break;
        case'blessing': if(m.poisons>0){ players[myId].poisons--; appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! Себе -1 яд`,'system'); } else { const h=Object.keys(players).find(u=>u!==myId&&players[u]?.alive&&players[u]?.poisons>0); if(h){ players[h].poisons--; appendChat(`⚕️ ${m.name} использовал БЛАГОСЛОВЕНИЕ! ${players[h].name} -1 яд`,'system'); } else showNotification('Нет раненых союзников!','warning'); } sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); break;
        case'thief': if(thiefUsedThisRound) return showNotification('Вор уже использован в этом раунде!','warning'); const tt=Object.keys(players).filter(u=>u!==myId&&players[u]?.artifact); if(!tt.length) return showNotification('Не у кого красть!','warning'); showTargetModal(tt,t=>{ const st=players[t].artifact; players[myId].artifact=st; thiefUsedThisRound=true; players[t].artifact=null; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🥷 ${m.name} украл ${st.emoji} у ${players[t].name}!`,'system'); }); break;
        case'deceiver': const bc=lastBet?lastBet.count+Math.floor(Math.random()*3)+2:Math.floor(Math.random()*5)+6, bv=Math.floor(Math.random()*6)+1; lastBet={player:myId,count:bc,value:bv}; players[myId].lastBetInRound=lastBet; sendToAll('bet', { bet: lastBet }); break;
        case'clone': const tc=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost); if(!tc.length) return; const cl=tc[Math.floor(Math.random()*tc.length)], cd=players[cl].dice[Math.floor(Math.random()*players[cl].dice.length)]; players[myId].dice.push(cd); players[myId].artifact=null; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🧬 ${m.name} клонировал кубик ${getDieEmoji(cd)} у ${players[cl].name}! Теперь у него 6 кубиков.`,'system'); break;
        case'curse': const cu=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost); if(!cu.length) return; showTargetModal(cu,t=>{ players[t].cursed=true; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`☠️ ${m.name} проклял ${players[t].name}! Следующая ставка ложная.`,'system'); }); break;
        case'spy': if(spyMemory[myId] && spyMemory[myId].value){ showNotification(`🔍 Шпион: вы уже знаете кубик ${players[spyMemory[myId].target]?.name} → ${getDieEmoji(spyMemory[myId].value)}`,'info'); break; } const sp=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost); if(!sp.length) return showNotification('Нет целей!','warning'); showTargetModal(sp,t=>{ const val=players[t].dice[Math.floor(Math.random()*players[t].dice.length)]; spyMemory[myId]={target:t,value:val}; showNotification(`🕵️ Шпион: у ${players[t].name} выпал кубик ${getDieEmoji(val)}`,'info'); appendChat(`🕵️ ${m.name} использовал Шпиона на ${players[t].name}`,'system'); }); break;
        case'ice': const ci=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost&&!players[u]?.frozen); if(!ci.length) return; showTargetModal(ci,t=>{ players[t].frozen=true; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🧊 ${m.name} заморозил кубики ${players[t].name}!`,'system'); }); break;
        case'analyst': showNominalModal(n=>{ let c=0; Object.values(players).forEach(p=>{ if(p?.alive&&!p.isGhost&&p.dice.includes(n)) c++; }); showNotification(`АНАЛИТИК: Минимум ${c} игроков имеют кубик ${getDieEmoji(n)}`,'info'); }); break;
        case'double': if(!lastBet) return showNotification('Нет ставок для копирования!','warning'); const td=Object.keys(players).filter(u=>u!==myId&&players[u]?.lastBetInRound); if(!td.length) return; showTargetModal(td,t=>{ let lb=players[t].lastBetInRound; let nc=lb.count,nv=lb.value; if(lastBet&&(nc<lastBet.count||(nc===lastBet.count&&nv<=lastBet.value))){ if(nc<Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost).length*5) nc++; else{ nv=Math.min(6,nv+1); nc=1; } } lastBet={player:myId,count:nc,value:nv}; players[myId].lastBetInRound=lastBet; sendToAll('bet', { bet: lastBet }); appendChat(`🎭 ${m.name} использовал ДВОЙНИК! Скопирована ставка ${players[t].name}: ${nc}×${getDieEmoji(nv)}`,'system'); }); break;
        case'evilEye': const te=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost&&!players[u]?.evilEyed); if(!te.length) return; showTargetModal(te,t=>{ players[t].evilEyed=true; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🧿 ${m.name} наслал Сглаз на ${players[t].name}!`,'system'); }); break;
        case'sacrifice': if(m.poisons>=(m.maxLives||3)&&!confirm('⚠️ ВЫ УМРЁТЕ! Это даст +1 яд (смерть). Вы уверены?')) return; if(!confirm('⚠️ Вы получите +1 яд. Эффект активируется после. Вы уверены?')) return; showEffectModal(eff=>{ applyPoison(myId,1,'Жертвоприношение'); if(eff.id==='shield') players[myId].devilShield=true, players[myId].devilShieldRound=roundNumber; else if(eff.id==='reroll'){ Object.keys(players).forEach(u=>{ if(players[u]?.alive&&!players[u]?.isGhost&&!players[u]?.frozen) players[u].dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1), players[u].evilEyed=false; }); appendChat(`💀 ${m.name} принёс жертву: переброс кубиков стола!`,'system'); } else if(eff.id==='forceBluff'){ const nx=getNextPlayerUid(); if(nx) players[nx].forcedBluff=true; appendChat(`💀 ${m.name} принёс жертву: следующий игрок обязан повысить ставку!`,'system'); } sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); }); break;
        case'circus': const cc=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost&&!players[u]?.frozen&&players[u].dice.length>=2&&m.dice.length>=2); if(!cc.length) return showNotification('Нет подходящих целей (у обоих ≥2 кубиков, не заморожены)','warning'); showTargetModal(cc,t=>{ let myDice=[...m.dice], taDice=[...players[t].dice]; let mi1=Math.floor(Math.random()*myDice.length), mi2=Math.floor(Math.random()*myDice.length); while(mi2===mi1) mi2=Math.floor(Math.random()*myDice.length); let ti1=Math.floor(Math.random()*taDice.length), ti2=Math.floor(Math.random()*taDice.length); while(ti2===ti1) ti2=Math.floor(Math.random()*taDice.length); [myDice[mi1],taDice[ti1]]=[taDice[ti1],myDice[mi1]]; [myDice[mi2],taDice[ti2]]=[taDice[ti2],myDice[mi2]]; players[myId].dice=myDice; players[t].dice=taDice; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🎪 ${m.name} обменялся кубиками с ${players[t].name}!`,'system'); }); break;
        case'sniper': if(sniperShotUsedThisRound) return showNotification('Отстрел уже использован в этом раунде!','warning'); showDynamicNominalModal(n=>{ if(lastBet&&lastBet.value===n) return showNotification('Нельзя отстрелить номинал текущей ставки!','warning'); Object.keys(players).forEach(u=>{ if(players[u]?.frozen) return; const nd=players[u].dice.filter(d=>d!==n); if(nd.length!==players[u].dice.length) players[u].dice=nd; }); sniperShotUsedThisRound=true; players[myId].cannotAccuse=true; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`🔫 ${m.name} отстрелил все кубики номинала ${getDieEmoji(n)}!`,'system'); }); break;
    }
    if(art.type==='active') usedSpecialThisRound[id]=true;
    playSound('artifact');
}

function applyArtifactEffect(peerId, artifactId){}
function getNextPlayerUid(){ const a=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost); if(!a.length) return null; const i=a.indexOf(lastBet?.player); return a[(i+1)%a.length]; }

function showTargetModal(uids,cb){ const l=document.getElementById('modalTargetList'); l.innerHTML=''; uids.forEach(u=>{ const p=players[u]; if(!p||!p.name) return; const b=document.createElement('button'); b.className='select-item'; b.style.width='100%'; b.textContent=p.name+(p.isGhost?' 👻':''); b.onclick=()=>{ cb(u); closeModal('modalTarget'); }; l.appendChild(b); }); document.getElementById('modalTarget').style.display='block'; }
function showNominalModal(cb){ const l=document.getElementById('modalNominalList'); l.innerHTML=''; for(let i=1;i<=6;i++){ const b=document.createElement('button'); b.className='select-item'; b.textContent=getDieEmoji(i); b.style.width='45px'; b.style.height='45px'; b.style.fontSize='1.3em'; b.onclick=()=>{ cb(i); closeModal('modalNominal'); }; l.appendChild(b); } document.getElementById('modalNominal').style.display='block'; }
function showDynamicNominalModal(cb){ const l=document.getElementById('modalNominalList'); const iv=setInterval(()=>{ l.innerHTML=''; for(let i=1;i<=6;i++){ const b=document.createElement('button'); b.className='select-item'; b.textContent=getDieEmoji(i); b.style.width='45px'; b.style.height='45px'; b.style.fontSize='1.3em'; if(lastBet&&lastBet.value===i){ b.style.opacity='0.3'; b.style.cursor='not-allowed'; b.disabled=true; }else{ b.onclick=()=>{ cb(i); closeModal('modalNominal'); clearInterval(iv); }; } l.appendChild(b); } },200); document.getElementById('modalNominal').style.display='block'; }
function showEffectModal(cb){ const ef=[{id:'shield',name:'🛡️ Щит Дьявола (Блок 1 яда до конца раунда)'},{id:'reroll',name:'🔁 Переброс кубиков стола (кроме замороженных)'},{id:'forceBluff',name:'🎭 Принудительный блеф следующего игрока'}], l=document.getElementById('modalEffectList'); l.innerHTML=''; ef.forEach(e=>{ const b=document.createElement('button'); b.className='select-item'; b.style.width='100%'; b.style.marginBottom='8px'; b.textContent=e.name; b.style.whiteSpace='normal'; b.style.lineHeight='1.4'; b.onclick=()=>{ cb(e); closeModal('modalEffect'); }; l.appendChild(b); }); document.getElementById('modalEffect').style.display='block'; }
function closeModal(id){ document.getElementById(id).style.display='none'; }

function startVoteKick(){ if(Date.now()-lastVoteEndTime<VOTE_COOLDOWN){ const w=Math.ceil((VOTE_COOLDOWN-(Date.now()-lastVoteEndTime))/1000); return showNotification(`Голосование доступно через ${w} сек`,'warning'); } const tg=Object.keys(players).filter(u=>u!==myId); if(!tg.length) return showNotification('Нет других игроков для исключения!','warning'); const ld=document.getElementById('voteTargetsList'); ld.innerHTML=''; tg.forEach(u=>{ const p=players[u]; if(!p||!p.name) return; const b=document.createElement('button'); b.className='select-item'; b.textContent=p.name+(p.isGhost?' 👻':''); b.onclick=()=>{ currentVoteTarget=u; document.getElementById('voteTargetName').textContent=p.name; document.getElementById('voteResult').textContent=''; document.getElementById('modalVote').style.display='block'; startVoteTimer(u); }; ld.appendChild(b); }); }
function startVoteTimer(tu){ let t=30; const el=document.getElementById('voteTimer'); if(voteTimerInterval) clearInterval(voteTimerInterval); voteTimerInterval=setInterval(()=>{ t--; el.textContent=t; if(t<=0){ clearInterval(voteTimerInterval); resolveVote(tu); } },1000); }
function castVote(v){ if(!currentVoteTarget) return; sendToAll('vote', {target:currentVoteTarget, vote:v}); showNotification(`Голос принят: ${v==='yes'?'ЗА':'ПРОТИВ'}`,'info'); }
function updateVoteUI(vd){ if(!vd) return; const y=Object.values(vd.votes||{}).filter(v=>v==='yes').length, n=Object.values(vd.votes||{}).filter(v=>v==='no').length; document.getElementById('voteResult').textContent=`✅ ЗА: ${y} | ❌ ПРОТИВ: ${n}`; }
function resolveVote(tu){ document.getElementById('modalVote').style.display='none'; if(players[tu]){ const yesCount=Object.values(players).filter(p=>p.vote===tu && p.voteValue==='yes').length; const noCount=Object.values(players).filter(p=>p.vote===tu && p.voteValue==='no').length; const total=yesCount+noCount; const kicked=total>0 && yesCount>total/2; if(kicked){ delete players[tu]; appendChat(`🗳️ ${players[tu]?.name||'Игрок'} исключён голосованием! (ЗА: ${yesCount}, ПРОТИВ: ${noCount})`,'system'); }else{ appendChat(`🗳️ ${players[tu]?.name||'Игрок'} остался! (ЗА: ${yesCount}, ПРОТИВ: ${noCount})`,'system'); } lastVoteEndTime=Date.now(); currentVoteTarget=null; } }

function setupAudioContext(){ try{ audioContext=new(window.AudioContext||window.webkitAudioContext); }catch(e){} }
function showConfetti(){ for(let i=0;i<50;i++){ const c=document.createElement('div'); c.className='confetti'; c.style.left=Math.random()*100+'vw'; c.style.background=['#ffd700','#ff0000','#00ff00','#0000ff'][Math.floor(Math.random()*4)]; c.style.animationDuration=(Math.random()*2+2)+'s'; document.body.appendChild(c); setTimeout(()=>c.remove(),4000); } }

function useGhostAbility(id){
    if(!isGhost) return;
    const m=players[myId],ab=GHOST_ABILITIES.find(a=>a.id===id);
    if(!ab) return;
    if(ab.limit==='once_per_ghost'&&m?.usedAbilities?.[id]) return showNotification('Способность уже использована!','warning');
    switch(id){
        case'oathOfVengeance': const tv=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost); if(!tv.length) return; showTargetModal(tv,t=>{ players[myId].ghostTarget=t; players[myId].usedAbilities={...(m.usedAbilities||{}),[id]:true}; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`⚔️ [Призрак ${m.name}] выбрал цель для Мести: ${players[t].name}`,'ghost'); }); break;
        case'familiarCurse': const fc=Object.keys(players).filter(u=>u!==myId&&players[u]?.alive&&!players[u]?.isGhost); if(!fc.length) return; showTargetModal(fc,t=>{ players[t].familiarCursed=true; players[myId].usedAbilities={...(m.usedAbilities||{}),[id]:true}; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); }); break;
        case'poltergeist': const ef=['sabotage','blessing','shuffle'],ch=ef[Math.floor(Math.random()*ef.length)],al=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost); if(!al.length) return; if(ch==='sabotage'){ const t=al[Math.floor(Math.random()*al.length)]; players[t].dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1); players[t].evilEyed=false; appendChat(`🌀 [Полтергейст] САБОТАЖ: ${players[t].name} — кубики переброшены!`,'ghost'); } else if(ch==='blessing'){ const t=al[Math.floor(Math.random()*al.length)]; players[t].dice=Array(5).fill(6); players[t].evilEyed=false; appendChat(`🌀 [Полтергейст] БЛАГОСЛОВЕНИЕ: ${players[t].name} — все кубики стали 6!`,'ghost'); } else { al.forEach(u=>{ players[u].dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1); players[u].evilEyed=false; }); appendChat(`🌀 [Полтергейст] ПЕРЕМЕШИВАНИЕ: Всем живым игрокам кубики переброшены!`,'ghost'); } players[myId].usedAbilities={...(m.usedAbilities||{}),[id]:true}; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); break;
        case'keeperOfSecrets': const cd=document.getElementById('keeperContent'); cd.innerHTML=''; Object.values(players).forEach(p=>{ if(p?.alive&&!p.isGhost){ const d=document.createElement('div'); d.style.marginBottom='10px'; d.style.background='rgba(255,255,255,0.05)'; d.style.padding='8px'; d.style.borderRadius='5px'; d.innerHTML=`<strong style="color:#ffd700">${p.name}</strong>: <span style="font-size:1.2em">${p.dice.map(d=>getDieEmoji(parseInt(d)||1)).join(' ')}</span>`; cd.appendChild(d); } }); document.getElementById('modalKeeper').style.display='block'; break;
        case'soulReaper': const sr=Object.keys(players).filter(u=>players[u]?.alive&&!players[u]?.isGhost); if(!sr.length) return; let killed=false; sr.forEach(uid=>{ if(Math.random()<0.20){ const p=players[uid],r=Math.random(); let ef=r<0.10?'death':r<0.35?'loseArtifact':r<0.60?'heal':r<0.85?'stun':'blind'; if(ef==='death'){ applyPoison(uid,1,'Жатва Душ'); killed=true; } else if(ef==='loseArtifact'&&p.artifact){ p.artifact=null; appendChat(`💀 ${p.name}: потерял артефакт!`,'ghost'); } else if(ef==='heal'&&p.poisons>0){ p.poisons--; appendChat(`💀 ${p.name}: исцелился!`,'ghost'); } else if(ef==='stun'){ p.stunned=true; appendChat(`💀 ${p.name}: ошеломлён!`,'ghost'); } else if(ef==='blind'){ p.blind=true; appendChat(`💀 ${p.name}: ослеплён!`,'ghost'); } } }); if(killed){ players[myId].alive=true; players[myId].isGhost=false; players[myId].poisons=2; players[myId].blood=0; players[myId].artifact=null; players[myId].dice=Array(5).fill(0).map(()=>Math.floor(Math.random()*6)+1); players[myId].usedAbilities={}; appendChat(`💀 [Призрак ${m.name}] Жатва Душ принесла смерть — ПРИЗРАК ВОСКРЕС!`,'ghost'); playSound('resurrection'); } players[myId].usedAbilities={...(m.usedAbilities||{}),[id]:true}; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); break;
    }
    playSound('ghost');
}

function bindEventListeners(){
    const hm=document.getElementById('hamburgerBtn'), dd=document.getElementById('dropdownMenu');
    hm.onclick=()=>{ dd.style.display=dd.style.display==='block'?'none':'block'; if(audioContext&&audioContext.state==='suspended') audioContext.resume(); };
    document.addEventListener('click',e=>{ if(!hm.contains(e.target)&&!dd.contains(e.target)) dd.style.display='none'; });
    document.getElementById('menuRules').onclick=()=>{ document.getElementById('modalRules').style.display='block'; dd.style.display='none'; };
    document.getElementById('menuProfile').onclick=()=>{ document.getElementById('profileName').textContent=myName; document.getElementById('profileUid').textContent=myId; document.getElementById('profileStatus').textContent=isGhost?'Призрак':'Жив'; document.getElementById('profileStatus').style.color=isGhost?'#cc00ff':'#00ff88'; document.getElementById('modalProfile').style.display='block'; dd.style.display='none'; };
    document.getElementById('btnChangeNick').onclick=()=>{ const n=prompt('Новый ник:',myName); if(n&&n.trim()){ const o=myName; myName=n.trim(); localStorage.setItem('ld_playerName',myName); players[myId].name=myName; sendToAll('syncGameState', { fullState: { players, gameState, lastBet, roundNumber, currentPlayerUid, defaultLives, specialDiceEnabled, artifactHistory, blood, usedSpecialThisRound, thiefUsedThisRound, sniperShotUsedThisRound } }); appendChat(`${o} сменил ник на ${myName}`,'system'); } };
    document.getElementById('menuCreateRoom').onclick=()=>{ createRoom(); dd.style.display='none'; };
    document.getElementById('menuInvite').onclick=()=>{ copyInviteLink(); dd.style.display='none'; };
    document.getElementById('menuKick').onclick=()=>{ startVoteKick(); dd.style.display='none'; };
    document.getElementById('menuSound').onclick=()=>{ soundEnabled=!soundEnabled; document.getElementById('menuSound').textContent=soundEnabled?'🔊 Звук: ВКЛ':'🔇 Звук: ВЫКЛ'; dd.style.display='none'; };
    document.getElementById('menuArtifacts').onclick=()=>{ if(gameState!=='lobby') return showNotification('Только в лобби!','warning'); specialDiceEnabled=!specialDiceEnabled; document.getElementById('menuArtifacts').textContent=`🎲 Артефакты: ${specialDiceEnabled?'✅':'❌'}`; dd.style.display='none'; };
    document.getElementById('menuLives').onclick=()=>{ if(gameState!=='lobby') return showNotification('Только в лобби!','warning'); const o=[3,4,5,6,2]; defaultLives=o[(o.indexOf(defaultLives)+1)%o.length]; document.getElementById('menuLives').textContent=`❤️ Жизни: ${defaultLives}`; dd.style.display='none'; };
    document.getElementById('btnStartGame').onclick=()=>{ if(Object.keys(players).filter(p=>players[p]?.alive&&!players[p]?.isGhost).length<2) return showNotification('Нужно минимум 2 игрока!','warning'); sendToAll('startGame', {}); startNewRound(); };
    document.getElementById('btnResetGame').onclick=()=>{ if(confirm('Сбросить игру в лобби?')) resetGame(); };
    document.getElementById('btnPlaceBet').onclick=placeBet;
    document.getElementById('btnAccuse').onclick=accuse;
    document.getElementById('btnSendChat').onclick=()=>{ const msg=document.getElementById('chatInput').value.trim(); if(msg){ sendToAll('chat', {name:myName, text:msg}); appendChat(`${myName}: ${msg}`,'normal'); document.getElementById('chatInput').value=''; } };
    document.getElementById('chatInput').onkeypress=e=>{ if(e.key==='Enter') document.getElementById('btnSendChat').click(); };
    document.getElementById('ghVengeance').onclick=()=>useGhostAbility('oathOfVengeance');
    document.getElementById('ghFamiliarCurse').onclick=()=>useGhostAbility('familiarCurse');
    document.getElementById('ghPoltergeist').onclick=()=>useGhostAbility('poltergeist');
    document.getElementById('ghKeeper').onclick=()=>useGhostAbility('keeperOfSecrets');
    document.getElementById('ghReaper').onclick=()=>useGhostAbility('soulReaper');
    document.getElementById('voteYes').onclick=()=>castVote('yes');
    document.getElementById('voteNo').onclick=()=>castVote('no');
    document.querySelectorAll('.close-btn').forEach(b=>b.onclick=function(){ this.closest('.modal').style.display='none'; });
    window.onclick=e=>{ if(e.target.classList.contains('modal')) e.target.style.display='none'; };
    document.getElementById('menuBotAdd').onclick=()=>{ addBot(); dd.style.display='none'; };
    document.getElementById('menuBotRemoveAll').onclick=()=>{ removeAllBots(); dd.style.display='none'; };
    document.getElementById('menuBotDifficulty').onclick = (e) => { e.stopPropagation(); let next = (botDifficulty + 1) % 4; setBotDifficulty(next); dd.style.display='none'; };
}

window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectParam = urlParams.get('connect');
    if(connectParam) {
        const modal = document.getElementById('modalJoinIP');
        document.getElementById('ipAddressInput').value = connectParam;
        modal.style.display = 'block';
        document.getElementById('connectIPBtn').onclick = () => {
            const address = document.getElementById('ipAddressInput').value.trim();
            if(!address) { showNotification('Введите IP:порт', 'warning'); return; }
            modal.style.display = 'none';
            const roomIdFromUrl = urlParams.get('room');
            if(roomIdFromUrl) currentRoomId = roomIdFromUrl;
            else currentRoomId = generateRoomId();
            joinRoomByIP(address);
        };
    } else {
        const modal = document.getElementById('modalRoomJoin');
        modal.style.display = 'block';
        document.getElementById('confirmJoinBtn').onclick = () => {
            let name = document.getElementById('playerNameInput').value.trim();
            if(!name) name = 'Игрок' + Math.floor(Math.random()*900+100);
            myName = name;
            localStorage.setItem('ld_playerName', myName);
            modal.style.display = 'none';
            setupAudioContext();
            bindEventListeners();
            appendChat(`🎮 Добро пожаловать, ${myName}! Нажмите "Создать комнату" в меню, чтобы начать`, 'system');
        };
    }
    document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = function() { this.closest('.modal').style.display = 'none'; });
};

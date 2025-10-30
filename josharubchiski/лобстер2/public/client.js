const socket = io();

let roomId = 'room1'; // For simplicity, fixed room
let playerName = 'Игрок';
let playerId = localStorage.getItem('playerId') || Math.random().toString(36).substr(2, 9);
localStorage.setItem('playerId', playerId);
let myPlayerId = playerId;

socket.emit('joinRoom', { roomId, playerName, playerId });

const tableZone = document.getElementById('table-zone');
const playersZone = document.getElementById('players-zone');
const trumpCard = document.getElementById('trump-card');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const btnTake = document.getElementById('btn-take');
const btnPass = document.getElementById('btn-pass');
const btnBeat = document.getElementById('btn-beat');
const bitoPile = document.getElementById('bito-pile');
const btnSurrender = document.getElementById('btn-surrender');
const btnRestart = document.getElementById('btn-restart');

let myHand = [];
let gameState = {};

socket.on('gameState', (state) => {
  gameState = state;
  updateUI();
});

socket.on('yourHand', (hand) => {
  myHand = hand;
  myHand.sort((a, b) => {
    const suitOrder = { 'hearts': 1, 'diamonds': 2, 'clubs': 3, 'spades': 4 };
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.value - b.value;
  });
  renderHand();
});

function updateUI() {
  // Update deck count
  const deckZone = document.getElementById('deck-zone');
  deckZone.innerHTML = '';
  const countDiv = document.createElement('div');
  countDiv.id = 'deck-count';
  countDiv.textContent = `Карт в колоде: ${gameState.deckCount || 0}`;
  deckZone.appendChild(countDiv);

  if (gameState.deckCount > 0) {
    const numToShow = Math.min(gameState.deckCount, 5);
    for (let i = 0; i < numToShow; i++) {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card deck-card';
      cardDiv.style.position = 'absolute';
      cardDiv.style.top = `${i * 2}px`;
      cardDiv.style.left = `${i * 2}px`;
      cardDiv.style.zIndex = 10 - i;
      cardDiv.style.backgroundImage = "url('assets/CARDS/BACK.png')";
      cardDiv.style.backgroundSize = 'cover';
      deckZone.appendChild(cardDiv);
    }
    if (gameState.trumpCard) {
      const trumpImg = document.createElement('img');
      trumpImg.src = getCardImage(gameState.trumpCard);
      trumpImg.style.position = 'absolute';
      trumpImg.style.right = '-40px';
      trumpImg.style.top = '0';
      trumpImg.style.transform = 'rotate(90deg)';
      trumpImg.style.width = '80px';
      trumpImg.style.height = '120px';
      trumpImg.style.zIndex = 1;
      trumpImg.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      trumpImg.style.borderRadius = '5px';
      deckZone.appendChild(trumpImg);
    }
  }

  // Update table
  tableZone.innerHTML = '';
  gameState.table.forEach((pair, index) => {
    const attackCard = createCardElement(pair.attack);
    attackCard.dataset.pairIndex = index;
    attackCard.dataset.type = 'attack';
    attackCard.style.position = 'relative';
    attackCard.style.display = 'inline-block';
    attackCard.style.margin = '0 5px';
    tableZone.appendChild(attackCard);
    if (pair.defend) {
      const defendCard = createCardElement(pair.defend);
      defendCard.dataset.pairIndex = index;
      defendCard.dataset.type = 'defend';
      // Position defend card on top with offset to show attack card's top
      defendCard.style.position = 'absolute';
      defendCard.style.top = '25px';
      defendCard.style.left = '5px';
      defendCard.style.width = '80px';
      defendCard.style.height = '120px';
      defendCard.style.zIndex = 11;
      defendCard.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      defendCard.style.transform = 'rotate(5deg)'; // slight rotation
      attackCard.appendChild(defendCard);
    }
  });

  // Update buttons
  const hasUndefended = gameState.table.some(pair => !pair.defend);
  const allDefended = gameState.table.every(pair => pair.defend);
  const hasCardsOnTable = gameState.table.length > 0;

  // Take button: hide, use Pass for take
  btnTake.style.display = 'none';

  // Pass button: for defender to take undefended cards
  btnPass.disabled = !(myPlayerId === gameState.currentDefender && hasUndefended);
  btnPass.style.display = btnPass.disabled ? 'none' : 'block';

  // Beat button: for attacker when all cards are defended
  btnBeat.disabled = !(myPlayerId === gameState.currentAttacker && allDefended && hasCardsOnTable);
  btnBeat.style.display = btnBeat.disabled ? 'none' : 'block';
  btnSurrender.style.display = gameState.trumpSuit && !gameState.gameOver ? 'block' : 'none';
  btnSurrender.disabled = !(gameState.trumpSuit && !gameState.gameOver);
  if (gameState.gameOver) {
    btnRestart.style.display = 'block';
    btnSurrender.style.display = 'none';
    btnSurrender.disabled = true;
  } else {
    btnRestart.style.display = 'none';
  }

  // Update bito pile
  renderBitoPile();

  // Update game info
  const attackerName = gameState.currentAttacker ? gameState.players.find(p => p.id === gameState.currentAttacker)?.name || 'Неизвестно' : 'Никто';
  document.getElementById('game-info').textContent = `Козырь: ${gameState.trumpSuit || 'Не определен'} | Атакует: ${attackerName}`;

  // Game over
  const messagesDiv = document.getElementById('messages');
  if (gameState.gameOver) {
    if (gameState.loser) {
      messagesDiv.textContent = `${gameState.loser} проиграл!`;
    } else if (gameState.winner) {
      messagesDiv.textContent = `${gameState.winner} выиграл!`;
    } else {
      messagesDiv.textContent = 'Игра окончена!';
    }
  } else {
    messagesDiv.textContent = '';
  }

  // Show ready button if not ready
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  if (myPlayer && !myPlayer.isReady && !gameState.trumpSuit) {
    btnReady.style.display = 'block';
    btnReady.disabled = false;
  } else {
    btnReady.style.display = 'none';
    btnReady.disabled = true;
  }
}

function canDefend(card, attackCard) {
  if (card.suit === attackCard.suit) return card.value > attackCard.value;
  if (card.suit === gameState.trumpSuit) return true;
  return false;
}

function canTransfer(card) {
  return gameState.table.some(pair => !pair.defend && pair.attack.rank === card.rank);
}

function createCardElement(card) {
  const cardEl = document.createElement('img');
  cardEl.className = 'card';
  cardEl.src = getCardImage(card);
  cardEl.draggable = true;
  return cardEl;
}

function getCardImage(card) {
  const suitMap = { hearts: 'H', diamonds: 'B', clubs: 'K', spades: 'P' };
  const suit = suitMap[card.suit];
  const rank = card.rank;
  return `assets/CARDS/${suit}${rank}.png`;
}

// Sounds
function playSound(type) {
  // Placeholder, use Web Audio API or add audio files
  console.log(`Playing sound: ${type}`);
  // For example: new Audio('sound.mp3').play();
}

// Chat
chatSend.addEventListener('click', () => {
  const message = chatInput.value;
  if (message) {
    socket.emit('chatMessage', { roomId, message });
    chatInput.value = '';
  }
});

socket.on('chatMessage', (data) => {
  const msgDiv = document.createElement('div');
  msgDiv.textContent = `${data.player}: ${data.message}`;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

const btnReady = document.createElement('button');
btnReady.id = 'btn-ready';
btnReady.textContent = 'Готов';
btnReady.style.position = 'absolute';
btnReady.style.top = '10px';
btnReady.style.left = '50%';
btnReady.style.transform = 'translateX(-50%)';
btnReady.style.padding = '10px 20px';
btnReady.style.fontSize = '16px';
btnReady.style.cursor = 'pointer';
btnReady.style.zIndex = '1000';
document.body.appendChild(btnReady);

btnReady.addEventListener('click', () => {
  socket.emit('ready', { roomId });
  btnReady.disabled = true;
  btnReady.style.display = 'none';
});

// Existing button event listeners
btnTake.addEventListener('click', () => {
  socket.emit('pass', { roomId });
});

btnPass.addEventListener('click', () => {
  socket.emit('pass', { roomId });
});

btnBeat.addEventListener('click', () => {
  socket.emit('beat', { roomId });
});

btnSurrender.addEventListener('click', () => {
  socket.emit('surrender', { roomId });
});

btnRestart.addEventListener('click', () => {
  socket.emit('restart', { roomId });
});

function renderBitoPile() {
  bitoPile.innerHTML = '';
  const count = gameState.discardPile || 0;
  for (let i = 0; i < Math.min(count, 10); i++) { // Limit to 10 for display
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.position = 'absolute';
    cardEl.style.top = `${i * 2}px`;
    cardEl.style.left = `${i * 2}px`;
    cardEl.style.zIndex = i;
    bitoPile.appendChild(cardEl);
  }
}

function renderHand() {
  // Render all cards in hand as a fan
  const handZone = document.getElementById('hand-zone') || document.createElement('div');
  handZone.id = 'hand-zone';
  handZone.style.position = 'absolute';
  handZone.style.bottom = '120px'; // Leave space for avatar
  handZone.style.left = '50%';
  handZone.style.transform = 'translateX(-50%)';
  handZone.style.display = 'flex';
  handZone.style.alignItems = 'flex-end';
  document.body.appendChild(handZone);

  handZone.innerHTML = '';
  const totalCards = myHand.length;
  const maxAngle = 20; // degrees
  const overlap = 30; // pixels
  const cards = [];
  myHand.forEach((card, index) => {
    const cardEl = createCardElement(card);
    cardEl.classList.add('dealing');
    cardEl.style.position = 'absolute';
    const angle = (index - (totalCards - 1) / 2) * (maxAngle / totalCards);
    const xOffset = index * overlap - (totalCards - 1) * overlap / 2;
    cardEl.style.transform = `rotate(${angle}deg) translateX(${xOffset}px)`;
    cardEl.style.zIndex = 100 + index;
    cardEl.dataset.index = index;

    // Drag and drop handlers
    cardEl.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      e.dataTransfer.effectAllowed = 'move';
    });

    // Click handler for playing cards
    cardEl.addEventListener('click', () => {
      if (myPlayerId === gameState.currentAttacker) {
        socket.emit('playCard', { roomId, card, action: 'attack' });
      } else if (myPlayerId === gameState.currentDefender) {
        const undefendedIndex = gameState.table.findIndex(pair => !pair.defend);
        if (undefendedIndex !== -1 && canDefend(card, gameState.table[undefendedIndex].attack)) {
          socket.emit('playCard', { roomId, card, action: 'defend', pairIndex: undefendedIndex });
        } else if (canTransfer(card)) {
          socket.emit('playCard', { roomId, card, action: 'transfer' });
        }
      } else {
        socket.emit('throwIn', { roomId, card });
      }
      playSound('play');
    });

    cards.push({ el: cardEl, index, angle, xOffset });
    handZone.appendChild(cardEl);
  });

  // Add hover animation
  cards.forEach(card => {
    card.el.addEventListener('mouseenter', () => {
      card.el.style.transform = `rotate(${card.angle}deg) translateX(${card.xOffset}px) scale(1.2) translateY(-5px)`;
      card.el.style.zIndex = 200;
      cards.forEach(other => {
        if (other !== card) {
          const spread = other.index < card.index ? -3 : 3;
          other.el.style.transform = `rotate(${other.angle}deg) translateX(${other.xOffset + spread}px)`;
        }
      });
    });
    card.el.addEventListener('mouseleave', () => {
      card.el.style.transform = `rotate(${card.angle}deg) translateX(${card.xOffset}px)`;
      card.el.style.zIndex = 100 + card.index;
      cards.forEach(other => {
        other.el.style.transform = `rotate(${other.angle}deg) translateX(${other.xOffset}px)`;
      });
    });
  });

  // Render player avatar
  const avatarZone = document.getElementById('avatar-zone') || document.createElement('div');
  avatarZone.id = 'avatar-zone';
  avatarZone.style.position = 'absolute';
  avatarZone.style.bottom = '20px';
  avatarZone.style.left = '50%';
  avatarZone.style.transform = 'translateX(-50%)';
  avatarZone.style.width = '60px';
  avatarZone.style.height = '60px';
  avatarZone.style.borderRadius = '50%';
  avatarZone.style.background = 'rgba(255,255,255,0.8)';
  avatarZone.style.border = '2px solid #007bff';
  document.body.appendChild(avatarZone);

  // Render opponent cards and avatar
  renderOpponent();
}

function renderOpponent() {
  const opponent = gameState.players.find(p => p.id !== myPlayerId);
  if (!opponent) return;

  // Opponent avatar
  const oppAvatar = document.getElementById('opponent-avatar') || document.createElement('div');
  oppAvatar.id = 'opponent-avatar';
  oppAvatar.className = 'avatar opponent-avatar';
  oppAvatar.style.position = 'absolute';
  oppAvatar.style.top = '20px';
  oppAvatar.style.left = '50%';
  oppAvatar.style.transform = 'translateX(-50%)';
  oppAvatar.style.width = '60px';
  oppAvatar.style.height = '60px';
  oppAvatar.style.borderRadius = '50%';
  oppAvatar.style.background = 'rgba(255,255,255,0.8)';
  oppAvatar.style.border = '2px solid #dc3545';
  document.body.appendChild(oppAvatar);

  // Opponent hand
  const oppHand = document.getElementById('opponent-hand') || document.createElement('div');
  oppHand.id = 'opponent-hand';
  oppHand.className = 'opponent-hand';
  oppHand.style.position = 'absolute';
  oppHand.style.top = '120px';
  oppHand.style.left = '50%';
  oppHand.style.transform = 'translateX(-50%)';
  oppHand.style.display = 'flex';
  oppHand.style.alignItems = 'flex-start';
  oppHand.innerHTML = '';
  const totalCards = opponent.cardCount;
  const maxAngle = 20;
  const overlap = 30;
  for (let i = 0; i < totalCards; i++) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.position = 'absolute';
    const angle = (i - (totalCards - 1) / 2) * (maxAngle / totalCards);
    const xOffset = i * overlap - (totalCards - 1) * overlap / 2;
    cardEl.style.transform = `rotate(${angle}deg) translateX(${xOffset}px)`;
    cardEl.style.zIndex = 100 + i;
    oppHand.appendChild(cardEl);
  }
  document.body.appendChild(oppHand);
}

// Drag and drop handlers for tableZone
tableZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
});

tableZone.addEventListener('drop', (e) => {
  e.preventDefault();
  const cardIndex = e.dataTransfer.getData('text/plain');
  const draggedCard = myHand[cardIndex];
  if (!draggedCard) return;

  // Find the target element under drop
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (!target) return;

  // Check if target is an attack card on table
  if (target.classList.contains('card') && target.dataset.type === 'attack') {
    const pairIndex = parseInt(target.dataset.pairIndex);
    const pair = gameState.table[pairIndex];
    if (myPlayerId === gameState.currentDefender && !pair.defend) {
      // Try to defend
      if (canDefend(draggedCard, pair.attack)) {
        socket.emit('playCard', { roomId, card: draggedCard, action: 'defend', pairIndex });
        playSound('play');
      }
      // Transfer if rank matches and can't defend
      else if (draggedCard.rank === pair.attack.rank) {
        socket.emit('playCard', { roomId, card: draggedCard, action: 'transfer' });
        playSound('play');
      }
    }
  } else if (target.id === 'table-zone' || target.classList.contains('card') === false) {
    // Dropping on empty table area
    if (myPlayerId === gameState.currentAttacker) {
      // Attack
      socket.emit('playCard', { roomId, card: draggedCard, action: 'attack' });
      playSound('play');
    } else if (myPlayerId !== gameState.currentDefender) {
      // Throw in
      socket.emit('throwIn', { roomId, card: draggedCard });
      playSound('play');
    }
  }
});

// Also allow clicking on cards to play as before
function setupCardClick(cardEl, card, index) {
  cardEl.addEventListener('click', () => {
    if (myPlayerId === gameState.currentAttacker) {
      socket.emit('playCard', { roomId, card, action: 'attack' });
    } else if (myPlayerId === gameState.currentDefender) {
      // Find first undefended attack card index
      const undefendedIndex = gameState.table.findIndex(pair => !pair.defend);
      if (undefendedIndex !== -1 && canDefend(card, gameState.table[undefendedIndex].attack)) {
        socket.emit('playCard', { roomId, card, action: 'defend', pairIndex: undefendedIndex });
      } else if (canTransfer(card)) {
        socket.emit('playCard', { roomId, card, action: 'transfer' });
      }
    } else {
      socket.emit('throwIn', { roomId, card });
    }
    playSound('play');
  });
}

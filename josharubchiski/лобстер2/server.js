const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const rooms = {}; // roomId: { players: [], game: Game instance }

class Game {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.deck = this.createDeck();
    this.trumpSuit = null;
    this.trumpCard = null;
    this.discardPile = [];
    this.currentAttacker = null;
    this.currentDefender = null;
    this.table = []; // {attack: card, defend: card or null}
    this.attackerIndex = 0;
    this.defenderIndex = 1;
    this.gameOver = false;
    this.winner = null;
    this.loser = null;
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({ suit, rank, value: this.getValue(rank) });
      }
    }
    return this.shuffle(deck);
  }

  getValue(rank) {
    const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return values[rank];
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  startGame() {
    this.trumpSuit = this.deck[this.deck.length - 1].suit; // Trump is bottom card
    this.trumpCard = this.deck[this.deck.length - 1];
    this.dealCards();
    // First attacker is human
    this.attackerIndex = this.players.findIndex(p => !p.isBot);
    this.defenderIndex = (this.attackerIndex + 1) % this.players.length;
    this.currentAttacker = this.players[this.attackerIndex];
    this.currentDefender = this.players[this.defenderIndex];
    this.broadcastState();
  }

  dealCards() {
    for (const player of this.players) {
      while (player.hand.length < 6 && this.deck.length > 1) { // Leave trump
        player.hand.push(this.deck.shift());
      }
    }
  }

  canAttack(card, table) {
    if (table.length === 0) return true;
    return table.some(pair => pair.attack.rank === card.rank);
  }

  canDefend(defendCard, attackCard) {
    if (defendCard.suit === attackCard.suit) {
      return defendCard.value > attackCard.value;
    }
    if (defendCard.suit === this.trumpSuit && attackCard.suit !== this.trumpSuit) {
      return true;
    }
    if (defendCard.suit === this.trumpSuit && attackCard.suit === this.trumpSuit) {
      return defendCard.value > attackCard.value;
    }
    return false;
  }

  canTransfer(card, table) {
    if (table.length === 0) return false;
    return table.some(pair => pair.attack.rank === card.rank);
  }

  playCard(playerId, card, action, pairIndex = null) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    const cardIndex = player.hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
    if (cardIndex === -1) return false;

    if (playerId === this.currentAttacker.id) {
      if (action === 'attack' && this.canAttack(card, this.table) && this.table.length < 6) {
        player.hand.splice(cardIndex, 1);
        this.table.push({ attack: card, defend: null });
        this.broadcastState();
        return true;
      }
    } else if (playerId === this.currentDefender.id) {
      if (action === 'defend' && pairIndex !== null && pairIndex < this.table.length && !this.table[pairIndex].defend) {
        const attackCard = this.table[pairIndex].attack;
        if (this.canDefend(card, attackCard)) {
          player.hand.splice(cardIndex, 1);
          this.table[pairIndex].defend = card;
          this.broadcastState();
          return true;
        }
      } else if (action === 'transfer' && this.canTransfer(card, this.table)) {
        player.hand.splice(cardIndex, 1);
        this.table.push({ attack: card, defend: null });
        // Transfer to next player
        this.defenderIndex = (this.defenderIndex + 1) % this.players.length;
        this.currentDefender = this.players[this.defenderIndex];
        this.broadcastState();
        return true;
      }
    }
    return false;
  }

  throwIn(playerId, card) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;
    const cardIndex = player.hand.findIndex(c => c.suit === card.suit && c.rank === card.rank);
    if (cardIndex === -1) return false;
    if (this.canAttack(card, this.table) && this.table.length < 6 && player !== this.currentDefender) {
      player.hand.splice(cardIndex, 1);
      this.table.push({ attack: card, defend: null });
      this.broadcastState();
      return true;
    }
    return false;
  }

  pass(playerId) {
    const player = this.players.find(p => p.socketId === playerId || p.id === playerId);
    if (!player) return false;
    if (player === this.currentAttacker && this.table.every(pair => pair.defend)) {
      // Attacker passes, discard table
      this.discardPile.push(...this.table.flatMap(pair => [pair.attack, pair.defend].filter(c => c)));
      this.table = [];
      this.nextAttacker();
      this.dealCards();
      this.broadcastState();
      return true;
    } else if (player === this.currentDefender && this.table.some(pair => !pair.defend)) {
      // Defender takes, attacker continues
      const defender = this.currentDefender;
      defender.hand.push(...this.table.flatMap(pair => [pair.attack, pair.defend].filter(c => c)));
      this.table = [];
      this.dealCards();
      this.broadcastState();
      return true;
    }
    return false;
  }

  beat(playerId) {
    const player = this.players.find(p => p.socketId === playerId || p.id === playerId);
    if (!player) return false;
    if (player === this.currentAttacker && this.table.every(pair => pair.defend)) {
      // Attacker beats, discard table
      this.discardPile.push(...this.table.flatMap(pair => [pair.attack, pair.defend].filter(c => c)));
      this.table = [];
      this.nextAttacker();
      this.dealCards();
      this.broadcastState();
      return true;
    }
    return false;
  }

  nextAttacker() {
    this.attackerIndex = (this.attackerIndex + 1) % this.players.length;
    this.defenderIndex = (this.attackerIndex + 1) % this.players.length;
    this.currentAttacker = this.players[this.attackerIndex];
    this.currentDefender = this.players[this.defenderIndex];
  }

  checkWin() {
    for (const player of this.players) {
      if (player.hand.length === 0) {
        if (this.deck.length === 1) { // Trump left
          this.winner = player;
          this.gameOver = true;
        } else {
          this.loser = player;
          this.gameOver = true;
        }
      }
    }
  }

  broadcastState() {
    if (this.trumpSuit) {
      this.checkWin();
    }
    const state = {
      players: this.players.map(p => ({ id: p.id, name: p.name, cardCount: p.hand.length, isReady: p.isReady })),
      trumpSuit: this.trumpSuit,
      table: this.table,
      currentAttacker: this.currentAttacker ? this.currentAttacker.id : null,
      currentDefender: this.currentDefender ? this.currentDefender.id : null,
      discardPile: this.discardPile.length,
      deckCount: this.deck.length,
      trumpCard: this.trumpCard,
      winner: this.winner ? this.winner.name : null,
      loser: this.loser ? this.loser.name : null,
      gameOver: this.gameOver
    };
    io.to(this.roomId).emit('gameState', state);
    this.players.forEach(player => {
      if (player.socketId) {
        io.to(player.socketId).emit('yourHand', player.hand);
      }
    });
    // Bot logic
    if ((this.currentAttacker && this.currentAttacker.isBot || this.currentDefender && this.currentDefender.isBot) && !this.gameOver) {
      this.botPlay();
    }
  }

  async botPlay() {
    const bot = this.players.find(p => p.isBot);
    if (!bot) return;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    if (this.currentAttacker.id === bot.id) {
      // Bot is attacker
      // Try to attack with first possible card
      for (let i = 0; i < bot.hand.length; i++) {
        if (this.canAttack(bot.hand[i], this.table)) {
          await delay(2000);
          this.playCard(bot.id, bot.hand[i], 'attack');
          return;
        }
      }
      // No attack, if all defended, beat, else pass
      if (this.table.every(pair => pair.defend)) {
        await delay(2000);
        this.beat(bot.id);
      } else {
        await delay(2000);
        this.pass(bot.id);
      }
    } else if (this.currentDefender.id === bot.id) {
      // Bot is defender
      if (this.table.length > 0) {
        for (let i = 0; i < this.table.length; i++) {
          if (!this.table[i].defend) {
            const attackCard = this.table[i].attack;
            // Find a card to defend
            for (let j = 0; j < bot.hand.length; j++) {
              if (this.canDefend(bot.hand[j], attackCard)) {
                await delay(2000);
                // Play defend card but do not remove from hand yet
                this.table[i].defend = bot.hand[j];
                // Remove card from hand after successful defense
                bot.hand.splice(j, 1);
                this.broadcastState();
                return;
              }
            }
          }
        }
      }
      // Can't defend, take
      await delay(2000);
      this.pass(bot.id);
    }
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (data) => {
    const { roomId, playerName, playerId } = data;
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], game: new Game(roomId) };
    }
    let player = rooms[roomId].players.find(p => p.id === playerId);
    if (!player) {
      player = { id: playerId, name: playerName, socketId: socket.id, hand: [], isBot: false, isReady: false };
      rooms[roomId].players.push(player);
      rooms[roomId].game.players.push(player);
      if (rooms[roomId].players.filter(p => !p.isBot).length === 1) {
        const bot = { id: 'bot', name: 'Бот', socketId: null, hand: [], isBot: true, isReady: true };
        rooms[roomId].players.push(bot);
        rooms[roomId].game.players.push(bot);
      }
      if (rooms[roomId].players.length >= 2) {
        rooms[roomId].game.startGame();
      }
    } else {
      player.socketId = socket.id;
      socket.emit('yourHand', player.hand);
    }
    rooms[roomId].game.broadcastState();
  });

  socket.on('playCard', (data) => {
    const { roomId, card, action, pairIndex } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        rooms[roomId].game.playCard(player.id, card, action, pairIndex);
      }
    }
  });

  socket.on('throwIn', (data) => {
    const { roomId, card } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        rooms[roomId].game.throwIn(player.id, card);
      }
    }
  });

  socket.on('pass', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        rooms[roomId].game.pass(player.id);
      }
    }
  });

  socket.on('beat', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        rooms[roomId].game.beat(player.id);
      }
    }
  });

  socket.on('ready', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = true;
        rooms[roomId].game.players.find(p => p.id === player.id).isReady = true;
        if (rooms[roomId].game.players.every(p => p.isReady)) {
          rooms[roomId].game.startGame();
        } else {
          rooms[roomId].game.broadcastState();
        }
      }
    }
  });

  socket.on('surrender', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        rooms[roomId].game.loser = player;
        rooms[roomId].game.winner = rooms[roomId].players.find(p => p.id !== player.id);
        rooms[roomId].game.gameOver = true;
        rooms[roomId].game.broadcastState();
      }
    }
  });

  socket.on('restart', (data) => {
    const { roomId } = data;
    if (rooms[roomId]) {
      rooms[roomId].game = new Game(roomId);
      rooms[roomId].game.players = rooms[roomId].players.map(p => ({ ...p, hand: [], isReady: p.isBot ? true : false }));
      rooms[roomId].game.broadcastState();
    }
  });

  socket.on('chatMessage', (data) => {
    io.to(data.roomId).emit('chatMessage', { player: socket.id, message: data.message });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const player = rooms[roomId].players.find(p => p.socketId === socket.id);
      if (player) {
        player.socketId = null;
      }
      const gamePlayer = rooms[roomId].game.players.find(p => p.id === player?.id);
      if (gamePlayer) {
        gamePlayer.socketId = null;
      }
      // Don't delete room, keep state
    }
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});

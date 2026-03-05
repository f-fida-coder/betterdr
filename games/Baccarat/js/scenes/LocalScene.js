export default class LocalScene extends Phaser.Scene {
  constructor() { super({ key: 'LocalScene' }); }



  create() {

    this.lastResults = [];
    this.resultItems = [];

    this.resultsPanel = this.add.container(0, 0).setVisible(false);
    this.resultsPanel.setDepth(1000);

    // More compact silver panel
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0b0b0b, 0.75);
    panelBg.fillRoundedRect(60, 230, 105, 370, 18);

    panelBg.lineStyle(1, 0xffffff, 0.3);
    panelBg.strokeRoundedRect(64, 234, 97, 362, 14);

    this.resultsPanel.add(panelBg);

    const startX = 128;
    const startY = 265;
    const gapY = 58;
    const maxResults = 6;

    this.addResult = (playerTotal, bankerTotal) => {
      this.lastResults.unshift({ playerTotal, bankerTotal });
      if (this.lastResults.length > maxResults) {
        this.lastResults.pop();
      }

      this.resultItems.forEach(item => item.destroy());
      this.resultItems = [];

      this.lastResults.forEach((r, i) => {
        const y = startY + i * gapY;

        const isStrong = r.playerTotal >= 6 || r.bankerTotal >= 6;

        let winColor = 0x2e7d32;
        if (r.playerTotal > r.bankerTotal) winColor = 0x1e88e5;
        if (r.bankerTotal > r.playerTotal) winColor = 0xe53935;

        const fontSize = '27px';

        const pTxt = this.add.text(
          startX - 15 - 10,
          y,
          `${r.playerTotal}`,
          { fontSize, fontStyle: 'bold', color: '#92907bff' }
        ).setOrigin(1, 0.5);

        const bTxt = this.add.text(
          startX - 15 + 10,
          y,
          `${r.bankerTotal}`,
          { fontSize, fontStyle: 'bold', color: '#92907bff' }
        ).setOrigin(0, 0.5);

        this.resultsPanel.add(pTxt);
        this.resultsPanel.add(bTxt);

        this.resultItems.push(pTxt, bTxt);
      });
    };
    // Ensure correct Deal button state on create
    try { this.updateDealButtonState && this.updateDealButtonState(); } catch (e) { }

    // Ensure nextBtn hidden by default
    if (this.nextBtn) { try { this.nextBtn.setVisible(false); this.nextBtn.disableInteractive && this.nextBtn.disableInteractive(); } catch (e) { } }


    // --- Betting UI additions: multiple bet amounts + auto-bet + multi-bet support ---
    this.betAmounts = [1, 5, 10, 25, 50, 100];
    this.currentBetAmount = 1;
    this.bets = { Tie: 0, Player: 0, Banker: 0 };
    this.lastBetZone = null;
    this.autoBet = true;
    if (!this.currentBet) this.currentBet = { type: null, amount: 0 };


    const { width, height } = this.scale;

    if (this.textures.exists('table_bg')) {
      this.bg = this.add.image(width / 2, height / 2, 'table_bg').setOrigin(0.5);
      this.bg.setDisplaySize(width, height);
    } else {
      this.cameras.main.setBackgroundColor('#012a14');
    }

    /* this.add.text(width / 2, 36, 'Local: You vs Bot', {
       fontSize: '28px', color: '#FFD700', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 6
     }).setOrigin(0.5);*/

    this.playerPos = { x: width * 0.38, y: height * 0.31 };
    this.bankerPos = { x: width * 0.55, y: height * 0.31 };
    this.deckPos = { x: width * 0.5, y: height * 0.15 };



    // Shoe (right of banker) — no rotation
    if (this.textures.exists('shoe')) {
      this.shoe = this.add.image(Math.round(width * 0.75), Math.round(height * 0.30), 'shoe')
        .setOrigin(0.5);

    }

    // Discard tray (left side) — no rotation
    if (this.textures.exists('discard_tray')) {
      this.discardTray = this.add.image(Math.round(width * 0.22), Math.round(height * 0.30), 'discard_tray')
        .setOrigin(0.5);
    }


    this.playerSprites = []; this.bankerSprites = [];

    this.playerText = this.add.text(this.playerPos.x - 120, this.playerPos.y - 20, 'Player: -', { fontSize: '28px', color: '#FFD700', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 6 });
    this.bankerText = this.add.text(this.bankerPos.x + 155, this.bankerPos.y - 20, 'Banker: -', { fontSize: '28px', color: '#FFD700', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 6 });

    this.clearBtn = this.add.image((width / 2) + 270, height - 58, 'btn_clear').setInteractive({ useHandCursor: true });
    this.clearBtn.on('pointerup', () => this.clearBet());
    this.clearBtn.angle = -10;
    this.clearBtn.setScale(0.8);

    this.dealBtn = this.add.image((width / 2) + 410, height - 90, 'btn_deal').setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.dealBtn.angle = -16;
    this.dealBtn.setScale(0.85);
    this.dealBtn.on('pointerup', () => this.dealRound());
    const addHoverScale = (btn, baseScale = 0.8, hoverScale = 0.9, dur = 150) => {
      btn.setScale(baseScale);
      btn.on('pointerover', () => {
        try { this.tweens.killTweensOf(btn); } catch (e) { }
        this.tweens.add({
          targets: btn,
          scale: hoverScale,
          duration: dur,
          ease: 'Cubic.easeOut'
        });
      });

      btn.on('pointerout', () => {
        try { this.tweens.killTweensOf(btn); } catch (e) { }
        this.tweens.add({
          targets: btn,
          scale: baseScale,
          duration: dur,
          ease: 'Cubic.easeOut'
        });
      });
    };

    addHoverScale(this.dealBtn);
    addHoverScale(this.clearBtn);

    this.chipKey = "chip1";


    // --- Betting state & UI ---
    this.balance = 100; // starting balance
    this.currentBet = { type: null, amount: 0 };
    try {
      if (this.tieBetText) this.tieBetText.setText('$0').setVisible(false);
      if (this.bankerBetText) this.bankerBetText.setText('$0').setVisible(false);
      if (this.playerBetText) this.playerBetText.setText('$0').setVisible(false);
    } catch (e) { };

    this.betPlaced = false;

    // Balance and bet display
    // Styled balance display: rounded background + centered text (top-left)
    const balX = 20;
    const balY = 100;
    const balW = 270;
    const balH = 52;
    const balRadius = 12;

    // Background
    const balanceBg = this.add.graphics();
    balanceBg.fillStyle(0x1a1a1a, 0.85);
    balanceBg.fillRoundedRect(balX, balY, balW, balH, balRadius);

    // Optional border / highlight
    balanceBg.lineStyle(2, 0x22a411, 0.9);
    balanceBg.strokeRoundedRect(balX, balY, balW, balH, balRadius);

    // Balance text
    this.balanceText = this.add.text(balX + balW / 2, balY + balH / 2, 'Balance: $' + this.balance, {
      fontSize: '22px', color: '#5ef45eff', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);

    // Group into container for convenience
    this.balanceContainer = this.add.container(0, 0, [balanceBg, this.balanceText]);
    this.balanceContainer.setDepth(50);


    // --- Clickable table bet zones (select-only) ---
    const tieZoneX = this.scale.width * 0.5;
    const tieZoneY = this.scale.height * 0.56;
    const tieZoneW = 580;
    const tieZoneH = 95;

    const playerZoneX = this.scale.width * 0.5;
    const playerZoneY = this.scale.height * 0.79;
    const playerZoneW = 780;
    const playerZoneH = 120;

    const bankerZoneX = this.scale.width * 0.5;
    const bankerZoneY = this.scale.height * 0.67;
    const bankerZoneW = 680;
    const bankerZoneH = 100;

    this.tieZone = this.add.rectangle(tieZoneX, tieZoneY, tieZoneW, tieZoneH, 0x000000, 0.0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.playerZone = this.add.rectangle(playerZoneX, playerZoneY, playerZoneW, playerZoneH, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.bankerZone = this.add.rectangle(bankerZoneX, bankerZoneY, bankerZoneW, bankerZoneH, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // --- Result labels to the right of zones ---
    const makeZoneResultText = () => {
      const t = this.add.text(0, 0, '', { fontSize: '18px', fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(60).setVisible(false);
      return t;
    };
    this.tieResultText = makeZoneResultText();
    this.playerResultText = makeZoneResultText();
    this.bankerResultText = makeZoneResultText();

    /*this.add.text(width / 2, 36, 'Local: You vs Banker (Server)', {
      fontSize: '28px', color: '#FFD700', fontFamily: 'Arial Black', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5);*/
    // --- Bet amount texts shown on table zones ---

    this.tieBetText = this.add.text(tieZoneX, tieZoneY + 30, '$0', { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.bankerBetText = this.add.text(bankerZoneX, bankerZoneY + 30, '$0', { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.playerBetText = this.add.text(playerZoneX, playerZoneY + 30, '$0', { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial Black' }).setOrigin(0.5).setDepth(50).setVisible(false);
    this.tieZone.on('pointerup', () => {
      this.addBet('Tie');
      this.flashZone(this.tieZone);
    });
    this.playerZone.on('pointerup', () => {
      this.addBet('Player');
      this.flashZone(this.playerZone);
    });
    this.bankerZone.on('pointerup', () => {
      this.addBet('Banker');
      this.flashZone(this.bankerZone);
    });

    const chipBgWidth = 500; // adjust for your number of chips
    const chipBgHeight = 90;
    const chipBgX = 390; // center of chip row
    const chipBgY = height - 58;

    const chipBg = this.add.graphics();
    chipBg.fillStyle(0x1d150c, 0.8); // dark gray tone
    chipBg.fillRoundedRect(chipBgX - chipBgWidth / 2, chipBgY - chipBgHeight / 2, chipBgWidth, chipBgHeight, 30);
    chipBg.lineStyle(2, 0xbc9124, 1);
    chipBg.strokeRoundedRect(chipBgX - chipBgWidth / 2, chipBgY - chipBgHeight / 2, chipBgWidth, chipBgHeight, 30);
    chipBg.setDepth(0);

    // --- Bet amount quick-select buttons ---
    try {
      const startX = 190;
      const startY = height - 50;
      const gap = 80;
      this.betAmountButtons = [];
      this.betAmounts.forEach((amt, i) => {
        const x = startX + i * gap;
        // create chip image button with hover scale animation
        const btn = this.add.image(x, startY - 8, 'chip' + amt)
          .setInteractive({ useHandCursor: true })
          .setScale(0.85)
          .setDepth(2);

        const baseScale = 0.85;
        const hoverScale = 1.05;
        const animDur = 150;

        btn.on('pointerover', () => {
          try { this.tweens.killTweensOf(btn); } catch (e) { }
          this.tweens.add({
            targets: btn,
            scale: hoverScale,
            duration: animDur,
            ease: 'Cubic.easeOut'
          });
        });

        btn.on('pointerout', () => {
          try { this.tweens.killTweensOf(btn); } catch (e) { }
          this.tweens.add({
            targets: btn,
            scale: baseScale,
            duration: animDur,
            ease: 'Cubic.easeOut'
          });
        });

        btn.on('pointerup', () => {
          this.chipKey = "chip" + amt;

          // select this bet amount
          this.currentBetAmount = amt;
          if (this.sound) this.sound.play('button_click', { volume: 0.7 });
          // visual selection feedback (alpha)
          try { this.betAmountButtons.forEach(b => b.btn.setAlpha(1)); } catch (e) { }
          btn.setAlpha(0.9);
        });

        this.betAmountButtons.push({ btn, amt });
      });
      btn.on('pointerdown', () => {
        this.currentBetAmount = amt;
        try {
          this.betAmountButtons.forEach(b => b.btn.setFillStyle(0xffffff));
          btn.setFillStyle(0x888888);
        } catch (e) { }
        if (this.currentBet && this.currentBet.type) {
          this.currentBet.amount = amt;
        }
      });
      this.betAmountButtons.push({ btn, amt });

      if (this.betAmountButtons[0] && this.betAmountButtons[0].btn.setFillStyle) this.betAmountButtons[0].btn.setFillStyle(0x888888);
    } catch (e) { }


    this.nextBtn = this.add.text(width - 140, height - 140, 'Next', { fontSize: '20px', color: '#fff', backgroundColor: '#006600', padding: { x: 12, y: 6 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.nextBtn.on('pointerup', async () => { await this.collectToDiscard(); this.resetRound(); });

    this.backBtn = this.add.image(65, 35, 'back_btn').setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerup', () => this.scene.start('MenuScene'));

    this.createDeck();
    this.resetRound();
    this.playing = false;

    this.fsButton = this.add.text(width - 28, 24, '⛶', { fontSize: '28px', color: '#fff' }).setOrigin(1, 0).setInteractive().setDepth(100);
    this.fsButton.on('pointerup', () => {
      if (this.scale.isFullscreen) {

        this.scale.stopFullscreen();
      }
      else {

        this.scale.startFullscreen();
      }
    });

  }

  addBet(zone, amount) {
    if (this.playing) return;
    // sound: chip place
    if (this.sound) this.sound.play('chip_place', { volume: 0.7 });
    try {
      let zoneKey = 'global';
      let baseX = 400, baseY = 300;

      // If zone is a string, map to this.playerZone / this.bankerZone / this.tieZone
      if (typeof zone === 'string') {
        const zname = zone.toLowerCase();
        if (zname === 'player' && this.playerZone) {
          baseX = this.playerZone.x; baseY = this.playerZone.y; zoneKey = 'player';
        } else if (zname === 'banker' && this.bankerZone) {
          baseX = this.bankerZone.x; baseY = this.bankerZone.y; zoneKey = 'banker';
        } else if (zname === 'tie' && this.tieZone) {
          baseX = this.tieZone.x; baseY = this.tieZone.y; zoneKey = 'tie';
        } else {
          // fallback: try this[zone + 'Zone']
          const prop = zone + 'Zone';
          if (this[prop] && this[prop].x !== undefined) {
            baseX = this[prop].x; baseY = this[prop].y; zoneKey = zone;
          }
        }
      } else if (zone && typeof zone === 'object') {
        if (zone.x !== undefined && zone.y !== undefined) { baseX = zone.x; baseY = zone.y; }
        else if (zone.getBounds) { const b = zone.getBounds(); baseX = b.centerX; baseY = b.centerY; }
        if (zone.name) zoneKey = zone.name;
      }

      amount = amount || this.currentBetAmount || (this.currentBet && this.currentBet.amount) || 1;
      if (!['Tie', 'Player', 'Banker'].includes(zone)) return;
      // Ensure sufficient balance (total existing bets + amount <= balance)
      const totalExisting = (this.bets.Tie || 0) + (this.bets.Player || 0) + (this.bets.Banker || 0);
      if (this.balance != null && (totalExisting + amount) > this.balance) {
        return;
      }
      // add to internal bets
      this.bets[zone] = (this.bets[zone] || 0) + amount;
      try {
        if (zone === 'Tie' && this.tieBetText) { this.tieBetText.setText('$' + this.bets.Tie).setVisible(true); }
        if (zone === 'Player' && this.playerBetText) { this.playerBetText.setText('$' + this.bets.Player).setVisible(true); }
        if (zone === 'Banker' && this.bankerBetText) { this.bankerBetText.setText('$' + this.bets.Banker).setVisible(true); }
      } catch (e) { }

      try {
        if (typeof this.balance === 'number') {
          this.balance -= amount;
          if (this.balanceText) this.balanceText.setText('Balance: $' + this.balance);
        }
      } catch (e) { console.warn('balance deduction failed', e); }

      if (!this._betsByZone) this._betsByZone = {};
      if (!this._betsByZone[zoneKey]) this._betsByZone[zoneKey] = [];
      const zoneList = this._betsByZone[zoneKey];

      // create container at base position
      const container = this.add.container(baseX, baseY);
      let chipImg = this.add.image(0, 0, this.chipKey).setOrigin(0.5).setScale(0.5);
      container.add([chipImg]);

      // bottom-to-top stacking
      const maxVisible = 5;
      const spacing = 8;
      const index = zoneList.length;
      const visibleIndex = index % maxVisible;
      container.x = baseX;
      container.y = baseY - (visibleIndex * spacing);
      zoneList.push({ container: container, amount: amount });

      if (zoneList.length > maxVisible) {
        const removed = zoneList.shift();
        if (removed && removed.container) removed.container.destroy();
        for (let i = 0; i < zoneList.length; i++) {
          const c = zoneList[i].container;
          c.x = baseX;
          c.y = baseY - (i * spacing);
        }
      }

      container.setScale(0.5);
      this.tweens.add({ targets: container, scale: { from: 0.5, to: 1 }, ease: 'Back.Out', duration: 220 });

      this.placeBet();

    } catch (err) {
      console.error('addBet error', err);
    }
  }




  // Show a short message to the right of the named zone: 'Player'|'Banker'|'Tie'

  clearBet() {
    // sound: chip clear
    if (this.sound) this.sound.play('button_click', { volume: 0.7 });


    // refund placed bets back to balance (since we deducted on place)
    try {
      const totalToRefund = (this.bets && ((this.bets.Tie || 0) + (this.bets.Player || 0) + (this.bets.Banker || 0))) || 0;
      if (typeof this.balance === 'number' && totalToRefund > 0) {
        this.balance += totalToRefund;
        if (this.balanceText) this.balanceText.setText('Balance: $' + this.balance);
      }
    } catch (e) { console.warn('refund failed', e); }
    // reset internal bets after refund
    try { this.bets = { Tie: 0, Player: 0, Banker: 0 }; } catch (e) { }
    this.currentBet = { type: null, amount: 0 };
    try {
      if (this.tieBetText) this.tieBetText.setText('$0').setVisible(false);
      if (this.bankerBetText) this.bankerBetText.setText('$0').setVisible(false);
      if (this.playerBetText) this.playerBetText.setText('$0').setVisible(false);
    } catch (e) { };

    this.betPlaced = false;


    this.clearZone('player');
    this.clearZone('banker');
    this.clearZone('tie');

  }
  clearZone(zoneKey) {
    if (!this._betsByZone || !this._betsByZone[zoneKey]) return;

    const list = this._betsByZone[zoneKey];

    // Destroy all chip containers
    list.forEach(entry => {
      if (entry.container) {
        // removes and destroys all children (chip images)
        entry.container.removeAll(true);
        entry.container.destroy(true);   // destroy container itself
      }
    });

    // Reset the list
    this._betsByZone[zoneKey] = [];
  }

  showZoneResult(zoneName, message, color = '#00FF00', duration = 2500) {
    try {
      let zoneObj = null;
      if (zoneName === 'Tie') { zoneObj = this.tieZone; }
      else if (zoneName === 'Player') { zoneObj = this.playerZone; }
      else if (zoneName === 'Banker') { zoneObj = this.bankerZone; }
      if (!zoneObj) return;

      const bounds = (zoneObj.getBounds ? zoneObj.getBounds() : { right: zoneObj.x, centerY: zoneObj.y || 0 });
      const x = Math.round(bounds.right - 150);
      const y = Math.round(bounds.centerY || (this.cameras.main.centerY || 0));

      const isWin = (typeof color === 'string' && color.toLowerCase().indexOf('00cc') !== -1) || (message && message.toLowerCase().indexOf('won') !== -1);
      let displayAmount = message || '';
      const mAmt = (displayAmount.match(/([0-9]+(?:\.[0-9]+)?)/));
      if (mAmt) displayAmount = mAmt[0];
      const title = zoneName.toUpperCase();
      try { this.showResultPopup(x, y, title, displayAmount || 0, !!isWin); } catch (e) { console.warn('showResultPopup missing', e); }
    } catch (e) { console.warn('showZoneResult popup error', e); }
  }

  placeBet() {
    if (this.currentBet.amount > this.balance) {
      return;
    }
    this.betPlaced = true;
    try { this.updateDealButtonState && this.updateDealButtonState(); } catch (e) { }
  }

  // small visual feedback: tint flash then clear
  flashZone(zone) {
    const hl = this.add.rectangle(zone.x, zone.y, zone.width, zone.height, 0xffff00, 0).setOrigin(0.5);
    this.time.delayedCall(180, () => hl.destroy());
  }



  createDeck() {
    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.deck = [];
    for (let s of suits) for (let r of ranks) this.deck.push({ r, s, code: r + s });
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  createCardSprite(code) {
    // spawn at shoe with explicit X and Y scale (avoid shared-state bugs)
    const sprite = this.add.image(this.shoe.x, this.shoe.y, 'card_back')
      .setOrigin(0.5)
      .setScale(0.2, 0.2);   // both axes explicit
    sprite.cardCode = code;
    sprite.setDepth(1000);
    // internal flag
    sprite._isDealt = false;
    return sprite;
  }


  async dealRound() {
    if (this.betPlaced) {
      if (this.isDealing) return;
      if (this.sound) this.sound.play('button_click', { volume: 0.7 });
      this.isDealing = true;
      this.playing = true;
      this.clearSprites();
      if (this.deck.length < 6) this.createDeck();

      const order = ['P', 'B', 'P', 'B'];

      for (let i = 0; i < order.length; i++) {
        const side = order[i];
        const card = this.deck.pop();
        const spr = this.createCardSprite(card.code);
        const pIndex = this.playerSprites.length;
        const bIndex = this.bankerSprites.length;
        const tx = (side === 'P') ? this.playerPos.x + pIndex * 40 : this.bankerPos.x + bIndex * 40;
        const ty = (side === 'P') ? this.playerPos.y : this.bankerPos.y;

        spr._isDealt = true;

        await this.tweenTo(spr, tx, ty, 200);

        if (side === 'P') {
          this.playerSprites.push(spr);
        } else {
          this.bankerSprites.push(spr);
        }
        this.sound.play('card_flip', { volume: 0.7 });
        await this.revealCard(spr);
        await this.wait(60);
      }


      this.playerHand = this.playerSprites.map(s => ({ r: s.cardCode.slice(0, s.cardCode.length - 1), s: s.cardCode.slice(-1), code: s.cardCode }));
      this.bankerHand = this.bankerSprites.map(s => ({ r: s.cardCode.slice(0, s.cardCode.length - 1), s: s.cardCode.slice(-1), code: s.cardCode }));

      const pTotal = this.handValue(this.playerHand);
      const bTotal = this.handValue(this.bankerHand);

      if (pTotal >= 8 || bTotal >= 8) { this.finalizeRound(false, false); this.isDealing = false; return; }

      let playerDrew = false; let playerThird = null;
      if (pTotal <= 5) {
        this.sound.play('card_flip', { volume: 0.7 });
        playerThird = this.deck.pop(); playerDrew = true;
        const spr = this.createCardSprite(playerThird.code);
        const tx = this.playerPos.x + this.playerSprites.length * 40; const ty = this.playerPos.y;
        await this.tweenTo(spr, tx, ty, 200); this.playerSprites.push(spr); await this.revealCard(spr);
      }

      let bankerDrew = false; let bankerThird = null;
      const bTotalAfter = this.handValue(this.bankerHand);
      if (!playerDrew) {
        if (bTotalAfter <= 5) {
          this.sound.play('card_flip', { volume: 0.7 });
          bankerThird = this.deck.pop(); bankerDrew = true;
          const spr = this.createCardSprite(bankerThird.code); const tx = this.bankerPos.x + this.bankerSprites.length * 40; const ty = this.bankerPos.y;
          await this.tweenTo(spr, tx, ty, 200); this.bankerSprites.push(spr); await this.revealCard(spr);
        }
      } else {
        const p3val = this.cardPoint(playerThird);
        if (bTotalAfter <= 2) { bankerThird = this.deck.pop(); bankerDrew = true; }
        else if (bTotalAfter === 3) { if (p3val !== 8) { bankerThird = this.deck.pop(); bankerDrew = true; } }
        else if (bTotalAfter === 4) { if (p3val >= 2 && p3val <= 7) { bankerThird = this.deck.pop(); bankerDrew = true; } }
        else if (bTotalAfter === 5) { if (p3val >= 4 && p3val <= 7) { bankerThird = this.deck.pop(); bankerDrew = true; } }
        else if (bTotalAfter === 6) { if (p3val === 6 || p3val === 7) { bankerThird = this.deck.pop(); bankerDrew = true; } }
        if (bankerDrew) {
          this.sound.play('card_flip', { volume: 0.7 });
          const spr = this.createCardSprite(bankerThird.code); const tx = this.bankerPos.x + this.bankerSprites.length * 40; const ty = this.bankerPos.y;
          await this.tweenTo(spr, tx, ty, 200); this.bankerSprites.push(spr); await this.revealCard(spr);
        }
      }

      this.finalizeRound(playerDrew, bankerDrew); this.isDealing = false;
    }
  }

  revealCard(sprite) {
    return new Promise(res => {
      // close width to 0
      this.tweens.add({
        targets: sprite,
        scaleX: 0,
        duration: 160,
        ease: 'Quad.easeIn',
        onComplete: () => {
          const code = sprite.cardCode;
          // swap texture to face BEFORE opening
          if (this.textures.exists(code)) sprite.setTexture(code);
          // while width is zero, set height to final value (prevents vertical pop)
          sprite.setScale(0, 1.0);
          // open width to final
          this.tweens.add({
            targets: sprite,
            scaleX: 1.0,
            duration: 160,
            ease: 'Quad.easeOut',
            onComplete: () => {
              // enforce exact final scale (defensive)
              try { sprite.setScale(1.0, 1.0); } catch (e) { }
              res();
            }
          });
        }
      });
    });
  }


  tweenTo(sprite, tx, ty, dur = 400) {
    // move AND grow to full 1.0 on both axes (keeps width/height in sync)
    return new Promise(res => {
      try { sprite.setActive(true); sprite.setVisible(true); sprite.setDepth(2000); } catch (e) { }
      this.tweens.add({
        targets: sprite,
        x: tx,
        y: ty,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: dur,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          try { sprite.setDepth(100); } catch (e) { }
          res();
        }
      });
    });
  }


  wait(ms) { return new Promise(res => this.time.delayedCall(ms, res)); }

  cardPoint(card) { const r = card.r; if (r === 'A') return 1; if (r === 'J' || r === 'Q' || r === 'K' || r === '10') return 0; return parseInt(r, 10); }

  handValue(hand) { const total = hand.reduce((s, c) => s + this.cardPoint(c), 0); return total % 10; }

  finalizeRound(playerDrew, bankerDrew) {
    const pFinal = this.handValue(this.playerSprites.map(s => ({ r: s.cardCode.slice(0, s.cardCode.length - 1), s: s.cardCode.slice(-1), code: s.cardCode })));
    const bFinal = this.handValue(this.bankerSprites.map(s => ({ r: s.cardCode.slice(0, s.cardCode.length - 1), s: s.cardCode.slice(-1), code: s.cardCode })));
    let result = 'Tie';

    this.addResult(pFinal, bFinal);
    this.resultsPanel.setVisible(true);

    if (pFinal > bFinal) result = 'Player wins'; else if (bFinal > pFinal) result = 'Banker wins';
    this.playerText.setText(pFinal);
    this.bankerText.setText(bFinal);
    let info = ''; info += playerDrew ? 'Player drew a third card. ' : 'Player stood. '; info += bankerDrew ? 'Banker drew a third card. ' : 'Banker stood. '; info += '\nResult: ' + result;



    // --- Apply betting result (if any) ---
    try {
      // Use this.bets object for multi-bet payouts. Bets were deducted on placement.
      let totalReturn = 0; // amount to add back to balance (includes original stakes)
      let profit = 0;
      const pBet = (this.bets && this.bets.Player) || 0;
      const bBet = (this.bets && this.bets.Banker) || 0;
      const tBet = (this.bets && this.bets.Tie) || 0;

      if (result.indexOf('Player') === 0) {
        // Player wins: Player bets return 2x (stake + profit). Banker and Tie lose.
        if (pBet > 0) { totalReturn += pBet * 2; profit += pBet * 1; }
      } else if (result.indexOf('Banker') === 0) {
        // Banker wins: Banker bets return 1.95x (stake + 0.95 profit)
        if (bBet > 0) { totalReturn += bBet * 1.95; profit += bBet * 0.95; }
      } else { // Tie
        // Tie bets pay 9x (stake + 8x profit). Player and Banker bets push (refunded).
        if (tBet > 0) { totalReturn += tBet * 9; profit += tBet * 8; }
        // Refund Player and Banker stakes (push)
        if (pBet > 0) { totalReturn += pBet; }
        if (bBet > 0) { totalReturn += bBet; }
      }

      // Apply rounding if desired (e.g., to 2 decimals) and update balance
      if (totalReturn > 0) {
        // Round to 2 decimals to avoid floating point issues
        totalReturn = Math.round(totalReturn * 100) / 100;
        profit = Math.round(profit * 100) / 100;
        this.balance = (typeof this.balance === 'number') ? (this.balance + totalReturn) : this.balance;
        if (this.balanceText) this.balanceText.setText('Balance: $' + this.balance);
      }


      // Show per-zone results on the right of each betting zone
      try {
        // Player
        if (pBet > 0) {
          if (result.indexOf('Player') === 0) {
            if (this.sound) this.sound.play('win_chime', { volume: 0.7 });
            const pProfit = Math.round(pBet * 1 * 100) / 100;
            this.showZoneResult('Player', 'Won $' + pProfit, '#00cc00');
          } else if (result.indexOf('Tie') === 0) {
            this.showZoneResult('Player', 'Push', '#cccc00');
          } else {
            this.showZoneResult('Player', 'Lost $' + pBet, '#ff3333');
          }
        }
        // Banker
        if (bBet > 0) {
          if (result.indexOf('Banker') === 0) {
            if (this.sound) this.sound.play('win_chime', { volume: 0.7 });
            const bProfit = Math.round(bBet * 0.95 * 100) / 100;
            this.showZoneResult('Banker', 'Won $' + bProfit, '#00cc00');
          } else if (result.indexOf('Tie') === 0) {
            this.showZoneResult('Banker', 'Push', '#cccc00');
          } else {
            this.showZoneResult('Banker', 'Lost $' + bBet, '#ff3333');
          }
        }
        // Tie
        if (tBet > 0) {
          if (result.indexOf('Tie') === 0) {
            if (this.sound) this.sound.play('win_chime', { volume: 0.7 });
            const tProfit = Math.round(tBet * 8 * 100) / 100;
            this.showZoneResult('Tie', 'Won $' + tProfit, '#00cc00');
          } else {
            this.showZoneResult('Tie', 'Lost $' + tBet, '#ff3333');
          }
        }
      } catch (e) { console.warn('zone result display error', e); }


      // mark bets cleared for next actions (visuals and flags). Actual numeric clearing handled in resetRound()
      this.betPlaced = false;
    } catch (e) { console.warn('Bet payout error', e); }
    this.nextBtn.setVisible(true);

    // Auto-advance to next round after showing results
    try {
      if (this.nextBtn) { try { this.nextBtn.setVisible(false); this.nextBtn.disableInteractive && this.nextBtn.disableInteractive(); } catch (e) { } }
    } catch (e) { }
    const _WAIT_MS = 3000;
    try {
      this.time.delayedCall(_WAIT_MS, () => { try { this.startNextRound(); } catch (e) { console.error(e); } }, [], this);
    } catch (e) { /* ignore */ }
  }

  resetRound() {

    // clear visual bet displays and internal bets on round reset (do not refund here - round finished)
    try {
      this.bets = { Tie: 0, Player: 0, Banker: 0 };

      try {
        if (this.tieResultText) { this.tieResultText.setVisible(false); this.tieResultText.setText(''); }
        if (this.playerResultText) { this.playerResultText.setVisible(false); this.playerResultText.setText(''); }
        if (this.bankerResultText) { this.bankerResultText.setVisible(false); this.bankerResultText.setText(''); }
      } catch (e) { }
      if (this.tieBetText) this.tieBetText.setText('$0').setVisible(false);
      if (this.playerBetText) this.playerBetText.setText('$0').setVisible(false);
      if (this.bankerBetText) this.bankerBetText.setText('$0').setVisible(false);

      this.betPlaced = false;
    } catch (e) { console.warn('resetRound clear bets error', e); }
    this.clearSprites();
    this.playerSprites = [];
    this.bankerSprites = [];
    this.playerText.setText('');
    this.bankerText.setText('');

    try { this.updateDealButtonState && this.updateDealButtonState(); } catch (e) { }
  }

  clearSprites() { if (this.playerSprites) { this.playerSprites.forEach(s => s.destroy()); } if (this.bankerSprites) { this.bankerSprites.forEach(s => s.destroy()); } this.playerSprites = []; this.bankerSprites = []; }
  getDiscardPos() {
    return {
      x: this.discardTray.x,
      y: this.discardTray.y
    };
  }

  async collectToDiscard() {
    const target = this.getDiscardPos() || { x: this.discardTray.x, y: this.discardTray.y };
    const all = [].concat(this.playerSprites || [], this.bankerSprites || []);
    for (let i = 0; i < all.length; i++) {
      this.sound.play('card_flip', { volume: 0.7 });
      const s = all[i];
      if (!s || !s.x) continue;
      await new Promise(res => {
        this.tweens.add({
          targets: s,
          x: target.x + (Math.random() * 20 - 10),
          y: target.y + (Math.random() * 10 - 5),
          angle: -90 + (Math.random() * 20 - 10),
          scaleX: 0.3,
          scaleY: 0.3,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => { try { s.destroy(); } catch (e) { }; res(); }
        });
      });
      await this.wait(40);
    }
    this.playerSprites = []; this.bankerSprites = [];
  }
  // Auto-start next round after showing results (added by assistant)
  async startNextRound() {
    if (this._startingNextRound) return;
    this._startingNextRound = true;
    try {
      // Hide nextBtn if present
      if (this.nextBtn) {
        try { this.nextBtn.setVisible(false); } catch (e) { }
        try { this.nextBtn.disableInteractive && this.nextBtn.disableInteractive(); } catch (e) { }
      }
      // collect to discard if function exists
      if (typeof this.collectToDiscard === 'function') {
        await this.collectToDiscard();
      } else if (this.collectToDiscard) {
        try { this.collectToDiscard(); } catch (e) { }
      }
      // small pause to ensure animations/tweens finish
      await new Promise(res => this.time.delayedCall(200, res));
      // reset the round
      if (typeof this.resetRound === 'function') {
        this.resetRound();
      }
    } catch (err) {
      console.error('startNextRound error', err);
      if (typeof this.resetRound === 'function') this.resetRound();
    } finally {
      this._startingNextRound = false;
    }
    this.playing = false;

    this.clearZone('player');
    this.clearZone('banker');
    this.clearZone('tie');

  }


  // Enable or disable the Deal button based on whether there are active bets.
  updateDealButtonState() {
    try {
      // expect this.bets to be an object/array holding current bets; fallback to checking bet text fields
      let hasBet = false;
      try {
        if (this.bets) {
          // bets could be object with amounts: { player: {amount: X}, banker: {...}, tie: {...} }
          if (Array.isArray(this.bets)) {
            hasBet = this.bets.some(b => b && b.amount && b.amount > 0);
          } else if (typeof this.bets === 'object') {
            for (const k in this.bets) {
              if (this.bets[k] && this.bets[k].amount && this.bets[k].amount > 0) { hasBet = true; break; }
            }
          }
        }
      } catch (e) { /* ignore */ }
      // Fallback: check known bet text elements if present (playerBetText, bankerBetText, tieBetText)
      if (!hasBet) {
        try { if (this.playerBetText && parseFloat(this.playerBetText.text) > 0) hasBet = true; } catch (e) { }
        try { if (this.bankerBetText && parseFloat(this.bankerBetText.text) > 0) hasBet = true; } catch (e) { }
        try { if (this.tieBetText && parseFloat(this.tieBetText.text) > 0) hasBet = true; } catch (e) { }
      }


    } catch (err) {
      console.error('updateDealButtonState error', err);
    }
  }




  /**
   * showResultPopup — displays a small popup near a betting zone (right side by default).
   */
  showResultPopup(anchorX, anchorY, title, amount, isWin = true) {
    const scene = this;
    const width = 160;
    const height = 72;
    const padding = 8;
    const radius = 10;
    const cx = anchorX + 40; // offset to the right
    const cy = anchorY - height / 2;

    const container = scene.add.container(cx, cy);

    const bg = scene.add.graphics();
    bg.fillStyle(0x0b0b0b, 1);
    bg.fillRoundedRect(0, 0, width, height, radius);
    bg.lineStyle(2, 0x2b2b2b, 1);
    bg.strokeRoundedRect(0, 0, width, height, radius);
    const topH = 22;
    bg.fillStyle(0x1b1b1b, 1);
    bg.fillRect(0, 0, width, topH);

    const titleText = scene.add.text(padding, 2, title, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    });

    const sign = isWin ? 'WIN ' : 'LOSE ';
    const amountText = scene.add.text(padding, topH + 8, sign + parseFloat(amount).toFixed(2), {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: isWin ? '#00cc33' : '#ff4444',
      fontStyle: 'bold'
    });

    container.add([bg, titleText, amountText]);

    container.alpha = 0;
    scene.tweens.add({
      targets: container,
      alpha: 1,
      duration: 220,
      ease: 'Power1',
      onComplete: () => {
        scene.time.delayedCall(1600, () => {
          scene.tweens.add({
            targets: container,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              container.destroy();
            }
          });
        });
      }
    });
  }
}

export default class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }


  preload() {

  }
  create() {
    const W = this.scale.width, H = this.scale.height;

    // Background image
    this.bg = this.add.image(W / 2, H / 2, 'menu_bg').setOrigin(0.5);
    this.bg.setDisplaySize(W, H);



    // Add image buttons, centered and spaced vertically
    const btnSpacing = 140;
    const centerX = W / 2;
    const startY = H * 0.65;

    this.localBtn = this.add.image(centerX, startY, 'btn_local').setInteractive({ useHandCursor: true });

    // Scale buttons responsively based on width (prevent huge images)
    const maxBtnWidth = Math.min(450, W * 0.4);
    [this.localBtn].forEach(btn => {
      const ratio = btn.width ? (maxBtnWidth / btn.width) : 1;
      btn.setScale(ratio, ratio);
      btn.setOrigin(0.5);
    });

    // Hover effects (scale up slightly)
    const addHoverScale = (btn, baseScale = 1, hoverScale = 1.05, dur = 150) => {
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

    addHoverScale(this.localBtn);


    this.localBtn.on('pointerup', () => {
      this.showLocalLoader();
      this.loadLocalAssets();
    });

    // Footer and fullscreen toggle
    this.fsButton = this.add.text(W - 28, 24, '⛶', { fontSize: '28px', color: '#fff' }).setOrigin(1, 0).setInteractive();
    this.fsButton.on('pointerup', () => {
      if (this.scale.isFullscreen) {

        this.scale.stopFullscreen();
      }
      else {

        this.scale.startFullscreen();
      }
    });

    // Handle resize
  }

  showLocalLoader() {
    const { width, height } = this.scale;

    this.loaderBg = this.add.rectangle(width / 2, height * 0.85, 300, 20, 0x222222);
    this.loaderBar = this.add.rectangle(width / 2 - 150, height * 0.85, 0, 16, 0xffffff)
      .setOrigin(0, 0.5);

    this.load.on('progress', v => {
      this.loaderBar.width = 300 * v;
    });
  }
  loadLocalAssets() {

    this.load.image('table_bg', 'assets/table.webp');
    // -- sound assets (casino realistic) --
    this.load.audio('chip_place', 'assets/sounds/chip_place.wav');
    this.load.audio('chip_clear', 'assets/sounds/chip_clear.wav');
    this.load.audio('card_flip', 'assets/sounds/card_flip.wav');
    this.load.audio('win_chime', 'assets/sounds/win_chime.wav');
    this.load.audio('button_click', 'assets/sounds/button_click.wav');


    this.load.image('chip1', 'assets/chips/chip1.png');
    this.load.image('chip5', 'assets/chips/chip5.png');
    this.load.image('chip10', 'assets/chips/chip10.png');
    this.load.image('chip25', 'assets/chips/chip25.png');
    this.load.image('chip50', 'assets/chips/chip50.png');
    this.load.image('chip100', 'assets/chips/chip100.png');

    this.load.image('btn_deal', 'assets/btn_deal.png');
    this.load.image('btn_clear', 'assets/btn_clear.png');

    this.load.image('card_back', 'assets/cards/card_back.png');
    this.load.image('shoe', 'assets/show.png');
    this.load.image('discard_tray', 'assets/discard_tray.png');
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suits = ['H', 'D', 'C', 'S'];
    for (let s of suits) {
      for (let r of ranks) {
        this.load.image(r + s, 'assets/cards/' + r + s + '.png');
      }
    }
    this.load.image('back_btn', 'assets/back_btn.png');
    this.load.once('complete', () => {
      this.scene.start('LocalScene');
    });

    this.load.start();
  }




}

export default class SplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SplashScene' });
  }

  preload() {
    this.load.image('menu_bg', 'assets/menuscreen.webp');
    this.load.image('btn_local', 'assets/start.png');
  }

  create() {
    const { width, height } = this.scale;

    const bg = this.add.image(width / 2, height / 2, 'splash')
      .setDisplaySize(width, height);

    // WAIT for assets to be fully ready
    this.load.once('complete', () => {
      this.input.once('pointerup', () => {
        this.scene.start('MenuScene');
      });
    });

    // start loader AFTER create
    this.load.start();
  }
}

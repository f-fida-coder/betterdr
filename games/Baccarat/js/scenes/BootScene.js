
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('splash', '/assets/splashscreen.webp');
  }

  create() {
    this.scene.start('SplashScene');
  }
}

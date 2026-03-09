import SplashScene from './scenes/SplashScene.js?v=20260309e';
import MenuScene from './scenes/MenuScene.js?v=20260309e';
import LocalScene from './scenes/LocalScene.js?v=20260309e';
import BootScene from './scenes/BootScene.js?v=20260309e';

const width = 1280;
const height = 720;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width,
  height,
  backgroundColor: '#000000ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
    backgroundColor: '#000000'
  },
  scene: [
    BootScene, SplashScene, MenuScene, LocalScene]
};

const game = new Phaser.Game(config);
window.game = game;



// Optional: support keyboard F key to toggle fullscreen globally
window.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') {
    const scene = game.scene.getScene('MenuScene');
    if (scene) {
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
      else scene.scale.startFullscreen();
    }
  }
});

// ===== RESIZE OBSERVER (FREE RESIZE: WIDTH & HEIGHT) =====
// Game resizes freely in both directions (no aspect lock)
const gameContainer = document.getElementById('game');

if (gameContainer && 'ResizeObserver' in window) {
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (game && game.scale) {
        const { width, height } = entry.contentRect;
        game.scale.resize(width, height);
      }
    }
  });
  resizeObserver.observe(gameContainer);
}

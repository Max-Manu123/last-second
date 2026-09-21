import Phaser from "phaser";

const WIDTH = 800;
const HEIGHT = 600;
const BEST_KEY = "last-second-best";

class SoundManager {
  private context: AudioContext | null = null;

  private getContext() {
    if (this.context) return this.context;

    const AudioContextClass =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    this.context = new AudioContextClass();
    return this.context;
  }

  private runWhenReady(callback: (context: AudioContext) => void) {
    const context = this.getContext();
    if (!context) return;

    if (context.state === "suspended") {
      void context.resume().then(() => callback(context));
      return;
    }

    callback(context);
  }

  unlock() {
    const context = this.getContext();
    if (!context || context.state !== "suspended") return;
    void context.resume();
  }

  playClick() {
    this.runWhenReady((context) => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(520, now);
      oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
    });
  }

  playCollision() {
    this.runWhenReady((context) => {
      const now = context.currentTime;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(190, now);
      oscillator.frequency.exponentialRampToValueAtTime(55, now + 0.28);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.24, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.31);

      const noise = context.createBufferSource();
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.16), context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }

      noise.buffer = buffer;

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      noise.connect(noiseGain);
      noiseGain.connect(context.destination);
      noise.start(now);
    });
  }

  playNewRecord() {
    this.runWhenReady((context) => {
      const now = context.currentTime;

      [660, 880, 1047].forEach((frequency, index) => {
        const start = now + index * 0.11;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.19);
      });
    });
  }
}

const sound = new SoundManager();

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstallPrompt: InstallPromptEvent | null = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event as InstallPromptEvent;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
});


class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    this.input.on("pointerdown", () => sound.unlock());
    this.cameras.main.setBackgroundColor("#090d18");

    this.add.text(WIDTH / 2, 150, "LAST SECOND", {
      fontFamily: "Arial", fontSize: "64px", fontStyle: "bold", color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, 225, "How long can you survive?", {
      fontFamily: "Arial", fontSize: "24px", color: "#94a3b8"
    }).setOrigin(0.5);

    const best = Number(localStorage.getItem(BEST_KEY) ?? 0);
    this.add.text(WIDTH / 2, 285, `BEST: ${best}s`, {
      fontFamily: "Arial", fontSize: "22px", color: "#60a5fa"
    }).setOrigin(0.5);

    const play = this.add.text(WIDTH / 2, 390, "PLAY", {
      fontFamily: "Arial", fontSize: "34px", fontStyle: "bold",
      color: "#ffffff", backgroundColor: "#2563eb",
      padding: { left: 42, right: 42, top: 18, bottom: 18 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    play.on("pointerover", () => play.setScale(1.05));
    play.on("pointerout", () => play.setScale(1));
    play.on("pointerdown", () => {
      sound.playClick();
      this.scene.start("GameScene");
    });

    const install = this.add.text(WIDTH / 2, 455, "INSTALL GAME", {
      fontFamily: "Arial", fontSize: "20px", fontStyle: "bold",
      color: "#93c5fd", backgroundColor: "#172554",
      padding: { left: 24, right: 24, top: 10, bottom: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    install.on("pointerover", () => install.setScale(1.05));
    install.on("pointerout", () => install.setScale(1));
    install.on("pointerdown", async () => {
      sound.playClick();

      if (!deferredInstallPrompt) {
        install.setText("USE BROWSER INSTALL");
        return;
      }

      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;

      if (choice.outcome === "accepted") {
        install.setText("INSTALLED ✓");
        install.disableInteractive();
      }

      deferredInstallPrompt = null;
    });

    this.add.text(WIDTH / 2, 510, "WASD / Arrow Keys to move", {
      fontFamily: "Arial", fontSize: "18px", color: "#64748b"
    }).setOrigin(0.5);
  }
}

class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Arc;
  private obstacles: Phaser.GameObjects.Container[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private survivalTime = 0;
  private gameOver = false;
  private spawnTimer = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private touchDirection = { x: 0, y: 0 };

  constructor() { super("GameScene"); }

  create() {
    this.input.on("pointerdown", () => sound.unlock());
    this.gameOver = false;
    this.survivalTime = 0;
    this.spawnTimer = 0;
    this.obstacles = [];
    this.touchDirection = { x: 0, y: 0 };

    this.cameras.main.setBackgroundColor("#090d18");

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH - 8, HEIGHT - 8)
      .setStrokeStyle(2, 0x253047);

    // Subtle arena grid.
    const graphics = this.add.graphics().setAlpha(0.16);
    graphics.lineStyle(1, 0x334155);
    for (let x = 50; x < WIDTH; x += 50) graphics.lineBetween(x, 0, x, HEIGHT);
    for (let y = 50; y < HEIGHT; y += 50) graphics.lineBetween(0, y, WIDTH, y);

    // Player: glowing blue energy core with a directional arrow.
    this.player = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(5);
    const glow = this.add.circle(0, 0, 25, 0x2563eb, 0.16);
    this.playerBody = this.add.circle(0, 0, 15, 0x3b82f6);
    this.playerBody.setStrokeStyle(2, 0x93c5fd);
    const core = this.add.circle(0, 0, 6, 0xdbeafe);
    const arrow = this.add.triangle(0, -25, 0, 10, 6, -2, -6, -2, 0x60a5fa);
    this.player.add([glow, this.playerBody, core, arrow]);

    this.tweens.add({
      targets: glow,
      scale: 1.22,
      alpha: 0.07,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.keyboard!.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D
    ]);

    this.scoreText = this.add.text(20, 18, "TIME: 0", {
      fontFamily: "Arial", fontSize: "24px", fontStyle: "bold", color: "#ffffff"
    }).setDepth(10);

    this.bestText = this.add.text(WIDTH - 20, 18, `BEST: ${this.getBestScore()}s`, {
      fontFamily: "Arial", fontSize: "20px", color: "#94a3b8"
    }).setOrigin(1, 0).setDepth(10);

    this.spawnObstacle();
    this.createTouchControls();
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const dt = Math.min(delta / 1000, 0.05);
    this.survivalTime += dt;
    this.scoreText.setText(`TIME: ${Math.floor(this.survivalTime)}`);

    const playerSpeed = 280;
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.keyA.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.keyD.isDown) dx += 1;
    if (this.cursors.up.isDown || this.keyW.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.keyS.isDown) dy += 1;

    dx += this.touchDirection.x;
    dy += this.touchDirection.y;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      this.player.x += (dx / length) * playerSpeed * dt;
      this.player.y += (dy / length) * playerSpeed * dt;

      // Rotate the arrow toward movement direction.
      const angle = Math.atan2(dy, dx);
      this.player.rotation = angle + Math.PI / 2;

      // Small movement trail.
      if (Math.random() < 0.25) {
        const trail = this.add.circle(this.player.x, this.player.y, 3, 0x60a5fa, 0.45).setDepth(2);
        this.tweens.add({
          targets: trail,
          alpha: 0,
          scale: 0.2,
          duration: 260,
          onComplete: () => trail.destroy()
        });
      }
    }

    this.player.x = Phaser.Math.Clamp(this.player.x, 25, WIDTH - 25);
    this.player.y = Phaser.Math.Clamp(this.player.y, 25, HEIGHT - 25);

    this.spawnTimer += delta;
    const spawnInterval = Math.max(1200, 4200 - this.survivalTime * 90);

    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    const obstacleSpeed = 72 + this.survivalTime * 3.5;

    for (const obstacle of this.obstacles) {
      const angle = Phaser.Math.Angle.Between(
        obstacle.x, obstacle.y, this.player.x, this.player.y
      );

      obstacle.x += Math.cos(angle) * obstacleSpeed * dt;
      obstacle.y += Math.sin(angle) * obstacleSpeed * dt;
      obstacle.rotation += dt * 1.8;

      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, obstacle.x, obstacle.y
      );

      if (distance < 35) {
        this.endGame();
        return;
      }
    }
  }

  private spawnObstacle() {
    const side = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = Phaser.Math.Between(35, WIDTH - 35); y = -30;
    } else if (side === 1) {
      x = WIDTH + 30; y = Phaser.Math.Between(35, HEIGHT - 35);
    } else if (side === 2) {
      x = Phaser.Math.Between(35, WIDTH - 35); y = HEIGHT + 30;
    } else {
      x = -30; y = Phaser.Math.Between(35, HEIGHT - 35);
    }

    // Enemy: rotating red crystal with a dark core and warning glow.
    const enemy = this.add.container(x, y).setDepth(4);
    const glow = this.add.circle(0, 0, 27, 0xef4444, 0.12);
    const crystal = this.add.polygon(0, 0, [
      0, -18, 13, -7, 18, 0, 13, 7, 0, 18, -13, 7, -18, 0, -13, -7
    ], 0xef4444);
    crystal.setStrokeStyle(2, 0xfca5a5);
    const core = this.add.circle(0, 0, 6, 0x450a0a);
    enemy.add([glow, crystal, core]);
    this.tweens.add({
      targets: glow,
      scale: 1.25,
      alpha: 0.04,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    // Warning flash when an enemy enters the arena.
    this.tweens.add({
      targets: enemy,
      scale: { from: 0.65, to: 1 },
      duration: 220,
      ease: "Back.out"
    });

    this.obstacles.push(enemy);
  }

  private getBestScore() {
    return Number(localStorage.getItem(BEST_KEY) ?? 0);
  }

  private endGame() {
    if (this.gameOver) return;
    this.gameOver = true;

    const score = Math.floor(this.survivalTime);
    const oldBest = this.getBestScore();
    const newBest = Math.max(score, oldBest);

    sound.playCollision();
    if (score > oldBest) sound.playNewRecord();

    if (newBest !== oldBest) localStorage.setItem(BEST_KEY, String(newBest));
    this.bestText.setText(`BEST: ${newBest}s`);

    // Death feedback.
    this.cameras.main.flash(180, 255, 255, 255);
    this.cameras.main.shake(180, 0.012);

    const burst = this.add.particles(this.player.x, this.player.y, undefined, {
      speed: { min: 60, max: 220 },
      scale: { start: 1, end: 0 },
      lifespan: 450,
      quantity: 18,
      tint: 0x60a5fa,
      emitting: false
    }).setDepth(30);
    burst.explode(18);

    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.72).setDepth(20);

    this.add.text(WIDTH / 2, 190, "GAME OVER", {
      fontFamily: "Arial", fontSize: "52px", fontStyle: "bold", color: "#ffffff"
    }).setOrigin(0.5).setDepth(21);

    this.add.text(WIDTH / 2, 270, `TIME: ${score}s`, {
      fontFamily: "Arial", fontSize: "28px", color: "#d1d5db"
    }).setOrigin(0.5).setDepth(21);

    this.add.text(WIDTH / 2, 315, `BEST: ${newBest}s`, {
      fontFamily: "Arial", fontSize: "24px", color: "#60a5fa"
    }).setOrigin(0.5).setDepth(21);

    const again = this.add.text(WIDTH / 2, 405, "TRY AGAIN", {
      fontFamily: "Arial", fontSize: "30px", fontStyle: "bold",
      color: "#ffffff", backgroundColor: "#2563eb",
      padding: { left: 28, right: 28, top: 14, bottom: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(21);

    again.on("pointerover", () => again.setScale(1.05));
    again.on("pointerout", () => again.setScale(1));

    again.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      sound.playClick();
      this.scene.restart();
    });

    const menu = this.add.text(WIDTH / 2, 495, "MENU", {
      fontFamily: "Arial", fontSize: "20px", color: "#9ca3af"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(21);

    menu.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.scene.start("MenuScene");
    });
  }

  private createTouchControls() {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const style = {
      fontFamily: "Arial", fontSize: "22px", color: "#ffffff",
      backgroundColor: "#1e293b",
      padding: { left: 16, right: 16, top: 12, bottom: 12 }
    };

    const buttons = [
      { label: "▲", x: 70, y: HEIGHT - 105, dx: 0, dy: -1 },
      { label: "◀", x: 25, y: HEIGHT - 55, dx: -1, dy: 0 },
      { label: "▼", x: 70, y: HEIGHT - 5, dx: 0, dy: 1 },
      { label: "▶", x: 115, y: HEIGHT - 55, dx: 1, dy: 0 }
    ];

    for (const button of buttons) {
      const control = this.add.text(button.x, button.y, button.label, style)
        .setOrigin(0.5).setAlpha(0.78).setInteractive();

      control.on("pointerdown", () => {
        this.touchDirection.x = button.dx;
        this.touchDirection.y = button.dy;
      });
      control.on("pointerup", () => {
        this.touchDirection.x = 0;
        this.touchDirection.y = 0;
      });
      control.on("pointerout", () => {
        this.touchDirection.x = 0;
        this.touchDirection.y = 0;
      });
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#090d18",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MenuScene, GameScene]
};

new Phaser.Game(config);

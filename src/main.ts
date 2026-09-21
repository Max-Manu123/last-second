import Phaser from "phaser";

class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private obstacle!: Phaser.GameObjects.Arc;
  private scoreText!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private survivalTime = 0;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#111827");

    this.player = this.add.circle(400, 300, 18, 0x3b82f6);
    this.obstacle = this.add.circle(100, 100, 16, 0xef4444);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as typeof this.keys;

    this.scoreText = this.add
      .text(20, 20, "TIME: 0", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setDepth(10);
  }

  update(_time: number, delta: number) {
    const playerSpeed = 4;
    const obstacleSpeed = 1.2;

    this.survivalTime += delta / 1000;
    this.scoreText.setText(`TIME: ${Math.floor(this.survivalTime)}`);

    if (this.cursors.left.isDown || this.keys.A.isDown) this.player.x -= playerSpeed;
    if (this.cursors.right.isDown || this.keys.D.isDown) this.player.x += playerSpeed;
    if (this.cursors.up.isDown || this.keys.W.isDown) this.player.y -= playerSpeed;
    if (this.cursors.down.isDown || this.keys.S.isDown) this.player.y += playerSpeed;

    this.player.x = Phaser.Math.Clamp(this.player.x, 18, 782);
    this.player.y = Phaser.Math.Clamp(this.player.y, 18, 582);

    const angle = Phaser.Math.Angle.Between(
      this.obstacle.x,
      this.obstacle.y,
      this.player.x,
      this.player.y
    );

    this.obstacle.x += Math.cos(angle) * obstacleSpeed;
    this.obstacle.y += Math.sin(angle) * obstacleSpeed;

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.obstacle.x,
      this.obstacle.y
    );

    if (distance < 34) {
      this.scene.restart();
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#111827",
  scene: GameScene,
};

new Phaser.Game(config);
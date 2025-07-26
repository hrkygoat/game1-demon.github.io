// js/game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const gameOverScreen = document.getElementById('gameOverScreen');
const continueButton = document.getElementById('continueButton');
const restartButton = document.getElementById('restartButton');

const controlsDiv = document.getElementById('controls');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const jumpButton = document.getElementById('jumpButton');

const stageClearScreen = document.getElementById('stageClearScreen');
const nextStageButton = document.getElementById('nextStageButton');
const restartFromClearButton = document.getElementById('restartFromClearButton');

const pauseButton = document.getElementById('pauseButton');
const pauseScreen = document.getElementById('pauseScreen');
const resumeButton = document.getElementById('resumeButton');
const restartFromPauseButton = document.getElementById('restartFromPauseButton');

canvas.width = 500;
canvas.height = 500;

// ====================================================================
// ゲームの状態変数
// ====================================================================
let gameRunning = false;
let isGamePaused = false;
let score = 0;
let lives = 3;
let continueCount = 3;
let backgroundX = 0;
const backgroundScrollSpeed = 100; // ピクセル/秒 に調整
let gameSpeed = 1.5; // 強制スクロールの速さ (ステージによって変更される倍率)

let lastEnemySpawnTime = 0;
const enemySpawnInterval = 1500;

let lastItemSpawnTime = 0;
const itemSpawnInterval = 5000;

let isGamePausedForDamage = false;
let damagePauseTimer = 0;
const DAMAGE_PAUSE_DURATION = 150;

let currentStage = 3; // 初期ステージを3に設定 (以前のステージ1に相当)
const MAX_STAGES = 4; // 最大ステージ数を4に設定 (以前のステージ2に相当)
let isStageClearItemSpawned = false;

// ステージ4専用の状態変数
let largeEnemySpawnedInStage4 = false;
let bossEnemyInstance = null;
let bossSpawnProgress = 0; // Milliseconds, tracks time for boss spawn
const BOSS_SPAWN_DELAY = 5000; // 5 seconds

// ====================================================================
// オーディオ関連
// ====================================================================
const bgm = document.getElementById('bgm');
const bgmStage2 = document.getElementById('bgmStage2'); // Stage 4 BGMとして使用
const jumpSound = document.getElementById('jumpSound');
const hitSound = document.getElementById('hitSound');
const enemyHitSound = document.getElementById('enemyHitSound');
const collectItemSound = document.getElementById('collectItemSound');
const blockHitSound = document.getElementById('blockHitSound');
const stageClearSound = document.getElementById('stageClearSound');
const shootSound = document.getElementById('shootSound');
const bombDropSound = document.getElementById('bombDropSound'); // 新しいサウンド

function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(e => console.warn("Audio play error:", e));
    }
}

function stopBGM() {
    bgm.pause();
    bgm.currentTime = 0;
    bgmStage2.pause();
    bgmStage2.currentTime = 0;
}

function playBGMForCurrentStage() {
    if (isGamePaused) {
        stopBGM();
        return;
    }
    stopBGM();
    if (currentStage === 3) { // ステージ3のBGM
        bgm.play().catch(e => console.warn("BGM play error:", e));
    } else if (currentStage === 4) { // ステージ4のBGM
        bgmStage2.play().catch(e => console.warn("Stage 4 BGM play error:", e));
    }
}

// ====================================================================
// アセットの読み込み
// ====================================================================
const assets = {
    playerRun: { img: new Image(), src: 'assets/images/player_run.png' },
    playerJump: { img: new Image(), src: 'assets/images/player_jump.png' },
    enemy: { img: new Image(), src: 'assets/images/enemy.png' }, // enemy.pngをスプライトシートとして使用
    flyingEnemy: { img: new Image(), src: 'assets/images/flying_enemy.png' },
    groundEnemy2: { img: new Image(), src: 'assets/images/ground_enemy.png' },
    stage2Enemy: { img: new Image(), src: 'assets/images/stage2_enemy.png' }, // ステージ2/4の敵、ボス画像
    bombDropper: { img: new Image(), src: 'assets/images/bomb_dropper.png' },
    bomb: { img: new Image(), src: 'assets/images/bomb.png' }, // Bomb クラスで使用される画像
    block: { img: new Image(), src: 'assets/images/block.png' },
    breakableBlock: { img: new Image(), src: 'assets/images/breakable_block.png' },
    healthItem: { img: new Image(), src: 'assets/images/health_item.png' },
    invincibilityItem: { img: new Image(), src: 'assets/images/invincibility_item.png' },
    stageClearItem: { img: new Image(), src: 'assets/images/stage_clear_item.png' },
    background: { img: new Image(), src: 'assets/images/background.png' }, // Stage 3 BGM
    backgroundStage2: { img: new Image(), src: 'assets/images/background_stage2.png' }, // Stage 4 BGM
    shootItem: { img: new Image(), src: 'assets/images/shoot_item.png' },
    playerProjectile: { img: new Image(), src: 'assets/images/player_projectile.png' },
    fireball: { img: new Image(), src: 'assets/images/fireball.png' }, // <<< 追加
};

let assetsLoadedCount = 0;
const totalAssets = Object.keys(assets).length;
let assetsLoadErrors = []; // 新しいエラー追跡配列

function loadAssets() {
    return new Promise((resolve) => {
        for (const key in assets) {
            const asset = assets[key];
            asset.img.onload = () => {
                assetsLoadedCount++;
                console.log(`Loaded: ${asset.src} (${assetsLoadedCount}/${totalAssets})`);
                if (assetsLoadedCount === totalAssets) {
                    if (assetsLoadErrors.length === 0) {
                        resolve();
                    } else {
                        console.error("Some assets failed to load:", assetsLoadErrors);
                        resolve();
                    }
                }
            };
            asset.img.onerror = (e) => {
                console.error(`Failed to load asset: ${asset.src}`, e);
                assetsLoadErrors.push(asset.src);
                assetsLoadedCount++;
                if (assetsLoadedCount === totalAssets) {
                    if (assetsLoadErrors.length === 0) {
                        resolve();
                    } else {
                        console.error("Some assets failed to load:", assetsLoadErrors);
                        resolve();
                    }
                }
            };
            asset.img.src = asset.src;
        }
    });
}

// ====================================================================
// プレイヤーオブジェクト
// ====================================================================
const player = {
    x: 100,
    y: canvas.height - 50 - 50,
    width: 50,
    height: 50,
    velocityY: 0,
    isJumping: false,
    jumpCount: 0,
    maxJumpCount: 2,
    speedX: 0,
    maxSpeedX: 250, // ピクセル/秒
    gravity: 1.2,
    jumpStrength: -550, // ピクセル/秒

    currentFrame: 0,
    frameCounter: 0,
    animationSpeed: 5,
    maxRunFrames: 6,
    maxJumpFrames: 1,
    frameWidth: 32,
    frameHeight: 32,

    isInvincible: false,
    invincibleTimer: 0,
    invincibleDuration: 3000,
    blinkTimer: 0,
    blinkInterval: 50,

    canShoot: false,
    shootCooldown: 0,
    maxShootCooldown: 300,
    projectileSpeed: 500, // ピクセル/秒
    projectileDamage: 50,

    draw() {
        if (this.isInvincible && Math.floor(this.blinkTimer / this.blinkInterval) % 2 === 0) {
            return;
        }

        let currentImage = assets.playerRun.img;
        let sx = 0;

        if (this.isJumping) {
            currentImage = assets.playerJump.img;
            sx = this.currentFrame * this.frameWidth;
        } else {
            currentImage = assets.playerRun.img;
            if (this.speedX === 0) {
                sx = 0;
            } else {
                sx = this.currentFrame * this.frameWidth;
            }
        }

        if (currentImage.complete && currentImage.naturalHeight !== 0) {
            ctx.drawImage(currentImage,
                          sx, 0,
                          this.frameWidth, this.frameHeight,
                          this.x, this.y,
                          this.width, this.height);
        } else {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    },

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }

        // 水平移動をdeltaTimeでスケール
        this.x += this.speedX * deltaTime / 1000;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // 垂直移動と重力をdeltaTimeでスケール
        this.y += this.velocityY * deltaTime / 1000;
        this.velocityY += this.gravity * deltaTime;

        let onGround = false;
        const groundLevel = canvas.height - this.height;

        // Block と MovingPlatform との衝突判定
        for (const block of blocks) {
            if (checkCollision(this, block) && this.velocityY >= 0) {
                // ブロックの上に着地
                if (this.y + this.height - (this.velocityY * deltaTime / 1000) <= block.y) {
                    this.y = block.y - this.height;
                    this.velocityY = 0;
                    this.isJumping = false;
                    this.jumpCount = this.maxJumpCount;
                    onGround = true;

                    // 移動する足場に乗っている場合、足場の移動に合わせる
                    if (block instanceof MovingPlatform) {
                        this.y += block.moveDirectionY * block.moveSpeedY * deltaTime / 1000;
                    }
                    break;
                }
            }
        }

        if (this.y >= groundLevel && !onGround) {
            this.y = groundLevel;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpCount = this.maxJumpCount;
            onGround = true;
        }

        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.blinkTimer >= this.blinkInterval * 2) {
                this.blinkTimer = 0;
            }
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
                this.blinkTimer = 0;
            }
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            if (this.isJumping) {
                this.currentFrame = (this.currentFrame + 1) % this.maxJumpFrames;
            } else if (this.speedX !== 0) {
                this.currentFrame = (this.currentFrame + 1) % this.maxRunFrames;
            } else {
                this.currentFrame = 0;
            }
        }
    },

    jump() {
        if (this.jumpCount > 0) {
            this.velocityY = this.jumpStrength;
            this.isJumping = true;
            this.jumpCount--;
            playSound(jumpSound);
            this.currentFrame = 0;
        }
    },

    takeDamage() {
        if (this.isInvincible) return;

        lives--;
        playSound(hitSound);
        updateUI();
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;
        this.canShoot = false;

        isGamePausedForDamage = true;
        damagePauseTimer = DAMAGE_PAUSE_DURATION;

        if (lives <= 0) {
            gameOver();
        }
    },

    heal() {
        if (lives < 3) {
            lives++;
            playSound(collectItemSound);
            updateUI();
        }
    },

    gainInvincibility() {
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;
        playSound(collectItemSound);
    },

    gainShootAbility() {
        this.canShoot = true;
        this.shootCooldown = 0;
        playSound(collectItemSound);
    },

    shoot() {
        if (this.canShoot && this.shootCooldown <= 0) {
            const projectileWidth = 20;
            const projectileHeight = 20;
            const projectileX = this.x + this.width;
            const projectileY = this.y + this.height / 2 - projectileHeight / 2;
            projectiles.push(new Projectile(projectileX, projectileY, projectileWidth, projectileHeight, this.projectileSpeed, this.projectileDamage, assets.playerProjectile.img));
            playSound(shootSound);
            this.shootCooldown = this.maxShootCooldown;
        }
    }
};

// ====================================================================
// 敵オブジェクト基底クラス
// ====================================================================
class Enemy {
    constructor(x, y, width, height, speed, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.initialHeight = height;
        this.speed = speed; // ピクセル/秒
        this.image = image;
        this.active = true;
        this.isStomped = false;
        this.stompedTimer = 0;
        this.stompedDuration = 200;
        this.squishFactor = 0.2;

        // --- アニメーション関連プロパティ (新規追加) ---
        this.frameWidth = 60; // enemy.pngの1フレームの幅
        this.frameHeight = 60; // enemy.pngの1フレームの高さ
        this.maxFrames = 4; // enemy.pngのスプライトシートの総フレーム数
        this.currentFrame = 0;
        this.frameCounter = 0;
        this.animationSpeed = 10; // アニメーションの速度 (小さいほど速い)
        // ------------------------------------------
    }

    draw() {
        if (!this.active) return;

        let currentHeight = this.height;
        let currentY = this.y;
        let currentImage = this.image;
        let sx = 0; // スプライトシートから切り出すX座標

        if (this.isStomped) {
            currentHeight = this.initialHeight * this.squishFactor;
            currentY = this.y + (this.initialHeight - currentHeight);
            sx = 0; // 踏まれたら最初のフレームを表示など、特定のフレームにする場合は調整
        } else {
            // --- アニメーションフレームのX座標を計算 (新規追加) ---
            sx = this.currentFrame * this.frameWidth;
            // ---------------------------------------------------
        }

        if (currentImage.complete && currentImage.naturalHeight !== 0) {
            // drawImageの引数を変更し、スプライトシートから適切なフレームを切り出す
            ctx.drawImage(currentImage,
                          sx, 0, // ソースのX, Y座標
                          this.frameWidth, this.frameHeight, // ソースの幅, 高さ
                          this.x, currentY, // 描画先のX, Y座標
                          this.width, currentHeight); // 描画先の幅, 高さ
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, currentY, this.width, currentHeight);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (this.isStomped) {
            this.stompedTimer -= deltaTime;
            if (this.stompedTimer <= 0) {
                this.active = false;
            }
        } else {
            // 敵の移動をdeltaTimeでスケール
            this.x -= this.speed * gameSpeed * deltaTime / 1000;
            if (this.x + this.width < 0) {
                this.active = false;
            }

            // --- アニメーションフレームの更新 (新規追加) ---
            this.frameCounter++;
            if (this.frameCounter >= this.animationSpeed) {
                this.frameCounter = 0;
                this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
            }
            // ------------------------------------------------
        }
    }
}

// ====================================================================
// 飛行する敵クラス
// ====================================================================
class FlyingEnemy extends Enemy {
    constructor(x, y, width, height, speed, amplitude, frequency) {
        super(x, y, width, height, speed, assets.flyingEnemy.img);
        this.startY = y;
        this.amplitude = amplitude;
        this.frequency = frequency; // ラジアン/秒
        this.angle = Math.random() * Math.PI * 2;
        this.frameWidth = 60;
        this.frameHeight = 40;
        this.maxFrames = 2;
        this.animationSpeed = 15;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage || this.isStomped) {
            return;
        }
        this.angle += this.frequency * gameSpeed * deltaTime;
        this.y = this.startY + Math.sin(this.angle) * this.amplitude;
    }
}

// ====================================================================
// 地上敵2クラス
// ====================================================================
class GroundEnemy2 extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.groundEnemy2.img);
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.maxFrames = 2;
        this.animationSpeed = 10;
    }
}

// === ステージ2/4の新しい地上敵クラス ===
class Stage2GroundEnemy extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.stage2Enemy.img);
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.maxFrames = 2;
        this.animationSpeed = 10;
    }
}

// ====================================================================
// 爆弾を落とす敵クラス
// ====================================================================
class BombDropperEnemy extends Enemy {
    constructor(x, y, width, height, speed) {
        super(x, y, width, height, speed, assets.bombDropper.img);
        this.dropCooldown = 0;
        this.maxDropCooldown = 2000 + Math.random() * 1000;
        this.bombDropSpeed = 0;
        this.frameWidth = 48;
        this.frameHeight = 48;
        this.maxFrames = 2;
        this.animationSpeed = 15;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage || this.isStomped) {
            return;
        }

        this.dropCooldown -= deltaTime;
        if (this.dropCooldown <= 0) {
            this.dropBomb();
            this.dropCooldown = this.maxDropCooldown;
        }
    }

    dropBomb() {
        const bombWidth = 25;
        const bombHeight = 25;
        const bombX = this.x + this.width / 2 - bombWidth / 2;
        const bombY = this.y + this.height;
        bombs.push(new Bomb(bombX, bombY, bombWidth, bombHeight, this.bombDropSpeed, assets.bomb.img));
        playSound(bombDropSound);
    }
}

// ====================================================================
// 大型ボス敵クラス (ステージ4専用)
// ====================================================================
class BossEnemy extends Enemy {
    constructor(x, y, width, height, speed, minX, maxX) {
        super(x, y, width, height, speed, assets.stage2Enemy.img);
        this.hitPoints = 5;
        this.moveDirection = -1;
        this.minX = minX;
        this.maxX = maxX;
        this.bossSpeed = speed;
        this.isDefeated = false;
        this.y = canvas.height - this.height;

        this.frameWidth = 100;
        this.frameHeight = 100;
        this.maxFrames = 4;
        this.animationSpeed = 10;

        this.isJumping = false;
        this.velocityY = 0;
        this.jumpStrength = -800;
        this.bossGravity = 1.0;

        this.jumpCooldown = 0;
        this.maxJumpCooldown = 3000 + Math.random() * 2000;

        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 3000;
        this.blinkTimer = 0;
        this.blinkInterval = 50;

        // 火の玉攻撃関連 (新規追加)
        this.fireballCooldown = 0;
        this.maxFireballCooldown = 1500; // 1.5秒ごとに発射
    }

    draw() {
        if (!this.active && !this.isDefeated) return;
        if (this.isInvincible && Math.floor(this.blinkTimer / this.blinkInterval) % 2 === 0) {
            return;
        }
        super.draw();
    }

    update(deltaTime, player) { // playerを引数に追加
        if (isGamePaused || isGamePausedForDamage || this.isDefeated) {
            return;
        }

        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            this.blinkTimer += deltaTime;
            if (this.blinkTimer >= this.blinkInterval * 2) {
                this.blinkTimer = 0;
            }
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
                this.invincibleTimer = 0;
                this.blinkTimer = 0;
            }
        }
        
        this.x += this.moveDirection * this.bossSpeed * deltaTime / 1000;

        if (this.x <= this.minX) {
            this.moveDirection = 1;
            this.x = this.minX;
        } else if (this.x + this.width >= this.maxX) {
            this.moveDirection = -1;
            this.x = this.maxX - this.width;
        }

        if (this.isJumping) {
            this.y += this.velocityY * deltaTime / 1000;
            this.velocityY += this.bossGravity * deltaTime;

            const groundLevel = canvas.height - this.height;
            if (this.y >= groundLevel) {
                this.y = groundLevel;
                this.velocityY = 0;
                this.isJumping = false;
            }
        } else {
            this.jumpCooldown -= deltaTime;
            if (this.jumpCooldown <= 0) {
                this.startJump();
                this.jumpCooldown = this.maxJumpCooldown;
            }
        }

        // 火の玉攻撃のロジック (新規追加)
        this.fireballCooldown -= deltaTime;
        if (this.fireballCooldown <= 0) {
            this.shootFireball(player); // playerを渡す
            this.fireballCooldown = this.maxFireballCooldown; // クールダウンをリセット
        }
        
        this.frameCounter++;
        if (this.frameCounter >= this.animationSpeed) {
            this.frameCounter = 0;
            this.currentFrame = (this.currentFrame + 1) % this.maxFrames;
        }
    }

    startJump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.velocityY = this.jumpStrength;
        }
    }

    takeHit() {
        if (this.isInvincible) return;

        this.hitPoints--;
        playSound(enemyHitSound);

        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        this.blinkTimer = 0;

        if (this.hitPoints <= 0) {
            this.isDefeated = true;
            this.active = false;
        }
    }

    shootFireball(player) {
        if (!this.active || isGamePaused || isGamePausedForDamage) return;

        const fireballWidth = 50;
        const fireballHeight = 50;
        const startX = this.x + this.width / 2 - fireballWidth / 2;
        const startY = this.y + this.height / 2 - fireballHeight / 2;

        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;

        const fireball = new Fireball(startX, startY, fireballWidth, fireballHeight, targetX, targetY, assets.fireball.img);
        enemyProjectiles.push(fireball);
    }
}

let enemies = [];
let projectiles = [];
let enemyProjectiles = []; // <<< 追加
let bombs = [];

function spawnEnemy() {
    const random = Math.random();
    let enemyWidth, enemyHeight, enemySpeed;

    if (currentStage === 3) {
        if (random < 0.3) {
            enemyWidth = 60;
            enemyHeight = 60;
            enemySpeed = 80 + Math.random() * 40;
            const dropY = Math.random() * (canvas.height * 0.3);
            enemies.push(new BombDropperEnemy(canvas.width, dropY, enemyWidth, enemyHeight, enemySpeed));
        } else if (random < 0.6) {
            enemyWidth = 60;
            enemyHeight = 60;
            enemySpeed = 100 + Math.random() * 50;
            enemies.push(new Enemy(canvas.width, canvas.height - enemyHeight, enemyWidth, enemyHeight, enemySpeed, assets.enemy.img));
        } else if (random < 0.8) {
            enemyWidth = 50;
            enemyHeight = 30;
            enemySpeed = 80 + Math.random() * 40;
            const flyY = canvas.height * 0.4 + Math.random() * (canvas.height * 0.2);
            const amplitude = 20 + Math.random() * 30;
            const frequency = 0.00005 + Math.random() * 0.00005;
            enemies.push(new FlyingEnemy(canvas.width, flyY, enemyWidth, enemyHeight, enemySpeed, amplitude, frequency));
        } else {
            enemyWidth = 80;
            enemyHeight = 110;
            enemySpeed = 120 + Math.random() * 60;
            enemies.push(new GroundEnemy2(canvas.width, canvas.height - enemyHeight, enemyWidth, enemyHeight, enemySpeed));
        }
    }
}

function spawnBoss() {
    if (currentStage === 4 && !largeEnemySpawnedInStage4 && bossEnemyInstance === null) {
        const enemyWidth = 200;
        const enemyHeight = 200;
        const enemySpeed = 250;
        const minX = 50;
        const maxX = canvas.width - 50;
        bossEnemyInstance = new BossEnemy(canvas.width, canvas.height - enemyHeight, enemyWidth, enemyHeight, enemySpeed, minX, maxX);
        enemies.push(bossEnemyInstance);
        largeEnemySpawnedInStage4 = true;
    }
}

// ====================================================================
// Projectile クラス
// ====================================================================
class Projectile {
    constructor(x, y, width, height, speed, damage, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.damage = damage;
        this.image = image;
        this.active = true;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (this.active) {
            ctx.fillStyle = 'blue';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.active) return;
        this.x += this.speed * deltaTime / 1000;
        if (this.x > canvas.width) {
            this.active = false;
        }
    }
}

// ====================================================================
// Bomb クラス
// ====================================================================
class Bomb {
    constructor(x, y, width, height, velocityY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityY = velocityY;
        this.image = image;
        this.active = true;
        this.gravity = 0.8;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (this.active) {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.active) return;

        this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;
        this.velocityY += this.gravity * deltaTime;

        if (this.x + this.width < 0 || this.y > canvas.height + 50) {
            this.active = false;
        }
    }
}

// ====================================================================
// Fireball クラス (新規追加)
// ====================================================================
class Fireball {
    constructor(x, y, width, height, targetX, targetY, image) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
        this.active = true;
        this.speed = 500; // 火の玉の速さ (ピクセル/秒)

        // ボスからプレイヤーへの角度を計算
        const angle = Math.atan2(targetY - y, targetX - x);
        
        // 角度に基づいて速度を計算
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (this.active) {
            ctx.fillStyle = 'orange'; // 画像がない場合の表示
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage || !this.active) {
            return;
        }
        
        // 計算された速度に基づいて移動
        this.x += this.velocityX * deltaTime / 1000;
        this.y += this.velocityY * deltaTime / 1000;

        // 画面外に出たら非アクティブにする
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }
}


// ====================================================================
// ブロックオブジェクト
// ====================================================================
class Block {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = assets.block.img;
    }

    draw() {
        if (this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = 'brown';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
    }
}

// ====================================================================
// 上下に動く足場クラス
// ====================================================================
class MovingPlatform extends Block {
    constructor(x, y, width, height, minY, maxY, moveSpeedY) {
        super(x, y, width, height);
        this.startY = y;
        this.minY = minY;
        this.maxY = maxY;
        this.moveSpeedY = moveSpeedY;
        this.moveDirectionY = -1;
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }

        this.y += this.moveDirectionY * this.moveSpeedY * deltaTime / 1000;

        if (this.moveDirectionY === -1 && this.y <= this.minY) {
            this.y = this.minY;
            this.moveDirectionY = 1;
        } else if (this.moveDirectionY === 1 && this.y + this.height >= this.maxY) {
            this.y = this.maxY - this.height;
            this.moveDirectionY = -1;
        }
    }
}

// ====================================================================
// アイテム出現ブロッククラス
// ====================================================================
class BreakableBlock extends Block {
    constructor(x, y, width, height, hasItem = false, itemType = 'health') {
        super(x, y, width, height);
        this.image = assets.breakableBlock.img;
        this.isBroken = false;
        this.hasItem = hasItem;
        this.itemType = itemType;
        this.originalHeight = height;
        this.breakTimer = 0;
        this.breakDuration = 100;
    }

    draw() {
        if (this.isBroken) {
            if (this.breakTimer > 0) {
                if (this.image.complete && this.image.naturalHeight !== 0) {
                     ctx.drawImage(this.image, this.x, this.y, this.width, this.originalHeight * 0.5);
                } else {
                    ctx.fillStyle = 'gray';
                    ctx.fillRect(this.x, this.y + this.originalHeight * 0.2, this.width, this.originalHeight * 0.8);
                }
            }
            return;
        }
        super.draw();
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (this.isBroken) {
            this.breakTimer -= deltaTime;
        }
    }

    hitFromBelow() {
        if (this.isBroken) return;
        this.isBroken = true;
        this.breakTimer = this.breakDuration;
        playSound(blockHitSound);

        if (this.hasItem) {
            const itemWidth = 30;
            const itemHeight = 30;
            const itemX = this.x + this.width / 2 - itemWidth / 2;
            const itemY = this.y - itemHeight - 5;

            const spawnedItem = new Item(itemX, itemY, itemWidth, itemHeight, this.itemType);
            items.push(spawnedItem);
        }
    }
}

let blocks = [];
let items = [];

// ====================================================================
// ステージの要素をセットアップする関数
// ====================================================================
function setupStageElements(stageNum) {
    blocks = [];

    if (stageNum === 3) {
        gameSpeed = 1.0;
        blocks.push(new Block(50, canvas.height - 100, 100, 30));
        blocks.push(new Block(200, canvas.height - 200, 120, 30));
        blocks.push(new Block(350, canvas.height - 100, 80, 30));
        blocks.push(new BreakableBlock(500, canvas.height - 250, 70, 30, true, 'health'));
        blocks.push(new Block(650, canvas.height - 150, 90, 30));
    } else if (stageNum === 4) {
        gameSpeed = 1.5;
        const platformWidth = 120;
        const platformHeight = 30;
        const platformX = 100;
        const platformMinY = canvas.height - 250;
        const platformMaxY = canvas.height - 100;
        const platformSpeedY = 80;
        blocks.push(new MovingPlatform(platformX, platformMaxY, platformWidth, platformHeight, platformMinY, platformMaxY, platformSpeedY));
    }
}

// ====================================================================
// プレイヤーとステージコンテンツをリセットする関数
// ====================================================================
function resetPlayerAndStageContent() {
    player.x = 100;
    player.y = canvas.height - 50 - 50;
    player.velocityY = 0;
    player.isJumping = false;
    player.jumpCount = player.maxJumpCount;
    player.isInvincible = false;
    player.invincibleTimer = 0;
    player.canShoot = false;

    enemies = [];
    items = [];
    projectiles = [];
    enemyProjectiles = []; // <<< 追加
    bombs = [];
    isStageClearItemSpawned = false;

    largeEnemySpawnedInStage4 = false;
    bossEnemyInstance = null;
    bossSpawnProgress = 0;
    
    backgroundX = 0;
}

// ====================================================================
// ゲーム全体を初期状態にリセットする関数
// ====================================================================
function resetFullGame() {
    score = 0;
    lives = 5;
    continueCount = 3;
    currentStage = 3;
    setupStageElements(currentStage);
    resetPlayerAndStageContent();
    updateUI();
    stopBGM();
}

// ====================================================================
// アイテムオブジェクト
// ====================================================================
class Item {
    constructor(x, y, width, height, type, isFixed = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        if (type === 'health') {
            this.image = assets.healthItem.img;
        } else if (type === 'invincibility') {
            this.image = assets.invincibilityItem.img;
        } else if (type === 'stage_clear') {
            this.image = assets.stageClearItem.img;
        } else if (type === 'shoot_ability') {
            this.image = assets.shootItem.img;
        }
        this.active = true;
        this.isFixed = isFixed;
    }

    draw() {
        if (this.active && this.image.complete && this.image.naturalHeight !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        } else if (!this.active) {
        } else {
            if (this.type === 'health') ctx.fillStyle = 'pink';
            else if (this.type === 'invincibility') ctx.fillStyle = 'gray';
            else if (this.type === 'stage_clear') ctx.fillStyle = 'gold';
            else if (this.type === 'shoot_ability') ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    update(deltaTime) {
        if (isGamePaused || isGamePausedForDamage) {
            return;
        }
        if (!this.isFixed) {
            this.x -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
            if (this.x + this.width < 0) {
                this.active = false;
            }
        }
    }
}

function spawnItem() {
    const itemWidth = 30;
    const itemHeight = 30;
    const itemX = canvas.width;
    const itemY = canvas.height - itemHeight - (Math.random() * 150 + 100);
    
    let itemType;
    const random = Math.random();

    if (currentStage === 3) {
        itemType = random < 0.7 ? 'health' : 'invincibility';
    } else if (currentStage === 4) {
        return;
    }
    items.push(new Item(itemX, itemY, itemWidth, itemHeight, itemType));
}

// ====================================================================
// 衝突判定
// ====================================================================
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// ====================================================================
// ステージクリアに必要なスコアを返す関数
// ====================================================================
function getStageClearScore() {
    switch (currentStage) {
        case 3:
            return 6000;
        case 4:
            return 9999999;
        default:
            return 6000;
    }
}

// ====================================================================
// ゲームオーバー処理
// ====================================================================
function gameOver() {
    gameRunning = false;
    stopBGM();
    gameOverScreen.classList.remove('hidden');
    controlsDiv.classList.add('hidden');
    pauseButton.classList.add('hidden');
    updateContinueButton();
}

function updateContinueButton() {
    continueButton.textContent = `CONTINUE (${continueCount})`;
    if (continueCount <= 0) {
        continueButton.disabled = true;
        continueButton.textContent = `CONTINUE (0)`;
    } else {
        continueButton.disabled = false;
    }
}

// ====================================================================
// ゲームのリセットと開始ロジック
// ====================================================================
function startGameLoop() {
    gameOverScreen.classList.add('hidden');
    stageClearScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    controlsDiv.classList.remove('hidden');
    pauseButton.classList.remove('hidden');
    gameRunning = true;
    isGamePaused = false;
    playBGMForCurrentStage();
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function continueGame() {
    if (continueCount > 0) {
        continueCount--;
        lives = 5;
        resetPlayerAndStageContent();
        setupStageElements(currentStage);
        updateUI();
        startGameLoop();
    }
}

function restartGame() {
    resetFullGame();
    startGameLoop();
}

function stageClear() {
    gameRunning = false;
    stopBGM();
    playSound(stageClearSound);
    stageClearScreen.classList.remove('hidden');
    controlsDiv.classList.add('hidden');
    pauseButton.classList.add('hidden');

    if (currentStage < MAX_STAGES) {
        nextStageButton.textContent = "NEXT STAGE";
        nextStageButton.disabled = false;
        nextStageButton.onclick = startNextStage;
    } else {
        nextStageButton.textContent = "GAME COMPLETE!";
        nextStageButton.disabled = false;
        nextStageButton.onclick = () => {
            window.location.href = '';
        };
    }
}

function startNextStage() {
    if (currentStage < MAX_STAGES) {
        currentStage++;
        lives = 5;
        setupStageElements(currentStage);
        resetPlayerAndStageContent();
        updateUI();
        startGameLoop();
    }
}

// ポーズ機能関連の関数
function togglePause() {
    if (!gameRunning) return;

    isGamePaused = !isGamePaused;
    if (isGamePaused) {
        pauseScreen.classList.remove('hidden');
        controlsDiv.classList.add('hidden');
        pauseButton.classList.add('hidden');
        stopBGM();
    } else {
        pauseScreen.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
        pauseButton.classList.remove('hidden');
        playBGMForCurrentStage();
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function resumeGame() {
    togglePause();
}

function restartGameFromPause() {
    togglePause();
    restartGame();
}

// ====================================================================
// UIの更新
// ====================================================================
function updateUI() {
    if (currentStage === 4 && bossEnemyInstance && bossEnemyInstance.active && bossEnemyInstance.hitPoints > 0) {
        scoreDisplay.textContent = `Score: ${score} (Stage ${currentStage} HP: ${bossEnemyInstance.hitPoints})`;
    } else {
        scoreDisplay.textContent = `Score: ${score} (Stage ${currentStage})`;
    }
    livesDisplay.textContent = `Lives: ${lives}`;
}

let lastFrameTime = 0;

// ====================================================================
// ゲームループ
// ====================================================================
function gameLoop(currentTime) {
    if (!gameRunning) return;

    if (lastFrameTime === 0 || isGamePaused) {
        lastFrameTime = currentTime;
    }
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (isGamePausedForDamage) {
        damagePauseTimer -= deltaTime;
        if (damagePauseTimer <= 0) {
            isGamePausedForDamage = false;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let currentBackground = (currentStage === 3) ? assets.background.img : assets.backgroundStage2.img;
    if (!isGamePaused && !isGamePausedForDamage) {
        if (currentBackground.complete && currentBackground.naturalHeight !== 0) {
            ctx.drawImage(currentBackground, backgroundX, 0, canvas.width, canvas.height);
            ctx.drawImage(currentBackground, backgroundX + canvas.width, 0, canvas.width, canvas.height);
            backgroundX -= backgroundScrollSpeed * gameSpeed * deltaTime / 1000;
            if (backgroundX <= -canvas.width) {
                backgroundX = 0;
            }
        } else {
            ctx.fillStyle = (currentStage === 3) ? 'skyblue' : 'darkblue';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        if (currentBackground.complete && currentBackground.naturalHeight !== 0) {
            ctx.drawImage(currentBackground, backgroundX, 0, canvas.width, canvas.height);
            ctx.drawImage(currentBackground, backgroundX + canvas.width, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = (currentStage === 3) ? 'skyblue' : 'darkblue';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    if (!isGamePaused && !isGamePausedForDamage) {
        player.update(deltaTime);

        if (player.y > canvas.height + 50) {
            player.takeDamage();
            if (lives > 0) {
                player.x = 100;
                player.y = canvas.height - player.height;
                player.velocityY = 0;
                player.isJumping = false;
                player.jumpCount = player.maxJumpCount;
            }
        }

        if (currentStage === 4) {
            if (!largeEnemySpawnedInStage4 && bossEnemyInstance === null) {
                bossSpawnProgress += deltaTime;
                if (bossSpawnProgress >= BOSS_SPAWN_DELAY) {
                    spawnBoss();
                }
            }
        } else {
            if (currentTime - lastEnemySpawnTime > enemySpawnInterval) {
                spawnEnemy();
                lastEnemySpawnTime = currentTime;
            }
        }

        enemies = enemies.filter(enemy => enemy.active || enemy.isStomped);
        enemies.forEach(enemy => {
            if (enemy instanceof BossEnemy) {
                enemy.update(deltaTime, player);
            } else {
                enemy.update(deltaTime);
            }
            
            if (checkCollision(player, enemy) && !enemy.isStomped) {
                const playerBottom = player.y + player.height;
                const enemyTop = enemy.y;

                if (player.velocityY > 0 && playerBottom < enemyTop + enemy.height / 2) {
                    if (enemy instanceof BossEnemy) {
                        if (!enemy.isInvincible) {
                            enemy.takeHit();
                        }
                        if (enemy.isDefeated && !isStageClearItemSpawned) {
                            const itemWidth = 40;
                            const itemHeight = 40;
                            const itemX = enemy.x + enemy.width / 2 - itemWidth / 2;
                            const itemY = enemy.y + enemy.height / 2 - itemHeight / 2;
                            items.push(new Item(itemX, itemY, itemWidth, itemHeight, 'stage_clear', true));
                            isStageClearItemSpawned = true;
                        }
                    } else {
                        enemy.isStomped = true;
                        enemy.stompedTimer = enemy.stompedDuration;
                        score += 100;
                        playSound(enemyHitSound);
                    }
                    player.velocityY = player.jumpStrength / 2;
                    player.isJumping = true;
                } else {
                    player.takeDamage();
                }
            }
        });

        projectiles = projectiles.filter(p => p.active);
        projectiles.forEach(p => {
            p.update(deltaTime);
            enemies.forEach(enemy => {
                if (enemy.active && !enemy.isStomped && checkCollision(p, enemy) && !(enemy instanceof BossEnemy)) {
                    p.active = false;
                    enemy.active = false;
                    score += 150;
                    playSound(enemyHitSound);
                }
            });
        });
        
        // 敵の火の玉の更新と衝突判定 (新規追加)
        enemyProjectiles = enemyProjectiles.filter(ep => ep.active);
        enemyProjectiles.forEach(ep => {
            ep.update(deltaTime);
            if (checkCollision(player, ep)) {
                player.takeDamage();
                ep.active = false; // ヒットしたら火の玉は消える
            }
        });

        bombs = bombs.filter(b => b.active);
        bombs.forEach(bomb => {
            bomb.update(deltaTime);
            if (checkCollision(player, bomb)) {
                player.takeDamage();
                bomb.active = false;
            }
        });


        blocks = blocks.filter(block => block.x + block.width > 0 && !(block instanceof BreakableBlock && block.isBroken && block.breakTimer <= 0));
        blocks.forEach(block => {
            block.update(deltaTime);
        });

        if (blocks.length > 0 && blocks[blocks.length - 1].x < canvas.width * 0.8 && currentStage !== 4) {
            const lastBlock = blocks[blocks.length - 1];
            const newBlockWidth = 80 + Math.random() * 50;
            const gap = 50 + Math.random() * 50;
            const newBlockX = lastBlock.x + lastBlock.width + gap;
            let newBlockY = lastBlock.y + (Math.random() - 0.5) * 50;
            newBlockY = Math.max(canvas.height - 400, Math.min(canvas.height - 50, newBlockY));

            const blockTypeRoll = Math.random();
            if (blockTypeRoll < 0.25) {
                const hasItem = Math.random() < 0.8;
                const itemType = Math.random() < 0.5 ? 'health' : 'invincibility';
                blocks.push(new BreakableBlock(newBlockX, newBlockY, newBlockWidth, 30, hasItem, itemType));
            } else {
                blocks.push(new Block(newBlockX, newBlockY, newBlockWidth, 30));
            }
        }

        for (const block of blocks) {
            if (block instanceof BreakableBlock && !block.isBroken) {
                if (player.velocityY < 0 && checkCollision(player, block)) {
                    if (player.y < block.y + block.height && player.y + player.height > block.y + block.height) {
                        block.hitFromBelow();
                        player.velocityY = 0;
                        player.y = block.y + block.height;
                    }
                }
            }
        }
        
        if (currentStage === 3 && !isStageClearItemSpawned && score >= getStageClearScore()) {
            const itemWidth = 40;
            const itemHeight = 40;
            const itemX = canvas.width + 100;
            const itemY = canvas.height - itemHeight - 100;
            items.push(new Item(itemX, itemY, itemWidth, itemHeight, 'stage_clear'));
            isStageClearItemSpawned = true;
        }

        items = items.filter(item => item.active);
        items.forEach(item => {
            item.update(deltaTime);
            
            if (checkCollision(player, item)) {
                if (item.type === 'health') {
                    player.heal();
                } else if (item.type === 'invincibility') {
                    player.gainInvincibility();
                } else if (item.type === 'shoot_ability') {
                    player.gainShootAbility();
                } else if (item.type === 'stage_clear') {
                    item.active = false;
                    stageClear();
                    return;
                }
                item.active = false;
            }
        });

        score++;
    }

    player.draw();
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(p => p.draw());
    enemyProjectiles.forEach(ep => ep.draw()); // <<< 追加
    bombs.forEach(bomb => bomb.draw());
    blocks.forEach(block => block.draw());
    items.forEach(item => item.draw());

    updateUI();

    requestAnimationFrame(gameLoop);
}

// ====================================================================
// イベントリスナー
// ====================================================================
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    if (e.code === 'Escape') {
        togglePause();
        return;
    }

    if (isGamePaused || isGamePausedForDamage) return;

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        player.jump();
    }
    if (e.code === 'ArrowRight') {
        player.speedX = player.maxSpeedX;
    }
    if (e.code === 'ArrowLeft') {
        player.speedX = -player.maxSpeedX;
    }
    if (e.code === 'KeyX') {
        player.shoot();
    }
});

document.addEventListener('keyup', (e) => {
    if (!gameRunning || isGamePaused || isGamePausedForDamage) return;

    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        player.speedX = 0;
    }
});

leftButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = -player.maxSpeedX; });
leftButton.addEventListener('touchend', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
leftButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = -player.maxSpeedX; });
leftButton.addEventListener('mouseup', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
leftButton.addEventListener('mouseleave', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage && e.buttons === 0) player.speedX = 0; });

rightButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = player.maxSpeedX; });
rightButton.addEventListener('touchend', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
rightButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = player.maxSpeedX; });
rightButton.addEventListener('mouseup', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.speedX = 0; });
rightButton.addEventListener('mouseleave', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage && e.buttons === 0) player.speedX = 0; });

jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.jump(); });
jumpButton.addEventListener('mousedown', (e) => { if (gameRunning && !isGamePaused && !isGamePausedForDamage) player.jump(); });

startButton.addEventListener('click', () => {
    if (assetsLoadedCount === totalAssets) {
        if (assetsLoadErrors.length > 0) {
            console.error("ゲーム開始: 一部のアセットの読み込みに失敗しました。");
        } else {
            console.log("ゲーム開始: 全てのアセットが正常にロードされました。");
        }
        startScreen.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
        pauseButton.classList.remove('hidden');
        resetFullGame();
        startGameLoop();
    } else {
        console.log(`ゲーム開始待機中: アセットを読み込み中です...`);
    }
});

continueButton.addEventListener('click', continueGame);
restartButton.addEventListener('click', restartGame);
nextStageButton.addEventListener('click', startNextStage);
restartFromClearButton.addEventListener('click', restartGame);
pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', resumeGame);
restartFromPauseButton.addEventListener('click', restartGameFromPause);

// ====================================================================
// ゲームの初期化
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    loadAssets().then(() => {
        console.log("DOM Loaded: All asset loading attempts completed.");
        if (assetsLoadErrors.length > 0) {
            console.warn("DOM Loaded: Some assets failed to load.");
        }
    }).catch(error => {
        console.error("DOM Loaded: Unexpected error during asset loading promise:", error);
    });
});
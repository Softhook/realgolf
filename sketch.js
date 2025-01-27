// Include p5.js and p5.sound.js before this script:
// <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/p5.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.0/addons/p5.sound.min.js"></script>
// <script src="sketch.js"></script>

let game;
let fileInput;
let showIntro = true;
let showPlayerSelect = true;

function preload() {
  soundFormats('ogg', 'mp3');
  this.bounceSound = loadSound('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
  this.holeInSound = loadSound('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg');
  this.waterSound = loadSound('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg');
  this.hitSound = loadSound('https://actions.google.com/sounds/v1/cartoon/metallic_clank.ogg');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  fileInput = createFileInput(handleFile);
  fileInput.position(20, 140);
  fileInput.hide();
  
  game = new Game(this.bounceSound, this.holeInSound, this.waterSound, this.hitSound);

  game.loadLevelFromStorage();
  
  if (game.levels.length === 0) {
    fetch('level.txt')
      .then(response => response.text())
      .then(data => {
        game.loadLevelFromText(data);
        game.initialiseGameFromLevel();
      })
      .catch(err => {
        game.createDefaultLevel();
        game.initialiseGameFromLevel();
      });
  } else {
    game.initialiseGameFromLevel();
  }
}

function draw() {
  if (showIntro) {
    background(50, 150, 50);
    fill(0);
    noStroke();
    textSize(48);
    textAlign(CENTER, CENTER);
    text("'Real' Golf", width / 2, height / 2 - 100);
    textSize(24);
    text("Use mouse to click on ball and pull back to shoot.", width / 2, height / 2 - 40);
    text("Press 'm' to edit levels.", width / 2, height / 2);
    text("Press 1 for single player, 2 for two players.", width / 2, height / 2 + 40);
    return;
  }

  if (showPlayerSelect) {
    background(200, 255, 0);
    fill(0);
    noStroke();
    textSize(32);
    textAlign(CENTER, CENTER);
    text("1-Player or 2-Player?", width / 2, height / 2);
    return;
  }

  game.update();
  game.display();
   
}

function mousePressed() {
  if (showIntro) {
    // No action until player mode chosen
  } else if (showPlayerSelect) {
    // No action here, waiting for key press
  } else {
    game.mousePressed();
  }
}

function mouseReleased() {
  if (!showIntro && !showPlayerSelect) {
    game.mouseReleased();
  }
}

function mouseDragged() {
  if (!showIntro && !showPlayerSelect) {
    game.mouseDragged();
  }
}

function keyPressed() {
  if (showIntro) {
    if (key === '1') {
      game.playerCount = 1;
      showIntro = false;
      showPlayerSelect = false;
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      game.initialiseGameFromLevel();
    } else if (key === '2') {
      game.playerCount = 2;
      showIntro = false;
      showPlayerSelect = false;
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      game.initialiseGameFromLevel();
    }
    if ((key === ' ' || keyCode === ENTER)) {
      game.playerCount = 1;
      showIntro = false;
      showPlayerSelect = false;
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      game.initialiseGameFromLevel();
    }
  } else if (showPlayerSelect) {
    if (key === '1') {
      game.playerCount = 1;
      showPlayerSelect = false;
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      game.initialiseGameFromLevel();
    } else if (key === '2') {
      game.playerCount = 2;
      showPlayerSelect = false;
      fullscreen(true);
      resizeCanvas(windowWidth, windowHeight);
      game.initialiseGameFromLevel();
    }
  } else {
    game.keyPressed();
  }
}

function handleFile(file) {
  if (file.type === 'text') {
    game.loadLevelFromText(file.data);
    game.initialiseGameFromLevel();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}



class CollisionUtils {
  static checkCollisions(game) {
    let lvl = game.getCurrentLevel();
    let ball = game.getCurrentPlayerBall();

    if (lvl.boundaryPoints.length > 1) {
      CollisionUtils.checkBoundaryCollision(ball, lvl.boundaryPoints, game);
    }

    if (ball.ballZ < 0) {
      return;
    }

    for (let obs of lvl.obstacles) {
      CollisionUtils.handleObstacleCollision(ball, obs, game);
    }
  }

  static checkBoundaryCollision(ball, points, game) {
    for (let i = 0; i < points.length - 1; i++) {
      let p1 = points[i];
      let p2 = points[i + 1];
      let closest = CollisionUtils.closestPointOnLineSegment(ball.pos.x, ball.pos.y, p1.x, p1.y, p2.x, p2.y);
      let d = dist(ball.pos.x, ball.pos.y, closest.x, closest.y);
      if (d < ball.radius && ball.ballZ === 0) {
        let overlap = ball.radius - d;
        let n = createVector(ball.pos.x - closest.x, ball.pos.y - closest.y).normalize();
        ball.pos.x += n.x * overlap;
        ball.pos.y += n.y * overlap;
        CollisionUtils.reflectVelocity(ball, n);
        game.playBounceSound();
      }
    }
  }

  static handleObstacleCollision(ball, obs, game) {
    if (obs.type === 'rect') {
      CollisionUtils.handleRectCollision(ball, obs, game);
    } else if (obs.type === 'circle') {
      CollisionUtils.handleCircleCollision(ball, obs, game);
    } else if (obs.type === 'water') {
      CollisionUtils.handleWaterCollision(ball, obs, game);
    } else if (obs.type === 'jump') {
      CollisionUtils.handleJumpCollision(ball, obs, game);
    } else if (obs.type === 'repulsion') {
      CollisionUtils.handleRepulsionCollision(ball, obs, game);
    } else if (obs.type === 'movingRect') {
      CollisionUtils.handleMovingRectCollision(ball, obs, game);
    } else if (obs.type === 'speedUp') {
      CollisionUtils.handleSpeedUpCollision(ball, obs, game);
    } else if (obs.type === 'slowDown') {
      CollisionUtils.handleSlowDownCollision(ball, obs, game);
    }
  }

    static handleSpeedUpCollision(ball, obs, game) {
    let d = dist(ball.pos.x, ball.pos.y, obs.x, obs.y);
    if (d < obs.r + ball.radius) {
      let factor = 1 - (d / (obs.r + ball.radius));
      ball.vel.mult(1 + obs.strength * factor);
    }
  }

  static handleSlowDownCollision(ball, obs, game) {
    let d = dist(ball.pos.x, ball.pos.y, obs.x, obs.y);
    if (d < obs.r + ball.radius) {
      let factor = 1 - (d / (obs.r + ball.radius));
      ball.vel.mult(1 - obs.strength * factor);
      // Ensure velocity doesn't go below zero
      ball.vel.setMag(max(ball.vel.mag(), 0));
    }
  }
  
  static handleRectCollision(ball, obs, game) {
    let p = CollisionUtils.rotatePoint(ball.pos.x - obs.x, ball.pos.y - obs.y, -obs.angle);
    let halfW = obs.w / 2;
    let halfH = obs.h / 2;
    if (p.x > -halfW - ball.radius && p.x < halfW + ball.radius && p.y > -halfH - ball.radius && p.y < halfH + ball.radius) {
      let closestX = constrain(p.x, -halfW, halfW);
      let closestY = constrain(p.y, -halfH, halfH);
      let d = dist(p.x, p.y, closestX, closestY);
      if (d < ball.radius) {
        let dx = p.x - closestX;
        let dy = p.y - closestY;
        let overlap = ball.radius - d;
        let nx = 0;
        let ny = 0;
        if (abs(dx) > abs(dy)) {
          nx = dx > 0 ? overlap : -overlap;
        } else {
          ny = dy > 0 ? overlap : -overlap;
        }
        let rotated = CollisionUtils.rotatePoint(nx, ny, obs.angle);
        ball.pos.x += rotated.x;
        ball.pos.y += rotated.y;
        let normal = createVector(rotated.x, rotated.y).normalize();
        CollisionUtils.reflectVelocity(ball, normal);
        game.playBounceSound();
      }
    }
  }

  static handleMovingRectCollision(ball, obs, game) {
    let lineDir = createVector(obs.endX - obs.startX, obs.endY - obs.startY);
    let currentPos = createVector(obs.startX, obs.startY).add(lineDir.mult(obs.t));
    let p = CollisionUtils.rotatePoint(ball.pos.x - currentPos.x, ball.pos.y - currentPos.y, -obs.angle);
    let halfW = obs.w / 2;
    let halfH = obs.h / 2;
    if (p.x > -halfW - ball.radius && p.x < halfW + ball.radius && p.y > -halfH - ball.radius && p.y < halfH + ball.radius) {
      let closestX = constrain(p.x, -halfW, halfW);
      let closestY = constrain(p.y, -halfH, halfH);
      let d = dist(p.x, p.y, closestX, closestY);
      if (d < ball.radius) {
        let dx = p.x - closestX;
        let dy = p.y - closestY;
        let overlap = ball.radius - d;
        let nx = 0;
        let ny = 0;
        if (abs(dx) > abs(dy)) {
          nx = dx > 0 ? overlap : -overlap;
        } else {
          ny = dy > 0 ? overlap : -overlap;
        }
        let rotated = CollisionUtils.rotatePoint(nx, ny, obs.angle);
        ball.pos.x += rotated.x;
        ball.pos.y += rotated.y;
        let normal = createVector(rotated.x, rotated.y).normalize();
        CollisionUtils.reflectVelocity(ball, normal);
        game.playBounceSound();
      }
    }
  }

  static handleCircleCollision(ball, obs, game) {
    let d = dist(ball.pos.x, ball.pos.y, obs.x, obs.y);
    if (d < obs.r + ball.radius) {
      let n = p5.Vector.sub(ball.pos, createVector(obs.x, obs.y)).normalize();
      let overlap = obs.r + ball.radius - d;
      ball.pos.x += n.x * overlap;
      ball.pos.y += n.y * overlap;
      CollisionUtils.reflectVelocity(ball, n);
      game.playBounceSound();
    }
  }

  static handleWaterCollision(ball, obs, game) {
    let p = CollisionUtils.rotatePoint(ball.pos.x - obs.x, ball.pos.y - obs.y, -obs.angle);
    let halfW = obs.w / 2;
    let halfH = obs.h / 2;
    if (p.x > -halfW && p.x < halfW && p.y > -halfH && p.y < halfH) {
      game.playWaterSound();
      let lvl = game.getCurrentLevel();
      ball.reset(lvl.startPos.x, lvl.startPos.y);
      game.playerShots[game.currentPlayer]++;
    }
  }

  static handleJumpCollision(ball, obs, game) {
    let p = CollisionUtils.rotatePoint(ball.pos.x - obs.x, ball.pos.y - obs.y, -obs.angle);
    let halfW = obs.w / 2;
    let halfH = obs.h / 2;
    if (ball.ballZ === 0 && p.x > -halfW && p.x < halfW && p.y > -halfH && p.y < halfH) {
      ball.ballZVel = -8;
    }
  }

  static handleRepulsionCollision(ball, obs, game) {
    let d = dist(ball.pos.x, ball.pos.y, obs.x, obs.y);
    let range = obs.r + ball.radius;
    if (d < range) {
      let factor = (range - d) / range;
      let dir = p5.Vector.sub(ball.pos, createVector(obs.x, obs.y)).normalize();
      ball.applyForce(dir.mult(obs.strength * factor));
    }
  }

  static reflectVelocity(ball, normal) {
    let velDotNormal = ball.vel.dot(normal);
    ball.vel.sub(p5.Vector.mult(normal, 2 * velDotNormal));
  }

  static closestPointOnLineSegment(x, y, x1, y1, x2, y2) {
    let A = createVector(x, y);
    let B = createVector(x1, y1);
    let C = createVector(x2, y2);
    let AB = p5.Vector.sub(C, B);
    let t = p5.Vector.dot(p5.Vector.sub(A, B), AB) / p5.Vector.dot(AB, AB);
    t = constrain(t, 0, 1);
    return createVector(B.x + AB.x * t, B.y + AB.y * t);
  }

  static rotatePoint(x, y, angleDeg) {
    let a = radians(angleDeg);
    let nx = x * cos(a) - y * sin(a);
    let ny = x * sin(a) + y * cos(a);
    return createVector(nx, ny);
  }
}

class Game {
  constructor(bounceSound, holeInSound, waterSound, hitSound) {
    this.gameMode = 'play';
    this.soundInitialized = false;
    this.levels = [];
    this.currentLevelIndex = 0;
    this.gravity = 0.3;
    this.bounceSound = bounceSound;
    this.holeInSound = holeInSound;
    this.waterSound = waterSound;
    this.hitSound = hitSound;
    this.selectedObstacleIndex = -1;
    this.selectedBoundaryPointIndex = -1;
    this.selectedBall = false;
    this.selectedHole = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isAiming = false;
    this.aimStart = null;
    this.aimEnd = null;
    this.showFileInput = false;
    this.playerCount = 1;
    this.currentPlayer = 0;
    this.players = [];
    this.playerShots = [];
    this.playerHoleComplete = [];
    this.gameOver = false;
    this.totalLevels = 0;
    this.draggingMovingRectEnd = false;
  }

  initialiseGameFromLevel() {
    if (this.levels.length === 0) {
      this.createDefaultLevel();
    }
    if (this.currentLevelIndex >= this.levels.length) {
      this.currentLevelIndex = 0;
    }
    let lvl = this.getCurrentLevel();

    this.players = [];
    this.playerShots = [];
    this.playerHoleComplete = [];
    for (let i = 0; i < this.playerCount; i++) {
      this.players.push(new Ball(lvl.startPos.x, lvl.startPos.y, 15, this.gravity));
      this.playerShots.push(0);
      this.playerHoleComplete.push(false);
    }

    this.hole = new Hole(lvl.holePos.x, lvl.holePos.y, 20);
    this.gameOver = false;
    this.currentPlayer = 0;
    this.totalLevels = this.levels.length;
  }

  getCurrentLevel() {
    return this.levels[this.currentLevelIndex];
  }

  getCurrentPlayerBall() {
    return this.players[this.currentPlayer];
  }

  update() {
    if (this.gameMode === 'play') {
      let ball = this.getCurrentPlayerBall();
      if (ball.pos.x < 0 || ball.pos.x > width || ball.pos.y < 0 || ball.pos.y > height) {
        let lvl = this.getCurrentLevel();
        ball.reset(lvl.startPos.x, lvl.startPos.y);
      }
    }

    let lvl = this.getCurrentLevel();
    for (let obs of lvl.obstacles) {
      if (obs.type === 'movingRect') {
        if (obs.goingForward) {
          obs.t += obs.speed;
          if (obs.t > 1) {
            obs.t = 1;
            obs.goingForward = false;
          }
        } else {
          obs.t -= obs.speed;
          if (obs.t < 0) {
            obs.t = 0;
            obs.goingForward = true;
          }
        }
      }
    }
  }

  display() {
    background(50, 150, 50);
    if (this.gameMode === 'design') {
      this.drawDesignMode();
    } else {
      this.drawPlayMode();
    }
  }

  mousePressed() {
    if (!this.soundInitialized) {
      getAudioContext().resume();
      this.soundInitialized = true;
    }

    if (this.gameMode === 'play') {
      let ball = this.getCurrentPlayerBall();
      if (ball.isStationary() && this.currentLevelIndex < this.totalLevels && this.levels.length > 0) {
        let d = dist(mouseX, mouseY, ball.pos.x, ball.pos.y);
        if (d <= ball.radius*2) {
          this.isAiming = true;
          this.aimStart = createVector(ball.pos.x, ball.pos.y);
          this.aimEnd = null;
        }
      }
    } else if (this.gameMode === 'design') {
      let lvl = this.getCurrentLevel();
      let hitObsIndex = lvl.hitTestObstacles(mouseX, mouseY);
      let hitBoundaryIndex = lvl.hitTestBoundaryPoints(mouseX, mouseY);
      let onHole = dist(mouseX, mouseY, this.hole.pos.x, this.hole.pos.y) < (this.hole.radius + 5);
      let onBall = dist(mouseX, mouseY, this.players[0].pos.x, this.players[0].pos.y) < (this.players[0].radius + 5);

      this.selectedObstacleIndex = -1;
      this.selectedBoundaryPointIndex = -1;
      this.selectedBall = false;
      this.selectedHole = false;
      this.draggingMovingRectEnd = false;

      if (onBall) {
        this.selectedBall = true;
        this.dragOffsetX = this.players[0].pos.x - mouseX;
        this.dragOffsetY = this.players[0].pos.y - mouseY;
      } else if (onHole) {
        this.selectedHole = true;
        this.dragOffsetX = this.hole.pos.x - mouseX;
        this.dragOffsetY = this.hole.pos.y - mouseY;
        
      } else if (hitObsIndex !== -1) {
        let obs = lvl.obstacles[hitObsIndex];
        
        if (obs.type === 'movingRect') {
          let dEnd = dist(mouseX, mouseY, obs.endX, obs.endY);
          if (dEnd < 10) {
            this.selectedObstacleIndex = hitObsIndex;
            this.draggingMovingRectEnd = true;
            this.dragOffsetX = obs.endX - mouseX;
            this.dragOffsetY = obs.endY - mouseY;
            return;
          }
        }
        

        this.selectedObstacleIndex = hitObsIndex;
        this.dragOffsetX = obs.x - mouseX;
        this.dragOffsetY = obs.y - mouseY;
      } else if (hitBoundaryIndex !== -1) {
        this.selectedBoundaryPointIndex = hitBoundaryIndex;
        let bp = lvl.boundaryPoints[hitBoundaryIndex];
        this.dragOffsetX = bp.x - mouseX;
        this.dragOffsetY = bp.y - mouseY;
      }
    }
  }

  mouseReleased() {
    if (this.gameMode === 'play') {
      if (this.isAiming) {
        this.aimEnd = createVector(mouseX, mouseY);
        let force = p5.Vector.sub(this.aimStart, this.aimEnd);
        force.limit(150);
        force.mult(0.1);
        let ball = this.getCurrentPlayerBall();
        ball.applyForce(force);
        this.isAiming = false;
        this.playerShots[this.currentPlayer]++;
        this.playHitSound();
      }
    } else if (this.gameMode === 'design') {
      this.draggingMovingRectEnd = false;
    }
  }

  mouseDragged() {
    if (this.gameMode === 'design') {
      let lvl = this.getCurrentLevel();
      if (this.selectedObstacleIndex !== -1 && this.draggingMovingRectEnd) {
        let obs = lvl.obstacles[this.selectedObstacleIndex];
        if (obs.type === 'movingRect') {
          obs.endX = mouseX + this.dragOffsetX;
          obs.endY = mouseY + this.dragOffsetY;
        }        
      } else if (this.selectedObstacleIndex !== -1) {
        let obs = lvl.obstacles[this.selectedObstacleIndex];
        obs.x = mouseX + this.dragOffsetX;
        obs.y = mouseY + this.dragOffsetY;
      } else if (this.selectedBoundaryPointIndex !== -1) {
        let bp = lvl.boundaryPoints[this.selectedBoundaryPointIndex];
        bp.x = mouseX + this.dragOffsetX;
        bp.y = mouseY + this.dragOffsetY;
      } else if (this.selectedBall) {
        this.players[0].pos.x = mouseX + this.dragOffsetX;
        this.players[0].pos.y = mouseY + this.dragOffsetY;
      } else if (this.selectedHole) {
        this.hole.pos.x = mouseX + this.dragOffsetX;
        this.hole.pos.y = mouseY + this.dragOffsetY;
      }
    }
  }

  keyPressed() {
    let lvl = this.getCurrentLevel();
    if (this.gameMode === 'design') {
      switch (key) {
        case 'b':
          lvl.boundaryPoints.push({ x: mouseX, y: mouseY });
          break;
        case 'w':
          lvl.obstacles.push({ type: 'water', x: mouseX, y: mouseY, w: 100, h: 100, angle: 0 });
          break;
        case 'j':
          lvl.obstacles.push({ type: 'jump', x: mouseX, y: mouseY, w: 100, h: 20, angle: 0 });
          break;
        case 'o':
          lvl.obstacles.push({ type: 'circle', x: mouseX, y: mouseY, r: 50 });
          break;
        case 'r':
          lvl.obstacles.push({ type: 'rect', x: mouseX, y: mouseY, w: 100, h: 50, angle: 0 });
          break;
        case 'p':
          lvl.obstacles.push({ type: 'repulsion', x: mouseX, y: mouseY, r: 50, strength: 0.5 });
          break;
        case 'f':
          lvl.obstacles.push({
            type: 'movingRect',
            x: mouseX,
            y: mouseY,
            w: 100,
            h: 50,
            angle: 0,
            startX: mouseX,
            startY: mouseY,
            endX: mouseX + 200,
            endY: mouseY,
            speed: 0.01,
            t: 0,
            goingForward: true
          });
          break;
        case 's':
          this.saveLevelToStorage();
          break;
        case 'l':
          this.loadLevelFromStorage();
          if (this.levels.length > 0) {
            this.totalLevels = this.levels.length;
            this.initialiseGameFromLevel();
          }
          break;
        case 'x':
          if (this.selectedObstacleIndex !== -1) {
            lvl.obstacles.splice(this.selectedObstacleIndex, 1);
            this.selectedObstacleIndex = -1;
          } else if (this.selectedBoundaryPointIndex !== -1) {
            lvl.boundaryPoints.splice(this.selectedBoundaryPointIndex, 1);
            this.selectedBoundaryPointIndex = -1;
          }
          this.selectedBall = false;
          this.selectedHole = false;
          break;
        case '1':
          if (this.selectedObstacleIndex !== -1) {
            let obs = lvl.obstacles[this.selectedObstacleIndex];
            scaleObstacle(obs, 0.9);
          }
          break;
        case '2':
          if (this.selectedObstacleIndex !== -1) {
            let obs = lvl.obstacles[this.selectedObstacleIndex];
            scaleObstacle(obs, 1.1);
          }
          break;
        case 'q':
          if (this.selectedObstacleIndex !== -1) {
            let obs = lvl.obstacles[this.selectedObstacleIndex];
            rotateObstacle(obs, -5);
          }
          break;
        case 'e':
          if (this.selectedObstacleIndex !== -1) {
            let obs = lvl.obstacles[this.selectedObstacleIndex];
            rotateObstacle(obs, 5);
          }
          break;
        case 'n':
          this.createEmptyLevel();
          this.totalLevels = this.levels.length;
          this.currentLevelIndex = this.totalLevels - 1;
          this.initialiseGameFromLevel();
          break;
          case 'c':
          // Clear the current level ONLY
          if (lvl) { // Check if a level exists
            lvl.boundaryPoints = [];
            lvl.obstacles = [];
            lvl.startPos = { x: width / 2, y: height / 2 }; // Reset start position
            lvl.holePos = { x: width / 2 + 200, y: height / 2 }; // Reset hole position
            this.players[0].pos.set(lvl.startPos.x, lvl.startPos.y);
            this.hole.pos.set(lvl.holePos.x, lvl.holePos.y);
          }
          break;
        case '[': // Move level up
          this.moveLevel(-1);
          break;
        case ']': // Move level down
          this.moveLevel(1);
          break;
        case '.':
          lvl.obstacles.push({ type: 'speedUp', x: mouseX, y: mouseY, r: 50, strength: 0.1 });
          break;
        case ',':
          lvl.obstacles.push({ type: 'slowDown', x: mouseX, y: mouseY, r: 50, strength: 0.1 });
          break;
        case 'd':
          this.downloadLevel();
          break;
        case 'u':
          this.toggleFileInput();
          break;
      }

      if (keyCode === LEFT_ARROW) {
        this.currentLevelIndex--;
        if (this.currentLevelIndex < 0) this.currentLevelIndex = this.totalLevels - 1;
        this.initialiseGameFromLevel();
      } else if (keyCode === RIGHT_ARROW) {
        this.currentLevelIndex++;
        if (this.currentLevelIndex >= this.totalLevels) this.currentLevelIndex = 0;
        this.initialiseGameFromLevel();
      }
    }

    if (key === 'm' && this.gameMode === 'play') {
      this.gameMode = 'design';
      if (this.levels.length > 0 && this.currentLevelIndex < this.levels.length) {
        let lvl = this.getCurrentLevel();
        this.players[0].pos.set(lvl.startPos.x, lvl.startPos.y);
        this.hole.pos.set(lvl.holePos.x, lvl.holePos.y);
      }
    } else if (key === 'm' && this.gameMode === 'design') {
      if (this.levels.length > 0 && this.currentLevelIndex < this.levels.length) {
        let lvl = this.getCurrentLevel();
        lvl.startPos = { x: this.players[0].pos.x, y: this.players[0].pos.y };
        lvl.holePos = { x: this.hole.pos.x, y: this.hole.pos.y };
      }
      this.gameMode = 'play';
      this.resetGame();
    }
  }

    moveLevel(direction) {
    if (this.levels.length > 1) {
      let newIndex = this.currentLevelIndex + direction;
      if (newIndex < 0) {
        newIndex = this.levels.length - 1;
      } else if (newIndex >= this.levels.length) {
        newIndex = 0;
      }
      // Swap levels
      [this.levels[this.currentLevelIndex], this.levels[newIndex]] = [this.levels[newIndex], this.levels[this.currentLevelIndex]];
      this.currentLevelIndex = newIndex;
      this.initialiseGameFromLevel();
    }
  }
  
  toggleFileInput() {
    this.showFileInput = !this.showFileInput;
    if (this.showFileInput) {
      fileInput.show();
    } else {
      fileInput.hide();
    }
  }

  downloadLevel() {
    if (this.levels.length > 0 && this.currentLevelIndex < this.levels.length) {
      let lvl = this.getCurrentLevel();
      lvl.startPos = { x: this.players[0].pos.x, y: this.players[0].pos.y };
      lvl.holePos = { x: this.hole.pos.x, y: this.hole.pos.y };
    }
    let data = JSON.stringify(this.levels.map(l => l.serialize()), null, 2);
    let blob = new Blob([data], {type: 'text/plain'});
    let url = URL.createObjectURL(blob);
    let a = createA(url, 'level.txt');
    a.attribute('download', 'level.txt');
    a.hide();
    a.elt.click();
    URL.revokeObjectURL(url);
  }

  loadLevelFromText(data) {
    let arr = JSON.parse(data);
    this.levels = arr.map(d => new Level(d));
    this.totalLevels = this.levels.length;
    if (this.totalLevels === 0) {
      this.createDefaultLevel();
    }
    if (this.currentLevelIndex >= this.totalLevels) {
      this.currentLevelIndex = 0;
    }
  }

  drawDesignMode() {
    let lvl = this.getCurrentLevel();
    lvl.drawCourseBoundaryCurves();
    for (let i = 0; i < lvl.obstacles.length; i++) {
      drawObstacle(lvl.obstacles[i], i === this.selectedObstacleIndex);
    }
    drawHoleDesignMode(this.hole, this.selectedHole);
    drawBallDesignMode(this.players[0], this.selectedBall);
    drawDesignUI();
    drawBoundaryPointMarkers(lvl.boundaryPoints);
    text(`Level: ${this.currentLevelIndex + 1} / ${this.totalLevels}`, 200, 20);
    text("D:Download, U:Upload, Left/Right:Change level", 20, 110);
  }

  drawPlayMode() {
    if (this.currentLevelIndex < this.totalLevels && this.levels.length > 0) {
      let lvl = this.getCurrentLevel();
      lvl.drawCourseBoundaryCurves();

      for (let obs of lvl.obstacles) {
        drawObstacle(obs, false);
      }

      this.hole.display();

      if (!this.gameOver) {
        let ball = this.getCurrentPlayerBall();
        ball.update();
        CollisionUtils.checkCollisions(this);
        ball.display();

        if (ball.ballZ === 0 && this.hole.isBallInHole(ball) && !this.playerHoleComplete[this.currentPlayer]) {
          this.playHoleInSound();
          this.playerHoleComplete[this.currentPlayer] = true;
          if (this.playerHoleComplete.every(x => x)) {
            this.gameOver = true;
            setTimeout(() => this.showLevelResults(), 2000);
          } else {
            this.switchPlayer();
          }
        }
      } else {
        this.displayLevelResults();
      }

      if (this.isAiming) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(this.aimStart.x, this.aimStart.y, mouseX, mouseY);
      }
    } else {
      if (this.levels.length === 0) {
        this.createDefaultLevel();
        this.initialiseGameFromLevel();
      }
      fill(0, 200);
      rect(width / 2 - 250, height / 2 - 75, 500, 150, 20);
      fill(255);
      noStroke();
      textSize(32);
      textAlign(CENTER, CENTER);
      text("No levels", width / 2, height / 2 - 30);
      textSize(20);
      text("Press M for edit mode or N for new level", width / 2, height / 2 + 20);
    }

    this.displayHUD();
  }

  showLevelResults() {
    this.nextLevel();
  }

  displayLevelResults() {
    fill(0, 150);
    rect(width / 2 - 200, height / 2 - 150, 400, 200, 20);
    fill(255);
    noStroke();
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Level Complete", width / 2, height / 2 - 100);

    textSize(20);
    text("Shots taken:", width / 2, height / 2 - 60);
    for (let i = 0; i < this.playerCount; i++) {
      text(`Player ${i+1}: ${this.playerShots[i]}`, width / 2, height / 2 - 30 + (i * 30));
    }
  }

  switchPlayer() {
    this.currentPlayer = (this.currentPlayer + 1) % this.playerCount;
  }

  nextLevel() {
    this.currentLevelIndex++;
    if (this.currentLevelIndex >= this.totalLevels) {
      this.currentLevelIndex = 0;
    }
    this.initialiseGameFromLevel();
  }

  resetGame() {
    if (this.levels.length > 0 && this.currentLevelIndex < this.levels.length) {
      let lvl = this.getCurrentLevel();
      for (let i = 0; i < this.playerCount; i++) {
        this.players[i].reset(lvl.startPos.x, lvl.startPos.y);
      }
      this.hole.setPosition(lvl.holePos.x, lvl.holePos.y);
      this.gameOver = false;
      for (let i = 0; i < this.playerCount; i++) {
        this.playerShots[i] = 0;
        this.playerHoleComplete[i] = false;
      }
      this.currentPlayer = 0;
    }
  }

  createDefaultLevel() {
    let levelData = {
      boundaryPoints: [{ x: 100, y: 100 }, { x: 1100, y: 100 }, { x: 1100, y: 700 }, { x: 100, y: 700 }],
      startPos: { x: 200, y: 200 },
      holePos: { x: 1000, y: 600 },
      obstacles: []
    };
    this.levels.push(new Level(levelData));
    this.totalLevels = this.levels.length;
  }

  createEmptyLevel() {
    let levelData = {
      boundaryPoints: [],
      startPos: { x: width / 2, y: height / 2 },
      holePos: { x: width / 2 + 200, y: height / 2 },
      obstacles: []
    };
    this.levels.push(new Level(levelData));
  }

  saveLevelToStorage() {
    if (this.levels.length > 0 && this.currentLevelIndex < this.levels.length) {
      let lvl = this.getCurrentLevel();
      lvl.startPos = { x: this.players[0].pos.x, y: this.players[0].pos.y };
      lvl.holePos = { x: this.hole.pos.x, y: this.hole.pos.y };
    }
    let data = JSON.stringify(this.levels.map(l => l.serialize()));
    localStorage.setItem('golfLevels', data);
  }

  loadLevelFromStorage() {
    let data = localStorage.getItem('golfLevels');
    if (data) {
      let arr = JSON.parse(data);
      this.levels = arr.map(d => new Level(d));
      this.totalLevels = this.levels.length;
      if (this.totalLevels === 0) {
        this.createDefaultLevel();
      }
      if (this.currentLevelIndex >= this.totalLevels) {
        this.currentLevelIndex = 0;
      }
    }
  }

  playBounceSound() {
    this.playSound(this.bounceSound, 0.1);
  }

  playHoleInSound() {
    this.playSound(this.holeInSound, 0.5);
  }

  playWaterSound() {
    this.playSound(this.waterSound, 0.5);
  }

  playHitSound() {
    this.playSound(this.hitSound, 0.5);
  }

  playSound(sound, vol) {
    if (this.soundInitialized && sound && sound.isLoaded()) {
      sound.setVolume(vol);
      sound.play();
    }
  }

  displayHUD() {
    fill(255);
    noStroke();
    textSize(20);
    textAlign(LEFT, TOP);
    text(`Level: ${this.currentLevelIndex + 1} / ${this.totalLevels}`, 60, 20);
    text(`Player: ${this.currentPlayer + 1}`, 60, 50);
    text(`Shots: ${this.playerShots[this.currentPlayer]}`, 60, 80);
  }
}

class Level {
  constructor(data) {
    this.boundaryPoints = data.boundaryPoints || [];
    this.startPos = data.startPos;
    this.holePos = data.holePos;
    this.obstacles = data.obstacles || [];
  }

  drawCourseBoundaryCurves() {
    drawCourseBoundaryCurves(this.boundaryPoints);
  }

  hitTestObstacles(mx, my) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      push();
      if (obs.type === 'movingRect') {
        let lineDir = createVector(obs.endX - obs.startX, obs.endY - obs.startY);
        let currentPos = createVector(obs.startX, obs.startY).add(lineDir.mult(obs.t));
        translate(currentPos.x, currentPos.y);
        if (obs.angle !== undefined) rotate(radians(obs.angle));
        let localX = mx - currentPos.x;
        let localY = my - currentPos.y;
        let rotated = CollisionUtils.rotatePoint(localX, localY, -obs.angle);
        if (rotated.x > -obs.w / 2 && rotated.x < obs.w / 2 && rotated.y > -obs.h / 2 && rotated.y < obs.h / 2) {
          pop();
          return i;
        }
        pop();
        continue;
      }

      translate(obs.x, obs.y);
      if (obs.angle !== undefined) rotate(radians(obs.angle));
      let hit = false;
      if (obs.type === 'water' || obs.type === 'jump' || obs.type === 'rect') {
        if (mx - obs.x > -obs.w / 2 && mx - obs.x < obs.w / 2 && my - obs.y > -obs.h / 2 && my - obs.y < obs.h / 2) {
          hit = true;
        }
      } else if (obs.type === 'circle' || obs.type === 'repulsion' || obs.type === 'speedUp' || obs.type === 'slowDown') {
        let d = dist(mx, my, obs.x, obs.y);
        if (d < obs.r) hit = true;
      }
      pop();
      if (hit) return i;
    }
    return -1;
  }

  hitTestBoundaryPoints(mx, my) {
    for (let i = 0; i < this.boundaryPoints.length; i++) {
      let bp = this.boundaryPoints[i];
      let d = dist(mx, my, bp.x, bp.y);
      if (d < 10) return i;
    }
    return -1;
  }

  serialize() {
    return {
      boundaryPoints: this.boundaryPoints,
      startPos: this.startPos,
      holePos: this.holePos,
      obstacles: this.obstacles
    };
  }
}

class Ball {
  constructor(x, y, radius, gravity) {
    this.initialPos = createVector(x, y);
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.radius = radius;
    this.friction = 0.98;
    this.minSpeed = 0.2;
    this.ballZ = 0;
    this.ballZVel = 0;
    this.gravity = gravity;
  }

  applyForce(force) {
    this.vel.add(force);
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mult(this.friction);
    if (this.vel.mag() < this.minSpeed) {
      this.vel.set(0, 0);
    }

    if (this.ballZ !== 0 || this.ballZVel !== 0) {
      this.ballZVel += this.gravity;
      this.ballZ += this.ballZVel;
      if (this.ballZ >= 0) {
        this.ballZ = 0;
        this.ballZVel = 0;
      }
    }
  }

  display() {
    if (this.ballZ < 0) {
      fill(0, 0, 0, 50);
      ellipse(this.pos.x + 5, this.pos.y + 5, this.radius * 2);
    }

    if (game.players.indexOf(this) === 0) {
      fill(255, 0, 0);
    } else {
      fill(0, 0, 255);
    }

    noStroke();
    ellipse(this.pos.x, this.pos.y, this.radius * 2);

    if (this.ballZ < 0) {
      stroke(255, 0, 0);
      strokeWeight(2);
      noFill();
      ellipse(this.pos.x, this.pos.y, this.radius * 2 + 10);
    }
  }

  isStationary() {
    return this.vel.mag() < 0.4;
  }

  reset(x, y) {
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.ballZ = 0;
    this.ballZVel = 0;
  }
}

class Hole {
  constructor(x, y, radius) {
    this.pos = createVector(x, y);
    this.radius = radius;
  }

  setPosition(x, y) {
    this.pos.set(x, y);
  }

  display() {
    fill(0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.radius * 2);
  }

  isBallInHole(ball) {
    if (ball.ballZ !== 0) return false;
    let d = dist(this.pos.x, this.pos.y, ball.pos.x, ball.pos.y);
    return d <= this.radius;
  }
}

function scaleObstacle(obs, factor) {
  if (obs.type === 'water' || obs.type === 'jump' || obs.type === 'rect') {
    obs.w *= factor; obs.h *= factor;
  } else if (obs.type === 'circle') {
    obs.r *= factor;
  } else if (obs.type === 'repulsion') {
    obs.r *= factor;
  }  else if (obs.type === 'speedUp') {
    obs.r *= factor;
  } else if (obs.type === 'slowDown') {
    obs.r *= factor;
  }
  
}

function rotateObstacle(obs, angleChange) {
  if (obs.type === 'rect' || obs.type === 'jump' || obs.type === 'water' || obs.type === 'movingRect') {
    obs.angle += angleChange;
  }
}

function drawObstacle(obs, selected) {
  if (obs.type === 'movingRect') {
    let lineDir = createVector(obs.endX - obs.startX, obs.endY - obs.startY);
    let currentPos = createVector(obs.startX, obs.startY).add(lineDir.mult(obs.t));
    push();
    translate(currentPos.x, currentPos.y);
    if (obs.angle !== undefined) {
      rotate(radians(obs.angle));
    }
    noStroke();
    if (selected) {
      stroke(255, 0, 0);
      strokeWeight(2);
    }
    fill(128);
    rect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
    pop();

    if (game.gameMode === 'design' && selected) {
      stroke(255,0,0);
      strokeWeight(2);
      noFill();
      line(obs.startX, obs.startY, obs.endX, obs.endY);
      fill(255,0,0);
      noStroke();
      ellipse(obs.endX, obs.endY, 10, 10);
    }
    return;
  }

  push();
  translate(obs.x, obs.y);
  if (obs.angle !== undefined) {
    rotate(radians(obs.angle));
  }
  noStroke();
  if (selected) {
    stroke(255, 0, 0);
    strokeWeight(2);
  }
  if (obs.type === 'water') {
    fill(0, 0, 255, 150);
    rect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
  } else if (obs.type === 'jump') {
    fill(255, 255, 0, 150);
    rect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
  } else if (obs.type === 'rect') {
    fill(128);
    rect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
  } else if (obs.type === 'circle') {
    fill(128);
    ellipse(0, 0, obs.r * 2);
  } else if (obs.type === 'repulsion') {
    fill(255, 0, 0, 150);
    ellipse(0, 0, obs.r * 2);
  } else if (obs.type === 'speedUp') {
    fill(0, 255, 0, 150); // Green for speed up
    ellipse(0, 0, obs.r * 2);
  } else if (obs.type === 'slowDown') {
    fill(255, 0, 255, 150); // Purple for slow down
    ellipse(0, 0, obs.r * 2);
  }

  pop();
}

function drawCourseBoundaryCurves(points) {
    if (!points || points.length < 2) {
        if (points && points.length === 1) {
            fill(0);
            noStroke();
            ellipse(points[0].x, points[0].y, 10, 10);
        }
        return;
    }

    stroke(0);
    strokeWeight(3);
    noFill();

    beginShape();
    curveVertex(points[0].x, points[0].y); // Duplicate first point
    for (let i = 0; i < points.length; i++) {
        curveVertex(points[i].x, points[i].y);
    }
    curveVertex(points[points.length - 1].x, points[points.length - 1].y); // Duplicate last point

    let isClosed = false;
    if (points.length > 2) {
        let firstPoint = points[0];
        let lastPoint = points[points.length - 1];
        let d = dist(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y);
        if (d < 20) { // Adjust this threshold as needed
            isClosed = true;

            // Calculate average point for smooth closing
            let avgX = (firstPoint.x + lastPoint.x) / 2;
            let avgY = (firstPoint.y + lastPoint.y) / 2;
            curveVertex(avgX, avgY);

            endShape(CLOSE);
        } else {
            endShape();
        }
    } else {
        endShape();
    }

    if (isClosed) {
      fill(100, 200, 100); // Semi-transparent green

        stroke(0);
        strokeWeight(3);

        beginShape();
        curveVertex(points[0].x, points[0].y); // Duplicate first point
        for (let i = 0; i < points.length; i++) {
            curveVertex(points[i].x, points[i].y);
        }
        let avgX = (points[0].x + points[points.length - 1].x) / 2;
        let avgY = (points[0].y + points[points.length - 1].y) / 2;
        curveVertex(avgX, avgY);
        endShape(CLOSE);
    }
}

function drawHoleDesignMode(hole, selectedHole) {
  if (hole) {
    fill(0);
    noStroke();
    ellipse(hole.pos.x, hole.pos.y, hole.radius * 2);
    if (selectedHole) {
      stroke(255, 0, 0);
      strokeWeight(2);
      noFill();
      ellipse(hole.pos.x, hole.pos.y, hole.radius * 2 + 10);
    }
  }
}

function drawBallDesignMode(ball, selectedBall) {
  if (ball) {
    fill(255, 215, 0);
    noStroke();
    ellipse(ball.pos.x, ball.pos.y, ball.radius * 2);
    if (selectedBall) {
      stroke(255, 0, 0);
      strokeWeight(2);
      noFill();
      ellipse(ball.pos.x, ball.pos.y, ball.radius * 2 + 10);
    }
  }
}

function drawDesignUI() {
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT, TOP);
  text("Design mode", 20, 20);
  text("b:curve point,w:water,j:jump,o:circle, r:rectangle,p:repulse, <:slowDown, >:speedup, S:Save, L:Load, X:Del, 1/2:Scale, Q/E:Rotate, N:New, C:Clear, M:Mode, [:shift level back, ]:shift level forward  ", 20, 50);
  text("Drag ball/hole to move", 20, 80);
}

function drawBoundaryPointMarkers(boundaryPoints) {
  fill(255, 0, 0);
  noStroke();
  for (let i = 0; i < boundaryPoints.length; i++) {
    ellipse(boundaryPoints[i].x, boundaryPoints[i].y, 10);
  }
}
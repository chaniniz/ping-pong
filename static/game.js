const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const stageDisplay = document.getElementById('stage');
const killsDisplay = document.getElementById('kills');
const killsNeededDisplay = document.getElementById('killsNeeded');
const shieldStatus = document.getElementById('shieldStatus');
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');
const loginLinks = document.getElementById('loginLinks');
const messageEl = document.getElementById('message');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const muteBtn = document.getElementById('mute');

const username = localStorage.getItem('username');
if (username) {
    loginLinks.innerHTML = '<a href="#" id="logout">Logout</a>';
    document.getElementById('logout').addEventListener('click', function(e){
        e.preventDefault();
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    });
} else {
    loginLinks.innerHTML = '<a href="login.html">Login</a>';
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let muted = false;
function playTone(freq, dur){
    if(muted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

muteBtn.addEventListener('click', ()=>{
    muted = !muted;
    muteBtn.textContent = muted ? 'Unmute' : 'Mute';
});

let stage = 1;
if (username) {
    stage = parseInt(localStorage.getItem('stage_' + username) || '1', 10);
}
stageDisplay.textContent = stage;

let kills = 0;
let killsNeeded = stage * 5;
let lives = 3;
let score = 0;

let ship = { x: canvas.width / 2 - 15, y: canvas.height - 40, width: 30, height: 30 };
let bullets = [];
let enemies = [];
let powerUps = [];
let explosions = [];
let stars = [];
let keys = {};
let lastEnemyTime = 0;
let stageStart = Date.now();
const MIN_STAGE_TIME = 60000; // 1 minute per stage

let bulletSpeed = 5;
let bulletColor = 'yellow';
let bulletMode = 'single';
let bulletUpgradeTime = 0;
let shield = 0;

let overheat = 0;
const MAX_OVERHEAT = 100;
const OVERHEAT_DECAY = 0.3;
let canShoot = true;

let boss = null;
let messageTime = 0;

const enemyTypes = [
    {color:'red', width:30, height:30, health:1, speed:1, score:10},
    {color:'green', width:20, height:20, health:1, speed:1.5, score:15, sin:true},
    {color:'purple', width:40, height:40, health:3, speed:0.8, score:30}
];

for(let i=0;i<50;i++){
    stars.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:0.5+Math.random()*1.5});
}

document.addEventListener('keydown',e=>{keys[e.key]=true;});
document.addEventListener('keyup',e=>{keys[e.key]=false;});

function spawnEnemy(){
    if(stage % 5 === 0 && !boss){
        spawnBoss();
        return;
    }
    const r = Math.random();
    let type;
    if(r < 0.6) type = enemyTypes[0];
    else if(r < 0.9) type = enemyTypes[1];
    else type = enemyTypes[2];
    const x = Math.random() * (canvas.width - type.width);
    const speedY = type.speed + stage * 0.2;
    const speedX = (Math.random() - 0.5) * 2;
    const en = {type, x, y: -type.height, width: type.width, height: type.height, speedX, speedY, health: type.health};
    if(type.sin) en.phase = Math.random() * Math.PI * 2;
    enemies.push(en);
}

function spawnBoss(){
    const health = 20 + stage * 5;
    boss = {x: canvas.width/2 - 40, y: -100, width: 80, height: 80, health, maxHealth: health, entered: false};
    playTone(100, 0.5);
}

function spawnPowerUp(x, y){
    const r = Math.random();
    let type = 'shield';
    if(r < 0.33) type = 'shield';
    else if(r < 0.66) type = 'rapid';
    else type = 'spread';
    powerUps.push({x, y, width:20, height:20, type});
}

function collide(a,b){
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
}

function addExplosion(x,y){
    explosions.push({x, y, r:2, l:20});
}

function fireBullet(){
    if(bulletMode === 'spread'){
        bullets.push({x: ship.x + ship.width/2 - 2, y: ship.y, dx: 0});
        bullets.push({x: ship.x + ship.width/2 - 2, y: ship.y, dx: -1});
        bullets.push({x: ship.x + ship.width/2 - 2, y: ship.y, dx: 1});
    } else {
        bullets.push({x: ship.x + ship.width/2 - 2, y: ship.y, dx: 0});
    }
    playTone(400, 0.05);
}

function hitPlayer(){
    lives--;
    addExplosion(ship.x + ship.width/2, ship.y + ship.height/2);
    playTone(200, 0.2);
    if(lives <= 0){
        gameOver();
    }
}

function update(){
    if (keys['ArrowLeft']) ship.x -= 5;
    if (keys['ArrowRight']) ship.x += 5;
    if (keys['ArrowUp']) ship.y -= 5;
    if (keys['ArrowDown']) ship.y += 5;
    ship.x = Math.max(0, Math.min(canvas.width - ship.width, ship.x));
    ship.y = Math.max(0, Math.min(canvas.height - ship.height, ship.y));

    overheat = Math.max(0, overheat - OVERHEAT_DECAY);
    if (keys[' '] && canShoot && overheat < MAX_OVERHEAT) {
        fireBullet();
        overheat += bulletMode === 'rapid' ? 5 : 10;
        if (overheat >= MAX_OVERHEAT) canShoot = false;
    }
    if (!canShoot && overheat <= MAX_OVERHEAT/2) canShoot = true;

    bullets.forEach(b => {
        b.y -= bulletSpeed;
        b.x += b.dx || 0;
    });
    bullets = bullets.filter(b => b.y > -10 && b.x > -10 && b.x < canvas.width + 10);

    if (Date.now() - lastEnemyTime > Math.max(1000 - stage*50, 300) && !boss) {
        spawnEnemy();
        lastEnemyTime = Date.now();
    }

    enemies.forEach(en => {
        en.y += en.speedY;
        if(en.type.sin){
            en.x += Math.sin(Date.now()/300 + en.phase) * 2;
        } else {
            en.x += en.speedX;
            if(en.x < 0 || en.x > canvas.width - en.width) en.speedX *= -1;
        }
    });
    enemies = enemies.filter(en => en.y < canvas.height + 30 && en.health > 0);

    if(boss){
        if(!boss.entered){
            boss.y += 1;
            if(boss.y >= 50) boss.entered = true;
        } else {
            boss.x += Math.sin(Date.now()/500) * 2;
        }
    }

    powerUps.forEach(p => p.y += 2);
    powerUps = powerUps.filter(p => p.y < canvas.height + 20);

    stars.forEach(s => {
        s.y += s.speed;
        if(s.y > canvas.height){
            s.y = 0; s.x = Math.random()*canvas.width;
        }
    });

    explosions.forEach(ex => { ex.r += 2; ex.l--; });
    explosions = explosions.filter(ex => ex.l > 0);

    bullets.forEach(b => {
        enemies.forEach(en => {
            if(collide(b,en)){
                en.health--;
                b.remove = true;
                if(en.health <= 0){
                    addExplosion(en.x+en.width/2, en.y+en.height/2);
                    score += en.type.score;
                    kills++;
                    if(Math.random() < 0.2) spawnPowerUp(en.x, en.y);
                }
            }
        });
        if(boss && collide(b,boss)){
            boss.health--;
            b.remove = true;
            if(boss.health <= 0){
                addExplosion(boss.x+boss.width/2, boss.y+boss.height/2);
                score += 200;
                boss = null;
                nextStage();
            }
        }
    });
    bullets = bullets.filter(b => !b.remove);

    enemies.forEach(en => {
        if(collide(ship,en)){
            en.health = 0;
            if(shield > 0){
                shield = 0;
            } else {
                hitPlayer();
            }
        }
    });
    if(boss && collide(ship,boss)){
        if(shield > 0){
            shield = 0;
        } else {
            hitPlayer();
        }
    }

    powerUps.forEach((p,idx) => {
        if(collide(ship,p)){
            score += 50;
            if(p.type === 'shield'){ shield = 300; }
            else if(p.type === 'rapid'){ bulletMode = 'rapid'; bulletUpgradeTime = 600; bulletSpeed = 8; }
            else if(p.type === 'spread'){ bulletMode = 'spread'; bulletUpgradeTime = 600; }
            powerUps.splice(idx,1);
            playTone(600,0.1);
        }
    });

    if(bulletUpgradeTime > 0){
        bulletUpgradeTime--;
        if(bulletUpgradeTime === 0){
            bulletMode = 'single';
            bulletSpeed = 5;
        }
    }

    if(shield > 0) shield--;

    shieldStatus.textContent = shield > 0 ? 'ON' : 'OFF';
    livesDisplay.textContent = lives;
    scoreDisplay.textContent = score;
    killsDisplay.textContent = kills;
    killsNeededDisplay.textContent = killsNeeded;

    if(messageTime > 0){
        messageTime--;
        if(messageTime === 0) messageEl.style.display = 'none';
    }

    if(kills >= killsNeeded && Date.now() - stageStart >= MIN_STAGE_TIME && !boss){
        nextStage();
    }
}

function draw(){
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    stars.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));

    ctx.fillStyle = shield > 0 ? 'cyan' : 'white';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

    ctx.fillStyle = bulletColor;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

    enemies.forEach(en => {
        ctx.fillStyle = en.type.color;
        ctx.fillRect(en.x, en.y, en.width, en.height);
    });

    powerUps.forEach(p => {
        ctx.fillStyle = p.type === 'shield' ? 'orange' : (p.type === 'rapid' ? 'green' : 'purple');
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    explosions.forEach(ex => {
        ctx.strokeStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2);
        ctx.stroke();
    });

    if(boss){
        ctx.fillStyle = 'blue';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(10,10,100,5);
        ctx.fillStyle = 'red';
        ctx.fillRect(10,10,100*(boss.health/boss.maxHealth),5);
    }

    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, canvas.height - 15, 100, 5);
    ctx.fillStyle = 'orange';
    ctx.fillRect(10, canvas.height - 15, overheat, 5);
}

let anim;
function gameLoop(){
    update();
    draw();
    if(lives > 0){
        anim = requestAnimationFrame(gameLoop);
    }
}

function nextStage(){
    stage += 1;
    if (stage > 10) stage = 1;
    stageDisplay.textContent = stage;
    stageStart = Date.now();
    kills = 0;
    killsNeeded = stage * 5;
    bullets = [];
    enemies = [];
    powerUps = [];
    boss = null;
    messageEl.textContent = 'Stage ' + stage + ' Start!';
    messageEl.style.display = 'block';
    messageTime = 120;
    if (username) {
        localStorage.setItem('stage_' + username, stage);
    }
}

function gameOver(){
    finalScoreEl.textContent = score;
    gameOverEl.style.display = 'block';
}

document.getElementById('restart').addEventListener('click', restartGame);

function restartGame(){
    gameOverEl.style.display = 'none';
    stage = 1;
    kills = 0;
    killsNeeded = stage * 5;
    lives = 3;
    score = 0;
    bullets = [];
    enemies = [];
    powerUps = [];
    explosions = [];
    boss = null;
    shield = 0;
    overheat = 0;
    stageStart = Date.now();
    stageDisplay.textContent = stage;
    killsDisplay.textContent = kills;
    killsNeededDisplay.textContent = killsNeeded;
    livesDisplay.textContent = lives;
    scoreDisplay.textContent = score;
    if (username) {
        localStorage.setItem('stage_' + username, stage);
    }
    anim = requestAnimationFrame(gameLoop);
}

killsDisplay.textContent = kills;
killsNeededDisplay.textContent = killsNeeded;
livesDisplay.textContent = lives;
scoreDisplay.textContent = score;
anim = requestAnimationFrame(gameLoop);

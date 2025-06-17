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

// ------- Stage configuration -------
const stageData = [
  {
    stage: 1,
    name: 'Boot Camp',
    background: 'stars_slow',
    enemyTypes: ['basic'],
    enemyPatterns: ['straight'],
    powerUps: [],
    music: 'light_theme.mp3',
    hazards: [],
    introText: 'Welcome to the battlefield!',
    boss: null
  },
  {
    stage: 2,
    name: 'Frontier',
    background: 'stars_fast',
    enemyTypes: ['basic','fast'],
    enemyPatterns: ['straight','wave'],
    powerUps: ['rapid'],
    music: 'stage2_theme.mp3',
    hazards: [],
    introText: 'Enemies are getting faster!',
    boss: null
  },
  {
    stage: 3,
    name: 'Asteroid Field',
    background: 'static_dark',
    enemyTypes: ['fast'],
    enemyPatterns: ['zigzag'],
    powerUps: ['shield'],
    music: 'stage3_theme.mp3',
    hazards: ['meteor'],
    introText: 'Watch out for asteroids!',
    boss: null
  },
  {
    stage: 4,
    name: 'Ambush',
    background: 'stars_fast',
    enemyTypes: ['basic','tough'],
    enemyPatterns: ['straight','sine'],
    powerUps: ['spread'],
    music: 'stage4_theme.mp3',
    hazards: [],
    introText: 'They are everywhere!',
    boss: null
  },
  {
    stage: 5,
    name: 'The Watcher',
    background: 'static_dark',
    enemyTypes: [],
    enemyPatterns: [],
    powerUps: ['shield','speedBullet'],
    music: 'boss_theme_1.mp3',
    hazards: [],
    introText: 'Warning: Boss approaching!',
    boss: {
      name: 'The Watcher',
      health: 300,
      phases: [
        { pattern: 'laser_spread', duration: 10 },
        { pattern: 'wave_shot', duration: 15 }
      ]
    }
  },
  {
    stage: 6,
    name: 'Deep Space',
    background: 'stars_blue',
    enemyTypes: ['fast','tough'],
    enemyPatterns: ['sine','wave'],
    powerUps: ['rapid'],
    music: 'stage6_theme.mp3',
    hazards: [],
    introText: 'Press on into the void.',
    boss: null
  },
  {
    stage: 7,
    name: 'Nebula Drift',
    background: 'static_blue',
    enemyTypes: ['basic','fast'],
    enemyPatterns: ['zigzag','wave'],
    powerUps: ['shield'],
    music: 'stage7_theme.mp3',
    hazards: ['meteor'],
    introText: 'Visibility is low...',
    boss: null
  },
  {
    stage: 8,
    name: 'Fleet Onslaught',
    background: 'stars_fast',
    enemyTypes: ['fast','tough'],
    enemyPatterns: ['sine','zigzag'],
    powerUps: ['rapid','spread'],
    music: 'stage8_theme.mp3',
    hazards: [],
    introText: 'The battle rages on!',
    boss: null
  },
  {
    stage: 9,
    name: 'Dark Horizon',
    background: 'static_dark',
    enemyTypes: ['tough'],
    enemyPatterns: ['wave'],
    powerUps: ['shield','rapid'],
    music: 'stage9_theme.mp3',
    hazards: ['meteor'],
    introText: 'Almost there...',
    boss: null
  },
  {
    stage: 10,
    name: 'Final Showdown',
    background: 'stars_fast',
    enemyTypes: [],
    enemyPatterns: [],
    powerUps: ['shield','spread'],
    music: 'boss_theme_final.mp3',
    hazards: [],
    introText: 'The last enemy awaits!',
    boss: {
      name: 'Overlord',
      health: 500,
      phases: [
        { pattern: 'laser_spread', duration: 10 },
        { pattern: 'wave_shot', duration: 15 },
        { pattern: 'charge', duration: 20 }
      ]
    }
  }
];


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

let allowedPowerUps = [];
let backgroundType = 'stars';
let backgroundColor = 'black';
let starBaseSpeed = 1;
let hazards = [];
let lastHazardTime = 0;

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

// enemy type definitions
const enemyTypeDefs = {
    basic: {color:'red', width:30, height:30, health:1, speed:1, score:10},
    fast: {color:'green', width:20, height:20, health:1, speed:1.5, score:15, sin:true},
    tough: {color:'purple', width:40, height:40, health:3, speed:0.8, score:30}
};

for(let i=0;i<50;i++){
    stars.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:(0.5+Math.random()*1.5)});
}

document.addEventListener('keydown',e=>{keys[e.key]=true;});
document.addEventListener('keyup',e=>{keys[e.key]=false;});

function setBackground(bg){
    backgroundType = bg.indexOf('stars') === 0 ? 'stars' : 'static';
    backgroundColor = bg.includes('blue') ? '#001133' : 'black';
    starBaseSpeed = 1;
    if(bg === 'stars_fast') starBaseSpeed = 2;
    else if(bg === 'stars_slow') starBaseSpeed = 0.5;
    stars = [];
    for(let i=0;i<50;i++){
        stars.push({x:Math.random()*canvas.width, y:Math.random()*canvas.height, speed:(0.5+Math.random())*starBaseSpeed});
    }
}

function setMusic(m){ /* placeholder */ }

function showIntroText(text){
    if(text){
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        messageTime = 120;
    }
}

function spawnEnemy(){
    const cfg = stageData[stage-1];
    if(cfg.boss && kills >= killsNeeded && !boss){
        startBossFight(cfg.boss);
        return;
    }
    if(cfg.enemyTypes.length === 0) return;
    const typeName = cfg.enemyTypes[Math.floor(Math.random()*cfg.enemyTypes.length)];
    const pattern = cfg.enemyPatterns[Math.floor(Math.random()*cfg.enemyPatterns.length)] || 'straight';
    const def = enemyTypeDefs[typeName] || enemyTypeDefs.basic;
    const x = Math.random() * (canvas.width - def.width);
    const en = {type:def, x, y:-def.height, width:def.width, height:def.height, pattern, health:def.health, phase:Math.random()*Math.PI*2, speedY:def.speed + stage*0.2, speedX: (Math.random()-0.5)*2, dir: 1};
    enemies.push(en);
}

function startBossFight(cfg){
    boss = {x: canvas.width/2 - 40, y: -100, width: 80, height: 80, health: cfg.health, maxHealth: cfg.health, entered:false, phases: cfg.phases, phaseIndex:0, phaseTime:0};
    playTone(100,0.5);
}

function spawnPowerUp(x, y){
    if(allowedPowerUps.length === 0) return;
    const type = allowedPowerUps[Math.floor(Math.random()*allowedPowerUps.length)];
    powerUps.push({x, y, width:20, height:20, type});
}

function spawnHazard(){
    const x = Math.random() * (canvas.width - 20);
    hazards.push({x, y:-20, width:20, height:20, speedY:2});
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
    const cfg = stageData[stage-1];
    if(cfg.hazards.includes('meteor') && Date.now()-lastHazardTime > 2000){
        spawnHazard();
        lastHazardTime = Date.now();
    }

    enemies.forEach(en => {
        en.y += en.speedY;
        if(en.pattern === 'sine' || en.pattern === 'wave'){
            en.x += Math.sin(Date.now()/300 + en.phase) * 2;
        } else if(en.pattern === 'zigzag'){
            en.x += en.dir * 2;
            if(en.x < 0 || en.x > canvas.width - en.width) en.dir *= -1;
        } else {
            en.x += en.speedX;
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

    hazards.forEach(h => h.y += h.speedY);
    hazards = hazards.filter(h => h.y < canvas.height + 20);

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
    hazards.forEach(h => {
        if(collide(ship,h)){
            if(shield > 0){
                shield = 0;
            } else {
                hitPlayer();
            }
            h.y = canvas.height + 30;
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
            else if(p.type === 'speedBullet'){ bulletMode = 'single'; bulletUpgradeTime = 600; bulletSpeed = 10; }
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
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0,0,canvas.width, canvas.height);

    if(backgroundType === 'stars'){
        ctx.fillStyle = 'white';
        stars.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));
    }

    ctx.fillStyle = shield > 0 ? 'cyan' : 'white';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);

    ctx.fillStyle = bulletColor;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

    enemies.forEach(en => {
        ctx.fillStyle = en.type.color;
        ctx.fillRect(en.x, en.y, en.width, en.height);
    });

    ctx.fillStyle = 'gray';
    hazards.forEach(h => ctx.fillRect(h.x, h.y, h.width, h.height));

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

function loadStage(num){
    stage = num;
    const cfg = stageData[stage-1];
    stageDisplay.textContent = stage;
    stageStart = Date.now();
    kills = 0;
    killsNeeded = stage * 5;
    killsDisplay.textContent = kills;
    killsNeededDisplay.textContent = killsNeeded;
    livesDisplay.textContent = lives;
    scoreDisplay.textContent = score;
    bullets = [];
    enemies = [];
    powerUps = [];
    hazards = [];
    boss = null;
    allowedPowerUps = cfg.powerUps.slice();
    setBackground(cfg.background);
    setMusic(cfg.music);
    showIntroText(cfg.introText || ('Stage '+stage));
    if (username) {
        localStorage.setItem('stage_' + username, stage);
    }
}

function nextStage(){
    let next = stage + 1;
    if(next > stageData.length) next = 1;
    loadStage(next);
}

function gameOver(){
    finalScoreEl.textContent = score;
    gameOverEl.style.display = 'block';
}

document.getElementById('restart').addEventListener('click', restartGame);

function restartGame(){
    gameOverEl.style.display = 'none';
    lives = 3;
    score = 0;
    bullets = [];
    enemies = [];
    powerUps = [];
    explosions = [];
    boss = null;
    shield = 0;
    overheat = 0;
    loadStage(1);
    livesDisplay.textContent = lives;
    scoreDisplay.textContent = score;
    anim = requestAnimationFrame(gameLoop);
}

loadStage(stage);
anim = requestAnimationFrame(gameLoop);

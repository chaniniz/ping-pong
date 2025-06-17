const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageDisplay = document.getElementById('stage');
const killsDisplay = document.getElementById('kills');
const killsNeededDisplay = document.getElementById('killsNeeded');
const loginLinks = document.getElementById('loginLinks');

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

let stage = 1;
if (username) {
    stage = parseInt(localStorage.getItem('stage_' + username) || '1', 10);
}
stageDisplay.textContent = stage;

let kills = 0;
let killsNeeded = stage * 5;
let ship = { x: canvas.width / 2 - 15, y: canvas.height - 40, width: 30, height: 30 };
let bullets = [];
let enemies = [];
let powerUps = [];
let stars = [];
let keys = {};
let lastEnemyTime = 0;
let stageStart = Date.now();
const MIN_STAGE_TIME = 180000; // 3 minutes

let bulletSpeed = 5;
let bulletColor = 'yellow';
let bulletUpgradeTime = 0;
let shield = 0;

let overheat = 0;
const MAX_OVERHEAT = 100;
const OVERHEAT_DECAY = 0.3;
let canShoot = true;

const enemySpeed = 1;

for(let i=0;i<50;i++) {
    stars.push({x: Math.random()*canvas.width, y: Math.random()*canvas.height, speed: 0.5 + Math.random()*1.5});
}

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function spawnEnemy() {
    const x = Math.random() * (canvas.width - 30);
    const speedY = enemySpeed + Math.random()*stage*0.3;
    const speedX = (Math.random() - 0.5) * 2;
    enemies.push({ x, y: -30, width: 30, height: 30, speedX, speedY });
}

function spawnPowerUp(x, y){
    const type = Math.random() < 0.5 ? 'shield' : 'rapid';
    powerUps.push({x, y, width: 20, height: 20, type});
}

function collide(a,b){
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
}

function update(){
    // ship movement
    if (keys['ArrowLeft']) ship.x -= 5;
    if (keys['ArrowRight']) ship.x += 5;
    if (keys['ArrowUp']) ship.y -= 5;
    if (keys['ArrowDown']) ship.y += 5;
    ship.x = Math.max(0, Math.min(canvas.width - ship.width, ship.x));
    ship.y = Math.max(0, Math.min(canvas.height - ship.height, ship.y));

    // shooting with overheat
    overheat = Math.max(0, overheat - OVERHEAT_DECAY);
    if (keys[' '] && canShoot && overheat < MAX_OVERHEAT) {
        bullets.push({ x: ship.x + ship.width/2 - 2, y: ship.y });
        overheat += 10;
        if (overheat >= MAX_OVERHEAT) canShoot = false;
    }
    if (!canShoot && overheat <= MAX_OVERHEAT/2) canShoot = true;

    // update bullets
    bullets.forEach(b => b.y -= bulletSpeed);
    bullets = bullets.filter(b => b.y > -10);

    // spawn enemies
    if (Date.now() - lastEnemyTime > Math.max(1000 - stage*50, 200)) {
        spawnEnemy();
        lastEnemyTime = Date.now();
    }

    // move enemies
    enemies.forEach(en => {
        en.y += en.speedY;
        en.x += en.speedX;
        if(en.x < 0 || en.x > canvas.width - en.width) en.speedX *= -1;
    });
    enemies = enemies.filter(en => en.y < canvas.height + 30);

    // stars
    stars.forEach(s => {
        s.y += s.speed;
        if(s.y > canvas.height){
            s.y = 0; s.x = Math.random()*canvas.width;
        }
    });

    // powerUps
    powerUps.forEach(p => p.y += 2);
    powerUps = powerUps.filter(p => p.y < canvas.height + 20);

    // collisions bullets/enemies
    bullets.forEach(b => {
        enemies.forEach((en, idx) => {
            if (b.x < en.x + en.width && b.x + 4 > en.x && b.y < en.y + en.height && b.y + 10 > en.y) {
                if(Math.random() < 0.1) spawnPowerUp(en.x, en.y);
                enemies.splice(idx, 1);
                b.remove = true;
                kills += 1;
                killsDisplay.textContent = kills;
            }
        });
    });
    bullets = bullets.filter(b => !b.remove);

    // ship & powerups
    powerUps.forEach((p,idx) => {
        if(collide(ship,p)){
            if(p.type === 'shield') {
                shield = 300;
            } else {
                bulletUpgradeTime = 300;
                bulletSpeed = 8;
                bulletColor = 'cyan';
            }
            powerUps.splice(idx,1);
        }
    });

    if(bulletUpgradeTime > 0){
        bulletUpgradeTime--;
        if(bulletUpgradeTime === 0){
            bulletSpeed = 5;
            bulletColor = 'yellow';
        }
    }

    if(shield > 0) shield--;
    document.getElementById('shieldStatus').textContent = shield > 0 ? 'ON' : 'OFF';

    // check level timer and kill requirement
    if (kills >= killsNeeded && Date.now() - stageStart >= MIN_STAGE_TIME) {
        nextStage();
    }
}

function draw(){
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    // stars
    ctx.fillStyle = 'white';
    stars.forEach(s => ctx.fillRect(s.x, s.y, 2, 2));

    // ship
    ctx.fillStyle = shield > 0 ? 'cyan' : 'white';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);
    // bullets
    ctx.fillStyle = bulletColor;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));
    // enemies
    ctx.fillStyle = 'red';
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.width, en.height));
    // powerUps
    powerUps.forEach(p => {
        ctx.fillStyle = p.type === 'shield' ? 'orange' : 'green';
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // overheat bar
    ctx.strokeStyle = 'white';
    ctx.strokeRect(10, canvas.height - 15, 100, 5);
    ctx.fillStyle = 'orange';
    ctx.fillRect(10, canvas.height - 15, overheat, 5);
}

function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}

function nextStage(){
    stage += 1;
    if (stage > 10) {
        alert('You beat the game!');
        stage = 1;
    }
    stageDisplay.textContent = stage;
    stageStart = Date.now();
    kills = 0;
    killsNeeded = stage * 5;
    killsDisplay.textContent = kills;
    killsNeededDisplay.textContent = killsNeeded;
    bullets = [];
    enemies = [];
    powerUps = [];
    if (username) {
        localStorage.setItem('stage_' + username, stage);
    }
}

killsDisplay.textContent = kills;
killsNeededDisplay.textContent = killsNeeded;
loop();

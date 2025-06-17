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
let keys = {};
let lastEnemyTime = 0;
let stageStart = Date.now();
const MIN_STAGE_TIME = 180000; // 3 minutes

const bulletSpeed = 5;
const enemySpeed = 1;

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function spawnEnemy() {
    const x = Math.random() * (canvas.width - 30);
    enemies.push({ x, y: -30, width: 30, height: 30 });
}

function update(dt) {
    // move ship
    if (keys['ArrowLeft']) ship.x -= 5;
    if (keys['ArrowRight']) ship.x += 5;
    if (keys[' ']) bullets.push({ x: ship.x + ship.width/2 - 2, y: ship.y });

    // keep ship in bounds
    ship.x = Math.max(0, Math.min(canvas.width - ship.width, ship.x));

    // update bullets
    bullets.forEach(b => b.y -= bulletSpeed);
    bullets = bullets.filter(b => b.y > -10);

    // spawn enemies
    if (Date.now() - lastEnemyTime > Math.max(1000 - stage*50, 200)) {
        spawnEnemy();
        lastEnemyTime = Date.now();
    }

    // move enemies
    enemies.forEach(en => en.y += enemySpeed + stage*0.2);
    enemies = enemies.filter(en => en.y < canvas.height + 30);

    // collisions
    bullets.forEach(b => {
        enemies.forEach((en, idx) => {
            if (b.x < en.x + en.width && b.x + 4 > en.x && b.y < en.y + en.height && b.y + 10 > en.y) {
                enemies.splice(idx, 1);
                b.remove = true;
                kills += 1;
                killsDisplay.textContent = kills;
            }
        });
    });
    bullets = bullets.filter(b => !b.remove);

    // check level timer and kill requirement
    if (kills >= killsNeeded && Date.now() - stageStart >= MIN_STAGE_TIME) {
        nextStage();
    }
}

function draw() {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(ship.x, ship.y, ship.width, ship.height);
    ctx.fillStyle = 'yellow';
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));
    ctx.fillStyle = 'red';
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.width, en.height));
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function nextStage() {
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
    if (username) {
        localStorage.setItem('stage_' + username, stage);
    }
}

killsDisplay.textContent = kills;
killsNeededDisplay.textContent = killsNeeded;
loop();

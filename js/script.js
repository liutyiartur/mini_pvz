let waveStage = 1;
let totalZombies = 30;
let zombiesSpawned = 0;
let spawnDelay = 120;
let mowers = [];

const resultEl = document.getElementById("result");
const sunEl = document.getElementById("sun");

const c = document.getElementById("c"), ctx = c.getContext("2d");
const rows = 3, cols = 7;
const cellW = c.width / cols, cellH = c.height / rows;

let sun = 100, plants = [], zombies = [], bullets = [], sunsArr = [];
let selectedPlant = null, shovel = false;
let gameStarted = false, gameOver = false, tick = 0;

const zombiePool = [];
const PLANTS = {
    pea: {cost: 50, hp: 3, cd: 60},
    sun: {cost: 25, hp: 3, cd: 600},
    nut: {cost: 25, hp: 22}
};

const sounds = {
    shoot: new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg"),
    sun: new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"),
    hit: new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"),
    lose: new Audio("https://actions.google.com/sounds/v1/cartoon/slide_whistle_to_drum_hit.ogg")
};

function playSound(name) {
    if (!sounds[name]) return;
    sounds[name].currentTime = 0;
    sounds[name].play();
}

function startGame() {
    document.getElementById("menu").style.display = "none";
    document.getElementById("panel").style.display = "block";
    c.style.display = "block";
    gameStarted = true;

    mowers = [];
    for (let r = 0; r < rows; r++) {
        mowers.push({
            row: r,
            x: 0,
            active: false,
            used: false
        });
    }

    prepareZombies();

    Object.values(sounds).forEach(s => s.play().then(() => s.pause()).catch(() => {
    }));
}

function resetSelection() {
    clearActive();
    selectedPlant = null;
    shovel = false;
}

function clearActive() {
    document.querySelectorAll("#panel button").forEach(b => {
        b.classList.remove("active");
    });
}

function selectPlant(type, btn) {
    clearActive();
    btn.classList.add("active");

    selectedPlant = type;
    shovel = false;
}

function selectShovel(btn) {
    clearActive();
    btn.classList.add("active");

    shovel = true;
    selectedPlant = null;
}

c.onclick = e => {
    if (!gameStarted || gameOver) return;

    const r = c.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const col = Math.floor(x / cellW), row = Math.floor(y / cellH);

    sunsArr.forEach((s, i) => {
        if (Math.hypot(s.x - x, s.y - y) < 15) {
            sun += 25;
            playSound("sun");
            sunsArr.splice(i, 1);
        }
    });

    if (shovel) {
        const i = plants.findIndex(p => p.row === row && p.col === col);
        if (i !== -1) {
            plants.splice(i, 1);
            resetSelection();
        }
        return;
    }

    if (!selectedPlant) return;
    if (plants.some(p => p.row === row && p.col === col)) return;
    if (sun < PLANTS[selectedPlant].cost) return;

    plants.push({row, col, type: selectedPlant, hp: PLANTS[selectedPlant].hp, cd: PLANTS[selectedPlant].cd});
    sun -= PLANTS[selectedPlant].cost;

    resetSelection();
};

function spawnZombie() {

    if (zombiePool.length === 0) return;

    const type = zombiePool.shift();

    let hp = 5;
    if (type === "cone") hp = 18;
    if (type === "bucket") hp = 25;

    zombies.push({
        row: Math.floor(Math.random() * rows),
        x: c.width + 20,
        hp,
        type,
        eat: false,
        target: null
    });

    zombiesSpawned++;
}

function prepareZombies() {

    zombiePool.length = 0;

    const normalCount = Math.floor(totalZombies * 0.66);
    const coneCount = Math.floor(totalZombies * 0.28);
    const bucketCount = Math.max(2, Math.floor(totalZombies * 0.06)); // максимум 6%

    const stage1Count = Math.floor(totalZombies * 0.33);
    const stage2Count = Math.floor(totalZombies * 0.33);
    const stage3Count = totalZombies - stage1Count - stage2Count;

    // ЭТАП 1 — только normal
    for (let i = 0; i < stage1Count; i++)
        zombiePool.push("normal");

    // ЭТАП 2 — normal + немного cone
    for (let i = 0; i < stage2Count; i++) {
        if (i % 3 === 0 && coneCount > 0) {
            zombiePool.push("cone");
        } else {
            zombiePool.push("normal");
        }
    }

    // ЭТАП 3 — всё вперемешку
    for (let i = 0; i < stage3Count; i++) {

        if (bucketCount > 0 && i % 6 === 0) {
            zombiePool.push("bucket");
        } else if (i % 2 === 0 && coneCount > 0) {
            zombiePool.push("cone");
        } else {
            zombiePool.push("normal");
        }
    }
}

function update() {
    if (!gameStarted || gameOver) return;
    tick++;

    if (zombiesSpawned < totalZombies) {
        const delays = [0, 180, 120, 60];
        spawnDelay = delays[waveStage] || 180;

        if (tick % spawnDelay === 0)
            spawnZombie();
    }

    if (tick % 400 === 0) {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * rows);
        sunsArr.push({x: col * cellW + cellW / 2, y: -20, targetY: row * cellH + cellH * 0.65});
    }

    plants.forEach(p => {
        if (p.type === "sun" && --p.cd <= 0) {
            sunsArr.push({x: p.col * cellW + cellW / 2, y: p.row * cellH, targetY: p.row * cellH + cellH * 0.65});
            p.cd = PLANTS.sun.cd;
        }
        if (p.type === "pea") {
            const zombieAhead = zombies.some(z => z.row === p.row && z.x > p.col * cellW);
            if (zombieAhead && --p.cd <= 0) {
                bullets.push({x: p.col * cellW + cellW * 0.7, row: p.row});
                playSound("shoot");
                p.cd = PLANTS.pea.cd;
            }
        }
    });

    bullets.forEach(b => b.x += 5);
    sunsArr.forEach(s => {
        if (s.y < s.targetY) s.y += 0.8;
    });

    for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];

        if (z.eat) {
            if (z.target && plants.includes(z.target)) {
                z.target.hp -= 0.03;

                if (z.target.hp <= 0) {
                    plants.splice(plants.indexOf(z.target), 1);
                    z.eat = false;
                    z.target = null;
                }
            } else {
                z.eat = false;
                z.target = null;
            }
        } else {
            z.x -= 0.35;

            const plantInFront = plants.find(p => {
                const px = p.col * cellW + cellW / 2;
                return p.row === z.row && Math.abs(z.x - px) < 18;
            });

            if (plantInFront) {
                z.eat = true;
                z.target = plantInFront;
            }
        }

        if (z.x <= 5) {
            const mower = mowers[z.row];

            if (mower && !mower.used) {
                mower.active = true;
                mower.used = true;

                zombies.splice(i, 1);
                continue;
            } else {

                gameOver = true;
                playSound("lose");
                resultEl.innerText = "Ты проиграл!";
                resultEl.style.color = "red";
                break;
            }
        }
    }

    mowers.forEach(m => {
        if (m.active) {
            m.x += 6;

            for (let i = zombies.length - 1; i >= 0; i--) {
                if (zombies[i].row === m.row && zombies[i].x < m.x + 40) {
                    zombies.splice(i, 1);
                }
            }

            if (m.x > c.width) {
                m.active = false;
            }
        }
    });

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];

        for (let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];

            if (z.row === b.row && Math.abs(z.x - b.x) < 14) {
                z.hp--;
                playSound("hit");
                bullets.splice(i, 1);

                if (z.hp <= 0) zombies.splice(j, 1);
                break;
            }
        }
    }

    if (zombiesSpawned >= totalZombies && zombies.length === 0) {
        gameOver = true;
        resultEl.innerText = "ПОБЕДА 🏆";
        resultEl.style.color = "green";
    }

    if (zombiesSpawned > totalZombies * 0.33)
        waveStage = 2;

    if (zombiesSpawned > totalZombies * 0.66)
        waveStage = 3;
}

function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#5fa35f";

    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(c.width, i * cellH);
        ctx.stroke();
    }
    for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, c.height);
        ctx.stroke();
    }

    plants.forEach(p => {
        const cx = p.col * cellW + cellW / 2, cy = p.row * cellH + cellH / 2;
        if (p.type === "pea") {
            ctx.fillStyle = "#2f8f2f";
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        if (p.type === "sun") {
            ctx.fillStyle = "#ffd93b";
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#8b5a2b";
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        if (p.type === "nut") {
            ctx.fillStyle = "#8b5a2b";
            ctx.fillRect(cx - 16, cy - 16, 32, 32);
        }
    });

    zombies.forEach(z => {
        const zy = z.row * cellH + cellH / 2;
        if (z.type === "normal") ctx.fillStyle = "#777";
        if (z.type === "cone") ctx.fillStyle = "#ff9800";
        if (z.type === "bucket") ctx.fillStyle = "#e60101";
        ctx.beginPath();
        ctx.arc(z.x, zy, 18, 0, Math.PI * 2);
        ctx.fill();
    });

    bullets.forEach(b => {
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(b.x, b.row * cellH + cellH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    sunsArr.forEach(s => {
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
        ctx.fill();
    });

    sunEl.innerText = "Солнца: " + sun;

    mowers.forEach(m => {
        if (!m.used || m.active) {
            const y = m.row * cellH + cellH / 2;

            ctx.fillStyle = m.active ? "#d32f2f" : "#555";
            ctx.fillRect(m.x, y - 15, 30, 30);
        }
    });
}

(function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
})();

// Canvas and game variables
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 600;
canvas.height = 600;

let players = [];
let enemy;
let items = [];
let specialItems = [];
let timer = 90;
let gameInterval;
let record = sessionStorage.getItem("record") || 0;

// Laberinto (1 = pared, 0 = camino)
const maze = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const cellSize = canvas.width / maze[0].length; // Tamaño de cada celda

const player1Img = new Image();
player1Img.src = "img/goku.png";
const player2Img = new Image();
player2Img.src = "img/vegeta.png";
const enemyImg = new Image();
enemyImg.src = "img/freezer.png";
const itemImg = new Image();
itemImg.src = "img/item.png";
const specialItemImg = new Image();
specialItemImg.src = "img/bola.png";

const bgMusic = new Audio("music/fondo.mp3");

// Game setup
function startGame(playerCount) {
    players = [];
    items = [];
    specialItems = [];

    // Add players
    players.push(new Player(50, 50, player1Img, "Jugador 1", { up: "w", left: "a", down: "s", right: "d" }));
    if (playerCount === 2) {
        players.push(new Player(150, 150, player2Img, "Jugador 2", { up: "i", left: "j", down: "k", right: "l" }));
    }

    // Add enemy
    enemy = new Enemy();

    // Add items
    for (let i = 0; i < 100; i++) items.push(new Item(false));
    for (let i = 0; i < 7; i++) specialItems.push(new Item(true));

    // Start game
    timer = 50;
    bgMusic.loop = true;
    bgMusic.play();
    gameInterval = setInterval(updateGame, 1000 / 60);
    setInterval(() => {
        if (--timer <= 0) endGame();
        document.getElementById("timer").textContent = `Tiempo restante: ${timer}s`;
    }, 1000);

    updateScores();
}

function endGame() {
    clearInterval(gameInterval);
    bgMusic.pause();

    //const endMusic = new Audio("music/end.mp3");
    //endMusic.play();
    //endMusic.loop = false;

    // Determine winner
    let winner = players.reduce((max, player) => (player.score > max.score ? player : max), { score: -Infinity });
    let end = "img/end.gif";
    // Update modal
    document.getElementById("winnerText").textContent = `¡Ganador: ${winner.name} con ${winner.score} puntos!`;
    document.getElementById("finish").src = end;
    document.getElementById("gameModal").classList.remove("hidden");

    // Save record
    if (winner.score > record) {
        record = winner.score;
        sessionStorage.setItem("record", record);
        document.getElementById("record").textContent = `Récord: ${record} puntos`;
    }
}

function resetGame() {
    document.getElementById("gameModal").classList.add("hidden");
    startGame(players.length);
    //endMusic.pause();
}

// Classes
class Player {
    constructor(x, y, image, name, keys) {
        this.x = x;
        this.y = y;
        this.image = image;
        this.name = name;
        this.keys = keys;
        this.score = 0;
        this.speed = 3;
        this.width = cellSize * 0.8;
        this.height = cellSize * 0.8;
        document.addEventListener("keydown", (e) => this.move(e.key));
    }

    move(key) {
        const oldX = this.x;
        const oldY = this.y;

        if (key === this.keys.up) this.y -= this.speed;
        if (key === this.keys.left) this.x -= this.speed;
        if (key === this.keys.down) this.y += this.speed;
        if (key === this.keys.right) this.x += this.speed;

        if (checkWallCollision(this)) {
            this.x = oldX;
            this.y = oldY;
        }

        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

class Enemy {
    constructor() {
        let position;
        do {
            position = getRandomPosition();
        } while (maze[Math.floor(position.y / cellSize)][Math.floor(position.x / cellSize)] === 1); // No esta en una pared

        this.x = position.x;
        this.y = position.y;
        this.image = enemyImg;
        this.width = cellSize * 0.8;
        this.height = cellSize * 0.8;

        // Dirección inicial aleatoria
        const directions = [
            { dx: 2, dy: 0 },   // Derecha
            { dx: -2, dy: 0 },  // Izquierda
            { dx: 0, dy: 2 },   // Abajo
            { dx: 0, dy: -2 }   // Arriba
        ];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)];
        this.dx = randomDirection.dx;
        this.dy = randomDirection.dy;
    }

    move() {
        const oldX = this.x;
        const oldY = this.y;

        // Mover en la dirección actual
        this.x += this.dx;
        this.y += this.dy;

        // Si colisiona con una pared, cambia de dirección
        if (checkWallCollision(this)) {
            this.x = oldX;
            this.y = oldY;

            // Cambiar dirección al azar
            const directions = [
                { dx: 2, dy: 0 },   // Derecha
                { dx: -2, dy: 0 },  // Izquierda
                { dx: 0, dy: 2 },   // Abajo
                { dx: 0, dy: -2 }   // Arriba
            ];
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];
            this.dx = randomDirection.dx;
            this.dy = randomDirection.dy;
        }

        // Comprobamos que no sale del canvas
        this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height - this.height, this.y));
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

class Item {
    constructor(special) {
        let position;
        do {
            position = getRandomPosition();
        } while (maze[Math.floor(position.y / cellSize)][Math.floor(position.x / cellSize)] === 1);

        this.x = position.x;
        this.y = position.y;
        this.image = special ? specialItemImg : itemImg;
        this.width = cellSize * 0.5;
        this.height = cellSize * 0.5;
        this.special = special;
    }

    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

// Game loop
function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw maze
    drawMaze();

    // Draw players, items, and enemy
    players.forEach((player) => player.draw());
    items.forEach((item) => item.draw());
    specialItems.forEach((item) => item.draw());
    enemy.move();
    enemy.draw();

    // Check collisions
    players.forEach((player) => {
        items = items.filter((item) => {
            if (checkCollision(player, item)) {
                player.score += item.special ? 1500 : 500;
                updateScores();
                return false;
            }
            return true;
        });
        specialItems = specialItems.filter((item) => {
            if (checkCollision(player, item)) {
                player.score += item.special ? 1500 : 500;
                updateScores();
                return false;
            }
            return true;
        });
        if (checkCollision(player, enemy)) {
            player.score -= 50;
            updateScores();
        }
    });
}

// Draw maze
function drawMaze() {
    maze.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell === 1) {
                ctx.fillStyle = "gray";
                ctx.fillRect(colIndex * cellSize, rowIndex * cellSize, cellSize, cellSize);
            }
        });
    });
}

// Collision detection
function checkCollision(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Wall collision detection
function checkWallCollision(obj) {
    const xStart = Math.floor(obj.x / cellSize);
    const yStart = Math.floor(obj.y / cellSize);
    const xEnd = Math.floor((obj.x + obj.width) / cellSize);
    const yEnd = Math.floor((obj.y + obj.height) / cellSize);

    return (
        maze[yStart]?.[xStart] === 1 ||
        maze[yStart]?.[xEnd] === 1 ||
        maze[yEnd]?.[xStart] === 1 ||
        maze[yEnd]?.[xEnd] === 1
    );
}

// Get random position
function getRandomPosition() {
    return {
        x: Math.floor(Math.random() * maze[0].length) * cellSize + cellSize * 0.2,
        y: Math.floor(Math.random() * maze.length) * cellSize + cellSize * 0.2
    };
}

// Update scores
function updateScores() {
    const scoresDiv = document.getElementById("scores");
    scoresDiv.innerHTML = players.map((player) => `<p>${player.name}: ${player.score} puntos</p>`).join("");
}

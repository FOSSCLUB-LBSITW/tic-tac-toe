const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const startBtn = document.getElementById("startBtn");
const changeNamesBtn = document.getElementById("changeNamesBtn");
const setupContainer = document.getElementById("setup-container");
const gameContainer = document.getElementById("game-container");

const modeSelect = document.getElementById("modeSelect");
const difficultySelect = document.getElementById("difficulty");

let playerNames = { "X": "Player X", "O": "Player O" };
let currentPlayer = "X";
let gameActive = false;
let gameState = ["", "", "", "", "", "", "", "", ""];
let scores = JSON.parse(localStorage.getItem("tttScores")) || { X: 0, O: 0, draws: 0 };

let gameMode = "2p"; // "2p" or "bot"
let difficulty = "easy"; // easy, medium, hard
let botSymbol = "O"; // Bot will play as O (human is X)

const winningConditions = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// Enable/disable Player O input & difficulty based on mode
modeSelect.addEventListener("change", () => {
  gameMode = modeSelect.value;
  difficultySelect.disabled = gameMode !== "bot";
  const p2Input = document.getElementById("p2Input");
  p2Input.disabled = gameMode === "bot";
  if (gameMode === "bot") p2Input.value = "Bot";
});

// Start Game
startBtn.addEventListener("click", () => {
  const p1 = document.getElementById("p1Input").value.trim();
  const p2 = document.getElementById("p2Input").value.trim();

  playerNames["X"] = p1 || "Player X";
  playerNames["O"] = gameMode === "bot" ? "Bot" : (p2 || "Player O");

  gameMode = modeSelect.value;
  difficulty = difficultySelect.value;

  setupContainer.style.display = "none";
  gameContainer.style.display = "block";
  startGame();
});

// Start & Reset
function startGame() {
  gameActive = true;
  currentPlayer = "X";
  gameState = ["", "", "", "", "", "", "", "", ""];
  updateStatus();
  cells.forEach(cell => {
    cell.innerText = "";
    cell.style.color = "#333";
  });
  updateLeaderboard();

  const winLine = document.getElementById("winLine");
  if (winLine) {
    winLine.style.width = "0";
    winLine.style.opacity = "0";
    winLine.style.transform = "rotate(0deg)";
  }
}

function updateStatus() {
  if (!gameActive) return;
  statusText.innerText = `${playerNames[currentPlayer]}'s turn (${currentPlayer})`;
}

// Cell click
function handleCellClick(e) {
  const clickedCell = e.target;
  const cellIndex = Number(clickedCell.getAttribute("data-index"));
  if (!gameActive || gameState[cellIndex] !== "") return;

  playMove(cellIndex, currentPlayer);
  if (checkResult()) return;

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();

  if (gameMode === "bot" && currentPlayer === botSymbol && gameActive) {
    setTimeout(aiMove, 300);
  }
}

function playMove(index, player) {
  gameState[index] = player;
  const cell = document.querySelector(`.cell[data-index='${index}']`);
  if (cell) {
    cell.textContent = player;
    cell.style.color = player === "X" ? "#3498db" : "#e67e22";
  }
}

// Check Result
function checkResult() {
  for (let cond of winningConditions) {
    const [a,b,c] = cond;
    if (gameState[a] && gameState[a] === gameState[b] && gameState[b] === gameState[c]) {
      const winner = gameState[a];
      statusText.innerText = `${playerNames[winner]} wins!`;
      scores[winner] = (scores[winner] || 0) + 1;
      gameActive = false;
      updateLeaderboard();
      animateWinLine(cond, winner);
      return true;
    }
  }

  if (!gameState.includes("")) {
    statusText.innerText = "It's a draw!";
    scores.draws = (scores.draws || 0) + 1;
    gameActive = false;
    updateLeaderboard();
    const winLine = document.getElementById("winLine");
    if (winLine) { winLine.style.width = "0"; winLine.style.opacity = "0"; }
    return true;
  }

  return false;
}

// Animate Win Line
function animateWinLine(cond, winner) {
  const winLine = document.getElementById("winLine");
  const board = document.getElementById("board");
  if (!winLine || !board) return;

  const cellEls = Array.from(document.querySelectorAll(".cell"));
  const startCell = cellEls[cond[0]];
  const endCell = cellEls[cond[2]];

  const boardRect = board.getBoundingClientRect();
  const sRect = startCell.getBoundingClientRect();
  const eRect = endCell.getBoundingClientRect();

  const x1 = sRect.left - boardRect.left + sRect.width/2;
  const y1 = sRect.top - boardRect.top + sRect.height/2;
  const x2 = eRect.left - boardRect.left + eRect.width/2;
  const y2 = eRect.top - boardRect.top + eRect.height/2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180/Math.PI);

  winLine.style.width = `${length}px`;
  winLine.style.left = `${x1}px`;
  const h = winLine.offsetHeight || 6;
  winLine.style.top = `${y1 - h/2}px`;
  winLine.style.transform = `rotate(${angle}deg)`;
  winLine.style.background = winner === "X" ? "#3498db" : "#e67e22";
  winLine.style.opacity = "1";
}

// AI Logic
function aiMove() {
  if (!gameActive) return;
  const empty = gameState.map((v,i)=>v===""?i:null).filter(v=>v!==null);
  if (empty.length === 0) return;

  let moveIndex;
  if (difficulty === "easy") {
    moveIndex = empty[Math.floor(Math.random()*empty.length)];
  } else if (difficulty === "medium") {
    moveIndex = Math.random() < 0.25 ? empty[Math.floor(Math.random()*empty.length)]
               : getBestMove(gameState.slice(), botSymbol).index;
  } else {
    moveIndex = getBestMove(gameState.slice(), botSymbol).index;
  }

  playMove(moveIndex, botSymbol);
  if (checkResult()) return;

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

// Minimax (hard)
function getBestMove(board, player) {
  const opponent = player==="X"?"O":"X";
  const winner = checkWinner(board);
  if (winner === botSymbol) return {index:-1, score:10};
  if (winner === opponent) return {index:-1, score:-10};
  if (!board.includes("")) return {index:-1, score:0};

  const moves = [];
  for (let i=0;i<board.length;i++){
    if(board[i]===""){
      board[i] = player;
      const move = {index:i, score:getBestMove(board, opponent).score};
      moves.push(move);
      board[i] = "";
    }
  }

  return player===botSymbol ? moves.reduce((a,b)=>b.score>a.score?b:a) 
                            : moves.reduce((a,b)=>b.score<a.score?b:a);
}

function checkWinner(board){
  for(const cond of winningConditions){
    const [a,b,c] = cond;
    if(board[a] && board[a]===board[b] && board[b]===board[c]) return board[a];
  }
  return null;
}

// Leaderboard
function updateLeaderboard() {
  document.getElementById("scoreX").innerText = scores.X || 0;
  document.getElementById("scoreO").innerText = scores.O || 0;
  document.getElementById("scoreDraw").innerText = scores.draws || 0;
  localStorage.setItem("tttScores", JSON.stringify(scores));
}

document.getElementById("resetScores").addEventListener("click", () => {
  scores = {X:0,O:0,draws:0};
  localStorage.removeItem("tttScores");
  updateLeaderboard();
});

// Reset & UI
function resetGame() { startGame(); const winLine=document.getElementById("winLine"); if(winLine) winLine.style.width="0"; }
cells.forEach(cell => cell.addEventListener("click", handleCellClick));
resetBtn.addEventListener("click", resetGame);

// Change Players
changeNamesBtn.addEventListener("click", () => {
  gameContainer.style.display="none";
  setupContainer.style.display="block";
  document.getElementById("p1Input").value="";
  document.getElementById("p2Input").value="";
  resetGame();
});

updateLeaderboard();
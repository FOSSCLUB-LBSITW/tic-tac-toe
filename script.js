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

// enable difficulty when bot selected
modeSelect.addEventListener("change", () => {
  gameMode = modeSelect.value;
  difficultySelect.disabled = gameMode !== "bot";
});

// start button
startBtn.addEventListener("click", () => {
  const p1 = document.getElementById("p1Input").value.trim();
  const p2 = document.getElementById("p2Input").value.trim();

  playerNames["X"] = p1 || "Player X";
  playerNames["O"] = p2 || "Player O";

  gameMode = modeSelect.value;
  difficulty = difficultySelect.value;

  setupContainer.style.display = "none";
  gameContainer.style.display = "block";
  startGame();
});

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

  // reset/hide win line
  const winLine = document.getElementById("winLine");
  if (winLine) {
    winLine.style.width = "0";
    winLine.style.opacity = "0";
    winLine.style.transform = "rotate(0deg)";
  }
  // if bot starts first in some future change, call aiMove() here
}

function updateStatus() {
  if (!gameActive) return;
  statusText.innerText = `${playerNames[currentPlayer]}'s turn (${currentPlayer})`;
}

// Game core
function handleCellClick(e) {
  const clickedCell = e.target;
  const cellIndex = Number(clickedCell.getAttribute("data-index"));
  if (isNaN(cellIndex)) return;
  if (!gameActive) return;
  if (gameState[cellIndex] !== "") return;

  playMove(cellIndex, currentPlayer);

  if (checkResult()) return;

  // switch
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();

  // If bot mode and it's bot's turn, schedule AI move
  if (gameMode === "bot" && currentPlayer === botSymbol && gameActive) {
    setTimeout(() => aiMove(), 300);
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

// result checking
function checkResult() {
  // check winner
  for (let cond of winningConditions) {
    const [a,b,c] = cond;
    if (gameState[a] && gameState[a] === gameState[b] && gameState[b] === gameState[c]) {
      const winner = gameState[a];
      statusText.innerText = `${playerNames[winner]} wins!`;
      scores[winner] = (scores[winner] || 0) + 1;
      gameActive = false;
      updateLeaderboard();

      // animate win line
      animateWinLine(cond, winner);
      return true;
    }
  }

  // draw
  if (!gameState.includes("")) {
    statusText.innerText = "It's a draw!";
    scores.draws = (scores.draws || 0) + 1;
    gameActive = false;
    updateLeaderboard();

    // hide any previous win line
    const winLine = document.getElementById("winLine");
    if (winLine) {
      winLine.style.width = "0";
      winLine.style.opacity = "0";
    }
    return true;
  }

  return false;
}

// animate the strike line across winning cells
function animateWinLine(cond, winner) {
  const winLine = document.getElementById("winLine");
  const board = document.getElementById("board");
  if (!winLine || !board) return;

  const cellEls = Array.from(document.querySelectorAll(".cell"));
  const startCell = cellEls[cond[0]];
  const endCell = cellEls[cond[2]]; // endpoints give full length for row/col/diag

  const boardRect = board.getBoundingClientRect();
  const sRect = startCell.getBoundingClientRect();
  const eRect = endCell.getBoundingClientRect();

  // centers relative to board
  const x1 = sRect.left - boardRect.left + sRect.width / 2;
  const y1 = sRect.top - boardRect.top + sRect.height / 2;
  const x2 = eRect.left - boardRect.left + eRect.width / 2;
  const y2 = eRect.top - boardRect.top + eRect.height / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // apply styles (winLine transform-origin is left center)
  winLine.style.width = `${length}px`;
  // left/top should be the start center
  winLine.style.left = `${x1}px`;
  // position line vertically centered on the y coordinate
  const h = winLine.offsetHeight || 6;
  winLine.style.top = `${y1 - h / 2}px`;
  winLine.style.transform = `rotate(${angle}deg)`;
  winLine.style.background = winner === "X" ? "#3498db" : "#e67e22";
  winLine.style.opacity = "1";
}

// AI move logic
function aiMove() {
  if (!gameActive) return;
  const empty = availableIndices(gameState);
  if (empty.length === 0) return;

  let moveIndex;
  if (difficulty === "easy") {
    moveIndex = empty[Math.floor(Math.random() * empty.length)];
  } else if (difficulty === "medium") {
    // 25% chance to play random to be beatable
    if (Math.random() < 0.25) {
      moveIndex = empty[Math.floor(Math.random() * empty.length)];
    } else {
      moveIndex = getBestMove(gameState.slice(), botSymbol, false).index;
    }
  } else { // hard
    moveIndex = getBestMove(gameState.slice(), botSymbol, true).index;
  }

  playMove(moveIndex, botSymbol);

  if (checkResult()) return;

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

// helpers
function availableIndices(board) {
  const inds = [];
  for (let i=0;i<board.length;i++) if (!board[i]) inds.push(i);
  return inds;
}

function checkWinner(board) {
  for (let cond of winningConditions) {
    const [a,b,c] = cond;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Minimax implementation
// returns { index, score }
// maximize for botSymbol
function getBestMove(board, player, perfect = true) {
  const opponent = player === "X" ? "O" : "X";
  const winner = checkWinner(board);
  if (winner === botSymbol) return { index: -1, score: 10 };
  if (winner === (botSymbol === "X" ? "O" : "X")) return { index: -1, score: -10 };
  if (!board.includes("")) return { index: -1, score: 0 };

  const moves = [];
  for (let i=0;i<board.length;i++) {
    if (board[i] === "") {
      const move = { index: i };
      board[i] = player;

      const result = getBestMove(board, opponent, perfect);
      move.score = result.score;

      board[i] = "";
      moves.push(move);
    }
  }

  // choose best depending on player
  let bestMove;
  if (player === botSymbol) {
    // maximize
    let bestScore = -Infinity;
    for (const m of moves) {
      if (m.score > bestScore) {
        bestScore = m.score;
        bestMove = m;
      }
    }
  } else {
    // minimize
    let bestScore = Infinity;
    for (const m of moves) {
      if (m.score < bestScore) {
        bestScore = m.score;
        bestMove = m;
      }
    }
  }

  // If not perfect (depth-limited flavor) could add heuristics; for now return best
  return bestMove || { index: moves[0].index, score: 0 };
function drawWinLine(pattern) {
  const winLine = document.getElementById("winLine");
  const board = document.getElementById("board");

  const boardRect = board.getBoundingClientRect();
  const boardSize = boardRect.width;

  const key = pattern.toString();

  // Horizontal wins
  if (["0,1,2", "3,4,5", "6,7,8"].includes(key)) {
    const rowIndex = Math.floor(pattern[0] / 3);
    const cellHeight = boardSize / 3;
    const topPosition = cellHeight * rowIndex + cellHeight / 2;

    winLine.style.width = boardSize + "px";
    winLine.style.top = topPosition + "px";
    winLine.style.left = boardSize / 2 + "px";
    winLine.style.transform = "translate(-50%, -50%) rotate(0deg)";
  }

  // Vertical wins
  else if (["0,3,6", "1,4,7", "2,5,8"].includes(key)) {
    const colIndex = pattern[0] % 3;
    const cellWidth = boardSize / 3;
    const leftPosition = cellWidth * colIndex + cellWidth / 2;

    winLine.style.width = boardSize + "px";
    winLine.style.top = boardSize / 2 + "px";
    winLine.style.left = leftPosition + "px";
    winLine.style.transform = "translate(-50%, -50%) rotate(90deg)";
  }

  // Diagonal 1 (0,4,8)
  else if (key === "0,4,8") {
    const diagonal = Math.sqrt(boardSize * boardSize * 2);

    winLine.style.width = diagonal + "px";
    winLine.style.top = boardSize / 2 + "px";
    winLine.style.left = boardSize / 2 + "px";
    winLine.style.transform = "translate(-50%, -50%) rotate(45deg)";
  }

  // Diagonal 2 (2,4,6)
  else if (key === "2,4,6") {
    const diagonal = Math.sqrt(boardSize * boardSize * 2);

    winLine.style.width = diagonal + "px";
    winLine.style.top = boardSize / 2 + "px";
    winLine.style.left = boardSize / 2 + "px";
    winLine.style.transform = "translate(-50%, -50%) rotate(-45deg)";
  }
}

// leaderboard
function updateLeaderboard() {
  document.getElementById("scoreX").innerText = scores.X || 0;
  document.getElementById("scoreO").innerText = scores.O || 0;
  document.getElementById("scoreDraw").innerText = scores.draws || 0;
  localStorage.setItem("tttScores", JSON.stringify(scores));
}

document.getElementById("resetScores").addEventListener("click", () => {
  scores = { X: 0, O: 0, draws: 0 };
  localStorage.removeItem("tttScores");
  updateLeaderboard();
});

// Reset & UI
function resetGame() {
  startGame();
  const winLine = document.getElementById("winLine");
  if (winLine) winLine.style.width = "0";
}
cells.forEach(cell => cell.addEventListener("click", handleCellClick));
resetBtn.addEventListener("click", resetGame);

// allow going back to setup
changeNamesBtn.addEventListener("click", () => {
  setupContainer.style.display = "block";
  gameContainer.style.display = "none";
  gameActive = false;
});
updateLeaderboard();
// Change Players Button Fix
changeNamesBtn.addEventListener("click", () => {
  gameContainer.style.display = "none";
  setupContainer.style.display = "block";

  // Clear input fields (optional but clean)
  document.getElementById("p1Input").value = "";
  document.getElementById("p2Input").value = "";

  // Reset board state
  resetGame();
});
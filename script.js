const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const startBtn = document.getElementById("startBtn");
const changeNamesBtn = document.getElementById("changeNamesBtn");
const setupContainer = document.getElementById("setup-container");
const gameContainer = document.getElementById("game-container");

let playerNames = { "X": "Player 1", "O": "Player 2" };
let currentPlayer = "X";
let gameActive = false;
let gameState = ["", "", "", "", "", "", "", "", ""];
let scores = JSON.parse(localStorage.getItem("tttScores")) || {
  X: 0,
  O: 0,
  draws: 0
};

const winningConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// --- Initialization & Setup ---

startBtn.addEventListener("click", () => {
  const p1 = document.getElementById("p1Input").value.trim();
  const p2 = document.getElementById("p2Input").value.trim();
  
  playerNames["X"] = p1 || "Player X";
  playerNames["O"] = p2 || "Player O";

  setupContainer.style.display = "none";
  gameContainer.style.display = "block";
  startGame();
});

function startGame() {
  gameActive = true;
  currentPlayer = "X";
  gameState = ["", "", "", "", "", "", "", "", ""];
  updateStatus();
  cells.forEach(cell => cell.innerText = "");
}

function updateStatus() {
  statusText.innerText = `${playerNames[currentPlayer]}'s turn (${currentPlayer})`;
}

// --- Game Logic ---

function handleCellClick(e) {
  const clickedCell = e.target;
  const cellIndex = clickedCell.getAttribute("data-index");

  if (gameState[cellIndex] !== "" || !gameActive) return;

  // Record move
  gameState[cellIndex] = currentPlayer;
  clickedCell.innerText = currentPlayer;

  // Style move
  clickedCell.style.color = currentPlayer === "X" ? "#3498db" : "#e67e22";

  if (checkResult()) return;

  // Switch player
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

function checkResult() {
  let roundWon = false;
  let winningPattern = null;

  for (let condition of winningConditions) {
    const [a, b, c] = condition;

    if (
      gameState[a] !== "" &&
      gameState[a] === gameState[b] &&
      gameState[a] === gameState[c]
    ) {
      roundWon = true;
      winningPattern = [a, b, c];
      break;
    }
  }

  if (roundWon) {
    statusText.innerText = `${playerNames[currentPlayer]} wins!`;
    scores[currentPlayer]++;
    updateLeaderboard();
    gameActive = false;
    drawWinLine(winningPattern);
    return true;
  }

  if (!gameState.includes("")) {
    statusText.innerText = "It's a draw!";
    scores.draws++;
    updateLeaderboard();
    gameActive = false;
    return true;
  }

  return false;
}
function updateLeaderboard() {
  document.getElementById("scoreX").innerText = scores.X;
  document.getElementById("scoreO").innerText = scores.O;
  document.getElementById("scoreDraw").innerText = scores.draws;

  localStorage.setItem("tttScores", JSON.stringify(scores));
}

document.getElementById("resetScores").addEventListener("click", () => {
  scores = { X: 0, O: 0, draws: 0 };
  localStorage.removeItem("tttScores"); // IMPORTANT
  updateLeaderboard();
});

// --- Reset & Navigation ---

/*function resetBoard() {
  startGame();
    statusText.innerText = `Player ${currentPlayer} wins!`;
    gameActive = false;
    drawWinLine(winningPattern);
    return;
  }
  if (!gameState.includes("")) {
    statusText.innerText = "It's a draw!";
    gameActive = false;
  }
}
*/
function resetGame() {
  startGame();
  gameActive = true;
  currentPlayer = "X";
  gameState = ["", "", "", "", "", "", "", "", ""];
  statusText.innerText = `Player X's turn`;
  cells.forEach(cell => cell.innerText = "");// ✅ FIX: clear board visually
  const winLine = document.getElementById("winLine");
  winLine.style.width = "0";
}

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

cells.forEach(cell => cell.addEventListener("click", handleCellClick));
resetBtn.addEventListener("click", resetGame);
updateLeaderboard();

// Game state variables
let cells = [];
const statusText = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const startBtn = document.getElementById("startBtn");
const changeNamesBtn = document.getElementById("changeNamesBtn");
const resetScoresBtn = document.getElementById("resetScores");
const setupContainer = document.getElementById("setup-container");
const gameContainer = document.getElementById("game-container");
const boardElement = document.getElementById("board");
const boardSizeSelect = document.getElementById("boardSize");

const modeSelect = document.getElementById("modeSelect");
const difficultySelect = document.getElementById("difficulty");

let playerNames = { "X": "Player X", "O": "Player O" };
let currentPlayer = "X";
let gameActive = false;
let gameState = [];
let boardSize = 3;
let scores = JSON.parse(localStorage.getItem("tttScores")) || { X: 0, O: 0, draws: 0 };

let gameMode = "2p";
let difficulty = "easy";
let botSymbol = "O";

// Track scored patterns for multiple wins
let scoredPatterns = new Set();

// Winning patterns will be generated dynamically
let winningConditions = [];

// Add style for win lines - FIXED CSS
const style = document.createElement('style');
style.textContent = `
  .board {
    position: relative;
    display: grid;
    gap: 10px;
    margin: 20px auto;
    justify-content: center;
    background-color: transparent;
  }
  
  .cell {
    background: white;
    border-radius: 10px;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.1s, background 0.3s;
    color: #333;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  }
  
  .win-line {
    position: absolute;
    height: 6px;
    background: linear-gradient(90deg, #ff6b6b, #4ecdc4);
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    opacity: 0.9;
    z-index: 10;
    pointer-events: none;
    transform-origin: 0 0;
    transition: none;
    border-radius: 3px;
  }
`;
document.head.appendChild(style);

// --- Board Size Functions ---

function generateWinningPatterns(size) {
  const patterns = [];
  
  // Check rows for any 3 consecutive cells
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= size - 3; col++) {
      const pattern = [];
      for (let i = 0; i < 3; i++) {
        pattern.push(row * size + (col + i));
      }
      patterns.push(pattern);
    }
  }
  
  // Check columns for any 3 consecutive cells
  for (let col = 0; col < size; col++) {
    for (let row = 0; row <= size - 3; row++) {
      const pattern = [];
      for (let i = 0; i < 3; i++) {
        pattern.push((row + i) * size + col);
      }
      patterns.push(pattern);
    }
  }
  
  // Check diagonals (top-left to bottom-right) for any 3 consecutive cells
  for (let row = 0; row <= size - 3; row++) {
    for (let col = 0; col <= size - 3; col++) {
      const pattern = [];
      for (let i = 0; i < 3; i++) {
        pattern.push((row + i) * size + (col + i));
      }
      patterns.push(pattern);
    }
  }
  
  // Check diagonals (top-right to bottom-left) for any 3 consecutive cells
  for (let row = 0; row <= size - 3; row++) {
    for (let col = 2; col < size; col++) {
      const pattern = [];
      for (let i = 0; i < 3; i++) {
        pattern.push((row + i) * size + (col - i));
      }
      patterns.push(pattern);
    }
  }
  
  return patterns;
}

function createBoard(size) {
  // Clear the board completely
  boardElement.innerHTML = '';
  
  // Calculate cell size based on viewport
  const viewportWidth = window.innerWidth;
  let cellSize;
  if (size === 3) cellSize = 100;
  else if (size === 4) cellSize = 90;
  else if (size === 5) cellSize = 80;
  else cellSize = 70;
  
  // Adjust for mobile
  if (viewportWidth < 600) {
    cellSize = cellSize * 0.8;
  }
  
  // Set grid template with fixed pixel sizes
  boardElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
  boardElement.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
  boardElement.style.width = 'fit-content';
  boardElement.style.height = 'fit-content';
  
  // Create cells with fixed dimensions
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('data-index', i);
    cell.style.width = `${cellSize}px`;
    cell.style.height = `${cellSize}px`;
    cell.style.fontSize = `${cellSize * 0.4}px`;
    boardElement.appendChild(cell);
  }
  
  // Update cells reference
  cells = document.querySelectorAll(".cell");
  
  // Add click listeners to new cells
  cells.forEach(cell => cell.addEventListener("click", handleCellClick));
  
  // Force a reflow
  boardElement.offsetHeight;
}

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
  
  // Get selected board size
  boardSize = parseInt(boardSizeSelect.value);
  
  // Generate winning patterns for this board size
  winningConditions = generateWinningPatterns(boardSize);
  
  // Create the board with selected size
  createBoard(boardSize);

  setupContainer.style.display = "none";
  gameContainer.style.display = "block";
  
  // Small delay to ensure board is rendered
  setTimeout(() => startGame(), 50);
});

function startGame() {
  gameActive = true;
  currentPlayer = "X";
  gameState = new Array(boardSize * boardSize).fill("");
  scoredPatterns.clear();
  
  // Update cells reference and clear them
  cells = document.querySelectorAll(".cell");
  cells.forEach(cell => {
    cell.innerText = "";
    cell.style.color = "#333";
    cell.style.backgroundColor = "white";
  });
  
  // Remove all win lines
  const winLines = document.querySelectorAll('.win-line');
  winLines.forEach(line => line.remove());
  
  updateStatus();
  updateLeaderboard();
}

function updateStatus() {
  if (!gameActive) {
    if (gameState.length > 0 && !gameState.includes("")) {
      showGameOver();
    }
    return;
  }
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

  // Check for new wins after this move
  checkForNewWins();
  
  // Check if game is complete (board full)
  if (!gameState.includes("")) {
    gameActive = false;
    showGameOver();
    return;
  }

  // ALWAYS switch player after a move
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
    cell.style.backgroundColor = player === "X" ? "#e8f4fc" : "#fff1e6";
  }
}

// Check for new winning patterns
function checkForNewWins() {
  for (let pattern of winningConditions) {
    const patternKey = pattern.join(',');
    
    // Skip if this pattern has already been scored
    if (scoredPatterns.has(patternKey)) continue;
    
    const [a, b, c] = pattern;
    
    if (
      gameState[a] !== "" &&
      gameState[a] === gameState[b] &&
      gameState[a] === gameState[c]
    ) {
      // New win found!
      const winningPlayer = gameState[a];
      
      // Add to scored patterns
      scoredPatterns.add(patternKey);
      
      // Award point to the player
      scores[winningPlayer]++;
      
      // Draw the win line for this pattern
      drawWinLine(pattern, winningPlayer);
      
      // Show win message
      statusText.innerText = `🎉 ${playerNames[winningPlayer]} scores! +1 point`;
    }
  }
  
  updateLeaderboard();
}

// Draw win line for a specific pattern - COMPLETELY REWRITTEN
function drawWinLine(pattern, winningPlayer) {
  // Get fresh references
  const board = document.getElementById("board");
  const currentCells = document.querySelectorAll(".cell");
  
  if (!board || currentCells.length === 0) return;
  
  // Get the cells in the winning pattern
  const firstCell = currentCells[pattern[0]];
  const lastCell = currentCells[pattern[pattern.length - 1]];
  
  if (!firstCell || !lastCell) return;
  
  // Get precise positions
  const boardRect = board.getBoundingClientRect();
  const firstRect = firstCell.getBoundingClientRect();
  const lastRect = lastCell.getBoundingClientRect();
  
  // Calculate centers relative to board
  const startX = firstRect.left + firstRect.width / 2 - boardRect.left;
  const startY = firstRect.top + firstRect.height / 2 - boardRect.top;
  const endX = lastRect.left + lastRect.width / 2 - boardRect.left;
  const endY = lastRect.top + lastRect.height / 2 - boardRect.top;
  
  // Calculate line properties
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  
  // Create the line
  const winLine = document.createElement('div');
  winLine.className = 'win-line';
  winLine.setAttribute('data-pattern', pattern.join(','));
  
  // Position the line - using start point as origin with transform-origin: 0 0
  winLine.style.left = startX + 'px';
  winLine.style.top = startY + 'px';
  winLine.style.width = length + 'px';
  winLine.style.height = '6px';
  winLine.style.transform = `rotate(${angle}deg)`;
  winLine.style.transformOrigin = '0 0';
  
  // Color based on player
  const playerColor = winningPlayer === "X" ? "#3498db" : "#e67e22";
  winLine.style.background = `linear-gradient(90deg, ${playerColor}, #4ecdc4)`;
  
  // Add to board
  board.appendChild(winLine);
  
  console.log(`Line drawn: from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);
}

function showGameOver() {
  const xWins = scores.X;
  const oWins = scores.O;
  
  if (xWins > oWins) {
    statusText.innerText = `🏆 GAME OVER! ${playerNames["X"]} (X) wins with ${xWins} points!`;
  } else if (oWins > xWins) {
    statusText.innerText = `🏆 GAME OVER! ${playerNames["O"]} (O) wins with ${oWins} points!`;
  } else {
    statusText.innerText = `🤝 GAME OVER! It's a tie! X: ${xWins} - O: ${oWins}`;
  }
}

// AI move logic (simplified for brevity - keep your existing AI functions)
function aiMove() {
  if (!gameActive) return;
  const empty = availableIndices(gameState);
  if (empty.length === 0) return;

  let moveIndex;
  if (difficulty === "easy") {
    moveIndex = empty[Math.floor(Math.random() * empty.length)];
  } else if (difficulty === "medium") {
    if (Math.random() < 0.25) {
      moveIndex = empty[Math.floor(Math.random() * empty.length)];
    } else {
      moveIndex = getBestMove(gameState.slice(), botSymbol).index;
    }
  } else {
    moveIndex = getBestMove(gameState.slice(), botSymbol).index;
  }

  playMove(moveIndex, botSymbol);
  checkForNewWins();

  if (!gameState.includes("")) {
    gameActive = false;
    showGameOver();
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatus();
}

// Helper functions
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
function getBestMove(board, player) {
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
      const result = getBestMove(board, opponent);
      move.score = result.score;
      board[i] = "";
      moves.push(move);
    }
  }

  let bestMove;
  if (player === botSymbol) {
    let bestScore = -Infinity;
    for (const m of moves) {
      if (m.score > bestScore) {
        bestScore = m.score;
        bestMove = m;
      }
    }
  } else {
    let bestScore = Infinity;
    for (const m of moves) {
      if (m.score < bestScore) {
        bestScore = m.score;
        bestMove = m;
      }
    }
  }

  return bestMove || { index: moves[0].index, score: 0 };
}

// Leaderboard functions
function updateLeaderboard() {
  document.getElementById("scoreX").innerText = scores.X || 0;
  document.getElementById("scoreO").innerText = scores.O || 0;
  document.getElementById("scoreDraw").innerText = scores.draws || 0;
  localStorage.setItem("tttScores", JSON.stringify(scores));
}

resetScoresBtn.addEventListener("click", () => {
  scores = { X: 0, O: 0, draws: 0 };
  localStorage.removeItem("tttScores");
  updateLeaderboard();
});

// Reset function
function resetGame() {
  startGame();
}

// Change players button
changeNamesBtn.addEventListener("click", () => {
  gameContainer.style.display = "none";
  setupContainer.style.display = "block";
  gameActive = false;

  // Clear input fields
  document.getElementById("p1Input").value = "Player X";
  document.getElementById("p2Input").value = "Player O";
  
  // Reset board size selector
  if (boardSizeSelect) {
    boardSizeSelect.value = "3";
  }
  
  // Reset mode and difficulty
  if (modeSelect) {
    modeSelect.value = "2p";
    difficultySelect.disabled = true;
  }
  
  // Clear all win lines
  const winLines = document.querySelectorAll('.win-line');
  winLines.forEach(line => line.remove());
  
  // Reset status
  statusText.innerText = "Ready?";
});

// Event listeners
resetBtn.addEventListener("click", resetGame);

// Window resize handler
window.addEventListener('resize', () => {
  // Redraw all win lines on resize
  const existingLines = document.querySelectorAll('.win-line');
  if (existingLines.length > 0) {
    // Store pattern data and redraw
    const linesData = [];
    existingLines.forEach(line => {
      const pattern = line.getAttribute('data-pattern');
      if (pattern) {
        linesData.push(pattern.split(',').map(Number));
      }
      line.remove();
    });
    
    // Redraw lines with new positions
    linesData.forEach(pattern => {
      // Find which player scored this line
      const player = gameState[pattern[0]];
      if (player) {
        drawWinLine(pattern, player);
      }
    });
  }
});

// Initialize
updateLeaderboard();
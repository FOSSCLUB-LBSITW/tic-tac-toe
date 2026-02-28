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

let playerNames = { "X": "Player 1", "O": "Player 2" };
let currentPlayer = "X";
let gameActive = true;
let gameState = [];
let boardSize = 3;
let scores = JSON.parse(localStorage.getItem("tttScores")) || {
  X: 0,
  O: 0,
  draws: 0
};

// Track which winning patterns have already been scored and have lines
let scoredPatterns = new Set();
let winLines = []; // Store references to win line elements

// Winning patterns for each board size (always looking for 3 in a row)
let winningPatterns = [];

// Track game completion
let gameCompleted = false;

// Store line positions to prevent recalculation after popup
let pendingWinLines = [];

// Add the animation style once
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 0.9; }
  }
  
  .winner-announcement {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 30px 50px;
    border-radius: 20px;
    font-size: 2rem;
    font-weight: bold;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.5s ease;
    text-align: center;
    pointer-events: auto; /* Allow clicking on the button */
  }
  
  @keyframes slideIn {
    0% { opacity: 0; transform: translate(-50%, -30%); }
    100% { opacity: 1; transform: translate(-50%, -50%); }
  }
  
  .winner-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
    animation: fadeIn 0.3s ease;
    pointer-events: auto; /* Allow clicking through to the button */
  }
  
  .play-again-btn {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 1rem;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    pointer-events: auto;
  }
  
  .play-again-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
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
  
  // Set grid template
  boardElement.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardElement.style.gridTemplateRows = `repeat(${size}, 1fr)`;
  
  // Adjust cell size based on board dimensions
  const cellSize = size > 5 ? '70px' : (size > 4 ? '80px' : (size > 3 ? '90px' : '100px'));
  
  // Create cells
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('data-index', i);
    cell.style.width = cellSize;
    cell.style.height = cellSize;
    cell.style.fontSize = size > 4 ? '1.8rem' : '2.5rem';
    boardElement.appendChild(cell);
  }
  
  // Update cells reference
  cells = document.querySelectorAll(".cell");
  
  // Add click listeners to new cells
  cells.forEach(cell => cell.addEventListener("click", handleCellClick));
}

// --- Initialization & Setup ---

startBtn.addEventListener("click", () => {
  const p1 = document.getElementById("p1Input").value.trim();
  const p2 = document.getElementById("p2Input").value.trim();
  
  playerNames["X"] = p1 || "Player X";
  playerNames["O"] = p2 || "Player O";

  // Get selected board size
  boardSize = parseInt(boardSizeSelect.value);
  
  // Generate winning patterns for this board size
  winningPatterns = generateWinningPatterns(boardSize);
  
  // Create the board with selected size
  createBoard(boardSize);
  
  setupContainer.style.display = "none";
  gameContainer.style.display = "block";
  
  // Reset game state
  resetGameState();
});

function resetGameState() {
  gameActive = true;
  gameCompleted = false;
  currentPlayer = "X";
  gameState = new Array(boardSize * boardSize).fill("");
  scoredPatterns.clear();
  pendingWinLines = [];
  
  // Remove all win lines
  winLines.forEach(line => {
    if (line && line.parentNode) {
      line.remove();
    }
  });
  winLines = [];
  
  // Clear all cells
  if (cells && cells.length > 0) {
    cells.forEach(cell => {
      if (cell) {
        cell.innerText = "";
        cell.style.color = "";
      }
    });
  }
  
  // Remove any winner announcements
  removeWinnerAnnouncement();
  
  updateStatus();
}

function removeWinnerAnnouncement() {
  const overlay = document.querySelector('.winner-overlay');
  const announcement = document.querySelector('.winner-announcement');
  
  if (overlay) overlay.remove();
  if (announcement) announcement.remove();
}

function updateStatus() {
  if (statusText) {
    if (gameCompleted) {
      statusText.innerText = `Game Complete! Click Reset Board to play again.`;
    } else {
      statusText.innerText = `${playerNames[currentPlayer]}'s turn (${currentPlayer})`;
    }
  }
}

// --- Game Logic ---

function handleCellClick(e) {
  const clickedCell = e.target;
  const cellIndex = parseInt(clickedCell.getAttribute("data-index"));

  // Check if cell is empty and game is active and not completed
  if (!gameActive || gameCompleted || gameState[cellIndex] !== "") return;

  // Record move
  gameState[cellIndex] = currentPlayer;
  clickedCell.innerText = currentPlayer;

  // Style move
  clickedCell.style.color = currentPlayer === "X" ? "#3498db" : "#e67e22";

  // Check for new wins after this move
  checkForNewWins();
  
  // Check if board is completely filled
  const isBoardFull = checkGameCompletion();
  
  // Switch player if game is still active and not completed
  if (gameActive && !gameCompleted) {
    currentPlayer = currentPlayer === "X" ? "O" : "X";
    updateStatus();
  }
  
  // Show winner announcement AFTER drawing lines, but only if board is full
  if (isBoardFull && !gameCompleted) {
    // Small delay to ensure lines are drawn first
    setTimeout(() => {
      showWinnerAnnouncement();
    }, 100);
  }
}

function checkForNewWins() {
  let newWinsFound = false;

  // Check all possible winning patterns
  for (let pattern of winningPatterns) {
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
      newWinsFound = true;
      
      // Draw the win line for this pattern immediately
      drawWinLine(pattern, winningPlayer);
      
      // Show win message
      statusText.innerText = `🎉 ${playerNames[winningPlayer]} wins! Game over!!`;
    }
  }
  
  // Update leaderboard if new wins were found
  if (newWinsFound) {
    updateLeaderboard();
  }
}

function checkGameCompletion() {
  // Check if all cells are filled
  const isBoardFull = !gameState.includes("");
  
  if (isBoardFull && !gameCompleted) {
    gameCompleted = true;
    gameActive = false;
    return true;
  }
  return false;
}

function showWinnerAnnouncement() {
  // Calculate final scores
  const xWins = scores.X;
  const oWins = scores.O;
  
  // Determine overall winner
  let winnerMessage = "";
  if (xWins > oWins) {
    winnerMessage = `${playerNames["X"]} (X) wins the game! 🏆`;
  } else if (oWins > xWins) {
    winnerMessage = `${playerNames["O"]} (O) wins the game! 🏆`;
  } else {
    winnerMessage = `It's a tie! 🤝`;
  }
  
  // Remove any existing announcements
  removeWinnerAnnouncement();
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'winner-overlay';
  document.body.appendChild(overlay);
  
  // Create announcement
  const announcement = document.createElement('div');
  announcement.className = 'winner-announcement';
  announcement.innerHTML = `
    ${winnerMessage}<br>
    <button class="play-again-btn" id="playAgainBtn">Play Again</button>
  `;
  document.body.appendChild(announcement);
  
  statusText.innerText = `Game Complete! ${winnerMessage}`;
  
  // Add event listener to Play Again button
  const playAgainBtn = document.getElementById('playAgainBtn');
  if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
      // Remove announcement
      removeWinnerAnnouncement();
      // Reset the board instead of reloading
      resetBoard();
    });
  }
  
  // Remove after 10 seconds if not clicked (longer timeout)
  setTimeout(() => {
    removeWinnerAnnouncement();
  }, 10000);
}

function drawWinLine(pattern, winningPlayer) {
  const board = document.getElementById("board");
  if (!board) return;
  
  // Get current measurements before any popup
  const boardRect = board.getBoundingClientRect();
  
  // Get the first and last cell of the winning pattern
  const firstCell = cells[pattern[0]];
  const lastCell = cells[pattern[pattern.length - 1]];
  
  if (!firstCell || !lastCell) return;
  
  const firstRect = firstCell.getBoundingClientRect();
  const lastRect = lastCell.getBoundingClientRect();
  
  // Calculate positions relative to board
  const startX = firstRect.left + firstRect.width / 2 - boardRect.left;
  const startY = firstRect.top + firstRect.height / 2 - boardRect.top;
  const endX = lastRect.left + lastRect.width / 2 - boardRect.left;
  const endY = lastRect.top + lastRect.height / 2 - boardRect.top;
  
  // Calculate line length
  const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // Calculate angle in radians and then convert to degrees
  const angleRad = Math.atan2(endY - startY, endX - startX);
  const angleDeg = angleRad * 180 / Math.PI;
  
  // Position the line at the center point between start and end
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  
  // Store the line data for potential redraw if needed
  pendingWinLines.push({
    pattern: pattern,
    winningPlayer: winningPlayer,
    startX, startY, endX, endY,
    length, angleDeg, centerX, centerY
  });
  
  // Create a new win line for this pattern
  createWinLineElement(pattern, winningPlayer, length, centerX, centerY, angleDeg);
}

function createWinLineElement(pattern, winningPlayer, length, centerX, centerY, angleDeg) {
  const board = document.getElementById("board");
  
  // Create a new win line element
  const winLine = document.createElement('div');
  winLine.className = 'win-line';
  winLine.setAttribute('data-pattern', pattern.join(','));
  board.appendChild(winLine);
  
  // Store reference
  winLines.push(winLine);
  
  // Color based on player
  const playerColor = winningPlayer === "X" ? "#3498db" : "#e67e22";
  
  // Apply styles - line appears instantly in correct position with rotation
  winLine.style.width = length + 'px';
  winLine.style.height = '6px';
  winLine.style.left = centerX + 'px';
  winLine.style.top = centerY + 'px';
  
  // Apply transform directly
  winLine.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
  
  winLine.style.background = `linear-gradient(90deg, ${playerColor}, #4ecdc4)`;
  winLine.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  winLine.style.opacity = '0.9';
  
  // Simple fade-in animation only
  winLine.style.animation = 'fadeIn 0.3s ease';
}

function redrawAllWinLines() {
  // Only redraw if we have pending lines and they need to be repositioned
  if (pendingWinLines.length > 0) {
    // Remove all existing win lines
    winLines.forEach(line => {
      if (line && line.parentNode) {
        line.remove();
      }
    });
    winLines = [];
    
    // Redraw using stored positions
    pendingWinLines.forEach(lineData => {
      createWinLineElement(
        lineData.pattern,
        lineData.winningPlayer,
        lineData.length,
        lineData.centerX,
        lineData.centerY,
        lineData.angleDeg
      );
    });
  }
}

function updateLeaderboard() {
  const scoreXEl = document.getElementById("scoreX");
  const scoreOEl = document.getElementById("scoreO");
  const scoreDrawEl = document.getElementById("scoreDraw");
  
  if (scoreXEl) scoreXEl.innerText = scores.X;
  if (scoreOEl) scoreOEl.innerText = scores.O;
  if (scoreDrawEl) scoreDrawEl.innerText = scores.draws;

  localStorage.setItem("tttScores", JSON.stringify(scores));
}

// --- Reset Functions ---

function resetBoard() {
  console.log("Resetting board...");
  resetGameState();
}

function resetLeaderboard() {
  console.log("Resetting leaderboard...");
  scores = { X: 0, O: 0, draws: 0 };
  localStorage.removeItem("tttScores");
  updateLeaderboard();
}

function changePlayers() {
  console.log("Changing players...");
  
  // Hide game container, show setup container
  if (gameContainer) gameContainer.style.display = "none";
  if (setupContainer) setupContainer.style.display = "block";

  // Clear input fields
  const p1Input = document.getElementById("p1Input");
  const p2Input = document.getElementById("p2Input");
  
  if (p1Input) p1Input.value = "";
  if (p2Input) p2Input.value = "";

  // Reset ALL game state variables
  gameActive = true;
  gameCompleted = false;
  currentPlayer = "X";
  scoredPatterns.clear();
  gameState = [];
  pendingWinLines = [];
  
  // Remove all win lines from the board
  winLines.forEach(line => {
    if (line && line.parentNode) {
      line.remove();
    }
  });
  winLines = [];
  
  // Clear all cells if they exist
  if (cells && cells.length > 0) {
    cells.forEach(cell => {
      if (cell) {
        cell.innerText = "";
        cell.style.color = "";
      }
    });
  }
  
  // Remove any winner announcements
  removeWinnerAnnouncement();
  
  // Reset player names to defaults
  playerNames = { "X": "Player 1", "O": "Player 2" };
  
  // Clear the board element completely to ensure a fresh start
  if (boardElement) {
    boardElement.innerHTML = '';
  }
  
  // Reset status text
  if (statusText) {
    statusText.innerText = "Ready?";
  }
  
  console.log("Change players complete - ready for new game");
}

// --- Event Listeners ---

// Reset button
if (resetBtn) {
  resetBtn.addEventListener("click", resetBoard);
}

// Reset scores button
if (resetScoresBtn) {
  resetScoresBtn.addEventListener("click", resetLeaderboard);
}

// Change players button
if (changeNamesBtn) {
  changeNamesBtn.removeEventListener("click", changePlayers);
  changeNamesBtn.addEventListener("click", changePlayers);
}

// Window resize event to redraw lines if needed
window.addEventListener('resize', () => {
  // Only redraw if there are pending lines
  if (pendingWinLines.length > 0) {
    // Small delay to let the resize complete
    setTimeout(redrawAllWinLines, 100);
  }
});

// Initialize leaderboard
updateLeaderboard();

// Add initial board
createBoard(3);
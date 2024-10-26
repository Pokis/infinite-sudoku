const sudokuGrid = document.getElementById("sudoku-grid");
const scoreDisplay = document.getElementById("score");
const currentLevelDisplay = document.getElementById("current-level");
const currentSizeDisplay = document.getElementById("current-size");
const seedInput = document.getElementById("seed-input");
const currentSeedDisplay = document.getElementById("current-seed");
const selectionPanel = document.getElementById("selection-panel");
let gridSize = 9;
let score = 0;
let seed = 1;
let currentFocusedCell = null;
let movesStack = [];
let isInteractingWithPanel = false;


const difficultyLevels = {
    1: { name: "Easy", fillPercent: 0.5 },
    2: { name: "Medium", fillPercent: 0.35 },
    3: { name: "Hard", fillPercent: 0.25 }
};

// Initialization function to set Level 1 when the app loads
function initializeGame() {
    setLevel(1); // Start with Level 1
    setSeed(); // Set the initial seed value
	addCellEventListeners();
}

// Call initializeGame when the page finishes loading
window.onload = initializeGame;

function setLevel(level) {
    currentLevelDisplay.textContent = difficultyLevels[level].name;
    generateSudoku(level);
    createSelectionPanel(); // Ensure panel buttons align with current grid size
    resetGameState();
}


function setGridSize(size) {
    gridSize = size;
    currentSizeDisplay.textContent = `${gridSize}x${gridSize}`;
    generateSudoku(parseInt(document.getElementById("level-select")?.value || 1));
    createSelectionPanel(size);
    resetGameState(); // New line to reset state
}

function setSeed() {
    seed = parseInt(seedInput.value);
    currentSeedDisplay.textContent = seed;
    generateSudoku(parseInt(document.getElementById("level-select")?.value || 1));
    resetGameState();
}


function generateSudoku(level = 1) {
    const fillPercent = difficultyLevels[level].fillPercent;
    sudokuGrid.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
    sudokuGrid.innerHTML = "";

    // Step 1: Generate a full, valid Sudoku solution grid
    const solutionGrid = generateValidSolutionGrid();

    // Step 2: Clear cells based on difficulty level to create the puzzle
    const cellsToClear = Math.floor(gridSize * gridSize * (1 - fillPercent));
    const puzzleGrid = createPuzzleByClearingCells(solutionGrid, cellsToClear);

    // Step 3: Render the puzzle onto the grid
    renderGrid(puzzleGrid);
}

// Generate a full valid solution for the grid using a backtracking approach
function generateValidSolutionGrid() {
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    fillGrid(grid);
    return grid;
}

// Helper function to fill the grid with a valid solution using backtracking
function fillGrid(grid) {
    const numbers = [...Array(gridSize).keys()].map(n => n + 1); // Numbers from 1 to gridSize

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === null) {
                shuffleArray(numbers); // Shuffle numbers for randomness
                for (let num of numbers) {
                    if (isSafeToPlace(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillGrid(grid)) return true;
                        grid[row][col] = null;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function createPuzzleByClearingCells(solutionGrid, cellsToClear) {
    const puzzleGrid = solutionGrid.map(row => [...row]);
    let cleared = 0;

    while (cleared < cellsToClear) {
        const row = Math.floor(Math.random() * gridSize);
        const col = Math.floor(Math.random() * gridSize);
        if (puzzleGrid[row][col] !== null) {
            puzzleGrid[row][col] = null;
            cleared++;
        }
    }
    return puzzleGrid;
}

// Check if placing a number is safe in a particular cell
function isSafeToPlace(grid, row, col, num) {
    const subGridSize = Math.sqrt(gridSize);

    for (let i = 0; i < gridSize; i++) {
        if (grid[row][i] === num || grid[i][col] === num) return false;
    }

    const startRow = row - (row % subGridSize);
    const startCol = col - (col % subGridSize);

    for (let r = startRow; r < startRow + subGridSize; r++) {
        for (let c = startCol; c < startCol + subGridSize; c++) {
            if (grid[r][c] === num) return false;
        }
    }

    return true;
}


// Render the puzzle grid in the HTML
function renderGrid(puzzleGrid) {
    sudokuGrid.innerHTML = ""; // Clear previous grid if any

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement("input");
            cell.type = "text";
            cell.className = "cell";
            cell.maxLength = 2;

            if (puzzleGrid[row][col] !== null) {
                cell.value = puzzleGrid[row][col];
                cell.classList.add("pre-filled"); // Add class for styling
                cell.readOnly = true; // Make it read-only to prevent editing
            }

            cell.addEventListener("click", () => {
                if (!cell.classList.contains("pre-filled")) { // Allow selection only for non-predefined cells
                    selectCell(cell);
                    showSelectionPanel();
                }
            });
            sudokuGrid.appendChild(cell);
        }
    }
}


sudokuGrid.addEventListener("click", event => {
    if (event.target.classList.contains("cell")) {
        selectCell(event.target);
        showSelectionPanel(); // Display panel when a cell is selected
    }
});

// Utility function to shuffle an array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}




function seededRandom(seed) {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function validateInput(cell) {
    const value = parseInt(cell.value);
    if (isNaN(value) || value < 1 || value > gridSize) {
        cell.classList.add("error");
        setTimeout(() => cell.classList.remove("error"), 300);
        cell.value = "";
        cell.classList.remove("hinted"); // Remove `.hinted` class when cleared
    } else {
        recordMove(cell, cell.value);
        clearConflictHighlights();
        checkConflicts(cell);
    }
}


function handleCellFocus(event) {
    currentFocusedCell = event.target;
    isInteractingWithPanel = false;
    selectionPanel.style.display = "flex";
    selectionPanel.style.left = `${event.target.offsetLeft}px`;
    selectionPanel.style.top = `${event.target.offsetTop + 50}px`;
}


function handleCellBlur() {
    setTimeout(() => {
        if (!isInteractingWithPanel && !selectionPanel.contains(document.activeElement)) {
            selectionPanel.style.display = "none";
        }
        isInteractingWithPanel = false; // Reset after handling
    }, 200);
}


function addCellEventListeners() {
    const cells = Array.from(sudokuGrid.children);
    cells.forEach(cell => {
        cell.addEventListener("click", () => {
            selectCell(cell); // Call selectCell on click
            showSelectionPanel();
        });
    });
}

function selectCell(cell) {
    clearHighlights(); // Clear any previous highlights
    cell.classList.add("selected"); // Highlight the selected cell

    const selectedValue = cell.value;
    if (selectedValue) {
        highlightMatchingNumbers(selectedValue); // Highlight all cells with the same value
    }

    currentFocusedCell = cell; // Set the current focused cell for future actions
}

// Highlight all cells with the same value as the selected cell
function highlightMatchingNumbers(value) {
    const cells = Array.from(sudokuGrid.children);
    cells.forEach(cell => {
        if (cell.value === value && value) {
            if (isConflicting(cell)) {
                cell.classList.add("conflict");
            } else {
                cell.classList.add("matching");
            }
        }
    });
}

sudokuGrid.addEventListener("click", event => {
    if (event.target.classList.contains("cell")) {
        selectCell(event.target);
        showSelectionPanel(); // Show the panel after selecting a cell
    }
});

// Clear all highlights when selection changes or action completes
function clearHighlights() {
    const cells = Array.from(sudokuGrid.children);
    cells.forEach(cell => cell.classList.remove("selected", "matching"));
}


// Function to show the selection panel
function showSelectionPanel() {
    console.log("Showing selection panel"); // Debug log
    selectionPanel.style.display = "flex";
}

// Adjust createSelectionPanel to add closing functionality after "Clear"
function createSelectionPanel(size = gridSize) {
    selectionPanel.innerHTML = ''; // Clear previous buttons

    // Generate number buttons based on grid size
    for (let i = 1; i <= size; i++) {
        const button = document.createElement("button");
        button.textContent = i;
        button.onclick = () => fillCell(i); // Fill cell with selected number
        button.classList.add("number-button");
        selectionPanel.appendChild(button);
    }

    // Add a "Clear" button with a check for predefined cells
    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear";
    clearButton.onclick = () => {
        if (currentFocusedCell && !currentFocusedCell.classList.contains("pre-filled")) {
            currentFocusedCell.value = ""; // Only clear if not predefined
            clearHighlights(); // Clear highlights
            selectionPanel.style.display = "none"; // Hide panel after clearing
        }
    };
    selectionPanel.appendChild(clearButton);
}





// Fill cell and close the panel after selection
function fillCell(value) {
    if (currentFocusedCell && !currentFocusedCell.classList.contains("pre-filled")) {
        recordMove(currentFocusedCell, currentFocusedCell.value); // Record move for undo
        currentFocusedCell.value = value;
        
        // Clear existing highlights and re-check conflicts
        clearHighlights();
        checkConflicts(currentFocusedCell); // Highlight conflicts immediately
        
        selectionPanel.style.display = "none"; // Hide panel after selection
    }
}





function recordMove(cell, oldValue, isHint = false) {
    movesStack.push({
        cell: cell,
        oldValue: oldValue,
        newValue: cell.value,
        wasHint: isHint
    });
}

function undoMove() {
    if (movesStack.length === 0) return; // Nothing to undo

    const lastMove = movesStack.pop();
    lastMove.cell.value = lastMove.oldValue; // Restore the old value

    // Remove hint styles if the last move was a hint
    if (lastMove.wasHint) {
        lastMove.cell.classList.remove("hinted", "hint");
    }
    
    clearConflictHighlights();
    checkConflicts(lastMove.cell);
}


function giveHint() {
    const cells = Array.from(sudokuGrid.children);
    const subGridSize = Math.sqrt(gridSize);
    let cellToHint = null;
    let minOptions = gridSize + 1;

    // Find a cell with the fewest possible values
    for (let cell of cells) {
        if (cell.value || cell.classList.contains("hinted")) continue;

        const possibleValues = getPossibleValues(cell, cells, subGridSize);

        if (possibleValues.size > 0 && possibleValues.size < minOptions) {
            minOptions = possibleValues.size;
            cellToHint = cell;
            cellToHint.possibleValues = Array.from(possibleValues);
        }
    }

    if (cellToHint && cellToHint.possibleValues.length > 0) {
        const hintValue = cellToHint.possibleValues[0];
        
        // Record the hint move with a flag to distinguish it
        recordMove(cellToHint, cellToHint.value, true);
        
        cellToHint.value = hintValue;
        cellToHint.classList.add("hint", "hinted");
    } else {
        document.getElementById("result").textContent = "No further hints available.";
    }
}




function hasUniqueSolution(cells) {
    const grid = cells.map(cell => parseInt(cell.value) || null);

    function solve(grid, solutions = { count: 0 }) {
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === null) { // Find first empty cell
                for (let num = 1; num <= gridSize; num++) {
                    if (isSafeToPlace(grid, i, num)) {
                        grid[i] = num;
                        solve(grid, solutions);
                        if (solutions.count > 1) return; // Stop early if more than one solution is found
                        grid[i] = null;
                    }
                }
                return;
            }
        }
        solutions.count++; // Solution found
    }

    const solutions = { count: 0 };
    solve(grid, solutions);
    return solutions.count === 1; // True if there is exactly one solution
}




// Helper function to get possible values for a cell considering current grid state
function getPossibleValues(cell, cells, subGridSize) {
    const possibleValues = new Set(Array.from({ length: gridSize }, (_, i) => i + 1));
    const cellIndex = cells.indexOf(cell);
    const row = Math.floor(cellIndex / gridSize);
    const col = cellIndex % gridSize;

    // Check row, column, and sub-grid for conflicts and remove those values
    cells.forEach((otherCell, index) => {
        const otherRow = Math.floor(index / gridSize);
        const otherCol = index % gridSize;
        const inSameRow = otherRow === row;
        const inSameCol = otherCol === col;
        const inSameSubGrid = Math.floor(otherRow / subGridSize) === Math.floor(row / subGridSize) &&
                              Math.floor(otherCol / subGridSize) === Math.floor(col / subGridSize);

        if ((inSameRow || inSameCol || inSameSubGrid) && otherCell.value) {
            possibleValues.delete(parseInt(otherCell.value));
        }
    });

    return possibleValues;
}

// Check if the given cell has conflicts in its row, column, or subgrid
function isConflicting(cell) {
    const cells = Array.from(sudokuGrid.children);
    const cellIndex = cells.indexOf(cell);
    const row = Math.floor(cellIndex / gridSize);
    const col = cellIndex % gridSize;
    const subGridSize = Math.sqrt(gridSize);
    const value = cell.value;

    // Check for conflicts in the row, column, and subgrid
    for (let i = 0; i < gridSize; i++) {
        const rowCell = cells[row * gridSize + i];
        const colCell = cells[i * gridSize + col];

        // Conflict in the same row or column
        if ((rowCell !== cell && rowCell.value === value) || (colCell !== cell && colCell.value === value)) {
            return true;
        }
    }

    // Check for conflicts in the subgrid
    const startRow = row - (row % subGridSize);
    const startCol = col - (col % subGridSize);

    for (let r = startRow; r < startRow + subGridSize; r++) {
        for (let c = startCol; c < startCol + subGridSize; c++) {
            const subGridCell = cells[r * gridSize + c];
            if (subGridCell !== cell && subGridCell.value === value) {
                return true; // Conflict found in the subgrid
            }
        }
    }

    return false; // No conflict found
}



function checkConflicts(cell) {
    const value = cell.value;
    if (!value) return;

    const cells = Array.from(sudokuGrid.children);
    const row = Math.floor(cells.indexOf(cell) / gridSize);
    const col = cells.indexOf(cell) % gridSize;
    const subGridSize = Math.sqrt(gridSize);

    cells.forEach((otherCell, index) => {
        const otherRow = Math.floor(index / gridSize);
        const otherCol = index % gridSize;
        const inSameRow = otherRow === row;
        const inSameCol = otherCol === col;
        const inSameSubGrid = Math.floor(otherRow / subGridSize) === Math.floor(row / subGridSize) &&
                              Math.floor(otherCol / subGridSize) === Math.floor(col / subGridSize);

        if ((inSameRow || inSameCol || inSameSubGrid) && otherCell.value === value && otherCell !== cell) {
            otherCell.classList.add("conflict");
            cell.classList.add("conflict");
        }
    });
}


function clearConflictHighlights() {
    const cells = Array.from(sudokuGrid.children);
    cells.forEach(cell => cell.classList.remove("conflict"));
}

function checkSolution() {
    const cells = Array.from(sudokuGrid.children);
    const subGridSize = Math.sqrt(gridSize);
    let valid = true;
    let allFilled = true; // Flag to ensure all cells are filled

    console.clear(); // Clear the console for fresh debugging output

    // Check rows and columns for duplicates and empty cells
    for (let i = 0; i < gridSize; i++) {
        const rowValues = new Set();
        const colValues = new Set();

        for (let j = 0; j < gridSize; j++) {
            const rowCell = cells[i * gridSize + j];
            const colCell = cells[j * gridSize + i];
            const rowCellValue = rowCell.value;
            const colCellValue = colCell.value;

            // Row validation
            if (rowCellValue) {
                if (rowValues.has(rowCellValue)) {
                    valid = false;
                    rowCell.classList.add("conflict");
                    console.log(`Row conflict in row ${i + 1}: Value ${rowCellValue} at cell [${i}, ${j}]`);
                } else {
                    rowValues.add(rowCellValue);
                }
            } else {
                allFilled = false; // Found an empty cell
            }

            // Column validation
            if (colCellValue) {
                if (colValues.has(colCellValue)) {
                    valid = false;
                    colCell.classList.add("conflict");
                    console.log(`Column conflict in column ${j + 1}: Value ${colCellValue} at cell [${j}, ${i}]`);
                } else {
                    colValues.add(colCellValue);
                }
            } else {
                allFilled = false; // Found an empty cell
            }
        }
    }

    // Check subgrids for duplicates and empty cells
    for (let rowStart = 0; rowStart < gridSize; rowStart += subGridSize) {
        for (let colStart = 0; colStart < gridSize; colStart += subGridSize) {
            const subGridValues = new Set();

            for (let r = rowStart; r < rowStart + subGridSize; r++) {
                for (let c = colStart; c < colStart + subGridSize; c++) {
                    const cell = cells[r * gridSize + c];
                    const cellValue = cell.value;

                    if (cellValue) {
                        if (subGridValues.has(cellValue)) {
                            valid = false;
                            cell.classList.add("conflict");
                            console.log(`Subgrid conflict at subgrid starting [${rowStart}, ${colStart}]: Value ${cellValue} at cell [${r}, ${c}]`);
                        } else {
                            subGridValues.add(cellValue);
                        }
                    } else {
                        allFilled = false; // Found an empty cell
                    }
                }
            }
        }
    }

    // Display result based on validation and filled cells
    if (valid && allFilled) {
        document.getElementById("result").textContent = "Congratulations, solution is correct!";
        updateScore();
        promptVictoryAndNextLevel();
    } else if (!allFilled) {
        document.getElementById("result").textContent = "Please fill in all cells.";
    } else {
        document.getElementById("result").textContent = "Incorrect solution. Try again.";
    }
}




function promptVictoryAndNextLevel() {
    setTimeout(() => {
        if (confirm("Congratulations! You solved the puzzle. Would you like to proceed to the next level?")) {
            // Award points based on the difficulty level
            const level = parseInt(document.getElementById("level-select")?.value || 1);
            addScoreBasedOnLevel(level);

            // Move to the next level
            seed += 1; // Increment the seed by 1
            seedInput.value = seed; // Update seed input field
            currentSeedDisplay.textContent = seed;
            generateSudoku(level);
            resetGameState(); // Do not reset the score
        }
    }, 100); // Small delay for a better user experience
}

// Award points based on difficulty level
function addScoreBasedOnLevel(level) {
    let points;
    switch (level) {
        case 1: // Easy
            points = 10;
            break;
        case 2: // Medium
            points = 50;
            break;
        case 3: // Hard
            points = 100;
            break;
        default:
            points = 0;
    }
    score += points;
    scoreDisplay.textContent = score;
}


function updateScore() {
    score += 1;
    scoreDisplay.textContent = score;
}

function resetGameState(resetScore = false) {
    movesStack = [];
    if (resetScore) {
        score = 0;
    }
    scoreDisplay.textContent = score;
    document.getElementById("result").textContent = "";
}

function startNewGame() {
    seed = 1;
    setSeed(); // Set the initial level and grid
    resetGameState(true); // Reset the score when starting a new game
}


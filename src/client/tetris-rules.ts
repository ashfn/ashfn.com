// Tetris rules for the home page's hidden game. No DOM or canvas in here, so
// the mechanics (collision, rotation, line clears, scoring) can be tested.


// Each piece is a list of rotation states, given as filled cell coordinates in
// its own box. Rotation states are pre-baked rather than computed, so kicks
// stay predictable.
const BASE: Record<string, number[][]> = {
  // The seven standard tetrominoes
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 0], [2, 0], [1, 1], [2, 1]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],

  // Extras: two small pieces to plug gaps, four larger ones to fight with
  D: [[0, 0]],                                          // single block
  i: [[0, 1], [1, 1], [2, 1]],                          // three in a row
  V: [[0, 0], [0, 1], [1, 1]],                          // corner
  U: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],          // cup
  X: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],          // plus
  P: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],          // fat L
};

const BOX: Record<string, number> = {
  I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3,
  D: 1, i: 3, V: 2, U: 3, X: 3, P: 3,
};

export type PieceType = keyof typeof BASE;
export const PIECES = Object.keys(BASE) as PieceType[];

function rotateCells(cells: number[][], box: number): number[][] {
  // Clockwise: (x, y) -> (box - 1 - y, x)
  return cells.map(([x, y]) => [box - 1 - y, x]);
}

// Anchor every rotation to the top-left of its own bounding box, so a piece
// turns in place instead of drifting sideways (an O would otherwise shuffle a
// cell diagonally each time it was rotated).
function normalise(cells: number[][]): number[][] {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}

const ROTATIONS: Record<string, number[][][]> = {};
for (const type of PIECES) {
  const states: number[][][] = [BASE[type]];
  for (let i = 1; i < 4; i++) states.push(rotateCells(states[i - 1], BOX[type]));
  ROTATIONS[type] = states.map(normalise);
}

export interface Piece {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
}

export interface Game {
  cols: number;
  rows: number;
  board: (PieceType | null)[][];
  piece: Piece;
  next: PieceType;
  score: number;
  lines: number;
  level: number;
  over: boolean;
  dropTimer: number;
}

export const cellsOf = (piece: Piece): number[][] =>
  ROTATIONS[piece.type][piece.rotation % 4].map(([x, y]) => [piece.x + x, piece.y + y]);

const emptyBoard = (cols: number, rows: number): (PieceType | null)[][] =>
  Array.from({ length: rows }, () => Array<PieceType | null>(cols).fill(null));

const randomPiece = (): PieceType => PIECES[Math.floor(Math.random() * PIECES.length)];

// Spawn roughly centred, whatever the well's width is
const spawn = (type: PieceType, cols: number): Piece => ({
  type,
  rotation: 0,
  x: Math.max(0, Math.floor(cols / 2) - 2),
  y: 0,
});

export function collides(board: (PieceType | null)[][], piece: Piece): boolean {
  const rows = board.length;
  const cols = board[0].length;
  for (const [x, y] of cellsOf(piece)) {
    if (x < 0 || x >= cols || y >= rows) return true;
    if (y >= 0 && board[y][x]) return true;
  }
  return false;
}

export function createGame(cols: number, rows: number): Game {
  return {
    cols,
    rows,
    board: emptyBoard(cols, rows),
    piece: spawn(randomPiece(), cols),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    over: false,
    dropTimer: 0,
  };
}

/** Seconds between automatic drops at the current level. */
export const dropInterval = (level: number): number =>
  Math.max(0.09, 0.8 - (level - 1) * 0.07);

export function move(game: Game, dx: number): boolean {
  if (game.over) return false;
  const candidate = { ...game.piece, x: game.piece.x + dx };
  if (collides(game.board, candidate)) return false;
  game.piece = candidate;
  return true;
}

export function rotate(game: Game, dir: 1 | -1 = 1): boolean {
  if (game.over) return false;
  const rotation = (game.piece.rotation + (dir === 1 ? 1 : 3)) % 4;
  // Try the rotation in place first, then nudge sideways (simple wall kicks)
  for (const dx of [0, -1, 1, -2, 2]) {
    const candidate = { ...game.piece, rotation, x: game.piece.x + dx };
    if (!collides(game.board, candidate)) {
      game.piece = candidate;
      return true;
    }
  }
  return false;
}

function lockPiece(game: Game): void {
  for (const [x, y] of cellsOf(game.piece)) {
    if (y < 0) {
      // Locked out above the board
      game.over = true;
      return;
    }
    game.board[y][x] = game.piece.type;
  }

  const kept = game.board.filter((row) => row.some((cell) => cell === null));
  const cleared = game.rows - kept.length;
  if (cleared > 0) {
    const table = [0, 100, 300, 500, 800];
    game.score += table[Math.min(cleared, 4)] * game.level;
    game.lines += cleared;
    game.level = Math.floor(game.lines / 10) + 1;
    while (kept.length < game.rows) kept.unshift(Array<PieceType | null>(game.cols).fill(null));
    game.board = kept;
  }

  game.piece = spawn(game.next, game.cols);
  game.next = randomPiece();
  if (collides(game.board, game.piece)) game.over = true;
}

/** One step down. Returns false if the piece landed instead of moving. */
export function softDrop(game: Game, scoring = false): boolean {
  if (game.over) return false;
  const candidate = { ...game.piece, y: game.piece.y + 1 };
  if (collides(game.board, candidate)) {
    lockPiece(game);
    return false;
  }
  game.piece = candidate;
  if (scoring) game.score += 1;
  return true;
}

export function hardDrop(game: Game): void {
  if (game.over) return;
  let distance = 0;
  while (!collides(game.board, { ...game.piece, y: game.piece.y + 1 })) {
    game.piece = { ...game.piece, y: game.piece.y + 1 };
    distance++;
  }
  game.score += distance * 2;
  lockPiece(game);
}

/** Advances gravity. Call once per frame with the elapsed seconds. */
export function tick(game: Game, dt: number): void {
  if (game.over) return;
  game.dropTimer += dt;
  const interval = dropInterval(game.level);
  while (game.dropTimer >= interval && !game.over) {
    game.dropTimer -= interval;
    softDrop(game);
  }
}

/** Row the piece would land on, for the drop shadow. */
export function ghostY(game: Game): number {
  let y = game.piece.y;
  while (!collides(game.board, { ...game.piece, y: y + 1 })) y++;
  return y;
}

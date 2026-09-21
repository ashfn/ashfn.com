interface Position {
  x: number;
  y: number;
}

interface GameState {
  snake: Position[];
  food: Position;
  direction: Position;
  isGameActive: boolean;
  isGameOver: boolean;
  isStarting: boolean;
  score: number;
}

const GRID_WIDTH = 20;
const GRID_HEIGHT = 4;
const CHAR_WIDTH = 10;

const FONT_4X4: { [key: string]: boolean[][] } = {
  S: [
    [false, true, true, false],
    [true, false, false, false],
    [false, true, true, false],
    [false, false, false, true]
  ],
  N: [
    [true, false, false, true],
    [true, true, false, true],
    [true, false, true, true],
    [true, false, false, true]
  ],
  A: [
    [false, true, true, false],
    [true, false, false, true],
    [true, true, true, true],
    [true, false, false, true]
  ],
  K: [
    [true, false, false, true],
    [true, false, true, false],
    [true, true, false, false],
    [true, false, true, false]
  ],
  E: [
    [true, true, true, true],
    [true, false, false, false],
    [true, true, true, false],
    [true, true, true, true]
  ]
};

const isGameTitle = (title: string): boolean =>
  /[\u2800-\u28FF]/.test(title) || title === 'GAME OVER';

const renderText = (text: string): boolean[][] => {
  const grid: boolean[][] = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(false));
  const textWidth = text.length * 4;
  const startX = Math.max(0, Math.floor((GRID_WIDTH - textWidth) / 2));
  for (let i = 0; i < text.length; i++) {
    const pattern = FONT_4X4[text[i]];
    if (pattern) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const x = startX + (i * 4) + col;
          if (x < GRID_WIDTH && pattern[row][col]) grid[row][x] = true;
        }
      }
    }
  }
  return grid;
};

const gridToBraille = (snake?: Position[], food?: Position, textGrid?: boolean[][]): string => {
  let grid: boolean[][];
  if (textGrid) {
    grid = textGrid;
  } else {
    grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(false));
    if (snake) {
      snake.forEach(({ x, y }) => {
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) grid[y][x] = true;
      });
    }
    if (food && food.x >= 0 && food.x < GRID_WIDTH && food.y >= 0 && food.y < GRID_HEIGHT) {
      grid[food.y][food.x] = true;
    }
  }
  let result = '';
  for (let charX = 0; charX < CHAR_WIDTH; charX++) {
    let brailleCode = 0x2800;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const gridX = charX * 2 + col;
        if (gridX < GRID_WIDTH && row < GRID_HEIGHT && grid[row][gridX]) {
          const dotMapping = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
          brailleCode |= dotMapping[row][col];
        }
      }
    }
    result += String.fromCharCode(brailleCode);
  }
  return result;
};

const generateFood = (snake: Position[]): Position => {
  let newFood: Position;
  do {
    newFood = { x: Math.floor(Math.random() * GRID_WIDTH), y: Math.floor(Math.random() * GRID_HEIGHT) };
  } while (snake.some(s => s.x === newFood.x && s.y === newFood.y));
  return newFood;
};

const checkCollision = (head: Position, snake: Position[]): boolean => {
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  return false;
};

const wrapPosition = (pos: Position): Position => ({
  x: ((pos.x % GRID_WIDTH) + GRID_WIDTH) % GRID_WIDTH,
  y: ((pos.y % GRID_HEIGHT) + GRID_HEIGHT) % GRID_HEIGHT
});

const INITIAL_STATE: GameState = {
  snake: [{ x: 10, y: 2 }],
  food: { x: 15, y: 2 },
  direction: { x: 1, y: 0 },
  isGameActive: false,
  isGameOver: false,
  isStarting: false,
  score: 0
};


export function start(done: () => void) {
  const title = document.title;
  let state: GameState = { ...INITIAL_STATE, snake: [...INITIAL_STATE.snake], isStarting: true };
  let high = 0;
  let hasScored = false;
  try { high = Number(localStorage.getItem('snakeHighScore')) || 0; } catch {}
  let interval: ReturnType<typeof setInterval> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const message = document.createElement('div');
  message.className = 'fixed bottom-16 right-4 text-right text-sm text-[var(--foreground)] opacity-50';
  document.body.append(message);
  const display = () => {
    message.hidden = innerWidth < 768 || state.isStarting;
    message.replaceChildren();
    const line = (text: string) => { const div = document.createElement('div'); div.textContent = text; message.append(div); };
    if (hasScored || high > 0) {
      line(`Score: ${state.score}`);
      if (high > 0) line(`High: ${high}`);
    } else line('Look at the tab! Use arrow keys or WASD');
  };
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval); clearTimeout(timer);
    document.title = title;
    message.remove();
    removeEventListener('resize', display);
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibility);
    removeEventListener('pagehide', cleanup);
    done();
  };
  const finish = () => {
    clearInterval(interval);
    state.isGameActive = false;
    state.isGameOver = true;
    if (state.score > high) {
      try { localStorage.setItem('snakeHighScore', String(state.score)); } catch {}
    }
    document.title = 'GAME OVER';
    (window as Window & { umami?: { track: (event: string, data: unknown) => void } }).umami?.track('snake-played', {});
    timer = setTimeout(cleanup, 3000);
  };
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') { cleanup(); return; }
    if (!state.isGameActive || event.ctrlKey || event.metaKey || event.altKey) return;
    const directions: Record<string, Position> = {
      ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
    };
    const direction = directions[event.code];
    if (!direction) return;
    event.preventDefault();
    const head = state.snake[0];
    const neck = state.snake[1];
    const next = wrapPosition({ x: head.x + direction.x, y: head.y + direction.y });
    if (neck && next.x === neck.x && next.y === neck.y) return;
    state.direction = direction;
  }
  function visibility() { if (document.hidden) cleanup(); }
  document.title = gridToBraille(undefined, undefined, renderText('SNAKE'));
  display();
  document.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility);
  addEventListener('resize', display);
  addEventListener('pagehide', cleanup, { once: true });
  timer = setTimeout(() => {
    state.isStarting = false; state.isGameActive = true;
    state.food = generateFood(state.snake);
    document.title = gridToBraille(state.snake, state.food);
    display();
    interval = setInterval(() => {
      const head = wrapPosition({ x: state.snake[0].x + state.direction.x, y: state.snake[0].y + state.direction.y });
      if (checkCollision(head, state.snake)) { finish(); return; }
      state.snake.unshift(head);
      if (head.x === state.food.x && head.y === state.food.y) {
        state.score++; hasScored = true;
        // Avoid an infinite food search if every cell is occupied.
        if (state.snake.length === GRID_WIDTH * GRID_HEIGHT) { finish(); return; }
        state.food = generateFood(state.snake);
      } else state.snake.pop();
      document.title = gridToBraille(state.snake, state.food);
      display();
    }, 300);
  }, 2000);
}

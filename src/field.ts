type Coord = [number, number];
type DirectionName = 'left' | 'right' | 'up' | 'down';

class Direction {
    readonly x: number;
    readonly y: number;
    allowedDirections: Direction[];
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.allowedDirections = [];
    }
    incrementCoord(coord: Coord) {
        coord[0] += this.x;
        coord[1] += this.y;
    }
}

const directions: Record<DirectionName, Direction> = {
    left: new Direction(-1, 0),
    right: new Direction(1, 0),
    up: new Direction(0, -1),
    down: new Direction(0, 1),
};

// Only allow perpendicular directions. Snake cannot double back.
directions.left.allowedDirections = [directions.up, directions.down];
directions.right.allowedDirections = [directions.up, directions.down];
directions.up.allowedDirections = [directions.left, directions.right];
directions.down.allowedDirections = [directions.left, directions.right];

enum GameState {
    Splash,
    Playing,
    GameOver,
}

/**
 * Manages the play field for the game.
 * All the game pieces live here.
 */
class Field {
    static readonly width = 32;
    static readonly height = 18;

    private static readonly snakeStartLength = 5;

    private static readonly elements = {
        empty:      0x00,
        snakeBody:  0x20,
        snakeHead:  0x40,
        fruit:      0x80,
        wall:       0xd0,
    };

    /**
     * Coords outside field dimensions will be wrapped to valid space.
     */
    private static wrapCoord(x: number, y: number): Coord {
        x %= Field.width;
        y %= Field.height;
        return [x < 0 ? Field.width - x : x, y < 0 ? Field.height - y : y];
    }

    private static coordToIndex(x: number, y: number): number {
        [x, y] = Field.wrapCoord(x, y);
        return y * Field.width + x;
    }

    private static indexToCoord(i: number): Coord {
        return [i % Field.width, Math.trunc(i / Field.width)];
    }

    readonly data: Uint8Array;
    private gameState: GameState;
    private snakeLength: number;
    private snake: Coord[];
    private snakeDirection: Direction;

    constructor() {
        this.gameState = GameState.Splash;
        this.data = new Uint8Array(Field.width * Field.height);

        this.initField();

        // set some test data
        const d = this.data;
        d[32 + 4] = Field.elements.snakeBody;
        d[32 + 5] = Field.elements.snakeHead;
        d[32 + 16] = Field.elements.wall;
        d[32 + 17] = Field.elements.fruit;
    }

    private getCell(x: number, y: number): number {
        return this.data[Field.coordToIndex(x, y)];
    }

    private setCell(x: number, y: number, value: number): void {
        this.data[Field.coordToIndex(x, y)] = value;
    }

    private setWalls(): void {
        const wall = Field.elements.wall;
        for (let column = Field.width; column-- > 0;) {
            this.setCell(column, 0, wall);
            this.setCell(column, Field.height - 1, wall);
        }
        for (let row = Field.height - 1; row-- > 1;) {
            this.setCell(0, row, wall);
            this.setCell(Field.width - 1, row, wall);
        }
    }

    /**
     * Empty the play area and add walls.
     */
    private initField(): void {
        this.data.fill(Field.elements.empty);
        this.setWalls();
    }

    /**
     * Select a random place and direction for the snake,
     * that will give clearance at the start of the game.
     *
     * @param directions - which directions to choose from.
     * @param reqSpace - how much space to require in selected direction.
     */
    private placeSnake(directions: Direction[], reqSpace: number): void {
        const space = Field.elements.empty;
        // TODO: possibly shuffle directions here?
        while (true) {
            // pick a random empty square
            let startCoord: Coord;
            do {
                startCoord = Field.indexToCoord(
                    Math.trunc(Math.random() * this.data.length));
            } while (this.getCell(...startCoord) != space)
            // search for direction with required space
            for (const dir of directions) {
                let nextCoord: Coord = [...startCoord];
                let clearance = 0;
                for (;clearance < reqSpace; clearance++) {
                    dir.incrementCoord(nextCoord);
                    if (this.getCell(...nextCoord) != space) {
                        break;
                    }
                }
                // Got a hit?
                if (clearance == reqSpace) {
                    // TODO: possibly return this data instead,
                    // in case we want to setup multiple snakes.
                    this.snake = [startCoord];
                    this.snakeDirection = dir;
                    return;
                }
            }
        }
    }

    startGame(): void {
        if (this.gameState != GameState.Playing) {
            this.initField();
            this.snakeLength = Field.snakeStartLength;
            this.placeSnake([directions.left, directions.right], 4);
        }
    }

    turnSnake(directionName: DirectionName): void {
        if (this.gameState == GameState.Playing) {
            const targetDir = directions[directionName];
            if (this.snakeDirection.allowedDirections.includes(targetDir)) {
                this.snakeDirection = targetDir;
                // TODO: take a step
            }
        }
    }

    /**
     * Updates the game state for a frame.
     *
     * @returns true if redraw required, otherwise false.
     */
    update(): boolean {
        switch (this.gameState) {
            case GameState.Playing:
                // TODO: do the game!
                break;
        }
        return true;
    }
}

export { Field };

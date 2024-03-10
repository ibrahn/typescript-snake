import { Coord, Field } from "./field";

type DirectionName = 'left' | 'right' | 'up' | 'down';

enum GameState {
    Running,
    GameOver,
}

class Direction {
    readonly x: number;
    readonly y: number;
    blockedDirections: Direction[];
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.blockedDirections = [];
    }
    move(coord: Coord): Coord {
        return [coord[0] + this.x, coord[1] + this.y];
    }
}

const directions: Record<DirectionName, Direction> = {
    left: new Direction(-1, 0),
    right: new Direction(1, 0),
    up: new Direction(0, -1),
    down: new Direction(0, 1),
};

// Do not allow opposite direction. Snake cannot double back.
directions.left.blockedDirections = [directions.right];
directions.right.blockedDirections = [directions.left];
directions.up.blockedDirections = [directions.down];
directions.down.blockedDirections = [directions.up];

class Game {
    private static readonly snakeStartLength = 5;
    private static readonly elements = {
        space:      0x00,
        snakeBody:  0x20,
        snakeHead:  0x40,
        snakeChomp: 0x60,
        fruit:      0x80,
        wall:       0xd0,
    };

    private readonly field = new Field();
    private snakeLength = 5;
    private readonly snake: Coord[] = [];
    private snakeDirection: Direction;
    private inputQueue: DirectionName[] = [];
    private gameState: GameState = GameState.Running;

    constructor() {
        this.setWalls();
        this.placeFruit();
        const [startPos, startDir] =
            this.findSnakeStart([directions.left, directions.right], 4);
        this.snake.push(startPos);
        this.snakeDirection = startDir;
        this.field.setCell(...startPos, Game.elements.snakeHead);
    }

    playerInput(directionName: DirectionName): void {
        this.inputQueue.push(directionName);
    }

    /**
     * Add walls to the play field.
     */
    private setWalls(): void {
        const wall = Game.elements.wall;
        const field = this.field;
        for (let column = Field.width; column-- > 0;) {
            field.setCell(column, 0, wall);
            field.setCell(column, Field.height - 1, wall);
        }
        for (let row = Field.height - 1; row-- > 1;) {
            field.setCell(0, row, wall);
            field.setCell(Field.width - 1, row, wall);
        }
    }

    private placeFruit(): void {
        let fruitCoord: Coord;
        do {
            fruitCoord = Field.randomCoord();
        } while (this.field.getCell(...fruitCoord) != Game.elements.space);
        this.field.setCell(...fruitCoord, Game.elements.fruit);
    }

    /**
     * Select a random place and direction for the snake,
     * that will give clearance at the start of the game.
     *
     * @param directions - which directions to choose from.
     * @param reqSpace - how much space to require in selected direction.
     *
     * @return coordinate and direction
     */
    private findSnakeStart(directions: Direction[], reqSpace: number):
            [Coord, Direction] {
        const space = Game.elements.space;
        // TODO: possibly shuffle directions here?
        while (true) {
            // pick a random empty square
            let startCoord: Coord;
            do {
                startCoord = Field.randomCoord();
            } while (this.field.getCell(...startCoord) != space);
            // search for direction with required space
            for (const dir of directions) {
                let nextCoord: Coord = [...startCoord];
                let clearance = 0;
                for (;clearance < reqSpace; clearance++) {
                    nextCoord = dir.move(nextCoord);
                    if (this.field.getCell(...nextCoord) != space) {
                        break;
                    }
                }
                // Got a hit?
                if (clearance == reqSpace) {
                    return [startCoord, dir];
                }
            }
        }
    }

    private snakeStep(): void {
        const field = this.field
        const oldHead = this.snake[0];
        const newHead = this.snakeDirection.move(oldHead);
        const target = field.getCell(...newHead);
        if (target == Game.elements.fruit) {
            this.snakeLength++;
            this.placeFruit();
            field.setCell(...newHead, Game.elements.snakeChomp);
        } else if (target != Game.elements.space) {
            // TODO: snake death
            this.gameState = GameState.GameOver;
            return;
        } else {
            field.setCell(...newHead, Game.elements.snakeHead);
        }
        this.snake.unshift(newHead);
        field.setCell(...oldHead, Game.elements.snakeBody);
        while (this.snake.length > this.snakeLength) {
            const oldTail = this.snake.pop();
            field.setCell(...oldTail, Game.elements.space);
        }
    }

    private turnSnake(directionName: DirectionName): void {
        const targetDir = directions[directionName];
        const blocked = this.snakeDirection.blockedDirections;
        if (!blocked.includes(targetDir)) {
            this.snakeDirection = targetDir;
            this.snakeStep();
        }
    }

    /**
     * Updates the game state for a frame.
     *
     * @returns true if redraw required, otherwise false.
     */
    update(): boolean {
        switch (this.gameState) {
            case GameState.Running:
                for (const dir of this.inputQueue) {
                    this.turnSnake(dir);
                }
                this.inputQueue = [];
                break;
        }
        return true;
    }

    get displayData(): Uint8Array {
        return this.field.data;
    }

    get score(): number {
        return this.snakeLength - Game.snakeStartLength;
    }

    get state(): GameState {
        return this.gameState;
    }
}

export { DirectionName, Game, GameState };

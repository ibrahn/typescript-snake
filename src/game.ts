import { Coord, Field } from "./field";
import { GameElements } from "./game-elements";
import { levelList, levelTextMapping } from "./levels";

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
        return Field.wrapCoord(coord[0] + this.x, coord[1] + this.y);
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

/**
 * Runs a round.
 */
class Game {
    private static readonly snakeStartLength = 5;
    private static readonly minAutoStepDelay = 0.1;
    private static readonly maxAutoStepDelay = 0.6;

    private readonly field = new Field();
    private snakeLength = 5;
    private readonly snake: Coord[] = [];
    private snakeDirection: Direction;
    private inputQueue: DirectionName[] = [];
    private gameState: GameState = GameState.Running;
    private autoStepDelay: number = 0;

    constructor() {
        this.loadRandomLevel();
        this.placeFruit();
        const [startPos, startDir] =
            this.findSnakeStart([directions.left, directions.right], 4);
        this.snake.push(startPos);
        this.snakeDirection = startDir;
        this.field.setCell(...startPos, GameElements.SnakeHead);
    }

    playerInput(directionName: DirectionName): void {
        this.inputQueue.push(directionName);
    }

    private loadRandomLevel(): void {
        const levelIndex = Math.floor(Math.random() * levelList.length);
        this.field.paste(levelList[levelIndex], levelTextMapping);
    }

    private placeFruit(): void {
        let fruitCoord: Coord;
        do {
            fruitCoord = Field.randomCoord();
        } while (this.field.getCell(...fruitCoord) != GameElements.Space);
        this.field.setCell(...fruitCoord, GameElements.Fruit);
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
        const space = GameElements.Space;
        // shuffle direction options
        directions = [...directions];
        for (let i = directions.length; i-- > 0;) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
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

    private setAutoStepDelay(): void {
        const minDelay = 0.08;
        const maxDelay = 0.3;
        const minLen = 5;
        const maxLen = 80;
        const len = Math.max(minLen, Math.min(this.snakeLength, maxLen));
        const mul = 1 - (len - minLen) / (maxLen - minLen);
        const delay = (maxDelay - minDelay) * mul + minDelay;
        this.autoStepDelay = delay;
    }

    private snakeStep(): void {
        const field = this.field
        const oldHead = this.snake[0];
        const newHead = this.snakeDirection.move(oldHead);
        const target = field.getCell(...newHead);
        if (target == GameElements.Fruit) {
            this.snakeLength++;
            this.placeFruit();
            field.setCell(...newHead, GameElements.SnakeChomp);
        } else if (target != GameElements.Space) {
            // TODO: snake death
            this.gameState = GameState.GameOver;
            return;
        } else {
            field.setCell(...newHead, GameElements.SnakeHead);
        }
        this.snake.unshift(newHead);
        field.setCell(...oldHead, GameElements.SnakeBody);
        while (this.snake.length > this.snakeLength) {
            const oldTail = this.snake.pop();
            field.setCell(...oldTail, GameElements.Space);
        }
        this.setAutoStepDelay();
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
     * @param delta - time since last frame, in seconds.
     *
     * @returns true if redraw required, otherwise false.
     */
    update(delta: number): boolean {
        switch (this.gameState) {
            case GameState.Running:
                let moved = this.inputQueue.length > 0;
                for (const direction of this.inputQueue) {
                    this.turnSnake(direction);
                }
                this.inputQueue = [];
                if (!moved) {
                    this.autoStepDelay -= delta;
                    if (this.autoStepDelay < 0) {
                        this.snakeStep();
                        moved = true;
                    }
                }
                return moved;
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

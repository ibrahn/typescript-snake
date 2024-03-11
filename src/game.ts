import { Coord, Field } from "./field";
import { BaseScreen, ScreenMsg, ScreenMsgType } from "./screen";
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

const directionInput: Record<string, Direction> = {
    ArrowLeft: directions.left,
    ArrowRight: directions.right,
    ArrowUp: directions.up,
    ArrowDown: directions.down,
}

/**
 * Runs a round.
 */
class Game extends BaseScreen {
    private static readonly snakeStartLength = 5;
    private static readonly minAutoStepDelay = 0.1;
    private static readonly maxAutoStepDelay = 0.6;

    private snakeLength = 5;
    private readonly snake: Coord[] = [];
    private snakeDirection: Direction;
    private inputQueue: Direction[] = [];
    private gameState: GameState = GameState.Running;
    private autoStepDelay: number = 0;

    constructor() {
        super();
        this.loadRandomLevel();
        this.placeFruit();
        const [startPos, startDir] =
            this.findSnakeStart([directions.left, directions.right], 4);
        this.snake.push(startPos);
        this.snakeDirection = startDir;
        this.displayField.setCell(...startPos, GameElements.SnakeHead);
    }

    input(e: KeyboardEvent): void {
        if (e.key in directionInput) {
            this.inputQueue.push(directionInput[e.key]);
            e.preventDefault();
        }
    }

    private loadRandomLevel(): void {
        const levelIndex = Math.floor(Math.random() * levelList.length);
        this.displayField.paste(levelList[levelIndex], levelTextMapping);
    }

    private placeFruit(): void {
        let fruitCoord: Coord;
        do {
            fruitCoord = Field.randomCoord();
        } while (this.displayField.getCell(...fruitCoord) != GameElements.Space);
        this.displayField.setCell(...fruitCoord, GameElements.Fruit);
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
            } while (this.displayField.getCell(...startCoord) != space);
            // search for direction with required space
            for (const dir of directions) {
                let nextCoord: Coord = [...startCoord];
                let clearance = 0;
                for (;clearance < reqSpace; clearance++) {
                    nextCoord = dir.move(nextCoord);
                    if (this.displayField.getCell(...nextCoord) != space) {
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
        const field = this.displayField;
        const oldHead = this.snake[0];
        const newHead = this.snakeDirection.move(oldHead);
        const target = field.getCell(...newHead);
        if (target == GameElements.Fruit) {
            this.snakeLength++;
            this.placeFruit();
            // Introduce extra fruit for certain scores.
            if (this.score == 20 || this.score == 70) {
                this.placeFruit();
            }
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

    private turnSnake(targetDir: Direction): void {
        const blocked = this.snakeDirection.blockedDirections;
        if (!blocked.includes(targetDir)) {
            this.snakeDirection = targetDir;
            this.snakeStep();
        }
    }

    /**
     * @param delta - time since last frame, in seconds.
     *
     * @returns A ScreenMsg if something important happens otherwise null.
     */
    update(delta: number): ScreenMsg {
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
                if (moved) {
                    return { msg: ScreenMsgType.redraw };
                }
                break;
            case GameState.GameOver:
                return { msg: ScreenMsgType.gameover, data: this.score };
        }
    }

    get score(): number {
        return this.snakeLength - Game.snakeStartLength;
    }

    get state(): GameState {
        return this.gameState;
    }
}

export { DirectionName, Game, GameState };

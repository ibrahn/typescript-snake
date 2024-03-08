/**
 * Manages the play field for the game.
 * All the game pieces live here.
 */
class Field {
    static readonly width = 32;
    static readonly height = 18;
    private static readonly elements = {
        background: 0x00,
        snakeBody:  0x20,
        snakeHead:  0x40,
        fruit:      0x80,
        wall:       0xd0,
    };

    readonly data: Uint8Array;

    constructor() {
        this.data = new Uint8Array(Field.width * Field.height);

        this.initField();

        // set some test data
        const d = this.data;
        d[32 + 4] = Field.elements.snakeBody;
        d[32 + 5] = Field.elements.snakeHead;
        d[32 + 16] = Field.elements.wall;
        d[32 + 17] = Field.elements.fruit;
    }

    private setWalls(): void {
        const data = this.data;
        const bottomRowOffset = Field.width * (Field.height - 1);
        const wall = Field.elements.wall;
        const [width, height] = [Field.width, Field.height];
        for (let column = width; column-- > 0;) {
            data[column] = wall;
            data[column + bottomRowOffset] = wall;
        }
        for (let row = height; row-- > 0;) {
            data[row * width] = wall;
            data[row * width + width - 1] = wall;
        }
    }

    private initField(): void {
        this.data.fill(0);
        this.setWalls();
    }

    /**
     * Updates the game state for a frame.
     *
     * @returns true if redraw required, otherwise false.
     */
    update(): boolean {
        // TODO: do the game!
        return true;
    }
}

export { Field };

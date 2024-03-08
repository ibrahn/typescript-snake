/**
 * Manages the play field for the game.
 * All the game pieces live here.
 */
class Field {
    static readonly width = 32;
    static readonly height = 16;
    private static readonly elements = {
        background: 0x00,
        snakeBody:  0x20,
        snakeHead:  0x40,
        fruit:      0x80,
        wall:       0xc0,
    };

    readonly data: Uint8Array;

    constructor() {
        this.data = new Uint8Array(Field.width * Field.height);
        // set some test data
        const d = this.data;
        d[4] = Field.elements.snakeBody;
        d[5] = Field.elements.snakeHead;
        d[16] = Field.elements.wall;
        d[17] = Field.elements.fruit;
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

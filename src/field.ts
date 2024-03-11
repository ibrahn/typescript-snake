type Coord = [number, number];
type MappingAction = number | (() => number);
type TextToFieldMapping = Record<string, MappingAction>;
/**
 * Wraps a Uint8Array with 2D indexing.
 */
class Field {
    static readonly width = 32;
    static readonly height = 18;

    /**
     * Coords outside field dimensions will be wrapped to valid space.
     */
    static wrapCoord(x: number, y: number): Coord {
        x %= Field.width;
        y %= Field.height;
        return [x < 0 ? Field.width - x : x, y < 0 ? Field.height - y : y];
    }

    static randomCoord(): Coord {
        return [Math.trunc(Math.random() * Field.width),
            Math.trunc(Math.random() * Field.height)];
    }

    private static coordToIndex(x: number, y: number): number {
        [x, y] = Field.wrapCoord(x, y);
        return y * Field.width + x;
    }

    private static indexToCoord(i: number): Coord {
        return [i % Field.width, Math.trunc(i / Field.width)];
    }

    readonly data: Uint8Array;

    constructor() {
        this.data = new Uint8Array(Field.width * Field.height);
    }

    getCell(x: number, y: number): number {
        return this.data[Field.coordToIndex(x, y)];
    }

    setCell(x: number, y: number, value: number): void {
        this.data[Field.coordToIndex(x, y)] = value;
    }

    clear(value: number = 0): void {
        this.data.fill(value);
    }

    /**
     * Set data from text.
     *
     * @param text - source text.
     * @param mapping - conversion map of characters to cell values.
     * @param xOffset - horizontal position to paste at.
     * @param yOffset - vertical position to paste at.
     */
    paste(text: string, mapping: TextToFieldMapping,
            xOffset: number = 0, yOffset: number = 0) {
        const data = this.data;
        const lines = text.split('\n');
        lines.forEach((line, y) => {
            line.split('').forEach((ch, x) => {
                const m = mapping[ch];
                this.setCell(x + xOffset, y + yOffset,
                    typeof m === 'number' ? m : m());
            });
        });
    }
}

export { Coord, Field };

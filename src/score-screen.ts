import { Coord, Field } from "./field";
import { BaseScreen } from "./screen";

const digitSrcMapping = { '.': 0, '#': 0x32 };
const digits = [
// 0
`
###
#.#
#.#
#.#
###
`.trim(),
// 1
`
##.
.#.
.#.
.#.
###
`.trim(),
// 2
`
###
..#
###
#..
###
`.trim(),
// 3
`
###
..#
###
..#
###
`.trim(),
// 4
`
#.#
#.#
###
..#
..#
`.trim(),
// 5
`
###
#..
###
..#
###
`.trim(),
// 6
`
###
#..
###
#.#
###
`.trim(),
// 7
`
###
..#
..#
..#
..#
`.trim(),
// 8
`
###
#.#
###
#.#
###
`.trim(),
// 9
`
###
#.#
###
..#
###
`.trim(),
];

class ScoreScreen extends BaseScreen {

    constructor(score: number) {
        super();
        const scoreStr = "" + score;
        const digitCount = scoreStr.length;
        const width = digitCount * 4;
        const y = Math.floor(Field.height/ 2) - 3;
        let x = Math.floor((Field.width - width) / 2);
        const field = this.displayField;
        for (const c of scoreStr) {
            field.paste(digits[Number(c)], digitSrcMapping, x, y);
            x += 4;
        }
    }
}

export { ScoreScreen };

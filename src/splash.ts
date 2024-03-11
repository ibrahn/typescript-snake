import { Coord, Field } from "./field";

const logoSrc = `
####..#...#...####..#..##.##
##.##.##..##.##....##.##..##
##....###.##.##....####...##
.###..######.####..###....##
...##.##.###.##....####...##
##.##.##..##.##....##.##....
#####..#...#.#####.##..##.##
`.trim();
const logoSrcMapping = { '.': 0, '#': 0x88 };

class SplashScreen {
    private readonly logoField = new Field();
    private readonly displayField = new Field();
    private time = 0;

    constructor() {
        const logoLines = logoSrc.split('\n');
        // centre logo
        const offsetX = Math.floor((Field.width - logoLines[0].length) / 2);
        const offsetY = Math.floor((Field.height - logoLines.length) / 2);
        this.logoField.paste(logoSrc, logoSrcMapping, offsetX, offsetY);
    }

    /**
     * Update display field with logo illuminated by light.
     */
    private illuminateLogo(lightX: number, lightY: number,
            lightRadius: number): void {
        const logoField = this.logoField;
        const displayField = this.displayField;
        const radSqr = lightRadius * lightRadius;
        for (let y = Field.height; y-- > 0;) {
            for (let x = Field.width; x-- > 0;) {
                const logoVal = logoField.getCell(x, y);
                const [offX, offY] = [x - lightX, y - lightY];
                const distSqr = offX * offX + offY * offY;
                const amp = (radSqr - Math.min(distSqr, radSqr)) / radSqr;
                displayField.setCell(x, y, logoVal * amp);
            }
        }
    }

    /**
     * @param delta - time since last frame, in seconds.
     *
     * @returns true if redraw required, otherwise false.
     */
    update(delta: number): boolean {
        const animDuration = 12;
        if (this.time < animDuration) {
            this.time = Math.min(this.time + delta, animDuration);
            const t = this.time;
            const lightY = 7;
            const startX = 16;
            const panTravel = 9;
            const panDuration = 2;
            let lightX = startX;
            // Pan left, right, centre, stop.
            const stage = Math.floor(t / panDuration);
            const progress = (t % panDuration) / panDuration;
            const eased = (1 - Math.cos(progress * Math.PI)) / 2;
            switch (stage) {
                case 0:
                    lightX = startX - eased * panTravel;
                    break;
                case 1:
                    lightX = startX - panTravel + eased * 2 * panTravel;
                    break;
                case 2:
                    lightX = startX + panTravel - eased * panTravel;
                    break;
            }
            const radius = Math.min(this.time * 1.6 + 4, 16);
            this.illuminateLogo(lightX, lightY, radius);
            return true;
        }
        return false;
    }

    get displayData(): Uint8Array {
        return this.displayField.data;
    }
}

export { SplashScreen };

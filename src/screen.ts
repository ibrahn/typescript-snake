import { Field } from "./field"

enum ScreenMsgType {
    close,
    redraw,
    gameover,
}

type ScreenMsg = {
    msg: ScreenMsgType,
    data?: number,
};

class BaseScreen {
    protected readonly displayField = new Field();
    protected closing = false;

    input(e: KeyboardEvent): void {
        if (e.key == ' ') {
            this.closing = true;
            e.preventDefault();
        }
    }

    /**
     * @param delta - time since last frame, in seconds.
     *
     * @returns A ScreenMsg if something important happens otherwise null.
     */
    update(delta: number): ScreenMsg {
        if (this.closing) {
            return { msg: ScreenMsgType.close };
        }
        return null;
    };

    get displayData(): Uint8Array {
        return this.displayField.data;
    }
}

export { BaseScreen, ScreenMsg, ScreenMsgType };

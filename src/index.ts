import { Game } from "./game"
import { Field } from "./field"
import { Renderer } from "./renderer"

window.addEventListener('load', (): void => {
    const canvas =
        document.getElementById('snakeCanvas') as HTMLCanvasElement;
    const renderer = new Renderer(canvas);
    const game = new Game();

    function resizeCanvasIfReq(): boolean {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            return true;
        }
        return false;
    }

    function runFrame(): void {
        const gameChanged = game.update();
        const canvasResized = resizeCanvasIfReq();
        if (gameChanged || canvasResized) {
            renderer.update(game.displayData);
        }
        renderer.drawFrame();
    }

    function updateCanvasSize(): void {
        const maxWidth = 0.9 * window.innerWidth;
        const maxHeight = 0.9 * window.innerHeight;
        const widthLimited =
            maxWidth / Field.width < maxHeight / Field.height;
        const unit =
            Math.floor(widthLimited ? maxWidth / Field.width
                : maxHeight / Field.height);
        const width = Field.width * unit;
        const height = Field.height * unit;
        canvas.width = width;
        canvas.height = height;
    }
    updateCanvasSize();

    type inputCallback = (e: KeyboardEvent) => void;
    const inputMap: Record<string, inputCallback> = {
        ArrowLeft: (e: KeyboardEvent) => game.playerInput('left'),
        ArrowRight: (e: KeyboardEvent) => game.playerInput('right'),
        ArrowUp: (e: KeyboardEvent) => game.playerInput('up'),
        ArrowDown: (e: KeyboardEvent) => game.playerInput('down'),
//        ' ': (e: KeyboardEvent) => {
//            if (!e.repeat) { game.startGame(); }
//        },
        'c': (e: KeyboardEvent) => renderer.nextColorScheme(),
    }

    // input handling
    canvas.addEventListener('keydown', e => {
        if (e.key in inputMap) {
            inputMap[e.key](e);
            e.preventDefault();
        }
    });

    document.getElementById('instructions').hidden = false;
    window.addEventListener('resize', updateCanvasSize);

    function loop(): void {
        runFrame();
        window.requestAnimationFrame(loop);
    }
    loop();
});

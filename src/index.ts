import { Game, GameState } from "./game";
import { Field } from "./field";
import { Renderer } from "./renderer";
import { ScoreScreen } from "./score-screen";
import { SplashScreen } from "./splash";
import { BaseScreen, ScreenMsgType } from "./screen";

window.addEventListener('load', (): void => {
    const canvas =
        document.getElementById('snakeCanvas') as HTMLCanvasElement;
    const renderer = new Renderer(canvas);

    let currentScreen: BaseScreen = new SplashScreen();

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

    function runFrame(delta: number): void {
        const canvasResized = resizeCanvasIfReq();
        const screenMsg = currentScreen.update(delta);
        switch (screenMsg?.msg) {
            case ScreenMsgType.close:
                currentScreen = new Game();
                break;
            case ScreenMsgType.gameover:
                currentScreen = new ScoreScreen(screenMsg.data);
                break;
        }
        if (screenMsg || canvasResized) {
            renderer.update(currentScreen.displayData);
        }
        renderer.drawFrame();
    }

    function updateCanvasSize(): void {
        const maxWidth = 0.9 * window.innerWidth;
        const maxHeight = 0.9 * window.innerHeight;
        [canvas.width, canvas.height] =
            Renderer.bestFit(maxWidth, maxHeight);
    }
    updateCanvasSize();

    type inputCallback = (e: KeyboardEvent) => void;
    const inputMap: Record<string, inputCallback> = {
        'c': (e: KeyboardEvent) => renderer.nextColorScheme(),
    }

    // input handling
    canvas.addEventListener('keydown', e => {
        if (e.key in inputMap) {
            inputMap[e.key](e);
            e.preventDefault();
        } else {
            currentScreen.input(e);
        }
    });

    document.getElementById('instructions').hidden = false;
    window.addEventListener('resize', updateCanvasSize);

    let lastFrame: number = null;
    function loop(timestamp: DOMHighResTimeStamp): void {
        if (lastFrame) {
            const delta = (timestamp - lastFrame) / 1000;
            runFrame(delta);
        }
        lastFrame = timestamp;
        window.requestAnimationFrame(loop);
    }
    window.requestAnimationFrame(loop);
});

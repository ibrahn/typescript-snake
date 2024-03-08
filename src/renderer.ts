import { Field } from "./field"

// 8bit per channel RGB.
const colorTexData = new Uint8Array([
    0x00, 0x00, 0x00, // background
    0x00, 0xff, 0x00, // snake
    0xff, 0x00, 0xff, // fruit
    0xff, 0xff, 0xff, // wall
]);

const vertData = new Float32Array([
    -1.0,  1.0, 0.0, 1.0,
    -1.0, -1.0, 0.0, 1.0,
     1.0,  1.0, 0.0, 1.0,
     1.0, -1.0, 0.0, 1.0,
]);

const vertexShaderSource = `#version 300 es
    in vec4 position;

    void main() {
        gl_Position = position;
    }
`;

const fragmentShaderSource = `#version 300 es
    precision highp float;

    out vec4 outColor;

    void main() {
        outColor = vec4(1.0, 0.0, 0.6, 1.0);
    }
`;

function loadShader(ctx: WebGL2RenderingContext, shaderStage: number,
        source: string): WebGLShader {
    const shader = ctx.createShader(shaderStage);
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
        alert("Shader compile failed: " + ctx.getShaderInfoLog(shader));
        ctx.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(ctx: WebGL2RenderingContext,
        vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = loadShader(ctx, ctx.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(ctx, ctx.FRAGMENT_SHADER, fsSource);

    const program = ctx.createProgram();
    ctx.attachShader(program, vertexShader);
    ctx.attachShader(program, fragmentShader);
    ctx.linkProgram(program);
    ctx.deleteShader(vertexShader);
    ctx.deleteShader(fragmentShader);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
        alert("Shader link fail: " + ctx.getProgramInfoLog(program));
        ctx.deleteProgram(program);
        return null;
    }
    return program;
}

/**
 * Draws a game Field to a canvas.
 */
class Renderer {
    private glContext: WebGL2RenderingContext;
    private vao: WebGLVertexArrayObject;
    private fieldTexture: WebGLTexture;
    private colorTexture: WebGLTexture;
    private shaderProgram: WebGLShader;
    private colorSchemeIndex: number = 0;
    private colorSchemeUniformLoc: WebGLUniformLocation;
    private readonly colorSchemeCount: number;

    /**
     * @param canvas - The target canvas to draw on.
     */
    constructor(canvas: HTMLCanvasElement) {
        const ctx = this.glContext = canvas.getContext('webgl2');
        this.vao = ctx.createVertexArray();
        this.fieldTexture = ctx.createTexture();
        this.colorTexture = ctx.createTexture();
        this.colorSchemeCount = colorTexData.length / 4;

        ctx.bindTexture(ctx.TEXTURE_2D, this.colorTexture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.R8UI,
            4, this.colorSchemeCount, 0,
            ctx.RED_INTEGER, ctx.UNSIGNED_BYTE,
            colorTexData);
        ctx.bindTexture(ctx.TEXTURE_2D, null);

        this.shaderProgram = initShaderProgram(ctx, vertexShaderSource,
            fragmentShaderSource);
        this.colorSchemeUniformLoc =
            ctx.getUniformLocation(this.shaderProgram, 'colorScheme');

        ctx.bindVertexArray(this.vao);
        const posBuffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, posBuffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, vertData, ctx.STATIC_DRAW);
        const positionAttribLocation =
            ctx.getAttribLocation(this.shaderProgram, 'position');
        ctx.vertexAttribPointer(
            positionAttribLocation, // location
            4,                      // component count
            ctx.FLOAT,              // type
            false,                  // normalize
            0,                      // stride (0 for tightly packed)
            0,                      // offset
            );
        ctx.enableVertexAttribArray(positionAttribLocation);
        ctx.bindVertexArray(null);
    }

    /**
     * Changes the active colour scheme.
     */
    nextColorScheme(): void {
        this.colorSchemeIndex++;
        this.colorSchemeIndex %= this.colorSchemeCount;
    }

    /**
     * Updates textures to represent Field changes.
     *
     * @param field - The Field to be drawn from.
     */
    update(field: Field): void {
        const ctx = this.glContext;
        ctx.bindTexture(ctx.TEXTURE_2D, this.fieldTexture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.R8UI,
            Field.width, Field.height, 0,
            ctx.RED_INTEGER, ctx.UNSIGNED_BYTE, field.data);
        ctx.bindTexture(ctx.TEXTURE_2D, null);
    }

    /**
     * Renders current state onto the canvas.
     */
    drawFrame(): void {
        const ctx = this.glContext;
        ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.clearColor(0,0,0,0);
        ctx.clear(ctx.COLOR_BUFFER_BIT);

        ctx.useProgram(this.shaderProgram);
        ctx.bindVertexArray(this.vao);
        ctx.uniform1i(this.colorSchemeUniformLoc, this.colorSchemeIndex);
        // TODO: bind textures
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);

        ctx.bindVertexArray(null);
        ctx.useProgram(null);
    }
}

export { Renderer };

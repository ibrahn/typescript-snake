import { Field } from "./field"

/**
 * Return the smallest integer multiple of 4 that is greater than or equal
 * to the passed number.
 */
function toMultipleOfFour(n: number): number {
    n = Math.ceil(n);
    const r = n % 4;
    return r ? n + 4 - r : n;
}

// Required pixel count to move up to next scale.
const scaleBreakPoints = [ 0, 6, 21, 36, Number.MAX_SAFE_INTEGER];

// 8bit per channel RGB.
const colorTexData = new Uint8Array([
    0x00, 0x00, 0x00, // background
    0x00, 0x97, 0x36, // snake
    0xee, 0x2a, 0x35, // fruit
    0xff, 0xff, 0xff, // wall
    // purple theme
    0x10, 0x00, 0x00, // background
    0xa0, 0x24, 0xa7, // snake
    0x06, 0x8a, 0x45, // fruit
    0xb0, 0x90, 0x62, // wall
    // orange theme
    0x1b, 0x10, 0x00, // background
    0xff, 0x40, 0x00, // snake
    0xff, 0xff, 0xdd, // fruit
    0x90, 0xd8, 0x32, // wall
    // light theme
    0xdd, 0xdd, 0xdd, // background
    0x00, 0xa0, 0x20, // snake
    0xff, 0x00, 0x05, // fruit
    0x10, 0x10, 0x10, // wall
]);

// Fullscreen quad.
// vec4 position, vec2 texCoord
const vertData = new Float32Array([
    -1.0,  1.0, 0.0, 1.0, 0.0, 0.0,
    -1.0, -1.0, 0.0, 1.0, 0.0, 1.0,
     1.0,  1.0, 0.0, 1.0, 1.0, 0.0,
     1.0, -1.0, 0.0, 1.0, 1.0, 1.0,
]);
const vertDataStride = 4 * 6;

const vertexShaderSource = `#version 300 es
    in vec4 position;
    in vec2 texCoord;

    out vec2 fragTexCoord;

    void main() {
        gl_Position = position;
        fragTexCoord = texCoord;
    }
`;

// Add noise to field value for dither.
// Look up result in colour scheme texture.
const fragmentShaderSource = `#version 300 es
    precision highp float;
    precision highp usampler2D;

    uniform usampler2D fieldTexture;
    uniform sampler2D colorTexture;
    uniform usampler2D noiseTexture;
    uniform float colorScheme;
    uniform uint ditherOffset;

    in vec2 fragTexCoord;

    out vec4 outColor;

    const uint k_ditherBits = 6u;
    const uint k_ditherMask = (1u << k_ditherBits) - 1u;

    void main() {
        uint field = texture(fieldTexture, fragTexCoord).r;
        uint noise = texture(noiseTexture, fragTexCoord).r;
        uint dither = (noise + ditherOffset) & k_ditherMask;
        float val = float(field + dither) / 255.0;
        vec2 lookupCoord = vec2(val, colorScheme);
        outColor = vec4(texture(colorTexture, lookupCoord, 1.0));
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

type UniformLocations = {
    colorScheme: WebGLUniformLocation;
    ditherOffset: WebGLUniformLocation;
    fieldTexture: WebGLUniformLocation;
    colorTexture: WebGLUniformLocation;
    noiseTexture: WebGLUniformLocation;
};

/**
 * Draws a game Field to a canvas.
 */
class Renderer {
    private glContext: WebGL2RenderingContext;
    private vao: WebGLVertexArrayObject;
    private fieldTexture: WebGLTexture;
    // Colour lookup texture.
    private colorTexture: WebGLTexture;
    // Noise for dithering.
    private noiseTexture: WebGLTexture;
    private shaderProgram: WebGLShader;
    private colorSchemeIndex: number = 0;
    private uniformLoc: UniformLocations;
    private readonly colorSchemeCount: number;
    private static readonly ditherIncrement = 45;
    private static readonly ditherDelay = 0.3;
    private ditherTimer = 0;
    private ditherOffset: number = 0;

    /**
     * Calculate the best fit for canvas in available space.
     *
     * @return [width, height, scale]
     */
    static bestFit(availableWidth: number, availableHeight: number):
            [number, number, number] {
        const widthRatio = availableWidth / Field.width;
        const heightRatio = availableHeight / Field.height;
        const maxPixelsPerCell = Math.floor(
            Math.min(widthRatio, heightRatio));
        let scale = 0;
        while (maxPixelsPerCell > scaleBreakPoints[scale]) {
            scale++;
        }
        const cellSize = maxPixelsPerCell - (maxPixelsPerCell % scale);
        return [Field.width * cellSize, Field.height * cellSize, scale]
    }

    /**
     * @param canvas - The target canvas to draw on.
     */
    constructor(canvas: HTMLCanvasElement) {
        const ctx = this.glContext = canvas.getContext('webgl2');
        this.vao = ctx.createVertexArray();
        this.colorSchemeCount = colorTexData.length / 12;

        // Texture setup.
        this.fieldTexture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, this.fieldTexture);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);

        this.colorTexture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, this.colorTexture);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGB8,
            4, this.colorSchemeCount, 0,
            ctx.RGB, ctx.UNSIGNED_BYTE,
            colorTexData);

        this.noiseTexture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, this.noiseTexture);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);

        ctx.bindTexture(ctx.TEXTURE_2D, null);

        // Shader loading.
        this.shaderProgram = initShaderProgram(ctx, vertexShaderSource,
            fragmentShaderSource);
        this.uniformLoc = {
            colorScheme: ctx.getUniformLocation(this.shaderProgram,
                                                'colorScheme'),
            ditherOffset: ctx.getUniformLocation(this.shaderProgram,
                                                'ditherOffset'),
            fieldTexture: ctx.getUniformLocation(this.shaderProgram,
                                                'fieldTexture'),
            colorTexture: ctx.getUniformLocation(this.shaderProgram,
                                                'colorTexture'),
            noiseTexture: ctx.getUniformLocation(this.shaderProgram,
                                                'noiseTexture'),
        };

        // Vertex input binding.
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
            vertDataStride,         // stride
            0,                      // offset
            );
        ctx.enableVertexAttribArray(positionAttribLocation);
        const texCoordAttribLocation =
            ctx.getAttribLocation(this.shaderProgram, 'texCoord');
        ctx.vertexAttribPointer(
            texCoordAttribLocation, // location
            2,                      // component count
            ctx.FLOAT,              // type
            false,                  // normalize
            vertDataStride,         // stride
            4 * 4,                  // offset
            );
        ctx.enableVertexAttribArray(texCoordAttribLocation);
        ctx.bindVertexArray(null);

        // Force texture generation.
        this.updateSize(true);
    }

    /**
     * Fill texture with 8 bit white noise.
     */
    private generateNoiseTexture(width: number, height: number): void {
        const ctx = this.glContext;
        ctx.bindTexture(ctx.TEXTURE_2D, this.noiseTexture);
        // Texture stride needs to be multiple of 4bytes.
        const size = toMultipleOfFour(width) * height;
        const data = new Uint8Array(size);
        for (let i = size; i-- > 0;) {
            data[i] = Math.floor(Math.random() * 255);
        }
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.R8UI,
            width, height, 0,
            ctx.RED_INTEGER, ctx.UNSIGNED_BYTE, data);
        ctx.bindTexture(ctx.TEXTURE_2D, null);
    }

    /**
     * Check viewport against canvas size and update if required.
     */
    private updateSize(force: boolean = false): void {
        const ctx = this.glContext;
        const curViewport = ctx.getParameter(ctx.VIEWPORT);
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        if (force || width != curViewport[2] || height != curViewport[3]) {
            ctx.viewport(0, 0, width, height);
            const noiseScale = Renderer.bestFit(width, height)[2];
            this.generateNoiseTexture(
                width / noiseScale, height / noiseScale);
        }
    }

    /**
     * Update dither offset.
     */
    private ditherRotate(delta: number) {
        this.ditherTimer -= delta;
        if (this.ditherTimer < 0 ) {
            this.ditherTimer = Renderer.ditherDelay;
            this.ditherOffset =
                (this.ditherOffset + Renderer.ditherIncrement) % 256;
        }
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
    update(data: Uint8Array): void {
        const ctx = this.glContext;
        ctx.bindTexture(ctx.TEXTURE_2D, this.fieldTexture);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.R8UI,
            Field.width, Field.height, 0,
            ctx.RED_INTEGER, ctx.UNSIGNED_BYTE, data);
        ctx.bindTexture(ctx.TEXTURE_2D, null);
    }

    /**
     * Renders current state onto the canvas.
     */
    drawFrame(delta: number): void {
        const ctx = this.glContext;
        this.updateSize();

        this.ditherRotate(delta);

        ctx.clearColor(0,0,0,0);
        ctx.clear(ctx.COLOR_BUFFER_BIT);

        ctx.useProgram(this.shaderProgram);
        ctx.bindVertexArray(this.vao);
        // Colour scheme index converted to a texture space dimension.
        ctx.uniform1f(this.uniformLoc.colorScheme,
            (this.colorSchemeIndex + 0.5) / this.colorSchemeCount);
        // Dither offset gives us moving dither.
        ctx.uniform1ui(this.uniformLoc.ditherOffset,
            Math.trunc(this.ditherOffset));

        // Bind textures.
        ctx.uniform1i(this.uniformLoc.colorTexture, 0);
        ctx.activeTexture(ctx.TEXTURE0);
        ctx.bindTexture(ctx.TEXTURE_2D, this.colorTexture);
        ctx.uniform1i(this.uniformLoc.fieldTexture, 1);
        ctx.activeTexture(ctx.TEXTURE1);
        ctx.bindTexture(ctx.TEXTURE_2D, this.fieldTexture);
        ctx.uniform1i(this.uniformLoc.noiseTexture, 2);
        ctx.activeTexture(ctx.TEXTURE2);
        ctx.bindTexture(ctx.TEXTURE_2D, this.noiseTexture);
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);

        ctx.bindVertexArray(null);
        ctx.useProgram(null);
    }
}

export { Renderer };

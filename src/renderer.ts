import { Field } from "./field"

// 8bit per channel RGB.
const colorTexData = new Uint8Array([
    0x00, 0x00, 0x00, // background
    0x00, 0xff, 0x00, // snake
    0xff, 0x00, 0xff, // fruit
    0xff, 0xff, 0xff, // wall
]);

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

const fragmentShaderSource = `#version 300 es
    precision highp float;
    precision highp usampler2D;

    uniform usampler2D fieldTexture;
    uniform sampler2D colorTexture;
    uniform float colorScheme;

    in vec2 fragTexCoord;

    out vec4 outColor;

    void main() {
        float field = float(texture(fieldTexture, fragTexCoord).r);
        vec2 lookupCoord = vec2(field / 255.0 + 0.125, colorScheme);
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
    fieldTexture: WebGLUniformLocation;
    colorTexture: WebGLUniformLocation;
};

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
    private uniformLoc: UniformLocations;
    private readonly colorSchemeCount: number;

    /**
     * @param canvas - The target canvas to draw on.
     */
    constructor(canvas: HTMLCanvasElement) {
        const ctx = this.glContext = canvas.getContext('webgl2');
        this.vao = ctx.createVertexArray();
        this.colorSchemeCount = colorTexData.length / 12;

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
            ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
        ctx.texParameteri(ctx.TEXTURE_2D,
            ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGB8,
            4, this.colorSchemeCount, 0,
            ctx.RGB, ctx.UNSIGNED_BYTE,
            colorTexData);
        ctx.bindTexture(ctx.TEXTURE_2D, null);

        this.shaderProgram = initShaderProgram(ctx, vertexShaderSource,
            fragmentShaderSource);
        this.uniformLoc = {
            colorScheme: ctx.getUniformLocation(this.shaderProgram,
                                                'colorScheme'),
            fieldTexture: ctx.getUniformLocation(this.shaderProgram,
                                                'fieldTexture'),
            colorTexture: ctx.getUniformLocation(this.shaderProgram,
                                                'colorTexture'),
        };

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
        // Colour scheme index converted to a texture space dimension.
        ctx.uniform1f(this.uniformLoc.colorScheme,
            (this.colorSchemeIndex + 0.5) / this.colorSchemeCount);
        // TODO: bind textures
        ctx.uniform1i(this.uniformLoc.colorTexture, 0);
        ctx.activeTexture(ctx.TEXTURE0);
        ctx.bindTexture(ctx.TEXTURE_2D, this.colorTexture);
        ctx.uniform1i(this.uniformLoc.fieldTexture, 1);
        ctx.activeTexture(ctx.TEXTURE1);
        ctx.bindTexture(ctx.TEXTURE_2D, this.fieldTexture);
        ctx.drawArrays(ctx.TRIANGLE_STRIP, 0, 4);

        ctx.bindVertexArray(null);
        ctx.useProgram(null);
    }
}

export { Renderer };

/**
 * Photo Effects & Warping Engine
 * - Color Tones (Natural, Noir B&W, Warm 90s, Soft Glow, Retro Film, Méra Red)
 * - Mac Photo Booth Distortion Effects (Normal, Bulge, Dent, Twirl, Squeeze, Stretch, Mirror)
 * - GPU-accelerated WebGL fragment shaders for real-time 60 FPS live view and instant strip rendering
 */

export type ColorTone = 'none' | 'bw' | 'warm' | 'soft' | 'retro' | 'crimson'
export type WarpEffect = 'normal' | 'bulge' | 'dent' | 'twirl' | 'squeeze' | 'stretch' | 'mirror'

export interface ColorToneOption {
    id: ColorTone
    label: string
    icon: string
    desc: string
    css: string
}

export interface WarpEffectOption {
    id: WarpEffect
    label: string
    icon: string
    desc: string
}

export const COLOR_TONES: ColorToneOption[] = [
    { id: 'none', label: 'Natural', icon: '✨', desc: 'Jernih & Asli', css: 'none' },
    { id: 'bw', label: 'Noir B&W', icon: '⬛', desc: 'Monokrom Kontras', css: 'grayscale(100%) contrast(130%) brightness(102%)' },
    { id: 'warm', label: 'Warm 90s', icon: '🎞️', desc: 'Hangat & Golden 90s', css: 'sepia(65%) saturate(180%) contrast(118%) brightness(106%) hue-rotate(-12deg)' },
    { id: 'soft', label: 'Soft Glow', icon: '🌸', desc: 'Dreamy & Glowing Pastel', css: 'brightness(120%) contrast(85%) saturate(140%) sepia(18%)' },
    { id: 'retro', label: 'Retro Film', icon: '📼', desc: 'Kontras Analog Film', css: 'contrast(145%) brightness(92%) saturate(140%) sepia(35%) hue-rotate(15deg)' },
    { id: 'crimson', label: 'Méra Red', icon: '🍒', desc: 'Dominan Merah Sinematik', css: 'sepia(75%) saturate(340%) hue-rotate(325deg) contrast(115%) brightness(96%)' },
]

export const WARP_EFFECTS: WarpEffectOption[] = [
    { id: 'normal', label: 'Normal', icon: '👤', desc: 'Tanpa Distorsi' },
    { id: 'bulge', label: 'Bulge', icon: '🐡', desc: 'Cembung Tengah (Mac Fish Eye)' },
    { id: 'dent', label: 'Dent', icon: '🎯', desc: 'Cekung / Pinch Kedalam' },
    { id: 'twirl', label: 'Twirl', icon: '🌀', desc: 'Pusaran Spiral Putar' },
    { id: 'squeeze', label: 'Squeeze', icon: '⏳', desc: 'Menciut Ramping di Tengah' },
    { id: 'stretch', label: 'Stretch', icon: '🦒', desc: 'Tarik Memanjang Vertikal' },
    { id: 'mirror', label: 'Mirror', icon: '🪞', desc: 'Refleksi Kembar Kiri-Kanan' },
]

export interface PhotoboothEffect {
    id: string
    label: string
    tone: ColorTone
    warp: WarpEffect
}

export const PHOTOBOOTH_EFFECTS: PhotoboothEffect[] = [
    // Slide 1
    { id: 'normal', label: 'Normal', tone: 'none', warp: 'normal' },
    { id: 'bulge', label: 'Bulge', tone: 'none', warp: 'bulge' },
    { id: 'dent', label: 'Dent', tone: 'none', warp: 'dent' },
    { id: 'twirl', label: 'Twirl', tone: 'none', warp: 'twirl' },
    { id: 'squeeze', label: 'Squeeze', tone: 'none', warp: 'squeeze' },
    { id: 'stretch', label: 'Stretch', tone: 'none', warp: 'stretch' },

    // Slide 2
    { id: 'mirror', label: 'Mirror', tone: 'none', warp: 'mirror' },
    { id: 'bw', label: 'Noir B&W', tone: 'bw', warp: 'normal' },
    { id: 'warm', label: 'Warm 90s', tone: 'warm', warp: 'normal' },
    { id: 'soft', label: 'Soft Glow', tone: 'soft', warp: 'normal' },
    { id: 'retro', label: 'Retro Film', tone: 'retro', warp: 'normal' },
    { id: 'crimson', label: 'Méra Red', tone: 'crimson', warp: 'normal' },
]

const WARP_MAP: Record<WarpEffect, number> = {
    normal: 0,
    bulge: 1,
    dent: 2,
    twirl: 3,
    squeeze: 4,
    stretch: 5,
    mirror: 6,
}

const TONE_MAP: Record<ColorTone, number> = {
    none: 0,
    bw: 1,
    warm: 2,
    soft: 3,
    retro: 4,
    crimson: 5,
}

const VS_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`

const FS_SOURCE = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform int u_warp;
uniform int u_tone;
uniform bool u_mirrorX;

void main() {
    vec2 uv = v_texCoord;
    if (u_mirrorX) {
        uv.x = 1.0 - uv.x;
    }

    vec2 p = uv;
    vec2 c = vec2(0.5, 0.5);
    vec2 d = p - c;
    float r = length(d);

    // ── Distortion Effects (Mac Photo Booth style) ──
    if (u_warp == 1) {
        // Bulge
        float maxR = 0.52;
        if (r < maxR) {
            float factor = r / maxR;
            float newR = pow(factor, 0.52) * maxR;
            p = c + (d / (r + 0.00001)) * newR;
        }
    } else if (u_warp == 2) {
        // Dent
        float maxR = 0.52;
        if (r < maxR) {
            float factor = r / maxR;
            float newR = pow(factor, 1.75) * maxR;
            p = c + (d / (r + 0.00001)) * newR;
        }
    } else if (u_warp == 3) {
        // Twirl
        float maxR = 0.52;
        if (r < maxR) {
            float angle = (1.0 - r / maxR) * 2.8;
            float s = sin(angle);
            float cs = cos(angle);
            vec2 rot = vec2(d.x * cs - d.y * s, d.x * s + d.y * cs);
            p = c + rot;
        }
    } else if (u_warp == 4) {
        // Squeeze
        float factor = 1.0 - smoothstep(0.0, 0.5, abs(uv.y - 0.5));
        float newX = 0.5 + (uv.x - 0.5) * (1.0 + 0.75 * factor);
        p = vec2(newX, uv.y);
    } else if (u_warp == 5) {
        // Stretch
        float factor = 1.0 - smoothstep(0.0, 0.5, abs(uv.x - 0.5));
        float newY = 0.5 + (uv.y - 0.5) * (1.0 - 0.45 * factor);
        p = vec2(uv.x, newY);
    } else if (u_warp == 6) {
        // Mirror (Left mirrored to Right)
        float mx = uv.x > 0.5 ? (1.0 - uv.x) : uv.x;
        p = vec2(mx, uv.y);
    }

    p = clamp(p, 0.0, 1.0);
    vec4 color = texture2D(u_image, p);

    // ── Color Tones ──
    if (u_tone == 1) {
        // Noir B&W
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        gray = clamp((gray - 0.5) * 1.35 + 0.52, 0.0, 1.0);
        color.rgb = vec3(gray);
    } else if (u_tone == 2) {
        // Warm 90s
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 sepia = vec3(gray * 1.15, gray * 0.95, gray * 0.72);
        color.rgb = clamp(mix(color.rgb, sepia, 0.65) * 1.08, 0.0, 1.0);
    } else if (u_tone == 3) {
        // Soft Glow
        color.rgb = clamp(pow(color.rgb, vec3(0.85)) * 1.12, 0.0, 1.0);
        color.rgb = mix(color.rgb, vec3(1.0, 0.92, 0.95), 0.12);
    } else if (u_tone == 4) {
        // Retro Film
        color.r = clamp((color.r - 0.5) * 1.25 + 0.52, 0.0, 1.0);
        color.g = clamp((color.g - 0.5) * 1.15 + 0.5, 0.0, 1.0);
        color.b = clamp((color.b - 0.5) * 0.95 + 0.48, 0.0, 1.0);
        color.rgb = mix(color.rgb, vec3(0.9, 0.8, 0.6), 0.15);
    } else if (u_tone == 5) {
        // Méra Red
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        vec3 crimsonTint = vec3(0.85, 0.15, 0.25) * (gray * 1.4);
        color.rgb = clamp(mix(color.rgb, crimsonTint, 0.45) * 1.05, 0.0, 1.0);
    }

    gl_FragColor = color;
}
`

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
    }
    return shader
}

export class WebGLEffectRenderer {
    private canvas: HTMLCanvasElement
    private gl: WebGLRenderingContext | null = null
    private program: WebGLProgram | null = null
    private texture: WebGLTexture | null = null
    private positionBuffer: WebGLBuffer | null = null
    private texCoordBuffer: WebGLBuffer | null = null

    private uWarpLoc: WebGLUniformLocation | null = null
    private uToneLoc: WebGLUniformLocation | null = null
    private uMirrorXLoc: WebGLUniformLocation | null = null
    private uImageLoc: WebGLUniformLocation | null = null

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas
        this.initGL()
    }

    private initGL() {
        const gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
            (this.canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true }) as WebGLRenderingContext | null)
        if (!gl) {
            console.warn('WebGL not supported, falling back to standard rendering')
            return
        }
        this.gl = gl

        const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE)
        const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE)
        if (!vs || !fs) return

        const program = gl.createProgram()
        if (!program) return
        gl.attachShader(program, vs)
        gl.attachShader(program, fs)
        gl.linkProgram(program)

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program))
            return
        }
        this.program = program

        gl.useProgram(program)

        // Set up rectangle covering viewport [-1, -1] to [1, 1]
        this.positionBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1,
            ]),
            gl.STATIC_DRAW
        )

        // Texture coordinates [0, 1] mapped to WebGL [0, 1] inverted Y
        this.texCoordBuffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                0, 1,
                1, 1,
                0, 0,
                0, 0,
                1, 1,
                1, 0,
            ]),
            gl.STATIC_DRAW
        )

        // Texture setup
        this.texture = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

        this.uWarpLoc = gl.getUniformLocation(program, 'u_warp')
        this.uToneLoc = gl.getUniformLocation(program, 'u_tone')
        this.uMirrorXLoc = gl.getUniformLocation(program, 'u_mirrorX')
        this.uImageLoc = gl.getUniformLocation(program, 'u_image')
    }

    public isReady(): boolean {
        return !!(this.gl && this.program && this.texture)
    }

    public render(
        source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
        options: {
            tone: ColorTone
            warp: WarpEffect
            mirrorX: boolean
        }
    ) {
        const gl = this.gl
        const program = this.program
        if (!gl || !program || !this.texture) return

        gl.viewport(0, 0, this.canvas.width, this.canvas.height)
        gl.useProgram(program)

        // Upload source to texture
        gl.bindTexture(gl.TEXTURE_2D, this.texture)
        try {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
        } catch {
            return
        }

        // Set uniforms
        gl.uniform1i(this.uWarpLoc, WARP_MAP[options.warp] ?? 0)
        gl.uniform1i(this.uToneLoc, TONE_MAP[options.tone] ?? 0)
        gl.uniform1i(this.uMirrorXLoc, options.mirrorX ? 1 : 0)
        gl.uniform1i(this.uImageLoc, 0)

        // Attributes
        const posAttr = gl.getAttribLocation(program, 'a_position')
        gl.enableVertexAttribArray(posAttr)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
        gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0)

        const texAttr = gl.getAttribLocation(program, 'a_texCoord')
        gl.enableVertexAttribArray(texAttr)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
        gl.vertexAttribPointer(texAttr, 2, gl.FLOAT, false, 0, 0)

        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    public destroy() {
        if (!this.gl) return
        const gl = this.gl
        if (this.texture) gl.deleteTexture(this.texture)
        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer)
        if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer)
        if (this.program) gl.deleteProgram(this.program)
        this.gl = null
    }
}

/**
 * Apply effects to a static photo (Base64 dataURL or image URL)
 * Used to re-render captured photos when customer changes tone or effect in preview screen
 */
export async function applyEffectsToPhoto(
    imageSrc: string,
    options: {
        tone: ColorTone
        warp: WarpEffect
        mirrorX: boolean
        width: number
        height: number
    }
): Promise<string> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = imageSrc
    })

    const offscreen = document.createElement('canvas')
    offscreen.width = options.width
    offscreen.height = options.height

    const renderer = new WebGLEffectRenderer(offscreen)
    if (renderer.isReady()) {
        renderer.render(img, {
            tone: options.tone,
            warp: options.warp,
            mirrorX: options.mirrorX,
        })
        const result = offscreen.toDataURL('image/jpeg', 0.95)
        renderer.destroy()
        return result
    }

    // Fallback if WebGL unavailable: standard 2D canvas with CSS filter
    const ctx = offscreen.getContext('2d')
    if (ctx) {
        ctx.save()
        if (options.mirrorX) {
            ctx.translate(offscreen.width, 0)
            ctx.scale(-1, 1)
        }
        const toneCss = COLOR_TONES.find(t => t.id === options.tone)?.css ?? 'none'
        ctx.filter = toneCss
        ctx.drawImage(img, 0, 0, options.width, options.height)
        ctx.restore()
        return offscreen.toDataURL('image/jpeg', 0.95)
    }

    return imageSrc
}

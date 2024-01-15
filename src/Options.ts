import type { BrowserConfig, Extensions, IRipples, Program } from "./types";

export class Options {
  resolution: number;
  dropRadius: number;
  perturbance: number;
  crossOrigin: string;
  bufferReadIndex = 1;
  backgroundWidth = 0;
  backgroundHeight = 0;
  bufferWriteIndex = 0;
  interactive: boolean;
  originalInlineCss = "";
  imageUrl: string | null;
  canvas: HTMLCanvasElement;
  GL: WebGLRenderingContext;
  textureDelta: Float32Array;
  originalCssBackgroundImage = "";
  imageSource: string | null = null;
  transparentPixels = this.createImageData(32, 32);
  backgroundTexture: WebGLTexture | null = null;
  constructor(options: IRipples) {
    this.interactive = options.interactive;
    this.resolution = options.resolution;
    this.textureDelta = new Float32Array([
      1 / this.resolution,
      1 / this.resolution,
    ]);
    this.perturbance = options.perturbance;
    this.dropRadius = options.dropRadius;
    this.crossOrigin = options.crossOrigin;
    this.imageUrl = options.imageUrl;
    this.canvas = document.createElement("canvas");
    this.GL = (this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
  }

  static defaults = {
    imageUrl: null,
    resolution: 256,
    dropRadius: 20,
    perturbance: 0.03,
    interactive: true,
    crossOrigin: "",
  };

  public extractUrl(value: string) {
    const urlMatch = /url\(["']?([^"']*)["']?\)/.exec(value);
    if (urlMatch == null) {
      return null;
    }

    return urlMatch[1];
  }

  public isDataUri(url: string) {
    return url.match(/^data:/);
  }

  private compileSource(type: GLenum, source: string) {
    const shader = this.GL.createShader(type)!;
    this.GL.shaderSource(shader, source);
    this.GL.compileShader(shader);
    if (!this.GL.getShaderParameter(shader, this.GL.COMPILE_STATUS)) {
      throw new Error("compile error: " + this.GL.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  public createProgram(vertexSource: string, fragmentSource: string) {
    const program = { id: this.GL.createProgram()! } as Program;
    this.GL.attachShader(
      program.id,
      this.compileSource(this.GL.VERTEX_SHADER, vertexSource),
    );
    this.GL.attachShader(
      program.id,
      this.compileSource(this.GL.FRAGMENT_SHADER, fragmentSource),
    );
    this.GL.linkProgram(program.id);
    if (!this.GL.getProgramParameter(program.id, this.GL.LINK_STATUS)) {
      throw new Error("link error: " + this.GL.getProgramInfoLog(program.id)!);
    }
    program.uniforms = {};
    program.locations = {};
    this.GL.useProgram(program.id);
    this.GL.enableVertexAttribArray(0);
    let match, name;
    const regex = /uniform (\w+) (\w+)/g;
    const shaderCode = vertexSource + fragmentSource;
    while ((match = regex.exec(shaderCode)) != null) {
      name = match[2];
      program.locations[name] = this.GL.getUniformLocation(program.id, name)!;
    }
    return program;
  }

  public createImageData(width: number, height: number) {
    try {
      return new ImageData(width, height);
    } catch (e) {
      // Fallback for IE
      const canvas = document.createElement("canvas");
      return canvas.getContext("2d")?.createImageData(width, height);
    }
  }

  public translateBackgroundPosition(value: string) {
    const parts = value.split(" ");
    if (parts.length === 1) {
      switch (value) {
        case "center":
          return ["50%", "50%"];
        case "top":
          return ["50%", "0"];
        case "bottom":
          return ["50%", "100%"];
        case "left":
          return ["0", "50%"];
        case "right":
          return ["100%", "50%"];
        default:
          return [value, "50%"];
      }
    }
    return parts.map(part => {
      switch (value) {
        case "center":
          return "50%";
        case "top":
        case "left":
          return "0";
        case "right":
        case "bottom":
          return "100%";
        default:
          return part;
      }
    });
  }

  public isPercentage(str: string) {
    return str[str.length - 1] == "%";
  }

  private createConfig(
    type: string,
    glType: number,
    arrayType: typeof Float32Array | null,
    extensions: Extensions,
  ) {
    const name = "OES_texture_" + type,
      nameLinear = name + "_linear",
      linearSupport = nameLinear in extensions,
      configExtensions = [name];
    if (linearSupport) {
      configExtensions.push(nameLinear);
    }
    return {
      type: glType,
      arrayType: arrayType,
      linearSupport: linearSupport,
      extensions: configExtensions,
    };
  }

  public loadConfig() {
    const canvas = document.createElement("canvas");
    this.GL = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
    if (!this.GL) {
      throw new Error("No WebGL support");
    }
    const extensions = {} as Extensions;
    const keys = [
      "OES_texture_float",
      "OES_texture_half_float",
      "OES_texture_float_linear",
      "OES_texture_half_float_linear",
    ] as const;
    keys.forEach(name => {
      const extension = this.GL.getExtension(name);
      if (extension) {
        extensions[name] = extension;
      }
    });
    if (!extensions.OES_texture_float) {
      throw new Error("No texture float support");
    }
    const configs: BrowserConfig[] = [];
    configs.push(
      this.createConfig("float", this.GL.FLOAT, Float32Array, extensions),
    );

    if (extensions.OES_texture_half_float) {
      configs.push(
        this.createConfig(
          "half_float",
          extensions.OES_texture_half_float.HALF_FLOAT_OES,
          null,
          extensions,
        ),
      );
    }

    // Setup the texture and framebuffer
    const texture = this.GL.createTexture();
    const framebuffer = this.GL.createFramebuffer();

    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, framebuffer);
    this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_MIN_FILTER,
      this.GL.NEAREST,
    );
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_MAG_FILTER,
      this.GL.NEAREST,
    );
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_WRAP_S,
      this.GL.CLAMP_TO_EDGE,
    );
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_WRAP_T,
      this.GL.CLAMP_TO_EDGE,
    );

    // Check for each supported texture type if rendering to it is supported
    let config: BrowserConfig;
    for (let i = 0; i < configs.length; i++) {
      this.GL.texImage2D(
        this.GL.TEXTURE_2D,
        0,
        this.GL.RGBA,
        32,
        32,
        0,
        this.GL.RGBA,
        configs[i].type,
        null,
      );

      this.GL.framebufferTexture2D(
        this.GL.FRAMEBUFFER,
        this.GL.COLOR_ATTACHMENT0,
        this.GL.TEXTURE_2D,
        texture,
        0,
      );
      if (
        this.GL.checkFramebufferStatus(this.GL.FRAMEBUFFER) ===
        this.GL.FRAMEBUFFER_COMPLETE
      ) {
        config = configs[i];
        break;
      }
    }
    // @ts-ignore
    if (!config) {
      throw new Error("No compatible browser configurations");
    }
    return config;
  }

  public isPowerOfTwo(x: number) {
    return (x & (x - 1)) == 0;
  }

  public bindTexture(texture: WebGLTexture | null, unit = 0) {
    this.GL.activeTexture(this.GL.TEXTURE0 + (unit || 0));
    this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
  }
}

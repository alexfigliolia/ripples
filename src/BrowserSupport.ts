import type { BrowserConfig, Extensions } from "./types";

export class BrowserSupport implements BrowserConfig {
  type!: number;
  extensions!: string[];
  linearSupport!: boolean;
  GL!: WebGLRenderingContext;
  arrayType!: Float32ArrayConstructor | null;
  constructor() {
    this.detect();
  }

  private detect() {
    const extensions = this.getExtensions();
    const texture = this.frameAndBuffer();
    const configurations = this.getAll(extensions);
    const { length } = configurations;
    for (let i = 0; i < length; i++) {
      this.GL.texImage2D(
        this.GL.TEXTURE_2D,
        0,
        this.GL.RGBA,
        32,
        32,
        0,
        this.GL.RGBA,
        configurations[i].type,
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
        const config = configurations[i];
        this.type = config.type;
        this.arrayType = config.arrayType;
        this.extensions = config.extensions;
        this.linearSupport = config.linearSupport;
        return;
      }
    }
    throw new Error("No compatible browser configurations");
  }

  private getAll(extensions: Extensions) {
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
    return configs;
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

  private frameAndBuffer() {
    const texture = this.GL.createTexture()!;
    const frameBuffer = this.GL.createFramebuffer()!;
    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, frameBuffer);
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
    return texture;
  }

  private getExtensions() {
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
    return extensions;
  }
}

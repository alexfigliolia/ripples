import { BrowserSupport } from "./BrowserSupport";

export class Textures {
  quad: WebGLBuffer;
  bufferReadIndex = 1;
  bufferWriteIndex = 0;
  GL: WebGLRenderingContext;
  textures: WebGLTexture[] = [];
  backgroundTexture: WebGLTexture;
  frameBuffers: WebGLFramebuffer[] = [];
  static browserSupport = new BrowserSupport();
  transparentPixels = this.createImageData(32, 32);
  constructor(context: WebGLRenderingContext) {
    this.GL = context;
    this.quad = this.GL.createBuffer()!;
    this.backgroundTexture = this.createBackground();
  }

  public drawQuad() {
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.quad);
    this.GL.vertexAttribPointer(0, 2, this.GL.FLOAT, false, 0, 0);
    this.GL.drawArrays(this.GL.TRIANGLE_FAN, 0, 4);
  }

  public get firstTexture() {
    return this.textures[0];
  }

  public get readTexture() {
    return this.textures[this.bufferReadIndex];
  }

  public get writeTexture() {
    return this.textures[this.bufferWriteIndex];
  }

  public get readFrame() {
    return this.frameBuffers[this.bufferReadIndex];
  }

  public get writeFrame() {
    return this.frameBuffers[this.bufferWriteIndex];
  }

  public getBrowserExtensions() {
    Textures.browserSupport.extensions.forEach(name => {
      this.GL.getExtension(name);
    });
  }

  public initialize(resolution: number) {
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.quad);
    const { linearSupport, type, arrayType } = Textures.browserSupport;
    const textureData = arrayType
      ? new arrayType(resolution * resolution * 4)
      : null;
    for (let i = 0; i < 2; i++) {
      const texture = this.GL.createTexture()!;
      const frameBuffer = this.GL.createFramebuffer()!;
      this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, frameBuffer);
      this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
      this.GL.texParameteri(
        this.GL.TEXTURE_2D,
        this.GL.TEXTURE_MIN_FILTER,
        linearSupport ? this.GL.LINEAR : this.GL.NEAREST,
      );
      this.GL.texParameteri(
        this.GL.TEXTURE_2D,
        this.GL.TEXTURE_MAG_FILTER,
        linearSupport ? this.GL.LINEAR : this.GL.NEAREST,
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
      this.GL.texImage2D(
        this.GL.TEXTURE_2D,
        0,
        this.GL.RGBA,
        resolution,
        resolution,
        0,
        this.GL.RGBA,
        type,
        textureData,
      );
      this.GL.framebufferTexture2D(
        this.GL.FRAMEBUFFER,
        this.GL.COLOR_ATTACHMENT0,
        this.GL.TEXTURE_2D,
        texture,
        0,
      );
      this.textures.push(texture);
      this.frameBuffers.push(frameBuffer);
    }
  }

  public setTransparent() {
    this.GL.bindTexture(this.GL.TEXTURE_2D, this.backgroundTexture);
    this.GL.texImage2D(
      this.GL.TEXTURE_2D,
      0,
      this.GL.RGBA,
      this.GL.RGBA,
      this.GL.UNSIGNED_BYTE,
      this.transparentPixels as TexImageSource,
    );
  }

  public swapBufferIndices() {
    this.bufferWriteIndex = 1 - this.bufferWriteIndex;
    this.bufferReadIndex = 1 - this.bufferReadIndex;
  }

  private createBackground() {
    const texture = this.GL.createTexture()!;
    this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
    this.GL.pixelStorei(this.GL.UNPACK_FLIP_Y_WEBGL, 1);
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_MAG_FILTER,
      this.GL.LINEAR,
    );
    this.GL.texParameteri(
      this.GL.TEXTURE_2D,
      this.GL.TEXTURE_MIN_FILTER,
      this.GL.LINEAR,
    );
    return texture;
  }

  private createImageData(width: number, height: number) {
    try {
      return new ImageData(width, height);
    } catch (e) {
      // Fallback for IE
      const canvas = document.createElement("canvas");
      return canvas.getContext("2d")?.createImageData(width, height);
    }
  }
}

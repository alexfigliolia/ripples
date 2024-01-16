import { ImageLoader } from "./ImageLoader";
import { Options } from "./Options";
import { Shaders } from "./Shaders";
import { StyleCache } from "./StyleCache";
import { Textures } from "./Textures";
import type { IRipples } from "./types";

export class WebGL extends Options {
  Shaders: Shaders;
  Textures: Textures;
  quad!: WebGLBuffer;
  target: HTMLElement;
  canvas: HTMLCanvasElement;
  GL: WebGLRenderingContext;
  StyleCache = new StyleCache();
  imageSource: string | null = null;
  constructor(target: HTMLElement, options: Partial<IRipples>) {
    super(options);
    this.target = target;
    this.canvas = document.createElement("canvas");
    this.positionCanvas();
    this.GL = this.createGL(this.canvas);
    this.Shaders = new Shaders(this.GL, this.resolution);
    this.Textures = new Textures(this.GL);
  }

  protected initializeWebGL() {
    this.Textures.initialize(this.resolution);
    this.GL.bufferData(
      this.GL.ARRAY_BUFFER,
      new Float32Array([-1, -1, +1, -1, +1, +1, -1, +1]),
      this.GL.STATIC_DRAW,
    );
    this.Textures.setTransparent();
    void this.loadImage();
    this.GL.clearColor(0, 0, 0, 0);
    this.GL.blendFunc(this.GL.SRC_ALPHA, this.GL.ONE_MINUS_SRC_ALPHA);
  }

  protected hideCSSBackground() {
    const inlineCSS = this.target.style.backgroundImage;
    if (inlineCSS === "none") {
      return;
    }
    this.StyleCache.set("originalInlineCSS", inlineCSS);
    this.StyleCache.set(
      "originalCSSBackgroundImage",
      window.getComputedStyle(this.target).backgroundImage,
    );
    this.target.style.backgroundImage = "none";
  }

  protected render() {
    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, null);
    this.GL.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.GL.enable(this.GL.BLEND);
    this.GL.clear(this.GL.COLOR_BUFFER_BIT | this.GL.DEPTH_BUFFER_BIT);
    this.GL.useProgram(this.Shaders.renderProgram.id);
    this.bindTexture(this.Textures.backgroundTexture, 0);
    this.bindTexture(this.Textures.firstTexture, 1);
    this.Shaders.render(this.perturbance);
    this.Textures.drawQuad();
    this.GL.disable(this.GL.BLEND);
  }

  protected update() {
    this.GL.viewport(0, 0, this.resolution, this.resolution);
    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, this.Textures.writeFrame);
    this.bindTexture(this.Textures.readTexture);
    this.GL.useProgram(this.Shaders.updateProgram.id);
    this.Textures.drawQuad();
    this.Textures.swapBufferIndices();
  }

  protected isPercentage(str: string) {
    return str[str.length - 1] == "%";
  }

  protected bindTexture(texture: WebGLTexture | null, unit = 0) {
    this.GL.activeTexture(this.GL.TEXTURE0 + (unit || 0));
    this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
  }

  private positionCanvas() {
    this.canvas.width = this.target.offsetWidth;
    this.canvas.height = this.target.offsetHeight;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.right = "0";
    this.canvas.style.bottom = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "-1";
    this.target.appendChild(this.canvas);
  }

  private createGL(canvas: HTMLCanvasElement) {
    return (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
  }

  private async loadImage() {
    const { backgroundImage } = window.getComputedStyle(this.target);
    const newImageSource =
      this.imageUrl ||
      this.extractUrl(this.StyleCache.get("originalCSSBackgroundImage")) ||
      this.extractUrl(backgroundImage);
    if (newImageSource == this.imageSource) {
      return;
    }
    this.imageSource = newImageSource;
    if (!this.imageSource) {
      this.Textures.setTransparent();
      return;
    }
    try {
      const loader = new ImageLoader(this.Textures);
      const image = await loader.load(this.imageSource, this.crossOrigin);
      this.StyleCache.set("backgroundWidth", image.width);
      this.StyleCache.set("backgroundHeight", image.height);
      this.hideCSSBackground();
    } catch (error) {
      // silence
    }
  }
}

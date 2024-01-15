import { Options } from "./Options";
import type { IRipples, Program } from "./types";

export class Ripples extends Options {
  time = 0;
  visible = false;
  running = false;
  inited = false;
  destroyed = false;
  zIndex = "0";
  position = "static";
  quad!: WebGLBuffer;
  target: HTMLElement;
  dropProgram!: Program;
  renderProgram!: Program;
  updateProgram!: Program;
  textures: WebGLTexture[] = [];
  browserSupport = this.loadConfig();
  frameBuffers: WebGLFramebuffer[] = [];
  constructor(target: HTMLElement, options: Partial<IRipples>) {
    super(Object.assign({}, Ripples.defaults, options));
    this.target = target;
    this.onClick = this.onClick.bind(this);
    this.onTouch = this.onTouch.bind(this);
    this.updateSize = this.updateSize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.positionCanvas();
    this.setupWebGL();
  }

  private positionCanvas() {
    const { height, width } = this.target.getBoundingClientRect();
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.right = "0";
    this.canvas.style.bottom = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = "-1";
    const { position, zIndex } = window.getComputedStyle(this.target);
    this.zIndex = zIndex;
    this.position = position;
    this.target.style.zIndex = "0";
    this.target.style.position = "relative";
    this.target.appendChild(this.canvas);
  }

  public drop(x: number, y: number, radius: number, strength: number) {
    const { height, width } = this.target.getBoundingClientRect();
    const longestSide = Math.max(width, height);
    radius = radius / longestSide;

    const dropPosition = new Float32Array([
      (2 * x - width) / longestSide,
      (height - 2 * y) / longestSide,
    ]);

    this.GL.viewport(0, 0, this.resolution, this.resolution);

    this.GL.bindFramebuffer(
      this.GL.FRAMEBUFFER,
      this.frameBuffers[this.bufferWriteIndex],
    );
    this.bindTexture(this.textures[this.bufferReadIndex]);
    if (this.dropProgram) {
      this.GL.useProgram(this.dropProgram.id);
      this.GL.uniform2fv(this.dropProgram.locations.center, dropPosition);
      this.GL.uniform1f(this.dropProgram.locations.radius, radius);
      this.GL.uniform1f(this.dropProgram.locations.strength, strength);
    }
    this.drawQuad();
    this.swapBufferIndices();
  }

  public updateSize() {
    const { height, width } = this.target.getBoundingClientRect();
    if (width != this.canvas.width || height != this.canvas.height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  public destroy() {
    this.target.style.zIndex = this.zIndex;
    this.target.style.position = this.position;
    // @ts-ignore
    this.GL = null;
    window.removeEventListener("resize", this.updateSize);
    this.target.removeEventListener("mousedown", this.onClick);
    this.target.removeEventListener("touchmove", this.onTouch);
    this.target.removeEventListener("touchstart", this.onTouch);
    this.target.removeEventListener("mousemove", this.onMouseMove);
    this.target.removeChild(this.canvas);
    this.restoreCssBackground();
    cancelAnimationFrame(this.time);
    this.destroyed = true;
  }

  public show() {
    this.visible = true;
    this.canvas.style.display = "block";
    this.hideCssBackground();
  }

  public hide() {
    this.visible = false;
    this.canvas.style.display = "none";
    this.restoreCssBackground();
  }

  public pause() {
    this.running = false;
  }

  public play() {
    this.running = true;
  }

  private setupWebGL() {
    const { extensions, arrayType, linearSupport, type } = this.browserSupport;
    extensions.forEach(name => {
      this.GL.getExtension(name);
    });
    window.addEventListener("resize", this.updateSize);
    const textureData = arrayType
      ? new arrayType(this.resolution * this.resolution * 4)
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
        this.resolution,
        this.resolution,
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
    this.quad = this.GL.createBuffer()!;
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.quad);
    this.GL.bufferData(
      this.GL.ARRAY_BUFFER,
      new Float32Array([-1, -1, +1, -1, +1, +1, -1, +1]),
      this.GL.STATIC_DRAW,
    );
    this.initShaders();
    this.initTexture();
    this.setTransparentTexture();
    this.loadImage();
    this.GL.clearColor(0, 0, 0, 0);
    this.GL.blendFunc(this.GL.SRC_ALPHA, this.GL.ONE_MINUS_SRC_ALPHA);
    this.visible = true;
    this.running = true;
    this.inited = true;
    this.setupPointerEvents();
    const step = () => {
      if (!this.destroyed) {
        this.step();
        this.time = requestAnimationFrame(step);
      }
    };
    this.time = requestAnimationFrame(step);
  }

  private setupPointerEvents() {
    this.target.addEventListener("mousedown", this.onClick);
    this.target.addEventListener("touchmove", this.onTouch);
    this.target.addEventListener("touchstart", this.onTouch);
    this.target.addEventListener("mousemove", this.onMouseMove);
  }

  private onClick(e: MouseEvent) {
    if (!this.pointerEventsEnabled) {
      return;
    }
    this.dropAtPointer(e, this.dropRadius * 1.5, 0.14);
  }

  private onTouch(e: TouchEvent) {
    if (!this.pointerEventsEnabled) {
      return;
    }
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
      this.dropAtPointer(touches[i], this.dropRadius, 0.01);
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.pointerEventsEnabled) {
      return;
    }
    this.dropAtPointer(e, this.dropRadius, 0.01);
  }

  private get pointerEventsEnabled() {
    return this.visible && this.running && this.interactive;
  }

  private loadImage() {
    const { backgroundImage } = window.getComputedStyle(this.target);
    const newImageSource =
      this.imageUrl ||
      this.extractUrl(this.originalCssBackgroundImage) ||
      this.extractUrl(backgroundImage);

    // If image source is unchanged, don't reload it.
    if (newImageSource == this.imageSource) {
      return;
    }

    this.imageSource = newImageSource;

    // Falsy source means no background.
    if (!this.imageSource) {
      this.setTransparentTexture();
      return;
    }

    // Load the texture from a new image.
    const image = new Image();
    image.onload = () => {
      const wrapping =
        this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height)
          ? this.GL.REPEAT
          : this.GL.CLAMP_TO_EDGE;

      this.GL.bindTexture(this.GL.TEXTURE_2D, this.backgroundTexture);
      this.GL.texParameteri(
        this.GL.TEXTURE_2D,
        this.GL.TEXTURE_WRAP_S,
        wrapping,
      );
      this.GL.texParameteri(
        this.GL.TEXTURE_2D,
        this.GL.TEXTURE_WRAP_T,
        wrapping,
      );
      this.GL.texImage2D(
        this.GL.TEXTURE_2D,
        0,
        this.GL.RGBA,
        this.GL.RGBA,
        this.GL.UNSIGNED_BYTE,
        image,
      );

      this.backgroundWidth = image.width;
      this.backgroundHeight = image.height;

      // Hide the background that we're replacing.
      this.hideCssBackground();
    };

    // Fall back to a transparent texture when loading the image failed.
    image.onerror = () => {
      this.setTransparentTexture();
    };

    // Disable CORS when the image source is a data URI.
    image.crossOrigin = this.isDataUri(this.imageSource)
      ? null
      : this.crossOrigin;

    image.src = this.imageSource;
  }

  private step() {
    if (!this.visible) {
      return;
    }
    this.computeTextureBoundaries();
    if (this.running) {
      this.update();
    }
    this.render();
  }

  private drawQuad() {
    this.GL.bindBuffer(this.GL.ARRAY_BUFFER, this.quad);
    this.GL.vertexAttribPointer(0, 2, this.GL.FLOAT, false, 0, 0);
    this.GL.drawArrays(this.GL.TRIANGLE_FAN, 0, 4);
  }

  private render() {
    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, null);
    this.GL.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.GL.enable(this.GL.BLEND);
    this.GL.clear(this.GL.COLOR_BUFFER_BIT | this.GL.DEPTH_BUFFER_BIT);
    this.GL.useProgram(this.renderProgram.id);

    this.bindTexture(this.backgroundTexture, 0);
    this.bindTexture(this.textures[0], 1);

    this.GL.uniform1f(
      this.renderProgram.locations.perturbance,
      this.perturbance,
    );
    this.GL.uniform2fv(
      this.renderProgram.locations.topLeft,
      // @ts-ignore
      this.renderProgram.uniforms.topLeft,
    );
    this.GL.uniform2fv(
      this.renderProgram.locations.bottomRight,
      // @ts-ignore
      this.renderProgram.uniforms.bottomRight,
    );
    this.GL.uniform2fv(
      this.renderProgram.locations.containerRatio,
      // @ts-ignore
      this.renderProgram.uniforms.containerRatio,
    );
    this.GL.uniform1i(this.renderProgram.locations.samplerBackground, 0);
    this.GL.uniform1i(this.renderProgram.locations.samplerRipples, 1);

    this.drawQuad();
    this.GL.disable(this.GL.BLEND);
  }

  private update() {
    this.GL.viewport(0, 0, this.resolution, this.resolution);

    this.GL.bindFramebuffer(
      this.GL.FRAMEBUFFER,
      this.frameBuffers[this.bufferWriteIndex],
    );
    this.bindTexture(this.textures[this.bufferReadIndex]);
    this.GL.useProgram(this.updateProgram.id);

    this.drawQuad();

    this.swapBufferIndices();
  }

  private swapBufferIndices() {
    this.bufferWriteIndex = 1 - this.bufferWriteIndex;
    this.bufferReadIndex = 1 - this.bufferReadIndex;
  }

  private computeBackgroundSize(
    backgroundSize: string,
    container: Record<string, number>,
  ): [width: number, height: number] {
    if (backgroundSize == "cover") {
      const scale = Math.max(
        container.width / this.backgroundWidth,
        container.height / this.backgroundHeight,
      );
      return [this.backgroundWidth * scale, this.backgroundHeight * scale];
    }
    if (backgroundSize == "contain") {
      const scale = Math.min(
        container.width / this.backgroundWidth,
        container.height / this.backgroundHeight,
      );
      return [this.backgroundWidth * scale, this.backgroundHeight * scale];
    }
    const BP = backgroundSize.split(" ");
    let backgroundWidth: any = BP[0] || "";
    let backgroundHeight: any = BP[1] || backgroundWidth;
    if (this.isPercentage(backgroundWidth)) {
      backgroundWidth = (container.width * parseFloat(backgroundWidth)) / 100;
    } else if (backgroundWidth != "auto") {
      backgroundWidth = parseFloat(backgroundWidth);
    }
    if (this.isPercentage(backgroundHeight)) {
      backgroundHeight =
        (container.height * parseFloat(backgroundHeight)) / 100;
    } else if (backgroundHeight != "auto") {
      backgroundHeight = parseFloat(backgroundHeight);
    }
    if (backgroundWidth == "auto" && backgroundHeight == "auto") {
      backgroundWidth = this.backgroundWidth;
      backgroundHeight = this.backgroundHeight;
    } else {
      if (backgroundWidth == "auto") {
        backgroundWidth =
          this.backgroundWidth * (backgroundHeight / this.backgroundHeight);
      }

      if (backgroundHeight == "auto") {
        backgroundHeight =
          this.backgroundHeight * (backgroundWidth / this.backgroundWidth);
      }
    }
    return [backgroundWidth, backgroundHeight];
  }

  private computeTextureBoundaries() {
    const styles = window.getComputedStyle(this.target);
    const {
      backgroundSize,
      backgroundAttachment,
      backgroundPosition: BP,
    } = styles;
    const backgroundPosition = this.translateBackgroundPosition(BP);
    const DOMRect = this.target.getBoundingClientRect();
    // Here the 'container' is the element which the background adapts to
    // (either the chrome window or some element, depending on attachment)
    let container: Record<string, number>;
    if (backgroundAttachment == "fixed") {
      container = { left: window.scrollX, top: window.scrollY };
      container.width = window.innerWidth;
      container.height = window.innerHeight;
    } else {
      container = DOMRect as unknown as Record<string, number>;
    }
    const [height, width] = this.computeBackgroundSize(
      backgroundSize,
      container,
    );

    let [x, y] = backgroundPosition as any[];

    if (this.isPercentage(x)) {
      x = container.left + ((container.width - width) * parseFloat(x)) / 100;
    } else {
      x = container.left + parseFloat(x);
    }

    if (this.isPercentage(y)) {
      y = container.top + ((container.height - height) * parseFloat(y)) / 100;
    } else {
      y = container.top + parseFloat(y);
    }

    const floats = new Float32Array([
      (DOMRect.left - x) / width,
      (DOMRect.top - y) / height,
    ]);

    this.renderProgram.uniforms.topLeft = floats;
    this.renderProgram.uniforms.bottomRight = new Float32Array([
      floats[0] + DOMRect.width / width,
      floats[1] + DOMRect.height / height,
    ]);

    const maxSide = Math.max(this.canvas.width, this.canvas.height);

    this.renderProgram.uniforms.containerRatio = new Float32Array([
      this.canvas.width / maxSide,
      this.canvas.height / maxSide,
    ]);
  }

  private initShaders() {
    const vertexShader = [
      "attribute vec2 vertex;",
      "varying vec2 coord;",
      "void main() {",
      "coord = vertex * 0.5 + 0.5;",
      "gl_Position = vec4(vertex, 0.0, 1.0);",
      "}",
    ].join("\n");

    this.dropProgram = this.createProgram(
      vertexShader,
      [
        "precision highp float;",

        "const float PI = 3.141592653589793;",
        "uniform sampler2D texture;",
        "uniform vec2 center;",
        "uniform float radius;",
        "uniform float strength;",

        "varying vec2 coord;",

        "void main() {",
        "vec4 info = texture2D(texture, coord);",

        "float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - coord) / radius);",
        "drop = 0.5 - cos(drop * PI) * 0.5;",

        "info.r += drop * strength;",

        "gl_FragColor = info;",
        "}",
      ].join("\n"),
    );

    this.updateProgram = this.createProgram(
      vertexShader,
      [
        "precision highp float;",

        "uniform sampler2D texture;",
        "uniform vec2 delta;",

        "varying vec2 coord;",

        "void main() {",
        "vec4 info = texture2D(texture, coord);",

        "vec2 dx = vec2(delta.x, 0.0);",
        "vec2 dy = vec2(0.0, delta.y);",

        "float average = (",
        "texture2D(texture, coord - dx).r +",
        "texture2D(texture, coord - dy).r +",
        "texture2D(texture, coord + dx).r +",
        "texture2D(texture, coord + dy).r",
        ") * 0.25;",

        "info.g += (average - info.r) * 2.0;",
        "info.g *= 0.995;",
        "info.r += info.g;",

        "gl_FragColor = info;",
        "}",
      ].join("\n"),
    );
    this.GL.uniform2fv(this.updateProgram.locations.delta, this.textureDelta);

    this.renderProgram = this.createProgram(
      [
        "precision highp float;",

        "attribute vec2 vertex;",
        "uniform vec2 topLeft;",
        "uniform vec2 bottomRight;",
        "uniform vec2 containerRatio;",
        "varying vec2 ripplesCoord;",
        "varying vec2 backgroundCoord;",
        "void main() {",
        "backgroundCoord = mix(topLeft, bottomRight, vertex * 0.5 + 0.5);",
        "backgroundCoord.y = 1.0 - backgroundCoord.y;",
        "ripplesCoord = vec2(vertex.x, -vertex.y) * containerRatio * 0.5 + 0.5;",
        "gl_Position = vec4(vertex.x, -vertex.y, 0.0, 1.0);",
        "}",
      ].join("\n"),
      [
        "precision highp float;",

        "uniform sampler2D samplerBackground;",
        "uniform sampler2D samplerRipples;",
        "uniform vec2 delta;",

        "uniform float perturbance;",
        "varying vec2 ripplesCoord;",
        "varying vec2 backgroundCoord;",

        "void main() {",
        "float height = texture2D(samplerRipples, ripplesCoord).r;",
        "float heightX = texture2D(samplerRipples, vec2(ripplesCoord.x + delta.x, ripplesCoord.y)).r;",
        "float heightY = texture2D(samplerRipples, vec2(ripplesCoord.x, ripplesCoord.y + delta.y)).r;",
        "vec3 dx = vec3(delta.x, heightX - height, 0.0);",
        "vec3 dy = vec3(0.0, heightY - height, delta.y);",
        "vec2 offset = -normalize(cross(dy, dx)).xz;",
        "float specular = pow(max(0.0, dot(offset, normalize(vec2(-0.6, 1.0)))), 4.0);",
        "gl_FragColor = texture2D(samplerBackground, backgroundCoord + offset * perturbance) + specular;",
        "}",
      ].join("\n"),
    );
    console.log(Object.assign({}, this.renderProgram));
    this.GL.uniform2fv(this.renderProgram.locations.delta, this.textureDelta);
  }

  private initTexture() {
    this.backgroundTexture = this.GL.createTexture();
    this.GL.bindTexture(this.GL.TEXTURE_2D, this.backgroundTexture);
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
  }

  private setTransparentTexture() {
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

  private hideCssBackground() {
    const inlineCss = this.target.style.backgroundImage;
    if (inlineCss == "none") {
      return;
    }
    this.originalInlineCss = inlineCss;
    this.originalCssBackgroundImage = window.getComputedStyle(
      this.target,
    ).backgroundImage;
    this.target.style.backgroundImage = "none";
  }

  private restoreCssBackground() {
    this.target.style.backgroundImage = this.originalInlineCss || "";
  }

  private dropAtPointer(
    pointer: MouseEvent | Touch,
    radius: number,
    strength: number,
  ) {
    const { borderTopWidth, borderLeftWidth } = window.getComputedStyle(
      this.target,
    );
    const borderTop = parseInt(borderTopWidth || "0");
    const borderLeft = parseInt(borderLeftWidth || "0");
    const { top, left } = this.target.getBoundingClientRect();
    this.drop(
      pointer.pageX - left - borderLeft,
      pointer.pageY - top - borderTop,
      radius,
      strength,
    );
  }
}

import { Animations } from "./Animation";
import type { IRipples, TargetOffset } from "./types";
import { WebGL } from "./WebGL";

export class Ripples extends WebGL {
  ID?: string;
  visible = false;
  running = false;
  destroyed = false;
  initialized = false;
  constructor(target: HTMLElement, options: Partial<IRipples>) {
    super(target, options);
    this.onClick = this.onClick.bind(this);
    this.onTouch = this.onTouch.bind(this);
    this.updateSize = this.updateSize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.cacheTargetPositions();
    this.setupWebGL();
  }

  public drop(x: number, y: number, radius: number, strength: number) {
    const { offsetHeight, offsetWidth } = this.target;
    const longestSide = Math.max(offsetHeight, offsetWidth);
    radius = radius / longestSide;
    const dropPosition = new Float32Array([
      (2 * x - offsetWidth) / longestSide,
      (offsetHeight - 2 * y) / longestSide,
    ]);
    this.GL.viewport(0, 0, this.resolution, this.resolution);
    this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, this.Textures.writeFrame);
    this.bindTexture(this.Textures.readTexture);
    this.Shaders.drop(dropPosition, radius, strength);
    this.Textures.drawQuad();
    this.Textures.swapBufferIndices();
  }

  public updateSize() {
    const { offsetHeight, offsetWidth } = this.target;
    if (
      offsetWidth * this.pixelRatio !== this.canvas.width ||
      offsetHeight * this.pixelRatio !== this.canvas.height
    ) {
      this.canvas.width = offsetWidth * this.pixelRatio;
      this.canvas.height = offsetHeight * this.pixelRatio;
      this.canvas.style.width = `${offsetWidth}px`;
      this.canvas.style.height = `${offsetHeight}px`;
      void this.reloadImage();
    }
  }

  public show() {
    this.visible = true;
    this.canvas.style.display = "block";
    this.hideCSSBackground();
  }

  public hide() {
    this.visible = false;
    this.canvas.style.display = "none";
    this.restoreCSSBackground();
  }

  public pause() {
    this.running = false;
  }

  public play() {
    this.running = true;
  }

  public destroy() {
    this.target.style.zIndex = this.StyleCache.get("zIndex");
    this.target.style.position = this.StyleCache.get("position");
    // @ts-ignore
    this.GL = null;
    window.removeEventListener("resize", this.updateSize);
    this.target.removeEventListener("mousedown", this.onClick);
    this.target.removeEventListener("touchmove", this.onTouch);
    this.target.removeEventListener("touchstart", this.onTouch);
    this.target.removeEventListener("mousemove", this.onMouseMove);
    this.target.removeChild(this.canvas);
    this.restoreCSSBackground();
    if (this.ID) {
      Animations.delete(this.ID);
    }
    this.destroyed = true;
  }

  public reloadImage() {
    this.restoreCSSBackground();
    this.StyleCache.evict("originalCSSBackgroundImage");
    return this.loadImage();
  }

  private cacheTargetPositions() {
    this.StyleCache.initialize(this.target);
    this.target.style.zIndex = "0";
    this.target.style.position = "relative";
  }

  private setupWebGL() {
    this.Textures.getBrowserExtensions();
    window.addEventListener("resize", this.updateSize);
    this.initializeWebGL();
    this.visible = true;
    this.running = true;
    this.initialized = true;
    this.setupPointerEvents();
    this.ID = Animations.register(() => {
      if (!this.destroyed) {
        this.step();
      }
    });
  }

  private setupPointerEvents() {
    this.target.addEventListener("mousedown", this.onClick);
    this.target.addEventListener("mousemove", this.onMouseMove);
    this.target.addEventListener("touchmove", this.onTouch, { passive: true });
    this.target.addEventListener("touchstart", this.onTouch, { passive: true });
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

  private computeBackgroundSize(
    backgroundSize: string,
    container: TargetOffset,
  ): [width: number, height: number] {
    const BW = this.StyleCache.get("backgroundWidth");
    const BH = this.StyleCache.get("backgroundHeight");
    if (backgroundSize == "cover") {
      const scale = Math.max(container.width / BW, container.height / BH);
      return [BW * scale, BH * scale];
    }
    if (backgroundSize == "contain") {
      const scale = Math.min(container.width / BW, container.height / BH);
      return [BW * scale, BH * scale];
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
      backgroundWidth = BW;
      backgroundHeight = BH;
    } else {
      if (backgroundWidth == "auto") {
        backgroundWidth = BW * (backgroundHeight / BH);
      }

      if (backgroundHeight == "auto") {
        backgroundHeight = BH * (backgroundWidth / BW);
      }
    }
    return [backgroundWidth, backgroundHeight];
  }

  private computeTextureBoundaries() {
    const {
      backgroundSize,
      backgroundAttachment,
      backgroundPosition: BP,
    } = window.getComputedStyle(this.target);
    const backgroundPosition = this.translateBackgroundPosition(BP);
    let container: TargetOffset;
    if (backgroundAttachment == "fixed") {
      container = {
        left: window.scrollX,
        top: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    } else {
      const { offsetTop, offsetLeft, offsetHeight, offsetWidth } = this.target;
      container = {
        top: offsetTop,
        left: offsetLeft,
        width: offsetWidth,
        height: offsetHeight,
      };
    }
    const [width, height] = this.computeBackgroundSize(
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
    const { offsetLeft, offsetTop, offsetHeight, offsetWidth } = this.target;
    const floats = new Float32Array([
      (offsetLeft - x) / width,
      (offsetTop - y) / height,
    ]);
    this.Shaders.renderProgram.uniforms.topLeft = floats;
    this.Shaders.renderProgram.uniforms.bottomRight = new Float32Array([
      floats[0] + offsetWidth / width,
      floats[1] + offsetHeight / height,
    ]);
    const maxSide = Math.max(this.canvas.width, this.canvas.height);
    this.Shaders.renderProgram.uniforms.containerRatio = new Float32Array([
      this.canvas.width / maxSide,
      this.canvas.height / maxSide,
    ]);
  }

  private translateBackgroundPosition(value: string) {
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

  private restoreCSSBackground() {
    this.target.style.backgroundImage =
      this.StyleCache.get("originalInlineCSS") || "";
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
    const { offsetTop, offsetLeft } = this.target;
    this.drop(
      pointer.pageX - offsetLeft - borderLeft,
      pointer.pageY - offsetTop - borderTop,
      radius,
      strength,
    );
  }
}

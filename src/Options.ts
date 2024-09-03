import type { Callback, IRipples } from "./types";

export class Options {
  resolution: number;
  pixelRatio: number;
  dropRadius: number;
  perturbance: number;
  crossOrigin: string;
  interactive: boolean;
  imageUrl: string | null;
  onInitialized?: Callback;
  constructor(options: Partial<IRipples>) {
    const configuration = this.configure(options);
    this.imageUrl = configuration.imageUrl;
    this.dropRadius = configuration.dropRadius;
    this.resolution = configuration.resolution;
    this.pixelRatio = configuration.pixelRatio;
    this.interactive = configuration.interactive;
    this.perturbance = configuration.perturbance;
    this.crossOrigin = configuration.crossOrigin;
    this.onInitialized = configuration.onInitialized;
  }

  public static defaults = {
    imageUrl: null,
    resolution: 256,
    pixelRatio: window.devicePixelRatio || 1,
    dropRadius: 20,
    perturbance: 0.03,
    interactive: true,
    crossOrigin: "",
  };

  private configure(options: Partial<IRipples>) {
    return Object.assign({}, Options.defaults, options);
  }

  protected extractUrl(value: string) {
    const urlMatch = /url\(["']?([^"']*)["']?\)/.exec(value);
    if (urlMatch == null) {
      return null;
    }

    return urlMatch[1];
  }

  protected isDataUri(url: string) {
    return url.match(/^data:/);
  }
}

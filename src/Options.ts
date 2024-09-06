import type { Callback, IRipples } from "./types";

export class Options {
  resolution: number;
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
    this.interactive = configuration.interactive;
    this.perturbance = configuration.perturbance;
    this.crossOrigin = configuration.crossOrigin;
    this.onInitialized = configuration.onInitialized;
    this.resolution = this.extractResolution(configuration.resolution);
  }

  public static readonly defaults = {
    imageUrl: null,
    resolution: 512,
    dropRadius: 10,
    perturbance: 0.02,
    interactive: true,
    crossOrigin: "",
  } as const;

  private configure(options: Partial<IRipples>) {
    return Object.assign({}, Options.defaults, options);
  }

  private extractResolution(resolution: number | "device") {
    if (typeof resolution === "number") {
      return resolution;
    }
    if (typeof window.devicePixelRatio === "number") {
      return Math.max(
        Options.defaults.resolution,
        256 * window.devicePixelRatio,
      );
    }
    return Options.defaults.resolution;
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

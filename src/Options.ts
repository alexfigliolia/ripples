import type { IRipples } from "./types";

export class Options {
  resolution: number;
  dropRadius: number;
  perturbance: number;
  crossOrigin: string;
  interactive: boolean;
  imageUrl: string | null;
  constructor(options: Partial<IRipples>) {
    const configuration = this.configure(options);
    this.imageUrl = configuration.imageUrl;
    this.dropRadius = configuration.dropRadius;
    this.resolution = configuration.resolution;
    this.interactive = configuration.interactive;
    this.perturbance = configuration.perturbance;
    this.crossOrigin = configuration.crossOrigin;
  }

  public static defaults = {
    imageUrl: null,
    resolution: 256,
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

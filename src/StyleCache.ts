import type { IStyleCache, StyleCacheKey } from "./types";

export class StyleCache extends Map<StyleCacheKey, IStyleCache[StyleCacheKey]> {
  constructor() {
    super([
      ["zIndex", ""],
      ["position", ""],
      ["backgroundWidth", 0],
      ["backgroundHeight", 0],
      ["originalInlineCSS", ""],
      ["originalCSSBackgroundImage", ""],
    ]);
  }

  public initialize(target: HTMLElement) {
    const { position, zIndex, backgroundImage } =
      window.getComputedStyle(target);
    this.set("zIndex", zIndex);
    this.set("position", position);
    this.set("originalCSSBackgroundImage", backgroundImage);
    this.set("originalInlineCSS", target.style.backgroundImage);
  }

  public override get<K extends StyleCacheKey>(key: K) {
    return super.get(key) as IStyleCache[K];
  }
}

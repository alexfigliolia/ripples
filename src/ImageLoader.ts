import type { Textures } from "./Textures";

export class ImageLoader {
  Textures: Textures;
  GL: WebGLRenderingContext;
  constructor(Textures: Textures) {
    this.Textures = Textures;
    this.GL = this.Textures.GL;
  }

  public load(src: string, crossOrigin: string) {
    const image = new Image();
    return new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => {
        this.textureIze(image);
        resolve(image);
      };
      image.onerror = () => {
        this.Textures.setTransparent();
        reject();
      };
      image.crossOrigin = this.isDataUri(src) ? null : crossOrigin;
      image.src = src;
    });
  }

  private textureIze(image: HTMLImageElement) {
    const wrapping =
      this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height)
        ? this.GL.REPEAT
        : this.GL.CLAMP_TO_EDGE;
    this.GL.bindTexture(this.GL.TEXTURE_2D, this.Textures.backgroundTexture);
    this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_WRAP_S, wrapping);
    this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_WRAP_T, wrapping);
    this.GL.texImage2D(
      this.GL.TEXTURE_2D,
      0,
      this.GL.RGBA,
      this.GL.RGBA,
      this.GL.UNSIGNED_BYTE,
      image,
    );
  }

  private isDataUri(url: string) {
    return url.match(/^data:/);
  }

  private isPowerOfTwo(x: number) {
    return (x & (x - 1)) == 0;
  }
}

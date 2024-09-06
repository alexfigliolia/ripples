export interface BrowserConfig {
  type: number;
  arrayType: Float32ArrayConstructor | null;
  linearSupport: boolean;
  extensions: string[];
}

export interface IRipples {
  imageUrl: null | string;
  resolution: number | "device";
  dropRadius: number;
  perturbance: number;
  interactive: boolean;
  crossOrigin: string;
  onInitialized?: Callback;
}

export interface Extensions {
  OES_texture_float: OES_texture_float;
  OES_texture_half_float: OES_texture_half_float;
  OES_texture_float_linear: OES_texture_float_linear;
  OES_texture_half_float_linear: OES_texture_half_float_linear;
}

export interface Program {
  id: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  locations: Record<string, WebGLUniformLocation>;
}

export interface TargetOffset {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface IStyleCache {
  zIndex: string;
  position: string;
  backgroundWidth: number;
  backgroundHeight: number;
  originalInlineCSS: string;
  originalCSSBackgroundImage: string;
}

export type StyleCacheKey = keyof IStyleCache;

export type Callback = () => void;

export interface BrowserConfig {
  type: number;
  arrayType: Float32ArrayConstructor | null;
  linearSupport: boolean;
  extensions: string[];
}

export interface IRipples {
  imageUrl: null | string;
  resolution: number;
  dropRadius: number;
  perturbance: number;
  interactive: boolean;
  crossOrigin: string;
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

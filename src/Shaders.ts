import type { Program } from "./types";

export class Shaders {
  dropProgram: Program;
  updateProgram: Program;
  renderProgram: Program;
  GL: WebGLRenderingContext;
  textureDelta: Float32Array;
  constructor(GL: WebGLRenderingContext, resolution: number) {
    this.GL = GL;
    this.textureDelta = new Float32Array([1 / resolution, 1 / resolution]);
    this.dropProgram = this.compileDrop();
    this.updateProgram = this.compileUpdate();
    this.GL.uniform2fv(this.updateProgram.locations.delta, this.textureDelta);
    this.renderProgram = this.compileRender();
    this.GL.uniform2fv(this.renderProgram.locations.delta, this.textureDelta);
  }

  public drop(position: Float32Array, radius: number, strength: number) {
    if (this.dropProgram) {
      this.GL.useProgram(this.dropProgram.id);
      this.GL.uniform2fv(this.dropProgram.locations.center, position);
      this.GL.uniform1f(this.dropProgram.locations.radius, radius);
      this.GL.uniform1f(this.dropProgram.locations.strength, strength);
    }
  }

  public render(perturbance: number) {
    this.GL.uniform1f(this.renderProgram.locations.perturbance, perturbance);
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
  }

  private compileDrop() {
    return this.createProgram(Shaders.VERTEX_SHADER, Shaders.DROP_PROGRAM);
  }

  private compileUpdate() {
    return this.createProgram(Shaders.VERTEX_SHADER, Shaders.UPDATE_PROGRAM);
  }

  private compileRender() {
    return this.createProgram(
      Shaders.RENDER_BACKGROUND_PROGRAM,
      Shaders.RENDER_RIPPLE_PROGRAM,
    );
  }

  private createProgram(vertexSource: string, fragmentSource: string) {
    if (!this.GL) {
      throw new Error("Cannot initialize shaders without a rendering context");
    }
    const program = { id: this.GL.createProgram()! } as Program;
    this.GL.attachShader(
      program.id,
      this.compileSource(this.GL.VERTEX_SHADER, vertexSource),
    );
    this.GL.attachShader(
      program.id,
      this.compileSource(this.GL.FRAGMENT_SHADER, fragmentSource),
    );
    this.GL.linkProgram(program.id);
    if (!this.GL.getProgramParameter(program.id, this.GL.LINK_STATUS)) {
      throw new Error("link error: " + this.GL.getProgramInfoLog(program.id)!);
    }
    program.uniforms = {};
    program.locations = {};
    this.GL.useProgram(program.id);
    this.GL.enableVertexAttribArray(0);
    let match, name;
    const regex = /uniform (\w+) (\w+)/g;
    const shaderCode = vertexSource + fragmentSource;
    while ((match = regex.exec(shaderCode)) != null) {
      name = match[2];
      program.locations[name] = this.GL.getUniformLocation(program.id, name)!;
    }
    return program;
  }

  private compileSource(type: GLenum, source: string) {
    if (!this.GL) {
      throw new Error("Cannot initialize shaders without a rendering context");
    }
    const shader = this.GL.createShader(type)!;
    this.GL.shaderSource(shader, source);
    this.GL.compileShader(shader);
    if (!this.GL.getShaderParameter(shader, this.GL.COMPILE_STATUS)) {
      throw new Error("compile error: " + this.GL.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  private static readonly VERTEX_SHADER = [
    "attribute vec2 vertex;",
    "varying vec2 coord;",
    "void main() {",
    "coord = vertex * 0.5 + 0.5;",
    "gl_Position = vec4(vertex, 0.0, 1.0);",
    "}",
  ].join("\n");

  private static readonly DROP_PROGRAM = [
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
  ].join("\n");

  private static readonly UPDATE_PROGRAM = [
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
  ].join("\n");

  private static readonly RENDER_BACKGROUND_PROGRAM = [
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
  ].join("\n");

  private static readonly RENDER_RIPPLE_PROGRAM = [
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
  ].join("\n");
}

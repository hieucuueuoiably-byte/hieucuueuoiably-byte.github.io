import * as THREE from 'three'
import { SCREEN_VERTEX } from './BackgroundMaterial'

/** Ponpon solver base with longer cloud trails and stronger vorticity for this homepage. */
const SETTINGS = {
  simulationResolution: 64,
  dyeResolution: 256,
  pressureIterations: 3,
  densityDissipation: 0.965,
  velocityDissipation: 0.92,
  pressureDissipation: 1,
  curl: 8,
  splatRadius: 0.01,
  pointerForce: 5,
} as const

/** YQ.createFluid: original directory values, independent of homepage tuning. */
export const DIRECTORY_FLUID_SETTINGS = {
  ...SETTINGS,
  densityDissipation: .95,
  velocityDissipation: .9,
  pressureDissipation: .95,
  curl: 1,
  splatRadius: .15 / 100,
} as const

const COMMON = /* glsl */ `
varying vec2 vUv;
uniform vec2 uTexel;
`

const CLEAR = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uSource;
uniform float uKeep;
void main() {
  gl_FragColor = vec4(texture2D(uSource, vUv).rgb * uKeep, 1.0);
}
`

const ZERO = /* glsl */ `
void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }
`

const SPLAT = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uPoint;
uniform vec3 uImpulse;
uniform float uAspect;
uniform float uRadius;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 impulse = exp(-dot(p, p) / max(0.00001, uRadius)) * uImpulse;
  vec3 base = texture2D(uSource, vUv).rgb;
  gl_FragColor = vec4(clamp(base + impulse, vec3(-2000.0), vec3(2000.0)), 1.0);
}
`

// Manual bilinear sampling also works when half-float linear filtering is absent.
const ADVECTION = /* glsl */ `
${COMMON}
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uSourceTexel;
uniform float uDt;
uniform float uKeep;
vec4 bilerp(sampler2D tex, vec2 uv, vec2 texel) {
  vec2 st = uv / texel - 0.5;
  vec2 cell = floor(st);
  vec2 f = fract(st);
  vec4 a = texture2D(tex, (cell + vec2(0.5, 0.5)) * texel);
  vec4 b = texture2D(tex, (cell + vec2(1.5, 0.5)) * texel);
  vec4 c = texture2D(tex, (cell + vec2(0.5, 1.5)) * texel);
  vec4 d = texture2D(tex, (cell + vec2(1.5, 1.5)) * texel);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  vec2 velocity = bilerp(uVelocity, vUv, uTexel).xy;
  vec2 coord = vUv - uDt * velocity * uTexel;
  gl_FragColor = vec4(bilerp(uSource, coord, uSourceTexel).rgb * uKeep, 1.0);
}
`

const CURL = /* glsl */ `
${COMMON}
uniform sampler2D uVelocity;
void main() {
  float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}
`

const VORTICITY = /* glsl */ `
${COMMON}
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
void main() {
  float l = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float center = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * center;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(clamp(velocity, vec2(-2000.0), vec2(2000.0)), 0.0, 1.0);
}
`

const DIVERGENCE = /* glsl */ `
${COMMON}
uniform sampler2D uVelocity;
void main() {
  vec2 left = vUv - vec2(uTexel.x, 0.0);
  vec2 right = vUv + vec2(uTexel.x, 0.0);
  vec2 top = vUv + vec2(0.0, uTexel.y);
  vec2 bottom = vUv - vec2(0.0, uTexel.y);
  vec2 center = texture2D(uVelocity, vUv).xy;
  float l = left.x < 0.0 ? -center.x : texture2D(uVelocity, left).x;
  float r = right.x > 1.0 ? -center.x : texture2D(uVelocity, right).x;
  float t = top.y > 1.0 ? -center.y : texture2D(uVelocity, top).y;
  float b = bottom.y < 0.0 ? -center.y : texture2D(uVelocity, bottom).y;
  gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}
`

const PRESSURE = /* glsl */ `
${COMMON}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((l + r + t + b - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`

const GRADIENT = /* glsl */ `
${COMMON}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(r - l, t - b);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`

interface PingPong {
  read: THREE.WebGLRenderTarget
  write: THREE.WebGLRenderTarget
}
interface Splat {
  x: number
  y: number
  dx: number
  dy: number
}

/**
 * A real, low-resolution incompressible fluid solver sharing the site's renderer.
 * Its density texture carries signed XY mouse dye and a positive Z concentration,
 * matching the original homepage's tFluid. Rebind `texture` after each update:
 * its identity alternates between the two density render targets.
 */
export class HomeFluid {
  readonly supported: boolean
  private scene = new THREE.Scene()
  private camera = new THREE.Camera()
  private geometry = new THREE.PlaneGeometry(2, 2)
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  private materials: THREE.ShaderMaterial[] = []
  private zero: THREE.ShaderMaterial
  private clear: THREE.ShaderMaterial
  private splat: THREE.ShaderMaterial
  private advection: THREE.ShaderMaterial
  private curlPass: THREE.ShaderMaterial
  private vorticity: THREE.ShaderMaterial
  private divergencePass: THREE.ShaderMaterial
  private pressurePass: THREE.ShaderMaterial
  private gradient: THREE.ShaderMaterial
  private density: PingPong | null = null
  private velocity: PingPong | null = null
  private pressure: PingPong | null = null
  private curl: THREE.WebGLRenderTarget | null = null
  private divergence: THREE.WebGLRenderTarget | null = null
  private neutral = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat)
  private simulationTexel = new THREE.Vector2()
  private dyeTexel = new THREE.Vector2()
  private sourceTexel = new THREE.Vector2()
  private splats: Splat[] = []
  private width = 1
  private height = 1
  private aspect = 1
  private reducedMotion = false
  private disposed = false
  private linearFiltering = false
  private savedViewport = new THREE.Vector4()
  private savedCurrentViewport = new THREE.Vector4()
  private savedScissor = new THREE.Vector4()
  private savedCurrentScissor = new THREE.Vector4()
  private savedClearColor = new THREE.Color()
  private diagnosticTarget:THREE.WebGLRenderTarget|null=null
  private diagnosticMaterial:THREE.ShaderMaterial|null=null
  private diagnosticPixel=new Uint8Array(4)

  constructor(private renderer: THREE.WebGLRenderer, private settings: { [K in keyof typeof SETTINGS]: number } = SETTINGS) {
    this.simulationTexel.set(1 / settings.simulationResolution, 1 / settings.simulationResolution)
    this.dyeTexel.set(1 / settings.dyeResolution, 1 / settings.dyeResolution)
    this.neutral.colorSpace = THREE.NoColorSpace
    this.neutral.minFilter = THREE.LinearFilter
    this.neutral.magFilter = THREE.LinearFilter
    this.neutral.generateMipmaps = false
    this.neutral.needsUpdate = true
    this.zero = this.material('HomeFluidZero', ZERO)
    this.clear = this.material('HomeFluidPressureDecay', CLEAR, {
      uSource: { value: null }, uKeep: { value: this.settings.pressureDissipation },
    })
    this.splat = this.material('HomeFluidSplat', SPLAT, {
      uSource: { value: null }, uPoint: { value: new THREE.Vector2() },
      uImpulse: { value: new THREE.Vector3() }, uAspect: { value: 1 },
      uRadius: { value: this.settings.splatRadius },
    })
    this.advection = this.material('HomeFluidAdvection', ADVECTION, {
      uVelocity: { value: null }, uSource: { value: null },
      uSourceTexel: { value: this.sourceTexel }, uDt: { value: 1 / 60 }, uKeep: { value: 1 },
    })
    this.curlPass = this.material('HomeFluidCurl', CURL, { uVelocity: { value: null } })
    this.vorticity = this.material('HomeFluidVorticity', VORTICITY, {
      uVelocity: { value: null }, uCurl: { value: null },
      uCurlStrength: { value: this.settings.curl }, uDt: { value: 1 / 60 },
    })
    this.divergencePass = this.material('HomeFluidDivergence', DIVERGENCE, { uVelocity: { value: null } })
    this.pressurePass = this.material('HomeFluidJacobi', PRESSURE, {
      uPressure: { value: null }, uDivergence: { value: null },
    })
    this.gradient = this.material('HomeFluidGradientSubtract', GRADIENT, {
      uPressure: { value: null }, uVelocity: { value: null },
    })
    this.quad = new THREE.Mesh(this.geometry, this.zero)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
    this.supported = this.supportsHalfFloatTargets()
    // A neutral texture is the deliberate fallback when signed float FBOs are
    // unavailable. Encoding signed velocity into an 8-bit colour FBO would change
    // the tFluid contract and can create a permanent whole-screen displacement.
    if (this.supported) {
      this.linearFiltering = renderer.capabilities.isWebGL2 || renderer.extensions.has('OES_texture_half_float_linear')
      this.velocity = this.pair(this.settings.simulationResolution, this.settings.simulationResolution)
      this.pressure = this.pair(this.settings.simulationResolution, this.settings.simulationResolution, false)
      this.density = this.pair(this.settings.dyeResolution, this.settings.dyeResolution)
      this.curl = this.target(this.settings.simulationResolution, this.settings.simulationResolution, false)
      this.divergence = this.target(this.settings.simulationResolution, this.settings.simulationResolution, false)
      this.setSize(renderer.domElement.clientWidth || renderer.domElement.width || 1,
        renderer.domElement.clientHeight || renderer.domElement.height || 1)
    }
  }

  get texture(): THREE.Texture { return this.density?.read.texture ?? this.neutral }

  /** Opt-in GPU measurement of cloud-zone displacement, never used in normal rendering. */
  readCloudFlow(gain:number) {
    return this.readFlowDisplacement(.00025, gain, .375, true)
  }

  /** Sample the actual density texture; diagnostics never inject pointer motion. */
  readFlowDisplacement(uvScale:number, gain=1, coverage=1, bounded=false) {
    if(!this.density||this.disposed||this.renderer.getContext().isContextLost())return 0
    if(!this.diagnosticTarget){
      this.diagnosticTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter})
      this.diagnosticTarget.texture.colorSpace=THREE.NoColorSpace
      this.diagnosticMaterial=this.material('HomeCloudFlowInspection',`
        uniform sampler2D uDensity;uniform vec2 uPixels;uniform float uGain;
        uniform float uUvScale;uniform float uCoverage;uniform float uBounded;
        void main(){float peak=0.;
          for(int y=0;y<32;y++){for(int x=0;x<32;x++){
            vec2 uv=vec2((float(x)+.5)/32.,(float(y)+.5)/32.*uCoverage);
            vec2 dye=texture2D(uDensity,uv).xy;
            vec2 drag=dye*uUvScale*uGain;
            vec2 warp=mix(drag,drag/(vec2(1.)+abs(drag)/.055),uBounded);
            peak=max(peak,length(warp*uPixels));
          }}
          gl_FragColor=vec4(min(peak/128.,1.),0.,0.,1.);
        }`,{uDensity:{value:null},uPixels:{value:new THREE.Vector2()},uGain:{value:gain},uUvScale:{value:uvScale},uCoverage:{value:coverage},uBounded:{value:bounded?1:0}})
    }
    const material=this.diagnosticMaterial!,target=this.diagnosticTarget
    material.uniforms.uDensity.value=this.texture;material.uniforms.uPixels.value.set(this.width,this.height);material.uniforms.uGain.value=gain
    material.uniforms.uUvScale.value=uvScale;material.uniforms.uCoverage.value=coverage;material.uniforms.uBounded.value=bounded?1:0
    this.preserveRendererState(()=>{this.render(material,target);this.renderer.readRenderTargetPixels(target,0,0,1,1,this.diagnosticPixel)})
    return this.diagnosticPixel[0]/255*128
  }

  /** UV and UV displacement both use an upward-positive Y axis. */
  setPointer(x: number, y: number, dx: number, dy: number) {
    if (this.disposed || !this.supported || this.reducedMotion) return
    if (![x, y, dx, dy].every(Number.isFinite) || Math.abs(dx) + Math.abs(dy) < 0.0000001) return
    const point = {
      x: THREE.MathUtils.clamp(x, 0, 1), y: THREE.MathUtils.clamp(y, 0, 1),
      dx: THREE.MathUtils.clamp(dx, -0.25, 0.25), dy: THREE.MathUtils.clamp(dy, -0.25, 0.25),
    }
    // Bound the work per animation frame on very high-frequency pointing devices.
    if (this.splats.length < 8) this.splats.push(point)
    else {
      const last = this.splats[this.splats.length - 1]
      last.x = point.x; last.y = point.y
      last.dx = THREE.MathUtils.clamp(last.dx + point.dx, -0.25, 0.25)
      last.dy = THREE.MathUtils.clamp(last.dy + point.dy, -0.25, 0.25)
    }
  }

  update(dtSeconds: number) {
    const velocity = this.velocity, density = this.density, pressure = this.pressure
    const curl = this.curl, divergence = this.divergence
    if (this.disposed || this.reducedMotion || !velocity || !density || !pressure || !curl || !divergence) return
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || this.renderer.getContext().isContextLost()) return
    // Avoid an unstable giant advection step after the tab resumes.
    const dt = Math.min(dtSeconds, 1 / 30)
    const frameUnits = dt * 60
    this.preserveRendererState(() => {
      for (const pointer of this.splats) {
        const u = this.splat.uniforms
        u.uPoint.value.set(pointer.x, pointer.y)
        u.uImpulse.value.set(pointer.dx * this.width * this.settings.pointerForce,
          pointer.dy * this.height * this.settings.pointerForce, 1)
        u.uSource.value = velocity.read.texture
        this.render(this.splat, velocity.write)
        this.swap(velocity)
        u.uSource.value = density.read.texture
        this.render(this.splat, density.write)
        this.swap(density)
      }
      this.splats.length = 0

      this.curlPass.uniforms.uVelocity.value = velocity.read.texture
      this.render(this.curlPass, curl)
      this.vorticity.uniforms.uVelocity.value = velocity.read.texture
      this.vorticity.uniforms.uCurl.value = curl.texture
      this.vorticity.uniforms.uDt.value = dt
      this.render(this.vorticity, velocity.write)
      this.swap(velocity)
      this.divergencePass.uniforms.uVelocity.value = velocity.read.texture
      this.render(this.divergencePass, divergence)

      this.clear.uniforms.uSource.value = pressure.read.texture
      this.clear.uniforms.uKeep.value = Math.pow(this.settings.pressureDissipation, frameUnits)
      this.render(this.clear, pressure.write)
      this.swap(pressure)
      this.pressurePass.uniforms.uDivergence.value = divergence.texture
      for (let i = 0; i < this.settings.pressureIterations; i++) {
        this.pressurePass.uniforms.uPressure.value = pressure.read.texture
        this.render(this.pressurePass, pressure.write)
        this.swap(pressure)
      }
      this.gradient.uniforms.uPressure.value = pressure.read.texture
      this.gradient.uniforms.uVelocity.value = velocity.read.texture
      this.render(this.gradient, velocity.write)
      this.swap(velocity)

      const u = this.advection.uniforms
      u.uDt.value = dt
      u.uVelocity.value = velocity.read.texture
      u.uSource.value = velocity.read.texture
      u.uKeep.value = Math.pow(this.settings.velocityDissipation, frameUnits)
      this.sourceTexel.copy(this.simulationTexel)
      this.render(this.advection, velocity.write)
      this.swap(velocity)
      u.uVelocity.value = velocity.read.texture
      u.uSource.value = density.read.texture
      u.uKeep.value = Math.pow(this.settings.densityDissipation, frameUnits)
      this.sourceTexel.copy(this.dyeTexel)
      this.render(this.advection, density.write)
      this.swap(density)
    })
  }

  setSize(width: number, height: number) {
    if (this.disposed) return
    this.width = Number.isFinite(width) ? Math.max(1, width) : 1
    this.height = Number.isFinite(height) ? Math.max(1, height) : 1
    this.aspect = this.width / this.height
    this.splat.uniforms.uAspect.value = this.aspect
    // The Gaussian stays circular in screen space on portrait as well as landscape.
    this.splat.uniforms.uRadius.value = this.settings.splatRadius * Math.min(this.aspect, 1)
    if (!this.velocity || !this.density || !this.pressure || !this.curl || !this.divergence) return
    const [simWidth, simHeight] = this.resolution(this.settings.simulationResolution)
    const [dyeWidth, dyeHeight] = this.resolution(this.settings.dyeResolution)
    if (this.velocity.read.width === simWidth && this.velocity.read.height === simHeight
      && this.density.read.width === dyeWidth && this.density.read.height === dyeHeight) {
      // Constructor targets have not yet been initialized/cleared.
      if (this.simulationTexel.x === 1 / simWidth && this.simulationTexel.y === 1 / simHeight) this.reset()
      return
    }
    for (const target of [this.velocity.read, this.velocity.write, this.pressure.read,
      this.pressure.write, this.curl, this.divergence]) target.setSize(simWidth, simHeight)
    for (const target of [this.density.read, this.density.write]) target.setSize(dyeWidth, dyeHeight)
    this.simulationTexel.set(1 / simWidth, 1 / simHeight)
    this.dyeTexel.set(1 / dyeWidth, 1 / dyeHeight)
    this.reset()
  }

  setReducedMotion(enabled: boolean) {
    if (this.disposed || this.reducedMotion === enabled) return
    this.reducedMotion = enabled
    this.reset()
  }

  reset() {
    this.splats.length = 0
    if (this.disposed || !this.velocity || !this.pressure || !this.density || !this.curl || !this.divergence) return
    if (this.renderer.getContext().isContextLost()) return
    this.preserveRendererState(() => {
      for (const target of [this.velocity!.read, this.velocity!.write, this.pressure!.read,
        this.pressure!.write, this.density!.read, this.density!.write, this.curl!, this.divergence!]) {
        this.render(this.zero, target)
      }
    })
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.splats.length = 0
    for (const pair of [this.velocity, this.density, this.pressure]) {
      pair?.read.dispose(); pair?.write.dispose()
    }
    this.curl?.dispose(); this.divergence?.dispose()
    this.diagnosticTarget?.dispose();this.diagnosticTarget=null;this.diagnosticMaterial=null
    this.velocity = null; this.density = null; this.pressure = null
    this.curl = null; this.divergence = null
    this.materials.forEach(material => material.dispose())
    this.materials.length = 0
    this.geometry.dispose()
    this.neutral.dispose()
    this.scene.clear()
  }

  private material(name: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform> = {}) {
    const material = new THREE.ShaderMaterial({
      name, vertexShader: SCREEN_VERTEX, fragmentShader,
      uniforms: { uTexel: { value: this.simulationTexel }, ...uniforms },
      depthTest: false, depthWrite: false, blending: THREE.NoBlending,
      transparent: false, toneMapped: false,
    })
    this.materials.push(material)
    return material
  }

  private target(width: number, height: number, filtered = true) {
    const linear = filtered && this.linearFiltering
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
      magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    })
    target.texture.colorSpace = THREE.NoColorSpace
    target.texture.name = 'HomeFluidField'
    return target
  }

  private pair(width: number, height: number, filtered = true): PingPong {
    return { read: this.target(width, height, filtered), write: this.target(width, height, filtered) }
  }

  private swap(pair: PingPong) {
    const previous = pair.read
    pair.read = pair.write
    pair.write = previous
  }

  private resolution(base: number): [number, number] {
    const aspect = THREE.MathUtils.clamp(this.aspect, 1 / 8, 8)
    let width = aspect >= 1 ? Math.round(base * aspect) : base
    let height = aspect >= 1 ? base : Math.round(base / aspect)
    const limit = Math.min(this.renderer.capabilities.maxTextureSize, 1024)
    const scale = Math.min(1, limit / Math.max(width, height))
    width = Math.max(4, Math.round(width * scale))
    height = Math.max(4, Math.round(height * scale))
    return [width, height]
  }

  private render(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.quad.material = material
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, this.camera)
  }

  private supportsHalfFloatTargets(): boolean {
    const extensions = this.renderer.extensions
    const hasFloatBuffer = extensions.has('EXT_color_buffer_float') || extensions.has('EXT_color_buffer_half_float')
    if (!hasFloatBuffer || this.renderer.getContext().isContextLost()) return false
    let complete = false
    const probe = this.target(4, 4, false)
    try {
      this.preserveRendererState(() => {
        this.renderer.setRenderTarget(probe)
        const gl = this.renderer.getContext()
        complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
      })
    } catch {
      complete = false
    } finally {
      probe.dispose()
    }
    return complete
  }

  /** Simulation passes cannot alter the scene renderer's viewport or wipe targets. */
  private preserveRendererState(work: () => void) {
    const renderer = this.renderer
    const gl = renderer.getContext()
    const target = renderer.getRenderTarget()
    const cubeFace = renderer.getActiveCubeFace()
    const mipLevel = renderer.getActiveMipmapLevel()
    const autoClear = renderer.autoClear
    const scissorTest = renderer.getScissorTest()
    const currentScissorTest = gl.isEnabled(gl.SCISSOR_TEST)
    const clearAlpha = renderer.getClearAlpha()
    renderer.getViewport(this.savedViewport)
    renderer.getCurrentViewport(this.savedCurrentViewport)
    renderer.getScissor(this.savedScissor)
    renderer.getClearColor(this.savedClearColor)
    const currentScissor = gl.getParameter(gl.SCISSOR_BOX) as Int32Array
    this.savedCurrentScissor.set(currentScissor[0], currentScissor[1], currentScissor[2], currentScissor[3])
    renderer.autoClear = false
    try {
      work()
    } finally {
      renderer.autoClear = autoClear
      renderer.setClearColor(this.savedClearColor, clearAlpha)
      renderer.setViewport(this.savedViewport)
      renderer.setScissor(this.savedScissor)
      renderer.setScissorTest(scissorTest)
      renderer.setRenderTarget(target, cubeFace, mipLevel)
      renderer.state.viewport(this.savedCurrentViewport)
      renderer.state.scissor(this.savedCurrentScissor)
      renderer.state.setScissorTest(currentScissorTest)
    }
  }
}

import * as THREE from 'three'
import { SCREEN_VERTEX } from './BackgroundMaterial'
import { CLOUD_VERTEX, CLOUD_FRAGMENT, CLOUD_COMPOSITE_FRAGMENT } from './HomeOriginalShaders'

export const FOREGROUND_CLOUD_COUNT = 64
const MAIN_CLOUD_COUNT = 40
const cloudLane = (i: number) => i < MAIN_CLOUD_COUNT ? i / (MAIN_CLOUD_COUNT - 1) : (i - MAIN_CLOUD_COUNT + .5) / (FOREGROUND_CLOUD_COUNT - MAIN_CLOUD_COUNT)

/** Ponpon's cloud bank, expanded to 64 instances and two staggered rows.
 * Source: publicly served CfE0pqJa.js, kJ / EJ / RJ and the archived cloud class.
 * Original GLSL, repulsion radius and per-cloud spring/friction are retained.
 * The v6 adapter adds bounded fluid gain; silhouettes and spring logic are retained.
 */
export class HomeForegroundClouds {
  readonly count = FOREGROUND_CLOUD_COUNT
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(45, 1, 2, 80)
  private screen = new THREE.Scene()
  private screenCamera = new THREE.Camera()
  private raw = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
  private outlined = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false })
  private resolution = new THREE.Vector2(1, 1)
  private viewport = new THREE.Vector2()
  private base = new Float32Array(FOREGROUND_CLOUD_COUNT * 3)
  private positions = new Float32Array(FOREGROUND_CLOUD_COUNT * 3)
  private random = new Float32Array(FOREGROUND_CLOUD_COUNT * 4)
  private velocity = new Float32Array(FOREGROUND_CLOUD_COUNT * 2)
  private accumulator = 0
  private mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>
  private composite: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  displacement = 0
  get texture() { return this.outlined.texture }

  constructor(private renderer: THREE.WebGLRenderer, fluid: THREE.Texture) {
    this.camera.position.z = 5
    this.raw.texture.colorSpace = this.outlined.texture.colorSpace = THREE.NoColorSpace
    const geometry = new THREE.InstancedBufferGeometry(), plane = new THREE.PlaneGeometry(2, 2)
    geometry.index = plane.index!.clone()
    geometry.setAttribute('position', plane.getAttribute('position').clone())
    geometry.setAttribute('uv', plane.getAttribute('uv').clone())
    plane.dispose()
    for (let i = 0; i < this.count; i++) {
      const t = cloudLane(i), tilt = t * 2 - 1, edge = Math.abs(tilt), sign = i % 2 === 0 ? 1 : -1
      const y = THREE.MathUtils.mapLinear(edge, .2, 1, .1, .2) * sign
        + THREE.MathUtils.mapLinear(edge, .4, 1.2, 0, .4) - 1.565
        + (i >= MAIN_CLOUD_COUNT ? edge * .3 - .2 : 0)
        // Leave a little floor visible beneath the foreground actors while
        // keeping the full cloud bank at the edges and below the stage.
        - .11*Math.exp(-Math.pow((tilt+.20)/.24,2))
        - .11*Math.exp(-Math.pow((tilt-.34)/.24,2))
      this.base.set([-3.3 + t * 6.6, y, (i < MAIN_CLOUD_COUNT ? 1 : .7) + ((i * 13) % 17) / 340], i * 3)
      this.random.set([((i * 19 + 3) % 41) / 41, ((i * 23 + 7) % 43) / 43, ((i * 17 + 11) % 47) / 47, tilt], i * 4)
    }
    this.positions.set(this.base)
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('random', new THREE.InstancedBufferAttribute(this.random, 4))
    geometry.instanceCount = this.count
    const color = new THREE.Color().setHex(0xec8db6, THREE.LinearSRGBColorSpace)
    const uniforms = {
      uColor: { value: color }, uFluid: { value: fluid }, uTime: { value: 0 },
      uResolution: { value: this.resolution }, uIntro: { value: 1 }, uIntro2: { value: 1 },
    }
    const vertex = CLOUD_VERTEX.replace(/^attribute vec3 position;\s*/, '').replace(/^attribute vec2 uv;\s*/m, '')
      .replace(/^uniform mat4 (modelMatrix|viewMatrix|projectionMatrix);\s*/gm, '')
    this.mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
      name: 'ReferenceInstancedClouds', vertexShader: vertex, fragmentShader: CLOUD_FRAGMENT,
      uniforms, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    }))
    this.mesh.frustumCulled = false; this.scene.add(this.mesh)
    this.composite = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      name: 'ReferenceCloudOutlineAndFluid', vertexShader: SCREEN_VERTEX, fragmentShader: CLOUD_COMPOSITE_FRAGMENT
        .replace('uniform sampler2D uFluid;', 'uniform sampler2D uFluid;\nuniform float uFluidStrength;')
        .replace('uv += disp -fluid.xy * 0.00025;', 'vec2 drag = fluid.xy * 0.00025 * uFluidStrength;\n    uv += disp -drag / (vec2(1.) + abs(drag) / .055);'),
      depthWrite: false, depthTest: false, blending: THREE.NoBlending, toneMapped: false,
      uniforms: { tMap: { value: this.raw.texture }, uFluid: { value: fluid }, uTime: { value: 0 },
        uResolution: { value: this.resolution }, uColor: { value: color }, uAlpha: { value: 1 },uFluidStrength:{value:1.5} },
    }))
    this.screen.add(this.composite)
  }
  setSize(width: number, height: number, dpr: number) {
    const w = Math.max(1, Math.round(width * Math.min(dpr, 1.5))), h = Math.max(1, Math.round(height * Math.min(dpr, 1.5)))
    this.resolution.set(w, h); this.raw.setSize(w, h); this.outlined.setSize(w, h)
    this.camera.aspect = width / height
    this.camera.fov = THREE.MathUtils.mapLinear(THREE.MathUtils.clamp(width / height, .8, 1.25), .8, 1.25, 50, 45)
    this.camera.updateProjectionMatrix()
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 5
    this.viewport.set(viewH * width / height, viewH)
    // Preserve the reference's full-width bank on ultrawide and portrait screens.
    const fit = Math.max(.42, this.viewport.x / 7.36)
    for (let i = 0; i < this.count; i++) this.base[i * 3] = (-3.3 + cloudLane(i) * 6.6) * fit
    this.positions.set(this.base); this.velocity.fill(0)
  }
  reset() { this.positions.set(this.base); this.velocity.fill(0); this.accumulator = 0 }
  update(dt: number, time: number, mouse: THREE.Vector2, intro: number, scaleIntro: number, reduced: boolean, fluid: THREE.Texture) {
    const mx = mouse.x * this.viewport.x / 2, my = mouse.y * this.viewport.y / 2
    // The source integrates its spring with delta in milliseconds. Keep that
    // formula at a fixed 60 Hz so 60/120/240 Hz displays share the same response.
    this.accumulator += Math.min(dt, .05)
    const steps = Math.floor(this.accumulator * 60)
    this.accumulator -= steps / 60
    this.displacement = 0
    for (let i = 0; i < this.count; i++) {
      const p = i * 3, r = i * 4, v = i * 2, rand = this.random[r + 1]
      const x = this.base[p] + (1 - intro) * -1.1 * (2 - rand * 4)
      const y = this.base[p + 1] + (1 - intro) * (rand - .5) * .5
      const dx = x - mx, dy = y - my, distance = Math.hypot(dx, dy)
      const push = reduced ? 0 : Math.max(0, 1 - distance / 2) * 1.5
      const tx = x + dx * push, ty = y - Math.abs(dy * push) / 2
      const spring = .05 + this.random[r] * .1, friction = .05 + rand * .15
      if (reduced) { this.positions[p] = x; this.positions[p + 1] = y; this.velocity[v] = this.velocity[v + 1] = 0 }
      else {
        for(let tick=0;tick<steps;tick++) {
          this.velocity[v] = (this.velocity[v] + (tx - this.positions[p]) * spring * (1000 / 60)) * friction
          this.velocity[v + 1] = (this.velocity[v + 1] + (ty - this.positions[p + 1]) * spring * (1000 / 60)) * friction
          this.positions[p] += this.velocity[v]; this.positions[p + 1] += this.velocity[v + 1]
        }
      }
      this.positions[p + 2] = this.base[p + 2] - (1 - intro) * 1.2
      this.displacement = Math.max(this.displacement, Math.hypot(this.positions[p] - x, this.positions[p + 1] - y))
    }
    ;(this.mesh.geometry.getAttribute('offset') as THREE.InstancedBufferAttribute).needsUpdate = true
    const u = this.mesh.material.uniforms
    u.uTime.value = time; u.uIntro.value = intro; u.uIntro2.value = scaleIntro; u.uFluid.value = fluid
    this.composite.material.uniforms.uTime.value = time; this.composite.material.uniforms.uFluid.value = fluid
  }
  render() {
    const r = this.renderer
    r.setClearColor(0xec8db6, 0); r.setRenderTarget(this.raw); r.clear(); r.render(this.scene, this.camera)
    r.setRenderTarget(this.outlined); r.clear(); r.render(this.screen, this.screenCamera)
  }
  dispose() {
    this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.composite.geometry.dispose(); this.composite.material.dispose()
    this.raw.dispose(); this.outlined.dispose(); this.scene.clear(); this.screen.clear()
  }
}

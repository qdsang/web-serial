<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
// @ts-ignore
import * as THREE from 'three'
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useDark } from '@vueuse/core'
import { ElMessage } from 'element-plus'
// @ts-ignore
import Stats from 'stats.js'

const container = ref<HTMLDivElement | null>(null)
const pitch = ref(0)
const roll = ref(0)
const yaw = ref(0)
const currentModel = ref('arrow')
const customModel = ref<THREE.Group | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const isDark = useDark()
const sceneBackground = computed(() => isDark.value ? 0x1a1a1a : 0xf0f0f0)
// const gridColor = computed(() => isDark.value ? 0x404040 : 0x808080)
const modelColor = computed(() => isDark.value ? 0x4a9eff : 0x3366ff)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let model: THREE.Group
let controls: OrbitControls
let animationFrameId: number
let stats: Stats

const initScene = () => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(sceneBackground.value)

  // 添加坐标轴辅助器
  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)

  // 初始化性能监视器
  stats = new Stats()
  stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
  stats.dom.style.position = 'absolute'
  stats.dom.style.left = '0px'
  stats.dom.style.top = '0px'
  container.value!.appendChild(stats.dom)

  camera = new THREE.PerspectiveCamera(75, container.value!.clientWidth / container.value!.clientHeight, 0.1, 1000)
  camera.position.set(2, 2, 2)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  container.value!.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

//   const gridHelper = new THREE.GridHelper(10, 10, gridColor.value, gridColor.value)
//   scene.add(gridHelper)

  createModel(currentModel.value)
  addLights()
}

const createArrowModel = () => {
  const group = new THREE.Group()

  // 箭头主体
  const bodyGeometry = new THREE.ConeGeometry(0.5, 1.4, 12)
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.set(0, 0, -0.6)
  body.rotation.x = -Math.PI / 2
  group.add(body)

  const tailGeometry = new THREE.BoxGeometry(0.4, 0.4, 1)
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.6,
    roughness: 0.3,
    envMapIntensity: 1.2
  })
  const tail = new THREE.Mesh(tailGeometry, tailMaterial)
  tail.position.set(0, 0, 0.3)
  group.add(tail)

  return group
}

const createCubeModel = () => {
  const group = new THREE.Group()

  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({
    color: modelColor.value,
    metalness: 0.7,
    roughness: 0.3,
    envMapIntensity: 1
  })
  const cube = new THREE.Mesh(geometry, material)
  group.add(cube)

  return group
}

const createModel = (type: string) => {
  if (model) {
    scene.remove(model)
  }

  switch (type) {
    case 'arrow':
      model = createArrowModel()
      break
    case 'cube':
      model = createCubeModel()
      break
    case 'custom':
      if (customModel) {
        model = customModel.value!
      } else {
        model = createArrowModel()
      }
      break
    default:
      model = createArrowModel()
  }

  scene.add(model)
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const extension = file.name.split('.').pop()?.toLowerCase()
  const reader = new FileReader()

  reader.onload = (e) => {
    const contents = e.target?.result
    if (!contents) return

    if (extension === 'gltf' || extension === 'glb') {
      const loader = new GLTFLoader()
      loader.parse(contents as string, '', 
      // @ts-ignore
        (gltf) => {
          customModel.value = gltf.scene
          currentModel.value = 'custom'
          createModel('custom')
        },
        // @ts-ignore
        (error) => {
          ElMessage.error('加载模型失败：' + error.message)
        }
      )
    } else if (extension === 'obj') {
      const loader = new OBJLoader()
      try {
        const object = loader.parse(contents as string)
        customModel.value = object
        currentModel.value = 'custom'
        createModel('custom')
      } catch (error) {
        ElMessage.error('加载模型失败：' + (error as Error).message)
      }
    } else {
      ElMessage.error('不支持的文件格式，请使用.gltf、.glb或.obj格式的3D模型文件')
    }
  }

  reader.readAsText(file)
}

const addLights = () => {
  // 环境光
  const ambientLight = new THREE.AmbientLight(0xffffff, 6)
  scene.add(ambientLight)

  // 主平行光
  const mainLight = new THREE.DirectionalLight(0xffffff, 12)
  mainLight.position.set(5, 5, 10)
  scene.add(mainLight)

  // 补充平行光
  const fillLight = new THREE.DirectionalLight(0xffffff, 1)
  fillLight.position.set(-5, 3, -5)
  scene.add(fillLight)

  // 添加点光源
  const pointLight = new THREE.PointLight(0x4a9eff, 1, 10)
  pointLight.position.set(2, 2, 2)
  scene.add(pointLight)
}

const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  stats.begin()
  
  if (model) {
    model.rotation.set(
      THREE.MathUtils.degToRad(roll.value),
      THREE.MathUtils.degToRad(yaw.value),
      THREE.MathUtils.degToRad(pitch.value)
    )
  }

  controls.update()
  renderer.render(scene, camera)
  stats.end()
}

const handleResize = () => {
  if (container.value && camera && renderer) {
    camera.aspect = container.value.clientWidth / container.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  }
}

const handleImuData = (event: CustomEvent) => {
  const data = event.detail
  if (!data || typeof data.pitch !== 'number') return
  
  const { pitch: p, roll: r, yaw: y } = data
  pitch.value = p
  roll.value = r
  yaw.value = y
}

const switchModel = () => {
  if (currentModel.value === 'arrow') {
    currentModel.value = 'cube'
  } else if (currentModel.value === 'cube') {
    currentModel.value = 'arrow'
  } else {
    currentModel.value = 'arrow'
  }
  createModel(currentModel.value)
}

const uploadModel = () => {
  fileInput.value?.click()
}

onMounted(() => {
  initScene()
  animate()
  window.addEventListener('resize', handleResize)
  window.addEventListener('data-update', handleImuData as EventListener)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('data-update', handleImuData as EventListener)
  renderer.dispose()
})
</script>

<template>
  <div class="chart-3d-container">
    <div ref="container" class="canvas-container"></div>
    <div class="data-panel">
      <div>Pitch: {{ pitch.toFixed(2) }}°</div>
      <div>Roll: {{ roll.toFixed(2) }}°</div>
      <div>Yaw: {{ yaw.toFixed(2) }}°</div>
      <div class="model-controls">
        <el-button class="model-switch" @click="switchModel" size="small">
          切换模型
        </el-button>
        <el-button class="model-upload" @click="uploadModel" size="small">
          导入模型
        </el-button>
        <input
          ref="fileInput"
          type="file"
          accept=".gltf,.glb,.obj"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-3d-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.data-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.8), rgba(30, 30, 30, 0.8));
  color: #ffffff;
  padding: 15px;
  border-radius: 8px;
  font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.data-panel div {
  margin: 5px 0;
}

.model-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.model-switch,
.model-upload {
  flex: 1;
}
</style>
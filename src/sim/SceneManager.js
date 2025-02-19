import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import particleFire from 'three-particle-fire';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
particleFire.install({ THREE: THREE });

// 添加颜色控制辅助类
class ColorGUIHelper{
  constructor(object, prop) {
    this.object = object;
    this.prop = prop;
  }
  
  get value() {
    return `#${this.object[this.prop].getHexString()}`;
  }
  
  set value(hexString) {
    this.object[this.prop].set(hexString);
  }
}

export class SceneManager {
  constructor() {
  }
  
  init(container) {
    this.container = container
    this.setupRenderer();
    this.setupScene();
    this.setupCameras();
    this.setupLights();
    this.setupGround();
    this.setupSky();
    this.setupGUI();
    this.loadRocketModel();
    
    // 初始化轨迹相关属性
    this.trajectoryLine = null;
    this.trajectoryPoints = [];
    this.lastPoint = new THREE.Vector3();
    this.arrowHelper = null;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#4accea");
    this.rocketSystem = new THREE.Object3D();
    this.scene.add(this.rocketSystem);

    // 创建箭头辅助对象
    const dir = new THREE.Vector3(10, 2, 0);
    dir.normalize();
    const origin = new THREE.Vector3(285000, -6371210, 0);
    const length = 10;
    const hex = 0x000000;
    this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);
    this.scene.add(this.arrowHelper);
  }

  setupCameras() {
    const fov = 45;
    const aspect = 2;
    const near = 0.1;
    const far = 5000;
    const ellipsisFar = 4800000;
    
    // 主摄像机 - 创建一个容器来控制摄像机
    this.mainCameraRig = new THREE.Object3D();
    this.mainCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.mainCamera.position.set(-5, 3, 16);
    this.mainCameraRig.add(this.mainCamera);
    
    // 喷嘴摄像机 - 附加到火箭上
    this.nozzleCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.nozzleCamera.position.set(-1, -2, 2);
    this.nozzleCamera.rotation.set(0.68, 0, 0);
    
    // 椭圆轨道摄像机 - 固定在地面
    this.ellipsisCamera = new THREE.PerspectiveCamera(fov, aspect, near, ellipsisFar);
    this.ellipsisCamera.position.set(180000, 0, 450000);
    this.scene.add(this.ellipsisCamera);
    
    this.currentCamera = this.mainCamera;
    
    // 轨道控制器现在控制摄像机容器
    this.controls = new OrbitControls(this.mainCamera, this.renderer.domElement);
    this.controls.target.set(0, 5, 0);
    this.controls.update();
  }

  setupLights() {
    const color = 0xFFFFFF;
    const intensity = 1;
    this.light = new THREE.DirectionalLight(color, intensity);
    this.light.position.set(0, 1000, 1000);
    this.scene.add(this.light);
  }

  setupGround() {
    const planeSize = 1400000;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('./ground_texture.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -.5;
    this.scene.add(mesh);
  }

  setupSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(1450000);
    this.scene.add(this.sky);

    const sun = new THREE.Vector3();
    const effectController = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180
    };

    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
    const theta = THREE.MathUtils.degToRad(effectController.azimuth);
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);
  }

  setupGUI() {
    this.gui = new GUI({ container: this.container });
    
    // 光照控制
    const lightFolder = this.gui.addFolder('Light');
    lightFolder.addColor(new ColorGUIHelper(this.light, 'color'), 'value').name('color');
    lightFolder.add(this.light, 'intensity', 0, 2, 0.01);

    // 动画步长控制
    this.animationSettings = {
      step: 0.05
    };
    this.step = this.animationSettings.step;
    const animationFolder = this.gui.addFolder('Animation');
    animationFolder.add(this.animationSettings, 'step', 0, 2, 0.01)
      .onChange((value) => {
        this.step = value
        // 这里我们需要一个方法来通知外部步长发生了变化
        if(this.onStepChange) {
          this.onStepChange(value);
        }
      });

    // 天空控制
    const skyFolder = this.gui.addFolder('Sky');
    const skySettings = {
      turbidity: 10,
      rayleigh: 3,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.7,
      elevation: 2,
      azimuth: 180,
      exposure: this.renderer.toneMappingExposure
    };

    skyFolder.add(skySettings, 'turbidity', 0.0, 20.0, 0.1)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'rayleigh', 0.0, 4, 0.001)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'mieCoefficient', 0.0, 0.1, 0.001)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'mieDirectionalG', 0.0, 1, 0.001)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'elevation', 0, 90, 0.1)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'azimuth', -180, 180, 0.1)
      .onChange(() => this.updateSky(skySettings));
    skyFolder.add(skySettings, 'exposure', 0, 1, 0.0001)
      .onChange(() => {
        this.renderer.toneMappingExposure = skySettings.exposure;
      });

    const fireSettings = {
      x: -0.1,
      y: 0,
      z: 0.3,
    }
    const fireFolder = this.gui.addFolder('Fire');
    fireFolder.add(fireSettings, 'x', -1.0, 1.0, 0.01)
      .onChange(() => this.particleFireMesh.position.set(fireSettings.x, fireSettings.y, fireSettings.z));
    fireFolder.add(fireSettings, 'y', -1.0, 1.0, 0.01)
      .onChange(() => this.particleFireMesh.position.set(fireSettings.x, fireSettings.y, fireSettings.z));
    fireFolder.add(fireSettings, 'z', -1.0, 1.0, 0.01)
      .onChange(() => this.particleFireMesh.position.set(fireSettings.x, fireSettings.y, fireSettings.z));

  }


  // 更新天空设置
  updateSky(settings) {
    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = settings.turbidity;
    uniforms['rayleigh'].value = settings.rayleigh;
    uniforms['mieCoefficient'].value = settings.mieCoefficient;
    uniforms['mieDirectionalG'].value = settings.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - settings.elevation);
    const theta = THREE.MathUtils.degToRad(settings.azimuth);
    const sun = new THREE.Vector3();
    sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(sun);
  }

  // 添加步长变化回调设置方法
  setStepChangeCallback(callback) {
    this.onStepChange = callback;
  }

  loadRocketModel() {
    const mtlLoader = new MTLLoader();
    mtlLoader.load('./models/starshipv2.mtl', (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      
      objLoader.load('./models/starshipv2.obj', (root) => {
        root.scale.set(0.02, 0.02, 0.02);
        root.position.set(0.3, 1.3, 0.3);
        
        this.rocket = new THREE.Object3D();
        this.rocket.add(root);
        this.rocket.position.y = 3;
        
        // 将火箭添加到火箭系统
        this.rocketSystem.add(this.rocket);
        
        // 将主相机容器和喷嘴相机添加到正确的位置
        this.rocketSystem.add(this.mainCameraRig);
        this.rocket.add(this.nozzleCamera);
        
        this.setupRocketFire();
      });
    });
  }

  setupRocketFire() {
    const fireRadius = 0.1;
    const fireHeight = 1.5;
    const particleCount = 800;
    
    const geometry = new particleFire.Geometry(fireRadius, fireHeight, particleCount);
    const material = new particleFire.Material({ color: 0xff2200 });
    material.setPerspective(this.currentCamera.fov, window.innerHeight);
    
    this.particleFireMesh = new THREE.Points(geometry, material);
    this.particleFireMesh.position.set(-0.1, 0.0, 0.3);
    this.particleFireMesh.rotation.x = Math.PI;
    this.rocket.add(this.particleFireMesh);
  }

  resizeRendererToDisplaySize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    
    if (needResize) {
      this.renderer.setSize(width, height, false);
    }
    return needResize;
  }

  setCamera(cameraType) {
    switch(cameraType) {
      case 'main':
        this.currentCamera = this.mainCamera;
        this.controls.enabled = true;
        this.hideTrajectory();
        break;
      case 'nozzle':
        this.currentCamera = this.nozzleCamera;
        this.controls.enabled = false;
        this.hideTrajectory();
        break;
      case 'ellipsis':
        this.currentCamera = this.ellipsisCamera;
        this.controls.enabled = false;
        this.showTrajectory();
        break;
    }
  }

  showTrajectory() {
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = true;
    }
    if (this.arrowHelper) {
      this.arrowHelper.visible = true;
    }
  }

  hideTrajectory() {
    if (this.trajectoryLine) {
      this.trajectoryLine.visible = false;
    }
    if (this.arrowHelper) {
      this.arrowHelper.visible = false;
    }
  }

  updateTrajectory() {
    // 如果位置发生显著变化，添加新的轨迹点
    if (this.rocket && 
        this.lastPoint.distanceTo(this.rocketSystem.position) > 1000) {
      
      this.trajectoryPoints.push(this.rocketSystem.position.clone());
      this.lastPoint.copy(this.rocketSystem.position);

      // 移除旧的轨迹线
      if (this.trajectoryLine) {
        this.scene.remove(this.trajectoryLine);
      }

      // 创建新的轨迹线
      const geometry = new THREE.BufferGeometry().setFromPoints(this.trajectoryPoints);
      const material = new THREE.LineBasicMaterial({ color: 0x000000 });
      this.trajectoryLine = new THREE.Line(geometry, material);
      this.scene.add(this.trajectoryLine);
    }
  }

  updateArrowHelper() {
    if (this.rocket && this.arrowHelper) {
      // 计算从地心到火箭的方向
      const rocketPos = this.rocketSystem.position;
      const radVectorLength = Math.sqrt(
        Math.pow((Math.abs(rocketPos.x - 285000)), 2) + 
        Math.pow((rocketPos.y + 6371210), 2)
      );

      // 更新箭头
      const direction = new THREE.Vector3(
        rocketPos.x - 285000,
        rocketPos.y + 6371210,
        0
      ).normalize();

      this.arrowHelper.setDirection(direction);
      this.arrowHelper.setLength(radVectorLength, 10000, 5000);
    }
  }

  updateRocket(physicsState) {
    if(this.rocket) {
      // 更新整个火箭系统的位置
      this.rocketSystem.position.set(
        physicsState.position.x,
        physicsState.position.y,
        physicsState.position.z
      );
      
      // 更新火箭的旋转
      this.rocket.rotation.z = physicsState.angle - 1.57;
      
      // 如果使用主相机，更新其跟随行为
      if(this.currentCamera === this.mainCamera) {
        // 更新相机容器的旋转，使其与火箭保持一致
        this.mainCameraRig.rotation.z = this.rocket.rotation.z;
        
        // 更新轨道控制器的目标点
        const rocketWorldPos = new THREE.Vector3();
        this.rocket.getWorldPosition(rocketWorldPos);
        this.controls.target.copy(rocketWorldPos);
        this.controls.update();
      }

      // 更新轨迹和箭头
      this.updateTrajectory();
      this.updateArrowHelper();
      
      // 更新火焰效果
      if(this.particleFireMesh && !physicsState.activePart) {
        this.rocket.remove(this.particleFireMesh);
      }
    }
  }

  render() {
    if (this.resizeRendererToDisplaySize()) {
      const canvas = this.renderer.domElement;
      this.currentCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.currentCamera.updateProjectionMatrix();
      
      if(this.particleFireMesh) {
        this.particleFireMesh.material.setPerspective(
          this.currentCamera.fov, 
          canvas.clientHeight
        );
      }
    }
    
    if(this.particleFireMesh) {
      this.particleFireMesh.material.update(0.05);
    }
    
    this.renderer.render(this.scene, this.currentCamera);
  }
} 
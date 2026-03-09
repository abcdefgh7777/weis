import Experience from "./Experience";

import * as THREE from "three";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader.js";
import { DotScreenShader } from "three/examples/jsm/shaders/DotScreenShader.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";

import vertexShader from "./shaders/rendererMask/vertex.glsl?raw";
import fragmentShader from "./shaders/rendererMask/fragment.glsl?raw";

export default class Renderer {
  constructor(_options = {}) {
    this.experience = new Experience();
    this.config = this.experience.config;
    this.debug = this.experience.debug;
    this.scene = this.experience.scene;
    this.cssScene = this.experience.cssScene;
    this.camera = this.experience.camera;

    // Whether to use post-processing
    this.usePostprocess = false;

    if (this.debug) {
      this.debugFolder = this.debug.addFolder({
        title: "Renderer",
        expanded: false,
      });

      this.debugFolder.addInput(this, "usePostprocess", {
        label: "Post-processor",
      });
    }

    this.setInstance();
    this.setPostProcess();
  }

  setInstance() {
    this.clearColor = "#000000";

    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.instance.domElement.style.position = "absolute";
    this.instance.domElement.style.top = 0;
    this.instance.domElement.style.left = 0;
    this.instance.domElement.style.width = "100%";
    this.instance.domElement.style.height = "100%";
    this.instance.domElement.style.zIndex = 666;
    this.instance.domElement.style.pointerEvents = "auto";
    this.instance.domElement.id = "three-canvas";

    this.instance.setClearColor(this.clearColor, 1);
    this.instance.setSize(this.config.width, this.config.height);
    this.instance.setPixelRatio(this.config.pixelRatio);

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    // this.instance.toneMapping = THREE.CineonToneMapping;
    // this.instance.toneMappingExposure = 1.75;

    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1;

    // this.instance.shadowMap.enabled = true;
    // this.instance.shadowMap.type = THREE.PCFSoftShadowMap;

    this.context = this.instance.getContext();

    this.cssInstance = new CSS3DRenderer();
    this.cssInstance.setSize(this.config.width, this.config.height);
    this.cssInstance.domElement.style.position = "absolute";
    this.cssInstance.domElement.style.top = 0;
    this.cssInstance.domElement.style.left = 0;
    this.cssInstance.domElement.style.width = "100%";
    this.cssInstance.domElement.style.height = "100%";
    this.cssInstance.domElement.id = "three-html-box";
  }

  allowEvents() {
    this.instance.domElement.style.pointerEvents = "none";
  }
  disallowEvents() {
    this.instance.domElement.style.pointerEvents = "auto";
  }

  setPostProcess() {
    this.postProcess = {};

    this.postProcess.renderPass = new RenderPass(
      this.scene,
      this.camera.instance
    );

    const size = this.instance.getDrawingBufferSize(new THREE.Vector2());
    this.postProcess.renderTarget = new THREE.WebGLRenderTarget(
      size.width,
      size.height,
      {
        samples: 2,
        colorSpace: THREE.SRGBColorSpace,
      }
    );

    this.postProcess.composer = new EffectComposer(
      this.instance,
      this.postProcess.renderTarget
    );
    this.postProcess.composer.addPass(this.postProcess.renderPass);

    // this.postProcess.composer.addPass(new ShaderPass(RGBShiftShader));
    // this.postProcess.composer.addPass(new ShaderPass(DotScreenShader));

    // Custom vignette effect
    this.postProcess.maskShader = {
      uniforms: {
        tDiffuse: { value: null }, // Input texture
        blurRadius: { value: 0.5 }, // Blur radius (0~1)
        darkRadius: { value: 1 }, // Darkening radius (0~1)
        darkIntensity: { value: 1 }, // Darkening intensity (0~1)
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    };
    this.postProcess.composer.addPass(
      new ShaderPass(this.postProcess.maskShader)
    );

    // Vignette effect - built-in Three.js version, but not what we want
    // this.postProcess.composer.addPass(new ShaderPass(VignetteShader));

    // SMAA anti-aliasing, usually added last. NOTE: this causes issues for unknown reasons
    // this.postProcess.composer.addPass(
    //   new SMAAPass(
    //     this.config.width * this.config.pixelRatio,
    //     this.config.height * this.config.pixelRatio
    //   )
    // );
  }

  resize() {
    this.instance.setSize(this.config.width, this.config.height);
    this.instance.setPixelRatio(this.config.pixelRatio);
    this.cssInstance.setSize(this.config.width, this.config.height);
  }

  update() {
    if (this.usePostprocess) {
      this.postProcess.composer.render();
    } else {
      this.instance.render(this.scene, this.camera.instance);
    }
    this.cssInstance.render(this.cssScene, this.camera.instance);
  }

  destroy() {
    this.instance.dispose();
    this.instance.renderLists.dispose();
    this.postProcess.renderTarget.dispose();
    this.cssInstance.dispose();
  }
}

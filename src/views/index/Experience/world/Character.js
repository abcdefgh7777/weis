import Experience from "../Experience";

import * as THREE from "three";

export default class Character {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.resources = this.experience.resources;
    this.time = this.experience.time;

    this.setModel();
  }

  setModel() {
    this.model = {};

    const characterData = this.resources.items.characterModel;
    if (!characterData) {
      console.warn("Character model failed to load");
      return;
    }

    this.model.mesh = characterData;

    this.model.mesh.position.set(-0.327, -0.020, 0.321);
    this.model.mesh.rotation.set(
      THREE.MathUtils.degToRad(-4.0),
      THREE.MathUtils.degToRad(19.5),
      THREE.MathUtils.degToRad(-4.0)
    );
    this.model.mesh.scale.set(0.1627, 0.1627, 0.1627);

    // Fix transparent materials from Mixamo FBX
    this.model.mesh.traverse((child) => {
      if (child.isMesh) {
        child.material.transparent = false;
        child.material.opacity = 1;
        child.material.side = THREE.DoubleSide;
      }
    });

    // Add lights so the character's materials render properly
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(2, 3, 2);
    this.scene.add(this.directionalLight);

    // Play animation if available
    if (characterData.animations && characterData.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.model.mesh);
      const action = this.mixer.clipAction(characterData.animations[0]);
      action.play();
    }

    this.scene.add(this.model.mesh);
  }

  update() {
    if (this.mixer) {
      this.mixer.update(this.time.delta * 0.001);
    }
  }

  destroy() {}
}

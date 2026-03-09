import Experience from "./Experience";

import normalizeWheel from "normalize-wheel";

import * as THREE from "three";
import gsap from "gsap";

export default class Navigation {
  constructor() {
    this.experience = new Experience();
    this.targetElement = this.experience.targetElement;
    this.camera = this.experience.camera;
    this.config = this.experience.config;
    this.time = this.experience.time;
    this.debug = this.experience.debug;
    this.renderer = this.experience.renderer;

    this.isDefault = false;

    this.audios = {
      in: new Audio("/models/audios/transition-in.mp3"),
      out: new Audio("/models/audios/transition-out.mp3"),
    };
    // Adjust volume
    this.audios.in.volume = 0.2;
    this.audios.out.volume = 0.2;

    // Homepage text info
    this.textDom = document.querySelector("#info-box");

    if (this.debug) {
      this.debugFolder = this.debug.addFolder({
        title: "Navigation View",
        expanded: true,
      });
    }

    this.setView();
    this.startView();

    this.setViewModes();

    this.viewModes.loading();
  }

  setView() {
    this.view = {};

    // Active area - spherical
    this.view.spherical = {};
    this.view.spherical.value = new THREE.Spherical(
      3.5,
      Math.PI * 0.38,
      Math.PI * 0.25
    );
    // Active area - limits
    this.view.spherical.limits = {};
    this.view.spherical.limits.radius = { min: 0.8, max: 3.5 };
    this.view.spherical.limits.phi = {
      min: Math.PI * 0.34,
      max: Math.PI * 0.46,
    };
    this.view.spherical.limits.theta = {
      min: Math.PI * 0.06,
      max: Math.PI * 0.52,
    };

    // Active area - smoothing
    this.view.spherical.smoothed = this.view.spherical.value.clone();
    this.view.spherical.smoothing = 0.005;

    // Camera tracking target
    this.view.target = {};
    this.view.target.value = new THREE.Vector3(-0.56, 0, 0.2);
    this.view.target.smoothed = this.view.target.value.clone();
    this.view.target.smoothing = 0.005;
    //
    this.view.target.limits = {};
    this.view.target.limits.x = { min: -1, max: 1 };
    this.view.target.limits.y = { min: 0.1, max: 0.25 };
    this.view.target.limits.z = { min: 0, max: 0.2 };

    // Drag operation
    this.view.drag = {};
    this.view.drag.delta = {};
    this.view.drag.delta.x = 0;
    this.view.drag.delta.y = 0;
    this.view.drag.previous = {};
    this.view.drag.previous.x = 0;
    this.view.drag.previous.y = 0;
    this.view.drag.sensitivity = 1;

    // Whether dragging with Ctrl or Shift key held down
    this.view.drag.alternative = false;

    // Zoom operation
    this.view.zoom = {};
    this.view.zoom.sensitivity = 0.005;
    this.view.zoom.delta = 0;

    /**
     * Mouse methods
     */
    this.view.down = (_x, _y) => {
      this.view.drag.previous.x = _x;
      this.view.drag.previous.y = _y;
    };

    this.view.move = (_x, _y) => {
      this.view.drag.delta.x += _x - this.view.drag.previous.x;
      this.view.drag.delta.y += _y - this.view.drag.previous.y;

      this.view.drag.previous.x = _x;
      this.view.drag.previous.y = _y;
    };

    this.view.up = () => {};

    this.view.zoomIn = (_delta) => {
      this.view.zoom.delta += _delta;
    };

    /**
     * Mouse event listeners
     */
    this.view.onMouseDown = (_event) => {
      _event.preventDefault();

      this.view.drag.alternative = _event.ctrlKey || _event.shiftKey;

      this.view.down(_event.clientX, _event.clientY);

      window.addEventListener("mousemove", this.view.onMouseMove);
      window.addEventListener("mouseup", this.view.onMouseUp);
    };

    this.view.onMouseMove = (_event) => {
      _event.preventDefault();
      this.view.move(_event.clientX, _event.clientY);
    };

    this.view.onMouseUp = (_event) => {
      _event.preventDefault();
      this.view.up();

      window.removeEventListener("mousemove", this.view.onMouseMove);
      window.removeEventListener("mouseup", this.view.onMouseUp);
    };

    /**
     * Touch event listeners
     */
    this.view.onTouchStart = (_event) => {
      _event.preventDefault();

      // Mobile pan drag
      this.view.drag.alternative = _event.touches.length > 1;

      this.view.down(_event.touches[0].clientX, _event.touches[0].clientY);

      window.addEventListener("touchmove", this.view.onTouchMove);
      window.addEventListener("touchend", this.view.onTouchEnd);
    };

    this.view.onTouchMove = (_event) => {
      _event.preventDefault();
      this.view.move(_event.touches[0].clientX, _event.touches[0].clientY);
    };

    this.view.onTouchEnd = (_event) => {
      _event.preventDefault();
      this.view.up();

      window.removeEventListener("touchmove", this.view.onTouchMove);
      window.removeEventListener("touchend", this.view.onTouchEnd);
    };

    /**
     * Context menu
     */
    this.view.onContextMenu = (_event) => {
      _event.preventDefault();
    };
    window.addEventListener("contextmenu", this.view.onContextMenu);

    /**
     * Mouse wheel
     */
    this.view.onWheel = (_event) => {
      const normalized = normalizeWheel(_event);
      this.view.zoomIn(normalized.pixelY);
    };
  }

  /**
   * Start listening
   */
  startView() {
    this.isDefault = true;
    this.targetElement.addEventListener("mousedown", this.view.onMouseDown);
    this.targetElement.addEventListener("touchstart", this.view.onTouchStart);
    this.targetElement.addEventListener("mousewheel", this.view.onWheel, {
      passive: false,
    });
    this.targetElement.addEventListener("wheel", this.view.onWheel, {
      passive: false,
    });
  }

  /**
   * Stop listening
   */
  stopView() {
    this.isDefault = false;
    this.targetElement.removeEventListener("mousedown", this.view.onMouseDown);
    this.targetElement.removeEventListener(
      "touchstart",
      this.view.onTouchStart
    );
    this.targetElement.removeEventListener("mousewheel", this.view.onWheel, {
      passive: false,
    });
    this.targetElement.removeEventListener("wheel", this.view.onWheel, {
      passive: false,
    });
  }

  setViewModes() {
    this.viewModes = {};
    this.viewModes.isDefault = true;

    this.viewModes.default = () => {
      if (!this.viewModes.isDefault) {
        this.viewModes.isDefault = true;
        this.stopView();
        this.renderer.disallowEvents();
        this.textDom.style.opacity = 1;
        this.textDom.style.pointerEvents = "auto";

        this.audios.out.currentTime = 0;
        this.audios.out.play();

        // Manually copied default state values for convenience
        gsap.to(this.camera.modes.default.instance.position, {
          x: 1.741079403557833,
          y: 1.2884359343963734,
          z: 2.501079403557833,
          duration: 1,
        });
        gsap.to(this.camera.modes.default.instance.quaternion, {
          _w: 0.907515085995018,
          _x: -0.1731177613208097,
          _y: 0.37590505667732216,
          _z: 0.07170772462674778,
          duration: 1,
          onComplete: () => {
            // Restore to default state
            this.view.spherical.value = new THREE.Spherical(
              3.5,
              Math.PI * 0.38,
              Math.PI * 0.25
            );
            this.view.spherical.smoothed = this.view.spherical.value.clone();

            this.view.target.value = new THREE.Vector3(-0.56, 0, 0.2);
            this.view.target.smoothed = this.view.target.value.clone();

            this.startView();
          },
        });
      }
    };

    this.viewModes.leftScreen = () => {
      this.viewModes.isDefault = false;
      this.stopView();
      this.renderer.allowEvents();
      this.textDom.style.opacity = 0;
      this.textDom.style.pointerEvents = "none";

      this.audios.in.currentTime = 0;
      this.audios.in.play();

      // All values here are manually copied; check current state each time
      gsap.to(this.camera.modes.default.instance.position, {
        x: 0.1,
        y: 0.4,
        z: 0.7,
        duration: 1,
      });
      gsap.to(this.camera.modes.default.instance.quaternion, {
        _w: 0.9903342737785116,
        _x: 0,
        _y: 0.13870121188940063,
        _z: 0,
        duration: 1,
      });
    };

    this.viewModes.rightScreen = () => {
      this.viewModes.isDefault = false;
      this.stopView();
      this.renderer.disallowEvents();
      this.textDom.style.opacity = 0;

      this.audios.in.currentTime = 0;
      this.audios.in.play();

      gsap.to(this.camera.modes.default.instance.position, {
        x: 0.2,
        y: 0.4,
        z: 1.25,
        duration: 1,
      });
      gsap.to(this.camera.modes.default.instance.quaternion, {
        _w: 0.9925075566829031,
        _x: -0.02,
        _y: 0.01,
        _z: 0,
        duration: 1,
      });
    };

    this.viewModes.loading = () => {
      this.viewModes.isDefault = false;
      this.stopView();
      this.renderer.allowEvents();
      this.textDom.style.opacity = 0;
      this.textDom.style.pointerEvents = "none";

      this.camera.modes.default.instance.position.x = 0.1;
      this.camera.modes.default.instance.position.y = 0.4;
      this.camera.modes.default.instance.position.z = 0.7;

      this.camera.modes.default.instance.quaternion._w = 0.9903342737785116;
      this.camera.modes.default.instance.quaternion._x = 0;
      this.camera.modes.default.instance.quaternion._y = 0.13870121188940063;
      this.camera.modes.default.instance.quaternion._z = 0;
    };

    if (this.debug) {
      const btn1 = this.debugFolder.addButton({
        title: "Left Screen",
      });
      btn1.on("click", () => {
        this.viewModes.leftScreen();
      });

      const btn2 = this.debugFolder.addButton({
        title: "Right Screen",
      });
      btn2.on("click", () => {
        this.viewModes.rightScreen();
      });

      const btn3 = this.debugFolder.addButton({
        title: "Reset Default",
      });
      btn3.on("click", () => {
        this.viewModes.default();
      });
    }
  }

  update() {
    if (this.isDefault && this.viewModes.isDefault) {
      // Zoom
      this.view.spherical.value.radius +=
        this.view.zoom.delta * this.view.zoom.sensitivity;

      // Zoom - clamp range
      this.view.spherical.value.radius = Math.min(
        Math.max(
          this.view.spherical.value.radius,
          this.view.spherical.limits.radius.min
        ),
        this.view.spherical.limits.radius.max
      );

      if (!this.view.drag.alternative) {
        // Drag
        this.view.spherical.value.theta -=
          (this.view.drag.delta.x * this.view.drag.sensitivity) /
          this.config.smallestSide;
        this.view.spherical.value.phi -=
          (this.view.drag.delta.y * this.view.drag.sensitivity) /
          this.config.smallestSide;

        // Drag - clamp range
        this.view.spherical.value.phi = Math.min(
          Math.max(
            this.view.spherical.value.phi,
            this.view.spherical.limits.phi.min
          ),
          this.view.spherical.limits.phi.max
        );
        this.view.spherical.value.theta = Math.min(
          Math.max(
            this.view.spherical.value.theta,
            this.view.spherical.limits.theta.min
          ),
          this.view.spherical.limits.theta.max
        );
      } else {
        // Drag while holding Ctrl or Shift key
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3(-1, 0, 0);

        up.applyQuaternion(this.camera.modes.default.instance.quaternion);
        right.applyQuaternion(this.camera.modes.default.instance.quaternion);

        up.multiplyScalar(this.view.drag.delta.y * 0.01);
        right.multiplyScalar(this.view.drag.delta.x * 0.01);

        this.view.target.value.add(up);
        this.view.target.value.add(right);

        // Clamp range
        this.view.target.value.x = Math.min(
          Math.max(this.view.target.value.x, this.view.target.limits.x.min),
          this.view.target.limits.x.max
        );
        this.view.target.value.y = Math.min(
          Math.max(this.view.target.value.y, this.view.target.limits.y.min),
          this.view.target.limits.y.max
        );
        this.view.target.value.z = Math.min(
          Math.max(this.view.target.value.z, this.view.target.limits.z.min),
          this.view.target.limits.z.max
        );
      }

      this.view.drag.delta.x = 0;
      this.view.drag.delta.y = 0;
      this.view.zoom.delta = 0;

      // Smooth movement
      this.view.spherical.smoothed.radius +=
        (this.view.spherical.value.radius -
          this.view.spherical.smoothed.radius) *
        this.view.spherical.smoothing *
        this.time.delta;
      this.view.spherical.smoothed.phi +=
        (this.view.spherical.value.phi - this.view.spherical.smoothed.phi) *
        this.view.spherical.smoothing *
        this.time.delta;
      this.view.spherical.smoothed.theta +=
        (this.view.spherical.value.theta - this.view.spherical.smoothed.theta) *
        this.view.spherical.smoothing *
        this.time.delta;

      this.view.target.smoothed.x +=
        (this.view.target.value.x - this.view.target.smoothed.x) *
        this.view.target.smoothing *
        this.time.delta;
      this.view.target.smoothed.y +=
        (this.view.target.value.y - this.view.target.smoothed.y) *
        this.view.target.smoothing *
        this.time.delta;
      this.view.target.smoothed.z +=
        (this.view.target.value.z - this.view.target.smoothed.z) *
        this.view.target.smoothing *
        this.time.delta;

      const viewPosition = new THREE.Vector3();
      viewPosition.setFromSpherical(this.view.spherical.smoothed);
      viewPosition.add(this.view.target.smoothed);

      this.camera.modes.default.instance.position.copy(viewPosition);
      this.camera.modes.default.instance.lookAt(this.view.target.smoothed);
    }
  }
}

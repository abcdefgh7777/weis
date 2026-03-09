import Experience from "../Experience";
import ledBaseArray from "../Utils/ledUtils/ledBaseArray";
import ledUtils from "../Utils/ledUtils";

import * as THREE from "three";
import gsap from "gsap";

import vertexShader from "../shaders/matrixLED/vertex.glsl?raw";
import fragmentShader from "../shaders/matrixLED/fragment.glsl?raw";

export default class MatrixLED {
  constructor() {
    this.experience = new Experience();
    this.resources = this.experience.resources;
    this.debug = this.experience.debug;
    this.scene = this.experience.scene;

    if (this.debug) {
      this.debugFolder = this.debug.addFolder({
        title: "Matrix LED",
        expanded: true,
      });
    }

    this.getLocalStorage();
    this.setSurfaceModel();
    this.setLEDModel();
    this.setModel();
    this.setModes();
  }

  getLocalStorage() {
    this.localStorage = JSON.parse(localStorage.getItem("matrix-led"));
  }

  setSurfaceModel() {
    this.surfaceModel = {};
    this.surfaceModel.color = "#000000";

    this.surfaceModel.material = new THREE.MeshBasicMaterial({
      transparent: true,
      color: new THREE.Color(this.surfaceModel.color),
      opacity: 0.3,
    });

    this.surfaceModel.mesh =
      this.resources.items.finalModel.scene.children.find(
        (mesh) => mesh.name === "LED粉丝牌表面"
      );
    this.surfaceModel.mesh.material = this.surfaceModel.material;
    this.surfaceModel.mesh.visible = true;

    if (this.debug) {
      // Show panel
      this.debugFolder.addInput(this.surfaceModel.mesh, "visible", {
        label: "Show Panel",
      });
      this.debugFolder
        .addInput(this.surfaceModel, "color", {
          label: "Panel Color",
        })
        .on("change", () => {
          this.surfaceModel.material.color.set(this.surfaceModel.color);
        });
      this.debugFolder.addInput(this.surfaceModel.material, "opacity", {
        min: 0,
        max: 1,
        step: 0.001,
        label: "Panel Opacity",
      });
    }
  }

  setLEDModel() {
    this.ledModel = {};
    this.ledModel.color = "#ff0000";

    this.ledModel.material = new THREE.MeshBasicMaterial({
      transparent: true,
      color: new THREE.Color(this.ledModel.color),
      side: THREE.DoubleSide,
    });

    this.ledModel.mesh = this.resources.items.finalModel.scene.children.find(
      (mesh) => mesh.name === "LED矩阵"
    );
    this.ledModel.mesh.material = this.ledModel.material;
    this.ledModel.mesh.visible = false;

    // if (this.debug) {
    //   // Show panel
    //   this.debugFolder.addInput(this.ledModel.mesh, "visible", {
    //     label: "Show Model LED",
    //   });
    //   this.debugFolder
    //     .addInput(this.ledModel, "color", {
    //       label: "Model LED Color",
    //     })
    //     .on("change", () => {
    //       this.ledModel.material.color.set(this.ledModel.color);
    //     });
    // }
  }

  setModel() {
    // Define the actual displayed LED matrix
    this.model = {};

    // Define default values for the LED matrix
    this.model.config = {
      matrixWidth: 40, // Matrix width
      matrixHeight: 9, // Matrix height
      ledSize: 0.02, // Size of each LED
      ledSpacing: 0.002, // Spacing between LEDs
      color: "#ff74de", // LED color
      baseColor: "#333333", // LED base color
      colorStrength: 1, // Brightness
    };

    this.model.meshGroup = new THREE.Group();

    // Calculate the total width and height of the LED matrix
    this.model.config.matrixWidthTotal =
      this.model.config.matrixWidth *
        (this.model.config.ledSize + this.model.config.ledSpacing) -
      this.model.config.ledSpacing;
    this.model.config.matrixHeightTotal =
      this.model.config.matrixHeight *
        (this.model.config.ledSize + this.model.config.ledSpacing) -
      this.model.config.ledSpacing;

    // Calculate the top-left position of the LED matrix
    this.model.config.matrixLeft =
      -(this.model.config.matrixWidthTotal - this.model.config.ledSize) / 2;
    this.model.config.matrixTop =
      (this.model.config.matrixHeightTotal - this.model.config.ledSize) / 2;

    this.model.geometry = new THREE.PlaneGeometry(
      this.model.config.ledSize,
      this.model.config.ledSize
    );
    this.model.material = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: new THREE.Color(this.model.config.baseColor) },
        uColorStrength: {
          value: this.localStorage
            ? this.localStorage.colorStrength
            : this.model.config.colorStrength,
        },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    });
    this.model.mesh = new THREE.InstancedMesh(
      this.model.geometry,
      this.model.material,
      this.model.config.matrixWidth * this.model.config.matrixHeight
    );
    this.model.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.model.mesh.instanceMatrix.needsUpdate = true;

    // Update the position of each element in the mesh
    for (let col = 0; col < this.model.config.matrixWidth; col++) {
      for (let row = 0; row < this.model.config.matrixHeight; row++) {
        const index = col * this.model.config.matrixHeight + row;

        const position = new THREE.Vector3(
          this.model.config.matrixLeft +
            col * (this.model.config.ledSize + this.model.config.ledSpacing),
          this.model.config.matrixTop -
            row * (this.model.config.ledSize + this.model.config.ledSpacing),
          0
        );

        const matrix = new THREE.Matrix4();
        matrix.setPosition(position);
        this.model.mesh.setMatrixAt(index, matrix);

        const color = new THREE.Color(this.model.config.baseColor);
        this.model.mesh.setColorAt(index, color);
      }
    }
    this.model.mesh.instanceColor.needsUpdate = true;
    this.model.meshGroup.add(this.model.mesh);

    // Create the background plane geometry
    this.model.backgroundGeometry = new THREE.PlaneGeometry(
      this.model.config.matrixWidthTotal + this.model.config.ledSize,
      this.model.config.matrixHeightTotal + this.model.config.ledSize
    );
    this.model.backgroundMaterial = new THREE.MeshBasicMaterial({
      color: "#000000",
    });
    this.model.backgroundMesh = new THREE.Mesh(
      this.model.backgroundGeometry,
      this.model.backgroundMaterial
    );
    this.model.backgroundMesh.position.z = -0.001;
    this.model.meshGroup.add(this.model.backgroundMesh);

    this.model.meshGroup.position.set(0.2, 0.75, -0.46);
    this.scene.add(this.model.meshGroup);

    if (this.debug) {
      this.debugFolder.addBlade({
        view: "separator",
      });
      this.debugFolder.addInput(
        this.model.material.uniforms.uColorStrength,
        "value",
        {
          label: "Overall Brightness",
          min: 0,
          max: 1,
          step: 0.001,
        }
      );
      this.debugFolder
        .addInput(this.model.config, "baseColor", {
          label: "LED Visual Base Color",
        })
        .on("change", () => {
          this.model.material.uniforms.uBaseColor.value.set(
            this.model.config.baseColor
          );
        });
      this.debugFolder.addInput(this.model.config, "color", {
        label: "LED Default Color",
      });
    }
  }

  /**
   * Set display modes
   */
  setModes() {
    this.modes = {};
    // 'default' | 'clock' | 'fans' |'...'
    this.modes.mode = this.localStorage ? this.localStorage.modes.mode : "fans";

    if (this.debug) {
      this.debugFolder.addBlade({
        view: "separator",
      });
      this.debugFolder.addInput(this.modes, "mode", {
        label: "Display Mode",
        options: {
          default: "default",
          clock: "clock",
          fans: "fans",
        },
      });
    }

    /**
     * Default display mode, single image
     */
    this.modes.default = {};
    this.modes.default.ledData = [];
    if (this.localStorage && this.localStorage.ledData.length > 0) {
      this.modes.default.ledData = this.localStorage.ledData;
    } else {
      this.modes.default.ledData = ledUtils.replaceBaseArrayColor(
        ledBaseArray.ckjdygc0,
        this.model.config.color
      );
    }

    this.modes.default.scrollMode = {};
    this.modes.default.scrollMode.mode = this.localStorage
      ? this.localStorage.scrollMode
      : 0;

    this.modes.default.scrollMode.intervalId = null;
    this.modes.default.scrollMode.left = () => {
      clearInterval(this.modes.default.scrollMode.intervalId);
      this.modes.default.scrollMode.intervalId = setInterval(() => {
        this.modes.default.ledData.push(this.modes.default.ledData.shift());
      }, 500);
    };
    this.modes.default.scrollMode.right = () => {
      clearInterval(this.modes.default.scrollMode.intervalId);
      this.modes.default.scrollMode.intervalId = setInterval(() => {
        this.modes.default.ledData.unshift(this.modes.default.ledData.pop());
      }, 500);
    };
    this.modes.default.scrollMode.stop = () => {
      clearInterval(this.modes.default.scrollMode.intervalId);
    };
    this.modes.default.scrollMode.start = () => {
      this.modes.default.scrollMode.stop();
      if (this.modes.default.scrollMode.mode === 1) {
        this.modes.default.scrollMode.right();
      } else if (this.modes.default.scrollMode.mode === -1) {
        this.modes.default.scrollMode.left();
      }
    };
    if (this.modes.mode === "default") this.modes.default.scrollMode.start();

    /**
     * Clock mode
     */
    this.modes.clock = {};
    this.modes.clock.ledData = Array(this.model.config.matrixWidth).fill(
      Array(this.model.config.matrixHeight).fill(0)
    );

    // Only fetched once when opened
    this.modes.clock.weekData = ledUtils.getWeekArray();

    // Heartbeat display data, alternating between large and small
    this.modes.clock.heartDataArr = [
      ledUtils.replaceBaseArrayColor(
        ledBaseArray.heart1,
        this.model.config.color
      ),
      ledUtils.replaceBaseArrayColor(
        ledBaseArray.heart2,
        this.model.config.color
      ),
    ];
    this.modes.clock.heartData = this.modes.clock.heartDataArr[0];

    this.modes.clock.timeData = ledUtils.replaceBaseArrayColor(
      ledUtils.getTimeArray(),
      this.model.config.color
    );

    // Heart animation playback sequence tracker
    let currentIndex = 0;
    this.modes.clock.update = () => {
      // heartData value is the element at the current array index
      this.modes.clock.heartData = this.modes.clock.heartDataArr[currentIndex];

      this.modes.clock.timeData = ledUtils.replaceBaseArrayColor(
        ledUtils.getTimeArray(),
        this.model.config.color
      );

      this.modes.clock.ledData = ledUtils.mergeIntoArray(
        this.modes.clock.ledData,
        [
          { col: 0, row: 0, array: this.modes.clock.heartData },
          { col: 12, row: 1, array: this.modes.clock.timeData },
          { col: 12, row: 7, array: this.modes.clock.weekData },
        ]
      );

      // Update index, reset to 0 if it exceeds the array length
      currentIndex = (currentIndex + 1) % this.modes.clock.heartDataArr.length;
    };

    // Update interval ID, used to pause the timer
    this.modes.clock.intervalId = null;
    this.modes.clock.start = () => {
      this.modes.clock.update();
      this.modes.clock.intervalId = setInterval(this.modes.clock.update, 1000);
    };
    this.modes.clock.stop = () => {
      clearInterval(this.modes.clock.intervalId);
    };
    if (this.modes.mode === "clock") this.modes.clock.start();

    /**
     * Fans mode
     */
    this.modes.fans = {};
    this.modes.fans.ledData = Array(this.model.config.matrixWidth).fill(
      Array(this.model.config.matrixHeight).fill(0)
    );
    this.modes.fans.bilibiliDataArray = [
      ledUtils.replaceBaseArrayColor(ledBaseArray.bilibili0, "#44a0fc"),
      ledUtils.replaceBaseArrayColor(ledBaseArray.bilibili1, "#44a0fc"),
    ];
    this.modes.fans.bilibiliData = this.modes.fans.bilibiliDataArray[0];

    this.modes.fans.fansNum = this.localStorage
      ? this.localStorage.fansNum
      : 666;
    this.modes.fans.numData = ledUtils.replaceBaseArrayColor(
      ledUtils.numToArray(this.modes.fans.fansNum, 7),
      this.model.config.color
    );
    // Currently fixed
    this.modes.fans.numStartCol =
      (29 - this.modes.fans.numData.length) / 2 + 10;

    // Bilibili animation playback
    let bilibiliCurrentIndex = 0;
    this.modes.fans.update = () => {
      this.modes.fans.bilibiliData =
        this.modes.fans.bilibiliDataArray[bilibiliCurrentIndex];

      this.modes.fans.ledData = ledUtils.mergeIntoArray(
        this.modes.fans.ledData,
        [
          {
            col: 1,
            row: 0,
            array: this.modes.fans.bilibiliData,
          },
          {
            col: this.modes.fans.numStartCol,
            row: 2,
            array: this.modes.fans.numData,
          },
        ]
      );

      // Update index, reset to 0 if it exceeds the array length
      bilibiliCurrentIndex =
        (bilibiliCurrentIndex + 1) % this.modes.fans.bilibiliDataArray.length;
    };

    this.modes.fans.intervalId = null;
    this.modes.fans.start = () => {
      this.modes.fans.update();
      this.modes.fans.intervalId = setInterval(this.modes.fans.update, 500);
    };
    this.modes.fans.stop = () => {
      clearInterval(this.modes.fans.intervalId);
    };
    if (this.modes.mode === "fans") this.modes.fans.start();

    /**
     * Listen for mode switching
     */
    window.addEventListener("message", (event) => {
      if (event.data.type === "matrix-led") {
        this.getLocalStorage();
        this.modes.clock.stop();
        this.modes.default.scrollMode.stop();
        this.modes.fans.stop();

        if (!this.localStorage) return;

        if (this.localStorage.modes.mode !== this.modes.mode) {
          this.modes.mode = this.localStorage.modes.mode;
        }

        if (this.modes.mode === "default") {
          this.modes.default.scrollMode.mode = this.localStorage.scrollMode;
          this.modes.default.scrollMode.start();

          if (this.localStorage.ledData.length <= 0) return;
          this.modes.default.ledData = this.localStorage.ledData;
        }

        if (this.modes.mode === "clock") this.modes.clock.start();

        if (this.modes.mode === "fans") this.modes.fans.start();

        gsap.fromTo(
          this.model.material.uniforms.uColorStrength,
          { value: 0 },
          { value: 1, duration: 1 }
        );
      }
    });
  }

  update() {
    // A 2D array [40][9] containing the final LED display data; assign to this regardless of mode
    this.modes.ledData = this.modes[this.modes.mode].ledData;

    for (let col = 0; col < this.model.config.matrixWidth; col++) {
      for (let row = 0; row < this.model.config.matrixHeight; row++) {
        const index = col * this.model.config.matrixHeight + row;
        const ledValue = this.modes.ledData[col][row];

        // If ledValue is 0, show baseColor
        // If ledValue is 1, show color
        // If it's a color value, show itself
        let color = this.model.config.baseColor;
        if (ledValue === 0) {
          color = this.model.config.baseColor;
        } else if (ledValue === 1) {
          color = this.model.config.color;
        } else {
          color = ledValue;
        }

        this.model.mesh.setColorAt(index, new THREE.Color(color));
      }
    }
    // Update mesh colors
    this.model.mesh.instanceColor.needsUpdate = true;
  }
}

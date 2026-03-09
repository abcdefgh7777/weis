import { defineStore } from "pinia";

export const useMatrixLedStore = defineStore("matrix-led", {
  state: () => {
    return {
      name: "Matrix LED",
      ledData: [],
      modes: {
        // mode options: default | clock | fans
        mode: "fans", // default | clock | fans
      },
      scrollMode: 0, // -1:left 0:none 1:right
      colorStrength: 1, // 0-1
      fansNum: 666,
    };
  },
  getters: {},
  actions: {
    setLedData(data) {
      this.ledData = data;
    },
    /**
     * Set scroll mode
     * @param {*} mode -1:left 0:none 1:right
     */
    setScrollMode(mode) {
      this.scrollMode = mode;
    },
    setModeIsDefault() {
      this.modes.mode = "default";
    },
    setModeIsClock() {
      this.modes.mode = "clock";
    },
    setModeIsFans() {
      this.modes.mode = "fans";
    },
    setFansNum(num) {
      this.fansNum = num;
    },
  },
  persist: {
    storage: localStorage,
  },
});

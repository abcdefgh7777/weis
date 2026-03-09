import { defineStore } from "pinia";

export const useLightControlStore = defineStore("light-control", {
  state: () => {
    return {
      name: "Light Control",
      roomLightIntensity: 0, // 0-1 0:off 1:max
      deskLightIntensity: 1, // 0-1 0:off 1:max
      deskLightColor: "#ff74de",
    };
  },
  getters: {},
  actions: {
    setRoomLightIntensity(intensity) {
      this.roomLightIntensity = Math.max(0, Math.min(1, intensity));
    },
    setDeskLightIntensity(intensity) {
      this.deskLightIntensity = Math.max(0, Math.min(1, intensity));
    },
    setDeskLightColor(color) {
      this.deskLightColor = color;
    },
  },
  persist: {
    storage: localStorage,
  },
});

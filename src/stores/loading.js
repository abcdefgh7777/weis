import { defineStore } from "pinia";

export const useLoadingStore = defineStore("loading", {
  state: () => {
    return {
      name: "Loading",
      start: false,
      loadingProgress: {},
    };
  },
  getters: {},
  actions: {},
});

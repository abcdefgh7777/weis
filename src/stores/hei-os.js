import { defineStore } from "pinia";

import APPList from "@/components/OS/APP";
// import { bingRandomUrl } from "@/api/third-party/wallpaper";

const bingRandomUrl = "https://bing.img.run/rand.php";

export const useHeiOsStore = defineStore("hei-os", {
  state: () => {
    return {
      name: "WEI-OS Desktop System",
      startMenu: false,
      control: false,
      calendar: false,
      tasks: [],
      screenBrightness: 1, // 0-1
      wallpaper: {
        default: true,
        random: false,
        url: "",
        color: false,
        colorValue: "#ffffff",
      },
    };
  },
  getters: {},
  actions: {
    /**
     * Desktop component operations
     */
    closeAll() {
      this.closeStartMenu();
      this.closeControl();
      this.closeCalendar();
    },
    openStartMenu() {
      this.startMenu = !this.startMenu;
      this.closeControl();
      this.closeCalendar();
    },
    closeStartMenu() {
      if (this.startMenu) this.startMenu = false;
    },
    openControl() {
      this.control = !this.control;
      this.closeStartMenu();
      this.closeCalendar();
    },
    closeControl() {
      if (this.control) this.control = false;
    },
    openCalendar() {
      this.calendar = !this.calendar;
      this.closeStartMenu();
      this.closeControl();
    },
    closeCalendar() {
      if (this.calendar) this.calendar = false;
    },
    /**
     * APP operations
     */
    openApp(id) {
      const index = this.tasks.findIndex((item) => item.id === id);
      if (index == -1) {
        const object = APPList.find((item) => item.id === id);
        let task = { ...object };
        task.min = false;
        task.date = new Date();
        task.lastDate = new Date();
        task.focus = true;

        this.tasks.push(task);
      }
      // Focus app and close start menu
      this.closeStartMenu();
      this.focusApp(id);
    },
    closeApp(id) {
      this.tasks = this.tasks.filter((item) => item.id !== id);
    },
    focusApp(id) {
      this.tasks.forEach((item) => {
        if (item.id === id) {
          item.focus = true;
          item.min = false;
          item.lastDate = new Date();
        } else {
          item.focus = false;
        }
      });
      this.closeStartMenu();
      this.closeControl();
      this.closeCalendar();
    },
    minOrShowApp(id) {
      const task = this.tasks.find((item) => item.id === id);
      if (task) {
        if (!task.min && task.focus) {
          task.min = true;
          task.focus = false;
        } else {
          task.min = false;
          this.focusApp(id);
        }
      }
    },
    sortAppByLastDate() {
      this.tasks.sort((a, b) => b.lastDate - a.lastDate);
    },
    /**
     * Wallpaper operations
     */
    setWallpaperIsImage(url) {
      this.wallpaper.url = url;
      this.wallpaper.default = false;
      this.wallpaper.random = false;
      this.wallpaper.color = false;
    },
    setWallpaperIsRandom() {
      this.wallpaper.url = bingRandomUrl;
      this.wallpaper.default = false;
      this.wallpaper.color = false;
      this.wallpaper.random = true;
    },
    setWallpaperIsDefault() {
      this.wallpaper.url = "";
      this.wallpaper.default = true;
      this.wallpaper.random = false;
      this.wallpaper.color = false;
    },
    setWallpaperIsColor() {
      if (this.wallpaper.color) return;

      this.wallpaper.default = false;
      this.wallpaper.random = false;
      this.wallpaper.color = true;
    },
    setWallpaperColorValue(colorValue) {
      this.wallpaper.colorValue = colorValue;
    },
  },
  persist: {
    storage: localStorage,
  },
});

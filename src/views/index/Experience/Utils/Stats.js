import StatsJs from "stats.js";

export default class Stats {
  constructor(_active) {
    this.instance = new StatsJs();
    this.instance.showPanel(0);

    this.active = false;
    this.max = 40;
    this.ignoreMaxed = true;

    if (_active) {
      this.activate();
    }
  }

  /**
   * Activate stats frame rate display
   */
  activate() {
    this.active = true;
    document.body.appendChild(this.instance.domElement);
  }

  /**
   * Deactivate stats frame rate display
   */
  deactivate() {
    this.active = false;
    document.body.removeChild(this.instance.domElement);
  }

  /**
   * Update stats frame rate display
   */
  update() {
    if (!this.active) {
      return;
    }
    this.instance.update();
  }

  /**
   * Destroy stats frame rate display
   */
  destroy() {
    this.deactivate();
  }
}

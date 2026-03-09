import EventEmitter from "./Utils/EventEmitter";
import Loader from "./Utils/Loader";

import * as THREE from "three";

export default class Resources extends EventEmitter {
  constructor(_assets) {
    super();

    // All resources
    this.items = {};

    this.loader = new Loader();

    this.groups = {};
    this.groups.assets = [..._assets];
    this.groups.loaded = [];
    this.groups.current = null;

    this.loadNextGroup();

    // File load and end events
    this.loader.on("fileEnd", (_resource, _data) => {
      let data = _data;

      // Convert to texture
      if (_resource.type === "texture") {
        if (!(data instanceof THREE.Texture)) {
          data = new THREE.Texture(_data);
        }
        data.needsUpdate = true;
      }

      this.items[_resource.name] = data;

      // Progress and events
      this.groups.current.loaded++;
      this.trigger("progress", [this.groups.current, _resource, data]);
    });

    // All loaded end event
    this.loader.on("end", () => {
      this.groups.loaded.push(this.groups.current);

      this.trigger("groupEnd", [this.groups.current]);

      if (this.groups.assets.length > 0) {
        this.loadNextGroup();
      } else {
        this.trigger("end");
      }
    });
  }

  loadNextGroup() {
    this.groups.current = this.groups.assets.shift();
    this.groups.current.toLoad = this.groups.current.items.length;
    this.groups.current.loaded = 0;

    this.loader.load(this.groups.current.items);
  }

  createInstancedMeshes(_children, _groups) {
    // Groups
    const groups = [];

    for (const _group of _groups) {
      groups.push({
        name: _group.name,
        regex: _group.regex,
        meshesGroups: [],
        instancedMeshes: [],
      });
    }

    // Result
    const result = {};

    for (const _group of groups) {
      result[_group.name] = _group.instancedMeshes;
    }

    return result;
  }

  destroy() {
    for (const _itemKey in this.items) {
      const item = this.items[_itemKey];
      if (item instanceof THREE.Texture) {
        item.dispose();
      }
    }
  }
}

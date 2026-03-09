import Experience from "../Experience";

import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export default class Screen {
  constructor() {
    this.experience = new Experience();
    this.scene = this.experience.scene;
    this.cssScene = this.experience.cssScene;
    this.camera = this.experience.camera;
    this.config = this.experience.config;
    this.resources = this.experience.resources;
    this.targetElement = this.experience.targetElement;
    this.navigation = this.experience.navigation;

    this.setScreenModel();

    this.setLeftScreen();
    this.setRightScreen();
    this.setTerminal();

    this.setListener();
  }

  setScreenModel() {
    this.screenModel = {};

    this.screenModel.left = this.resources.items.finalModel.scene.children.find(
      (mesh) => mesh.name === "电脑屏幕左"
    );
    this.screenModel.right =
      this.resources.items.finalModel.scene.children.find(
        (mesh) => mesh.name === "电脑屏幕右"
      );

    this.screenModel.material = new THREE.MeshBasicMaterial({
      transparent: true,
      color: "#000000",
      opacity: 0,
      blending: THREE.NoBlending,
    });
    this.screenModel.left.material = this.screenModel.material;
  }

  setLeftScreen() {
    this.leftScreen = {};

    this.leftScreen.iframe = document.createElement("iframe");
    this.leftScreen.iframe.src = "#/hei-os?isHeiOs=true";
    this.leftScreen.iframe.style.width = 1280 + "px";
    this.leftScreen.iframe.style.height = 720 + "px";
    this.leftScreen.iframe.style.border = "none";
    this.leftScreen.iframe.style.position = "absolute";
    this.leftScreen.iframe.id = "left-screen";
    this.leftScreen.iframe.style.zIndex = 20;

    this.leftScreen.object = new CSS3DObject(this.leftScreen.iframe);
    this.leftScreen.object.position.copy(this.screenModel.left.position);
    this.leftScreen.object.rotation.copy(this.screenModel.left.rotation);

    let scaleNum = 0.0005;
    this.leftScreen.object.scale.copy(
      new THREE.Vector3(scaleNum, scaleNum, scaleNum)
    );

    this.cssScene.add(this.leftScreen.object);
  }

  setRightScreen() {
    this.rightScreen = {};

    // Logo image (visible by default)
    this.rightScreen.texture = this.resources.items.logoImage;
    this.rightScreen.texture.colorSpace = THREE.SRGBColorSpace;

    this.rightScreen.geometry = new THREE.PlaneGeometry(0.2, 0.2);

    this.rightScreen.material = new THREE.MeshBasicMaterial({
      map: this.rightScreen.texture,
      transparent: true,
    });

    this.rightScreen.mesh = new THREE.Mesh(
      this.rightScreen.geometry,
      this.rightScreen.material
    );
    this.rightScreen.mesh.name = "电脑屏幕右";

    this.rightScreen.mesh.position.set(
      this.screenModel.right.position.x - 0.001,
      this.screenModel.right.position.y,
      this.screenModel.right.position.z + 0.001
    );
    this.rightScreen.mesh.rotation.copy(this.screenModel.right.rotation);

    this.scene.add(this.rightScreen.mesh);
  }

  setTerminal() {
    this.terminal = {};
    this.terminal.activities = [];

    // Terminal CSS3D object (hidden until right screen is clicked)
    this.screenModel.right.material = this.screenModel.material;

    this.terminal.container = document.createElement("div");
    this.terminal.container.id = "wei-terminal";
    this.terminal.container.style.cssText =
      "width:1280px;height:720px;background:#0a0a0a;color:#ccc;font-family:'Courier New',monospace;font-size:13px;overflow:hidden;position:absolute;box-sizing:border-box;display:flex;flex-direction:column;";

    // === TOP BAR: wallet + status ===
    const topBar = document.createElement("div");
    topBar.style.cssText =
      "display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid #1a1a1a;background:#0d0d0d;flex-shrink:0;";

    const walletDiv = document.createElement("div");
    walletDiv.style.cssText = "display:flex;align-items:center;gap:8px;";
    walletDiv.innerHTML = `<span style="color:#666;font-size:11px;">SOL</span><span style="color:#facc15;font-size:12px;" id="wei-wallet-addr">loading...</span>`;
    topBar.appendChild(walletDiv);

    const statusDiv = document.createElement("div");
    statusDiv.style.cssText = "display:flex;align-items:center;gap:6px;";
    statusDiv.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#facc15;display:inline-block;"></span><span style="color:#facc15;font-size:11px;text-transform:uppercase;letter-spacing:2px;" id="wei-status">learning</span>`;
    topBar.appendChild(statusDiv);

    this.terminal.container.appendChild(topBar);

    // === MAIN CONTENT: two columns ===
    const main = document.createElement("div");
    main.style.cssText = "display:flex;flex:1;overflow:hidden;";

    // --- LEFT: learning + activity feed ---
    const leftCol = document.createElement("div");
    leftCol.style.cssText = "flex:1;display:flex;flex-direction:column;border-right:1px solid #1a1a1a;overflow:hidden;";

    // Learning section
    const learnSection = document.createElement("div");
    learnSection.style.cssText = "padding:14px 20px;border-bottom:1px solid #1a1a1a;flex-shrink:0;";
    learnSection.innerHTML = `<div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">currently learning</div>`;
    this.terminal.learningList = document.createElement("div");
    this.terminal.learningList.style.cssText = "display:flex;flex-direction:column;gap:4px;";
    this.terminal.learningList.innerHTML = `<div style="color:#444;font-size:12px;">loading...</div>`;
    learnSection.appendChild(this.terminal.learningList);
    leftCol.appendChild(learnSection);

    // Activity feed
    const feedHeader = document.createElement("div");
    feedHeader.style.cssText = "padding:10px 20px 6px;color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;flex-shrink:0;";
    feedHeader.textContent = "activity";
    leftCol.appendChild(feedHeader);

    this.terminal.lines = document.createElement("div");
    this.terminal.lines.style.cssText =
      "flex:1;overflow:hidden;padding:0 20px 10px;display:flex;flex-direction:column-reverse;";
    leftCol.appendChild(this.terminal.lines);

    main.appendChild(leftCol);

    // --- RIGHT: X activity ---
    const rightCol = document.createElement("div");
    rightCol.style.cssText = "width:420px;display:flex;flex-direction:column;overflow:hidden;";

    const xHeader = document.createElement("div");
    xHeader.style.cssText = "padding:14px 16px;border-bottom:1px solid #1a1a1a;flex-shrink:0;";
    xHeader.innerHTML = `<div style="color:#666;font-size:10px;text-transform:uppercase;letter-spacing:2px;">x / twitter activity</div>`;
    rightCol.appendChild(xHeader);

    this.terminal.xFeed = document.createElement("div");
    this.terminal.xFeed.style.cssText = "flex:1;overflow:hidden;padding:10px 16px;display:flex;flex-direction:column;gap:8px;";
    this.terminal.xFeed.innerHTML = `<div style="color:#444;font-size:12px;text-align:center;padding:20px;">waiting for activity...</div>`;
    rightCol.appendChild(this.terminal.xFeed);

    main.appendChild(rightCol);
    this.terminal.container.appendChild(main);

    // === BOTTOM BAR ===
    const bottomBar = document.createElement("div");
    bottomBar.style.cssText =
      "padding:8px 20px;border-top:1px solid #1a1a1a;background:#0d0d0d;flex-shrink:0;display:flex;justify-content:space-between;";
    bottomBar.innerHTML = `<span style="color:#333;font-size:10px;">wei@agent</span><span style="color:#333;font-size:10px;" id="wei-time"></span>`;
    this.terminal.container.appendChild(bottomBar);

    // Update time
    this.terminal.timeEl = bottomBar.querySelector("#wei-time");
    setInterval(() => {
      if (this.terminal.timeEl) {
        this.terminal.timeEl.textContent = new Date().toLocaleTimeString();
      }
    }, 1000);

    this.terminal.object = new CSS3DObject(this.terminal.container);
    this.terminal.object.position.copy(this.screenModel.right.position);
    this.terminal.object.rotation.copy(this.screenModel.right.rotation);

    let scaleNum = 0.0005;
    this.terminal.object.scale.copy(
      new THREE.Vector3(scaleNum, scaleNum, scaleNum)
    );

    // Hidden by default
    this.terminal.object.visible = false;
    this.cssScene.add(this.terminal.object);

    this.connectTerminalWs();
    this.fetchTerminalData();
    // Refresh learning topics every 2 minutes
    setInterval(() => this.fetchLearningTopics(), 120000);
  }

  fetchTerminalData() {
    const serverUrl = import.meta.env?.DEV
      ? "http://localhost:3001"
      : "";
    fetch(`${serverUrl}/api/status`)
      .then((r) => r.json())
      .then((data) => {
        const walletEl = this.terminal.container.querySelector("#wei-wallet-addr");
        if (walletEl && data.wallet) {
          walletEl.textContent = data.wallet.slice(0, 6) + "..." + data.wallet.slice(-4);
        }
      })
      .catch(() => {});
    // Fetch real balance
    fetch(`${serverUrl}/api/wallet/balance`)
      .then((r) => r.json())
      .then((data) => {
        const walletEl = this.terminal.container.querySelector("#wei-wallet-addr");
        if (walletEl && data.balance !== null) {
          const addr = walletEl.textContent;
          walletEl.textContent = `${addr}  ·  ${data.balance.toFixed(4)} SOL`;
        }
      })
      .catch(() => {});
    this.fetchLearningTopics();
  }

  fetchLearningTopics() {
    const serverUrl = import.meta.env?.DEV
      ? "http://localhost:3001"
      : "";
    fetch(`${serverUrl}/api/learning`)
      .then((r) => r.json())
      .then((data) => {
        if (data.topics?.length && this.terminal.learningList) {
          this.terminal.learningList.innerHTML = data.topics
            .map((t) => `<div style="color:#c084fc;font-size:12px;">▸ ${t}</div>`)
            .join("");
        }
      })
      .catch(() => {});
  }

  connectTerminalWs() {
    const wsUrl = import.meta.env?.DEV
      ? "ws://localhost:3001/ws"
      : `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "init") {
        // Clear old data (reflects deletions from admin)
        if (this.terminal.lines) this.terminal.lines.innerHTML = "";
        if (this.terminal.xFeed) this.terminal.xFeed.innerHTML = "";
        for (const item of msg.data.slice(0, 20).reverse()) {
          this.addTerminalLine(item);
        }
      } else if (msg.type === "activity") {
        this.addTerminalLine(msg.data);
      }
    };

    ws.onclose = () => {
      setTimeout(() => this.connectTerminalWs(), 5000);
    };
    ws.onerror = () => ws.close();
  }

  addTerminalLine(item) {
    if (!this.terminal.lines) return;

    const colors = {
      thinking: "#c084fc",
      tweet: "#60a5fa",
      reply: "#22d3ee",
      wallet: "#facc15",
      system: "#555",
      retweet: "#34d399",
      quote: "#f472b6",
    };

    // X activity goes to right column
    if (item.type === "tweet" || item.type === "reply" || item.type === "retweet" || item.type === "quote") {
      this.addXActivity(item);
    }

    // All activity goes to left feed
    const line = document.createElement("div");
    line.style.cssText = `margin-bottom:3px;line-height:1.4;font-size:12px;color:${colors[item.type] || "#00ff88"};`;

    const time = new Date(item.timestamp).toLocaleTimeString();
    const content = item.content.length > 80 ? item.content.slice(0, 80) + "..." : item.content;
    line.textContent = `[${time}] ${item.type}: ${content}`;

    this.terminal.lines.prepend(line);

    while (this.terminal.lines.children.length > 30) {
      this.terminal.lines.removeChild(this.terminal.lines.lastChild);
    }
  }

  addXActivity(item) {
    if (!this.terminal.xFeed) return;

    // Clear placeholder
    if (this.terminal.xFeed.querySelector("div[style*='text-align:center']")) {
      this.terminal.xFeed.innerHTML = "";
    }

    const colors = { tweet: "#60a5fa", reply: "#22d3ee", retweet: "#34d399", quote: "#f472b6" };
    const labels = { tweet: "posted", reply: "replied", retweet: "retweeted", quote: "quoted" };

    const entry = document.createElement("div");
    entry.style.cssText = "border-bottom:1px solid #1a1a1a;padding-bottom:8px;";

    const time = new Date(item.timestamp).toLocaleTimeString();
    const tweetId = item.meta?.tweetId || "";
    const xLink = tweetId ? `https://x.com/weicli0x/status/${tweetId}` : "https://x.com/weicli0x";

    entry.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
        <span style="color:${colors[item.type] || "#60a5fa"};font-size:10px;text-transform:uppercase;">${labels[item.type] || item.type}</span>
        <span style="color:#333;font-size:10px;">${time}</span>
      </div>
      <div style="color:#999;font-size:12px;line-height:1.4;">${item.content.length > 120 ? item.content.slice(0, 120) + "..." : item.content}</div>
      <a href="${xLink}" target="_blank" style="color:#444;font-size:10px;text-decoration:none;margin-top:3px;display:inline-block;">view on x ↗</a>
    `;

    this.terminal.xFeed.prepend(entry);

    while (this.terminal.xFeed.children.length > 10) {
      this.terminal.xFeed.removeChild(this.terminal.xFeed.lastChild);
    }
  }

  setListener() {
    this.listener = {};

    this.listener.down = (_x, _y) => {
      const mouse = new THREE.Vector2();
      mouse.x = (_x / this.config.width) * 2 - 1;
      mouse.y = -(_y / this.config.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, this.camera.instance);

      const intersects = raycaster.intersectObjects(this.scene.children, true);

      if (intersects.length > 0) {
        const selectedObject = intersects[0].object;

        switch (selectedObject.name) {
          case "电脑屏幕右":
            this.navigation.viewModes.rightScreen();
            // Show terminal, hide logo
            this.rightScreen.mesh.visible = false;
            this.terminal.object.visible = true;
            break;
          case "电脑屏幕左":
            this.navigation.viewModes.leftScreen();
            // Hide terminal, show logo
            this.rightScreen.mesh.visible = true;
            this.terminal.object.visible = false;
            break;
          default:
            this.navigation.viewModes.default();
            // Hide terminal, show logo
            this.rightScreen.mesh.visible = true;
            this.terminal.object.visible = false;
            break;
        }
      }
    };

    this.listener.onMouseDown = (_event) => {
      _event.preventDefault();
      this.listener.down(_event.clientX, _event.clientY);
    };
    this.listener.onTouchStart = (_event) => {
      _event.preventDefault();
      this.listener.down(_event.touches[0].clientX, _event.touches[0].clientY);
    };

    this.targetElement.addEventListener(
      "mousedown",
      this.listener.onMouseDown,
      false
    );
    this.targetElement.addEventListener(
      "touchstart",
      this.listener.onTouchStart,
      false
    );
  }
}

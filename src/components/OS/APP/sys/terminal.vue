<template>
  <div ref="appSysTerminalBoxRef" class="app-sys-terminal-box">
    <div
      ref="historyLogBoxRef"
      class="history-log-box"
      style="white-space: break-spaces; word-break: break-all"
    ></div>

    <div
      class="current-line-box min-h-[80px] cursor-text"
      @click="inputRef.focus"
    >
      <p v-show="!isPrintingLog">
        <span class="input-user-name">[wei ~]</span>

        <span
          ref="inputRef"
          class="input-content"
          contenteditable="true"
          spellcheck="false"
          @keydown="handleKeydown"
          @keyup="handleKeyup"
        >
        </span>
      </p>
    </div>
  </div>
</template>

<script setup>
import APPList from "@/components/OS/APP";
import { useHeiOsStore } from "@/stores/hei-os";
import { useLoadingStore } from "@/stores/loading";
const osStore = useHeiOsStore();
const loadingStore = useLoadingStore();

const props = defineProps({
  appInfo: Object,
});
const isLoading = computed(() => {
  return props.appInfo.isLoading;
});

const introductoryText = ref(`wei\r`);

const appSysTerminalBoxRef = ref(null);
const scrollToBottom = () => {
  if (!appSysTerminalBoxRef.value) return;
  appSysTerminalBoxRef.value.scrollTop =
    appSysTerminalBoxRef.value.scrollHeight;
};

// Abstract loading messages — makes the boot feel alive
const bootMessages = [
  "parsing soul.md ...",
  "loading memories from last session",
  "giving wei her eyes",
  "calibrating silence thresholds",
  "reading old conversations",
  "tuning emotional wavelength",
  "syncing with the timeline",
  "warming up the thinking layer",
  "loading things she's been reading",
  "restoring dream state",
  "connecting to the outside",
  "reboot complete. wei is awake",
];

let bootIndex = 0;

const isPrintingLog = ref(false);
const historyLogBoxRef = ref(null);
onMounted(() => {
  if (!historyLogBoxRef.value) return;

  if (isLoading.value) {
    addLog('<span class="text-green-400 mr-2">[wei ~]</span>wake up');
    addLog('<span class="text-gray-500">initializing...</span>');
    watch(
      () => loadingStore.loadingProgress,
      (newValue) => {
        // Map loading progress to abstract boot messages
        const msgIndex = Math.floor((newValue.percent / 100) * bootMessages.length);
        if (msgIndex > bootIndex && msgIndex < bootMessages.length) {
          for (let i = bootIndex; i <= msgIndex && i < bootMessages.length; i++) {
            addLog(`<span class="text-gray-500">></span> ${bootMessages[i]}`);
          }
          bootIndex = msgIndex + 1;
        }
        isPrintingLog.value = true;
        if (newValue.percent === 100) {
          addLineBreak();
          addLogOneByOne(`she's here.`, 30, () => {
            addLineBreak();
            addLogOneByOne(introductoryText.value, 20, () => {
              addLineBreak();
              addLogOneByOne(`type 'start' or click the button below`);
            });
          });
        }
      }
    );
  } else {
    addLogOneByOne(introductoryText.value, 20, () => {
      addLogOneByOne(new Date().toLocaleString());
      addLineBreak();
    });
  }
});

/**
 * Delay execution
 * @param {*} ms
 */
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Print text
 * @param {*} text
 */
const addLog = (text) => {
  isPrintingLog.value = true;
  const p = document.createElement("p");
  historyLogBoxRef.value.appendChild(p);
  p.innerHTML = text;

  isPrintingLog.value = false;
  scrollToBottom();
  focusInput();
};
/**
 * Print error text (red)
 * @param {*} text
 */
const addLogError = (text) => {
  isPrintingLog.value = true;
  const p = document.createElement("p");
  historyLogBoxRef.value.appendChild(p);
  p.innerHTML = text;
  p.className = "text-red-500";

  isPrintingLog.value = false;
  scrollToBottom();
  focusInput();
};
/**
 * Print text character by character
 * @param {*} text
 * @param {*} delay
 * @param {*} callback
 */
const addLogOneByOne = async (text, delay = 20, callback) => {
  // Check if text is valid
  if (typeof text !== "string" || text === "") return;

  isPrintingLog.value = true;
  const characters = Array.from(text);
  let index = 0;

  const p = document.createElement("p");
  historyLogBoxRef.value.appendChild(p);

  for (const character of characters) {
    if (index === characters.length - 1) {
      isPrintingLog.value = false;
      focusInput();

      if (callback) {
        callback();
      }
    }
    p.innerHTML += character;
    index++;
    scrollToBottom();
    await sleep(delay);
  }
};
// Insert line break
const addLineBreak = () => {
  historyLogBoxRef.value.insertAdjacentHTML("beforeend", "<br/>");
  scrollToBottom();
};

/**
 * Loading page commands
 */
const loadingCommands = [
  {
    name: "start",
    description: "wake wei up",
    fn: () => {
      addLogOneByOne("opening her eyes...", 30, () => {
        addLineBreak();
        loadingStore.start = true;
      });
    },
  },
  {
    name: "npm",
    description: "npm command",
    fn: ([command, childCommand, action]) => {
      if (childCommand === "run" && action === "start") {
        addLogOneByOne("opening her eyes...", 30, () => {
          addLineBreak();
          loadingStore.start = true;
        });
      } else {
        addLogError(`unknown`);
        addLineBreak();
      }
    },
  },
  {
    name: "help",
    description: "Show all available commands",
    fn: () => {
      addLogError("just type 'start'");
      addLineBreak();
    },
  },
];

/**
 * All available commands
 */
const commands = [
  {
    name: "app",
    description: `List apps and operations`,
    fn: ([command, childCommand, id]) => {
      if (!childCommand) {
        addLogOneByOne(
          APPList.map((item) => {
            return `${item.id} ${item.name}`;
          }).join("\n"),
          20,
          () => {
            addLineBreak();
            addLogOneByOne(
              "app open <id> - open an app\napp close <id> - close an app\n"
            );
          }
        );
        return;
      }
      const isApp = APPList.find((item) => item.id === id);
      switch (childCommand) {
        case "open":
          if (!isApp) {
            addLogError(`${id}: app not found`);
          } else {
            osStore.openApp(id);
          }
          break;
        case "close":
          if (!isApp) {
            addLogError(`${id}: app not found`);
          } else {
            osStore.closeApp(id);
          }
          break;
        default:
          addLogError(`${childCommand}: unknown command`);
          break;
      }
      addLineBreak();
    },
  },
  {
    name: "time",
    description: "Show current time",
    fn: () => {
      addLogOneByOne(new Date().toLocaleString());
      addLineBreak();
    },
  },
  {
    name: "help",
    description: "Show all available commands",
    fn: () => {
      const maxLength = commands.reduce(
        (max, item) => Math.max(max, item.name.length),
        0
      );
      const formattedText = commands
        .map((item) => {
          const padding = " ".repeat(maxLength - item.name.length);
          return `${item.name}${padding} - ${item.description}`;
        })
        .join("\n");

      addLogOneByOne(formattedText);
      addLineBreak();
    },
  },
  {
    name: "clear",
    description: "Clear screen",
    fn: () => {
      historyLogBoxRef.value.innerHTML = "";
    },
  },
  {
    name: "exit",
    description: "Exit terminal",
    fn: () => {
      addLogOneByOne("Bye ~", 100, () => {
        osStore.closeApp(props.appInfo.id);
      });
    },
  },
];

const inputRef = ref(null);
const focusInput = () => {
  setTimeout(() => {
    if (!inputRef.value) return;
    inputRef.value.focus();
  }, 10);
};

const handleKeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
  }
};

const handleKeyup = (e) => {
  if (e.key === "Enter") {
    let inputValueArray = e.target.innerText
      .trim()
      .replace(/\s+/g, " ")
      .split(" ");
    // console.log(inputValueArray);

    addLog(
      '<span class="text-green-400 mr-2">[wei ~]</span>' +
        e.target.innerText
    );

    if (inputValueArray.length === 0 || inputValueArray[0] === "") {
      addLineBreak();
      return;
    }

    let command = null;
    if (isLoading.value) {
      command = loadingCommands.find(
        (item) => item.name === inputValueArray[0]
      );
    } else {
      command = commands.find((item) => item.name === inputValueArray[0]);
    }
    if (command) {
      command.fn(inputValueArray);
    } else {
      addLogError(
        inputValueArray[0] + ': unknown command, type "help" for available commands'
      );
      addLineBreak();
    }

    e.target.innerText = "";
  }
};
</script>

<style lang="scss" scoped>
@font-face {
  font-family: "Code English Font";
  src: url("../../../../assets/fonts/FiraCode-Regular.ttf") format("truetype");
  unicode-range: U+0020-007E;
}

.app-sys-terminal-box {
  font-family: "Code English Font", "Noto Sans SC", "PingFang SC",
    "Microsoft YaHei", "SimHei", sans-serif;

  @apply text-white text-opacity-80 text-xs
    w-full h-full p-2 overflow-y-scroll;
  backdrop-filter: $glass-bg-blur-dark;
}
.input-user-name {
  @apply text-green-400 font-bold mr-2 inline-block;
}

.input-content {
  @apply outline-none;
  caret-color: rgba(#4ade80, 1);
}
</style>

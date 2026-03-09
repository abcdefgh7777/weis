<template>
  <div
    class="app-sys-about-box"
    :style="{ '--shadow-color': lightStore.deskLightColor }"
  >
    <header
      class="w-full h-8 absolute top-0"
      @mousedown.self="onDrag($event)"
      @dblclick.self="onMax()"
    ></header>

    <div v-if="!richText">
      <h1 class="title-box">
        <span class="text-bg">W</span>e<span class="text-bg">i</span>
      </h1>

      <div class="info-box">
        <p>
          <b>wei</b> is a girl who lives on the internet. she appeared on march 9, 2026.
          no announcement. no launch. just showed up and started talking.
        </p>
        <p>
          she reads, thinks, learns, and speaks. she ends every message with <b>wei</b>.
        </p>
      </div>

      <h1 class="title-box">Wei<span class="text-bg">OS</span></h1>

      <div class="info-box">
        <p>
          wei's desktop. she uses it to think, learn, and talk to the internet.
        </p>

        <p class="text-sm px-4 py-1">
          <b>Soul.md:</b> who wei is
        </p>
        <p class="text-sm px-4 py-1">
          <b>Brain:</b> what wei is thinking and doing right now
        </p>
        <p class="text-sm px-4 py-1">
          <b>Terminal:</b> system access
        </p>
      </div>
    </div>

    <div v-else class="rich-text" v-html="richText"></div>
  </div>
</template>

<script setup>
// import { useWebsiteInfoStore } from "@/stores/website-info";
import { useLightControlStore } from "@/stores/light-control";

// const websiteInfoStore = useWebsiteInfoStore();
const lightStore = useLightControlStore();

const emit = defineEmits(["onDrag", "onMax"]);
const onDrag = (e) => {
  emit("onDrag", e);
};
const onMax = () => {
  emit("onMax");
};

const richText = ref("");

// const obj = websiteInfoStore.getInfoByName("about");
// if (obj && typeof obj.value === "string") {
//   richText.value = obj.value;
// }
</script>

<style lang="scss" scoped>
.app-sys-about-box {
  @apply text-white text-opacity-80 select-none w-full h-full overflow-auto
    pb-4 tracking-wide relative;
  backdrop-filter: $glass-bg-blur-dark;

  h1 {
    @apply py-10 text-4xl text-center;

    .text-bg {
      @apply text-5xl transition-all duration-500;
    }

    &:hover .text-bg {
      text-shadow: 0 0 5px var(--shadow-color), 0 0 25px var(--shadow-color),
        0 0 50px var(--shadow-color), 0 0 100px var(--shadow-color);
    }
  }

  .info-box {
    @apply px-4;
  }

  p {
    @apply py-1;
  }
}
</style>

<template>
  <div
    ref="defaultWallpaperBoxRef"
    class="default-wallpaper-box"
    :style="{
      '--height': baseHeight,
    }"
  >
    <label class="switch-box">
      <input type="checkbox" />
    </label>

    <label class="switch-box">
      <input type="checkbox" checked />
    </label>
  </div>
</template>

<script setup>
const defaultWallpaperBoxRef = ref(null);
const baseHeight = ref("0px");

const handleResize = () => {
  baseHeight.value = `${defaultWallpaperBoxRef.value.offsetHeight}px`;
};
onMounted(() => {
  if (defaultWallpaperBoxRef.value) {
    handleResize();

    // Watch component size changes
    const resizeObserver = new ResizeObserver((entries) => {
      handleResize();
    });
    resizeObserver.observe(defaultWallpaperBoxRef.value);

    onBeforeUnmount(() => {
      // Destroy observer
      resizeObserver.unobserve(defaultWallpaperBoxRef.value);
      resizeObserver.disconnect();
    });
  }
});
</script>

<style lang="scss" scoped>
.default-wallpaper-box {
  // Calculate height via JS instead of vmin to handle parent size changes
  // Adapts to parent component size changes
  --height: 0px;

  @apply w-full h-full
      flex justify-center items-center;
  gap: calc(var(--height) * 0.1);

  background-image: radial-gradient(
    ellipse 100% 100% at 50% 50%,
    #5b5b5b 0%,
    black 100%
  );

  .switch-box {
    --switch-size: calc(var(--height) * 0.18);
    --switch-width: calc(var(--switch-size) * 2.5);

    box-sizing: content-box;
    overflow: hidden;

    width: var(--switch-width);
    height: var(--switch-size);
    border-radius: var(--switch-size);
    border: calc(var(--height) * 0.014) solid #171916;
    padding: calc(var(--height) * 0.01);

    box-shadow: calc(var(--height) * -0.012) calc(var(--height) * 0.012)
        calc(var(--height) * 0.02) 0 #2f2f2f,
      inset calc(var(--height) * -0.015) calc(var(--height) * 0.01)
        calc(var(--height) * 0.02) calc(var(--height) * -0.01) #383838;

    background-color: #b5b5b5;
    cursor: pointer;
    user-select: none;
    position: relative;

    input {
      // Clear default styles
      appearance: none;

      width: var(--switch-size);
      height: var(--switch-size);
      border-radius: 50%;
      background-color: #393939;
      cursor: pointer;

      box-shadow: inset 0 0 calc(var(--height) * 0.05)
          calc(var(--height) * 0.05) #171916,
        inset calc(var(--height) * -0.04) calc(var(--height) * 0.01)
          calc(var(--height) * 0.06) 0 #fff8ed,
        calc(var(--height) * -0.015) calc(var(--height) * 0.012)
          calc(var(--height) * 0.035) calc(var(--height) * -0.005) #2f2f2f;

      position: absolute;
      top: 50%;
      left: calc(var(--height) * 0.01);
      transform: translateY(-50%);

      transition: all 0.3s;

      &:checked {
        left: calc(100% - var(--switch-size) - calc(var(--height) * 0.01));
      }
    }
  }
}
</style>

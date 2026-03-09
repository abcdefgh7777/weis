<template>
  <RouterView />
</template>

<script setup>
import { RouterLink, RouterView } from "vue-router";

const nb = `%c
$$\\      $$\\           $$\\
$$ | $\\  $$ |          \\__|
$$ |$$$\\ $$ | $$$$$$\\  $$\\
$$ $$ $$\\$$ |$$  __$$\\ $$ |
$$$$  _$$$$ |$$$$$$$$ |$$ |
$$$  / \\$$$ |$$   ____|$$ |
$$  /   \\$$ |\\$$$$$$$\\ $$ |
\\__/     \\__| \\_______|\\__|
%c
  Wei - Creative Tech \n
`;

console.log(nb, "color: #ff74de", "font-size: 20px");
</script>

<style lang="scss" scoped></style>

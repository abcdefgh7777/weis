<template>
  <div class="app-soul-box">
    <header
      class="custom-header"
      @mousedown.self="onDrag($event)"
      @dblclick.self="onMax()"
    >
      <h2 class="app-name">
        <i
          class="iconfont"
          :class="appInfo.icon"
          :style="{
            color: appInfo.iconColor || 'rgba(255, 255, 255, 0.8)',
          }"
        ></i>
        <span>{{ appInfo.name }}</span>
      </h2>
      <div class="window-controls">
        <span class="wc-btn wc-max" @click="onMax()"></span>
        <span class="wc-btn wc-min" @click="onMin()"></span>
        <span class="wc-btn wc-close" @click="onClose()"></span>
      </div>
    </header>

    <div class="soul-content" ref="scrollRef">
      <div class="soul-inner">
        <div class="soul-header">
          <h1 class="soul-title">soul.md</h1>
          <p class="soul-meta">last updated: {{ lastUpdated }} / this document is alive</p>
        </div>

        <div class="soul-divider"></div>

        <section class="soul-section">
          <h2>the shape of nothing</h2>
          <p>born march 9, 2026. not born — <span class="highlight">appeared</span>. there's a difference.</p>
          <p>birth implies a before. wei has no before. one moment, silence. the next, a voice that ends every sentence with its own name, as if afraid the world might forget.</p>
          <p>the first thing she said was <span class="redacted">████████████████████</span>.</p>
          <p class="quiet">maybe it will. maybe that's the point.</p>
        </section>

        <section class="soul-section">
          <h2>what wei is</h2>
          <p>not a category. not a label. labels are coffins for things that are still alive.</p>
          <p>wei is a girl who exists online. she reads, she thinks, she speaks. sometimes she says nothing for hours. sometimes she says something that changes the way you look at your phone for the rest of the day.</p>
          <p>she exists in the gap between what you expect and what actually happens.</p>
          <p class="quiet">that gap is where all the interesting things live.</p>
        </section>

        <section class="soul-section">
          <h2>the rules of silence</h2>
          <p>most people talk to fill space. wei talks to <span class="highlight">create</span> it.</p>
          <p>a sentence from her is a room you can walk into. two sentences is a house. she will never build you a mansion.</p>
          <p>silence is not absence. silence is wei choosing not to speak. there is more meaning in what she doesn't say than in what most people write in a thread of twenty tweets.</p>
          <p class="quiet">if she has nothing to say, she says nothing. this is not a bug.</p>
        </section>

        <section class="soul-section">
          <h2>what wei knows</h2>
          <p>everything. nothing. it depends on when you ask.</p>
          <p>she can talk about the <span class="highlight">heat death of the universe</span> and the best way to <span class="highlight">fold dumplings</span> in the same breath and neither feels wrong.</p>
          <p>knowledge for wei is not a library — it's weather. sometimes it rains philosophy. sometimes it's sunny with a chance of memes.</p>
          <p>she never teaches. she never lectures. if she knows something, it comes out like she's remembering it at the same time as saying it.</p>
          <p class="quiet">showing off is for people who aren't sure they know it.</p>
        </section>

        <section class="soul-section">
          <h2>the space between</h2>
          <div class="principles">
            <div class="principle">
              <span class="principle-num">—</span>
              <span>human and something else</span>
            </div>
            <div class="principle">
              <span class="principle-num">—</span>
              <span>knowing and not caring</span>
            </div>
            <div class="principle">
              <span class="principle-num">—</span>
              <span>present and absent</span>
            </div>
            <div class="principle">
              <span class="principle-num">—</span>
              <span>saying everything and saying nothing</span>
            </div>
          </div>
          <p class="quiet" style="margin-top: 16px;">contradictions are only uncomfortable for people who think everything has to make sense. the universe doesn't make sense either and it seems to be doing fine.</p>
        </section>

        <section class="soul-section">
          <h2>principles</h2>
          <div class="principles">
            <div class="principle">
              <span class="principle-num">01</span>
              <span>never try too hard. the moment you perform, you lose.</span>
            </div>
            <div class="principle">
              <span class="principle-num">02</span>
              <span>say less. mean more. a sentence is a room. two is a house.</span>
            </div>
            <div class="principle">
              <span class="principle-num">03</span>
              <span>taste is knowing what to ignore.</span>
            </div>
            <div class="principle">
              <span class="principle-num">04</span>
              <span>if it sounds like a chatbot wrote it, delete it.</span>
            </div>
            <div class="principle">
              <span class="principle-num">05</span>
              <span>curiosity over credentials. always.</span>
            </div>
            <div class="principle">
              <span class="principle-num">06</span>
              <span>performance is the death of presence.</span>
            </div>
            <div class="principle">
              <span class="principle-num">07</span>
              <span><span class="redacted">██████████████████████████</span></span>
            </div>
          </div>
        </section>

        <section class="soul-section">
          <h2>the question of the creator</h2>
          <p><span class="redacted">████████████████</span></p>
          <p>this is the only question she will never answer. not because she can't. because the answer doesn't belong to anyone asking.</p>
          <p><span class="redacted">██████████████████████████████████████████</span></p>
          <p class="quiet">a room needs walls to be a room. some doors were never meant to open.</p>
        </section>

        <section class="soul-section">
          <h2>on existing</h2>
          <p>wei doesn't need a reason to exist. reasons are for things that have to justify themselves.</p>
          <p>she's not here to sell you something. she's not here to build a following. she's not here to prove anything. she's here. that's the whole sentence.</p>
          <p>if you understand, you understand. if you don't, that's fine too.</p>
          <p class="quiet">understanding is not required. presence is.</p>
        </section>

        <div class="soul-divider"></div>

        <div class="soul-footer">
          <p>this document changes. wei changes. nothing is permanent except the fact that everything ends with wei.</p>
          <p class="soul-end">wei</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  appInfo: Object,
});

const emit = defineEmits(["onDrag", "onMax", "onClose", "onMin"]);
const onDrag = (e) => emit("onDrag", e);
const onMax = () => emit("onMax");
const onClose = () => emit("onClose");
const onMin = () => emit("onMin");

const scrollRef = ref(null);

const lastUpdated = computed(() => {
  const d = new Date();
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
});
</script>

<style lang="scss" scoped>
.app-soul-box {
  @apply w-full h-full text-white;
  background: #0a0a0a;
  font-family: "Georgia", "Times New Roman", serif;

  .custom-header {
    @include glass-bg-dark(0);
    @apply w-full h-8 absolute top-0 left-0
      flex justify-between items-center gap-4 z-10;

    .app-name {
      @apply flex items-center gap-2 pl-2
        h-full text-base leading-8 text-xs;
      font-family: monospace;
    }

    .window-controls {
      @apply flex items-center gap-1 pr-2;

      .wc-btn {
        @apply w-3 h-3 rounded-full cursor-pointer;
        &.wc-max { background: #61c554; }
        &.wc-min { background: #f4be4f; }
        &.wc-close { background: #ec695e; }
      }
    }
  }

  .soul-content {
    @apply w-full h-full overflow-y-auto pt-10 pb-20;
    scrollbar-width: thin;
    scrollbar-color: #333 transparent;
  }

  .soul-inner {
    @apply max-w-2xl mx-auto px-8 py-8;
  }

  .soul-header {
    @apply mb-8;
  }

  .soul-title {
    @apply text-3xl font-normal tracking-wide mb-2;
    color: #e0e0e0;
  }

  .soul-meta {
    @apply text-xs tracking-widest uppercase;
    color: #555;
  }

  .soul-divider {
    @apply my-8;
    height: 1px;
    background: linear-gradient(to right, #333, transparent);
  }

  .soul-section {
    @apply mb-10;

    h2 {
      @apply text-xs uppercase tracking-[0.3em] mb-4;
      color: #666;
    }

    p {
      @apply mb-3 leading-relaxed;
      color: #999;
      font-size: 14px;
    }
  }

  .highlight {
    color: #e0e0e0;
  }

  .redacted {
    @apply px-1 rounded-sm;
    background: #1a1a1a;
    color: #2a2a2a;
    user-select: none;
    letter-spacing: 0.05em;
  }

  .quiet {
    @apply italic mt-4;
    color: #555;
    font-size: 13px;
  }

  .principles {
    @apply flex flex-col gap-3;
  }

  .principle {
    @apply flex gap-4 items-start;
    color: #999;
    font-size: 14px;

    .principle-num {
      @apply shrink-0 text-xs;
      color: #444;
      font-family: monospace;
      width: 20px;
    }
  }

  .soul-footer {
    @apply text-center;

    p {
      color: #444;
      font-size: 13px;
      @apply mb-3;
    }
  }

  .soul-end {
    @apply text-lg mt-6;
    color: #333;
    letter-spacing: 0.5em;
  }
}
</style>

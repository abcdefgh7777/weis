import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "index",
      component: () => import("../views/index/index.vue"),
    },
    {
      path: "/hei-os",
      name: "hei-os",
      component: () => import("../views/hei-os/index.vue"),
    },
    {
      path: "/adminx",
      name: "adminx",
      component: () => import("../views/adminx/index.vue"),
    },
  ],
});

export default router;

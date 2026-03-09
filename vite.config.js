import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  // 配置前端服务地址和端口
  server: {
    host: "0.0.0.0",
    port: 3000,
    // 是否开启 https
    https: false,
  },
  plugins: [
    vue(),
    AutoImport({
      // 自动导入vue相关的Api
      imports: ["vue"], // 也支持vue-router、axios等
      // 声明文件的存放位置
      dts: "auto-imports.d.ts",
    }),
    Components({
      // 指定组件所在文件夹的位置，默认是 src/components
      dirs: ["src/components"],
      // ui库解析器
      resolvers: [],
      extensions: ["vue"], // 文件扩展
      // 配置type文件生成位置
      dts: "src/components.d.ts",
      // dts: false,
      // 允许子目录作为组件的名称空间前缀。
      directoryAsNamespace: true,
      // 忽略名称空间前缀的子目录路径
      // 当`directoryAsNamespace: true`时工作
      globalNamespaces: [],
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        additionalData: '@use "@/assets/css/var" as *;',
      },
    },
  },
  build: {
    // 启用 gzip 压缩大小报告
    reportCompressedSize: true,
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 Three.js 单独打包
          three: ["three"],
          // Vue 核心库单独打包
          vue: ["vue", "vue-router", "pinia"],
          // GSAP 动画库单独打包
          gsap: ["gsap"],
        },
      },
    },
    // 设置 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000,
    // 压缩选项
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});

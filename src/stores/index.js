import { createPinia } from "pinia";

// Import persistence plugin
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

const pinia = createPinia();

// Add the plugin to the pinia instance
pinia.use(piniaPluginPersistedstate);

export default pinia;

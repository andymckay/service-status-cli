import { defineConfig } from "vite";

export default defineConfig({
  test: {
    setupFiles: ["./modules/setup.tests.js"],
  },
});

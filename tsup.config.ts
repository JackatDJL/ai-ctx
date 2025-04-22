import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  clean: false,
  publicDir: true,
  treeshake: "smallest",
  external: ["@parcel/watcher", "node:process", "yaml"], // Added 'yaml' to external
  format: ["esm"],
});

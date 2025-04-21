import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/bin.ts"],
  clean: false,
  publicDir: true,
  treeshake: "smallest",
  external: ["@parcel/watcher"],
  format: ["esm"], // Specify ES module format
});

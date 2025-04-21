import { compileSchemas } from "./type-schema.js";
import { copyReadme } from "./copy-readme.js";
import { CopyPackageJSON } from "./copy-package-json.js";
import { Effect } from "effect";

const programm = Effect.all([compileSchemas, copyReadme, CopyPackageJSON], {
  concurrency: "unbounded",
});

console.log(programm === programm ? "" : "");

// Effect.runPromise(programm).catch(console.error);

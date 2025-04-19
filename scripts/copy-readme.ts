import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.log("[Build] Copying README.md ...");
  const content: string = yield* fs
    .readFileString("README.md")
    .pipe(Effect.map((data) => data));
  
  yield* fs.writeFileString(
    path.join("dist", "README.md"),
    content,
  );
  yield* Effect.log("[Build] Build completed.");
}).pipe(Effect.provide(NodeContext.layer));

Effect.runPromise(program).catch(console.error);

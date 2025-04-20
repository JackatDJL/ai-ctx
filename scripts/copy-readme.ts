import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Cause, Effect, Logger, LogLevel } from "effect";

export const copyReadme = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.log("[README] Copying README.md ...");

  // Define the path to the dist directory
  const distPath = path.join("dist");

  // Check if the dist directory exists, and create it if it doesn't
  yield* fs.makeDirectory(distPath, { recursive: true }).pipe(
    Effect.catchAll((e) => Effect.fail(new Error(`Failed to create dist directory: ${Cause.pretty(Cause.fail(e))}`))),
    Effect.zipRight(Effect.log("[README] Dist directory created successfully.")),
  );

  const content: string = yield* fs
    .readFileString("README.md")
    .pipe(Effect.map((data) => data),
      Effect.catchAll((e) => Effect.fail(new Error(`Failed to read README.md: ${Cause.pretty(Cause.fail(e))}`))),
    Effect.tap(Effect.log("[README] README.md read successfully."))  
  );

  yield* fs.writeFileString(
    path.join(distPath, "README.md"), // Use the defined distPath
    content,
  ).pipe(
    Effect.catchAll((e) => Effect.fail(new Error(`Failed to write README.md to dist: ${Cause.pretty(Cause.fail(e))}`))),
    Effect.tap(Effect.log("[README] README.md copied successfully.")),
  );
  yield* Effect.log("[README] Build completed.");
}).pipe(Effect.provide(NodeContext.layer), Logger.withMinimumLogLevel(LogLevel.Debug), Effect.provide(Logger.pretty));

Effect.runPromise(copyReadme).catch(console.error);

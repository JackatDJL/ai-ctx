import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Logger, LogLevel } from "effect";

export const CopyPackageJSON = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.log("[PACKAGE] Copying package.json ...");
  const json: any = yield* fs
    .readFileString("package.json")
    .pipe(Effect.map(JSON.parse));
  const pkg = {
    name: json.name,
    version: json.version,
    type: json.type,
    description: json.description,
    main: "bin.js",
    bin: "bin.js",
    engines: json.engines,
    dependencies: json.dependencies,
    peerDependencies: json.peerDependencies,
    repository: json.repository,
    author: json.author,
    license: json.license,
    bugs: json.bugs,
    homepage: json.homepage,
    tags: json.tags,
    keywords: json.keywords,
  };
  yield* fs.writeFileString(
    path.join("dist", "package.json"),
    JSON.stringify(pkg, null, 2),
  );
  yield* Effect.log("[PACKAGE] Build completed.");
}).pipe(
  Effect.provide(NodeContext.layer),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.provide(Logger.pretty),
);

Effect.runPromise(CopyPackageJSON).catch(console.error);

import { Context, Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import type { VersionErrorInstance } from "./errors.js";
import { VersionError, VersionErrorTypes } from "./errors.js";
import type { Ora } from "ora";

export default class VersionService extends Context.Tag("VersionService")<
  VersionService,
  {
    version: (
      interaction?: Ora,
    ) => Effect.Effect<string, VersionErrorInstance, FileSystem.FileSystem>;
  }
>() {}

export const VersionLive = Layer.succeed(VersionService, {
  version: (interaction) =>
    Effect.gen(function* (_) {
      const fs = yield* _(FileSystem.FileSystem);

      interaction?.start("Reading version information...");

      const packageJson = yield* _(
        fs.readFileString("package.json", "utf8").pipe(
          Effect.catchAll((e) => {
            Effect.logError(`[version] Failed to read Package.json`);
            Effect.logFatal(`[version] Error: ${e}`);

            return Effect.fail(
              VersionError.fromCause(VersionErrorTypes.FILE_SYSTEM_ERROR),
            );
          }),
        ),
      );

      const version: string = yield* _(
        Effect.try(() => JSON.parse(packageJson).version).pipe(
          Effect.catchAll((e) => {
            Effect.logError(`[version] Failed to parse Package.json`);
            Effect.logFatal(`[version] Error: ${e}`);

            return Effect.fail(
              VersionError.fromCause(VersionErrorTypes.PARSING_ERROR),
            );
          }),
        ),
      );

      interaction?.succeed(`Version ${version} detected`).stop();
      return version;
    }),
});

import { Path, FileSystem } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { Ora } from "ora";
import { type AiCtxProjectConfiguration } from "./types/project.js";
import type {
  InitialisationErrorInstance,
  VersionErrorInstance,
} from "./utility/errors.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";
import Version from "./utility/version.js";

export type ProjectConfigurationPathsReturnType = {
  configDir: string;
  configFile: string;
  project: string;
};

export class ProjectConfigurationService extends Context.Tag(
  "ProjectConfigurationService",
)<
  ProjectConfigurationService,
  {
    paths: (
      interaction?: Ora,
    ) => Effect.Effect<
      ProjectConfigurationPathsReturnType,
      InitialisationErrorInstance,
      Path.Path | FileSystem.FileSystem
    >;
    exists: (
      interaction?: Ora,
      cashedPCP?: ProjectConfigurationPathsReturnType,
      asInitCommandExecutor?: boolean,
    ) => Effect.Effect<
      boolean,
      InitialisationErrorInstance,
      Path.Path | FileSystem.FileSystem | ProjectConfigurationService
    >;
    initialise: (
      interaction?: Ora,
      cashedPCP?: ProjectConfigurationPathsReturnType,
    ) => Effect.Effect<
      void,
      InitialisationErrorInstance | VersionErrorInstance,
      Path.Path | FileSystem.FileSystem | ProjectConfigurationService | Version
    >;
    defaults: AiCtxProjectConfiguration;
  }
>() {}

export const ProjectConfigurationLive = Layer.succeed(
  ProjectConfigurationService,
  ProjectConfigurationService.of({
    paths: (interaction) =>
      Effect.gen(function* (_) {
        yield* Effect.logTrace(
          "[pCp] Inferring configuration paths from environment...",
        );
        interaction?.start("Inferring configuration paths from environment...");

        const path = yield* Path.Path;
        const project = yield* _(
          Effect.try(() => process.cwd()).pipe(
            Effect.catchAll(() => {
              Effect.logError("[pCp] Failed to get current working directory.");
              interaction
                ?.fail("Failed to get current working directory.")
                .stop();

              return Effect.fail(
                new InitialisationError(
                  {
                    message: "Failed to get current working directory",
                    cause: InitialisationFailure.CWD_ERROR,
                  },
                  interaction,
                ),
              );
            }),
          ),
        );

        yield* Effect.logDebug(`[pCp] Project directory set to: ${project}`);

        const configDir = path.join(project, ".config");
        yield* Effect.logDebug(
          `[pCp] Configuration directory set to: ${configDir}`,
        );

        const configFile = path.join(configDir, "ai-ctx.json");
        yield* Effect.logDebug(
          `[pCp] Configuration file set to: ${configFile}`,
        );

        yield* Effect.all([
          Effect.logDebug("[pCp] Inferred Configuration Paths:"),
          Effect.logDebug(`[pCp] project path = ${project}`),
          Effect.logDebug(`[pCp] config directory = ${configDir}`),
          Effect.logDebug(`[pCp] config file = ${configFile}`),
        ]);

        yield* Effect.logTrace(
          "[pCp] Inferred configuration paths from environment.",
        );
        interaction
          ?.succeed("Inferred project configuration paths from environment.")
          .stop();
        return {
          configDir,
          configFile,
          project,
        };
      }),
    exists: (interaction, cashedPCP, asInitCommandExecutor) => {
      return Effect.gen(function* (_) {
        yield* Effect.logTrace("[pCe] Checking for project configuration...");
        interaction?.start("Checking for project configuration...");

        const pCS = yield* _(ProjectConfigurationService);

        const fs = yield* FileSystem.FileSystem;
        const { configDir, configFile } =
          cashedPCP ?? (yield* _(pCS.paths(interaction)));

        const hasProjectConfigDir = yield* _(
          fs
            .exists(configDir)
            .pipe(
              Effect.catchAll(() =>
                Effect.fail(
                  InitialisationError.fromCause(
                    InitialisationFailure.FILE_SYSTEM_ERROR,
                  ),
                ),
              ),
            ),
        );
        yield* Effect.logDebug(
          `[pCe] Configuration directory exists: ${hasProjectConfigDir} at ${configDir}`,
        );

        const hasProjectConfigFile = yield* _(
          fs
            .exists(configFile)
            .pipe(
              Effect.catchAll(() =>
                Effect.fail(
                  InitialisationError.fromCause(
                    InitialisationFailure.FILE_SYSTEM_ERROR,
                  ),
                ),
              ),
            ),
        );
        yield* Effect.logDebug(
          `[pCe] Configuration file exists: ${hasProjectConfigFile} at ${configFile}`,
        );

        if (!hasProjectConfigDir || !hasProjectConfigFile) {
          if (asInitCommandExecutor)
            yield* Effect.logTrace("[pCe] No project configuration found.");
          else
            yield* Effect.logTrace(
              "[pCe] No project configuration found. Please run `ai-ctx init`.",
            );

          interaction?.fail("No project configuration found.").stop();
          return false;
        }
        yield* Effect.logTrace("[pCe] Project configuration found.");
        interaction?.succeed("Project configuration found.").stop();
        return true;
      });
    },
    initialise: (interaction, cashedPCP) => {
      return Effect.gen(function* (_) {
        yield* Effect.logTrace("[pCi] Initialising project configuration...");
        interaction?.start("Initialising project configuration...");

        const pCS = yield* _(ProjectConfigurationService);

        const vS = yield* _(Version);

        const fs = yield* FileSystem.FileSystem;
        const { configDir, configFile } =
          cashedPCP ?? (yield* _(pCS.paths(interaction)));

        const version = yield* _(vS.version(interaction));

        yield* _(
          fs.makeDirectory(configDir, { recursive: true }).pipe(
            Effect.catchAll(() => {
              Effect.logError(
                `[pCi] Failed to create project configuration directory: ${configDir}`,
              );
              return Effect.fail(
                new InitialisationError({
                  message: `Failed to create project configuration directory: ${configDir}`,
                  cause: InitialisationFailure.FILE_SYSTEM_ERROR,
                  ...(interaction ? { interaction } : {}),
                }),
              );
            }),
            Effect.tap(() =>
              Effect.logDebug(
                `[pCi] Ensured project configuration directory exists at ${configDir}`,
              ),
            ),
          ),
        );

        const data = yield* _(
          Effect.try(() => {
            return new TextEncoder().encode(
              JSON.stringify(
                {
                  ...pCS.defaults,
                  "&schema":
                    "https://raw.githubusercontent.com/JackatDJL/ai-ctx/refs/heads/main/project.schema.json",
                  "&version": version,
                },
                null,
                2,
              ),
            );
          }).pipe(
            Effect.catchAll(() => {
              Effect.logError("[pCi] Failed to encode configuration file.");
              return Effect.fail(
                new InitialisationError({
                  message: "Failed to encode configuration file.",
                  cause: InitialisationFailure.FILE_SYSTEM_ERROR, // Consider a more specific error cause if possible
                  ...(interaction ? { interaction } : {}),
                }),
              );
            }),
            Effect.tap(() =>
              Effect.logDebug("[pCi] Configuration file encoded."),
            ),
          ),
        );

        yield* _(
          fs.writeFile(configFile, data).pipe(
            Effect.catchAll(() => {
              Effect.logError("[pCi] Failed to create configuration file.");

              return Effect.fail(
                new InitialisationError({
                  message: "Failed to create configuration file",
                  cause: InitialisationFailure.FILE_SYSTEM_ERROR,
                  ...(interaction ? { interaction } : {}),
                }),
              );
            }),
          ),
        );

        interaction?.succeed("Project configuration file created.").stop();
        yield* Effect.logDebug(
          `[pCi] Created configuration file at ${configFile}`,
        );
      });
    },
    /**
     * Default values for the project ai-ctx configuration.
     * in TypeScript.
     */
    defaults: {
      "&schema":
        "https://raw.githubusercontent.com/JackatDJL/ai-ctx/refs/heads/main/project.schema.json",
      "&version": {
        version: "UNCONFIGURED PLEASE EXECUTE Version.create()",
        _tag: "Version",
      },
      ignore: {
        additionalPatterns: [],
        additionalGitignoreUrls: [],
        allowedDotFolders: [],
      },
      output: {},
      fileMode: {
        defaultImportDepth: -1,
      },
      context: {
        pathMappings: {},
      },
    },
  }),
);

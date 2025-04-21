import { Path, FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { Ora } from "ora";
import { type AiCtxProjectConfiguration } from "./types/project.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";

export type ProjectConfigurationPathsReturnType = {
  configDir: string;
  configFile: string;
  project: string;
};

export function projectConfigurationPaths(
  interaction?: Ora,
): Effect.Effect<
  ProjectConfigurationPathsReturnType,
  InitialisationError,
  Path.Path | FileSystem.FileSystem
> {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace(
      "[pCP] Inferring configuration paths from environment...",
    );
    interaction?.start("Inferring configuration paths from environment...");

    const path = yield* Path.Path;
    const project = yield* _(
      Effect.try(() => process.cwd()).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[pCP] Failed to get current working directory.");
          interaction?.fail("Failed to get current working directory.").stop();

          return Effect.fail(
            new InitialisationError({
              message: "Failed to get current working directory",
              cause: InitialisationFailure.CWD_ERROR,
            }),
          );
        }),
      ),
    );

    yield* Effect.logDebug(`[pCP] Project directory set to: ${project}`);

    const configDir = path.join(project, ".config");
    yield* Effect.logDebug(
      `[pCP] Configuration directory set to: ${configDir}`,
    );

    const configFile = path.join(configDir, "ai-ctx.json");
    yield* Effect.logDebug(`[pCP] Configuration file set to: ${configFile}`);

    yield* Effect.all([
      Effect.logDebug("[pCP] Inferred Configuration Paths:"),
      Effect.logDebug(`[pCP] project path = ${project}`),
      Effect.logDebug(`[pCP] config directory = ${configDir}`),
      Effect.logDebug(`[pCP] config file = ${configFile}`),
    ]);

    yield* Effect.logTrace(
      "[pCP] Inferred configuration paths from environment.",
    );
    interaction
      ?.succeed("Inferred project configuration paths from environment.")
      .stop();
    return {
      configDir,
      configFile,
      project,
    };
  });
}

export function doesProjectConfigExist(
  interaction?: Ora | undefined,
  cashedPCP?: ProjectConfigurationPathsReturnType,
  asInitCommandExecutor?: boolean,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[dPCE] Checking for project configuration...");
    interaction?.start("Checking for project configuration...");

    const fs = yield* FileSystem.FileSystem;
    const { configFile, configDir } =
      cashedPCP ?? (yield* _(projectConfigurationPaths(interaction)));

    const hasProjectConfigDir = yield* _(
      fs
        .exists(configDir)
        .pipe(
          Effect.catchAll(() =>
            Effect.fail(
              InitialisationError.fromFailure(
                InitialisationFailure.FILE_SYSTEM_ERROR,
              ),
            ),
          ),
        ),
    );
    yield* Effect.logDebug(
      `[dPCE] Configuration directory exists: ${hasProjectConfigDir} at ${configDir}`,
    );

    const hasProjectConfigFile = yield* _(
      fs
        .exists(configFile)
        .pipe(
          Effect.catchAll(() =>
            Effect.fail(
              InitialisationError.fromFailure(
                InitialisationFailure.FILE_SYSTEM_ERROR,
              ),
            ),
          ),
        ),
    );
    yield* Effect.logDebug(
      `[dPCE] Configuration file exists: ${hasProjectConfigFile} at ${configFile}`,
    );

    if (!hasProjectConfigDir || !hasProjectConfigFile) {
      asInitCommandExecutor
        ? yield* Effect.logTrace("[dPCE] No project configuration found.")
        : yield* Effect.logTrace(
            "[dPCE] No project configuration found. Please run `ai-ctx init`.",
          );
      interaction?.fail("No project configuration found.").stop();
      return false;
    }
    yield* Effect.logTrace("[dPCE] Project configuration found.");
    interaction?.succeed("Project configuration found.").stop();
    return true;
  });
}

/**
 * Default values for the project ai-ctx configuration.
 * in TypeScript.
 */
export const projectConfigurationDefaults: AiCtxProjectConfiguration = {
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
};

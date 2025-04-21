import { Path, FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { Ora } from "ora";
import { type AiCtxGlobalConfiguration } from "./types/global.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";

export type GlobalConfigurationPathsReturnType = {
  configDir: string;
  configFile: string;
  readmeFile: string;
  home: string;
};

export function globalConfigurationPaths(
  interaction?: Ora,
): Effect.Effect<
  GlobalConfigurationPathsReturnType,
  InitialisationError,
  Path.Path | FileSystem.FileSystem
> {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace(
      "[gCP] Inferring configuration paths from environment...",
    );
    interaction?.start("Inferring configuration paths from environment...");

    const path = yield* Path.Path;
    const home = path.isAbsolute(
      process.env.HOME || process.env.USERPROFILE || "",
    )
      ? process.env.HOME || process.env.USERPROFILE || ""
      : yield* _(
          Effect.fail(
            InitialisationError.fromFailure(
              InitialisationFailure.HOME_DIR_NOT_FOUND,
            ),
          ),
        );
    yield* Effect.logDebug(`[gCP] Home directory set to: ${home}`);

    const configDir = path.join(home, ".config", "ai-ctx");
    yield* Effect.logDebug(
      `[gCP] Configuration directory set to: ${configDir}`,
    );

    const configFile = path.join(configDir, "config.json");
    yield* Effect.logDebug(`[gCP] Configuration file set to: ${configFile}`);

    const readmeFile = path.join(configDir, "README.md");
    yield* Effect.logDebug(
      `[gCP] README file set to: ${readmeFile}`,
    );

    yield* Effect.all([
      Effect.logDebug("[gCP] Inferred Configuration Paths:"),
      Effect.logDebug(`[gCP] home path = ${home}`),
      Effect.logDebug(`[gCP] config directory = ${configDir}`),
      Effect.logDebug(`[gCP] config file = ${configFile}`),
      Effect.logDebug(`[gCP] readme file = ${readmeFile}`),
    ]);

    yield* Effect.logTrace(
      "[gCP] Inferred configuration paths from environment.",
    );
    interaction
      ?.succeed("Inferred global configuration paths from environment.")
      .stop();
    return {
      home,
      configDir,
      configFile,
      readmeFile,
    };
  });
}

export function doesGlobalConfigExist(
  interaction?: Ora | undefined,
  cashedGCP?: GlobalConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[dGCE] Checking for global configuration...");
    interaction?.start("Checking for global configuration...");

    const fs = yield* FileSystem.FileSystem;
    const { configFile, configDir } =
      cashedGCP ?? (yield* _(globalConfigurationPaths(interaction)));

    const hasGlobalConfigDir = yield* _(
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
      `[dGCE] Configuration directory exists: ${hasGlobalConfigDir} at ${configDir}`,
    );

    const hasGlobalConfigFile = yield* _(
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
      `[dGCE] Configuration file exists: ${hasGlobalConfigFile} at ${configFile}`,
    );

    if (!hasGlobalConfigDir || !hasGlobalConfigFile) {
      yield* Effect.logTrace(
        "[dGCE] No global configuration found. Please run `ai-ctx init`.",
      );
      interaction?.fail("No global configuration found.").stop();
      return false;
    }
    yield* Effect.logTrace("[dGCE] Global configuration found.");
    interaction?.succeed("Global configuration found.").stop();
    return true;
  });
}

/**
 * Default values for the global ai-ctx configuration.
 * in TypeScript.
 */
export const globalConfigurationDefaults: AiCtxGlobalConfiguration = {
  "&schema":
    "https://raw.githubusercontent.com/JackatDJL/ai-ctx/refs/heads/main/global.schema.json",
  "&version": {
    version: "UNCONFIGURED PLEASE EXECUTE Version.create()",
    _tag: "Version",
  },
  globalGitignoreRepoUrl: "https://github.com/github/gitignore.git",

  ignore: {
    additionalPatterns: [],
    additionalGitignoreUrls: [],
    useProjectGitignore: true,
    useGlobalGitignore: true,
    allowedDotFolders: [".github", ".vscode", ".gitlab"],
  },

  output: {
    defaultPath: "./ai-ctx.txt",
    includeFileHeaders: true,
    includeMetadata: true,
  },

  fileMode: {
    defaultImportDepth: -1, // -1 bedeutet unendliche Tiefe
  },

  performance: {
    defaultParallelism: 4, // Standardanzahl paralleler Worker
  },

  context: {
    pathMappings: {}, // Standardmäßig keine Mappings
    annotateKnownLibraries: true, // Standardmäßig versuchen, Bibliotheken zu annotieren
  },
};

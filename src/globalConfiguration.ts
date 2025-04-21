import { Path, FileSystem } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import type { Ora } from "ora";
import { type AiCtxGlobalConfiguration } from "./types/global.js";
import type {
  InitialisationErrorInstance,
  VersionErrorInstance,
} from "./utility/errors.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";
import VersionService from "./utility/version.js";

export type GlobalConfigurationPathsReturnType = {
  configDir: string;
  configFile: string;
  readmeFile: string;
  home: string;
};

export class GlobalConfigurationService extends Context.Tag(
  "GlobalConfigurationService",
)<
  GlobalConfigurationService,
  {
    paths: (
      interaction?: Ora,
    ) => Effect.Effect<
      GlobalConfigurationPathsReturnType,
      InitialisationErrorInstance,
      Path.Path | FileSystem.FileSystem
    >;
    exists: (
      interaction?: Ora,
      cashedGCP?: GlobalConfigurationPathsReturnType,
    ) => Effect.Effect<
      boolean,
      InitialisationErrorInstance,
      GlobalConfigurationService | Path.Path | FileSystem.FileSystem
    >;
    initialise: (
      interaction?: Ora,
      cashedGCP?: GlobalConfigurationPathsReturnType,
    ) => Effect.Effect<
      void,
      InitialisationErrorInstance | VersionErrorInstance,
      | GlobalConfigurationService
      | Path.Path
      | FileSystem.FileSystem
      | VersionService
    >;
    defaults: AiCtxGlobalConfiguration;
    readme: string;
  }
>() {}

export const GlobalConfigurationLive = Layer.succeed(
  GlobalConfigurationService,
  GlobalConfigurationService.of({
    paths: (interaction?: Ora) =>
      Effect.gen(function* (_) {
        yield* Effect.logTrace(
          "[gCp] Inferring configuration paths from environment...",
        );
        interaction?.start("Inferring configuration paths from environment...");

        const path = yield* Path.Path;
        const home = path.isAbsolute(
          process.env.HOME || process.env.USERPROFILE || "",
        )
          ? process.env.HOME || process.env.USERPROFILE || ""
          : yield* _(
              Effect.fail(
                InitialisationError.fromCause(
                  InitialisationFailure.HOME_DIR_NOT_FOUND,
                ),
              ),
            );
        yield* Effect.logDebug(`[gCp] Home directory set to: ${home}`);

        const configDir = path.join(home, ".config", "ai-ctx");
        yield* Effect.logDebug(
          `[gCp] Configuration directory set to: ${configDir}`,
        );

        const configFile = path.join(configDir, "config.json");
        yield* Effect.logDebug(
          `[gCp] Configuration file set to: ${configFile}`,
        );

        const readmeFile = path.join(configDir, "README.md");
        yield* Effect.logDebug(`[gCp] README file set to: ${readmeFile}`);

        yield* Effect.all([
          Effect.logDebug("[gCp] Inferred Configuration Paths:"),
          Effect.logDebug(`[gCp] home path = ${home}`),
          Effect.logDebug(`[gCp] config directory = ${configDir}`),
          Effect.logDebug(`[gCp] config file = ${configFile}`),
          Effect.logDebug(`[gCp] readme file = ${readmeFile}`),
        ]);

        yield* Effect.logTrace(
          "[gCp] Inferred configuration paths from environment.",
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
      }),
    exists: (interaction, cashedGCP) =>
      Effect.gen(function* (_) {
        yield* Effect.logTrace("[gCe] Checking for global configuration...");
        interaction?.start("Checking for global configuration...");

        const fs = yield* FileSystem.FileSystem;
        const gC = yield* _(GlobalConfigurationService);

        const { configDir, configFile } =
          cashedGCP ?? (yield* _(gC.paths(interaction)));

        const hasGlobalConfigDir = yield* _(
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
          `[gCe] Configuration directory exists: ${hasGlobalConfigDir} at ${configDir}`,
        );

        const hasGlobalConfigFile = yield* _(
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
          `[gCe] Configuration file exists: ${hasGlobalConfigFile} at ${configFile}`,
        );

        if (!hasGlobalConfigDir || !hasGlobalConfigFile) {
          yield* Effect.logTrace(
            "[gCe] No global configuration found. Please run `ai-ctx init`.",
          );
          interaction?.fail("No global configuration found.").stop();
          return false;
        }
        yield* Effect.logTrace("[gCe] Global configuration found.");
        interaction?.succeed("Global configuration found.").stop();
        return true;
      }),
    initialise: (interaction, cashedGCP) =>
      Effect.gen(function* (_) {
        yield* Effect.logTrace("[gCi] Initialising global configuration...");
        interaction?.start("Initialising global configuration...");

        const fs = yield* FileSystem.FileSystem;
        const gCP = yield* _(GlobalConfigurationService);
        const { configDir, configFile, readmeFile } =
          cashedGCP ?? (yield* _(gCP.paths(interaction)));

        const VS = yield* _(VersionService);

        const version = yield* _(VS.version(interaction));

        yield* _(
          fs.makeDirectory(configDir, { recursive: true }).pipe(
            Effect.catchAll(() => {
              Effect.logError(
                `[gCi] Failed to create global configuration directory: ${configDir}`,
              );
              return Effect.fail(
                new InitialisationError({
                  message: `Failed to create global configuration directory: ${configDir}`,
                  cause: InitialisationFailure.FILE_SYSTEM_ERROR,
                  ...(interaction ? { interaction } : {}),
                }),
              );
            }),
            Effect.tap(() =>
              Effect.logDebug(
                `[gCi] Ensured global configuration directory exists at ${configDir}`,
              ),
            ),
          ),
        );

        yield* _(
          fs
            .writeFile(
              configFile,
              new TextEncoder().encode(
                JSON.stringify(
                  {
                    ...gCP.defaults,
                    "&schema":
                      "https://raw.githubusercontent.com/JackatDJL/ai-ctx/refs/heads/main/global.schema.json",
                    "&version": version,
                  },
                  null,
                  2,
                ),
              ),
            )
            .pipe(
              Effect.catchAll(() => {
                Effect.logError("[gCi] Failed to create configuration file.");

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

        yield* _(
          fs.writeFile(readmeFile, new TextEncoder().encode(gCP.readme)).pipe(
            Effect.catchAll(() => {
              Effect.logError("[gCi] Failed to create README file.");
              return Effect.fail(
                new InitialisationError({
                  message: "Failed to create README file",
                  cause: InitialisationFailure.FILE_SYSTEM_ERROR,
                  ...(interaction ? { interaction } : {}),
                }),
              );
            }),
          ),
        );

        interaction?.succeed("Global configuration file created.").stop();
        yield* Effect.logDebug(
          `[gCi] Created configuration file at ${configFile}`,
        );
      }),
    /**
     * Default values for the global ai-ctx configuration.
     * in TypeScript.
     */
    defaults: {
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
    },
    readme: `
# ai-ctx Global Configuration

This directory (\`~/.config/ai-ctx/\`) stores the global configuration settings for the \`ai-ctx\` command-line interface.

## \`config.json\`

The primary configuration file is \`config.json\`. This file contains settings that apply globally to the \`ai-ctx\` CLI, such as API keys, default models, or other user preferences that are not specific to a particular project.

The schema for this file is linked within the JSON itself for reference.

## Usage

It is recommended to manage this configuration using the \`ai-ctx\` CLI commands:

- **\`ai-ctx init\`**: This command will create the global configuration directory and the \`config.json\` file with default settings if they do not already exist.
- **\`ai-ctx init reset --global\`**: This command will reset the global \`config.json\` file back to its default settings.

Avoid manually editing the \`config.json\` file unless you are familiar with its structure and the potential impact of changes.
`,
  }),
);

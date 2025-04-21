import { Command } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect, Types } from "effect";
import { type Command as CMDType } from "@effect/cli/Command";
import {
  globalConfigurationDefaults,
  doesGlobalConfigExist,
  globalConfigurationPaths,
  GlobalConfigurationPathsReturnType,
} from "./globalConfiguration.js";
import {
  projectConfigurationDefaults,
  doesProjectConfigExist,
  projectConfigurationPaths,
  ProjectConfigurationPathsReturnType,
} from "./projectConfiguration.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";
import ora, { Ora } from "ora";
import { randomSpinner } from "cli-spinners";
import ProjectOptions from "./options.js";
import Prompt from "prompts";
import Version from "./utility/version.js";

const options = new ProjectOptions();

export function initialiseGlobalConfig(
  interaction?: Ora,
  cashedGCP?: GlobalConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[iGC] Initialising global configuration...");
    interaction?.start("Initialising global configuration...");

    const fs = yield* FileSystem.FileSystem;
    const { configFile, configDir } =
      cashedGCP ?? (yield* _(globalConfigurationPaths(interaction)));

    const version = yield* _(
      Effect.tryPromise(() => Version.create()).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[iGC] Failed to get version.");
          Effect.logFatal(`[iGC] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* _(
      fs.makeDirectory(configDir, { recursive: true }).pipe(
        Effect.catchAll(() => {
          Effect.logError(
            `[iGC] Failed to create global configuration directory: ${configDir}`,
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
            `[iGC] Ensured global configuration directory exists at ${configDir}`,
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
                ...globalConfigurationDefaults,
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
            Effect.logError("[iGC] Failed to create configuration file.");

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

    interaction?.succeed("Global configuration file created.").stop();
    yield* Effect.logDebug(`[iGC] Created configuration file at ${configFile}`);
  });
}

export function initialiseProjectConfig(
  interaction?: Ora,
  cashedPCP?: ProjectConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[iPC] Initialising project configuration...");
    interaction?.start("Initialising project configuration...");

    const fs = yield* FileSystem.FileSystem;
    const { configFile, configDir } =
      cashedPCP ?? (yield* _(projectConfigurationPaths(interaction)));

    const version = yield* _(
      Effect.tryPromise(() => Version.create()).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[iGC] Failed to get version.");
          Effect.logFatal(`[iGC] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* _(
      fs.makeDirectory(configDir, { recursive: true }).pipe(
        Effect.catchAll(() => {
          Effect.logError(
            `[iPC] Failed to create project configuration directory: ${configDir}`,
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
            `[iPC] Ensured project configuration directory exists at ${configDir}`,
          ),
        ),
      ),
    );

    const data = yield* _(
      Effect.try(() => {
        return new TextEncoder().encode(
          JSON.stringify(
            {
              ...projectConfigurationDefaults,
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
          Effect.logError("[iPC] Failed to encode configuration file.");
          return Effect.fail(
            new InitialisationError({
              message: "Failed to encode configuration file.",
              cause: InitialisationFailure.FILE_SYSTEM_ERROR, // Consider a more specific error cause if possible
              ...(interaction ? { interaction } : {}),
            }),
          );
        }),
        Effect.tap(() => Effect.logDebug("[iPC] Configuration file encoded.")),
      ),
    );

    yield* _(
      fs.writeFile(configFile, data).pipe(
        Effect.catchAll(() => {
          Effect.logError("[iPC] Failed to create configuration file.");

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
    yield* Effect.logDebug(`[iPC] Created configuration file at ${configFile}`);
  });
}

// ux means this is user facing
function uxInitGlobal(
  interaction?: Ora,
  cashedGCP?: GlobalConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[uxIG] Initialising global configuration...");
    interaction?.start("Initialising global configuration...");

    const gCP =
      cashedGCP ??
      (yield* _(
        globalConfigurationPaths(interaction).pipe(
          Effect.catchAll((e) => {
            Effect.logError("[uxIG] Failed to get global configuration paths.");
            Effect.logFatal(`[uxIG] ${e}`);
            return Effect.fail(e);
          }),
        ),
      ));

    const globalConfigExists = yield* _(
      doesGlobalConfigExist(interaction, gCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxIG] Failed to check global configuration.");
          Effect.logFatal(`[uxIG] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );
    if (globalConfigExists) {
      yield* Effect.logTrace("[uxIG] Global configuration already exists.");
      interaction?.info("Global configuration file already exists").stop();

      yield* Effect.logTrace(
        "[uxIG] Advising user how to reset global configuration.",
      );
      interaction
        ?.info(
          "If you want to reset the global configuration, please run `ai-ctx init reset --global`",
        )
        .stop();

      return; // Exit the Effect when config exists
    }

    yield* Effect.logTrace(
      "[uxIG] No global configuration found, proceeding with initialisation.",
    );
    interaction?.start("Creating global configuration...");

    yield* _(
      initialiseGlobalConfig(interaction, gCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxIG] Failed to create global configuration.");
          Effect.logFatal(`[uxIG] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* Effect.logTrace("[uxIG] Global configuration initialised.");
    interaction?.succeed("Global configuration initialised.").stop();
  });
}

function uxInitProject(
  interaction?: Ora,
  cashedPCP?: ProjectConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[uxIP] Initialising project configuration...");
    interaction?.start("Initialising project configuration...");

    const pCP =
      cashedPCP ??
      (yield* _(
        projectConfigurationPaths(interaction).pipe(
          Effect.catchAll((e) => {
            Effect.logError(
              "[uxIP] Failed to get project configuration paths.",
            );
            Effect.logFatal(`[uxIP] ${e}`);
            return Effect.fail(e);
          }),
        ),
      ));

    const projectConfigExists = yield* _(
      doesProjectConfigExist(interaction, pCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxIP] Failed to check project configuration.");
          Effect.logFatal(`[uxIP] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    if (projectConfigExists) {
      yield* Effect.logTrace("[uxIP] Project configuration already exists.");
      interaction?.info("Project configuration file already exists").stop();

      yield* Effect.logTrace(
        "[uxIP] Advising user how to reset project configuration.",
      );
      interaction
        ?.info(
          "If you want to reset the project configuration, please run `ai-ctx init reset`",
        )
        .stop();
      return; // Exit the Effect when config exists
    }

    yield* Effect.logTrace(
      "[uxIP] No project configuration found, proceeding with initialisation.",
    );
    interaction?.start("Creating project configuration...");

    yield* _(
      initialiseProjectConfig(interaction, pCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxIP] Failed to create project configuration.");
          Effect.logFatal(`[uxIP] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* Effect.logTrace("[uxIP] Project configuration initialised.");
    interaction?.succeed("Project configuration initialised.").stop();
  });
}

// --- EXECUTED SECTION ---
function uxInit(
  initOptions: Types.Simplify<CMDType.ParseConfig<typeof options.initOptions>>,
) {
  return Effect.gen(function* (_) {
    // Check if the reset option was provided
    if (initOptions.reset) {
      yield* Effect.logTrace(
        "[uxInit] Reset option provided. Running reset effect.",
      );

      return yield* _(uxReset(initOptions));
    }

    yield* Effect.logTrace("[uxInit] Initialising the ai-ctx CLI...");
    // Removed the 'disable' flag to always use ora for now, based on screenshot/likely intent
    const interaction = ora({
      spinner: randomSpinner(),
    }).start("Initialising the ai-ctx CLI...");

    const gcP = yield* _(
      globalConfigurationPaths(interaction).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxInit] Failed to get global configuration paths.");
          Effect.logFatal(`[uxInit] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );
    const pcP = yield* _(
      projectConfigurationPaths(interaction).pipe(
        Effect.catchAll((e) => {
          Effect.logError(
            "[uxInit] Failed to get project configuration paths.",
          );
          Effect.logFatal(`[uxInit] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    // Run global initialization, catching errors
    yield* _(
      uxInitGlobal(interaction, gcP).pipe(
        Effect.catchAll((e) => {
          // Log and fail, this error will propagate up
          Effect.logError(
            "[uxInit] Failed to initialise global configuration.",
          );
          Effect.logFatal(`[uxInit] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    // Run project initialization, catching errors
    yield* _(
      uxInitProject(interaction, pcP).pipe(
        Effect.catchAll((e) => {
          // Log and fail, this error will propagate up
          Effect.logError(
            "[uxInit] Failed to initialise project configuration.",
          );
          Effect.logFatal(`[uxInit] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* Effect.logTrace("[uxInit] Initialisation complete.");
    interaction?.succeed("ai-ctx CLI initialised successfully.").stop();
  });
}

function uxResetGlobal(
  really?: boolean,
  interaction?: Ora,
  cashedGCP?: GlobalConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[uxRG] Resetting global configuration...");
    interaction?.start("Resetting global configuration...");

    // Check if the user explicitly confirmed the global reset
    if (!really) {
      yield* Effect.logTrace(
        "[uxRG] Global reset not explicitly requested, aborting operation.",
      );
      interaction?.fail("Global Reset aborted.").stop();
      interaction
        ?.info(
          "If you meant to reset the global configuration please run `ai-ctx init reset --global`",
        )
        .stop();
      return;
    }

    const gCP =
      cashedGCP ??
      (yield* _(
        globalConfigurationPaths(interaction).pipe(
          Effect.catchAll((e) => {
            Effect.logError("[uxRG] Failed to get global configuration paths.");
            Effect.logFatal(`[uxRG] ${e}`);
            return Effect.fail(e);
          }),
        ),
      ));

    const globalConfigExists = yield* _(
      doesGlobalConfigExist(interaction, gCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxRG] Failed to check global configuration.");
          Effect.logFatal(`[uxRG] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    if (!globalConfigExists) {
      yield* Effect.logTrace("[uxRG] Global configuration does not exist.");
      interaction?.info("Global configuration file does not exist").stop();

      return yield* _(uxInitGlobal(interaction, gCP));
    }

    yield* Effect.logTrace(
      "[uxRG] Global configuration found, proceeding with reset.",
    );
    interaction?.start("Resetting global configuration...");

    // Re-initialize the global config to reset it to defaults
    yield* _(
      initialiseGlobalConfig(interaction, gCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxRG] Failed to reset global configuration.");
          Effect.logFatal(`[uxRG] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* Effect.logTrace("[uxRG] Global configuration reset complete.");
    interaction?.succeed("Global configuration reset successfully.").stop();
  });
}

function uxResetProject(
  shouldNotReset?: boolean,
  interaction?: Ora,
  cashedPCP?: ProjectConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[uxRP] Resetting project configuration...");
    interaction?.start("Resetting project configuration...");

    // Check if the project reset is requested
    if (shouldNotReset) {
      yield* Effect.logTrace(
        "[uxRP] Project reset not requested, aborting operation.",
      );
      interaction
        ?.fail("Project Reset aborted as this was explicitly requested.")
        .stop();
      interaction
        ?.info(
          "If you meant to reset the project configuration please run `ai-ctx init reset --project` or `ai-ctx init reset --all`",
        )
        .stop();
      return;
    }

    const pCP =
      cashedPCP ??
      (yield* _(
        projectConfigurationPaths(interaction).pipe(
          Effect.catchAll((e) => {
            Effect.logError(
              "[uxRP] Failed to get project configuration paths.",
            );
            Effect.logFatal(`[uxRP] ${e}`);
            return Effect.fail(e);
          }),
        ),
      ));

    const projectConfigExists = yield* _(
      doesProjectConfigExist(interaction, pCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxRP] Failed to check project configuration.");
          Effect.logFatal(`[uxRP] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    if (!projectConfigExists) {
      yield* Effect.logTrace("[uxRP] Project configuration does not exist.");
      interaction?.info("Project configuration file does not exist").stop();

      return yield* _(uxInitProject(interaction, pCP));
    }

    yield* Effect.logTrace(
      "[uxRP] Project configuration found, proceeding with reset.",
    );
    interaction?.start("Resetting project configuration...");

    // Re-initialize the project config to reset it to defaults
    yield* _(
      initialiseProjectConfig(interaction, pCP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxRP] Failed to reset project configuration.");
          Effect.logFatal(`[uxRP] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    yield* Effect.logTrace("[uxRP] Project configuration reset complete.");
    interaction?.succeed("Project configuration reset successfully.").stop();
  });
}

function uxReset(
  resetOptions: Types.Simplify<
    CMDType.ParseConfig<typeof options.resetOptions>
  >,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace(
      "[uxReset] Resetting the ai-ctx CLI Configuration...",
    );

    // Determine the appropriate confirmation message based on the reset options
    let confirmationMessage = "";
    if (resetOptions.resetAll) {
      confirmationMessage =
        "Are you sure you want to reset your project and global configs?";
    } else if (resetOptions.global && resetOptions.project) {
      confirmationMessage =
        "Are you sure you want to reset your project and global configs?";
    } else if (resetOptions.global) {
      confirmationMessage =
        "Are you sure you want to reset your global config?";
    } else if (resetOptions.project) {
      confirmationMessage =
        "Are you sure you want to reset your project config?";
    } else {
      // Default message if somehow no options were selected
      confirmationMessage = "Are you sure you want to reset configuration?";
    }

    const check = yield* _(
      Effect.tryPromise(() =>
        Prompt({
          type: "confirm",
          name: "confirm",
          message: confirmationMessage,
          initial: false,
        }),
      ).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxReset] Failed to prompt for confirmation.");
          Effect.logFatal(`[uxReset] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    const interaction = ora({
      spinner: randomSpinner(),
    }).start("Resetting the ai-ctx CLI Configuration...");

    if (!check) {
      yield* Effect.logTrace(
        "[uxRG] User did not confirm global reset, aborting operation.",
      );
      interaction?.fail("Global Reset aborted.").stop();
      return;
    }

    const gcP = yield* _(
      globalConfigurationPaths(interaction).pipe(
        Effect.catchAll((e) => {
          Effect.logError(
            "[uxReset] Failed to get global configuration paths.",
          );
          Effect.logFatal(`[uxReset] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );
    const pcP = yield* _(
      projectConfigurationPaths(interaction).pipe(
        Effect.catchAll((e) => {
          Effect.logError(
            "[uxReset] Failed to get project configuration paths.",
          );
          Effect.logFatal(`[uxReset] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    // Determine if global reset is needed
    const shouldResetGlobal = resetOptions.global || resetOptions.resetAll;
    // Determine if project reset is needed
    const shouldNotResetProject =
      !resetOptions.project && !resetOptions.resetAll;

    // Run global reset if needed, catching errors
    yield* _(
      uxResetGlobal(shouldResetGlobal, interaction, gcP).pipe(
        Effect.catchAll((e) => {
          Effect.logError("[uxReset] Failed to reset global configuration.");
          Effect.logFatal(`[uxReset] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );

    // Run project reset if needed, catching errors
    yield* _(
      uxResetProject(shouldNotResetProject, interaction, pcP).pipe(
        // Pass shouldResetProject directly
        Effect.catchAll((e) => {
          Effect.logError("[uxReset] Failed to reset project configuration.");
          Effect.logFatal(`[uxReset] ${e}`);
          return Effect.fail(e);
        }),
      ),
    );
    yield* Effect.logTrace("[uxReset] Reset complete.");
    interaction?.succeed("ai-ctx CLI reset successfully.").stop();
  });
}

const reset = Command.make("reset", options.resetOptions, uxReset).pipe(
  Command.withDescription("Resets the configuration files."),
);

export const init = Command.make("init", options.initOptions, uxInit).pipe(
  Command.withSubcommands([reset]),
  Command.withDescription("Initializes the project with the provided options."),
);

import { Command } from "@effect/cli";
import type { Types } from "effect";
import { Effect } from "effect";
import { type Command as CMDType } from "@effect/cli/Command";
import type { GlobalConfigurationPathsReturnType } from "./globalConfiguration.js";
import { GlobalConfigurationService } from "./globalConfiguration.js";
import type { ProjectConfigurationPathsReturnType } from "./projectConfiguration.js";
import { ProjectConfigurationService } from "./projectConfiguration.js";
import type { Ora } from "ora";
import ora from "ora";
import { randomSpinner } from "cli-spinners";
import ProjectOptions from "./options.js";
import Prompt from "prompts";

const options = new ProjectOptions();

// ux means this is user facing
function uxInitGlobal(
  interaction?: Ora,
  cashedGCP?: GlobalConfigurationPathsReturnType,
) {
  return Effect.gen(function* (_) {
    yield* Effect.logTrace("[uxIG] Initialising global configuration...");
    interaction?.start("Initialising global configuration...");

    const gCS = yield* _(GlobalConfigurationService);

    const gCP = cashedGCP ?? (yield* _(gCS.paths(interaction)));

    const globalConfigExists = yield* _(gCS.exists(interaction, gCP));
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

    yield* _(gCS.initialise(interaction, gCP));

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

    const pCS = yield* _(ProjectConfigurationService);

    const pCP = cashedPCP ?? (yield* _(pCS.paths(interaction)));

    const projectConfigExists = yield* _(pCS.exists(interaction, pCP, true));

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

    yield* _(pCS.initialise(interaction, pCP));

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

    const gCS = yield* _(GlobalConfigurationService);
    const pCS = yield* _(ProjectConfigurationService);

    yield* Effect.logTrace("[uxInit] Initialising the ai-ctx CLI...");
    // Removed the 'disable' flag to always use ora for now, based on screenshot/likely intent
    const interaction = ora({
      spinner: randomSpinner(),
    }).start("Initialising the ai-ctx CLI...");

    const gcP = yield* _(
      gCS
        .paths(interaction)
        .pipe(
          Effect.tapError((e) =>
            Effect.all([
              Effect.logError(
                "[uxInit] Failed to get global configuration paths.",
              ),
              Effect.logFatal(`[uxInit] ${e}`),
            ]),
          ),
        ),
    );
    const pcP = yield* _(
      pCS
        .paths(interaction)
        .pipe(
          Effect.tapError((e) =>
            Effect.all([
              Effect.logError(
                "[uxInit] Failed to get project configuration paths.",
              ),
              Effect.logFatal(`[uxInit] ${e}`),
            ]),
          ),
        ),
    );

    // Run global initialization, catching errors
    yield* _(
      uxInitGlobal(interaction, gcP).pipe(
        Effect.tapError((e) =>
          Effect.all([
            Effect.logError(
              "[uxInit] Failed to initialise global configuration.",
            ),
            Effect.logFatal(`[uxInit] ${e}`),
          ]),
        ),
      ),
    );

    // Run project initialization, catching errors
    yield* _(
      uxInitProject(interaction, pcP).pipe(
        Effect.tapError((e) =>
          Effect.all([
            Effect.logError(
              "[uxInit] Failed to initialise project configuration.",
            ),
            Effect.logFatal(`[uxInit] ${e}`),
          ]),
        ),
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

    const gCS = yield* _(GlobalConfigurationService);

    const gCP = cashedGCP ?? (yield* _(gCS.paths(interaction)));

    const globalConfigExists = yield* _(gCS.exists(interaction, gCP));

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
    yield* _(gCS.initialise(interaction, gCP));

    yield* Effect.logTrace("[uxRG] Global configuration reset complete.");
    interaction?.succeed("Global configuration reset successfully.").stop();
  });
}

function uxResetProject(
  shouldNotReset: boolean = false,
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

    const pCS = yield* _(ProjectConfigurationService);

    const pCP = cashedPCP ?? (yield* _(pCS.paths(interaction)));

    const projectConfigExists = yield* _(pCS.exists(interaction, pCP));

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
    yield* _(pCS.initialise(interaction, pCP));

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

    
    let check;
    if (!resetOptions.yes) {
      check = yield* _(
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
    } else {
      check = true;
    }

    const gCS = yield* _(GlobalConfigurationService);
    const pCS = yield* _(ProjectConfigurationService);

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
      gCS
        .paths(interaction)
        .pipe(
          Effect.tapError((e) =>
            Effect.all([
              Effect.logError(
                "[uxReset] Failed to get global configuration paths.",
              ),
              Effect.logFatal(`[uxReset] ${e}`),
            ]),
          ),
        ),
    );
    const pcP = yield* _(
      pCS
        .paths(interaction)
        .pipe(
          Effect.tapError((e) =>
            Effect.all([
              Effect.logError(
                "[uxReset] Failed to get project configuration paths.",
              ),
              Effect.logFatal(`[uxReset] ${e}`),
            ]),
          ),
        ),
    );

    // Determine if global reset is needed
    const shouldResetGlobal = resetOptions.global || resetOptions.resetAll;
    // Determine if project reset is needed
    const shouldNotResetProject =
      resetOptions.project && !resetOptions.resetAll;

    // Run global reset if needed, catching errors
    yield* _(
      uxResetGlobal(shouldResetGlobal, interaction, gcP).pipe(
        Effect.tapError((e) =>
          Effect.all([
            Effect.logError("[uxReset] Failed to reset global configuration."),
            Effect.logFatal(`[uxReset] ${e}`),
          ]),
        ),
      ),
    );

    // Run project reset if needed, catching errors
    yield* _(
      uxResetProject(shouldNotResetProject, interaction, pcP).pipe(
        Effect.tapError((e) =>
          Effect.all([
            Effect.logError("[uxReset] Failed to reset project configuration."),
            Effect.logFatal(`[uxReset] ${e}`),
          ]),
        ),
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

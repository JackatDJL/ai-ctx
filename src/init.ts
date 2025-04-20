import { Command } from "@effect/cli";
import { Path, FileSystem } from "@effect/platform";
import { Effect } from "effect";
import { configDefaults } from "./globalConfigurationDefaults.js";
import {
  InitialisationError,
  InitialisationFailure,
} from "./utility/errors.js";
import ora from "ora";
import { randomSpinner } from "cli-spinners";
import Prompt from "prompts";

const initEffect = Effect.gen(function* (_) {
  const bootInstance = ora({
    spinner: randomSpinner(),
  }).start("Booting up...");
  const fs = yield* FileSystem.FileSystem;
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
  yield* Effect.logDebug(`Home directory set to: ${home}`);

  const configDir = path.join(home, ".config", "ai-ctx");
  yield* Effect.logDebug(`Configuration directory set to: ${configDir}`);

  const configFile = path.join(configDir, "config.json");
  yield* Effect.logDebug(`Configuration file set to: ${configFile}`);
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

  if (hasGlobalConfigFile) {
    bootInstance.succeed("Configuration file already exists");
    const overwrite = yield* _(
      Effect.promise(() =>
        Prompt({
          type: "confirm",
          name: "overwrite",
          message:
            "Do you want to overwrite it?",
          initial: false,
					
        }),
      ),
    );

    if (overwrite) {
			bootInstance.info("Stopped Instance");
      return yield* _(resetEffect);
    }
    return;
  }

	const mkdirInstance = ora({
		spinner: randomSpinner(),
	}).start("Creating configuration directory...");
  if (!hasGlobalConfigDir) {
    yield* _(
      fs.makeDirectory(configDir).pipe(
        Effect.catchAll(() =>
          Effect.fail(
            new InitialisationError({
              message: "Failed to create configuration directory",
              cause: InitialisationFailure.FILE_SYSTEM_ERROR,
            }),
          ),
        ),
      ),
    );
		mkdirInstance.succeed("Configuration directory created");
    yield* Effect.logDebug(`Created configuration directory: ${configDir}`);
  } else {
		mkdirInstance.info("Configuration directory already exists");
    yield* Effect.logDebug(
      `Configuration directory already exists: ${configDir}`,
    );
  }

	const mkFileInstance = ora({
		spinner: randomSpinner(),
	}).start("Creating configuration file...");
  if (!hasGlobalConfigFile) {
    yield* _(
      fs
        .writeFile(
          configFile,
          new TextEncoder().encode(JSON.stringify({
            "&schema": "https://raw.githubusercontent.com/jackatdjl/ai-ctx/tree/main/global.schema.json",
            ...configDefaults,
          })),
        )
        .pipe(
          Effect.catchAll(() =>
            Effect.fail(
              new InitialisationError({
                message: "Failed to create configuration file",
                cause: InitialisationFailure.FILE_SYSTEM_ERROR,
              }),
            ),
          ),
        ),
    );
		mkFileInstance.succeed("Configuration file created");
    yield* Effect.logDebug(`Created configuration file: ${configFile}`);
  } else {
		mkFileInstance.info("Configuration file already exists");
    yield* Effect.logDebug(`Configuration file already exists: ${configFile}`);
  }

	ora("Initialisation complete!").succeed();
  yield* Effect.logInfo("Initialisation complete!");
});

const resetEffect = Effect.gen(function* (_) {

});

const reset = Command.make("reset", {}, () => resetEffect);
export const init = Command.make("init", {}, () => initEffect).pipe(
	Command.withSubcommands([reset])
);

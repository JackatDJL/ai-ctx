import * as Command from "@effect/cli/Command";
import Version from "./utility/version.js";
import { Console, Effect } from "effect";
import ProjectOptions from "./options.js";
import cliSpinners, { randomSpinner } from "cli-spinners";
import ora from "ora";

const PO = new ProjectOptions();

const startup = Effect.gen(function* (_) {
  yield* _(Effect.logInfo("Welcome to the AI Context CLI!"));
  yield* _(Effect.logInfo("Use --help to see available commands."));
  yield* _(Effect.logInfo("Use --version to see the version."));
});

const file = Command.make("file", PO.fileOptions, (args) => {
  return Effect.gen(function* (_) {
    yield* _(Effect.logInfo("Welcome to the "));
  });
});

const workspace = Command.make("workspace", PO.workspaceOptions);

const animatedAwait = (text: string, duration: number) => {
  return Effect.promise<void>(() => {
    return new Promise<void>((resolve) => {
      const instance = ora({
        spinner: randomSpinner(),
      });
      Console.log(instance.start(text));
      setTimeout(() => {
        instance.succeed();
        resolve();
      }, duration);
    });
  });
};

const test = Command.make("test", {}, () =>
  Effect.gen(function* (_) {
    yield* _(Console.clear);
    yield* _(startup);
    yield* _(animatedAwait("Loading...", 2000));
    yield* _(Effect.logInfo("Test command executed!"));
  }),
);

const root = Command.make("ai-ctx", {}, () => startup).pipe(
  Command.withSubcommands([file, workspace, test]),
  Command.withDescription(
    "A CLI build using Effect/cli to simplify building a context of a project for in browser Artificial Intelligences by compiling a project into a single text file",
  ),
);

export const run = Command.run(root, {
  name: "AI Context",
  version: (await Version.create()).version,
});

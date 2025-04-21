import * as Command from "@effect/cli/Command";
import Version, { VersionLive } from "./utility/version.js";
import { Console, Effect } from "effect";
import ProjectOptions from "./options.js";
import { randomSpinner } from "cli-spinners";
import * as NodeContext from "@effect/platform-node/NodeContext";
import ora from "ora";
import { init } from "./init.js";

const PO = new ProjectOptions();

const startup = Effect.gen(function* (_) {
  yield* _(Effect.logInfo("Welcome to the AI Context CLI!"));
  yield* _(Effect.logInfo("Use --help to see available commands."));
  yield* _(Effect.logInfo("Use --version to see the version."));
});

const file = Command.make("file", PO.fileOptions, (_args) => {
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
    yield* _(startup);
    yield* _(animatedAwait("Loading...", 2000));
    yield* _(Effect.logInfo("Test command executed!"));
  }),
);

const root = Command.make("ai-ctx", {}, () => startup).pipe(
  Command.withSubcommands([file, workspace, test, init]),
  Command.withDescription(
    "A CLI build using Effect/cli to simplify building a context of a project for in browser Artificial Intelligences by compiling a project into a single text file",
  ),
);

export const run = Command.run(root, {
  name: "AI Context",
  version: await Effect.runPromise(Effect.gen(function* (_) {
    const vS = yield* _(Version)

    return yield* _(vS.version().pipe(
      Effect.catchAll(() => {
        Effect.logError("Failed to get version");
        return Effect.succeed("unknown");
      })
    ));
  }).pipe(
    Effect.provide(NodeContext.layer),
    Effect.provide(VersionLive),
  )),
});

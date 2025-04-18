import * as Command from "@effect/cli/Command";
import * as Options from "@effect/cli/Options";
import * as Config from "effect/Config";
import Version from "./utility/version.js";

const srcPath = Options.file("src-file").pipe(
  Options.withAlias("sf"),
  Options.orElseEither(
    Options.directory("src-dir", { exists: "yes" }).pipe(
      Options.withAlias("sd"),
    ),
  ),
  Options.withDescription(
    "Der Pfad zum Verzeichnis (für Folder Mode) oder zur Datei (für File Mode), das/die verarbeitet werden soll.",
  ),
);

const outputPath = Options.file("output", {
  exists: "either",
}).pipe(
  Options.withFallbackConfig(
    Config.string("output").pipe(Config.withDefault("output.txt")),
  ),
  Options.withAlias("o"),
  Options.withDescription(
    "Der Pfad zur Ausgabedatei. Standardmäßig könnte dies z.B. ./ai-context.txt im Projekt-Root oder im aktuellen Verzeichnis sein.",
  ),
);

const ignore = Options.text("ignore").pipe(
  Options.withFallbackConfig(
    Config.array(Config.string("ignore")).pipe(Config.withDefault([])),
  ),
  Options.withAlias("ig"),
  Options.withDescription(
    "Fügt zusätzliche gitignore-ähnliche Muster hinzu, die ignoriert werden sollen. Nützlich für temporäre Ausschlüsse ohne .gitignore anzupassen.",
  ),
);

const include = Options.text("include").pipe(
  Options.withFallbackConfig(
    Config.array(Config.string("include")).pipe(Config.withDefault([])),
  ),
  Options.withAlias("in"),
  Options.withDescription(
    "Fügt Muster hinzu, die explizit eingeschlossen werden sollen, auch wenn sie von .gitignore oder --ignore ausgeschlossen wären (ähnlich wie ! in .gitignore).",
  ),
);

const projectGitignore = Options.boolean("no-gitignore", {
  ifPresent: false,
  negationNames: ["enable-gitignore"],
}).pipe(
  Options.withFallbackConfig(
    Config.boolean("enableGitignore").pipe(Config.withDefault(true)),
  ),
  Options.withDescription(
    "Ignoriert die projektspezifischen .gitignore Dateien. Es wird nur die globale Liste und die --ignore / --include Muster verwendet.",
  ),
);

const globalGitignore = Options.boolean("no-global-ignore", {
  ifPresent: false,
  negationNames: ["enable-global-ignore"],
}).pipe(
  Options.withFallbackConfig(
    Config.boolean("enableGlobalIgnore").pipe(Config.withDefault(true)),
  ),
  Options.withDescription(
    "Deaktiviert die Verwendung (und das automatische Update) der globalen gitignore-repo.txt. Es werden nur projektspezifische .gitignore Dateien und die --ignore / --include Muster verwendet.",
  ),
);

const forceUpdateGlobalIgnore = Options.boolean(
  "force-update-global-ignore",
).pipe(
  Options.withFallbackConfig(
    Config.boolean("forceUpdateGlobalIgnore").pipe(Config.withDefault(false)),
  ),
  Options.withDescription(
    "Erzwingt das Update der globalen gitignore-repo.txt, unabhängig vom Zeitstempel des letzten Updates.",
  ),
);

const defaultOptions = {
  srcPath,
  outputPath,
  ignore,
  include,
  projectGitignore,
  globalGitignore,
  forceUpdateGlobalIgnore,
};

const followImportDepth = Options.integer("follow-import-depth").pipe(
  Options.withFallbackConfig(
    Config.number("followImportDepth").pipe(Config.withDefault(-1)),
  ),
  Options.withDescription(
    "Legt fest, wie tief die Import-Hierarchie verfolgt werden soll. Eine Tiefe von 1 bedeutet nur direkte Importe, 0 bedeutet keine Importe verfolgen, -1 oder weglassen könnte unendlich bedeuten (Vorsicht!).",
  ),
  Options.withAlias("d"),
);

const fileOnlyOptions = {
  followImportDepth,
};

const fileHeaders = Options.boolean("no-file-headers", {
  ifPresent: false,
  negationNames: ["enable-file-headers"],
}).pipe(
  Options.withFallbackConfig(
    Config.boolean("enableFileHeaders").pipe(Config.withDefault(true)),
  ),
  Options.withDescription(
    'Unterdrückt die Hinzufügung von Headern wie "--- FILE: path/to/file.ts ---" zwischen den Dateiinhalten in der Ausgabedatei.',
  ),
);

const metadata = Options.boolean("no-metadata", {
  ifPresent: false,
  negationNames: ["enable-metadata"],
}).pipe(
  Options.withFallbackConfig(
    Config.boolean("enableMetadata").pipe(Config.withDefault(true)),
  ),
  Options.withDescription(
    "Unterdrückt die Hinzufügung von generellen Metadaten, Pfad-Mappings und Bibliotheks-Notizen am Anfang der Ausgabedatei.",
  ),
);

const formatingOptions = {
  fileHeaders,
  metadata,
};

const fileOptions = {
  ...defaultOptions,
  ...fileOnlyOptions,
  ...formatingOptions,
};

const file = Command.make("file", fileOptions);

const workspaceOptions = {
  ...defaultOptions,
  ...formatingOptions,
};

const workspace = Command.make("workspace", workspaceOptions);

const root = Command.make("ai-ctx").pipe(
  Command.withSubcommands([file, workspace]),
  Command.withDescription(
    "A CLI build using Effect/cli to simplify building a context of a project for in browser Artificial Intelligences by compiling a project into a single text file",
  ),
);

export const run = Command.run(root, {
  name: "AI Context",
  version: (await Version.create()).version,
});

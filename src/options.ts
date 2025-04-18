import { Options } from "@effect/cli";
import { Config } from "effect";

export default class ProjectOptions {
  srcPath = Options.file("src-file").pipe(
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

  outputPath = Options.file("output", {
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

  ignore = Options.text("ignore").pipe(
    Options.withFallbackConfig(
      Config.array(Config.string("ignore")).pipe(Config.withDefault([])),
    ),
    Options.withAlias("ig"),
    Options.withDescription(
      "Fügt zusätzliche gitignore-ähnliche Muster hinzu, die ignoriert werden sollen. Nützlich für temporäre Ausschlüsse ohne .gitignore anzupassen.",
    ),
  );

  include = Options.text("include").pipe(
    Options.withFallbackConfig(
      Config.array(Config.string("include")).pipe(Config.withDefault([])),
    ),
    Options.withAlias("in"),
    Options.withDescription(
      "Fügt Muster hinzu, die explizit eingeschlossen werden sollen, auch wenn sie von .gitignore oder --ignore ausgeschlossen wären (ähnlich wie ! in .gitignore).",
    ),
  );

  projectGitignore = Options.boolean("no-gitignore", {
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

  globalGitignore = Options.boolean("no-global-ignore", {
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

  forceUpdateGlobalIgnore = Options.boolean("force-update-global-ignore").pipe(
    Options.withFallbackConfig(
      Config.boolean("forceUpdateGlobalIgnore").pipe(Config.withDefault(false)),
    ),
    Options.withDescription(
      "Erzwingt das Update der globalen gitignore-repo.txt, unabhängig vom Zeitstempel des letzten Updates.",
    ),
  );

  // Corrected object grouping using 'this' and property names
  defaultOptions = {
    srcPath: this.srcPath,
    outputPath: this.outputPath,
    ignore: this.ignore,
    include: this.include,
    projectGitignore: this.projectGitignore,
    globalGitignore: this.globalGitignore,
    forceUpdateGlobalIgnore: this.forceUpdateGlobalIgnore,
  };

  followImportDepth = Options.integer("follow-import-depth").pipe(
    Options.withFallbackConfig(
      Config.number("followImportDepth").pipe(Config.withDefault(-1)),
    ),
    Options.withDescription(
      "Legt fest, wie tief die Import-Hierarchie verfolgt werden soll. Eine Tiefe von 1 bedeutet nur direkte Importe, 0 bedeutet keine Importe verfolgen, -1 oder weglassen könnte unendlich bedeuten (Vorsicht!).",
    ),
    Options.withAlias("d"),
  );

  // Corrected object grouping using 'this' and property names
  fileOnlyOptions = {
    followImportDepth: this.followImportDepth,
  };

  fileHeaders = Options.boolean("no-file-headers", {
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

  metadata = Options.boolean("no-metadata", {
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

  formatingOptions = {
    fileHeaders: this.fileHeaders,
    metadata: this.metadata,
  };

  fileOptions = {
    ...this.defaultOptions,
    ...this.fileOnlyOptions,
    ...this.formatingOptions,
  };

  workspaceOptions = {
    ...this.defaultOptions,
    ...this.formatingOptions,
  };
}

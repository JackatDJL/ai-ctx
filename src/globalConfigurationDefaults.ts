import { type AiCtxGlobalConfiguration } from "./types/global.js";

/**
 * Default values for the global ai-ctx configuration.
 * in TypeScript.
 */
export const configDefaults = {
  globalGitignoreRepoUrl: "https://github.com/github/gitignore.git",

  ignore: {
    additionalPatterns: [],
    additionalGitignoreUrls: [],
    useProjectGitignore: true,
    useGlobalGitignore: true,
    allowedDotFolders: [".github", ".vscode", ".gitlab"],
  },

  output: {
    defaultPath: "./ai-context.txt",
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
} as AiCtxGlobalConfiguration;

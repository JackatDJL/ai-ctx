/**
 * Schema for the global ai-ctx configuration file.
 */
export interface AiCtxGlobalConfiguration {
  /**
   * URL to the schema for this configuration file.
   */
  "&schema"?: string;
  /**
   * Version information for the configuration file.
   */
  "&version"?: {
    /**
     * Version number of the configuration file.
     */
    version: string;
    /**
     * Tag indicating the type of versioning.
     */
    _tag: string;
  };
  /**
   * Timestamp (ISO 8601) of the last successful synchronization of the global gitignore list.
   */
  lastGlobalGitignoreSync?: string;
  /**
   * Commit ID of the github/gitignore repository at the time of the last sync.
   */
  lastGitignoreCommitId?: string;
  /**
   * URL of the git repository to sync global gitignore patterns from.
   */
  globalGitignoreRepoUrl?: string;
  /**
   * Settings related to ignoring files and directories.
   */
  ignore?: {
    /**
     * List of additional gitignore-like patterns to always ignore globally.
     */
    additionalPatterns?: string[];
    /**
     * List of URLs pointing to additional .gitignore files to fetch and include.
     */
    additionalGitignoreUrls?: string[];
    /**
     * Whether to respect project-specific .gitignore files by default.
     */
    useProjectGitignore?: boolean;
    /**
     * Whether to use the synchronized global gitignore list by default.
     */
    useGlobalGitignore?: boolean;
    /**
     * List of dot folders (like .github, .vscode) that should NOT be ignored by default.
     */
    allowedDotFolders?: string[];
  };
  /**
   * Settings related to the output file.
   */
  output?: {
    /**
     * Default path for the output file if not specified via CLI.
     */
    defaultPath?: string;
    /**
     * Whether to include file path headers (--- FILE: ... ---) in the output.
     */
    includeFileHeaders?: boolean;
    /**
     * Whether to include initial metadata (mappings, library notes) in the output.
     */
    includeMetadata?: boolean;
  };
  /**
   * Settings specific to file processing mode (following imports).
   */
  fileMode?: {
    /**
     * Default depth for following imports. -1 for infinite.
     */
    defaultImportDepth?: number;
  };
  /**
   * Settings related to performance.
   */
  performance?: {
    /**
     * Default number of parallel workers (fibers/threads) to use.
     */
    defaultParallelism?: number;
  };
  /**
   * Settings related to context enhancement and structure.
   */
  context?: {
    /**
     * Mapping of aliases (like ~utils) to actual paths.
     */
    pathMappings?: {
      [k: string]: string;
    };
    /**
     * Whether to try to detect and annotate code from known libraries (e.g., Shadcn UI).
     */
    annotateKnownLibraries?: boolean;
  };
}

/**
 * Schema for the project-specific ai-ctx configuration file (e.g., .ai-ctx.json). Settings here override or extend global configuration for this project.
 */
export interface AiCtxProjectConfiguration {
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
   * Project-specific settings related to ignoring files and directories. These patterns are added to the global and .gitignore rules.
   */
  ignore?: {
    /**
     * List of additional gitignore-like patterns to ignore specifically within this project.
     */
    additionalPatterns?: string[];
    /**
     * List of URLs pointing to additional .gitignore files to fetch and include specifically for this project.
     */
    additionalGitignoreUrls?: string[];
    /**
     * List of dot folders (like .config, .data) specific to this project that should NOT be ignored, overriding global settings.
     */
    allowedDotFolders?: string[];
  };
  /**
   * Project-specific settings related to the output file.
   */
  output?: {
    /**
     * Default path for the output file within this project if not specified via CLI.
     */
    defaultPath?: string;
    /**
     * Whether to include file path headers (--- FILE: ... ---) in the output for this project.
     */
    includeFileHeaders?: boolean;
    /**
     * Whether to include initial metadata (mappings, library notes) in the output for this project.
     */
    includeMetadata?: boolean;
  };
  /**
   * Project-specific settings for file processing mode (following imports).
   */
  fileMode?: {
    /**
     * Default depth for following imports in this project. -1 for infinite.
     */
    defaultImportDepth?: number;
  };
  /**
   * Project-specific settings related to context enhancement and structure.
   */
  context?: {
    /**
     * Mapping of aliases (like ~utils) to actual paths specific to this project.
     */
    pathMappings?: {
      [k: string]: string;
    };
    /**
     * Whether to try to detect and annotate code from known libraries (e.g., Shadcn UI) for this project.
     */
    annotateKnownLibraries?: boolean;
  };
}

import { FileSystem, Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Cause, Effect, Logger, LogLevel } from "effect";
import js2ts from "json-schema-to-typescript";
import * as process from "node:process"; // Needed for process.platform

// Helper function to clear specific files from src/types
function clearSchemaTypes() {
  return Effect.gen(function* (_) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const typesDir = path.join("src", "types");

    // Check if the directory exists
    const dirExists = yield* fs.exists(typesDir);
    if (!dirExists) {
      yield* Effect.log(
        `[SCHEMAS] Directory ${typesDir} does not exist, no files to clear.`,
      );
      return; // Nothing to clear
    }

    yield* Effect.log(
      `[SCHEMAS] Clearing files from ${typesDir} based on criteria...`,
    );

    // Read all files in the directory
    const files = yield* fs
      .readDirectory(typesDir)
      .pipe(
        Effect.catchAll((e) =>
          Effect.fail(
            new Error(
              `Failed to read directory ${typesDir}: ${Cause.pretty(Cause.fail(e))}`,
            ),
          ),
        ),
      );

    // Filter for .ts files
    const tsFiles = files.filter((file) => file.endsWith(".ts"));

    const filesToDelete: string[] = [];

    // Iterate through each .ts file and check criteria
    yield* Effect.forEach(
      tsFiles,
      (file) =>
        Effect.gen(function* (_) {
          const fullPath = path.join(typesDir, file);

          // Read file content
          const content = yield* fs.readFileString(fullPath).pipe(
            Effect.catchAll((e) => {
              // Log error but don't fail the whole clear process
              return Effect.logError(
                `Failed to read file ${fullPath} for clearing check`,
                e,
              ).pipe(
                Effect.flatMap(() => Effect.succeed(null)), // Return null to skip this file
              );
            }),
          );

          if (content === null) {
            return; // Skip if reading failed
          }

          const lines = content.split(/\r?\n/); // Split into lines, handling different line endings

          // Criteria 1: "Schema" in the first 5 lines
          const firstFiveLines = lines.slice(0, 5).join("\n");
          const hasSchemaInHeader = firstFiveLines.includes("Schema");

          if (!hasSchemaInHeader) {
            // yield* Effect.logDebug(`[SCHEMAS] Skipping ${file}: No "Schema" in header.`);
            return; // Doesn't match criteria 1
          }

          // Criteria 2 & 3: Exactly one exported interface with "Configuration" in its name
          // Use a regex to find exported interfaces and capture their names
          const interfaceExportRegex = /^export interface\s+(\w+)\s*\{/gm;
          let match;
          const exportedInterfaces: string[] = [];

          while ((match = interfaceExportRegex.exec(content)) !== null) {
            exportedInterfaces.push(match[1]); // Capture the interface name
          }

          const hasSingleConfigurationInterface =
            exportedInterfaces.length === 1 &&
            exportedInterfaces[0].includes("Configuration");

          if (hasSingleConfigurationInterface) {
            yield* Effect.log(
              `[SCHEMAS] File ${file} matches clearing criteria.`,
            );
            filesToDelete.push(fullPath);
          } else {
            // yield* Effect.logDebug(`[SCHEMAS] Skipping ${file}: Does not match single Configuration interface criteria.`);
          }
        }),
      { concurrency: "unbounded" }, // Check files concurrently
    );

    // Delete the identified files
    yield* Effect.forEach(
      filesToDelete,
      (filePath) =>
        fs.remove(filePath).pipe(
          Effect.tap(() =>
            Effect.log(`[SCHEMAS] Deleted ${path.basename(filePath)}`),
          ),
          Effect.catchAll((e) => {
            // Log error but don't fail the whole clear process
            return Effect.logError(
              `Failed to delete file ${path.basename(filePath)}`,
              e,
            );
          }),
        ),
      { concurrency: "unbounded" }, // Delete files concurrently
    );

    if (filesToDelete.length > 0) {
      yield* Effect.log(
        `[SCHEMAS] Finished clearing ${filesToDelete.length} files.`,
      );
    } else {
      yield* Effect.log(`[SCHEMAS] No files matched clearing criteria.`);
    }
  });
}

function compileSchema(name: string) {
  return Effect.gen(function* (_) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const schemaFileName = `${name}.schema.json`;
    const schemaPath = path.join(".", schemaFileName); // Assuming schemas are in the root
    const outputPath = path.join("src", "types", `${name}.ts`);

    yield* Effect.log(`[SCHEMAS] Compiling ${schemaFileName} -> ${outputPath}`);

    // Ensure the output directory exists (redundant with clear, but safe)
    yield* fs
      .makeDirectory(path.join("src", "types"), { recursive: true })
      .pipe(Effect.ignore); // Ignore if directory already exists

    // --- Read Schema, Compile via API, Write Output ---

    // 1. Read the schema file content
    const schemaContent = yield* fs
      .readFileString(schemaPath)
      .pipe(
        Effect.catchAll((e) =>
          Effect.fail(
            new Error(
              `Failed to read schema file ${schemaFileName}: ${Cause.pretty(Cause.fail(e))}`,
            ),
          ),
        ),
      );

    // 2. Parse the JSON content
    let schema: any;
    try {
      schema = JSON.parse(schemaContent);
    } catch (e) {
      return yield* Effect.fail(
        new Error(`Failed to parse JSON in ${schemaFileName}: ${e}`),
      );
    }

    // 3. Compile the schema to TypeScript using the API
    // Use Effect.promise to integrate the Promise-based API into Effect
    // The type name should be the 'name' derived from the file name
    const typeScriptCode = yield* Effect.promise(() =>
      js2ts.compile(schema, name, {
        // Pass 'name' as the root type name
        // Options for json-schema-to-typescript
        bannerComment: "", // Remove the default header comment
        additionalProperties: false, // Disallow additional properties by default
        // Add other options as needed, e.g., $ref options
      }),
    ).pipe(
      Effect.catchAll((e) =>
        Effect.fail(
          new Error(
            `json-schema-to-typescript compilation failed for ${schemaFileName}: ${e}`,
          ),
        ),
      ),
    );

    // 4. Write the generated TypeScript code to the output file
    yield* fs
      .writeFileString(outputPath, typeScriptCode)
      .pipe(
        Effect.catchAll((e) =>
          Effect.fail(
            new Error(
              `Failed to write output file ${outputPath}: ${Cause.pretty(Cause.fail(e))}`,
            ),
          ),
        ),
      );

    yield* Effect.log(
      `[SCHEMAS] Successfully compiled and wrote ${outputPath}`,
    );
    // yield* Effect.log(`[SCHEMAS] Finished processing ${name}`); // Redundant log
  }).pipe(
    // Add specific error handling for compilation failure
    Effect.catchAll((e) => {
      // Log the error and then re-fail it so the main process catches it
      return Effect.logError(`Failed to compile schema for ${name}`, e).pipe(
        Effect.flatMap(() => Effect.fail(e)), // Propagate the error
      );
    }),
  );
}

export const compileSchemas = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  yield* Effect.log("[SCHEMAS] Starting schema compilation process...");

  // --- Step 1: Clear existing schema types ---
  yield* clearSchemaTypes();

  yield* Effect.log("[SCHEMAS] Finding schema files...");

  // --- Step 2: Find schema files ---
  const files = yield* fs
    .readDirectory(".")
    .pipe(
      Effect.catchAll((e) =>
        Effect.fail(
          new Error(
            `Failed to read current directory: ${Cause.pretty(Cause.fail(e))}`,
          ),
        ),
      ),
    );

  const schemaFiles = files.filter((file) => file.endsWith(".schema.json"));

  if (schemaFiles.length === 0) {
    yield* Effect.log(
      "[SCHEMAS] No schema files found (*.schema.json) in the current directory. Nothing to compile.",
    );
    yield* Effect.log("[SCHEMAS] Schema compilation process completed.");
    return; // Exit gracefully if no schemas are found
  }

  yield* Effect.log(`[SCHEMAS] Found ${schemaFiles.length} schema files`);

  // --- Step 3: Compile schema files ---
  // Define the type for tasks - they can now fail with an Error
  const tasks: Effect.Effect<void, Error, FileSystem.FileSystem | Path.Path>[] =
    [];

  for (const file of schemaFiles) {
    // Extract the base name without the extension for the type name
    const name = file.replace(".schema.json", "");
    // Add the compileSchema effect for this file to the tasks array
    // compileSchema already handles its own logging on failure
    tasks.push(compileSchema(name));
  }

  yield* Effect.log("[SCHEMAS] Starting compilation tasks...");

  // Effect.all runs tasks concurrently and will fail if any task fails
  yield* Effect.all(tasks, { concurrency: "unbounded" }); // Run tasks concurrently

  yield* Effect.log(
    "[SCHEMAS] All schema compilations completed successfully.",
  );
}).pipe(
  // Provide necessary services: FileSystem and Path from NodeContext
  Effect.provide(NodeContext.layer),
  // Configure logging
  Logger.withMinimumLogLevel(LogLevel.Debug), // Keep debug logging for troubleshooting
  Effect.provide(Logger.pretty),
  // Catch any errors that bubble up from Effect.all or other parts of the main effect
  Effect.catchAll((e) => {
    // Log the overall failure and the error details
    return Effect.logError("Overall schema compilation process failed", e).pipe(
      Effect.flatMap(() => Effect.fail(e)), // Re-fail the effect to indicate overall failure to the runner
    );
  }),
);

// Execute the main effect and handle any final errors that escape the pipeline
Effect.runPromise(compileSchemas).catch((err) => {
  // This catch block is for unhandled errors that escape the Effect pipeline.
  // With the catchAlls above, most errors should be logged by Effect's logger,
  // but this provides a fallback and ensures a non-zero exit code on failure.
  console.error("Unhandled error during schema compilation process:");
  console.error(err);
  process.exit(1); // Exit with a non-zero code to indicate failure
});

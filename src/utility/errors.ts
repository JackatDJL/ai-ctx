import type { Cause } from "effect";
import { Data } from "effect"; // Import Data and Cause from 'effect'
import type { Ora } from "ora"; // Import Ora from 'ora'

// =============================================================================
// Public Interfaces and Types
// =============================================================================

// Define the base properties that all errors created by the factory will have.
// Moved outside the factory to be publicly accessible.
 
// interface BaseErrorProperties<T extends string, Tag extends string> {
//   readonly _tag: Tag; // The Data.TaggedError tag
//   message: string; // The error message
//   cause: T; // The specific cause type
// }

// Define the public interface for the instance type of errors created by the factory.
// This represents the public shape of the error instances.
interface BaseCliErrorInstance<T extends string, Tag extends string>
  extends Error {
  // Include properties from BaseErrorProperties
  readonly _tag: Tag;
  message: string;
  cause: T;
  // Include the interaction property
  interaction?: Ora | undefined;
  // Note: We omit Cause.YieldableError here in the public interface to avoid
  // exposing its potentially unnamable internal types. We rely on the fact
  // that Data.TaggedError instances *are* YieldableError at runtime.
}

// Define the public interface for the InitialisationError instance type.
// Extends the base instance interface with the specific tag and cause type.
export type InitialisationErrorInstance = BaseCliErrorInstance<
  InitialisationFailure,
  "InitialisationError"
>;

// Define the public interface for the VersionError instance type.
// Extends the base instance interface with the specific tag and cause type.
export type VersionErrorInstance = BaseCliErrorInstance<
  VersionErrorTypes,
  "VersionError"
>;

// Define the interface for the static methods that errors created by the factory will have.
interface IBaseCliErrorStatics<T extends string, InstanceType> {
  fromCause(cause: T, interaction?: Ora): InstanceType;
  determineMessage(cause: T): string; // Add determineMessage to the interface
}

// Define a type for the constructor signature returned by the factory.
type BaseCliErrorConstructor<
  T extends string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Tag extends string,
  InstanceType,
> = new (
  props: { message: string; cause: T },
  interaction?: Ora,
) => InstanceType;

// Define the combined type for the exported error constants (constructor + statics).
type InitialisationErrorType = BaseCliErrorConstructor<
  InitialisationFailure,
  "InitialisationError",
  InitialisationErrorInstance
> &
  IBaseCliErrorStatics<InitialisationFailure, InitialisationErrorInstance>;

type VersionErrorType = BaseCliErrorConstructor<
  VersionErrorTypes,
  "VersionError",
  VersionErrorInstance
> &
  IBaseCliErrorStatics<VersionErrorTypes, VersionErrorInstance>;

// =============================================================================
// Base CLI Error Factory Function
// =============================================================================

/**
 * A factory function to create a base CLI tagged error class.
 * This class includes interaction handling (Ora spinner feedback) and
 * a static method to create instances from a specific cause type using a provided message mapping.
 *
 * @template T - The type of the specific error cause enum (e.g., InitialisationFailure, VersionErrorTypes).
 * @template Tag - The string literal type for the Data.TaggedError tag.
 *
 * @param tag - The unique string tag for the Data.TaggedError.
 * @param determineMessage - A function that maps a specific cause of type T to a human-readable error message.
 * @returns A class constructor for a tagged error that extends Error, includes interaction handling,
 * and has a static `fromCause` method. The return type uses the public instance interface.
 */
function createBaseCliError<T extends string, Tag extends string>(
  tag: Tag,
  determineMessage: (cause: T) => string, // Function to map cause of type T to message
): BaseCliErrorConstructor<T, Tag, BaseCliErrorInstance<T, Tag>> &
  IBaseCliErrorStatics<T, BaseCliErrorInstance<T, Tag>> {
  // Define the properties required by Data.TaggedError and our constructor.
  // This is similar to BaseErrorProperties but is used internally by the factory.
  interface InternalErrorProperties {
    message: string;
    cause: T;
  }

  // Use Data.TaggedError factory to get the base tagged error class constructor.
  // Assert the return type to help TypeScript understand its structure.
  // The instances will extend Error, have the _tag, and include the InternalErrorProperties.
  // We assert it as a constructor returning YieldableError with the tag and properties
  // to provide enough type info without the full complex intersection.
  const BaseTagged = Data.TaggedError(tag) as new (
    props: InternalErrorProperties,
  ) => Cause.YieldableError & {
    readonly _tag: Tag;
  } & Readonly<InternalErrorProperties>;

  // Define the class that extends the base tagged error class constructor returned by Data.TaggedError.
  const ErrorClass = class extends BaseTagged {
    // Add the interaction property to the instance.
    // Explicitly include 'undefined' in the type for strict optional property checking.
    interaction?: Ora | undefined;
    // REMOVED: Invalid mapped types syntax from class body
    // [K in keyof InternalErrorProperties]: InternalErrorProperties[K];

    /**
     * Constructor for the created error class.
     *
     * @param props - The properties for the error instance (message and cause).
     * @param interaction - Optional Ora spinner instance for feedback.
     */
    constructor(props: InternalErrorProperties, interaction?: Ora) {
      // Call the base BaseTagged (Data.TaggedError result) constructor with the properties.
      // Data.TaggedError's constructor handles assigning these properties to the instance.
      super(props);
      // Assign the properties from the props object to the instance at runtime.
      // The type is handled by the InstanceType definition and assertions.
      Object.assign(this, props);

      // Store the interaction instance on the error instance.
      this.interaction = interaction;

      // Provide failure feedback using the interaction spinner if available.
      // This abstracts the common interaction handling logic.
      interaction?.fail(props.message);
    }

    /**
     * Static method to create an instance of this error class from a specific cause.
     * It uses the `determineMessage` function provided to the factory to get the message.
     *
     * @param cause - The specific cause of type T.
     * @param interaction - Optional Ora spinner instance for feedback.
     * @returns An instance of the created error class. The return type uses the public instance interface.
     */
    static fromCause(
      cause: T,
      interaction?: Ora,
    ): BaseCliErrorInstance<T, Tag> {
      // Use the message mapping function provided to the factory.
      const message = determineMessage(cause);
      // Create and return a new instance of this error class.
      // Assert the instance to the public interface type.
      return new ErrorClass(
        { message, cause },
        interaction,
      ) as BaseCliErrorInstance<T, Tag>;
    }

    // Add the determineMessage static method to the class
    static determineMessage(cause: T): string {
      return determineMessage(cause);
    }
  };

  // Return the created class constructor.
  // Assert the return type to match the factory's return type annotation,
  // including the static `fromCause` and `determineMessage` methods.
  return ErrorClass as any; // Use any here to simplify the return assertion
}

// =============================================================================
// Specific Error Definitions Using the Factory
// =============================================================================

// --- Initialisation Errors ---

export enum InitialisationFailure {
  HOME_DIR_NOT_FOUND = "HOME_DIR_NOT_FOUND",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  PROMPT_ERROR = "PROMPT_ERROR", // Prompt Service Threw an error
  CWD_ERROR = "CWD_ERROR", // Current working directory error
  TEXTENCODER_ERROR = "TEXTENCODER_ERROR", // TextEncoder error
  VERSIONING_ERROR = "VERSIONING_ERROR", // Versioning error
  // Add other initialisation failure types here
}

// Define the message mapping function for InitialisationFailure.
const determineInitialisationMessage = (
  failure: InitialisationFailure,
): string => {
  switch (failure) {
    case InitialisationFailure.HOME_DIR_NOT_FOUND:
      return "Could not determine home directory";
    case InitialisationFailure.FILE_SYSTEM_ERROR:
      return "File system error occurred";
    case InitialisationFailure.PROMPT_ERROR:
      return "Prompt service error occurred";
    case InitialisationFailure.CWD_ERROR:
      return "Current working directory error occurred";
    case InitialisationFailure.TEXTENCODER_ERROR:
      return "TextEncoder error occurred";
    case InitialisationFailure.VERSIONING_ERROR:
      return "Versioning error occurred";
    default:
      return `Unknown initialisation error occurred: ${failure}`;
  }
};

// Create the InitialisationError class using the factory.
// Pass the specific cause enum type, the tag, and the message mapping function.
// The type annotation uses the combined type (constructor + statics).
export const InitialisationError: InitialisationErrorType = createBaseCliError(
  "InitialisationError", // Tag for Data.TaggedError
  determineInitialisationMessage, // Function to determine message from InitialisationFailure
);

// --- Version Errors ---

export enum VersionErrorTypes {
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  INVALID_VERSION_FORMAT = "INVALID_VERSION_FORMAT",
  PARSING_ERROR = "PARSING_ERROR", // Error parsing version information
  // Add other version error types here
}

// Define the message mapping function for VersionErrorTypes.
const determineVersionMessage = (type: VersionErrorTypes): string => {
  switch (type) {
    case VersionErrorTypes.FILE_SYSTEM_ERROR:
      return "File system error occurred during versioning";
    case VersionErrorTypes.INVALID_VERSION_FORMAT:
      return "Invalid version format";
    default:
      return `Unknown versioning error occurred: ${type}`;
  }
};

// Create the VersionError class using the factory.
// Pass the specific cause enum type, the tag, and the message mapping function.
// The type annotation uses the combined type (constructor + statics).
export const VersionError: VersionErrorType = createBaseCliError(
  "VersionError", // Tag for Data.TaggedError
  determineVersionMessage, // Function to determine message from VersionErrorTypes
);

// =============================================================================
// Usage Examples
// =============================================================================

// Example of creating and failing with an InitialisationError:
// const mySpinner = ora().start(); // Assume spinner is created
// const effect1 = Effect.fail(InitialisationError.fromCause(InitialisationFailure.FILE_SYSTEM_ERROR, mySpinner));
// // The inferred error type for effect1 should now be InitialisationError

// Example of creating and failing with a VersionError:
// const effect2 = Effect.fail(VersionError.fromCause(VersionErrorTypes.INVALID_VERSION_FORMAT, mySpinner));
// // The inferred error type for effect2 should now be VersionError

// Example of creating an instance directly (less common with the fromCause helper):
// const customInitialisationError = new InitialisationError({ message: "Custom error message", cause: InitialisationFailure.OTHER_ERROR }, mySpinner); // Assuming OTHER_ERROR is added to enum
// const effect3 = Effect.fail(customInitialisationError);
// // The inferred error type for effect3 should be InitialisationError

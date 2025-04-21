import { Data } from "effect";
import { Ora } from "ora";

export enum InitialisationFailure {
  HOME_DIR_NOT_FOUND = "HOME_DIR_NOT_FOUND",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  PROMPT_ERROR = "PROMPT_ERROR", // Prompt Service Threw an error
  CWD_ERROR = "CWD_ERROR", // Current working directory error
  TEXTENCODER_ERROR = "TEXTENCODER_ERROR", // TextEncoder error
}

export class InitialisationError extends Data.TaggedError(
  "InitialisationError",
) {
  constructor(params: {
    message: string;
    cause: InitialisationFailure;
    interaction?: Ora;
  }) {
    params.interaction?.fail(params.message);
    super();
  }

  static fromFailure(
    failure: InitialisationFailure,
    interaction?: Ora,
  ): InitialisationError {
    return new InitialisationError({
      message: InitialisationError.determineFaliureMessage(failure),
      cause: failure,
      ...(interaction ? { interaction } : {}),
    });
  }

  static determineFaliureMessage(failure: InitialisationFailure): string {
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
      default:
        return "Unknown error occurred";
    }
  }
}

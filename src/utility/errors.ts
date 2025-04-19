import { Data } from "effect";
import ora from "ora";

export enum InitialisationFailure {
  HOME_DIR_NOT_FOUND = "HOME_DIR_NOT_FOUND",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
}

export class InitialisationError extends Data.TaggedError(
  "InitialisationError",
) {
  constructor(params: { message: string; cause: InitialisationFailure }) {
    super();
    ora(params.message).fail();
  }

  static fromFailure(failure: InitialisationFailure): InitialisationError {
    return new InitialisationError({
      message: InitialisationError.determineFaliureMessage(failure),
      cause: failure,
    });
  }

  static determineFaliureMessage(failure: InitialisationFailure): string {
    switch (failure) {
      case InitialisationFailure.HOME_DIR_NOT_FOUND:
        return "Could not determine home directory";
      default:
        return "Unknown error occurred";
    }
  }
}

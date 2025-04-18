import { Data, Logger as EL } from "effect";

export default class Logger extends Data.TaggedClass("Logger") {
  logger = EL.make(({ logLevel, message }) => {
    globalThis.console.log(`[${logLevel.label}] ${message}`);
  });

  value = "Test";
}

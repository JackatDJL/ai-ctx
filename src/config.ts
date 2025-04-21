import { Context, Effect, Layer } from "effect";

export class ConfigService extends Context.Tag("Config")<
  ConfigService,
  {
    environment: "Live" | "Test";
  }
>() {}

export const ConfigLive = Layer.effect(
  ConfigService,
  Effect.succeed({
    environment: "Live" as const,
  }),
);

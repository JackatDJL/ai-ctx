#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import { run } from "./Cli.js";
import { Logger, LogLevel } from "effect";

run(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  // Logger.withMinimumLogLevel(LogLevel.All),
  Logger.withMinimumLogLevel(LogLevel.None),
  NodeRuntime.runMain({ disableErrorReporting: true }),
);

#!/usr/bin/env node

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import { run } from "./Cli.js";
import { Logger, LogLevel } from "effect";
import { GlobalConfigurationLive } from "./globalConfiguration.js";
import { ProjectConfigurationLive } from "./projectConfiguration.js";
import { VersionLive } from "./utility/version.js";

// Ensure all direct Node.js imports use standard format instead of node: protocol
process.env.NODE_NO_WARNINGS = '1';

run(process.argv).pipe(
  Effect.provide(NodeContext.layer),
  Logger.withMinimumLogLevel(LogLevel.Error),
  Effect.provide(GlobalConfigurationLive),
  Effect.provide(ProjectConfigurationLive),
  Effect.provide(VersionLive),
  NodeRuntime.runMain({ disableErrorReporting: true }),
);

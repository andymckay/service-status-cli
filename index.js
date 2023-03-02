#! /usr/bin/env node

import { Command, Option } from "commander";
import { main } from "./modules/main.js";
import { loggingLevels, exitCodes } from "./modules/constants.js";
import logger from "cli-logger";

const program = new Command();

program
  .version("0.0.1")
  .description("CLI to see status for a service")
  .argument("[service]", "service to check status for")
  .option("-v, --verbose", "verbose mode")
  .option("--web", "open web page for service")
  .option("--list", "list the services available")
  .addOption(
    new Option("-q, --quiet", "quiet mode")
      .conflicts("verbose")
      .conflicts("list")
      .conflicts("web")
  )
  .action((requested_service, component, options) => {
    if (options.quiet) {
      options.log = logger({ level: loggingLevels.error });
    } else {
      if (options.verbose) {
        options.log = logger({ level: loggingLevels.info });
        options.log.info("Logging set to: verbose");
      } else {
        options.log = logger({ level: loggingLevels.warn });
      }
    }

    try {
      main(requested_service, options);
    } catch (e) {
      if (options.verbose) {
        console.error(e);
      }
      process.exit(exitCodes.error);
    }
  });

program.parse();

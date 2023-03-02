import ora from "ora";
import { listServices, findService } from "./services.js";
import { loggingLevels, exitCodes, statusLevels } from "./constants.js";

export async function main(requested_service, options) {
  let throbber = null;
  options.log.info(`Got service: ${requested_service}`);

  if (options.list) {
    listServices(options);
    process.exit(exitCodes.ok);
  }

  if (!requested_service) {
    options.log.error("No service specified");
    process.exit(exitCodes.error);
  }

  let service = null;
  try {
    service = findService(requested_service, options);
  } catch (e) {
    options.log.error(e.message);
    process.exit(exitCodes.error);
  }

  if (options.log.level() === loggingLevels["warn"] && !options.web) {
    let msg = requested_service;
    throbber = ora(msg, { spinner: "noise" }).start();
  }

  if (options.web) {
    service.openWeb();
    process.exit(exitCodes.ok);
  }

  let result = null;
  try {
    result = await service.getStatus();
  } catch (e) {
    if (throbber) {
      throbber.fail();
    }
    options.log.error(e.message);
    process.exit(exitCodes.error);
  }
  options.log.info(`For ${requested_service} got status: ${result}`);
  if (throbber) {
    if (result === statusLevels.ok) {
      throbber.succeed();
    } else if (
      [statusLevels.partial, statusLevels.maintenance].includes(result)
    ) {
      throbber.warn();
    } else {
      throbber.fail();
    }
  }
  process.exit(result ? exitCodes.ok : exitCodes.major);
}

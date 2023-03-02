import ora from "ora";
import { listServices, findService } from "./services.js";
import {
  loggingLevels,
  exitCodes,
  statusLevels,
  statusToExitCode,
} from "./constants.js";

export async function main(requested_service, options) {
  let throbber = null;
  options.log.info(`Got service: ${requested_service}`);

  if (options.list) {
    listServices(options);
    process.exitCode = exitCodes.ok;
    return;
  }

  if (!requested_service) {
    options.log.error(
      "No service specified, use --list to see available services"
    );
    process.exitCode = exitCodes.error;
    return;
  }

  let service = null;
  service = findService(requested_service, options);

  if (options.log.level() === loggingLevels["warn"] && !options.web) {
    let msg = `${service.data.name}`;
    throbber = ora(msg, { spinner: "noise" }).start();
  }

  if (options.web) {
    service.openWeb();
    return;
  }

  let result = null;
  try {
    result = await service.getStatus();
  } catch (e) {
    if (throbber) {
      throbber.fail();
    }
    options.log.error(e.message);
    process.exitCode = exitCodes.error;
    return;
  }
  options.log.info(`For ${requested_service} got status: ${result}`);
  if (throbber) {
    throbber.text = `${service.data.name} 👉 ${result.toLowerCase()}`;
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

  process.exitCode = statusToExitCode[result];
}

import process from "process";
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
  options.log.info(`User requested service: ${requested_service}`);

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

  try {
    await service.getStatus();
  } catch (e) {
    if (throbber) {
      throbber.fail();
    }
    options.log.error(e.message);
    process.exitCode = exitCodes.error;
    return;
  }
  options.log.info(`Got status: ${service.status}`);
  if (service.description) {
    options.log.info(`Got description: ${service.description}`);
  }
  if (throbber) {
    if (service.status === statusLevels.ok) {
      throbber.text = `${service.data.name} 👉 ${service.status.toLowerCase()}`;
      throbber.succeed();
    } else if (
      [statusLevels.partial, statusLevels.maintenance].includes(service.status)
    ) {
      // If we can find a meaningful description, show it.
      let desc = service.description ? `\n "${service.description}"` : "";
      throbber.text = `${
        service.data.name
      } 👉 ${service.status.toLowerCase()}${desc} see: ${service.data.web}`;
      throbber.warn();
    } else {
      throbber.text = `${
        service.data.name
      } 👉 ${service.status.toLowerCase()} see: ${service.data.web}`;
      throbber.fail();
    }
  }
  options.log.info(`Exit code: ${statusToExitCode[service.status]}`);
  process.exitCode = statusToExitCode[service.status];
}

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
  options.log.info(`For ${requested_service} got status: ${service.status}`);
  if (throbber) {
    if (service.status === statusLevels.ok) {
      throbber.text = `${service.data.name} 👉 ${service.status.toLowerCase()}`;
      throbber.succeed();
    } else if (
      [statusLevels.partial, statusLevels.maintenance].includes(service.status)
    ) {
      throbber.text = `${
        service.data.name
      } 👉 ${service.status.toLowerCase()} \n"${service.description}" see: ${
        service.data.web
      }`;
      throbber.warn();
    } else {
      throbber.text = `${
        service.data.name
      } 👉 ${service.status.toLowerCase()} see: ${service.data.web}`;
      throbber.fail();
    }
  }

  process.exitCode = statusToExitCode[service.status];
}

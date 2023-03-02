import { Command, Option } from "commander";
import ora from "ora";
import logger from "cli-logger";
import fs from "fs";
import Parser from "rss-parser";
import open from "open";

const program = new Command();
const parser = new Parser();

const loggingLevels = {
  info: 30, // If set to verbose, will log at this level.
  warn: 40, // Default.
  error: 50, // If set to quiet, will log at this level.
};

const statusLevels = {
  ok: "Operational",
  partial: "Partial Outage",
  major: "Major Outage",
  maintenance: "Maintenance",
};

const exitCodes = {
  ok: 0,
  error: 1,
  partial: 2,
  major: 3,
  maintenance: 4,
};

class Service {
  constructor(data, options) {
    this.data = data;
    this.options = options;
  }

  getStatusURL() {
    return this.data.urls?.status || null;
  }

  async getJSON(url) {
    url = url || this.getStatusURL();
    this.options.log.info(
      `Getting JSON for service: ${this.data.name} from: ${url}`
    );
    return await fetch(url).then((res) => {
      if (!res.ok) {
        throw new Error(`Error from: ${url}, got status code: ${res.status}.`);
      }
      return res.json();
    });
  }

  async getRSS(url) {
    url = url || this.getStatusURL();
    this.options.log.info(
      `Getting RSS for service: ${this.data.name} from: ${url}`
    );
    return await parser.parseURL(url);
  }

  openWeb() {
    this.options.log.info(`Opening web page for: ${this.data.name}`);
    open(this.data.web);
  }

  getComponents() {
    return this.data.components;
  }
}

class Atlassian extends Service {
  getStatusURL() {
    return super.getStatusURL() || `${this.data.web}api/v2/status.json`;
  }

  async getStatus(component) {
    return await this.getJSON(this.getStatusURL()).then((data) => {
      if (data.status.indicator == "none") {
        return true;
      }
    });
  }
}

class Salesforce extends Service {
  async getStatus(component) {
    return await this.getJSON().then((data) => {
      return data.data.every((x) => x.attributes.color == "green");
    });
  }
}

class Automattic extends Service {
  async getStatus(component) {
    return await this.getRSS().then((data) => {
      return data.items.every((x) => x.title.endsWith("- Operational"));
    });
  }
}

class StatusIO extends Service {
  async getStatus(component) {
    return await this.getJSON().then((data) => {
      return data.result["status_overall"].status == "Operational";
    });
  }
}

class Slack extends Service {
  async getStatus(component) {
    return await this.getJSON().then((data) => {
      return data.status != "active";
    });
  }
}

const service_map = {
  atlassian: Atlassian,
  salesforce: Salesforce,
  automattic: Automattic,
  "status.io": StatusIO,
  slack: Slack,
};

function listServices(options) {
  const services = fs.readdirSync("services");
  // Note user has asked for a list of services, so we'll set to warn so it outputs to stdout.
  options.log.warn("Available services:");
  services.forEach((service) => {
    options.log.warn(`- ${service.replace(".json", "")}`);
  });
}

function findService(requested_service, options) {
  let data = null;
  try {
    options.log.info(
      `Looking for service: ${requested_service} at services/${requested_service}.json`
    );
    data = fs.readFileSync(`services/${requested_service}.json`, "utf8");
  } catch (e) {
    throw new Error(`Could not find a service named: ${requested_service}`);
  }

  let parsed = null;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    throw new Error(`Could not parse the service: ${requested_service}`);
  }
  options.log.info(`Found data for: ${requested_service}`);

  if (!service_map[parsed.host]) {
    throw new Error(
      `Could not parse service: ${requested_service} as host: ${parsed.host}`
    );
  }

  return new service_map[parsed.host](parsed, options);
}

async function main(requested_service, component, options) {
  let throbber = null;
  options.log.info(`Got service: ${requested_service}`);
  if (component) {
    options.log.info(`Got component: ${component}`);
  }

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
    let msg = component
      ? `${requested_service} 👉 ${component}`
      : requested_service;
    throbber = ora(msg, { spinner: "noise" }).start();
  }

  if (options.components) {
    if (throbber) {
      throbber.clear();
    }
    options.log.warn(`Components for ${requested_service}:`);
    for (let c of service.getComponents()) {
      options.log.warn(`- ${c} use ${requested_service}:${c} to check status`);
    }
    process.exit(exitCodes.ok);
  }

  if (options.web) {
    service.openWeb();
    process.exit(exitCodes.ok);
  }

  let result = null;
  try {
    result = await service.getStatus(component);
  } catch (e) {
    if (throbber) {
      throbber.fail();
    }
    options.log.error(e.message);
    process.exit(exitCodes.error);
  }
  options.log.info(`For ${requested_service} got status: ${result}`);
  if (throbber) {
    if (result) {
      throbber.succeed();
    } else {
      throbber.fail();
    }
  }
  process.exit(result ? exitCodes.ok : exitCodes.major);
}

program
  .version("0.0.1")
  .description("CLI to see status for a service")
  .argument("[service]", "service to check status for")
  .argument("[component]", "optional component to check status for")
  .option("-v, --verbose", "verbose mode")
  .option("--web", "open web page for service")
  .option("--list", "list the services available")
  .addOption(new Option("--components", "list the components for a service"))
  .addOption(
    new Option("-q, --quiet", "quiet mode")
      .conflicts("verbose")
      .conflicts("list")
      .conflicts("components")
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
      main(requested_service, component, options);
    } catch (e) {
      if (options.verbose) {
        console.error(e);
      }
      process.exit(exitCodes.error);
    }
  });

program.parse();

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
}

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
    return await fetch(url).then((res) => res.json());
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
}

class Atlassian extends Service {
  getStatusURL() {
    return super.getStatusURL() || `${this.data.web}api/v2/status.json`;
  }

  async getStatus() {
    return await this.getJSON(this.getStatusURL()).then((data) => {
      return data.status.indicator == "none";
    });
  }
}

class Salesforce extends Service {
  async getStatus() {
    return await this.getJSON().then((data) => {
      return data.data.every((x) => x.attributes.color == "green");
    });
  }
}

class Automattic extends Service {
  async getStatus() {
    return await this.getRSS().then((data) => {
      return data.items.every((x) => x.title.endsWith("- Operational"));
    });
  }
}

class StatusIO extends Service {
  async getStatus() {
    return await this.getJSON().then((data) => {
      return data.result["status_overall"].status == "Operational";
    });
  }
}

class Slack extends Service {
  async getStatus() {
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
    data = fs.readFileSync(`services/${requested_service}.json`, "utf8");
  } catch (e) {
    options.log.error(`Could not find service: ${requested_service}`);
    throw e;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(data);
  } catch (e) {
    options.log.error(`Could not parse service: ${requested_service}`);
    throw e;
  }
  options.log.info(`Found data for: ${requested_service}`);

  if (!service_map[parsed.host]) {
    options.log.error(
      `Could not parse service: ${requested_service} as host: ${parsed.host}`
    );
    throw new Error();
  }

  const Service = service_map[parsed.host];
  return new Service(parsed, options);
}

async function main(requested_service, options) {
  let throbber = null;
  if (options.list) {
    listServices(options);
    process.exit(0);
  }

  if (!requested_service) {
    options.log.error("No service specified");
    process.exit(0);
  }

  if (!options.quiet && !options.json && !options.verbose && !options.web) {
    throbber = ora(requested_service, { spinner: "noise" }).start();
  }

  const service = findService(requested_service, options);
  if (options.web) {
    service.openWeb();
    process.exit(0);
  }

  const result = await service.getStatus();
  options.log.info(`For ${requested_service} got status: ${result}`);
  if (options.json) {
    console.log({
      status: result,
      service: service.data.name,
      url: service.getStatusURL(),
      web: service.data.web,
    });
  }

  if (throbber) {
    if (result) {
      throbber.succeed();
    } else {
      throbber.fail();
    }
  }
  process.exit(result ? 1 : 0);
}

program
  .version("0.0.1")
  .description("CLI to see status for a service")
  .argument("[service]", "service to check status for")
  .option("-v, --verbose", "verbose mode")
  .option("--web", "open web page for service")
  .option("--list", "list the services available")
  .addOption(new Option("-j, --json", "output json").conflicts("verbose"))
  .addOption(new Option("-q, --quiet", "quiet mode").conflicts("verbose"))
  .action((requested_service, options) => {
    if (options.json || options.quiet) {
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
      process.exit(1);
    }
  });

program.parse();

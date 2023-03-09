import open from "open";
import Parser from "rss-parser";
import { statusLevels } from "./constants.js";
import { get, list } from "service-status-data";

const parser = new Parser();

class Service {
  constructor(data, options) {
    this.data = data;
    this.options = options;
    this.status = null;
    this.description = null;
  }

  getStatusURL() {
    return this.data.urls?.status || null;
  }

  async getJSON(url) {
    url = url || this.getStatusURL();
    this.options.log.info(
      `Getting JSON for service: ${this.data.name} from: ${url}`
    );
    return await fetch(url)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error got status code: ${res.status}.`);
        }
        return res.json();
      })
      .catch((error) => {
        throw new Error(`Failed to fetch URL: ${url}, got ${error}`);
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
    // If we end up with duplicate /, the regex should strip them.
    return (
      super.getStatusURL() ||
      `${this.data.web}/api/v2/status.json`.replace(/([^:]\/)\/+/g, "$1")
    );
  }

  async getStatus() {
    return await this.getJSON(this.getStatusURL()).then((data) => {
      this.status = statusLevels.partial;
      if (data.status.indicator == "none") {
        this.status = statusLevels.ok;
      } else if (data.status.indicator == "minor") {
        this.status = statusLevels.partial;
      }
      this.description = data.status.description;
    });
  }
}

class Salesforce extends Service {
  async getStatus() {
    return await this.getJSON().then((data) => {
      this.status = statusLevels.partial;
      if (data.data.every((x) => x.attributes.color == "green")) {
        this.status = statusLevels.ok;
      }
    });
  }
}

class Automattic extends Service {
  async getStatus() {
    return await this.getRSS().then((data) => {
      this.status = statusLevels.partial;
      if (data.items.every((x) => x.title.endsWith("- Operational"))) {
        this.status = statusLevels.ok;
      }
    });
  }
}

class StatusIO extends Service {
  async getStatus() {
    return await this.getJSON().then((data) => {
      this.status = statusLevels.partial;
      if (data.result["status_overall"].status == "Operational") {
        this.status = statusLevels.ok;
      }
    });
  }
}

class Slack extends Service {
  async getStatus() {
    return await this.getJSON().then((data) => {
      if (!data.status) {
        this.status = statusLevels.error;
      }
      if (data.status == "active") {
        this.status = statusLevels.partial;
      } else {
        this.status = statusLevels.ok;
      }
      if (data.active_incidents) {
        this.description = data.active_incidents[0]?.title;
      }
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

export function findService(requested_service, options) {
  let data = null;
  try {
    data = get(requested_service);
  } catch (e) {
    throw new Error(`Could not find a service named: ${requested_service}`);
  }

  options.log.info(`Found configuration for: ${requested_service} with host: ${data.host}`);

  if (!service_map[data.host]) {
    throw new Error(
      `Could not parse service: ${requested_service} as host: ${data.host}`
    );
  }

  return new service_map[data.host](data, options);
}

export function listServices(options) {
  const services = list();
  // Note user has asked for a list of services, so we'll set to warn so it outputs to stdout.
  options.log.warn("Available services:");
  services.forEach((service) => {
    options.log.warn(`- ${service.replace(".json", "")}`);
  });
}

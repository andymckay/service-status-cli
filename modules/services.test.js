import { findService } from "./services.js";
import { statusLevels } from "./constants.js";
import { expect, test } from "vitest";

/* Current hack to get vitest to work with node-fetch and figure out which mock to use
   is to parse the test name to determine which mock to use. This is a hack, probably a much
    better way to do this.
    
    test("[name of service] some test description [#file.json]")

    For example:

    test("github is good with no incident description #github-good.json")

    Will mock the URL that github uses and return the contents of the file github-good.json 
    file in the test.
*/

test("slack partial #slack-2023-03-02.json", () => {
  let service = findService("slack", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.partial);
    expect(service.description).toBe(
      "Some users may experience issues accessing api.slack.com"
    );
  });
});

test("slack good #slack-good.json", () => {
  let service = findService("slack", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.ok);
  });
});

test("github good #github-good.json", () => {
  let service = findService("github", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.ok);
  });
});

test("github partial #github-2023-03-02.json", () => {
  let service = findService("github", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.partial);
  });
});

test("trello partial #trello-2023-03-02.json", () => {
  let service = findService("trello", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.partial);
  });
});

test("docker good #docker-good.html", () => {
  let service = findService("docker", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.ok);
  });
});

test("planetscale good #planetscale-good.json", () => {
  let service = findService("planetscale", { log: console });
  service.getStatus().then(() => {
    expect(service.status).toBe(statusLevels.ok);
  });
});
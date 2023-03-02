import { afterAll, beforeEach, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";
import { rest } from "msw";
import fs from "fs";

function getExample(file) {
  return JSON.parse(fs.readFileSync(`./examples/${file}`));
}

let hosts = {
  slack: "https://status.slack.com/api/v2.0.0/current",
  github: "https://www.githubstatus.com/api/v2/status.json",
  trello: "https://trello.status.atlassian.com/api/v2/status.json",
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

beforeEach(async (test) => {
  let file = test.meta.name.split("#")[1];
  if (file === undefined) {
    return;
  }
  let host = test.meta.name.split(" ")[0];
  if (hosts[host] === undefined) {
    return;
  }
  let restHandlers = [
    rest.get(hosts[host], (req, res, ctx) => {
      console.log(`Mocking ${hosts[host]} with ${file}`);
      return res(ctx.status(200), ctx.json(getExample(file)));
    }),
  ];

  server.use(...restHandlers);
});

afterEach(() => server.resetHandlers());

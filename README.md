A command line interface to query the status page of internet service providers and provide a uniform response.

## Service data

There is a list of services that comes from [this repository](https://github.com/andymckay/service-status-data). Currently this is a very limited number of services, but we'd love more. Please add your service into that repo and it will get updated.

## Installation

```bash
npm i service-status-cli
```

## Usage

This library installs itself as the `status` command.

`status [service]` returns the status for that service.

For example when something is `Operational`:

```bash
➜  $ status github
✔ GitHub 👉 operational
```

`Partial Outage` or in `Maintenance`:

```bash
➜  $ status slack
⚠ slack 👉 partial outage
"Slowness searching in Slack" see: https://status.slack.com/
```

### Options

- `--list` returns the services available.
- `--web` opens the web page for the service in your browser.
- `--all` returns the status for all services.
- `-v` or `--verbose` get verbose logging, including URL to the endpoint used.
- `-q` suppress all output, except errors. Exit codes are returned see below 👇

### Exit codes

The CLI will exit with certain exit codes depending upon the result:

| Exit code | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| `0`       | The command completed succesfully, or the service is `Operational`. |
| `1`       | The command had an error unrelated to the service status.           |
| `2`       | The service has a `Partial Outage`.                                 |
| `3`       | The service has a `Major Outage`                                    |
| `4`       | The service is in `Maintenance`.                                    |

## Service status

This library is taking multiple different services and trying to apply a standard to them. This is inherently lossy and imperfect. However there's some common themes in the statuses that systems use and we try to use [^1]

| Status           | Description                                                             |
| ---------------- | ----------------------------------------------------------------------- |
| `Operational`    | No incidents reported.                                                  |
| `Partial Outage` | A partial or minor incident declared in some components by the service. |
| `Major Outage`   | A major incident declared by the service.                               |
| `Maintenance`    | Service is in a maintenance window.                                     |

[^1]: Expecting this will evolve rapidly if services get added.

## Development

Pull requests and issues are welcome.

**Note:** Testing is currently pinned to node 19.4.0 as per the Action, because that's the version that `msw` seems to work on. To test:

```bash
npm test
```

See [vitest](https://vitest.dev/) for more information about the test framework.

A command line interface to query the status page of internet service providers and provide a uniform response.

This is currently very much a work in progress and is not in a stable state.

## Service data

There is a list of services that comes from [this repository](https://github.com/andymckay/service-status-data). Currently this is a very limited number of services, but we'd love more. Please add your service into that repo and it will get updated.

## Installation

```bash
npm i service-status-cli
```

## Usage

`service [service]` returns the status for that service.

For example when something is good:

```bash
➜  $ status github
✔ github
```

Partial outage or in maintenance:

```bash
➜  $ status github
⚠ github
```

Major outage:

```bash
➜  $ status github
✖ github
```

### Options

- `--list` returns the services available.
- `--web` opens the web page for the service in your browser.
- `-v` or `--verbose` get verbose logging
- `-q` suppress all output, except errors.

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
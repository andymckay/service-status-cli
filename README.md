A cli to match data from this repo: https://github.com/andymckay/service-status-data

Very much a work in progress at this point. But we might end up with something better than this:

```
➜  service-status-cli git:(main) ✗ status github
✔ github
➜  service-status-cli git:(main) ✗ status slack
✖ slack
➜  service-status-cli git:(main) ✗ status slack --json
{
  status: false,
  service: 'slack',
  url: 'https://status.slack.com/api/v2.0.0/current',
  web: 'https://status.slack.com/'
}
```

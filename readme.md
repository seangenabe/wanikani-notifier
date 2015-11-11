# wanikani-notifier

WaniKani new lessons and reviews notifier

## Usage

### Install

It is preferred to install this package globally.

    npm i -g seangenabe/wanikani-notifier

### API key

To pass the API key, you can:
* Pass it as an argument (`start`, `install`)
* Set it using `npm config` ([docs](https://docs.npmjs.com/misc/config)):
  ```bash
  $ npm config wanikani-notifier:key MY_WANIKANI_API_KEY
  ```

### CLI

The notifier, when run, will query the WaniKani API for pending lessons and reviews.
If there are no pending items, it will suspend until the next review time.

`wanikani-notifier`
`wanikani-notifier -h`
`wanikani-notifier --help`

Shows usage information.

`wanikani-notifier start API_KEY`

Starts the notifier.

Arguments:

* `API_KEY`: Your WaniKani public API key. You can find this under Menu > Account.

`wanikani-notifier install API_KEY`

Installs the notifier to be called at startup. Requires global install.
Currently Windows-only. (Suggestions welcome)

Arguments:

* `API_KEY`: Your WaniKani public API key. You can find this under Menu > Account.

`wanikani-notifier uninstall`

Uninstalls the notifier from startup.

### API

`require('wanikani-notifier')` will return the WaniKaniNotifier class.

`new WaniKaniNotifier(config)`

Creates a new instance of the WaniKaniNotifier class.

* `config.key`: Your WaniKani public API key. You can find this under Menu > Account.
* `config.errorSuspendDuration`: How long to wait after encountering an error, in milliseconds. Default: 5 minutes
* `config.notifiedSuspendDuration`: How long to wait after delivering a notification, in milliseconds. Default: 10 minutes
* `config.waitingSuspendDuration`: At least how long to wait after determining that there are no pending items, in milliseconds. Default: 36 seconds
* `config.dashboardOnBothPending`: Whether to go to the dashboard when there are both pending lessons and reviews. Default: false--goes to the lessons page.
* `config.minilag`: A small amount of time to ensure pending items will be available the next time they will be queried, in milliseconds. Default: 1 second.

`notifier.start()`

Starts the notifier loop.

Returns:
* `Promise`: Resolved when the notifier loop ends (that is, after the notifier is stopped).

`notifier.stop()`

Stops the notifier loop.

`notifier.process()`

Represents a single run of the notifier loop. Queries the WaniKani API for any pending items.

Returns:
* `Promise`: Resolves with a `Number` representing the recommended number of milliseconds to suspend operation.

`WaniKaniNotifier.console()`

Runs the CLI. Internal use only, API usage not recommended as it makes assumptions about the environment
(i.e. process.exit)

`WaniKaniNotifier.getStartupPath()`

Gets the path where the notifier installs the startup file.

Returns:
* `Promise`: Resolves with a `String` representing the path where the notifier installs the startup file.

## License

MIT

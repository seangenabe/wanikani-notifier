# wanikani-notifier

[![Greenkeeper badge](https://badges.greenkeeper.io/seangenabe/wanikani-notifier.svg)](https://greenkeeper.io/)

WaniKani new lessons and reviews notifier

## Usage

### Install

**Package installation**

Install the package globally:

```
npm i -g wanikani-notifier
```

**Config file (Required!)**

Create a file called `.wanikani-notifierrc` in your home directory (`C:\Users\{user}` on Windows).

Powered by [rc](https://www.npmjs.com/package/rc).

You can put options in either JSON or INI format. See the `rc` documentation for details.

Options:
* `key` - **Required.** Your WaniKani Public API key. Get and manage your API key at https://www.wanikani.com/account .
* `errorSuspendDuration` - How long to wait after encountering an error, in milliseconds. Default: 5 minutes
* `notifiedSuspendDuration` - How long to wait after delivering a notification, in milliseconds. Default: 10 minutes
* `waitingSuspendDuration` - At least how long to wait after determining that there are no pending items, in milliseconds. Default: 36 seconds
* `dashboardOnBothPending` - Whether to go to the dashboard when there are both pending lessons and reviews. Default: `false` -- goes to the lessons page.
* `minilag` - A small amount of time to ensure pending items will be available the next time they are scheduled to be queried, in milliseconds. Default: 1 second.

### Configure to run at startup

After package installation, run:

```
wanikani-notifier install
```

This will install _and_ run the service.

(Alias: `i`)

To uninstall, run

```
wanikani-notifier uninstall
```

(Alias: `un`)

### CLI

Run using the installed global package:

```
wanikani-notifier [opts]
```

The notifier, when run, will query the WaniKani API for pending lessons and reviews.
If there are no pending items, it will suspend until the next review time.

It will continue running until closed from the terminal.

Options are the same as the config file's. Pass options kebab-cased. Powered by [meow](https://www.npmjs.com/package/meow).

### API

This package has an [API](./API.md), but it's in a different page since you'll most likely be interested in actually running it _or_ the underlying source code (in which case the interesting bits are in [wanikani-emitter](https://www.npmjs.com/package/wanikani-emitter)).

## License

MIT

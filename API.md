# API

`require('wanikani-notifier')` will return the WaniKaniNotifier class.

## new WaniKaniNotifier(config)

Creates a new instance of the WaniKaniNotifier class.

## notifier.start()

Starts the notifier loop.

Returns:
* `Promise`: Resolved when the notifier loop ends (that is, after the notifier is stopped).

## notifier.stop()

Stops the notifier loop.

## notifier.process()

Represents a single run of the notifier loop. Queries the WaniKani API for any pending items.

Returns:
* `Promise`: Resolves with a `Number` representing the recommended number of milliseconds to suspend operation.

const Util = require('util')
const puff = require('puff/dynamic')
const Notifier = puff(require('node-notifier'), { bind: 'original' })
const WaniKaniEmitter = require('wanikani-emitter')
const open = require('opn')
const meow = require('meow')
const rc = require('rc')
const pkg = require('../package')
const ServiceManager = require('./service-manager')
const FS = require('node-puff/fs')

const dlog = Util.debuglog('wanikani-notifier').bind(Util)

function humanize(duration) {
  return `${Math.floor(duration / 1000 / 60)} minutes`
}

class WaniKaniNotifier extends WaniKaniEmitter {

  constructor(config) {
    super(config)

    config = Object.assign({
      dashboardOnBothPending: false,
      log: dlog
    }, config)

    const log = this.log = config.log
    this.config = config

    if (!config.key) {
      log("API key not specified")
      Notifier.notify({
        title: "WaniKani Notifier",
        message: "API key not specified"
      })
      throw new Error("API key not specified. See the documentation for instructions.")
    }

    this.on('log_scheduled', duration => {
      log(`Will check back in ${humanize(duration)} minutes`)
    })

    this.on('error', err => {
      log(`Error: ${err.message}`)
    })

    this.on('log_timediff', timeDifference => {
      let absoluteTD = Math.abs(timeDifference)
      let behindAhead = (timeDifference < 0) ? 'behind' : 'ahead'
      log(`Response time is ${absoluteTD} ms ${behindAhead} of local time`)
    })

    this.on('notify', lastNotification => {
      let { lessons, reviews } = lastNotification
      let messages = []
      if (lessons) {
        messages.push(`${lessons} pending lessons`)
      }
      if (reviews) {
        messages.push(`${reviews} pending reviews`)
      }
      let message = `You have ${messages.join(" and ")}.`
      Notifier.notify({
        title: "WaniKani Notifier",
        message,
        sound: true,
        wait: true
      })
      log(message)
    })

    this.on('log_untouched', () => {
      log("You haven't touched your items yet since the last notification.")
    })

    this.on('log_nopending', duration => {
      log(`No pending items. Your next review will be in ${humanize(duration)} minutes.`)
    })

    Notifier.on('click', () => {
      log("Notification clicked.")
      let lessons = this.lastNotification.lessons
      let reviews = this.lastNotification.reviews
      let link
      if (lessons && reviews) {
        if (this.config.dashboardOnBothPending) {
          link = 'https://www.wanikani.com/dashboard'
        }
        else {
          link = 'https://www.wanikani.com/lesson'
        }
      }
      else if (lessons) {
        link = 'https://www.wanikani.com/lesson'
      }
      else if (reviews) {
        link = 'https://www.wanikani.com/review'
      }
      else {
        return
      }

      this.log(`Opening ${link}.`)
      open(link)
    })
  }

  static async console() {
    try {
      let cli = meow(`
  Usage
    wanikani-notifier [opts]
    wanikani-notifier install | i
    wanikani-notifier uninstall | un
`,
        {}
      )
      let [command] = cli.input
      if (command) {
        switch (command) {
          case 'reinstall':
            try {
              await ServiceManager.reinstall()
              await ServiceManager.start()
            }
            catch (err) {}
          case 'install':
          case 'i':
            await ServiceManager.install()
            await ServiceManager.start()
            Notifier.notify({
              title: "WaniKani Notifier",
              message: "Installed."
            })
            return
          case 'install-only':
            await ServiceManager.install()
            return
          case 'uninstall':
          case 'un':
            await ServiceManager.stop()
            await ServiceManager.uninstall()
            return
          default:
            throw new Error(`Unknown command: ${command}.`)
        }
      }
      let opts = cli.flags
      if (opts.asService) {
        await FS.appendFile(`${__dirname}/lock`, `${process.pid}\n`)
        process.once('SIGINT', () => {
          FS.unlinkSync(`${__dirname}/lock`)
        })
      }
      opts = Object.assign({}, opts, rc(pkg.name))
      let notifier = new WaniKaniNotifier(opts)
      await notifier.start()
    }
    catch (err) {
      await Notifier.notify({
        title: "WN: Error occured.",
        message: err.message
      })
      throw err
    }
  }


}

module.exports = WaniKaniNotifier

if (require.main === module) {
  WaniKaniNotifier.console()
}

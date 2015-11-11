'use strict'

const chalk = require('chalk')
const Moment = require('moment')
const Notifier = require('node-notifier')
const open = require('open')
const Util = require('util')
const WaniKaniEmitter = require('wanikani-emitter')

class WaniKaniNotifier extends WaniKaniEmitter {

  constructor(config) {
    super(config)

    config.key = config.key || process.env.npm_package_config_key
    config.dashboardOnBothPending = config.dashboardOnBothPending ||
      process.env.npm_package_config_dashboard_on_both_pending ||
      false
    config.errorSuspendDuration = config.errorSuspendDuration ||
      process.env.npm_package_config_error_suspend_duration
    config.notifiedSuspendDuration = config.notifiedSuspendDuration ||
      process.env.npm_package_config_notified_suspend_duration
    config.waitingSuspendDuration = config.waitingSuspendDuration ||
      process.env.npm_package_config_waiting_suspend_duration
    config.minilag = config.minilag ||
      process.env.npm_package_config_minilag
    config.log = console.log
    config.debuglog = Util.debuglog('wanikani-notifier')
    this.log = log
    this.debuglog = debuglog
    this.config = config

    if (!key) {
      debuglog("API key not specified")
      throw new Error("API key not specified.")
    }

    this.on('log_scheduled', (duration) => {
      config.log(chalk.yellow("Will check back in " +
        Moment.duration(duration).humanize()))
    })

    this.on('error', err => {
      config.debuglog(chalk.red(err.message))
    })

    this.on('log_timediff', timeDifference => {
      let absoluteTD = Math.abs(timeDifference)
      let behindAhead = (timeDifference < 0) ? 'behind' : 'ahead'
      config.log(chalk.dim(
        `Response time is ${absoluteTD} milliseconds ${behindAhead} of local time.`
      ))
    })

    this.on('notify', (lastNotification) => {
      let { lessons, reviews } = lastNotification
      let messages = []
      if (lessons) {
        messages.push(lessons + " pending lessons")
      }
      if (reviews) {
        messages.push(reviews + " pending reviews")
      }
      var message = "You have " + messages.join(" and ") + "."
      Notifier.notify({
        title: "WaniKani Notifier",
        message: message,
        sound: true,
        wait: true
      })
      config.log(chalk.bold(message))
      config.log("Notification sent.")
    })

    this.on('log_untouched', function() {
      config.log("You haven't touched your items yet since the last notification.")
    })

    this.on('log_nopending', function(duration) {
      config.log(chalk.yellow("No pending items. Your next review will be in " +
        Moment.duration(duration).humanize()))
    })

    Notifier.on('click', () => {
      config.log('Notification clicked.')
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

      this.log('Opening ' + link)
      open(link)
    })
  }

  static console() {
    var nomnom = require('nomnom')()
    var FS = require('fs')
    var Readline = require('readline')

    var apiKeyOption = {
      abbr: 'k',
      help: "Your WaniKani public API key. You can find this under Menu > Account.",
      metavar: 'API_KEY',
      position: 1
    }

    async function promptForKey(key) {
      if (key) return key
      key = process.env.npm_package_config_key
      if (key) return key

      var i = Readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      key = await new Promise(function(resolve) {
        i.question(chalk.bold("API key: "), function(k) {
          resolve(k)
        })
      })
      i.close()
      if (key) return key

      throw new Error("API key not specified.")
    }

    var start = nomnom.command('start')
    start.help("Starts the notifier.")
    start.option('key', apiKeyOption)
    start.callback(async function(opts) {
      try {
        var key = await promptForKey(opts.key)
        var notifier = new WaniKaniNotifier({key})
        await notifier.start()
      }
      catch (err) {
        console.log(chalk.red(err.message))
        process.exit(1)
      }
    })

    var install = nomnom.command('install')
    install.help("Installs the notifier to be called at startup. Requires global install. Currently Windows-only.")
    install.option('key', apiKeyOption)
    install.callback(async function(opts) {
      var startupPath = await WaniKaniNotifier.getStartupPath()
      var key
      try {
        key = await promptForKey(opts.key)
      }
      catch (err) {
        console.log(chalk.red(err.message))
        process.exit(1)
      }
      FS.writeFileSync(startupPath, "wanikani-notifier start " + key)
    })

    var uninstall = nomnom.command('uninstall')
    uninstall.help("Uninstalls the notifier from startup.")
    uninstall.callback(async function(opts) {
      var startupPath = await WaniKaniNotifier.getStartupPath()
      FS.unlinkSync(startupPath)
    })

    nomnom.parse()
  }

  static async getStartupPath() {
    var OS = require('os')
    var Path = require('path')
    var ChildProcess = require('child_process')
    // Windows
    if (OS.platform() === 'win32') {
      var regQueryOutput = await new Promise(function(resolve, reject) {
        ChildProcess.exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" ' +
        '/v Startup', function(error, stdout, stderr) {
          if (error) {
            reject(error)
            return
          }
          resolve(stdout)
        })
      })
      var startup = regQueryOutput.split(OS.EOL)[2].match(/\s+Startup\s+REG_SZ\s+(.*)/)[1]
      return Path.join(startup, 'wanikani-notifier-startup.cmd')
    }
  }

}

module.exports = WaniKaniNotifier

if (require.main === module) {
  WaniKaniNotifier.console()
}

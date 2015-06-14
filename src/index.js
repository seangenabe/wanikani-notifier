
var Request = require('request')
var Notifier = require('node-notifier')
var Delayer = require('./delayer')
var Moment = require('moment')
var chalk = require('chalk')
var open = require('open')

class WaniKaniNotifier {

  constructor(config) {
    config = config || {}
    config.key = config.key || process.env.npm_package_config_key
    if (!config.key) {
      throw new Error("API key not specified.")
    }
    config.errorSuspendDuration = config.errorSuspendDuration || 1000 * 60 * 5
    config.notifiedSuspendDuration = config.notifiedSuspendDuration || 1000 * 60 * 10
    config.waitingSuspendDuration = config.waitingSuspendDuration || 1000 * 36
    config.dashboardOnBothPending = config.dashboardOnBothPending || false
    config.minilag = config.minilag || 1000
    this.config = config
    this.lastNotification = {lessons: 0, reviews: 0}

    Notifier.on('click', () => {
      console.log('Notification clicked.')
      var lessons = this.lastNotification.lessons
      var reviews = this.lastNotification.reviews
      var link
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

      console.log('Opening ' + link)
      open(link)
    })
  }

  async start() {
    try {
      while (true) {
        var delay = await this.process()
        this.delayer = new Delayer(delay)
        await this.delayer.promise
      }
    }
    catch (err) {
      if (err.setByDelayer) return
      throw err
    }
  }

  stop() {
    if (this.delayer) {
      this.delayer.cancel()
    }
  }

  // Checks for pending notifications. Returns a time span representing the suggested next time to check for updates.
  async process() {
    // Check for new items.
    var uri = 'https://www.wanikani.com/api/v1.3/user/' + encodeURIComponent(this.config.key) + '/study-queue';

    function scheduleNextCheck(duration) {
      console.log(chalk.yellow("Will check back in " + Moment.duration(duration).humanize()))
      return duration
    }

    try {
      var response = null
      var body = await new Promise(function(resolve, reject) {
        Request(uri, function(error, _response, body) {
          if (error) {
            reject(error)
            return
          }
          response = _response
          resolve(body)
        })
      })

      var data = JSON.parse(body)
      if (data.error) {
        console.log(chalk.red("API error occured. Please make sure the configuration is correct."))
        console.error("API error occured. Please make sure the configuration is correct.")
        throw new Error(data.error.message)
      }

      // Assuming server is ahead.
      var timeDifference = new Date(response.headers.date) - new Date()
      console.log(chalk.dim("Response time is " + Math.abs(timeDifference) + " milliseconds " +
        ((timeDifference < 0) ? "behind" : "ahead") +
        " of local time."))

      var lessons = data.requested_information.lessons_available
      var reviews = data.requested_information.reviews_available
      if (lessons || reviews) {
        if (this.lastNotification.lessons != lessons || this.lastNotification.reviews != reviews) {
          var messages = []
          if (lessons) {
            messages.push(lessons + " pending lessons")
          }
          if (reviews) {
            messages.push(reviews + " pending reviews")
          }
          var message = "You have " + messages.join(" and ") + "."
          this.lastNotification = {
            lessons: lessons,
            reviews: reviews
          }
          Notifier.notify({
            title: "WaniKani Notifier",
            message: message,
            sound: true,
            wait: true
          })
          console.log(chalk.bold(message))
          console.log("Notification sent.")
        }
        else {
          console.log("You haven't touched your items yet since the last notification.")
        }
        return scheduleNextCheck(this.config.notifiedSuspendDuration)
      }

      var nextReview = data.requested_information.next_review_date * 1000;
      var timeBeforeNextReview = nextReview - timeDifference - new Date() + minilag
      console.log(chalk.yellow("No pending items. Your next review will be in " +
        Moment.duration(timeBeforeNextReview).humanize()))
      var nextDelay = Math.max(timeBeforeNextReview, this.config.waitingSuspendDuration)
      return scheduleNextCheck(nextDelay)
    }
    catch (err) {
      console.log(chalk.red(err.message))
      console.error(err)
      return scheduleNextCheck(this.config.errorSuspendDuration)
    }
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
      key = process.env.npm_package_config_key || process.env.WANIKANI_NOTIFIER_API_KEY
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
        var notifier = new WaniKaniNotifier({
          key: key
        })
        notifier.start()
      }
      catch (err) {
        console.error(err.message)
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
        console.error(err.message)
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

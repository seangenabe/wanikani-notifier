
var Catbox = require('catbox')
var CatboxMemory = require('catbox-memory')
var Request = require('request')
var Notifier = require('node-notifier')
var Delayer = require('./delayer')
var Moment = require('moment')

class WaniKaniNotifier {
  
  constructor(config) {
    this.catbox = new Catbox.Client(CatboxMemory)
    config = config || {}
    if (!config.key) {
      throw new Error("API key not specified.")
    }
    config.errorSuspendDuration |= 1000 * 60 * 5
    config.notifiedSuspendDuration |= 1000 * 60 * 10
    config.waitingSuspendDuration |= 1000 * 36
    this.config = config
    this.lastNotification = {lessons: 0, reviews: 0}
  }
  
  initialize() {
    return new Promise(function(resolve, reject) {
      this.catbox.start(function(err) {
        if (err) return reject(err)
        resolve()
      })
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
      console.log('Will check back in ' + Moment.duration(duration).humanize())
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
        console.error("API error occured. Please make sure the configuration is correct.")
        throw new Error(data.error.message)
      }

      // Assuming server is ahead.
      var timeDifference = new Date(response.headers.date) - new Date()
      console.log("Response time is " + timeDifference + " milliseconds " +
        ((timeDifference < 0) ? "behind" : "ahead") +
        " of local time.")

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
          Notifier.notify({
            title: "WaniKani Notifier",
            message: message
          })
          console.log("Notification sent.")
          this.lastNotification = {
            lessons: lessons,
            reviews: reviews
          }
        }
        else {
          console.log("You haven't touched your items yet since the last notification.")
        }
        return scheduleNextCheck(this.config.notifiedSuspendDuration)
      }

      var nextReview = data.requested_information.next_review_date * 1000;
      var timeBeforeNextReview = nextReview - timeDifference - new Date()
      console.log("No pending items. Your next review will be in " + Moment.duration(timeBeforeNextReview).humanize())
      var nextDelay = Math.max(timeBeforeNextReview, this.config.waitingSuspendDuration)
      return scheduleNextCheck(nextDelay)
    }
    catch (err) {
      console.error(err)
      return scheduleNextCheck(this.config.errorSuspendDuration)
    }
  }
  
  static console() {
    var nomnom = require('nomnom')()
    var os = require('os')
    
    nomnom.option('key', {
      abbr: 'k',
      help: "Your WaniKani public API key. You can find this under Menu > Account.",
      metavar: 'API_KEY',
      position: 1,
      required: true
    })
    
    var start = nomnom.command('start')
    start.help("Starts the notifier.")
    start.callback(function(opts) {
      var notifier = new WaniKaniNotifier({
        key: opts.key
      })
      notifier.start()
    })
    
    var install = nomnom.command('install')
    install.help("Installs the notifier to be called at startup. Requires global install. Currently Windows-only.")
    install.callback(function(opts) {
      var Path = require('path')
      var FS = require('fs')
      // Windows
      if (os.platform() == 'win32' && process.env.APPDATA) {
        var startup = Path.join(process.env.APPDATA, 'Microsoft/Windows/Start Menu/Programs/Startup')
        FS.writeFileSync("wanikani-notifier.cmd", "wanikani-notifier start --key " + opts.key)
      }
    })
    
    nomnom.parse()
  }
  
}

module.exports = WaniKaniNotifier

if (require.main === module) {
  WaniKaniNotifier.console()
}

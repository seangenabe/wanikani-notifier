
class Delayer {
  
  constructor(delay) {
    this.delay = delay
    this.promise = new Promise((resolve, reject) => {
      var timeoutID = setTimeout(function() {
        resolve()
      }, delay)
      this.cancel = () => {
        clearTimeout(timeoutID)
        var err = new Error("Delayer cancelled.") 
        err.setByDelayer = Delayer
        reject(err)
      }
    })
  }
}

module.exports = Delayer

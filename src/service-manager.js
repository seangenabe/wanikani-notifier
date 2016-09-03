const pkg = require('../package')
const Util = require('util')
const Path = require('path')
const ChildProcess = require('node-puff/child_process')
const OS = require('os')
const FS = require('node-puff/fs')
const puff = require('puff/dynamic')
const cjoin = require('command-join')

const quiet = Path.resolve(`${__dirname}/../quiet.exe`)
const regQuery = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Folders" /v Startup`

module.exports = class ServiceManager {

  static async reinstall() {
    if (process.platform === 'win32') {
      let startupPath = await ServiceManager.getWin32StartupPath()
      await ServiceManager.uninstall({ startupPath })
      await ServiceManager.install({ startupPath })
    }
    else {
      throw new Error("Platform not supported.")
    }
  }

  static async install({ startupPath } = {}) {
    if (process.platform === 'win32') {
      if (!startupPath) {
        startupPath = await ServiceManager.getWin32StartupPath()
      }
      await FS.writeFile(
        `${startupPath}/${pkg.name}-startup.vbs`,
        `Set objShell = WScript.CreateObject("WScript.Shell")
objShell.Run "wanikani-notifier --as-service", 0, True`,
        'utf8'
      )
    }
    else {
      throw new Error("Platform not supported.")
    }
  }

  static async uninstall({ startupPath } = {}) {
    if (process.platform === 'win32') {
      if (!startupPath) {
        startupPath = await ServiceManager.getWin32StartupPath()
      }
      try {
        await FS.unlink(`${startupPath}/${pkg.name}-startup.vbs`)
      }
      catch (err) {}
    }
    else {
      throw new Error("Platform not supported.")
    }
  }

  static async start({ startupPath } = {}) {
    if (process.platform === 'win32') {
      if (!startupPath) {
        startupPath = await ServiceManager.getWin32StartupPath()
      }
      ChildProcess.exec(cjoin([`${startupPath}/${pkg.name}-startup.vbs`]))
    }
    else {
      throw new Error("Platform not supported.")
    }
  }

  static async stop() {
    if (process.platform === 'win32') {
      let pids
      try {
        pids = await FS.readFile(`${__dirname}/lock`, 'utf8')
      }
      catch (err) {
      }
      if (pids) {
        pids = pids.split('\n').filter(Boolean)
      }
      else {
        pids = []
      }
      await Promise.all(pids.map(pid =>
        ChildProcess.spawn(`taskkill /f /pid ${pid}`)
      ))
    }
    else {
      throw new Error("Platform not supported.")
    }
  }

  static async getWin32StartupPath() {
    let [regQueryResult] = await ChildProcess.exec(regQuery)
    let startup =
      regQueryResult.split(OS.EOL)[2].match(/\s+Startup\s+REG_SZ\s+(.*)/)[1]
    return startup
  }

}

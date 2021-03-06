import { EventEmitter } from 'events'
import * as ssh2 from 'ssh2'
import { sshexec } from './sshexec'

let logger = require('winston').loggers.get('ssh')

export interface Stats {
  lastUpdated: string
  uptime: { boot: any, launch: any }
  cpu: { cores: number, model: string, loadavg: any }
  memory: { ram: Memory, swap: Memory, disk: Memory }
}

interface Memory {
  total: number
  used: number
  free: number
}

export class Connection extends EventEmitter {
  private state: string
  private error: string
  private stats: Stats
  private config: any
  private ssh: ssh2.Client
  private refreshStatsTimer: NodeJS.Timer
  
  constructor(config) {
    super()

    this.state = null
    this.error = null

    this.config = config
    this.ssh = null

    this.stats = {
      lastUpdated: null,

      uptime: {
        boot: null,
        launch: null
      },

      cpu: {
        cores: null,
        model: null,
        loadavg: null
      },

      memory: {
        ram: null,
        swap: null,
        disk: null
      }
    }
    
    this.on('error', (err) => logger.error('Error: ' + err))
  }

  connect() {
    this.ssh = null
    this.state = 'connecting'
    this.error = null

    let ssh: ssh2.Client = new ssh2()

    ssh.once('ready', () => {
      this.ssh = ssh
      this.state = 'connected'

      this.refreshStatsTimer = setInterval(() => this.refreshStats(), 30 * 1000)
      this.refreshStats()

      this.provision()
      //this.ping()
    })

    ssh.once('error', err => {
      if (err.syscall == 'connect') {
        if (err.code == 'ECONNREFUSED' || err.code == 'ETIMEDOUT') {
          this.connect()
        } else {
          this.state = 'error'
          this.error = err
          logger.error(err)
        }
      } else {
        this.disconnect()
        this.connect()
      }
    })

    ssh.once('end', () => this.disconnect())

    let sshconfig = {
      readyTimeout: 2 * 60 * 1000,
      keepaliveInterval: 20 * 1000,
      keepaliveCountMax: 3
    }

    for (let key in this.config)
      sshconfig[key] = this.config[key]

    ssh.connect(sshconfig)
  }

  disconnect() {
    if (this.refreshStatsTimer) {
      clearInterval(this.refreshStatsTimer)
      this.refreshStatsTimer = null
    }

    if (this.ssh) {
      this.ssh.end()
      this.ssh = null
    }

    this.state = 'disconnected'
  }

  refreshStats() {
    let cmds = {
      'true': (stdout) => {},
      'cat /proc/uptime': (stdout) => {
        this.stats.uptime.boot = parseInt(stdout.trim().split(/\s+/)[0])
      },
      'nproc': (stdout) => {
        this.stats.cpu.cores = parseInt(stdout.trim())
      },
      'cat /proc/loadavg': (stdout) => {
        //  0.00 0.01 0.05 2/66 4307
        this.stats.cpu.loadavg = stdout.trim().split(' ').slice(0, 3).map(n => parseFloat(n))
      },
      'cat /proc/cpuinfo': (stdout) => {
        // processor       : 0
        // model name      : Intel(R) Xeon(R) CPU E5-2650 0 @ 2.00GHz
        this.stats.cpu.model = stdout
          .trim().split('\n')
          .map(line => line.split(':'))
          .filter(arr => arr.length == 2)
          .map(arr => [arr[0].trim(), arr[1].trim()])
          .filter(arr => arr[0] == 'model name')[0][1]
      },
      'free -bo': (stdout) => {
        //              total       used       free     shared    buffers     cached
        // Mem:     617156608  253972480  363184128     212992    9023488  200650752
        // Swap:            0          0          0
        let lines = stdout.trim().split('\n')
        let mem = lines[1].split(/\s+/)
        let swap = lines[2].split(/\s+/)
        this.stats.memory.ram = { total: parseInt(mem[1]), used: parseInt(mem[2]), free: parseInt(mem[3]) }
        this.stats.memory.swap = { total: parseInt(swap[1]), used: parseInt(swap[2]), free: parseInt(swap[3]) }
      },
      'df -B1 -x tmpfs -x devtmpfs --total --local': (stdout) => {
        // Filesystem      1B-blocks      Used  Available Use% Mounted on
        // /dev/xvda1     8320901120 812576768 7062052864  11% /
        // total          8320901120 812576768 7062052864  11% -
        let total = stdout.trim().split('\n').pop().split(/\s+/)
        this.stats.memory.disk = { total: parseInt(total[1]), used: parseInt(total[2]), free: parseInt(total[3]) }
      }
    }

    let cmd = Object.keys(cmds).join(' && echo === && ')
    sshexec(this.ssh, cmd, (err, code, stdout, stderr) => {
      if (err) return this.emit('error', 'Error while refreshing stats', err)
      if (code != 0) return this.emit('error', 'Stats commands exited with non-zero status', code, stdout, stderr)

      try {
        let parsers = Object.keys(cmds).map(k => cmds[k])
        stdout.split('===\n').forEach((output, index) => parsers[index](output))
        this.stats.lastUpdated = new Date().toString()
      } catch (e) {
        this.emit('error', 'Could not parse stats output', e)
      }
    })
  }

  provision() {
    logger.debug(`Provisioning ${this.config.name}`)
    this.state = 'provisioning'
    sshexec(this.ssh, this.config.provision, (err, code, stdout, stderr) => {
      logger.debug(`Provisioning ${this.config.name}, ${err ? 'ERR: ' + err + ', ' : ''}exit: ${code}, stdout: ${stdout.trim().replace('\n', '\\n')}, stderr: ${stderr.trim().replace('\n', '\\n')})`)
      if (err || code != 0) this.state = 'error'
      if (err) return this.emit('error', 'Error while provisioning', err)
      if (code != 0) return this.emit('error', 'Provisioning was not successful', code, stdout, stderr)
      this.state = 'connected'
    })
  }

  ping() {
    let timer = setInterval(() => {
      if (!this.ssh) return clearInterval(timer)
      sshexec(this.ssh, 'uptime', (err, code, stdout) => {
        if (err) logger.error('uptime error:', err)
        if (code != 0) logger.error('uptime exit code:', code)
        if (stdout) logger.debug(stdout.trim())
      })
    }, 1000)
  }
}

const fs = require('fs')
const path = require('path')

const traders = JSON.parse(fs.readFileSync(path.resolve('traders.json')))

const fork = require('child_process').fork
const childSrc = path.resolve('src/binance.js')
const options = {
  stdio: ['pipe', 'pipe', 'pipe', 'ipc']
}

// collection of child processes
const checkingProcesses = []

traders.forEach(trader => {
  const child = fork(childSrc, [], options)
  checkingProcesses.push(child)

  // listener for each trader
  child.on('message', data => {
    console.log(`message from ${trader.name}: ${data.message}`)
    /**
     * Insert your application logic here!
     * i.e. how shall the bot behave on new position updates
     */
  })

  // register trader agnostic child process
  child.send({
    reason: 'register',
    payload: {
      name: trader.name,
      uid: trader.uid
    }
  })
})

const got = require('got')

const BASE_API = 'https://www.binance.com/bapi/futures/v1/'
const delay = 5000

const database = new Map() // map for current positions per trader

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * API call to get PNL data
 * @param {String} uid encrypted UID of binance trader
 * @returns json data
 */
const getPrice = async uid => {
  const url = BASE_API + 'public/future/leaderboard/getOtherPosition'
  const options = {
    json: {
      encryptedUid: uid,
      tradeType: 'PERPETUAL'
    }
  }
  const { data } = await got.post(url, options).json()
  return data
}

/**
 * The main logic of the child process
 *
 * It shall decide when to provide the main process
 * with new position information
 * -> extend this to your liking
 * @param {string} traderName name of the trader
 * @param {object} otherPosition position information from Binance
 * @returns
 */
const dataHandler = (traderName, otherPosition) => {
  let trades = []

  if (!database.has(traderName)) { // if no entry -> new position
    database.set(traderName, otherPosition)
    process.send({
      type: 'new position',
      message: otherPosition
    })
    return
  }
  trades = database.get(traderName)
  if (otherPosition.updateTimeStamp === trades.updateTimeStamp) return
  database.set(traderName, otherPosition) // something has changed (send)
  process.send({
    type: 'update',
    message: otherPosition
  })
}

/**
 * Check trader PNL data from binance
 * @param {String} trader name of the trader (uid needs to be known)
 */
const checkTrader = async trader => {
  let eShown = false
  while (true) {
    let data = null
    try {
      data = await getPrice(trader.uid)
    } catch (err) {
      eShown = true
      process.send({ // message class would be beneficial
        type: 'status',
        message: `[ ERR ] ${new Date().toGMTString()}:\n${err}`
      })
    }
    if (data) {
      if (eShown) {
        process.send({
          type: 'status',
          message: 'Connection re-established...'
        })
        eShown = false
      }
      dataHandler(trader.name, data)
    }
    await sleep(delay)
  }
}

/**
 * registration of trader to check
 * (extend this for more interaction between main and subprocesses)
 */
process.on('message', message => {
  if (message.reason === 'register') {
    checkTrader(message.payload)
  }
})

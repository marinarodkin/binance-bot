const ccxt = require ('ccxt')
const writeLog = require ('./write-log')
const tradeParameters  = require ('./parameters')

const id = 'M4LjXC0rvodVUpLwUF3C2J4QTfN7TAkPX6UtyhCrW8aeHPXXNahmarw64OCMpPvI'
const APIKEY = '5x45ki66G40dOI9xs29lhOuClDMyFA6BTaNkug5vid5oLPWD4TmHM3Va9uaslVKY'

// console.log (ccxt.exchanges) // print all available exchanges
const exchange = new ccxt.binance({
  apiKey: id,
  secret: APIKEY
})


// Выводим баланс.
const getBalance = async (coin = 'BUSD') => {
  const info = await exchange.fetchBalance()
  const allBalance = info?.info?.balances
  const balanceForCoin = allBalance.find(item => item.asset === 'BUSD')
  console.log('balance in', coin, ' - ', balanceForCoin)
  return balanceForCoin
}

const testBuy = async (symbol = 'FXS/BUSD', price) => {
  const date = new Date()
  const item =  {
    symbol,
    buy: price,
    buyDate: date
  }
  return item
}

const testSell = async (symbol, price, testBuyItem) => {
  const date = new Date()
  const testSellItem =  {
    symbol,
    sell: price,
    sellDate: date
  }
  console.log('testBuyItem', testBuyItem)
  console.log('testSellItem', testSellItem)
  await writeLog({...testBuyItem, ...testSellItem})
}

const getOhlcv = async (symbol = 'FXS/BUSD', timeframe = '1m') => {
  const ohlcv = await exchange.fetchOHLCV (symbol, timeframe)
  return ohlcv
}

const isTrendUp = async (symbol, timeframe, amount) => {
  console.log('isTrendUp timeframe', timeframe)
  const OHLCV = await getOhlcv(symbol, timeframe)
  const lastFiveItems = OHLCV.slice(OHLCV.length - amount, OHLCV.length - 1)
  console.log('lastFiveItems', lastFiveItems)
  let currentAverage = (OHLCV[OHLCV.length - amount - 1][1] + OHLCV[OHLCV.length - amount - 1][4])/2 // -5 item
  let isTrendUp = true
  lastFiveItems.forEach(item => {
    const itemAverage = (item[1] + item[4])/2
    console.log('itemAverage', itemAverage, 'currentAverage', currentAverage)
    if(isTrendUp && itemAverage > currentAverage) {
      isTrendUp = true
    } else {
      isTrendUp = false
    }
    currentAverage = itemAverage
  })
  return isTrendUp
}
const isEMA = async (symbol) => {
  return false
}

const analyseCoin = async (symbol) => {
  const isAllTrendUp = isTrendUp(symbol,'1h', 4) && isTrendUp(symbol, '5m', 3)

  return isAllTrendUp
}

const getPrice = async (symbol) => {
  let orderbook = await exchange.fetchOrderBook (symbol)
  let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
  return ask
}

const getPriceToSell = async(symbol, price) => {
  let currentPrice = price
  let stopLossPrice = price * 0.98
  let sellPrice = price * 1.1
  while (currentPrice < sellPrice && currentPrice > stopLossPrice) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    currentPrice = await getPrice(symbol)
    console.log('curentPrice', currentPrice)
  }
  if (currentPrice >= sellPrice || currentPrice <= stopLossPrice) {
    return currentPrice
  }
}

const testTrade = async (symbol) => {
  let runAnalyse = true
  while (runAnalyse) {
    const isTimeToBuy = await analyseCoin(symbol)
    if (isTimeToBuy) {
      const price = getPrice(symbol)
      const testBuyItem = testBuy(symbol, price)
      const sellPrice = await getPriceToSell(symbol, price)
      await testSell(symbol, sellPrice, testBuyItem)
    }
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)) // 5 min
  }
}

const init = async () => {
  const symbol = 'ATOM/USDT'
  await testTrade(symbol)
  // writeLog()
  // const orderInfo = await createBuyAndStopLessOrder(symbol)
  // const fix = await fixProfit(symbol, orderInfo)
}


init().then((res) => console.log(res))

// exchange.cancelOrder ('1234567890') // replace with your order id here (a string)
// fetch_open_orders
// fetch_close_orders
// fetch_free_balance // fetch_free_balance fetch_total_balance:
// create_limit_order // create_limit_order create_limit_buy_order create_limit_sell_order

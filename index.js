const ccxt = require ('ccxt')
const http = require ('request')
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
  const startSum = 20
  const buyAmount = startSum/testBuyItem.buy
  const sellFor = buyAmount * price
  const date = new Date()
  const testSellItem =  {
    symbol,
    sell: price,
    sellDate: date,
    diff: sellFor - startSum,
    diffProc: (sellFor - startSum)/startSum * 100
  }
  await writeLog({...testBuyItem, ...testSellItem})
}

const getOhlcv = async (symbol, timeframe = '1m') => {
  const ohlcv = await exchange.fetchOHLCV (symbol, '1m')
  return ohlcv
}

const getEma = async(symbol, timeframe, emaPeriod) => {
   const ohlcv = await getOhlcv(symbol, timeframe)
   const lastData = ohlcv.slice(ohlcv.length - 50, ohlcv.length)
   const data = lastData.map(item => item[4])
   const k = 2/(emaPeriod + 1)
   let emaData = []
   emaData[0] = data[0]
   for (let i = 1; i < data.length; i++) {
     let newPoint = (data[i] * k) + (emaData[i-1] * (1-k))
     emaData.push(newPoint.toFixed(3))
  }
  return emaData
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
    if (isTrendUp && itemAverage > currentAverage) {
      isTrendUp = true
    } else {
      isTrendUp = false
    }
    currentAverage = itemAverage
  })
  return isTrendUp
}

const sendToTelegram = (msg) => {
  const token = '5028488359:AAFYQ86pH3oHpWkR10e5gBhGuvl22LVSXKQ'
  const chat = '-716953702'
  http.post(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chat}&parse_mode=html&text=${msg}`, function (error, response, body) {
    if(response.statusCode!==200){
      console.log('error')
    }
  });
}
const isEMACross = async (symbol) => {
  const quickEma = await getEma(symbol, '1m', 7)
  const longEma = await getEma(symbol, '1m', 14)
  const lastQuickEma = quickEma[quickEma.length - 1]
  const prevQuickEma = quickEma[quickEma.length - 2]
  const lastLongEma = longEma[longEma.length - 1]
  const prevLongEma = longEma[longEma.length - 1]
  const isCross = lastQuickEma > lastLongEma &&  prevLongEma > prevQuickEma
  console.log(symbol, 'lastQuick', lastQuickEma, 'laslong', lastLongEma, 'prevQ', prevQuickEma, 'pevL', prevLongEma)
  console.log('isCross', isCross)
  return {isCross, lastQuickEma, lastLongEma}
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
  let stopLossPrice = price * 0.994
  let sellPrice = price * 1.006
  while (currentPrice < sellPrice && currentPrice > stopLossPrice) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    currentPrice = await getPrice(symbol)
    console.log(symbol,'price, stoploss, slprice, curentPrice', price, stopLossPrice, sellPrice, currentPrice)
  }
  if (currentPrice >= sellPrice || currentPrice <= stopLossPrice) {
    return currentPrice
  }
}

const testTrade = async (symbol) => {
  let runAnalyse = true
  let timeout = 30
  while (runAnalyse) {
    const EMA = await isEMACross(symbol)
    if (EMA.isCross) {
      sendToTelegram(symbol)
      const price = await getPrice(symbol)
      const testBuyItem = await testBuy(symbol, price)
      const sellPrice = await getPriceToSell(symbol, price)
      await testSell(symbol, sellPrice, testBuyItem)
    }
    const emaDiff = 100 - EMA.lastQuickEma/EMA.lastLongEma * 100
    if (emaDiff < 0.1 && emaDiff > 0) {
      timeout = 5
    } else {
      timeout = 30
    }
    console.log(symbol, 'diff', emaDiff, 'timeout', timeout)
    await new Promise(resolve => setTimeout(resolve, timeout * 1000))
  }
}

const init = async () => {
  const symbols = tradeParameters.coins
  console.log('symbols', symbols)
  for(let i = 0; i < symbols.length; i++) {
    testTrade(symbols[i])
  }

  // await testTrade(symbol)

  // writeLog(  )
  // const orderInfo = await createBuyAndStopLessOrder(symbol)
  // const fix = await fixProfit(symbol, orderInfo)
}


init().then((res) => console.log(res))

// exchange.cancelOrder ('1234567890') // replace with your order id here (a string)
// fetch_open_orders
// fetch_close_orders
// fetch_free_balance // fetch_free_balance fetch_total_balance:
// create_limit_order // create_limit_order create_limit_buy_order create_limit_sell_order

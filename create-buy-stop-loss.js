const fs = require('fs')
const ccxt = require("ccxt");

const exchange = new ccxt.binance({
  apiKey: id,
  secret: APIKEY
});

const createStopLoss = async (symbol, amount, orderPrice, stopLossPrice) => {
// stop loss limit
  const type = 'STOP_LOSS_LIMIT'
  const params = {
    'stopPrice': stopLossPrice,
    'timeInForce': 'GTC',
  }
  const side = 'sell'
  try {
    const stopLossOrder = await exchange.createOrder (symbol, type, side, amount, stopLossPrice, params)
    console.log ('stopLossOrder at', stopLossOrder.price)
    const orderInfo = {orderPrice, stopLossPrice, amount, id: stopLossOrder.id}
    await fixProfit (symbol, orderInfo)
  } catch (e) {
    console.log (e.constructor.name, e.message)
  }
}

const createOrder = async (symbol, amount, price) => {
  const order = await exchange.createOrder(symbol, 'market', 'buy', amount, price)
  console.log('order', order.price)
}

const getPrice = async (symbol) => {
  let orderbook = await exchange.fetchOrderBook (symbol)
  // let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
  let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
  // let spread = (bid && ask) ? ask - bid : undefined
  return ask
}



const fixProfit = async(symbol, orderInfo) => {
  console.log('start fix profit')
  const {orderPrice, stopLossPrice, amount, id} = orderInfo  // 100, 98
  let currentTest = 0
  let LOSS_STEP = 0.2
  let PRICE_STEP = 0.5
  let currentPrice = orderPrice  // 100

  let nextStep = orderPrice * (100 + PRICE_STEP) / 100 // 102
  console.log('nextStep', nextStep)
  while (currentPrice < nextStep && currentPrice > stopLossPrice) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    currentPrice = await getPrice(symbol)
    console.log('curentPrice', currentPrice)
  }
  if (currentPrice >= nextStep) {
    // deleteCurrentStopLossOrder!!!
    const newStopLossPrice = stopLossPrice * (100 + LOSS_STEP) / 100    // 98,5
    createStopLoss(symbol, amount, newStopLossPrice)
    return '!newStopLossPrice' + newStopLossPrice
  } else {
    return '!sold at stop loss' + stopLossPrice
  }

}

const createBuyAndStopLessOrder = async (symbol) => {
  const USD = 20
  const STOP_PROCENT = 0.02
  const price = await getPrice(symbol)
  const amount = Math.floor(20 / price * 100 , 1) / 100
  console.log('amount', amount)
  const order = await exchange.createMarketBuyOrder(symbol, amount)
  const orderPrice = order.price
  console.log('order', orderPrice)
  const stopLossPrice = orderPrice - (orderPrice * STOP_PROCENT)
  const stopLossOrder = await createStopLoss(symbol, amount, orderPrice, stopLossPrice)
}

module.exports = createBuyAndStopLessOrder

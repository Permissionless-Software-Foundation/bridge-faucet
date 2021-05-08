const CONTROLLER = require('./controller')
const controller = new CONTROLLER()

module.exports.baseUrl = '/faucet'

module.exports.routes = [
  {
    method: 'GET',
    route: '/',
    handlers: [controller.ping]
  },
  {
    method: 'GET',
    route: '/slptoken/:addr',
    handlers: [controller.sendSLPToken]
  },
  {
    method: 'GET',
    route: '/avaxtoken/:addr',
    handlers: [controller.sendAvaxToken]
  }
]

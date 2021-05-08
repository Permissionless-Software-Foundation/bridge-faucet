const wlogger = require('../../lib/wlogger')
const BCHJS = require('@psf/bch-js')
const config = require('../../../config')

const BchUtil = require('bch-util')

let _this
class UserController {
  constructor() {
    // Encapsulate dependencies
    this.bchjs = new BCHJS({ restURL: 'https://api.fullstack.cash/v4/' })
    this.bchUtil = new BchUtil({ bchjs: this.bchjs })
    this.config = config

    _this = this
  }

  /**
   * @api {get} /faucet/slptoken/:address Sends a token to the given address
   * @apiName SendSLPToken
   * @apiGroup Faucet
   *
   * @apiExample Example usage:
   * curl -H "Content-Type: application/json" -X GET localhost:5000/faucet/slptoken/:address
   *
   * @apiSuccess {StatusCode} 200
   *
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "success": 200,
   *       "txid": "3ac2259216ee6b756933a8eae09465713d691085044c66e4e1ab68dc829f57f6"
   *     }
   *
   * @apiUse TokenError
   */
  async sendSLPToken(ctx) {
    try {
      const isValid = _this.isValidAddress(ctx.params)

      if (!isValid) {
        throw new Error('The given address is not valid')
      }

      const ecPair = _this.bchjs.ECPair.fromWIF(_this.config.WIF)

      const cashAddress = _this.bchjs.ECPair.toCashAddress(ecPair)
      const legacyAddress = _this.bchjs.Address.toLegacyAddress(cashAddress)
      const receiverAddress = _this.bchjs.Address.toLegacyAddress(ctx.params.addr)

      const utxoData = await _this.bchjs.Electrumx.utxo(cashAddress)
      const utxos = utxoData.utxos

      const utxoDetails = await _this.bchjs.SLP.Utils.tokenUtxoDetails(utxos)
      // Filter out the non-SLP token UTXOs.
      const bchUtxos = utxoDetails.filter(utxo => Boolean(utxo) && !utxo.isValid)
      if (bchUtxos.length === 0) {
        throw new Error('Wallet does not have a BCH UTXO to pay miner fees.')
      }

      // Filter out the token UTXOs that match the token ID
      const tokenUtxos = utxoDetails.filter((utxo) =>
        Boolean(utxo) &&
        utxo.tokenId === _this.config.tokenID &&
        utxo.utxoType === 'token'
      )

      if (tokenUtxos.length === 0) {
        throw new Error('No token UTXOs for the specified token could be found.')
      }

      const bchUtxo = _this.bchUtil.util.findBiggestUtxo(bchUtxos)
      const originalAmount = Number(bchUtxo.value)
      const txFee = 250
      const remainder = originalAmount - txFee - 546 * 2

      const txBuilder = new _this.bchjs.TransactionBuilder()
      const vout = bchUtxo.tx_pos
      const vhash = bchUtxo.tx_hash

      if (remainder < 1) {
        throw new Error('Selected UTXO does not have enough satoshis')
      }

      const slpSendObj = _this.bchjs.SLP.TokenType1.generateSendOpReturn(
        tokenUtxos,
        1
      )
      const slpData = slpSendObj.script
      txBuilder.addInput(vhash, vout)
      // add each token UTXO as an input.
      for (let i = 0; i < tokenUtxos.length; i++) {
        txBuilder.addInput(tokenUtxos[i].tx_hash, tokenUtxos[i].tx_pos)
      }
      txBuilder.addOutput(slpData, 0)
      // Send dust transaction representing tokens being sent.
      txBuilder.addOutput(
        receiverAddress,
        546
      )

      if (slpSendObj.outputs > 1) {
        txBuilder.addOutput(
          legacyAddress,
          546
        )
      }

      txBuilder.addOutput(
        legacyAddress,
        remainder
      )

      let redeemScript
      txBuilder.sign(
        0,
        ecPair,
        redeemScript,
        txBuilder.hashTypes.SIGHASH_ALL,
        originalAmount
      )
      // Sign each token UTXO being consumed.
      for (let i = 0; i < tokenUtxos.length; i++) {
        const thisUtxo = tokenUtxos[i]

        txBuilder.sign(
          1 + i,
          ecPair,
          redeemScript,
          txBuilder.hashTypes.SIGHASH_ALL,
          thisUtxo.value
        )
      }

      const Tx = txBuilder.build()
      const txHex = Tx.toHex()
      const txid = await _this.bchjs.RawTransactions.sendRawTransaction(txHex)

      ctx.body = {
        success: '200',
        txid
      }
    } catch (err) {
      wlogger.error('Error in faucet/controller.js/getUsers(): '.err)
      console.log(err)
      ctx.throw(422, err.message)
    }
  }

  ping(ctx) {
    ctx.body = {
      pong: 200
    }
  }

  isValidAddress(params) {
    try {
      const { addr } = params

      if (typeof addr !== 'string' || addr.length === 0) {
        throw new Error('Invalid addr')
      }
      const legacy = _this.bchjs.Address.toLegacyAddress(addr)
      return Boolean(legacy)
    } catch (error) {
      console.log('Failed to parse address returning false', error.message)
      return false
    }
  }
}

module.exports = UserController

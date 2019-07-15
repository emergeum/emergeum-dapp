import Connector from './core'
import { IWalletConnectOptions } from './types'
import * as cryptoLib from './webCrypto'
import WebStorage from './webStorage'

class WalletConnect extends Connector {
  constructor (opts: IWalletConnectOptions) {
    super(cryptoLib, opts, null, WebStorage)
  }
}

export default WalletConnect

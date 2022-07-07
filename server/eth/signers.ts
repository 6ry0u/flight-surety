import { ethers } from 'ethers'

import provider from './provider'

const NODE_ENV = process.env.NODE_ENV
const MNEMONIC_DEV = process.env.MNEMONIC_DEV
const MNEMONIC_PROD = process.env.MNEMONIC_PROD

const mnemonic = NODE_ENV === 'development' ? MNEMONIC_DEV : MNEMONIC_PROD

const Signers = (num: number) =>
  [...Array(num).keys()].map((index) =>
    ethers.Wallet.fromMnemonic(mnemonic!, `m/44'/60'/0'/0/${index}`).connect(
      provider
    )
  )

export default Signers

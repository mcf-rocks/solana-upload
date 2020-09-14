import {
  Account,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

import {getOurAccount} from './ourAccount'
import {getNodeConnection} from './nodeConnection'
import {getStore, setStore} from './storeConfig'

import {estCostLoadProgram, loadProgram} from './deploy'

const fs = require('fs')

import { keyPress } from './keyPress.js'


const pathToProgram = 'dist/program/upload.so'

async function main() {
  console.log("Deploying...")

  try {
    if (fs.existsSync(pathToProgram)) {
      //file exists
    }
  } catch(err) {
    console.error("No file "+pathToProgram+" -- build rust program first")
    process.exit(1)
  }

  const ourAccount = await getOurAccount()

  const connection = await getNodeConnection()

  const s = await getStore(connection, 'upload.json')

  if ( s.inStore === true ) {
    console.log("Program has already been deployed, pubkey:", s.programId.toString())
    process.exit(0)
  }
 
  const estimatedCostOfLoad = await estCostLoadProgram(connection, pathToProgram); 
  console.log("Estimated cost to load program:", estimatedCostOfLoad, " lamports (", estimatedCostOfLoad/LAMPORTS_PER_SOL, ") Sol")

  console.log('Press any key to continue.')
  await keyPress()

  console.log("-----")

  const startingBalance = await connection.getBalance(ourAccount.publicKey)

  const programId = await loadProgram(connection, ourAccount, pathToProgram)
  
  const afterLoadBalance = await connection.getBalance(ourAccount.publicKey)

  const costLoad = startingBalance - afterLoadBalance

  console.log("Program loaded to:",programId.toBase58()," cost was:", costLoad, " lamports (", costLoad/LAMPORTS_PER_SOL, ") Sol")

  await setStore('upload.json', programId)

  console.log("-----")

}

main()
  .catch(err => {
    console.error(err)
  })
  .then(() => process.exit())

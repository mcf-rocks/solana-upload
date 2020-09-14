
import {
  SystemProgram,
  Account,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  BpfLoader,
} from '@solana/web3.js'

import * as BufferLayout from 'buffer-layout';

import {sendAndConfirmTransaction,onTransaction} from './util/send-and-confirm-transaction';

import {getOurAccount} from './ourAccount'
import {getNodeConnection} from './nodeConnection'
import {getStore} from './storeConfig'

import fs from 'mz/fs'

const FileType = require('file-type')

import { sleep } from './sleep'
import { keyPress } from './keyPress'
import { makeChunks } from './chunks'

// work out how much upload data we can cram into every upload transaction

const SOLANA_TRAN_MAX_BYTES = 1232

function getBytesRemaining() {
  const a = new Account()
  const pay = new Account()
  const prg = new Account()
  const i = new TransactionInstruction({
    keys: [
      {pubkey: a.publicKey, isSigner: true, isWritable: true},
    ],    
    programId: prg.publicKey,
    data: Buffer.alloc(0)
  })
  const dummy = new Transaction().add(i)
  dummy.recentBlockhash = '11111111111111111111111111111111'
  dummy.sign(pay,a)
  const s = dummy.serialize()
  return SOLANA_TRAN_MAX_BYTES - ( s.length + 2 )  // don't know where the 2 extra bytes come from
}

const CHUNKNUM_BYTE_COUNT = 2  // u16 int, which chunk
const CHUNKSIZE_BYTE_COUNT = 2  // u16 int, how big are chunks


async function main() {

  const usage = function() { console.error("USAGE: npm run upload_file <pathToFile>") }

  let pathToFile = process.argv[2];

  if ( ! pathToFile ) {
    console.log("No file supplied");
    usage()
    process.exit(1);
  }

  try {
    if (fs.existsSync(pathToFile)) {
      //file exists
    }
  } catch(err) {
    console.error("File not found:",pathToFile,"in",process.cwd())
    usage()
    process.exit(1)
  }

  const connection = await getNodeConnection()

  const ourAccount = await getOurAccount()

  const s = await getStore(connection, 'upload.json')

  if ( !s || !s.programId ) {
    console.log("Deploy the program first")
    process.exit(1) 
  }

  console.log("ProgramId to use:",s.programId.toString())

  const data = await fs.readFile(pathToFile)

  const numBytes = data.length

  console.log(pathToFile,"contains",numBytes,"bytes")

  // TODO: CHECK BYTES NOT EXCEED MAX

  // split our data across a number of calls

  const remainingByteCount = getBytesRemaining(s.programId)

  const dataByteCount = remainingByteCount - ( CHUNKNUM_BYTE_COUNT + CHUNKSIZE_BYTE_COUNT )

  console.log("Max upload data per transaction:",remainingByteCount,"without chunk index:",dataByteCount)

  const chunks = makeChunks( data, dataByteCount )

  console.log("Data will be uploaded over",chunks.length,"calls")

  const ftype = (await FileType.fromBuffer(data)).ext

  console.log("File type:",ftype)

  const {feeCalculator} = await connection.getRecentBlockhash()

  console.log("COST ESTIMATION")

  const costOfAccountRent = await connection.getMinimumBalanceForRentExemption(numBytes)
  console.log("New Account -- rent exemption:",costOfAccountRent)

  const costOfAccountTran = 2 * feeCalculator.lamportsPerSignature
  console.log("New Account -- transaction:",costOfAccountTran)

  console.log("New Account -- TOTAL:",costOfAccountRent+costOfAccountTran)

  let costOfAccountUpload = 0

  console.log("Data Upload -- will require",chunks.length,"calls")

  for(let i=0; i<chunks.length;i++) {
    const chunkCost = 2 * feeCalculator.lamportsPerSignature  // two signers, the payer and the new account
    console.log("Upload Call",i,"will upload",chunks[i].length,"bytes, costing:",chunkCost)
    costOfAccountUpload+=chunkCost
  }

  console.log("Data Upload -- TOTAL:",costOfAccountUpload)

  const total = costOfAccountRent + costOfAccountTran + costOfAccountUpload

  console.log("EST FINAL TOTAL -- ",total,"lamports (", total/LAMPORTS_PER_SOL, ")")

  let bal = await connection.getBalance( ourAccount.publicKey )
 
  if ( bal < total ) {
    console.log("WARNING, your balance",bal,"is less than the estimate",total)
  }

  console.log('Press any key to continue.')
  await keyPress()

  //++++++++++++++++
  // CREATE ACCOUNT
  //++++++++++++++++
 
  console.log("Creating account")

  let balBeforeAccount = await connection.getBalance( ourAccount.publicKey )

  const uploadAccount = new Account()
  const uploadAccountPK = uploadAccount.publicKey

  const rentExemption = await connection.getMinimumBalanceForRentExemption(numBytes);

  const createTransaction = SystemProgram.createAccount({
    fromPubkey: ourAccount.publicKey,
    newAccountPubkey: uploadAccount.publicKey,
    lamports: rentExemption,
    space: numBytes,
    programId: s.programId,
  })

  await sendAndConfirmTransaction(
    'createAccount',
    connection,
    createTransaction,
    ourAccount,
    uploadAccount
  )

  const balAfterAccount = await connection.getBalance(ourAccount.publicKey)

  const costAccount = balBeforeAccount - balAfterAccount

  console.log("Actual cost of making new account at:",uploadAccountPK.toString()," cost was:", costAccount, " lamports (", costAccount/LAMPORTS_PER_SOL, ") Sol")

  //++++++++++++++++
  // UPLOAD DATA
  //++++++++++++++++

  console.log("Let's wait")
  await sleep(20000)
  console.log("Let's continue")

  const balBeforeUpload = await connection.getBalance( ourAccount.publicKey )

  for( let i=0; i<chunks.length; i++) {

    //console.log('Press any key to load chunk',i)
    //await keyPress()

    const data = chunks[i]

    const dataStructureU16 = BufferLayout.u16()
    let buffChunkNum = Buffer.alloc(CHUNKNUM_BYTE_COUNT)
    dataStructureU16.encode(i,buffChunkNum)

    let buffChunkSize = Buffer.alloc(CHUNKSIZE_BYTE_COUNT)
    dataStructureU16.encode(dataByteCount,buffChunkSize)

    const instruction_data = Buffer.concat( [ buffChunkNum, buffChunkSize, data ] )

    const balBeforeUploadChunk = await connection.getBalance( ourAccount.publicKey )

    const instruction = new TransactionInstruction({
      keys: [
        {pubkey: uploadAccountPK, isSigner: true, isWritable: true},
      ],    
      programId: s.programId,
      data: instruction_data,
    })

    const transaction = new Transaction().add(instruction)
    transaction.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash
    transaction.sign(ourAccount,uploadAccount)
    const raw = transaction.serialize()  

    let tSig
    try {
      tSig = await connection.sendRawTransaction( raw )
    } catch(err) {
      console.log("Send failed:",err)
      process.exit(1)
    }

    //console.log("Transaction Signature:", tSig)

    const tStatus = (
      await connection.confirmTransaction(
        tSig,
        { confirmations: 1 },
      )
    ).value

    if (tStatus) {
      if (tStatus.err) {
        console.log("Transaction failed:",tStatus.err)
        process.exit(1)
      }
    }

    const balAfterUploadChunk = await connection.getBalance( ourAccount.publicKey )

    const costOfUploadChunk = balBeforeUploadChunk - balAfterUploadChunk

    console.log("Cost of upload chunk",i,"was",costOfUploadChunk,"bytes in transaction:",raw.length)
  }

  const balAfterUpload = await connection.getBalance( ourAccount.publicKey )

  const costOfUpload = balBeforeUpload - balAfterUpload

  console.log("Actual cost of full upload:",costOfUpload,"lamports (", costOfUpload/LAMPORTS_PER_SOL, ")")

  const totalCost = costAccount + costOfUpload

  console.log("Total cost was",totalCost,"lamports (", totalCost/LAMPORTS_PER_SOL, ")")

  console.log("-----")
}

main()
  .catch(err => {
    console.error(err)
  })
  .then(() => process.exit())

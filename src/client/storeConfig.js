
import {
    PublicKey,
} from '@solana/web3.js'

import {Store} from './util/store';

export async function getStore(connection, file) {

  const store = new Store();

  let config

  try {
    config = await store.load(file)
  } catch (err) {

    return { inStore: false }

  }

  let programId

  try {
    programId = new PublicKey(config.programId);
  } catch (err) {

    return { inStore: false }

  }


  let programInfo = await connection.getAccountInfo(programId);

  if ( !programInfo ) {

    return { inStore: false }

  }
 
  return { inStore: true, programId }
}

export async function setStore(file, programId, accountId) {

  const store = new Store();

  await store.save(file, {
    programId: programId.toBase58(),
  })  

}


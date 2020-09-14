
import {
  PublicKey,
} from '@solana/web3.js';

var fs = require('fs');

import {getNodeConnection} from './nodeConnection'

const FileType = require('file-type')

async function main() {

  const pubkey = process.argv[2];

  if ( ! pubkey ) {
    console.log("No account supplied");
    process.exit(1);
  }

  console.log("Lets look at account:",pubkey);

  let pk = new PublicKey(pubkey);

  const connection = await getNodeConnection()

  let account = await connection.getAccountInfo(pk);

  if ( !account ) {
    console.log("Account not found on chain");
    process.exit(1);
  }

  console.log(account.data);

  let ftype = (await FileType.fromBuffer(account.data)).ext

  console.log("Data type:",ftype)

  let file = pubkey+"."+ftype

  console.log("Writing file:",file)

  fs.writeFileSync(file,account.data)  
}

main()
  .catch(err => {
    console.error(err);
  })
  .then(() => process.exit());

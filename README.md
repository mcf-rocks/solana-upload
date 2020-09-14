# Solana Upload File

Upload a file to the Solana blockchain, download a file from the Solana blockchain.

WARNING: pointing at mainnet.

There is a bunch of stuff you need to setup to make this work. This is not a tutorial, but there is a [Solana dapp tutorial here](https://medium.com/@smith_10562/a-simple-solana-dapp-tutorial-6dedbdf65444)

## To Deploy the Program

NB: You don't need to deploy the program, as I already have... if you just want to upload a file, go to the next section.

```
npm install
npm run keypair
npm run balance
npm run build_upload
npm run deploy_upload
```

## To Upload a File

Place the file in the top level of the project, for example UK.png, then:

```
npm run balance
npm run upload_file UK.png
```

UK.png is a nice small file you can test on, before you upload that video that should never have been made.

Remember to record the address (public key) of the upload account.

## To Download a File

```
npm run download_file <address>
```

For example:

```
npm run download_file <TODO:>
```

The file will be in the top level of the project.

## How it Works

1. Client code (JS) reads file into byte buffer.
2. Creates account of same size on blockchain.
3. Accounts are zero initialised and can only be written via on-chain program
3. Solana has a 1232 transaction limit, therefore:
   a. Client calculates maximum data that can be crammed into one transaction,
   b. Splits data into X chunks,
   c. Calls on-chain program (transaction), which writes that chunk to the account at the right place.

NB: program ensures account is signer to prevent hijack, only client that created account can write.

WARNING: The client does each transaction sequentially (no reason, it could do them all in one go), consequently it will take a long time to upload a large file, if you run out of funds, get a powercut, accidentally ctrl-c, etc... it's dead, you need to start again. 

Download just reads the data from the chain and writes it to a file.
 
## Troubleshooting and Warnings

To upload you must have sufficient funds on the keypair.json in the top level of the project. The upload_file script will estimate the total cost, it asks you to press a key before it starts.

There is a limit of how much data can be stored in an account, I think it's 10MB, but not really sure. 

Technically if you have the secret key, you can overwrite, edit scripts as you wish.

Nothing that happens because of this software is my responsibility.

The following component combination works for a local docker node:

package.json
  "testnetDefaultChannel": "v1.3.9",
  "@solana/web3.js": "^0.73.0",
Cargo.toml
  solana-sdk = { version = "=1.3.9", default-features = false }
Using the BPF_LOADER_DEPRECATED_PROGRAM_ID in deploy.js
Using the entrypoint_deprecated in lib.rs



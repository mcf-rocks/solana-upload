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

## To Download a File

```
npm run download_file <address>
```

For example:

```
npm run download_file ABC
```

The file will be in the top level of the project.

## Troubleshooting

To upload you must have sufficient funds on the keypair.json in the top level of the project.

There is a 10MB limit of how much data can be stored in an account.

The following component combination works for a local docker node:

package.json
  "testnetDefaultChannel": "v1.3.9",
  "@solana/web3.js": "^0.73.0",
Cargo.toml
  solana-sdk = { version = "=1.3.9", default-features = false }
Using the BPF_LOADER_DEPRECATED_PROGRAM_ID in deploy.js
Using the entrypoint_deprecated in lib.rs



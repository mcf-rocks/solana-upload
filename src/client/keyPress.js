const readline = require('readline');
const rd = readline.createInterface({
    input: process.stdin,
})

export async function keyPress() {
  await new Promise( (resolve) => { rd.on('line', () => { resolve() } ) } )
}

use byteorder::{ByteOrder, LittleEndian};

use solana_sdk::{
    log::*, account_info::AccountInfo, info, program_error::ProgramError, account_info::next_account_info, pubkey::Pubkey,
    //entrypoint, entrypoint::ProgramResult, 
    entrypoint_deprecated, entrypoint_deprecated::ProgramResult,
};


// Declare and export the program's entrypoint
//entrypoint!(process_instruction);
entrypoint_deprecated!(process_instruction);


// Program entrypoint's implementation
fn process_instruction<'a>(
    program_id: &Pubkey,             // Public key of program account
    accounts: &'a [AccountInfo<'a>], // the target account
    instruction_data: &[u8],         // the data
) -> ProgramResult {

    info!("entrypoint");
    //sol_log_params(accounts, instruction_data);

    let accounts_iter = &mut accounts.iter();
    let target = next_account_info(accounts_iter)?;

    if target.owner != program_id {
        info!("Target account does not have the correct program id");
        return Err(ProgramError::IncorrectProgramId);
    }

//    if !target.is_signer {
//      info!("Target account must be signer");
//      return Err(ProgramError::MissingRequiredSignature);
//    }

    // get chunk index...

    let chunk_num = LittleEndian::read_u16(&instruction_data[0..2]);
    //info!(&format!("chunk_num {:?}",chunk_num));

    // get chunk size...

    let chunk_size = LittleEndian::read_u16(&instruction_data[2..4]);
    //info!(&format!("chunk_num {:?}",chunk_num));

    // calculate slice of account we will write into

    let account_start_ind = chunk_num as usize * chunk_size as usize;

    let data_size = instruction_data.len() - 4;
    let account_end_ind = account_start_ind + data_size as usize;
 
    // Write the data...

    let mut dst = target.try_borrow_mut_data()?;

    dst[account_start_ind..account_end_ind].clone_from_slice(&instruction_data[4..]);

    Ok(())
}

// tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_sdk::clock::Epoch;
    use std::mem;

    #[test]
    fn test_sanity() {

        // mock program id 

        let program_id = Pubkey::default();

        // mock accounts array...

        let key = Pubkey::default();  // anything
        let mut lamports = 0;

        let mut data = vec![0; 5 * mem::size_of::<u8>()];

        let owner = Pubkey::default();

        let target = AccountInfo::new(
            &key,                             // account pubkey
            true,                             // is_signer
            true,                             // is_writable
            &mut lamports,                    // balance in lamports
            &mut data,                        // storage
            &owner,                           // owner pubkey
            false,                            // is_executable
            Epoch::default(),                 // rent_epoch
        );


        let accounts = vec![target];

        assert_eq!(&accounts[0].data.borrow()[0..5], &[0,0,0,0,0]);

        let instruction_data: Vec<u8> = vec![0,0, 1,2,3,4,5];
        process_instruction(&program_id, &accounts, &instruction_data).unwrap();

        assert_eq!(&accounts[0].data.borrow()[0..5], &[1,2,3,4,5]);

    }
}

// Required to support info! in tests
#[cfg(not(target_arch = "bpf"))]
solana_sdk::program_stubs!();

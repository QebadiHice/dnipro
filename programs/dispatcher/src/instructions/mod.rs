// programs/dispatcher/src/instructions/mod.rs
pub mod initialize;
pub mod deposit;
pub mod withdraw;
pub mod current_value;
pub mod update_config;
pub mod set_paused;
pub mod transfer_admin;

pub use initialize::*;
pub use deposit::*;
pub use withdraw::*;
pub use current_value::*;
pub use update_config::*;
pub use set_paused::*;
pub use transfer_admin::*;

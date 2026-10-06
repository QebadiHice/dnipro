// programs/registry/src/instructions/mod.rs
pub mod initialize_registry;
pub mod register_adapter;
pub mod update_adapter;
pub mod deactivate_adapter;
pub mod reactivate_adapter;
pub mod governance;

pub use initialize_registry::*;
pub use register_adapter::*;
pub use update_adapter::*;
pub use deactivate_adapter::*;
pub use reactivate_adapter::*;
pub use governance::*;

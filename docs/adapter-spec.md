# Dnipro Adapter Interface Specification

Version: 1.0.0

## Overview

Any Solana program can become a Dnipro-compatible yield adapter by implementing the three-instruction interface defined in this document.

## Required Instructions

### 1. `adapter_deposit`

```
Discriminator: sha256("global:adapter_deposit")[..8]
```

**Parameters (Borsh-encoded):**
| Field | Type | Description |
|---|---|---|
| `amount` | `u64` | Underlying tokens to deposit (already fee-deducted by Dispatcher) |
| `min_shares_out` | `u64` | Minimum shares to mint (slippage protection) |

**Return value:** `u64` — shares minted. Returned via Solana's `set_return_data`.

**Required accounts:**
| Account | Writable | Signer | Description |
|---|---|---|---|
| `adapter_state` | ✓ | — | PDA: `["adapter_state"]` |
| `user` | — | ✓ | User wallet |
| `user_token_account` | ✓ | — | User's ATA for underlying token |
| `user_share_account` | ✓ | — | User's ATA for share/receipt token |
| `vault` | ✓ | — | Adapter's token vault |
| `share_mint` | ✓ | — | Share token mint |
| `vault_authority` | — | — | PDA: `["vault_authority"]` — signs vault transfers |
| `token_program` | — | — | SPL Token program |

**Invariants the adapter MUST enforce:**
- `amount > 0` (revert with descriptive error)
- `shares >= min_shares_out` (revert with slippage error)
- `!adapter_state.deposits_paused` (revert with paused error)
- All arithmetic must use checked operations

---

### 2. `adapter_withdraw`

```
Discriminator: sha256("global:adapter_withdraw")[..8]
```

**Parameters (Borsh-encoded):**
| Field | Type | Description |
|---|---|---|
| `shares` | `u64` | Shares to redeem |
| `min_amount_out` | `u64` | Minimum underlying tokens to receive |

**Return value:** `u64` — tokens returned. For adapters with withdrawal queues (Maple, Drift), return `0` when the withdrawal is queued and `amount` when it is executed.

**Required accounts:**
| Account | Writable | Signer | Description |
|---|---|---|---|
| `adapter_state` | ✓ | — | PDA: `["adapter_state"]` |
| `user` | — | ✓ | User wallet |
| `user_token_account` | ✓ | — | User's ATA for underlying |
| `user_share_account` | ✓ | — | User's ATA for shares |
| `vault` | ✓ | — | Adapter's token vault |
| `share_mint` | ✓ | — | Share token mint |
| `vault_authority` | — | — | PDA: `["vault_authority"]` |
| `token_program` | — | — | SPL Token program |

**Optional (for withdrawal-queue adapters):**
| Account | Writable | Signer | Description |
|---|---|---|---|
| `withdrawal_request` | ✓ | — | PDA: `["withdrawal_request", user]` |
| `system_program` | — | — | Required if `init_if_needed` |

---

### 3. `adapter_current_value`

```
Discriminator: sha256("global:adapter_current_value")[..8]
```

**Parameters (Borsh-encoded):**
| Field | Type | Description |
|---|---|---|
| `shares` | `u64` | Number of shares to value |

**Return value:** `u64` — current value in underlying token atomics.

**Required accounts:**
| Account | Writable | Signer | Description |
|---|---|---|---|
| `adapter_state` | — | — | PDA: `["adapter_state"]` — read-only |

**Invariants:**
- MUST NOT mutate any state
- MUST return the current redemption value (not the deposit value)
- For adapters with accruing interest, MUST include virtually accrued interest

---

## Required PDAs

### `adapter_state`
**Seeds:** `["adapter_state"]`
**Program:** the adapter program itself

Minimum required fields:
```rust
pub struct AdapterState {
    pub admin: Pubkey,           // upgrade authority
    pub underlying_mint: Pubkey, // e.g. USDC
    pub share_mint: Pubkey,      // receipt token mint
    pub vault: Pubkey,           // token vault address
    pub deposits_paused: bool,   // emergency pause
    pub min_deposit: u64,        // minimum deposit amount
    pub last_updated: i64,       // last state update timestamp
    pub vault_auth_bump: u8,     // vault_authority PDA bump
    pub bump: u8,                // this PDA's bump
}
```

### `vault_authority`
**Seeds:** `["vault_authority"]`
**Program:** the adapter program itself

This PDA must be the mint authority for the `share_mint` and the owner of the `vault` token account. It signs CPI calls via `invoke_signed`.

---

## Share Price Model

Adapters must maintain a monotonically non-decreasing share price (barring loss events). Two common approaches:

### Exchange Rate (Kamino-style)
```
shares = amount * 10_000 / exchange_rate_bps
amount = shares * exchange_rate_bps / 10_000
```
`exchange_rate_bps` starts at 10,000 (1:1) and increases as yield accrues.

### High-Precision Share Value (MarginFi-style)
```
shares = amount * 1_000_000 / asset_share_value
amount = shares * asset_share_value / 1_000_000
```
`asset_share_value` starts at 1,000,000 and increases via `accrue_interest`.

### NAV-Based (Maple/Jupiter-style)
```
shares = deposit * total_shares / pool_value
value  = shares  * pool_value   / total_shares
```
Pool value is updated externally (oracle or admin).

---

## Adapter Metadata Requirements

When registering with the Dnipro Registry, adapters must provide:

| Field | Max Length | Description |
|---|---|---|
| `name` | 64 bytes | Human-readable name: "Kamino USDC" |
| `protocol` | 32 bytes | Protocol identifier: "kamino" |
| `metadata_uri` | 128 bytes | IPFS or HTTPS URI with extended metadata |
| `risk_score` | u8 (0-100) | Risk assessment: 0=lowest, 100=highest |

The metadata URI should point to a JSON file with:
```json
{
  "description": "Full description...",
  "website": "https://...",
  "docs": "https://...",
  "audit_reports": ["https://..."],
  "withdrawal_delay_seconds": 0,
  "underlying_token": "USDC",
  "share_token": "kUSDC",
  "category": "lending"
}
```

---

## Error Codes

All adapters should define at minimum:

```rust
#[error_code]
pub enum AdapterError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Deposits are currently paused")]
    DepositsPaused,
    #[msg("Amount below minimum deposit")]
    BelowMinDeposit,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}
```

---

## Compliance Checklist

Before submitting a governance registration proposal, verify:

- [ ] All three required instructions implemented
- [ ] `adapter_state` PDA at seeds `["adapter_state"]`
- [ ] `vault_authority` PDA at seeds `["vault_authority"]`
- [ ] `vault_authority` is owner of vault token account
- [ ] `vault_authority` is mint authority of `share_mint`
- [ ] Slippage protection on deposit and withdraw
- [ ] Emergency pause (`deposits_paused`) respected
- [ ] Checked arithmetic throughout
- [ ] `adapter_current_value` is read-only (no state changes)
- [ ] Events emitted on deposit and withdraw
- [ ] Integration tests covering: deposit, withdraw, slippage, pause, minimum deposit
- [ ] Metadata URI points to valid JSON
- [ ] Audit report linked in metadata

---

## Reference Implementations

Five reference adapters are included in the Dnipro repository:

| Adapter | Path | Notable pattern |
|---|---|---|
| Kamino | `programs/adapters/kamino/` | Exchange rate BPS, kToken minting |
| MarginFi | `programs/adapters/marginfi/` | High-precision share value, interest accrual |
| Jupiter | `programs/adapters/jupiter/` | NAV-based, JLP supply tracking |
| Maple | `programs/adapters/maple/` | 7-day withdrawal queue PDA |
| Drift | `programs/adapters/drift/` | 14-day unstake queue, insurance fund |

Use `dnipro generate <name>` to scaffold from the standard template.

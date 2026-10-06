# @dnipro/sdk — Full API Reference

The `@dnipro/sdk` package provides everything you need to interact with the Dnipro protocol from TypeScript.

## Installation

```bash
npm install @dnipro/sdk @solana/web3.js @coral-xyz/anchor
# or
yarn add @dnipro/sdk @solana/web3.js @coral-xyz/anchor
```

## Quick Setup

```typescript
import { DniproClient, ADAPTER_PROGRAM_IDS, USDC_MINT } from '@dnipro/sdk';
import { Connection } from '@solana/web3.js';

const connection = new Connection(process.env.RPC_URL, 'confirmed');
const client = new DniproClient(connection);
```

---

## DniproClient

### Constructor

```typescript
new DniproClient(connection: Connection, opts?: DniproClientOptions)
```

**Options:**
```typescript
interface DniproClientOptions {
  programIds?: {
    dispatcher?: PublicKey;
    registry?: PublicKey;
  };
  commitment?: 'processed' | 'confirmed' | 'finalized';
}
```

---

### Config methods

#### `getDispatcherConfig()`
```typescript
async getDispatcherConfig(): Promise<DispatcherConfig | null>
```
Returns global dispatcher configuration including fee BPS, fee recipient, paused state, and lifetime stats.

#### `getRegistryConfig()`
```typescript
async getRegistryConfig(): Promise<RegistryConfig | null>
```
Returns registry governance config including governance authority, timelock delay, and adapter counts.

---

### Adapter methods

#### `getAllAdapters()`
```typescript
async getAllAdapters(): Promise<AdapterDisplay[]>
```
Fetches all adapters registered in the Dnipro Registry (active and inactive).

#### `getActiveAdapters()`
```typescript
async getActiveAdapters(): Promise<AdapterDisplay[]>
```
Filters for adapters that are currently active and accepting deposits.

#### `getAdapter(programId: PublicKey)`
```typescript
async getAdapter(programId: PublicKey): Promise<AdapterDisplay | null>
```
Fetch a single adapter by its program ID.

**`AdapterDisplay` fields:**
```typescript
interface AdapterDisplay {
  programId: PublicKey;
  name: string;              // "Kamino USDC"
  protocol: string;          // "kamino"
  underlyingMint: PublicKey;
  category: AdapterCategory;
  categoryLabel: string;     // "Lending"
  apyBps: number;            // 820 = 8.20%
  apyPercent: string;        // "8.20%"
  tvl: BN;
  tvlFormatted: string;      // "$47.3M"
  isActive: boolean;
  depositsPaused: boolean;
  maxDeposit: BN;            // 0 = unlimited
  minDeposit: BN;
  riskScore: number;         // 0-100
  riskLabel: 'Low' | 'Medium' | 'High';
  withdrawalDelay: string | null; // "7 days" or null
  metadataUri: string;
}
```

---

### Position methods

#### `getPosition(user, adapterProgramId)`
```typescript
async getPosition(
  user: PublicKey,
  adapterProgramId: PublicKey
): Promise<Position | null>
```

#### `getAllPositions(user)`
```typescript
async getAllPositions(user: PublicKey): Promise<PositionWithValue[]>
```
Returns all active positions across all five adapters for a given user.

#### `getPortfolioSummary(user)`
```typescript
async getPortfolioSummary(user: PublicKey): Promise<{
  positions: PositionWithValue[];
  totalDeposited: BN;
  totalValue: BN;
  totalPnl: BN;
  totalDepositedFormatted: string;
  totalValueFormatted: string;
  totalPnlFormatted: string;
  positionCount: number;
}>
```

---

### Transaction methods

#### `simulateDeposit(adapterProgramId, amount)`
```typescript
async simulateDeposit(
  adapterProgramId: PublicKey,
  amount: BN
): Promise<SimulationResult>
```

```typescript
interface SimulationResult {
  estimatedOutput: BN;    // net amount after fee
  estimatedFee: BN;       // protocol fee
  priceImpactBps: number; // 0 for lending adapters
  minOutput: BN;          // with 0.5% default slippage
  warnings: string[];
}
```

#### `buildDepositTransaction(params)`
```typescript
buildDepositTransaction(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterVault: PublicKey;
  feeRecipientAccount: PublicKey;
  deposit: {
    amount: BN;
    minSharesOut?: BN;
    slippageBps?: number; // default 50
  };
}): Transaction
```

Returns an unsigned `Transaction` ready to be signed by the user's wallet.

#### `buildWithdrawTransaction(params)`
```typescript
buildWithdrawTransaction(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterVault: PublicKey;
  feeRecipientAccount: PublicKey;
  withdraw: {
    shares: BN;            // 0 = withdraw all
    minAmountOut?: BN;
    slippageBps?: number;
  };
}): Transaction
```

---

## Account Fetchers

Low-level functions for direct PDA derivation and account deserialization.

### PDA derivation

```typescript
import {
  findDispatcherConfigPDA,
  findRegistryConfigPDA,
  findPositionPDA,
  findAdapterRecordPDA,
} from '@dnipro/sdk';

const [configPDA, bump] = findDispatcherConfigPDA();
const [positionPDA]     = findPositionPDA(userWallet, kaminoProgramId);
const [adapterRecord]   = findAdapterRecordPDA(kaminoProgramId);
```

All functions return `[PublicKey, number]` — the PDA address and its bump seed.

---

## Constants

```typescript
import {
  DISPATCHER_PROGRAM_ID,
  REGISTRY_PROGRAM_ID,
  ADAPTER_PROGRAM_IDS,
  USDC_MINT,
  SEEDS,
  ADAPTER_METADATA,
  BPS_DENOMINATOR,    // 10_000
  USDC_DECIMALS,      // 6
  USDC_BASE,          // 1_000_000
} from '@dnipro/sdk';

// All five adapter program IDs
ADAPTER_PROGRAM_IDS.kamino   // PublicKey
ADAPTER_PROGRAM_IDS.marginfi // PublicKey
ADAPTER_PROGRAM_IDS.jupiter  // PublicKey
ADAPTER_PROGRAM_IDS.maple    // PublicKey
ADAPTER_PROGRAM_IDS.drift    // PublicKey

// Static metadata (website, docs, audit, description)
ADAPTER_METADATA.kamino.website // "https://kamino.finance"
ADAPTER_METADATA.kamino.description // "..."
ADAPTER_METADATA.maple.withdrawalDelay // "7 days"
```

---

## Utilities

```typescript
import {
  formatUsdc,
  bpsToPercent,
  riskLabel,
  usdcToAtomics,
  atomicsToUsdc,
  estimateDailyYield,
  formatAddress,
  formatTimestamp,
} from '@dnipro/sdk';

formatUsdc(new BN(47_300_000_000))  // "$47.3K"
formatUsdc(new BN(1_000_000))       // "$1.00"
bpsToPercent(820)                    // "8.20%"
riskLabel(25)                        // "Low"
riskLabel(55)                        // "Medium"
usdcToAtomics(100.50)               // BN(100_500_000)
atomicsToUsdc(new BN(1_000_000))    // 1.0
estimateDailyYield(new BN(1_000_000_000), 820)  // ~$0.22/day
formatAddress("DniproKam...1111")   // "Dnip…1111"
```

---

## Types

```typescript
import type {
  AdapterInfo,
  AdapterDisplay,
  AdapterCategory,
  Position,
  PositionWithValue,
  DispatcherConfig,
  RegistryConfig,
  DepositParams,
  WithdrawParams,
  SimulationResult,
  DniproClientOptions,
  DepositEvent,
  WithdrawEvent,
} from '@dnipro/sdk';
```

---

## Error handling

```typescript
try {
  const sim = await client.simulateDeposit(
    ADAPTER_PROGRAM_IDS.kamino,
    usdcToAtomics(1000)
  );
  if (sim.warnings.length > 0) {
    console.warn('Warnings:', sim.warnings);
  }
} catch (err) {
  if (err instanceof Error) {
    console.error('SDK error:', err.message);
  }
}
```

---

## React integration example

```typescript
// hooks/useDnipro.ts
import { useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { DniproClient } from '@dnipro/sdk';

export function useDniproClient() {
  const { connection } = useConnection();
  return useMemo(() => new DniproClient(connection), [connection]);
}

// Usage in component:
function MyComponent() {
  const client = useDniproClient();
  const [adapters, setAdapters] = useState([]);

  useEffect(() => {
    client.getActiveAdapters().then(setAdapters);
  }, [client]);

  // ...
}
```

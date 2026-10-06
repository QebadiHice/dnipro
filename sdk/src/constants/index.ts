// sdk/src/constants/index.ts
import { PublicKey } from '@solana/web3.js';

// ── Program IDs ──────────────────────────────────────────────────────────────
// Reference IDs only. Before deployment run `anchor keys sync` and `npm run sync:ids`
// so the SDK matches the actual programs deployed by your wallet.

export const DISPATCHER_PROGRAM_ID = new PublicKey(
  '9pBagrmLndcGR6fGBwaEqtuEb5qp1EipDX3mHh7VGJLQ'
);

export const REGISTRY_PROGRAM_ID = new PublicKey(
  'EXm2s98kb6eiYemAMc56NNF8wGHFW5NA4j4F9tpkp9ZS'
);

// ── Adapter Program IDs ───────────────────────────────────────────────────────

export const ADAPTER_PROGRAM_IDS = {
  kamino:   new PublicKey('GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB'),
  marginfi: new PublicKey('7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP'),
  jupiter:  new PublicKey('Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi'),
  maple:    new PublicKey('Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv'),
  drift:    new PublicKey('8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8'),
} as const;

// ── Token Mints (mainnet) ────────────────────────────────────────────────────

export const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

export const USDT_MINT = new PublicKey(
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
);

// ── PDA Seeds ─────────────────────────────────────────────────────────────────

export const SEEDS = {
  DISPATCHER_CONFIG: Buffer.from('dispatcher_config'),
  REGISTRY_CONFIG: Buffer.from('registry_config'),
  POSITION: Buffer.from('position'),
  ADAPTER: Buffer.from('adapter'),
  PROPOSAL: Buffer.from('proposal'),
} as const;

// ── Protocol constants ────────────────────────────────────────────────────────

export const BPS_DENOMINATOR = 10_000;
export const LAMPORTS_PER_SOL = 1_000_000_000;
export const USDC_DECIMALS = 6;
export const USDC_BASE = 10 ** USDC_DECIMALS;

// ── Adapter metadata ──────────────────────────────────────────────────────────

export const ADAPTER_METADATA = {
  kamino: {
    name: 'Kamino USDC',
    protocol: 'kamino',
    description: 'Reference adapter target for Kamino USDC lending. Live protocol CPI must be deployed and verified.',
    website: 'https://kamino.finance',
    docs: 'https://docs.kamino.finance',
    riskScore: 20,
    withdrawalDelay: null,
    auditUrl: 'https://docs.kamino.finance/security',
  },
  marginfi: {
    name: 'MarginFi USDC',
    protocol: 'marginfi',
    description: 'Reference adapter target for marginfi USDC lending. Live protocol CPI must be deployed and verified.',
    website: 'https://app.marginfi.com',
    docs: 'https://docs.marginfi.com',
    riskScore: 25,
    withdrawalDelay: null,
    auditUrl: 'https://docs.marginfi.com/security',
  },
  jupiter: {
    name: 'Jupiter LP (JLP)',
    protocol: 'jupiter',
    description: 'Reference adapter target for Jupiter liquidity. Live protocol CPI must be deployed and verified.',
    website: 'https://jup.ag/perps',
    docs: 'https://station.jup.ag/docs/perpetual-exchange/jlp',
    riskScore: 40,
    withdrawalDelay: null,
    auditUrl: 'https://station.jup.ag/docs/security',
  },
  maple: {
    name: 'Maple Syrup',
    protocol: 'maple',
    description: 'Reference adapter target for Maple-style credit yield. Live protocol integration must be deployed and verified.',
    website: 'https://maple.finance',
    docs: 'https://maplefinance.gitbook.io',
    riskScore: 55,
    withdrawalDelay: '7 days',
    auditUrl: 'https://maple.finance/security',
  },
  drift: {
    name: 'Drift Insurance Fund',
    protocol: 'drift',
    description: 'Reference adapter target for Drift insurance-fund yield. Live protocol CPI must be deployed and verified.',
    website: 'https://drift.trade',
    docs: 'https://docs.drift.trade/insurance-fund',
    riskScore: 45,
    withdrawalDelay: '14 days',
    auditUrl: 'https://docs.drift.trade/security',
  },
} as const;

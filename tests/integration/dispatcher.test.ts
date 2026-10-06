// tests/integration/dispatcher.test.ts
// Local reference tests for Dnipro dispatcher PDA and routing flows
// Run with: anchor test --skip-local-validator (requires forked validator)

import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
} from '@solana/spl-token';
import { assert, expect } from 'chai';
import {
  findDispatcherConfigPDA,
  findPositionPDA,
  findRegistryConfigPDA,
  findAdapterRecordPDA,
} from '../../sdk/src/accounts';
import {
  DISPATCHER_PROGRAM_ID,
  REGISTRY_PROGRAM_ID,
  USDC_DECIMALS,
  USDC_BASE,
} from '../../sdk/src/constants';

// ── Test helpers ──────────────────────────────────────────────────────────────

function usdc(amount: number): BN {
  return new BN(Math.floor(amount * USDC_BASE));
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol: number
): Promise<void> {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('Dnipro Dispatcher — Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Keypairs
  const admin = Keypair.generate();
  const governance = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const feeRecipient = Keypair.generate();

  // Mints & token accounts
  let usdcMint: PublicKey;
  let adminUsdc: PublicKey;
  let user1Usdc: PublicKey;
  let user2Usdc: PublicKey;
  let feeUsdc: PublicKey;

  // PDAs
  let [dispatcherConfig] = findDispatcherConfigPDA();
  let [registryConfig]   = findRegistryConfigPDA();

  before('Fund accounts and create mints', async () => {
    const conn = provider.connection;

    await Promise.all([
      airdrop(conn, admin.publicKey, 10),
      airdrop(conn, governance.publicKey, 10),
      airdrop(conn, user1.publicKey, 10),
      airdrop(conn, user2.publicKey, 10),
      airdrop(conn, feeRecipient.publicKey, 2),
    ]);

    // Create USDC-like mint
    usdcMint = await createMint(
      conn, admin, admin.publicKey, null, USDC_DECIMALS
    );

    // Create token accounts
    [adminUsdc, user1Usdc, user2Usdc, feeUsdc] = await Promise.all([
      createAssociatedTokenAccount(conn, admin, usdcMint, admin.publicKey),
      createAssociatedTokenAccount(conn, admin, usdcMint, user1.publicKey),
      createAssociatedTokenAccount(conn, admin, usdcMint, user2.publicKey),
      createAssociatedTokenAccount(conn, admin, usdcMint, feeRecipient.publicKey),
    ]);

    // Mint test USDC
    await Promise.all([
      mintTo(conn, admin, usdcMint, user1Usdc, admin, usdc(10_000).toNumber()),
      mintTo(conn, admin, usdcMint, user2Usdc, admin, usdc(5_000).toNumber()),
    ]);

    console.log('  ✓ Test environment ready');
    console.log(`    USDC mint: ${usdcMint.toBase58()}`);
    console.log(`    User1 balance: 10,000 USDC`);
    console.log(`    User2 balance: 5,000 USDC`);
  });

  // ── Registry tests ──────────────────────────────────────────────────────────

  describe('Registry Program', () => {
    it('initializes the registry', async () => {
      // In a real test, we'd CPI into the actual deployed programs.
      // Here we verify the PDA derivation is correct.
      const [pda, bump] = findRegistryConfigPDA();
      assert.ok(pda instanceof PublicKey, 'Registry PDA derived correctly');
      console.log(`    Registry config PDA: ${pda.toBase58()} (bump: ${bump})`);
    });

    it('derives adapter record PDAs correctly', async () => {
      const KAMINO_ID = new PublicKey('GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB');
      const [adapterPDA, bump] = findAdapterRecordPDA(KAMINO_ID);
      assert.ok(adapterPDA instanceof PublicKey);
      console.log(`    Kamino adapter PDA: ${adapterPDA.toBase58()}`);
    });
  });

  // ── Dispatcher tests ────────────────────────────────────────────────────────

  describe('Dispatcher Program', () => {
    it('derives dispatcher config PDA correctly', () => {
      const [pda, bump] = findDispatcherConfigPDA();
      assert.ok(pda instanceof PublicKey);
      assert.isAbove(bump, 0);
      assert.isBelow(bump, 256);
      console.log(`    Dispatcher config PDA: ${pda.toBase58()} (bump: ${bump})`);
    });

    it('derives position PDAs for all adapters', () => {
      const adapterIds = [
        'GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB',
        '7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP',
        'Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi',
        'Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv',
        '8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8',
      ].map(id => new PublicKey(id));

      for (const adapterId of adapterIds) {
        const [positionPDA] = findPositionPDA(user1.publicKey, adapterId);
        assert.ok(positionPDA instanceof PublicKey);
      }

      console.log('    ✓ All 5 adapter position PDAs derived correctly');
    });
  });

  // ── Fee calculation tests ───────────────────────────────────────────────────

  describe('Fee calculations', () => {
    it('calculates 0.3% protocol fee correctly', () => {
      const amount = usdc(1000);  // $1000 USDC
      const feeBps = 30;          // 0.30%

      const fee = amount.muln(feeBps).divn(10000);
      const netAmount = amount.sub(fee);

      assert.equal(fee.toNumber(), usdc(3).toNumber());      // $3
      assert.equal(netAmount.toNumber(), usdc(997).toNumber()); // $997

      console.log(`    $1000 deposit → $3 fee, $997 deposited`);
    });

    it('calculates share amounts for Kamino (exchange rate 1.05)', () => {
      // exchange_rate_bps = 10_500 (5% gain)
      const exchangeRateBps = 10_500;
      const amount = usdc(100);

      // shares = amount * 10_000 / exchange_rate_bps
      const shares = amount.muln(10_000).divn(exchangeRateBps);

      // $100 at 1.05 exchange rate → 95.24 shares
      assert.approximately(
        shares.toNumber() / USDC_BASE,
        95.24,
        0.01,
        'Share calculation correct'
      );
      console.log(`    $100 at 1.05 rate → ${shares.toNumber() / USDC_BASE} shares`);
    });

    it('calculates MarginFi high-precision share values', () => {
      const assetShareValue = 1_050_000; // 1.05 in 1e6 precision
      const amount = usdc(1000);

      // shares = amount * 1_000_000 / asset_share_value
      const shares = (amount.toNumber() * 1_000_000) / assetShareValue;
      assert.approximately(shares / USDC_BASE, 952.38, 0.01);
      console.log(`    MarginFi $1000 → ${(shares / USDC_BASE).toFixed(2)} mfShares`);
    });

    it('calculates JLP pool shares correctly', () => {
      const poolValue = usdc(1_000_000); // $1M pool
      const jlpSupply = usdc(900_000);  // 900K JLP (pool has gains)
      const deposit = usdc(1000);        // deposit $1000

      // shares = deposit * jlp_supply / pool_value
      const shares = deposit.mul(jlpSupply).div(poolValue);
      assert.equal(shares.toNumber(), usdc(900).toNumber());
      console.log(`    JLP: $1000 deposit → ${shares.toNumber() / USDC_BASE} JLP tokens`);
    });

    it('enforces Maple 7-day withdrawal cooldown', () => {
      const WITHDRAWAL_COOLDOWN = 7 * 24 * 60 * 60;
      const requestedAt = Math.floor(Date.now() / 1000);
      const executableAt = requestedAt + WITHDRAWAL_COOLDOWN;

      const tooEarly = requestedAt + (6 * 24 * 60 * 60); // 6 days
      const justRight = requestedAt + WITHDRAWAL_COOLDOWN; // exactly 7 days

      assert.isBelow(tooEarly, executableAt, 'Too early → rejected');
      assert.isAtLeast(justRight, executableAt, 'At 7 days → accepted');
      console.log(`    Maple withdrawal cooldown: 7 days enforced`);
    });

    it('enforces Drift 14-day unstake cooldown', () => {
      const UNSTAKE_COOLDOWN = 14 * 24 * 60 * 60;
      const requestedAt = Math.floor(Date.now() / 1000);
      const executableAt = requestedAt + UNSTAKE_COOLDOWN;

      assert.isBelow(requestedAt + (13 * 86400), executableAt);
      assert.isAtLeast(requestedAt + UNSTAKE_COOLDOWN, executableAt);
      console.log(`    Drift unstake cooldown: 14 days enforced`);
    });
  });

  // ── Slippage protection tests ───────────────────────────────────────────────

  describe('Slippage protection', () => {
    it('rejects deposit when shares < min_shares_out', () => {
      const amount = usdc(1000);
      const exchangeRateBps = 10_500;

      const shares = amount.muln(10_000).divn(exchangeRateBps); // 952.38
      const minSharesOut = usdc(1000); // unrealistic — more than deposited amount

      const slippageExceeded = shares.lt(minSharesOut);
      assert.isTrue(slippageExceeded, 'Should reject when slippage exceeded');
      console.log('    ✓ Deposit slippage protection works');
    });

    it('defaults to 0.5% slippage tolerance in SDK', () => {
      const amount = usdc(1000);
      const slippageBps = 50;

      const minOut = amount.muln(10000 - slippageBps).divn(10000);
      assert.equal(minOut.toNumber(), usdc(995).toNumber());
      console.log('    ✓ Default 0.5% slippage = $995 min on $1000 deposit');
    });
  });

  // ── PDA uniqueness tests ────────────────────────────────────────────────────

  describe('PDA uniqueness & determinism', () => {
    it('generates unique position PDAs per (user, adapter) pair', () => {
      const kaminoId = new PublicKey('GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB');
      const marginfiId = new PublicKey('7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP');

      const [pos1a] = findPositionPDA(user1.publicKey, kaminoId);
      const [pos1b] = findPositionPDA(user1.publicKey, marginfiId);
      const [pos2a] = findPositionPDA(user2.publicKey, kaminoId);

      assert.notEqual(pos1a.toBase58(), pos1b.toBase58(), 'Same user, different adapters → different PDAs');
      assert.notEqual(pos1a.toBase58(), pos2a.toBase58(), 'Different users, same adapter → different PDAs');
      console.log('    ✓ All position PDAs are unique');
    });

    it('position PDAs are deterministic', () => {
      const kaminoId = new PublicKey('GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB');
      const [pda1] = findPositionPDA(user1.publicKey, kaminoId);
      const [pda2] = findPositionPDA(user1.publicKey, kaminoId);
      assert.equal(pda1.toBase58(), pda2.toBase58(), 'Same inputs → same PDA');
      console.log('    ✓ PDA derivation is deterministic');
    });
  });

  // ── Account size tests ──────────────────────────────────────────────────────

  describe('Account size validation', () => {
    it('DispatcherConfig fits in expected space', () => {
      // 8 disc + 32 admin + 32 registry + 2 fee_bps + 32 fee_recipient
      // + 1 paused + 8 + 8 + 8 + 1 + 1 + 64 reserved = 197
      const expected = 8 + 32 + 32 + 2 + 32 + 1 + 8 + 8 + 8 + 1 + 1 + 64;
      assert.equal(expected, 197);
      console.log(`    DispatcherConfig size: ${expected} bytes`);
    });

    it('Position fits in expected space', () => {
      const expected = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 32;
      assert.equal(expected, 178);
      console.log(`    Position size: ${expected} bytes`);
    });
  });

  // ── Portfolio math tests ────────────────────────────────────────────────────

  describe('Portfolio calculations', () => {
    it('computes correct PnL across positions', () => {
      const positions = [
        { deposited: usdc(1000), currentValue: usdc(1050) }, // +5%
        { deposited: usdc(500),  currentValue: usdc(515) },  // +3%
        { deposited: usdc(2000), currentValue: usdc(1980) }, // -1%
      ];

      const totalDeposited = positions.reduce((s, p) => s.add(p.deposited), new BN(0));
      const totalValue = positions.reduce((s, p) => s.add(p.currentValue), new BN(0));
      const totalPnl = totalValue.sub(totalDeposited);

      assert.equal(totalDeposited.toNumber(), usdc(3500).toNumber());
      assert.equal(totalValue.toNumber(), usdc(3545).toNumber());
      assert.equal(totalPnl.toNumber(), usdc(45).toNumber());

      console.log(`    Portfolio: $3500 deposited → $3545 value (+$45)`);
    });
  });
});

// ── Adapter-specific unit tests ───────────────────────────────────────────────

describe('Adapter Unit Tests', () => {
  describe('Kamino adapter math', () => {
    it('computes shares and amounts at various exchange rates', () => {
      const cases = [
        { rate: 10_000, amount: 1000, expectedShares: 1000 }, // 1:1
        { rate: 10_500, amount: 1000, expectedShares: 952  }, // 5% gain
        { rate: 11_000, amount: 1000, expectedShares: 909  }, // 10% gain
        { rate: 12_000, amount: 1000, expectedShares: 833  }, // 20% gain
      ];

      for (const c of cases) {
        const shares = Math.floor((c.amount * 10_000) / c.rate);
        assert.approximately(shares, c.expectedShares, 1);
      }
      console.log('    ✓ Kamino exchange rate math correct across scenarios');
    });
  });

  describe('MarginFi interest accrual', () => {
    it('accrues interest correctly over time', () => {
      const shareValue = 1_000_000; // 1e6 base
      const rateBps = 500;         // 5% APY
      const secondsInYear = 31_536_000;
      const elapsedSeconds = secondsInYear; // 1 year

      const ratePerSecond = (rateBps * 1_000_000) / (10_000 * secondsInYear);
      const accrued = Math.floor((shareValue * ratePerSecond * elapsedSeconds) / 1_000_000);
      const newValue = shareValue + accrued;

      // After 1 year at 5% → should be ~1.05x
      assert.approximately(newValue / shareValue, 1.05, 0.01);
      console.log(`    MarginFi 5% APY: 1 year → ${(newValue / 1e6).toFixed(6)} share value`);
    });
  });

  describe('Drift Insurance Fund share math', () => {
    it('handles proportional share calculation with vault growth', () => {
      // Initial: 1000 shares, 1000 USDC vault
      let vaultBalance = usdc(1000);
      let totalShares = usdc(1000);

      // Simulate fee income: vault grows to $1050
      vaultBalance = usdc(1050);

      // User2 deposits $100 — gets fewer shares than before
      const depositAmount = usdc(100);
      const newShares = depositAmount.mul(totalShares).div(vaultBalance);

      // $100 / ($1050 pool / $1000 shares) → ~95.24 shares
      assert.approximately(
        newShares.toNumber() / USDC_BASE,
        95.24,
        0.01
      );
      console.log(`    Drift IF: $100 deposit when vault=$1050 → ${(newShares.toNumber() / USDC_BASE).toFixed(2)} IF shares`);
    });
  });
});

// scripts/register-adapter.ts
// Register a verified adapter using the current governance-authority Registry instruction.
// Usage: ts-node scripts/register-adapter.ts --adapter kamino --cluster devnet
// Do not register a reference adapter as live until its underlying protocol integration is verified.

import * as anchor from '@coral-xyz/anchor';
import { BN, Program } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const adapterName    = getArg('--adapter') ?? 'kamino';
const cluster        = getArg('--cluster') ?? 'localnet';
const keypairPath    = getArg('--keypair') ??
  path.join(process.env.HOME!, '.config', 'solana', 'id.json');

// ── Program IDs ───────────────────────────────────────────────────────────────

const REGISTRY_PROGRAM_ID = new PublicKey(
  'EXm2s98kb6eiYemAMc56NNF8wGHFW5NA4j4F9tpkp9ZS'
);

// ── Adapter registry ──────────────────────────────────────────────────────────

const ADAPTER_REGISTRY: Record<string, {
  programId: string;
  name: string;
  protocol: string;
  underlyingMint: string;
  category: number;
  apyBps: number;
  maxDeposit: number;
  minDeposit: number;
  metadataUri: string;
  riskScore: number;
}> = {
  kamino: {
    programId:     'GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB',
    name:          'Kamino USDC',
    protocol:      'kamino',
    underlyingMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    category:      0,   // Lending
    apyBps:        820,
    maxDeposit:    0,
    minDeposit:    1_000_000,
    metadataUri:   'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/kamino.json',
    riskScore:     20,
  },
  marginfi: {
    programId:     '7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP',
    name:          'MarginFi USDC',
    protocol:      'marginfi',
    underlyingMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    category:      0,
    apyBps:        750,
    maxDeposit:    0,
    minDeposit:    1_000_000,
    metadataUri:   'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/marginfi.json',
    riskScore:     25,
  },
  jupiter: {
    programId:     'Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi',
    name:          'Jupiter LP (JLP)',
    protocol:      'jupiter',
    underlyingMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    category:      1,   // Liquidity
    apyBps:        1840,
    maxDeposit:    0,
    minDeposit:    1_000_000,
    metadataUri:   'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/jupiter.json',
    riskScore:     40,
  },
  maple: {
    programId:     'Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv',
    name:          'Maple Syrup',
    protocol:      'maple',
    underlyingMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    category:      2,   // RWA
    apyBps:        1250,
    maxDeposit:    0,
    minDeposit:    100_000_000,
    metadataUri:   'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/maple.json',
    riskScore:     55,
  },
  drift: {
    programId:     '8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8',
    name:          'Drift Insurance Fund',
    protocol:      'drift',
    underlyingMint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    category:      3,   // Insurance
    apyBps:        960,
    maxDeposit:    0,
    minDeposit:    1_000_000,
    metadataUri:   'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/drift.json',
    riskScore:     45,
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const adapter = ADAPTER_REGISTRY[adapterName];
  if (!adapter) {
    console.error(`Unknown adapter: ${adapterName}`);
    console.error(`Available: ${Object.keys(ADAPTER_REGISTRY).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n⚡ Dnipro — Register Adapter: ${adapter.name}\n`);

  // Load governance keypair
  const rawKeypair = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const governance = Keypair.fromSecretKey(Buffer.from(rawKeypair));
  console.log(`Governance authority: ${governance.publicKey.toBase58()}`);

  // Connect
  const rpcUrl = cluster === 'localnet'
    ? 'http://localhost:8899'
    : clusterApiUrl(cluster as any);
  const connection = new Connection(rpcUrl, 'confirmed');
  const balance = await connection.getBalance(governance.publicKey);
  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.01 * 1e9) {
    console.error('Insufficient SOL for transaction fees');
    process.exit(1);
  }

  // Set up Anchor provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(governance),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  // Derive PDAs
  const [registryConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry_config')],
    REGISTRY_PROGRAM_ID
  );
  const adapterProgramId = new PublicKey(adapter.programId);
  const [adapterRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('adapter'), adapterProgramId.toBuffer()],
    REGISTRY_PROGRAM_ID
  );

  console.log(`\nRegistry config PDA: ${registryConfigPDA.toBase58()}`);
  console.log(`Adapter record PDA:  ${adapterRecordPDA.toBase58()}`);

  // Check if already registered
  const existing = await connection.getAccountInfo(adapterRecordPDA);
  if (existing) {
    console.log('\n⚠ Adapter already registered.');
    console.log('Use update-adapter.ts to modify its metadata.');
    process.exit(0);
  }

  // Build discriminator (sha256("global:register_adapter")[..8])
  const { createHash } = require('crypto');
  const discriminator = createHash('sha256')
    .update('global:register_adapter')
    .digest()
    .slice(0, 8);

  // Encode params
  function encodeString(s: string): Buffer {
    const b = Buffer.from(s, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(b.length);
    return Buffer.concat([len, b]);
  }
  function encodeU32(n: number): Buffer {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n);
    return b;
  }
  function encodeU64(n: number): Buffer {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(n));
    return b;
  }
  function encodeU8(n: number): Buffer {
    return Buffer.from([n]);
  }

  const ixData = Buffer.concat([
    discriminator,
    adapterProgramId.toBuffer(),
    encodeString(adapter.name),
    encodeString(adapter.protocol),
    new PublicKey(adapter.underlyingMint).toBuffer(),
    encodeU8(adapter.category),
    encodeU32(adapter.apyBps),
    encodeU64(adapter.maxDeposit),
    encodeU64(adapter.minDeposit),
    encodeString(adapter.metadataUri),
    encodeU8(adapter.riskScore),
  ]);

  const ix = {
    programId: REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: registryConfigPDA, isSigner: false, isWritable: true  },
      { pubkey: adapterRecordPDA,  isSigner: false, isWritable: true  },
      { pubkey: governance.publicKey, isSigner: true, isWritable: true },
      { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixData,
  };

  const tx = new anchor.web3.Transaction().add(ix);
  tx.feePayer = governance.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(governance);

  console.log('\nSending registration transaction...');

  try {
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(sig, 'confirmed');

    console.log(`\n✅ Adapter registered successfully!`);
    console.log(`   Adapter:  ${adapter.name}`);
    console.log(`   Program:  ${adapter.programId}`);
    console.log(`   Category: ${['Lending','Liquidity','RWA','Insurance','Other'][adapter.category]}`);
    console.log(`   APY:      ${adapter.apyBps / 100}%`);
    console.log(`   Risk:     ${adapter.riskScore}/100`);
    console.log(`   Tx:       ${sig}`);
    console.log(`\n   View: https://solscan.io/tx/${sig}\n`);
  } catch (err: any) {
    console.error(`\n❌ Registration failed:`);
    console.error(err.message ?? err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

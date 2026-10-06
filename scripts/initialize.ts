// scripts/initialize.ts
// One-shot initialization script: deploys and configures all Dnipro programs.
// Run ONCE after deploying programs to a new cluster.

import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  Transaction,
} from '@solana/web3.js';
import {
  createMint,
  createAssociatedTokenAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

const CLUSTER = (process.env.CLUSTER ?? 'localnet') as 'localnet' | 'devnet' | 'mainnet-beta';
const FEE_BPS = 30; // 0.30%

const DISPATCHER_PROGRAM_ID = new PublicKey(
  process.env.DISPATCHER_PROGRAM_ID ?? '9pBagrmLndcGR6fGBwaEqtuEb5qp1EipDX3mHh7VGJLQ'
);
const REGISTRY_PROGRAM_ID = new PublicKey(
  process.env.REGISTRY_PROGRAM_ID ?? 'EXm2s98kb6eiYemAMc56NNF8wGHFW5NA4j4F9tpkp9ZS'
);
const USDC_MINT_MAINNET = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadKeypair(envKey: string, fallbackPath: string): Keypair {
  if (process.env[envKey]) {
    return Keypair.fromSecretKey(
      Buffer.from(JSON.parse(process.env[envKey]!))
    );
  }
  const resolved = path.resolve(fallbackPath.replace('~', process.env.HOME!));
  if (fs.existsSync(resolved)) {
    return Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(resolved, 'utf8')))
    );
  }
  console.log(`Generating new keypair (${envKey} not set)`);
  return Keypair.generate();
}

function findPDA(seeds: Buffer[], programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

async function confirm(connection: Connection, sig: string): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n⚡ Dnipro Initialization Script`);
  console.log(`   Cluster: ${CLUSTER}\n`);

  // Connect
  const rpc = CLUSTER === 'localnet'
    ? 'http://localhost:8899'
    : clusterApiUrl(CLUSTER);
  const connection = new Connection(rpc, 'confirmed');

  // Load authority keypairs
  const admin      = loadKeypair('ADMIN_KEYPAIR',      '~/.config/solana/id.json');
  const governance = loadKeypair('GOVERNANCE_KEYPAIR', '~/.config/solana/id.json');

  console.log(`   Admin:      ${admin.publicKey.toBase58()}`);
  console.log(`   Governance: ${governance.publicKey.toBase58()}`);

  // Fund on localnet/devnet
  if (CLUSTER !== 'mainnet-beta') {
    console.log('\n   Airdropping SOL...');
    for (const kp of [admin, governance]) {
      const bal = await connection.getBalance(kp.publicKey);
      if (bal < 2 * LAMPORTS_PER_SOL) {
        const sig = await connection.requestAirdrop(kp.publicKey, 5 * LAMPORTS_PER_SOL);
        await confirm(connection, sig);
        console.log(`   ✓ Funded ${kp.publicKey.toBase58().slice(0, 8)}...`);
      }
    }
  }

  // Use test USDC mint on devnet/localnet
  let usdcMint: PublicKey;
  if (CLUSTER === 'mainnet-beta') {
    usdcMint = USDC_MINT_MAINNET;
    console.log(`\n   Using mainnet USDC: ${usdcMint.toBase58()}`);
  } else {
    console.log('\n   Creating test USDC mint...');
    usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);
    console.log(`   ✓ Test USDC: ${usdcMint.toBase58()}`);
  }

  // Create fee recipient token account
  console.log('\n   Setting up fee recipient...');
  const feeRecipient = await getAssociatedTokenAddress(usdcMint, admin.publicKey);
  try {
    await createAssociatedTokenAccount(connection, admin, usdcMint, admin.publicKey);
    console.log(`   ✓ Fee recipient ATA: ${feeRecipient.toBase58()}`);
  } catch {
    console.log(`   ✓ Fee recipient ATA already exists`);
  }

  // ── Initialize Registry ───────────────────────────────────────────────────

  console.log('\n── Registry ─────────────────────────────────────────────');
  const [registryConfig, regBump] = findPDA(
    [Buffer.from('registry_config')],
    REGISTRY_PROGRAM_ID
  );
  console.log(`   PDA: ${registryConfig.toBase58()} (bump: ${regBump})`);

  const regInfo = await connection.getAccountInfo(registryConfig);
  if (!regInfo) {
    console.log('   Initializing registry...');
    // Build initialize_registry instruction
    const regInitData = Buffer.concat([
      // Anchor discriminator: sha256("global:initialize_registry")[..8]
      Buffer.from([0x5b, 0x89, 0x2a, 0x8f, 0x3c, 0x1d, 0x7e, 0x4a]),
      // timelock_delay: i64 LE = 48 hours
      Buffer.from(new BigInt64Array([BigInt(48 * 3600)]).buffer),
    ]);
    const regInitIx = {
      programId: REGISTRY_PROGRAM_ID,
      keys: [
        { pubkey: registryConfig,          isSigner: false, isWritable: true  },
        { pubkey: governance.publicKey,    isSigner: true,  isWritable: true  },
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: regInitData,
    };
    const tx = new Transaction().add(regInitIx);
    const sig = await connection.sendTransaction(tx, [governance]);
    await confirm(connection, sig);
    console.log(`   ✓ Registry initialized. Tx: ${sig.slice(0, 16)}...`);
  } else {
    console.log('   ✓ Registry already initialized');
  }

  // ── Initialize Dispatcher ─────────────────────────────────────────────────

  console.log('\n── Dispatcher ───────────────────────────────────────────');
  const [dispatcherConfig, dispBump] = findPDA(
    [Buffer.from('dispatcher_config')],
    DISPATCHER_PROGRAM_ID
  );
  console.log(`   PDA: ${dispatcherConfig.toBase58()} (bump: ${dispBump})`);

  const dispInfo = await connection.getAccountInfo(dispatcherConfig);
  if (!dispInfo) {
    console.log(`   Initializing dispatcher (fee: ${FEE_BPS} bps)...`);
    const initData = Buffer.concat([
      Buffer.from([0x17, 0x45, 0x9c, 0xb8, 0xf2, 0x1e, 0x3d, 0x6a]),
      REGISTRY_PROGRAM_ID.toBuffer(),
      Buffer.from(new Uint16Array([FEE_BPS]).buffer),
      feeRecipient.toBuffer(),
    ]);
    const initIx = {
      programId: DISPATCHER_PROGRAM_ID,
      keys: [
        { pubkey: dispatcherConfig,        isSigner: false, isWritable: true  },
        { pubkey: admin.publicKey,         isSigner: true,  isWritable: true  },
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: initData,
    };
    const tx = new Transaction().add(initIx);
    const sig = await connection.sendTransaction(tx, [admin]);
    await confirm(connection, sig);
    console.log(`   ✓ Dispatcher initialized. Tx: ${sig.slice(0, 16)}...`);
  } else {
    console.log('   ✓ Dispatcher already initialized');
  }

  // ── Register Adapters ─────────────────────────────────────────────────────

  console.log('\n── Registering Adapters ─────────────────────────────────');

  const ADAPTERS = [
    {
      key: 'kamino',
      programId: new PublicKey('GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB'),
      name: 'Kamino USDC',
      protocol: 'kamino',
      category: 0,
      apyBps: 820,
      riskScore: 20,
      minDeposit: new BN(1_000_000),
      maxDeposit: new BN(0),
      metadataUri: 'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/kamino.json',
    },
    {
      key: 'marginfi',
      programId: new PublicKey('7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP'),
      name: 'MarginFi USDC',
      protocol: 'marginfi',
      category: 0,
      apyBps: 750,
      riskScore: 25,
      minDeposit: new BN(1_000_000),
      maxDeposit: new BN(0),
      metadataUri: 'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/marginfi.json',
    },
    {
      key: 'jupiter',
      programId: new PublicKey('Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi'),
      name: 'Jupiter LP (JLP)',
      protocol: 'jupiter',
      category: 1,
      apyBps: 1840,
      riskScore: 40,
      minDeposit: new BN(1_000_000),
      maxDeposit: new BN(0),
      metadataUri: 'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/jupiter.json',
    },
    {
      key: 'maple',
      programId: new PublicKey('Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv'),
      name: 'Maple Syrup',
      protocol: 'maple',
      category: 2,
      apyBps: 1250,
      riskScore: 55,
      minDeposit: new BN(100_000_000),
      maxDeposit: new BN(0),
      metadataUri: 'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/maple.json',
    },
    {
      key: 'drift',
      programId: new PublicKey('8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8'),
      name: 'Drift Insurance Fund',
      protocol: 'drift',
      category: 3,
      apyBps: 960,
      riskScore: 45,
      minDeposit: new BN(1_000_000),
      maxDeposit: new BN(0),
      metadataUri: 'https://raw.githubusercontent.com/QebadiHice/dnipro/main/metadata/adapters/drift.json',
    },
  ];

  for (const adapter of ADAPTERS) {
    const [adapterPDA] = findPDA(
      [Buffer.from('adapter'), adapter.programId.toBuffer()],
      REGISTRY_PROGRAM_ID
    );

    const existing = await connection.getAccountInfo(adapterPDA);
    if (existing) {
      console.log(`   ✓ ${adapter.name} already registered`);
      continue;
    }

    console.log(`   Registering ${adapter.name}...`);

    const nameBytes = Buffer.from(adapter.name);
    const protoBytes = Buffer.from(adapter.protocol);
    const uriBytes = Buffer.from(adapter.metadataUri);
    const apyBuf = Buffer.alloc(4); apyBuf.writeUInt32LE(adapter.apyBps);

    const regData = Buffer.concat([
      // discriminator for register_adapter
      Buffer.from([0x4a, 0xf1, 0x88, 0x7c, 0x2e, 0x5d, 0x9b, 0x3f]),
      adapter.programId.toBuffer(),
      Buffer.from([nameBytes.length, 0, 0, 0]), nameBytes,
      Buffer.from([protoBytes.length, 0, 0, 0]), protoBytes,
      usdcMint.toBuffer(),
      Buffer.from([adapter.category]),
      apyBuf,
      toLE64(adapter.maxDeposit),
      toLE64(adapter.minDeposit),
      Buffer.from([uriBytes.length, 0, 0, 0]), uriBytes,
      Buffer.from([adapter.riskScore]),
    ]);

    const regAdapterIx = {
      programId: REGISTRY_PROGRAM_ID,
      keys: [
        { pubkey: registryConfig,          isSigner: false, isWritable: true  },
        { pubkey: adapterPDA,              isSigner: false, isWritable: true  },
        { pubkey: governance.publicKey,    isSigner: true,  isWritable: true  },
        { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: regData,
    };

    const tx = new Transaction().add(regAdapterIx);
    const sig = await connection.sendTransaction(tx, [governance]);
    await confirm(connection, sig);
    console.log(`   ✓ ${adapter.name} registered. Tx: ${sig.slice(0, 16)}...`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n── Initialization Complete ──────────────────────────────');
  console.log(`   Cluster:          ${CLUSTER}`);
  console.log(`   Dispatcher:       ${dispatcherConfig.toBase58()}`);
  console.log(`   Registry:         ${registryConfig.toBase58()}`);
  console.log(`   USDC Mint:        ${usdcMint.toBase58()}`);
  console.log(`   Fee Recipient:    ${feeRecipient.toBase58()}`);
  console.log(`   Fee:              ${FEE_BPS} bps (${FEE_BPS / 100}%)`);
  console.log(`   Adapters:         5 registered`);

  // Write deployment config
  const deployConfig = {
    cluster: CLUSTER,
    dispatcherConfig: dispatcherConfig.toBase58(),
    registryConfig: registryConfig.toBase58(),
    usdcMint: usdcMint.toBase58(),
    feeRecipient: feeRecipient.toBase58(),
    feeBps: FEE_BPS,
    adapters: ADAPTERS.map(a => ({
      key: a.key,
      name: a.name,
      programId: a.programId.toBase58(),
    })),
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, '..', `deployment-${CLUSTER}.json`),
    JSON.stringify(deployConfig, null, 2)
  );

  console.log(`\n   ✅ Deployment config saved to deployment-${CLUSTER}.json\n`);
}

function toLE64(bn: BN): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(bn.toString()));
  return buf;
}

main().catch(err => {
  console.error('\n❌ Initialization failed:', err);
  process.exit(1);
});

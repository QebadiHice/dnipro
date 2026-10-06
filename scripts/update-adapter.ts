// scripts/update-adapter.ts
// Update an adapter's APY, TVL, risk score, or metadata URI.
// Usage: ts-node scripts/update-adapter.ts --adapter kamino --apy 850 --cluster devnet

import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const adapterName  = getArg('--adapter') ?? '';
const newApyBps    = getArg('--apy')     ? parseInt(getArg('--apy')!) : undefined;
const newTvl       = getArg('--tvl')     ? parseInt(getArg('--tvl')!) : undefined;
const newRisk      = getArg('--risk')    ? parseInt(getArg('--risk')!) : undefined;
const cluster      = getArg('--cluster') ?? 'localnet';
const keypairPath  = getArg('--keypair') ??
  path.join(process.env.HOME!, '.config', 'solana', 'id.json');

const REGISTRY_PROGRAM_ID = new PublicKey('EXm2s98kb6eiYemAMc56NNF8wGHFW5NA4j4F9tpkp9ZS');

const ADAPTER_PROGRAMS: Record<string, string> = {
  kamino:   'GENyHjfFyapa8AA8HaxLvZE9eZ3uMFca18d26RJJ9DxB',
  marginfi: '7s7FUYn9h5gtjaUpMjDTuaAEcNH9Zm2g6JYaJ9gY76SP',
  jupiter:  'Eh9e2Q55pKimA7TA5z6qoGi92xXqqYEKagdv1pvwCfLi',
  maple:    'Ht1uo1tiXUjPouaNmDxqNpGN5K7jNi4jGJq6crZPrPcv',
  drift:    '8ZEWPwXBjTG3DsP2sJLYpgf5iTgGay4C8YJoc5mb4YP8',
};

async function main() {
  if (!adapterName || !ADAPTER_PROGRAMS[adapterName]) {
    console.error('Usage: ts-node scripts/update-adapter.ts --adapter <name> [--apy <bps>] [--tvl <amount>] [--risk <0-100>]');
    console.error(`Available adapters: ${Object.keys(ADAPTER_PROGRAMS).join(', ')}`);
    process.exit(1);
  }

  const rawKeypair = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const governance = Keypair.fromSecretKey(Buffer.from(rawKeypair));

  const rpcUrl = cluster === 'localnet'
    ? 'http://localhost:8899'
    : anchor.web3.clusterApiUrl(cluster as any);
  const connection = new Connection(rpcUrl, 'confirmed');

  const adapterProgramId = new PublicKey(ADAPTER_PROGRAMS[adapterName]);
  const [registryConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('registry_config')],
    REGISTRY_PROGRAM_ID
  );
  const [adapterRecordPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('adapter'), adapterProgramId.toBuffer()],
    REGISTRY_PROGRAM_ID
  );

  console.log(`\nUpdating ${adapterName}:`);
  if (newApyBps !== undefined) console.log(`  APY: ${newApyBps / 100}%`);
  if (newTvl    !== undefined) console.log(`  TVL: $${(newTvl / 1e6).toFixed(2)}`);
  if (newRisk   !== undefined) console.log(`  Risk: ${newRisk}/100`);

  const { createHash } = require('crypto');
  const discriminator = createHash('sha256')
    .update('global:update_adapter')
    .digest()
    .slice(0, 8);

  // Borsh encode Option<u32>, Option<u64>
  function encodeOptionU32(v: number | undefined): Buffer {
    if (v === undefined) return Buffer.from([0]);
    const b = Buffer.alloc(5);
    b[0] = 1;
    b.writeUInt32LE(v, 1);
    return b;
  }
  function encodeOptionU64(v: number | undefined): Buffer {
    if (v === undefined) return Buffer.from([0]);
    const b = Buffer.alloc(9);
    b[0] = 1;
    b.writeBigUInt64LE(BigInt(v), 1);
    return b;
  }
  function encodeOptionString(s: string | undefined): Buffer {
    if (s === undefined) return Buffer.from([0]);
    const sb = Buffer.from(s, 'utf8');
    const lb = Buffer.alloc(4);
    lb.writeUInt32LE(sb.length);
    return Buffer.concat([Buffer.from([1]), lb, sb]);
  }
  function encodeOptionU8(v: number | undefined): Buffer {
    if (v === undefined) return Buffer.from([0]);
    return Buffer.from([1, v]);
  }

  const ixData = Buffer.concat([
    discriminator,
    encodeOptionU32(newApyBps),
    encodeOptionU64(newTvl),
    encodeOptionU64(undefined),   // max_deposit not changing
    encodeOptionU64(undefined),   // min_deposit not changing
    encodeOptionString(undefined),// metadata_uri not changing
    encodeOptionU8(newRisk),
    encodeOptionU8(undefined),    // deposits_paused not changing
  ]);

  const ix = {
    programId: REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: registryConfigPDA, isSigner: false, isWritable: false },
      { pubkey: adapterRecordPDA,  isSigner: false, isWritable: true  },
      { pubkey: governance.publicKey, isSigner: true, isWritable: false },
    ],
    data: ixData,
  };

  const tx = new anchor.web3.Transaction().add(ix);
  tx.feePayer = governance.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(governance);

  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');

  console.log(`\n✅ Adapter updated: ${sig}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });

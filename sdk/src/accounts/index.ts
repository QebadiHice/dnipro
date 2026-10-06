// sdk/src/accounts/index.ts
import {
  Connection,
  PublicKey,
  AccountInfo,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  DISPATCHER_PROGRAM_ID,
  REGISTRY_PROGRAM_ID,
  SEEDS,
} from '../constants';
import type {
  DispatcherConfig,
  RegistryConfig,
  AdapterInfo,
  Position,
  AdapterCategory,
} from '../types';

// ── PDA derivation ────────────────────────────────────────────────────────────

export function findDispatcherConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.DISPATCHER_CONFIG],
    DISPATCHER_PROGRAM_ID
  );
}

export function findRegistryConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.REGISTRY_CONFIG],
    REGISTRY_PROGRAM_ID
  );
}

export function findPositionPDA(
  user: PublicKey,
  adapterProgramId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, user.toBuffer(), adapterProgramId.toBuffer()],
    DISPATCHER_PROGRAM_ID
  );
}

export function findAdapterRecordPDA(
  adapterProgramId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ADAPTER, adapterProgramId.toBuffer()],
    REGISTRY_PROGRAM_ID
  );
}

// ── Deserializers ─────────────────────────────────────────────────────────────

function readPublicKey(data: Buffer, offset: number): PublicKey {
  return new PublicKey(data.slice(offset, offset + 32));
}

function readU64(data: Buffer, offset: number): BN {
  return new BN(data.slice(offset, offset + 8), 'le');
}

function readU32(data: Buffer, offset: number): number {
  return data.readUInt32LE(offset);
}

function readU16(data: Buffer, offset: number): number {
  return data.readUInt16LE(offset);
}

function readI64(data: Buffer, offset: number): number {
  return Number(new BN(data.slice(offset, offset + 8), 'le').toString());
}

function readString(data: Buffer, offset: number, maxLen: number): string {
  const slice = data.slice(offset, offset + maxLen);
  const nullIdx = slice.indexOf(0);
  return slice.slice(0, nullIdx >= 0 ? nullIdx : maxLen).toString('utf8');
}

export function deserializeDispatcherConfig(
  data: Buffer
): DispatcherConfig {
  // Skip 8-byte discriminator
  let o = 8;
  return {
    admin:               readPublicKey(data, o),      // +32 → o=40
    registryProgram:     readPublicKey(data, (o += 32)), // +32 → 72
    feeBps:              readU16(data, (o += 32)),    // +2  → 74
    feeRecipient:        readPublicKey(data, (o += 2)), // +32 → 106
    paused:              data[o += 32] === 1,         // +1  → 107
    totalDepositsUsd:    readU64(data, (o += 1)),     // +8  → 115
    totalWithdrawalsUsd: readU64(data, (o += 8)),     // +8  → 123
    activePositions:     readU64(data, (o += 8)),     // +8  → 131
    version:             data[o += 8],
  };
}

export function deserializeRegistryConfig(data: Buffer): RegistryConfig {
  let o = 8;
  const governance = readPublicKey(data, o); o += 32;
  const hasPending = data[o] === 1; o += 1;
  const pendingGovernance = hasPending ? readPublicKey(data, o) : null; o += 32;
  return {
    governance,
    pendingGovernance,
    timelockDelay: readI64(data, o),
    adapterCount:  readU32(data, o + 8),
    activeCount:   readU32(data, o + 12),
    version:       data[o + 16],
  };
}

export function deserializeAdapterRecord(
  data: Buffer,
  publicKey: PublicKey
): AdapterInfo {
  let o = 8;
  const programId     = readPublicKey(data, o); o += 32;
  const name          = readString(data, o, 64); o += 64;
  const protocol      = readString(data, o, 32); o += 32;
  const underlyingMint = readPublicKey(data, o); o += 32;
  const category      = data[o] as AdapterCategory; o += 1;
  const apyBps        = readU32(data, o); o += 4;
  const tvl           = readU64(data, o); o += 8;
  const isActive      = data[o] === 1; o += 1;
  const depositsPaused = data[o] === 1; o += 1;
  const maxDeposit    = readU64(data, o); o += 8;
  const minDeposit    = readU64(data, o); o += 8;
  const registeredAt  = readI64(data, o); o += 8;
  const updatedAt     = readI64(data, o); o += 8;
  const registeredBy  = readPublicKey(data, o); o += 32;
  const metadataUri   = readString(data, o, 128); o += 128;
  const riskScore     = data[o];

  return {
    programId, name, protocol, underlyingMint,
    category, apyBps, tvl, isActive, depositsPaused,
    maxDeposit, minDeposit, registeredAt, updatedAt,
    registeredBy, metadataUri, riskScore,
  };
}

export function deserializePosition(
  data: Buffer,
  publicKey: PublicKey
): Position {
  let o = 8;
  return {
    owner:            readPublicKey(data, o),
    adapterProgramId: readPublicKey(data, (o += 32)),
    underlyingMint:   readPublicKey(data, (o += 32)),
    depositedAmount:  readU64(data, (o += 32)),
    shares:           readU64(data, (o += 8)),
    feesPaid:         readU64(data, (o += 8)),
    openedAt:         readI64(data, (o += 8)),
    lastUpdatedAt:    readI64(data, (o += 8)),
    isActive:         data[o += 8] === 1,
    publicKey,
  };
}

// ── Account fetchers ──────────────────────────────────────────────────────────

export async function fetchDispatcherConfig(
  connection: Connection
): Promise<DispatcherConfig | null> {
  const [pda] = findDispatcherConfigPDA();
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;
  return deserializeDispatcherConfig(Buffer.from(info.data));
}

export async function fetchRegistryConfig(
  connection: Connection
): Promise<RegistryConfig | null> {
  const [pda] = findRegistryConfigPDA();
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;
  return deserializeRegistryConfig(Buffer.from(info.data));
}

export async function fetchAdapterRecord(
  connection: Connection,
  adapterProgramId: PublicKey
): Promise<AdapterInfo | null> {
  const [pda] = findAdapterRecordPDA(adapterProgramId);
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;
  return deserializeAdapterRecord(Buffer.from(info.data), pda);
}

export async function fetchAllAdapters(
  connection: Connection,
  adapterProgramIds: PublicKey[]
): Promise<AdapterInfo[]> {
  const pdas = adapterProgramIds.map(id => findAdapterRecordPDA(id)[0]);
  const accounts = await connection.getMultipleAccountsInfo(pdas);
  return accounts
    .map((info, i) =>
      info ? deserializeAdapterRecord(Buffer.from(info.data), pdas[i]) : null
    )
    .filter((a): a is AdapterInfo => a !== null);
}

export async function fetchPosition(
  connection: Connection,
  user: PublicKey,
  adapterProgramId: PublicKey
): Promise<Position | null> {
  const [pda] = findPositionPDA(user, adapterProgramId);
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;
  return deserializePosition(Buffer.from(info.data), pda);
}

export async function fetchAllPositions(
  connection: Connection,
  user: PublicKey,
  adapterProgramIds: PublicKey[]
): Promise<Position[]> {
  const pdas = adapterProgramIds.map(id => findPositionPDA(user, id)[0]);
  const accounts = await connection.getMultipleAccountsInfo(pdas);
  return accounts
    .map((info, i) =>
      info ? deserializePosition(Buffer.from(info.data), pdas[i]) : null
    )
    .filter((p): p is Position => p !== null && p.isActive);
}

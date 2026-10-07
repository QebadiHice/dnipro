import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { DISPATCHER_PROGRAM_ID, REGISTRY_PROGRAM_ID, SEEDS } from '../constants';
import type {
  DispatcherConfig,
  RegistryConfig,
  AdapterInfo,
  Position,
  AdapterCategory,
} from '../types';

export function findDispatcherConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.DISPATCHER_CONFIG], DISPATCHER_PROGRAM_ID);
}

export function findDispatcherAuthorityPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('dispatcher_authority_v2')], DISPATCHER_PROGRAM_ID);
}

export function findRegistryConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.REGISTRY_CONFIG], REGISTRY_PROGRAM_ID);
}

export function findPositionPDA(user: PublicKey, adapterProgramId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POSITION, user.toBuffer(), adapterProgramId.toBuffer()],
    DISPATCHER_PROGRAM_ID
  );
}

export function findAdapterRecordPDA(adapterProgramId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.ADAPTER, adapterProgramId.toBuffer()],
    REGISTRY_PROGRAM_ID
  );
}

function readPublicKey(data: Buffer, offset: number): PublicKey {
  return new PublicKey(data.subarray(offset, offset + 32));
}

function readU64(data: Buffer, offset: number): BN {
  return new BN(data.subarray(offset, offset + 8), 'le');
}

function readI64(data: Buffer, offset: number): number {
  return Number(new BN(data.subarray(offset, offset + 8), 'le').fromTwos(64).toString());
}

function readString(data: Buffer, offset: number, maxLen: number): string {
  const slice = data.subarray(offset, offset + maxLen);
  const nullIdx = slice.indexOf(0);
  return slice.subarray(0, nullIdx >= 0 ? nullIdx : maxLen).toString('utf8');
}

export function deserializeDispatcherConfig(data: Buffer): DispatcherConfig {
  let o = 8;
  const admin = readPublicKey(data, o); o += 32;
  const registryProgram = readPublicKey(data, o); o += 32;
  const paused = data[o++] === 1;
  const bump = data[o++];
  const authorityBump = data[o++];
  return {
    admin,
    registryProgram,
    paused,
    bump,
    authorityBump,
    feeBps: 0,
    feeRecipient: SystemProgram.programId,
    totalDepositsUsd: new BN(0),
    totalWithdrawalsUsd: new BN(0),
    activePositions: new BN(0),
    version: 2,
  };
}

export function deserializeRegistryConfig(data: Buffer): RegistryConfig {
  let o = 8;
  const governance = readPublicKey(data, o); o += 32;
  const adapterCount = data.readUInt32LE(o); o += 4;
  const bump = data[o];
  return {
    governance,
    adapterCount,
    bump,
    pendingGovernance: null,
    timelockDelay: 0,
    activeCount: adapterCount,
    version: 2,
  };
}

export function deserializeAdapterRecord(data: Buffer, _publicKey: PublicKey): AdapterInfo {
  let o = 8;
  const programId = readPublicKey(data, o); o += 32;
  const underlyingMint = readPublicKey(data, o); o += 32;
  const adapterState = readPublicKey(data, o); o += 32;
  const adapterVault = readPublicKey(data, o); o += 32;
  const adapterVaultAuthority = readPublicKey(data, o); o += 32;
  const isActive = data[o++] === 1;
  const name = readString(data, o, 32);

  return {
    programId,
    underlyingMint,
    adapterState,
    adapterVault,
    adapterVaultAuthority,
    isActive,
    name,
    protocol: 'dnipro',
    category: 4 as AdapterCategory,
    apyBps: 0,
    tvl: new BN(0),
    depositsPaused: !isActive,
    maxDeposit: new BN(0),
    minDeposit: new BN(0),
    registeredAt: 0,
    updatedAt: 0,
    registeredBy: SystemProgram.programId,
    metadataUri: '',
    riskScore: 0,
  };
}

export function deserializePosition(data: Buffer, publicKey: PublicKey): Position {
  let o = 8;
  const owner = readPublicKey(data, o); o += 32;
  const adapterProgramId = readPublicKey(data, o); o += 32;
  const underlyingMint = readPublicKey(data, o); o += 32;
  const amount = readU64(data, o); o += 8;
  const updatedAt = readI64(data, o); o += 8;
  const isActive = data[o] === 1;
  return {
    owner,
    adapterProgramId,
    underlyingMint,
    depositedAmount: amount,
    shares: amount,
    feesPaid: new BN(0),
    openedAt: updatedAt,
    lastUpdatedAt: updatedAt,
    isActive,
    publicKey,
  };
}

export async function fetchDispatcherConfig(connection: Connection): Promise<DispatcherConfig | null> {
  const [pda] = findDispatcherConfigPDA();
  const info = await connection.getAccountInfo(pda);
  return info ? deserializeDispatcherConfig(Buffer.from(info.data)) : null;
}

export async function fetchRegistryConfig(connection: Connection): Promise<RegistryConfig | null> {
  const [pda] = findRegistryConfigPDA();
  const info = await connection.getAccountInfo(pda);
  return info ? deserializeRegistryConfig(Buffer.from(info.data)) : null;
}

export async function fetchAdapterRecord(connection: Connection, adapterProgramId: PublicKey): Promise<AdapterInfo | null> {
  const [pda] = findAdapterRecordPDA(adapterProgramId);
  const info = await connection.getAccountInfo(pda);
  return info ? deserializeAdapterRecord(Buffer.from(info.data), pda) : null;
}

export async function fetchAllAdapters(connection: Connection, adapterProgramIds: PublicKey[]): Promise<AdapterInfo[]> {
  const pdas = adapterProgramIds.map(id => findAdapterRecordPDA(id)[0]);
  const accounts = await connection.getMultipleAccountsInfo(pdas);
  return accounts
    .map((info, i) => (info ? deserializeAdapterRecord(Buffer.from(info.data), pdas[i]) : null))
    .filter((a): a is AdapterInfo => a !== null);
}

export async function fetchPosition(connection: Connection, user: PublicKey, adapterProgramId: PublicKey): Promise<Position | null> {
  const [pda] = findPositionPDA(user, adapterProgramId);
  const info = await connection.getAccountInfo(pda);
  return info ? deserializePosition(Buffer.from(info.data), pda) : null;
}

export async function fetchAllPositions(connection: Connection, user: PublicKey, adapterProgramIds: PublicKey[]): Promise<Position[]> {
  const pdas = adapterProgramIds.map(id => findPositionPDA(user, id)[0]);
  const accounts = await connection.getMultipleAccountsInfo(pdas);
  return accounts
    .map((info, i) => (info ? deserializePosition(Buffer.from(info.data), pdas[i]) : null))
    .filter((p): p is Position => p !== null && p.isActive);
}

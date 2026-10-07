import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import BN from 'bn.js';
import { DISPATCHER_PROGRAM_ID, REGISTRY_PROGRAM_ID } from '../constants';
import {
  findAdapterRecordPDA,
  findDispatcherAuthorityPDA,
  findDispatcherConfigPDA,
  findPositionPDA,
  findRegistryConfigPDA,
} from '../accounts';
import type { DepositParams, WithdrawParams } from '../types';

function sighash(ixName: string): Buffer {
  const { createHash } = require('crypto');
  return Buffer.from(createHash('sha256').update(`global:${ixName}`).digest().subarray(0, 8));
}

function encodeU64(n: BN): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n.toString()));
  return buf;
}

function fixedName(name: string): Buffer {
  const out = Buffer.alloc(32);
  Buffer.from(name).subarray(0, 32).copy(out);
  return out;
}

export function buildInitializeRegistryIx(governance: PublicKey): TransactionInstruction {
  const [config] = findRegistryConfigPDA();
  return new TransactionInstruction({
    programId: REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: governance, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: sighash('initialize_registry'),
  });
}

export function buildInitializeDispatcherIx(params: {
  admin: PublicKey;
  registryProgram?: PublicKey;
  feeBps?: number;
  feeRecipient?: PublicKey;
}): TransactionInstruction {
  const [config] = findDispatcherConfigPDA();
  const [authority] = findDispatcherAuthorityPDA();
  const registryProgram = params.registryProgram ?? REGISTRY_PROGRAM_ID;
  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: params.admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([sighash('initialize'), registryProgram.toBuffer()]),
  });
}

export function buildDepositIx(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterState: PublicKey;
  adapterVault: PublicKey;
  adapterVaultAuthority: PublicKey;
  deposit: DepositParams;
  feeRecipientAccount?: PublicKey;
}): TransactionInstruction {
  const [config] = findDispatcherConfigPDA();
  const [authority] = findDispatcherAuthorityPDA();
  const [position] = findPositionPDA(params.user, params.adapterProgramId);
  const [record] = findAdapterRecordPDA(params.adapterProgramId);
  const userAta = getAssociatedTokenAddressSync(params.underlyingMint, params.user);

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: position, isSigner: false, isWritable: true },
      { pubkey: record, isSigner: false, isWritable: false },
      { pubkey: params.adapterProgramId, isSigner: false, isWritable: false },
      { pubkey: params.adapterState, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: params.user, isSigner: true, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: params.adapterVault, isSigner: false, isWritable: true },
      { pubkey: params.adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: params.underlyingMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([sighash('deposit'), encodeU64(params.deposit.amount)]),
  });
}

export function buildWithdrawIx(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterState: PublicKey;
  adapterVault: PublicKey;
  adapterVaultAuthority: PublicKey;
  withdraw: WithdrawParams;
  feeRecipientAccount?: PublicKey;
}): TransactionInstruction {
  const [config] = findDispatcherConfigPDA();
  const [authority] = findDispatcherAuthorityPDA();
  const [position] = findPositionPDA(params.user, params.adapterProgramId);
  const [record] = findAdapterRecordPDA(params.adapterProgramId);
  const userAta = getAssociatedTokenAddressSync(params.underlyingMint, params.user);
  const amount = params.withdraw.amount ?? params.withdraw.shares;

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: position, isSigner: false, isWritable: true },
      { pubkey: record, isSigner: false, isWritable: false },
      { pubkey: params.adapterProgramId, isSigner: false, isWritable: false },
      { pubkey: params.adapterState, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: params.user, isSigner: true, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: params.adapterVault, isSigner: false, isWritable: true },
      { pubkey: params.adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: params.underlyingMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([sighash('withdraw'), encodeU64(amount)]),
  });
}

export function buildRegisterAdapterIx(params: {
  governance: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterState: PublicKey;
  adapterVault: PublicKey;
  adapterVaultAuthority: PublicKey;
  name: string;
  protocol?: string;
  category?: number;
  apyBps?: number;
  maxDeposit?: BN;
  minDeposit?: BN;
  metadataUri?: string;
  riskScore?: number;
}): TransactionInstruction {
  const [config] = findRegistryConfigPDA();
  const [record] = findAdapterRecordPDA(params.adapterProgramId);
  return new TransactionInstruction({
    programId: REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: record, isSigner: false, isWritable: true },
      { pubkey: params.adapterProgramId, isSigner: false, isWritable: false },
      { pubkey: params.adapterState, isSigner: false, isWritable: false },
      { pubkey: params.adapterVault, isSigner: false, isWritable: false },
      { pubkey: params.adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: params.underlyingMint, isSigner: false, isWritable: false },
      { pubkey: params.governance, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([sighash('register_adapter'), fixedName(params.name)]),
  });
}

/** Dnipro v2 reads Position accounts directly instead of sending a current_value instruction. */
export function buildCurrentValueIx(): TransactionInstruction {
  throw new Error('Dnipro v2 reads the on-chain Position account directly; no current_value instruction is required.');
}

// sdk/src/instructions/index.ts
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import BN from 'bn.js';
import { DISPATCHER_PROGRAM_ID, REGISTRY_PROGRAM_ID, BPS_DENOMINATOR } from '../constants';
import {
  findDispatcherConfigPDA,
  findRegistryConfigPDA,
  findPositionPDA,
  findAdapterRecordPDA,
} from '../accounts';
import type { DepositParams, WithdrawParams } from '../types';

// ── Anchor discriminator helper ───────────────────────────────────────────────

function sighash(nameSpace: string, ixName: string): Buffer {
  const { createHash } = require('crypto');
  const preimage = `${nameSpace}:${ixName}`;
  return Buffer.from(
    createHash('sha256').update(preimage).digest().slice(0, 8)
  );
}

function encodeU64(n: BN): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(n.toString()));
  return buf;
}

function encodeU16(n: number): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(n);
  return buf;
}

// ── Dispatcher: initialize ────────────────────────────────────────────────────

export function buildInitializeDispatcherIx(params: {
  admin: PublicKey;
  registryProgram: PublicKey;
  feeBps: number;
  feeRecipient: PublicKey;
}): TransactionInstruction {
  const [configPDA] = findDispatcherConfigPDA();

  const data = Buffer.concat([
    sighash('global', 'initialize'),
    params.registryProgram.toBuffer(),
    encodeU16(params.feeBps),
    params.feeRecipient.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: configPDA,           isSigner: false, isWritable: true  },
      { pubkey: params.admin,        isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Dispatcher: deposit ───────────────────────────────────────────────────────

export function buildDepositIx(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterVault: PublicKey;
  feeRecipientAccount: PublicKey;
  deposit: DepositParams;
}): TransactionInstruction {
  const [configPDA]   = findDispatcherConfigPDA();
  const [positionPDA] = findPositionPDA(params.user, params.adapterProgramId);
  const userATA       = getAssociatedTokenAddressSync(params.underlyingMint, params.user);

  // Apply slippage
  const slippageBps = params.deposit.slippageBps ?? 50;
  const minSharesOut = params.deposit.minSharesOut
    ?? params.deposit.amount.muln(BPS_DENOMINATOR - slippageBps).divn(BPS_DENOMINATOR);

  const data = Buffer.concat([
    sighash('global', 'deposit'),
    encodeU64(params.deposit.amount),
    encodeU64(minSharesOut),
  ]);

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: configPDA,                      isSigner: false, isWritable: false },
      { pubkey: positionPDA,                    isSigner: false, isWritable: true  },
      { pubkey: params.user,                    isSigner: true,  isWritable: true  },
      { pubkey: userATA,                        isSigner: false, isWritable: true  },
      { pubkey: params.feeRecipientAccount,     isSigner: false, isWritable: true  },
      { pubkey: params.adapterVault,            isSigner: false, isWritable: true  },
      { pubkey: params.underlyingMint,          isSigner: false, isWritable: false },
      { pubkey: params.adapterProgramId,        isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,               isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,    isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,        isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Dispatcher: withdraw ──────────────────────────────────────────────────────

export function buildWithdrawIx(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  underlyingMint: PublicKey;
  adapterVault: PublicKey;
  feeRecipientAccount: PublicKey;
  withdraw: WithdrawParams;
}): TransactionInstruction {
  const [configPDA]   = findDispatcherConfigPDA();
  const [positionPDA] = findPositionPDA(params.user, params.adapterProgramId);
  const userATA       = getAssociatedTokenAddressSync(params.underlyingMint, params.user);

  const slippageBps = params.withdraw.slippageBps ?? 50;
  const minAmountOut = params.withdraw.minAmountOut
    ?? params.withdraw.shares.muln(BPS_DENOMINATOR - slippageBps).divn(BPS_DENOMINATOR);

  const data = Buffer.concat([
    sighash('global', 'withdraw'),
    encodeU64(params.withdraw.shares),
    encodeU64(minAmountOut),
  ]);

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: configPDA,                   isSigner: false, isWritable: true  },
      { pubkey: positionPDA,                 isSigner: false, isWritable: true  },
      { pubkey: params.user,                 isSigner: true,  isWritable: true  },
      { pubkey: userATA,                     isSigner: false, isWritable: true  },
      { pubkey: params.feeRecipientAccount,  isSigner: false, isWritable: true  },
      { pubkey: params.adapterVault,         isSigner: false, isWritable: true  },
      { pubkey: params.underlyingMint,       isSigner: false, isWritable: false },
      { pubkey: params.adapterProgramId,     isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,            isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Dispatcher: current_value ─────────────────────────────────────────────────

export function buildCurrentValueIx(params: {
  user: PublicKey;
  adapterProgramId: PublicKey;
  adapterState: PublicKey;
}): TransactionInstruction {
  const [configPDA]   = findDispatcherConfigPDA();
  const [positionPDA] = findPositionPDA(params.user, params.adapterProgramId);

  const data = Buffer.concat([
    sighash('global', 'current_value'),
    params.adapterProgramId.toBuffer(),
  ]);

  return new TransactionInstruction({
    programId: DISPATCHER_PROGRAM_ID,
    keys: [
      { pubkey: configPDA,               isSigner: false, isWritable: false },
      { pubkey: positionPDA,             isSigner: false, isWritable: false },
      { pubkey: params.user,             isSigner: true,  isWritable: false },
      { pubkey: params.adapterProgramId, isSigner: false, isWritable: false },
      { pubkey: params.adapterState,     isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ── Registry: register_adapter ────────────────────────────────────────────────

export function buildRegisterAdapterIx(params: {
  governance: PublicKey;
  adapterProgramId: PublicKey;
  name: string;
  protocol: string;
  underlyingMint: PublicKey;
  category: number;
  apyBps: number;
  maxDeposit: BN;
  minDeposit: BN;
  metadataUri: string;
  riskScore: number;
}): TransactionInstruction {
  const [configPDA]  = findRegistryConfigPDA();
  const [adapterPDA] = findAdapterRecordPDA(params.adapterProgramId);

  // Encode name as fixed 64 bytes
  const nameBuf = Buffer.alloc(64);
  nameBuf.write(params.name.slice(0, 64));

  const protocolBuf = Buffer.alloc(32);
  protocolBuf.write(params.protocol.slice(0, 32));

  const uriBuf = Buffer.alloc(128);
  uriBuf.write(params.metadataUri.slice(0, 128));

  const apyBuf = Buffer.alloc(4);
  apyBuf.writeUInt32LE(params.apyBps);

  const data = Buffer.concat([
    sighash('global', 'register_adapter'),
    params.adapterProgramId.toBuffer(),
    // name as Borsh string (4-byte length prefix + bytes)
    Buffer.from([params.name.length, 0, 0, 0]),
    Buffer.from(params.name),
    Buffer.from([params.protocol.length, 0, 0, 0]),
    Buffer.from(params.protocol),
    params.underlyingMint.toBuffer(),
    Buffer.from([params.category]),
    apyBuf,
    encodeU64(params.maxDeposit),
    encodeU64(params.minDeposit),
    Buffer.from([params.metadataUri.length, 0, 0, 0]),
    Buffer.from(params.metadataUri),
    Buffer.from([params.riskScore]),
  ]);

  return new TransactionInstruction({
    programId: REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: configPDA,   isSigner: false, isWritable: true  },
      { pubkey: adapterPDA,  isSigner: false, isWritable: true  },
      { pubkey: params.governance, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

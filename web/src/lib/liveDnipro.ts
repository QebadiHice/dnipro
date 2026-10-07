import { Buffer } from 'buffer';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Connection,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export const DEVNET_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
);

const DISPATCHER_ID = process.env.NEXT_PUBLIC_DISPATCHER_PROGRAM_ID;
const REGISTRY_ID = process.env.NEXT_PUBLIC_REGISTRY_PROGRAM_ID;
const ADAPTER_ID = process.env.NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID;

export const LIVE_PROGRAMS = {
  dispatcher: DISPATCHER_ID ? new PublicKey(DISPATCHER_ID) : null,
  registry: REGISTRY_ID ? new PublicKey(REGISTRY_ID) : null,
  adapter: ADAPTER_ID ? new PublicKey(ADAPTER_ID) : null,
};

const DISC = {
  initializeRegistry: Uint8Array.from([189, 181, 20, 17, 174, 57, 249, 59]),
  registerAdapter: Uint8Array.from([74, 70, 162, 14, 217, 159, 175, 161]),
  initializeDispatcher: Uint8Array.from([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit: Uint8Array.from([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: Uint8Array.from([183, 18, 70, 156, 148, 109, 161, 34]),
  initializeAdapter: Uint8Array.from([220, 38, 219, 51, 46, 10, 185, 59]),
};

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]) {
  return Buffer.concat(parts.map(p => Buffer.from(p)));
}

function u64(value: bigint) {
  const out = Buffer.alloc(8);
  let n = value;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

function readU64(data: Uint8Array, offset: number) {
  let value = 0n;
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) + BigInt(data[offset + i]);
  }
  return value;
}

function fixedName(name: string) {
  const out = Buffer.alloc(32);
  out.set(encoder.encode(name).slice(0, 32));
  return out;
}

function requirePrograms() {
  if (!LIVE_PROGRAMS.dispatcher || !LIVE_PROGRAMS.registry || !LIVE_PROGRAMS.adapter) {
    throw new Error(
      'Live Devnet configuration is incomplete. Set NEXT_PUBLIC_DISPATCHER_PROGRAM_ID, NEXT_PUBLIC_REGISTRY_PROGRAM_ID and NEXT_PUBLIC_LIVE_ADAPTER_PROGRAM_ID.'
    );
  }
  return {
    dispatcher: LIVE_PROGRAMS.dispatcher,
    registry: LIVE_PROGRAMS.registry,
    adapter: LIVE_PROGRAMS.adapter,
  };
}

export function livePdas(user?: PublicKey) {
  const { dispatcher, registry, adapter } = requirePrograms();
  const [registryConfig] = PublicKey.findProgramAddressSync(
    [encoder.encode('registry_config_v2')],
    registry
  );
  const [adapterRecord] = PublicKey.findProgramAddressSync(
    [encoder.encode('adapter_v2'), adapter.toBytes()],
    registry
  );
  const [dispatcherConfig] = PublicKey.findProgramAddressSync(
    [encoder.encode('dispatcher_config_v2')],
    dispatcher
  );
  const [dispatcherAuthority] = PublicKey.findProgramAddressSync(
    [encoder.encode('dispatcher_authority_v2')],
    dispatcher
  );
  const [adapterState] = PublicKey.findProgramAddressSync(
    [encoder.encode('adapter_state_v1')],
    adapter
  );
  const [adapterVaultAuthority] = PublicKey.findProgramAddressSync(
    [encoder.encode('vault_authority_v1')],
    adapter
  );
  const [adapterVault] = PublicKey.findProgramAddressSync(
    [encoder.encode('vault_v1')],
    adapter
  );
  const position = user
    ? PublicKey.findProgramAddressSync(
        [encoder.encode('position_v2'), user.toBytes(), adapter.toBytes()],
        dispatcher
      )[0]
    : null;

  return {
    registryConfig,
    adapterRecord,
    dispatcherConfig,
    dispatcherAuthority,
    adapterState,
    adapterVaultAuthority,
    adapterVault,
    position,
  };
}

export function userUsdcAta(user: PublicKey) {
  return getAssociatedTokenAddressSync(
    DEVNET_USDC_MINT,
    user,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
}

export function buildInitializeRegistryIx(admin: PublicKey) {
  const { registry } = requirePrograms();
  const { registryConfig } = livePdas();
  return new TransactionInstruction({
    programId: registry,
    keys: [
      { pubkey: registryConfig, isSigner: false, isWritable: true },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISC.initializeRegistry),
  });
}

export function buildInitializeDispatcherIx(admin: PublicKey) {
  const { dispatcher, registry } = requirePrograms();
  const { dispatcherConfig, dispatcherAuthority } = livePdas();
  return new TransactionInstruction({
    programId: dispatcher,
    keys: [
      { pubkey: dispatcherConfig, isSigner: false, isWritable: true },
      { pubkey: dispatcherAuthority, isSigner: false, isWritable: false },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: concat(DISC.initializeDispatcher, registry.toBytes()),
  });
}

export function buildInitializeAdapterIx(admin: PublicKey) {
  const { adapter } = requirePrograms();
  const { dispatcherAuthority, adapterState, adapterVaultAuthority, adapterVault } = livePdas();
  return new TransactionInstruction({
    programId: adapter,
    keys: [
      { pubkey: adapterState, isSigner: false, isWritable: true },
      { pubkey: dispatcherAuthority, isSigner: false, isWritable: false },
      { pubkey: adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: adapterVault, isSigner: false, isWritable: true },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(DISC.initializeAdapter),
  });
}

export function buildRegisterAdapterIx(admin: PublicKey) {
  const { registry, adapter } = requirePrograms();
  const { registryConfig, adapterRecord, adapterState, adapterVault, adapterVaultAuthority } = livePdas();
  return new TransactionInstruction({
    programId: registry,
    keys: [
      { pubkey: registryConfig, isSigner: false, isWritable: true },
      { pubkey: adapterRecord, isSigner: false, isWritable: true },
      { pubkey: adapter, isSigner: false, isWritable: false },
      { pubkey: adapterState, isSigner: false, isWritable: false },
      { pubkey: adapterVault, isSigner: false, isWritable: false },
      { pubkey: adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: admin, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: concat(DISC.registerAdapter, fixedName('Dnipro USDC Devnet Vault')),
  });
}

export async function liveSetupState(connection: Connection) {
  if (!LIVE_PROGRAMS.dispatcher || !LIVE_PROGRAMS.registry || !LIVE_PROGRAMS.adapter) {
    return {
      configured: false,
      registryReady: false,
      dispatcherReady: false,
      adapterReady: false,
      registered: false,
      ready: false,
    };
  }
  const p = livePdas();
  const infos = await connection.getMultipleAccountsInfo([
    p.registryConfig,
    p.dispatcherConfig,
    p.adapterState,
    p.adapterRecord,
  ], 'confirmed');
  const state = {
    configured: true,
    registryReady: !!infos[0],
    dispatcherReady: !!infos[1],
    adapterReady: !!infos[2],
    registered: !!infos[3],
    ready: infos.every(Boolean),
  };
  return state;
}

export async function liveBalances(connection: Connection, user: PublicKey) {
  const ata = userUsdcAta(user);
  const p = livePdas(user);

  const [solLamports, ataInfo, positionInfo, vaultInfo] = await Promise.all([
    connection.getBalance(user, 'confirmed'),
    connection.getAccountInfo(ata, 'confirmed'),
    p.position ? connection.getAccountInfo(p.position, 'confirmed') : Promise.resolve(null),
    connection.getAccountInfo(p.adapterVault, 'confirmed'),
  ]);

  let usdc = 0;
  if (ataInfo) {
    const bal = await connection.getTokenAccountBalance(ata, 'confirmed');
    usdc = Number(bal.value.amount) / 1e6;
  }

  let vaultUsdc = 0;
  if (vaultInfo) {
    const bal = await connection.getTokenAccountBalance(p.adapterVault, 'confirmed');
    vaultUsdc = Number(bal.value.amount) / 1e6;
  }

  let positionUsdc = 0;
  if (positionInfo && positionInfo.data.length >= 121) {
    positionUsdc = Number(readU64(positionInfo.data, 104)) / 1e6;
  }

  return {
    sol: solLamports / 1_000_000_000,
    usdc,
    vaultUsdc,
    positionUsdc,
    ata,
    ataExists: !!ataInfo,
  };
}

export async function buildDepositIx(connection: Connection, user: PublicKey, amountBaseUnits: bigint) {
  const { dispatcher, adapter } = requirePrograms();
  const p = livePdas(user);
  if (!p.position) throw new Error('Position PDA unavailable');
  const ata = userUsdcAta(user);
  const ixs: TransactionInstruction[] = [];
  if (!(await connection.getAccountInfo(ata, 'confirmed'))) {
    ixs.push(
      createAssociatedTokenAccountInstruction(
        user,
        ata,
        user,
        DEVNET_USDC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }
  ixs.push(
    new TransactionInstruction({
      programId: dispatcher,
      keys: [
        { pubkey: p.dispatcherConfig, isSigner: false, isWritable: false },
        { pubkey: p.position, isSigner: false, isWritable: true },
        { pubkey: p.adapterRecord, isSigner: false, isWritable: false },
        { pubkey: adapter, isSigner: false, isWritable: false },
        { pubkey: p.adapterState, isSigner: false, isWritable: true },
        { pubkey: p.dispatcherAuthority, isSigner: false, isWritable: false },
        { pubkey: user, isSigner: true, isWritable: true },
        { pubkey: ata, isSigner: false, isWritable: true },
        { pubkey: p.adapterVault, isSigner: false, isWritable: true },
        { pubkey: p.adapterVaultAuthority, isSigner: false, isWritable: false },
        { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: concat(DISC.deposit, u64(amountBaseUnits)),
    })
  );
  return ixs;
}

export function buildWithdrawIx(user: PublicKey, amountBaseUnits: bigint) {
  const { dispatcher, adapter } = requirePrograms();
  const p = livePdas(user);
  if (!p.position) throw new Error('Position PDA unavailable');
  const ata = userUsdcAta(user);
  return new TransactionInstruction({
    programId: dispatcher,
    keys: [
      { pubkey: p.dispatcherConfig, isSigner: false, isWritable: false },
      { pubkey: p.position, isSigner: false, isWritable: true },
      { pubkey: p.adapterRecord, isSigner: false, isWritable: false },
      { pubkey: adapter, isSigner: false, isWritable: false },
      { pubkey: p.adapterState, isSigner: false, isWritable: true },
      { pubkey: p.dispatcherAuthority, isSigner: false, isWritable: false },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: p.adapterVault, isSigner: false, isWritable: true },
      { pubkey: p.adapterVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: DEVNET_USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: concat(DISC.withdraw, u64(amountBaseUnits)),
  });
}

export function explorerTx(signature: string) {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

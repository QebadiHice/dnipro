// web/src/app/examples/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SDK Examples — Dnipro',
  description: 'Reference code examples for the Dnipro SDK and deployment workflow',
};

const EXAMPLES = [
  {
    title: 'Install & Initialize',
    lang: 'bash',
    code: `# Install the SDK
npm install @dnipro/sdk @solana/web3.js @solana/wallet-adapter-react

# Or with yarn
yarn add @dnipro/sdk @solana/web3.js`,
  },
  {
    title: 'Basic Client Setup',
    lang: 'typescript',
    code: `import { DniproClient, ADAPTER_PROGRAM_IDS } from '@dnipro/sdk';
import { Connection, clusterApiUrl } from '@solana/web3.js';

const connection = new Connection(
  process.env.RPC_URL ?? clusterApiUrl('devnet'),
  'confirmed'
);

const client = new DniproClient(connection, {
  commitment: 'confirmed',
});

// After Registry deployment: fetch adapters marked active in that deployment
const adapters = await client.getActiveAdapters();
console.log(\`\${adapters.length} adapters available:\`);
adapters.forEach(a => {
  console.log(\`  \${a.name}: \${a.apyPercent} APY, TVL \${a.tvlFormatted}\`);
});`,
  },
  {
    title: 'Fetch User Portfolio',
    lang: 'typescript',
    code: `import { DniproClient } from '@dnipro/sdk';
import { PublicKey } from '@solana/web3.js';

const userWallet = new PublicKey('YourWalletAddressHere');
const portfolio = await client.getPortfolioSummary(userWallet);

console.log('Portfolio Summary:');
console.log(\`  Total deposited: \${portfolio.totalDepositedFormatted}\`);
console.log(\`  Current value:   \${portfolio.totalValueFormatted}\`);
console.log(\`  Total PnL:       \${portfolio.totalPnlFormatted}\`);
console.log(\`  Positions:       \${portfolio.positionCount}\`);

for (const pos of portfolio.positions) {
  console.log(\`  [\${pos.adapterInfo?.name}]\`);
  console.log(\`    Deposited: \${pos.depositedAmount.toString()}\`);
  console.log(\`    Value:     \${pos.currentValue.toString()}\`);
  console.log(\`    PnL:       \${pos.pnlPercent}\`);
}`,
  },
  {
    title: 'Post-deployment Deposit Flow',
    lang: 'typescript',
    code: `import { DniproClient, ADAPTER_PROGRAM_IDS, USDC_MINT, usdcToAtomics } from '@dnipro/sdk';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

function DepositExample() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const client = new DniproClient(connection);

  async function deposit() {
    if (!publicKey) return;

    const amount = usdcToAtomics(1000); // $1000 USDC

    // 1. Simulate first
    const sim = await client.simulateDeposit(
      ADAPTER_PROGRAM_IDS.kamino,
      amount
    );
    console.log('Estimated fee:', sim.estimatedFee.toString());
    console.log('Net amount:',   sim.estimatedOutput.toString());

    // 2. Build transaction
    const tx = client.buildDepositTransaction({
      user:                publicKey,
      adapterProgramId:    ADAPTER_PROGRAM_IDS.kamino,
      underlyingMint:      USDC_MINT,
      adapterVault:        kaminoVaultAddress,   // from your adapter setup
      feeRecipientAccount: feeRecipientAddress,  // from dispatcher config
      deposit: {
        amount,
        slippageBps: 50, // 0.5% max slippage
      },
    });

    // 3. Sign and send
    const sig = await sendTransaction(tx, connection, {
      skipPreflight: false,
    });
    await connection.confirmTransaction(sig);
    console.log('Deposited! Tx:', sig);
  }

  return <button onClick={deposit}>Deposit $1000 into Kamino</button>;
}`,
  },
  {
    title: 'Post-deployment Withdraw Flow',
    lang: 'typescript',
    code: `async function withdraw(shares: BN) {
  // 1. Get current position
  const position = await client.getPosition(
    publicKey,
    ADAPTER_PROGRAM_IDS.kamino
  );

  if (!position || !position.isActive) {
    throw new Error('No active position');
  }

  // 2. Build withdraw transaction (shares = 0 → withdraw all)
  const tx = client.buildWithdrawTransaction({
    user:                publicKey,
    adapterProgramId:    ADAPTER_PROGRAM_IDS.kamino,
    underlyingMint:      USDC_MINT,
    adapterVault:        kaminoVaultAddress,
    feeRecipientAccount: feeRecipientAddress,
    withdraw: {
      shares,          // or new BN(0) for full withdrawal
      slippageBps: 50,
    },
  });

  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig);
  console.log('Withdrawn! Tx:', sig);
}

// Withdraw all
await withdraw(new BN(0));`,
  },
  {
    title: 'PDA Derivation (manual)',
    lang: 'typescript',
    code: `import {
  findDispatcherConfigPDA,
  findPositionPDA,
  findAdapterRecordPDA,
  findRegistryConfigPDA,
  ADAPTER_PROGRAM_IDS,
} from '@dnipro/sdk';
import { PublicKey } from '@solana/web3.js';

// Dispatcher global config
const [dispatcherConfig, bump] = findDispatcherConfigPDA();

// User's position in Kamino
const [positionPDA] = findPositionPDA(
  userWallet,
  ADAPTER_PROGRAM_IDS.kamino
);

// Registry entry for Kamino
const [adapterRecord] = findAdapterRecordPDA(
  ADAPTER_PROGRAM_IDS.kamino
);

console.log('Dispatcher config:', dispatcherConfig.toBase58());
console.log('Kamino position:',   positionPDA.toBase58());
console.log('Adapter record:',    adapterRecord.toBase58());`,
  },
  {
    title: 'React Hook — useAdapters',
    lang: 'typescript',
    code: `// hooks/useAdapters.ts
import { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { DniproClient, AdapterDisplay } from '@dnipro/sdk';

export function useAdapters() {
  const { connection } = useConnection();
  const [adapters, setAdapters] = useState<AdapterDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const client = new DniproClient(connection);
    client.getAllAdapters()
      .then(setAdapters)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [connection]);

  return { adapters, loading, error };
}

// Usage in component:
function AdapterList() {
  const { adapters, loading } = useAdapters();
  if (loading) return <Spinner />;
  return (
    <ul>
      {adapters.map(a => (
        <li key={a.programId.toBase58()}>
          {a.name}: {a.apyPercent} APY
        </li>
      ))}
    </ul>
  );
}`,
  },
  {
    title: 'CLI — Scaffold a New Adapter',
    lang: 'bash',
    code: `# Install CLI globally
npm install -g @dnipro/cli

# Scaffold a new adapter (interactive)
dnipro generate my-protocol

# With flags (non-interactive)
dnipro generate my-protocol \\
  --category lending \\
  --mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \\
  --yes

# List all adapters in registry
dnipro list --cluster devnet

# Inspect a specific adapter
dnipro inspect kamino

# Check your portfolio
dnipro portfolio <YOUR_WALLET_ADDRESS>

# Deposit simulation
dnipro deposit kamino 1000 --dry-run`,
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="heading-serif text-4xl mb-3">SDK Examples</h1>
          <p className="text-muted-foreground text-lg">
            Reference SDK patterns. Execution examples assume you have synced program IDs and deployed a verified adapter; the bundled adapters are not live protocol integrations yet.
          </p>
        </div>

        <div className="space-y-8">
          {EXAMPLES.map(({ title, lang, code }) => (
            <div key={title} className="surface rounded-lg overflow-hidden">
              {/* Code header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-secondary/40">
                <h2 className="text-sm font-semibold">{title}</h2>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">
                  {lang}
                </span>
              </div>
              <pre className="p-5 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

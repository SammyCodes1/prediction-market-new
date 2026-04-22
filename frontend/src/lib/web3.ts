import { createConfig, http } from 'wagmi';
import { defineChain } from 'viem';
import { injected } from 'wagmi/connectors';

// Arc uses 18 decimals for native gas (labeled USDC) 
// but the ERC-20 USDC contract itself uses 6 decimals.
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [arcTestnet.id]: http(),
  },
});

export const CONTRACT_ADDRESS = '0xDA831f98435d4774c743F7ef39021F3e0CCd6Cc4' as const;
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const USDC_DECIMALS = 6;

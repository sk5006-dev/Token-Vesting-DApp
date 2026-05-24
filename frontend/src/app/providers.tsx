"use client";

import React from "react";
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { sepolia, optimism, localhost } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@rainbow-me/rainbowkit/styles.css";

// Create React Query Client
const queryClient = new QueryClient();

// Configure Wagmi & RainbowKit with MetaMask, Coinbase, and WalletConnect support
const config = getDefaultConfig({
  appName: "AetherVesting",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "4b9df89f928e3b2e3e57f5ab12df5da6",
  chains: [sepolia, optimism, localhost],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined),
    [optimism.id]: http(process.env.NEXT_PUBLIC_OPTIMISM_RPC_URL || undefined),
    [localhost.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#a855f7", // purple-500 luxury accent
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

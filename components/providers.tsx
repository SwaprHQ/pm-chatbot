"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import React, { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../wagmi.config";
import { ConnectKitProvider } from "connectkit";

interface ProviderProps {
  children: ReactNode;
}
const queryClient = new QueryClient();

export const Provider = ({ children }: ProviderProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <SessionProvider>{children}</SessionProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

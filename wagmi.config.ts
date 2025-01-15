import { http, createConfig } from "wagmi";
import { mainnet } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";

export const config = createConfig(
  getDefaultConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http(),
    },
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    appName: "Chatbot",
  })
);

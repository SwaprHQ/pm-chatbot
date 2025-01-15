"use client";

import { getCsrfToken, signIn, useSession } from "next-auth/react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";
import { useEffect } from "react";
import { ConnectKitButton } from "connectkit";

export default function Siwe() {
  const { signMessageAsync } = useSignMessage();
  const { address, isConnected, chain } = useAccount();
  const { data: session } = useSession();

  const handleLogin = async () => {
    try {
      const callbackUrl = "/protected";
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in with Ethereum to the app.",
        uri: window.location.origin,
        version: "1",
        chainId: chain?.id,
        nonce: await getCsrfToken(),
      });
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });
      signIn("credentials", {
        message: JSON.stringify(message),
        redirect: false,
        signature,
        callbackUrl,
      });
    } catch (error) {
      window.alert(error);
    }
  };

  useEffect(() => {
    if (isConnected && !session) {
      handleLogin();
    }
  }, [isConnected]);

  return (
    <div>
      {isConnected && (
        <button
          onClick={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          Sign-in
        </button>
      )}
      <ConnectKitButton />
    </div>
  );
}

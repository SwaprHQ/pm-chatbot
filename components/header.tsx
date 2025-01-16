"use client";

import { ConnectKitButton } from "connectkit";
import { getCsrfToken, signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiweMessage } from "siwe";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

// The approach used in this component shows how to build a sign in and sign out
// component that works on pages which support both client and server side
// rendering, and avoids any flash incorrect content on initial page load.
export function Header() {
  const { data: session } = useSession();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { signMessageAsync } = useSignMessage();
  const { address, isConnected, chain } = useAccount();

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
      await signIn("credentials", {
        message: JSON.stringify(message),
        redirect: false,
        signature,
        callbackUrl,
      });
      router.refresh();
    } catch (error) {
      window.alert(error);
    }
  };

  return (
    <header className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md fixed w-full">
      <nav>
        <ul className="flex space-x-6">
          <li>
            <Link href="/" className="hover:text-gray-400">
              Home
            </Link>
          </li>
        </ul>
      </nav>
      <div className={`flex space-x-6 `}>
        {!session && (
          <>
            {isConnected && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Sign-in
              </button>
            )}
            <ConnectKitButton />
          </>
        )}
        {session?.user && (
          <>
            <span className="flex space-x-2 items-center">
              <p>Welcome,</p>
              <p className="font-semibold">{session.user.name}</p>
            </span>
            <a
              href={`/api/auth/signout`}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              onClick={(e) => {
                e.preventDefault();
                disconnect();
                signOut();
              }}
            >
              Sign out
            </a>
          </>
        )}
      </div>
    </header>
  );
}

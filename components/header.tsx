"use client";

import Link from "next/link";

// The approach used in this component shows how to build a sign in and sign out
// component that works on pages which support both client and server side
// rendering, and avoids any flash incorrect content on initial page load.
export function Header() {
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
    </header>
  );
}

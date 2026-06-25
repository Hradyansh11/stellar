"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { connectWallet, getWalletAddress } from "@/lib/stellar";

export default function Navbar() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    getWalletAddress().then(setWallet).catch(() => setWallet(null));
  }, []);

  const handleConnect = async () => {
    if (wallet) return;
    setConnecting(true);
    try {
      const addr = await connectWallet();
      if (addr) setWallet(addr);
    } finally {
      setConnecting(false);
    }
  };

  const truncate = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <nav className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
              ET
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">
              EventX
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
            >
              Events
            </Link>
            {wallet && (
              <>
                <Link
                  href="/events/create"
                  className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                >
                  Create
                </Link>
                <Link
                  href="/my-tickets"
                  className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                >
                  My Tickets
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
              </>
            )}

            {/* Wallet Button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                wallet
                  ? "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/25"
              }`}
            >
              {connecting
                ? "Connecting..."
                : wallet
                ? truncate(wallet)
                : "Connect Wallet"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

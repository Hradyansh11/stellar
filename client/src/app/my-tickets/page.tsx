"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TicketCard, { TicketData } from "@/components/TicketCard";
import {
  getWalletAddress,
  connectWallet,
  fetchUserTickets,
  setContractAddress,
} from "@/lib/stellar";

export default function MyTicketsPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractAddr, setContractAddr] = useState("");

  useEffect(() => {
    getWalletAddress().then(setWallet).catch(() => setWallet(null));
  }, []);

  useEffect(() => {
    if (wallet) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [wallet]);

  const loadTickets = async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);

    if (contractAddr.trim()) {
      setContractAddress(contractAddr.trim());
    }

    try {
      const userTickets = await fetchUserTickets(wallet);
      setTickets(userTickets);
    } catch (e: any) {
      setError(e.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    const addr = await connectWallet();
    if (addr) {
      setWallet(addr);
    }
  };

  if (!wallet) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">Connect Freighter to view your tickets.</p>
          <button
            onClick={connect}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Connect Freighter
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Tickets</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Wallet: {wallet.slice(0, 8)}...{wallet.slice(-4)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadTickets}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Browse Events
          </Link>
        </div>
      </div>

      {/* Contract address input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Contract Address <span className="text-gray-600">(if not set globally)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="C..."
            value={contractAddr}
            onChange={(e) => setContractAddr(e.target.value)}
            className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
          />
          <button
            onClick={loadTickets}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors"
          >
            Set & Reload
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={loadTickets}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-medium">
            No tickets yet
          </p>
          <p className="text-gray-600 text-sm mt-1">
            Browse events and buy your first ticket!
          </p>
          <Link
            href="/"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-4">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tickets.map((ticket) => (
              <TicketCard
                key={`${ticket.eventId}-${ticket.seat}`}
                ticket={ticket}
                wallet={wallet}
                onTransferred={loadTickets}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}

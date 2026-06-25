"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getWalletAddress,
  connectWallet,
  fetchOrganizerEvents,
  withdrawFunds,
  cancelEvent,
  setContractAddress,
  EventData,
} from "@/lib/stellar";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(stroops: string): string {
  const num = parseFloat(stroops) / 10_000_000;
  return `${num.toFixed(2)} XLM`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [events, setEvents] = useState<(EventData & { id: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contractAddr, setContractAddr] = useState("");

  useEffect(() => {
    getWalletAddress().then(setWallet).catch(() => setWallet(null));
  }, []);

  useEffect(() => {
    if (wallet) loadEvents();
    else setLoading(false);
  }, [wallet]);

  const loadEvents = async () => {
    if (!wallet) return;
    setLoading(true);
    setError(null);

    if (contractAddr.trim()) {
      setContractAddress(contractAddr.trim());
    }

    try {
      const data = await fetchOrganizerEvents(wallet);
      setEvents(data);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (eventId: number) => {
    if (!wallet) return;
    setActionLoading(`withdraw-${eventId}`);
    try {
      await withdrawFunds(wallet, eventId);
      await loadEvents();
    } catch (e: any) {
      alert("Withdraw failed: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (eventId: number) => {
    if (!wallet) return;
    if (!confirm("Are you sure you want to cancel this event? Buyers can then request refunds.")) return;
    setActionLoading(`cancel-${eventId}`);
    try {
      await cancelEvent(wallet, eventId);
      await loadEvents();
    } catch (e: any) {
      alert("Cancel failed: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const connect = async () => {
    const addr = await connectWallet();
    if (addr) setWallet(addr);
  };

  if (!wallet) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Organizer Dashboard</h2>
          <p className="text-gray-400">Connect your wallet to manage your events.</p>
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

  const getStats = () => {
    const total = events.length;
    const active = events.filter((e) => !e.cancelled).length;
    const totalSold = events.reduce((sum, e) => sum + e.sold, 0);
    const totalRevenue = events
      .filter((e) => e.withdrawn)
      .reduce((sum, e) => sum + parseInt(e.price) * e.sold, 0);
    return { total, active, totalSold, totalRevenue };
  };

  const stats = getStats();

  return (
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Organizer Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Wallet: {wallet.slice(0, 8)}...{wallet.slice(-4)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadEvents}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/events/create"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            + Create Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-500 uppercase mt-1">Total Events</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          <p className="text-xs text-gray-500 uppercase mt-1">Active</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-white">{stats.totalSold}</p>
          <p className="text-xs text-gray-500 uppercase mt-1">Tickets Sold</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-purple-400">
            {stats.totalRevenue > 0
              ? formatPrice(String(stats.totalRevenue))
              : "0 XLM"}
          </p>
          <p className="text-xs text-gray-500 uppercase mt-1">Withdrawn</p>
        </div>
      </div>

      {/* Contract Address Input */}
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
            onClick={loadEvents}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-500 transition-colors"
          >
            Set & Reload
          </button>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={loadEvents}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg font-medium">No events yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first event to get started!</p>
          <Link
            href="/events/create"
            className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const isActive = !event.cancelled;
            const revenue = parseInt(event.price) * event.sold;
            return (
              <div
                key={event.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {event.name}
                      </h3>
                      {event.cancelled && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-2 line-clamp-1">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                      <span>📅 {formatDate(event.date)}</span>
                      <span>🎫 {event.sold}/{event.max_tickets} sold</span>
                      <span>💰 {formatPrice(event.price)}</span>
                      <span>💵 {formatPrice(String(revenue))} collected</span>
                      <span>
                        {event.withdrawn ? "✅ Withdrawn" : "⏳ Not withdrawn"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <Link
                      href={`/events/${event.id}`}
                      className="px-4 py-1.5 bg-white/10 text-white rounded-xl text-xs font-medium hover:bg-white/20 transition-colors text-center"
                    >
                      View
                    </Link>
                    {isActive ? (
                      <button
                        onClick={() => handleCancel(event.id)}
                        disabled={actionLoading === `cancel-${event.id}`}
                        className="px-4 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === `cancel-${event.id}` ? "..." : "Cancel"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleWithdraw(event.id)}
                        disabled={
                          actionLoading === `withdraw-${event.id}` || event.withdrawn
                        }
                        className="px-4 py-1.5 bg-green-500/20 text-green-400 rounded-xl text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-30"
                      >
                        {actionLoading === `withdraw-${event.id}`
                          ? "..."
                          : event.withdrawn
                          ? "Done"
                          : "Withdraw"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {!event.cancelled && (
                  <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (event.sold / event.max_tickets) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

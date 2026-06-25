"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchEvent,
  buyTicket,
  refundTicket,
  fetchTicketOwner,
  getWalletAddress,
  connectWallet,
  EventData,
  setContractAddress,
} from "@/lib/stellar";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    weekday: "long",
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [event, setEvent] = useState<EventData | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [boughtSeat, setBoughtSeat] = useState<number | null>(null);
  const [userTickets, setUserTickets] = useState<number[]>([]);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAddr, setContractAddr] = useState("");

  const checkUserTickets = async () => {
    if (!wallet || !event) return;
    const seats: number[] = [];
    for (let s = 1; s <= event.max_tickets; s++) {
      try {
        const owner = await fetchTicketOwner(id, s);
        if (owner.toLowerCase() === wallet.toLowerCase()) {
          seats.push(s);
        }
      } catch { /* skip */ }
    }
    setUserTickets(seats);
  };

  useEffect(() => {
    getWalletAddress().then(setWallet).catch(() => setWallet(null));
    loadEvent();
  }, [id]);

  useEffect(() => {
    if (wallet && event) checkUserTickets();
  }, [wallet, event]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const data = await fetchEvent(id);
      setEvent(data);
    } catch (e: any) {
      setError(e.message || "Event not found");
    } finally {
      setLoading(false);
    }
  };

  const connect = async () => {
    const addr = await connectWallet();
    if (addr) setWallet(addr);
  };

  const handleBuyTicket = async () => {
    if (!wallet || !event) return;

    if (contractAddr.trim()) {
      setContractAddress(contractAddr.trim());
    }

    setBuying(true);
    setError(null);
    try {
      const { hash, seat } = await buyTicket(wallet, id);
      setBoughtSeat(seat);
      await loadEvent(); // Refresh
    } catch (e: any) {
      setError(e.message || "Failed to buy ticket");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10" />
          <div className="h-6 w-48 bg-white/10 rounded mx-auto" />
        </div>
      </main>
    );
  }

  if (error && !event) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
            Back to events
          </Link>
        </div>
      </main>
    );
  }

  if (!event) return null;

  const soldOut = event.sold >= event.max_tickets;
  const available = event.max_tickets - event.sold;
  const progressPercent = (event.sold / event.max_tickets) * 100;
  const isPast = event.date * 1000 < Date.now();

  return (
    <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full">
      <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-2xl overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 relative">
              <div className="absolute inset-0 bg-black/20" />
              {event.cancelled && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500/90 text-white text-sm font-semibold rounded-lg">
                  Cancelled
                </div>
              )}
              <div className="absolute bottom-4 left-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">
                  {event.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">About this event</h2>
            <p className="text-gray-400 leading-relaxed">{event.description}</p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Date & Time</p>
                <p className="text-white text-sm">{formatDate(event.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Organizer</p>
                <p className="text-white text-sm font-mono">
                  {event.organizer.slice(0, 8)}...{event.organizer.slice(-4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Price per Ticket</p>
                <p className="text-white text-sm font-semibold">{formatPrice(event.price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                <p className={`text-sm ${event.cancelled ? "text-red-400" : isPast ? "text-gray-500" : "text-green-400"}`}>
                  {event.cancelled ? "Cancelled" : isPast ? "Ended" : "Active"}
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                <span className="text-white font-semibold">{event.sold}</span> / {event.max_tickets} sold
              </span>
              <span className={soldOut ? "text-amber-400 font-semibold" : "text-gray-400"}>
                {soldOut ? "Sold Out" : `${available} remaining`}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  soldOut ? "bg-amber-500" : "bg-gradient-to-r from-purple-500 to-pink-500"
                }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Contract address input for first use */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contract Address <span className="text-gray-600">(if not set globally)</span>
            </label>
            <input
              type="text"
              placeholder="C..."
              value={contractAddr}
              onChange={(e) => setContractAddr(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Sidebar - Buy Ticket */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-24">
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-white">
                {formatPrice(event.price)}
              </p>
              <p className="text-gray-500 text-sm mt-1">per ticket</p>
            </div>

            {boughtSeat ? (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold">Ticket Purchased!</p>
                <p className="text-gray-400 text-sm">Seat #{boughtSeat}</p>
                <Link
                  href="/my-tickets"
                  className="block w-full py-3 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  View My Tickets
                </Link>
              </div>
            ) : event.cancelled && userTickets.length > 0 ? (
              <div className="text-center space-y-3">
                <p className="text-amber-400 font-semibold">Event Cancelled</p>
                <p className="text-gray-400 text-sm">
                  You have {userTickets.length} ticket{userTickets.length > 1 ? "s" : ""} for this event
                </p>
                <button
                  onClick={async () => {
                    setRefunding(true);
                    try {
                      for (const seat of userTickets) {
                        await refundTicket(wallet!, id, seat);
                      }
                      alert("Refund successful!");
                      setUserTickets([]);
                    } catch (e: any) {
                      alert("Refund failed: " + e.message);
                    } finally {
                      setRefunding(false);
                    }
                  }}
                  disabled={refunding}
                  className="w-full py-3 bg-amber-500/20 text-amber-400 rounded-xl font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50"
                >
                  {refunding ? "Processing..." : `Request Refund (${formatPrice(event.price)} each)`}
                </button>
              </div>
            ) : (
              <>
                {!wallet ? (
                  <button
                    onClick={connect}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
                  >
                    Connect to Buy
                  </button>
                ) : (
                  <button
                    onClick={handleBuyTicket}
                    disabled={buying || soldOut || event.cancelled || isPast}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                  >
                    {buying ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : soldOut ? (
                      "Sold Out"
                    ) : event.cancelled ? (
                      "Event Cancelled"
                    ) : isPast ? (
                      "Event Ended"
                    ) : (
                      "Buy Ticket"
                    )}
                  </button>
                )}

                {error && (
                  <p className="text-red-400 text-sm text-center mt-2">{error}</p>
                )}

                <div className="flex items-center gap-2 justify-center text-xs text-gray-600 pt-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secured by Stellar
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { connectWallet, getWalletAddress, createEvent, setContractAddress } from "@/lib/stellar";
import Link from "next/link";

export default function CreateEventPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAddr, setContractAddr] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    time: "",
    price: "",
    maxTickets: "100",
  });

  useEffect(() => {
    getWalletAddress().then(setWallet).catch(() => setWallet(null));
  }, []);

  const connect = async () => {
    const addr = await connectWallet();
    if (addr) setWallet(addr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    // Validate
    if (!form.name || !form.description || !form.date || !form.time || !form.price) {
      setError("Please fill in all fields");
      return;
    }

    // Set contract address if user provided one
    if (contractAddr.trim()) {
      setContractAddress(contractAddr.trim());
    }

    const dateTime = new Date(`${form.date}T${form.time}`);
    const timestamp = Math.floor(dateTime.getTime() / 1000);
    const priceStroops = Math.floor(parseFloat(form.price) * 10_000_000).toString();

    setSubmitting(true);
    setError(null);

    try {
      const hash = await createEvent(
        wallet,
        form.name,
        form.description,
        timestamp,
        priceStroops,
        parseInt(form.maxTickets)
      );
      // Redirect to home on success
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  if (!wallet) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white">Connect Your Wallet</h2>
          <p className="text-gray-400">You need to connect your Freighter wallet to create an event.</p>
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
    <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
      {/* Back link */}
      <Link href="/" className="text-gray-400 hover:text-white text-sm flex items-center gap-1 mb-8">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to events
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Create Event</h1>
      <p className="text-gray-400 mb-8">
        Fill in the details below. Ticket payments are handled via Stellar.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contract Address (for demo purposes) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contract Address <span className="text-gray-600">(required for first use)</span>
          </label>
          <input
            type="text"
            placeholder="C... (deploy the contract first)"
            value={contractAddr}
            onChange={(e) => setContractAddr(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Event Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
          <input
            type="text"
            placeholder="Stellar Conference 2026"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            placeholder="Describe your event..."
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors resize-none"
          />
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Time</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Price & Tickets */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price (XLM)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="25"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Max Tickets</label>
            <input
              type="number"
              min="1"
              value={form.maxTickets}
              onChange={(e) => setForm({ ...form, maxTickets: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating Event...
            </span>
          ) : (
            "Create Event"
          )}
        </button>
      </form>
    </main>
  );
}

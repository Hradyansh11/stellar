"use client";

import { useState, useEffect } from "react";
import EventCard, { EventData } from "@/components/EventCard";
import { fetchAllEvents } from "@/lib/stellar";

export default function Home() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllEvents();
      setEvents(data);
    } catch (e: any) {
      setError(e.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const activeEvents = events.filter((e) => !e.cancelled);
  const pastEvents = events.filter((e) => e.cancelled);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black to-pink-900/30" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight">
              Discover & collect
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {" "}
                event tickets
              </span>{" "}
              on Stellar
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed">
              Buy, sell, and transfer event tickets securely on the Stellar
              blockchain. Powered by Soroban smart contracts.
            </p>
            <div className="mt-8 flex gap-4">
              <a
                href="#events"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
              >
                Browse Events
              </a>
              <a
                href="/events/create"
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all border border-white/10"
              >
                Create Event
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
          <button
            onClick={loadEvents}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Refresh ↻
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl h-72 animate-pulse"
              >
                <div className="h-32 bg-white/10 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-2">Failed to load events</p>
            <p className="text-gray-500 text-sm mb-4">{error}</p>
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm hover:bg-white/20 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : activeEvents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-400 text-lg font-medium">
              No events yet
            </p>
            <p className="text-gray-600 text-sm mt-1">
              Be the first to create an event!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {pastEvents.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-white mt-16 mb-8">
                  Past Events
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                  {pastEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600 text-sm">
          Built on{" "}
          <a
            href="https://stellar.org"
            className="text-purple-400 hover:text-purple-300"
          >
            Stellar
          </a>{" "}
          · Powered by Soroban Smart Contracts · Testnet
        </div>
      </footer>
    </main>
  );
}

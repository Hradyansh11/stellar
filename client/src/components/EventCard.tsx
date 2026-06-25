"use client";

import Link from "next/link";

export interface EventData {
  id: number;
  organizer: string;
  name: string;
  description: string;
  date: number;
  price: string;
  max_tickets: number;
  sold: number;
  cancelled: boolean;
  withdrawn: boolean;
}

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

export default function EventCard({ event }: { event: EventData }) {
  const soldOut = event.sold >= event.max_tickets;
  const available = event.max_tickets - event.sold;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
    >
      {/* Header gradient */}
      <div className="h-32 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 relative">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-3 right-3 flex gap-2">
          {event.cancelled && (
            <span className="px-2 py-1 bg-red-500/90 text-white text-xs font-semibold rounded-lg">
              Cancelled
            </span>
          )}
          {soldOut && !event.cancelled && (
            <span className="px-2 py-1 bg-amber-500/90 text-white text-xs font-semibold rounded-lg">
              Sold Out
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-4">
          <h3 className="text-white font-bold text-xl drop-shadow-lg">
            {event.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-gray-400 text-sm line-clamp-2">{event.description}</p>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-400">
            <svg
              className="w-4 h-4"
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
            <span>{formatDate(event.date)}</span>
          </div>
          <span className="font-semibold text-white">
            {formatPrice(event.price)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {event.sold} / {event.max_tickets} sold
            </span>
            <span>
              {available > 0 ? `${available} left` : "Full"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                soldOut
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (event.sold / event.max_tickets) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useState } from "react";
import { transferTicket, refundTicket } from "@/lib/stellar";

export interface TicketData {
  eventId: number;
  eventName: string;
  eventDate: number;
  seat: number;
  owner: string;
  cancelled?: boolean;
  price?: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RefundButton({
  ticket,
  onRefunded,
}: {
  ticket: TicketData;
  onRefunded?: () => void;
}) {
  const [refunding, setRefunding] = useState(false);

  const handleRefund = async () => {
    if (!confirm("Request a refund for this cancelled event ticket?")) return;
    setRefunding(true);
    try {
      await refundTicket(ticket.owner, ticket.eventId, ticket.seat);
      onRefunded?.();
    } catch (e: any) {
      alert("Refund failed: " + e.message);
    } finally {
      setRefunding(false);
    }
  };

  return (
    <button
      onClick={handleRefund}
      disabled={refunding}
      className="w-full py-2 px-4 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
    >
      {refunding ? "Processing..." : "Request Refund"}
    </button>
  );
}

export default function TicketCard({
  ticket,
  wallet,
  onTransferred,
}: {
  ticket: TicketData;
  wallet: string;
  onTransferred?: () => void;
}) {
  const [transferring, setTransferring] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  const isOwner = ticket.owner === wallet;

  const handleTransfer = async () => {
    if (!transferTo.trim()) return;
    setTransferring(true);
    try {
      await transferTicket(
        wallet,
        transferTo.trim(),
        ticket.eventId,
        ticket.seat
      );
      setShowTransfer(false);
      setTransferTo("");
      onTransferred?.();
    } catch (e: any) {
      alert("Transfer failed: " + e.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-purple-500/50 transition-all duration-300">
      {/* Ticket header - like a real ticket stub */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 p-4 relative">
        {/* Perforated edge effect */}
        <div className="absolute -bottom-2 left-0 right-0 flex justify-around">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-black"
            />
          ))}
        </div>
        <div className="text-white">
          <p className="text-xs opacity-80 uppercase tracking-wider">
            EventX Ticket
          </p>
          <h3 className="font-bold text-lg mt-1">{ticket.eventName}</h3>
          <p className="text-sm opacity-90">{formatDate(ticket.eventDate)}</p>
        </div>
      </div>

      {/* Ticket body */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase">Seat</p>
            <p className="text-2xl font-bold text-white">#{ticket.seat}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Event ID</p>
            <p className="text-sm text-gray-300">#{ticket.eventId}</p>
          </div>
        </div>

        {isOwner && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            {/* Refund button for cancelled events */}
            {ticket.cancelled && (
              <RefundButton ticket={ticket} onRefunded={onTransferred} />
            )}

            {/* Transfer section */}
            {!ticket.cancelled && (
              <>
                {!showTransfer ? (
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    Transfer Ticket
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Stellar address (G...)"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleTransfer}
                        disabled={transferring || !transferTo.trim()}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                      >
                        {transferring ? "Sending..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setShowTransfer(false)}
                        className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

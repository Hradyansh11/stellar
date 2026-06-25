import {
  rpc,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
  BASE_FEE,
  Networks,
  xdr,
} from "@stellar/stellar-sdk";
import {
  isAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

// ─── Configuration ───────────────────────────────────────────
export const RPC_URL = "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = Networks.TESTNET;
// Native XLM token address on Testnet (SAC for native asset)
export const NATIVE_TOKEN_ADDRESS =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

// Deployed contract address
export let CONTRACT_ADDRESS =
  "CCC4RBXAHIKZVWJPRVU6E5WBEFLHIPLQWAP3OSYSEWUC74XUACPS3VCD";

export function setContractAddress(address: string) {
  CONTRACT_ADDRESS = address;
}

// ─── Wallet Connection ───────────────────────────────────────
export async function connectWallet(): Promise<string | null> {
  try {
    const { isAllowed: allowed } = await isAllowed();
    if (!allowed) {
      throw new Error("Freighter access not granted");
    }
    const { address } = await getAddress();
    return address;
  } catch (e) {
    console.error("Wallet connection error:", e);
    return null;
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const { address } = await getAddress();
    return address;
  } catch {
    return null;
  }
}

// ─── Server & Contract ───────────────────────────────────────
function getServer() {
  return new rpc.Server(RPC_URL);
}

function getContract() {
  if (!CONTRACT_ADDRESS) throw new Error("Contract not set");
  return new Contract(CONTRACT_ADDRESS);
}

// ─── ScVal Converters ────────────────────────────────────────
export function toScValString(val: string): xdr.ScVal {
  return nativeToScVal(val, { type: "string" });
}

export function toScValU64(val: number | bigint): xdr.ScVal {
  return nativeToScVal(val, { type: "u64" });
}

export function toScValU32(val: number): xdr.ScVal {
  return nativeToScVal(val, { type: "u32" });
}

export function toScValI128(val: number | bigint | string): xdr.ScVal {
  return nativeToScVal(val, { type: "i128" });
}

export function toScValAddress(val: string): xdr.ScVal {
  return new Address(val).toScVal();
}

export function toScValBool(val: boolean): xdr.ScVal {
  return nativeToScVal(val, { type: "bool" } as any);
}

export function scvToNative(sv: xdr.ScVal): any {
  return scValToNative(sv);
}

// ─── Read Contract (no wallet needed) ────────────────────────
export async function readContract(
  method: string,
  args: xdr.ScVal[],
  source?: string
): Promise<any> {
  const server = getServer();
  const contract = getContract();

  const result = await server.simulateTransaction(
    new TransactionBuilder(undefined as any, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()
  );

  const simResult = result as any;
  if (simResult.error) throw new Error(simResult.error);

  const retval = simResult?.result?.retval;
  if (!retval) throw new Error("No return value");

  // Parse the return value based on expected type
  return scValToNative(retval);
}

// ─── Write Contract (requires wallet) ────────────────────────
export async function writeContract(
  method: string,
  args: xdr.ScVal[],
  caller: string
): Promise<string> {
  const server = getServer();
  const contract = getContract();

  // Get account
  const account = await server.getAccount(caller);

  // Build transaction
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate first
  const sim = await server.simulateTransaction(tx) as any;
  if (sim.error) throw new Error(`Simulation error: ${sim.error}`);

  // Assemble with auth
  const assembled = rpc.assembleTransaction(tx, sim) as any;

  // Sign with Freighter
  const { signedTxXdr } = await signTransaction(assembled.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Submit
  const txResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any
  );

  const txHash = (txResult as any).hash;
  if (txHash) {
    return txHash;
  }

  throw new Error(`Transaction failed: ${JSON.stringify(txResult)}`);
}

// ─── Wait for Transaction ────────────────────────────────────
export async function waitForTransaction(hash: string): Promise<any> {
  const server = getServer();
  let result = await server.getTransaction(hash);
  let attempts = 0;
  while (result.status === "NOT_FOUND" && attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    result = await server.getTransaction(hash);
    attempts++;
  }
  if (result.status === "SUCCESS") return result;
  throw new Error(`Transaction ${hash} failed: ${JSON.stringify(result)}`);
}

// ─── Convenience: Contract Events ────────────────────────────

// ─── Fetch all event IDs from contract ─────────────────────────
export async function fetchAllEventIds(): Promise<number[]> {
  const ids = await readContract("get_all_events", []);
  // get_all_events returns Vec<u64> which converts to number[]
  if (Array.isArray(ids)) return ids;
  return [];
}

// ─── Fetch single event by ID ─────────────────────────────────
export interface EventData {
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

export async function fetchEvent(id: number): Promise<EventData> {
  const raw = await readContract("get_event", [toScValU64(id)]);
  return {
    organizer: raw.organizer?.toString() || raw.organizer,
    name: raw.name,
    description: raw.description,
    date: Number(raw.date),
    price: raw.price?.toString() || String(raw.price),
    max_tickets: Number(raw.max_tickets),
    sold: Number(raw.sold),
    cancelled: Boolean(raw.cancelled),
    withdrawn: Boolean(raw.withdrawn),
  };
}

// ─── Create Event ────────────────────────────────────────────
export async function createEvent(
  organizer: string,
  name: string,
  description: string,
  date: number,
  price: string,
  maxTickets: number
): Promise<string> {
  return writeContract(
    "create_event",
    [
      toScValAddress(organizer),
      toScValString(name),
      toScValString(description),
      toScValU64(date),
      toScValI128(price),
      toScValU32(maxTickets),
    ],
    organizer
  );
}

// ─── Buy Ticket ──────────────────────────────────────────────
export async function buyTicket(
  buyer: string,
  eventId: number
): Promise<{ hash: string; seat: number }> {
  const hash = await writeContract(
    "buy_ticket",
    [toScValAddress(buyer), toScValU64(eventId)],
    buyer
  );

  // Wait for the transaction to get the result
  const result = await waitForTransaction(hash);
  // The return value (seat number) is in the result
  const retval = (result as any)?.returnValue;
  const seat = retval ? Number(scValToNative(retval)) : 0;

  return { hash, seat };
}

// ─── Transfer Ticket ─────────────────────────────────────────
export async function transferTicket(
  from: string,
  to: string,
  eventId: number,
  seat: number
): Promise<string> {
  return writeContract(
    "transfer_ticket",
    [
      toScValAddress(from),
      toScValAddress(to),
      toScValU64(eventId),
      toScValU32(seat),
    ],
    from
  );
}

// ─── Withdraw Funds ──────────────────────────────────────────
export async function withdrawFunds(
  organizer: string,
  eventId: number
): Promise<string> {
  return writeContract(
    "withdraw",
    [toScValAddress(organizer), toScValU64(eventId)],
    organizer
  );
}

// ─── Cancel Event ────────────────────────────────────────────
export async function cancelEvent(
  organizer: string,
  eventId: number
): Promise<string> {
  return writeContract(
    "cancel_event",
    [toScValAddress(organizer), toScValU64(eventId)],
    organizer
  );
}

// ─── Fetch Ticket Owner ──────────────────────────────────────
export async function fetchTicketOwner(
  eventId: number,
  seat: number
): Promise<string> {
  const raw = await readContract("get_ticket_owner", [
    toScValU64(eventId),
    toScValU32(seat),
  ]);
  return raw.toString();
}

// ─── Fetch all events with details ───────────────────────────
export async function fetchAllEvents(): Promise<(EventData & { id: number })[]> {
  const ids = await fetchAllEventIds();
  const events = await Promise.all(
    ids.map(async (id) => {
      try {
        const event = await fetchEvent(id);
        return { ...event, id };
      } catch {
        return null;
      }
    })
  );
  return events.filter((e): e is EventData & { id: number } => e !== null);
}

// ─── Fetch events for an organizer ───────────────────────────
export async function fetchOrganizerEvents(organizer: string): Promise<(EventData & { id: number })[]> {
  const ids = await readContract("get_organizer_events", [toScValAddress(organizer)]);
  const idList: number[] = Array.isArray(ids) ? ids : [];
  const events = await Promise.all(
    idList.map(async (id) => {
      try {
        const event = await fetchEvent(id);
        return { ...event, id };
      } catch {
        return null;
      }
    })
  );
  return events.filter((e): e is EventData & { id: number } => e !== null);
}

// ─── Refund a ticket for a cancelled event ───────────────────
export async function refundTicket(
  buyer: string,
  eventId: number,
  seat: number
): Promise<string> {
  return writeContract(
    "refund",
    [toScValAddress(buyer), toScValU64(eventId), toScValU32(seat)],
    buyer
  );
}

// ─── Fetch user tickets efficiently ──────────────────────────
export interface TicketData {
  eventId: number;
  eventName: string;
  eventDate: number;
  seat: number;
  owner: string;
  cancelled?: boolean;
  price?: string;
}

export async function fetchUserTickets(
  wallet: string
): Promise<TicketData[]> {
  const events = await fetchAllEvents();
  const userTickets: TicketData[] = [];

  for (const event of events) {
    // Only check seats that could be sold (up to event.sold)
    const seatsToCheck = Math.min(event.sold, event.max_tickets);
    for (let seat = 1; seat <= seatsToCheck; seat++) {
      try {
        const owner = await fetchTicketOwner(event.id, seat);
        if (owner.toLowerCase() === wallet.toLowerCase()) {
          userTickets.push({
            eventId: event.id,
            eventName: event.name,
            eventDate: event.date,
            seat,
            owner,
            cancelled: event.cancelled,
            price: event.price,
          });
        }
      } catch {
        // Seat doesn't exist
      }
    }
  }

  return userTickets;
}

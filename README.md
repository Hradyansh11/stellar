# EventX — Event Ticketing on Stellar

A production-ready decentralized event ticketing platform built on **Soroban Smart Contracts** (Rust) with a **Next.js** (TypeScript + Tailwind CSS) frontend, integrated with **Freighter Wallet** and **Stellar SDK**.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js)                        │
│  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │
│  │   Home    │ │  Event   │ │  My       │ │  Organizer  │  │
│  │  Browse   │ │  Detail  │ │  Tickets  │ │  Dashboard  │  │
│  └───────────┘ └──────────┘ └───────────┘ └─────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              lib/stellar.ts (SDK Layer)              │    │
│  │  Freighter Auth · RPC Calls · ScVal Converters      │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ RPC
┌──────────────────────▼──────────────────────────────────────┐
│              Soroban Smart Contract (Rust)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Create   │ │ Buy      │ │ Transfer │ │ Refund ·      │  │
│  │ Event    │ │ Ticket   │ │ Ticket   │ │ Cancel · W/dr │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                                                             │
│  Storage: Instance (Events) + Persistent (Tickets)          │
│  Auth: require_auth() on all mutations                      │
│  Token: SAC (Stellar Asset Contract) integration            │
└─────────────────────────────────────────────────────────────┘
```

## Smart Contract

**Location**: `contract/contracts/contract/src/lib.rs` (215 lines)

### Functions

| Function | Description | Auth |
|---|---|---|
| `init(token)` | Initialize contract with a token address | — |
| `create_event(...)` | Create a new event, returns event ID | `organizer` |
| `buy_ticket(buyer, event_id)` | Purchase a ticket, pays in tokens, returns seat # | `buyer` |
| `refund(buyer, event_id, seat)` | Request refund for cancelled event | `buyer` |
| `transfer_ticket(from, to, event_id, seat)` | Transfer ticket to another address | `from` |
| `withdraw(organizer, event_id)` | Withdraw collected funds | `organizer` |
| `cancel_event(organizer, event_id)` | Cancel an event (enables refunds) | `organizer` |
| `get_event(event_id)` | Read event details | — |
| `get_all_events()` | List all event IDs | — |
| `get_organizer_events(organizer)` | List organizer's event IDs | — |
| `get_ticket_owner(event_id, seat)` | Get ticket owner address | — |

### Tests

19 tests covering all functions, edge cases, and full lifecycle:
- Event creation, multiple events, organizer tracking
- Ticket buying, multiple tickets, sold out cases
- Ticket transfers with ownership verification
- Withdraw funds with auth checks
- Cancel event + refund with double-refund protection
- Partial refund + organizer withdraw scenario
- Full lifecycle (create → buy → transfer → withdraw)

```bash
cd contract && cargo test   # 19 tests, all pass
```

## Client

**Location**: `client/` — Next.js 16 + Tailwind CSS v4

### Pages

| Route | Description |
|---|---|
| `/` | Home — browse all events with hero section |
| `/events/[id]` | Event detail — buy tickets, request refunds |
| `/events/create` | Create new event with date/time/price form |
| `/my-tickets` | User's purchased tickets with transfer & refund |
| `/dashboard` | Organizer dashboard — stats, cancel, withdraw |

### Components

- **Navbar** — Freighter wallet connect, navigation links
- **EventCard** — Event listing card with progress bar
- **TicketCard** — Ticket display with transfer & refund actions

### Stellar SDK Integration

**File**: `client/src/lib/stellar.ts`

- **Freighter Wallet**: `connectWallet()`, `getWalletAddress()`
- **Read calls**: `readContract()` — simulates transactions
- **Write calls**: `writeContract()` — signs with Freighter, submits
- **ScVal converters**: `toScValString`, `toScValU64`, `toScValI128`, `toScValAddress`, etc.
- **All contract methods**: `createEvent`, `buyTicket`, `transferTicket`, `refundTicket`, `withdrawFunds`, `cancelEvent`, etc.

## Deployment

### Prerequisites

```bash
# Install Stellar CLI
curl -fsSL https://github.com/stellar/stellar-cli/raw/main/install.sh | bash

# Install bun (if not installed)
curl -fsSL https://bun.sh/install | bash
```

### 1. Build Contract

```bash
cd contract
make build
```

This produces: `target/wasm32v1-none/release/event_ticketing.wasm`

### 2. Deploy to Testnet

```bash
# Generate a keypair for deployment
stellar keys generate dev --network testnet --fund

# Deploy the contract
stellar contract deploy \
  --wasm target/wasm32v1-none/release/event_ticketing.wasm \
  --source-account dev \
  --network testnet
```

Save the returned contract address (starts with `C`).

### 3. Initialize Contract

```bash
# Initialize with the native XLM token address
stellar contract invoke \
  --id <CONTRACT_ADDRESS> \
  --source-account dev \
  --network testnet \
  -- \
  init \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2Q2QL6A2K6NZKVBZ2H
```

### 4. Configure Client

Update `client/src/lib/stellar.ts`:
```typescript
export let CONTRACT_ADDRESS = "<YOUR_CONTRACT_ADDRESS>";
```

Or use the in-app contract address input field on any page.

### 5. Run Client

```bash
cd client
bun install
bun run dev      # Development on http://localhost:3000
# or
bun run build    # Production build
bun start        # Production server
```

## Testing

```bash
# Smart contract (19 tests)
cd contract && cargo test

# Client build
cd client && bun run build
```

## Key Design Decisions

1. **Token-based payments**: Uses Stellar Asset Contract (SAC) rather than native XLM transfers, supporting any Stellar token.
2. **Permissionless events**: Anyone can create events — no admin gatekeeper.
3. **Refund mechanism**: When an event is cancelled, buyers can claim refunds individually. Double-refund is prevented.
4. **Per-seat tracking**: Each ticket is a unique (event_id, seat_number) pair stored in persistent storage with TTL extension.
5. **Organizer index**: Events are indexed by organizer address for the dashboard without scanning all events.
6. **Instance storage for events**: All event data uses instance storage (shared TTL), while individual tickets use persistent storage (per-key TTL).

## Tech Stack

- **Smart Contracts**: Soroban SDK v25 (Rust, `no_std`)
- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Wallet**: Freighter API (`@stellar/freighter-api`)
- **Blockchain**: Stellar SDK (`@stellar/stellar-sdk` v16)
- **Build**: Cargo, Bun
- **Network**: Stellar Testnet (configurable for Mainnet)


---
### Stellar Smart Contract Address
`CDD6UJ3G4JCDX7FODDPEXTYVGBFAIFFX4BCP4QRDHBYD27PSQOBDTDST`


---
### Stellar Smart Contract Address
`CD23VEYGDMG4PSLMY5ZT46K6UZ6RL4BV7AU5ATHSKLFB5AKR4LZTK2LQ`

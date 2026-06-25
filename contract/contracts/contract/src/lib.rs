#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, panic_with_error, token};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotFound = 1,
    SoldOut = 2,
    NotOrganizer = 3,
    Cancelled = 4,
    NotOwner = 5,
    AlreadyWithdrawn = 6,
    NotCancelled = 7,
    NoRefund = 8,
}

#[contracttype]
#[derive(Clone)]
pub struct Event {
    pub organizer: Address,
    pub name: String,
    pub description: String,
    pub date: u64,
    pub price: i128,
    pub max_tickets: u32,
    pub sold: u32,
    pub cancelled: bool,
    pub withdrawn: bool,
}

#[contracttype]
pub enum DataKey {
    Token,
    Counter,
    AllEvents,
    Event(u64),
    Ticket(u64, u32),
    OrganizerEvents(Address),
    Refunded(u64, u32),
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn init(env: Env, token: Address) {
        assert!(!env.storage().instance().has(&DataKey::Token), "already init");
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Counter, &0u64);
        env.storage().instance().set(&DataKey::AllEvents, &Vec::<u64>::new(&env));
    }

    pub fn create_event(
        env: Env,
        organizer: Address,
        name: String,
        description: String,
        date: u64,
        price: i128,
        max_tickets: u32,
    ) -> u64 {
        organizer.require_auth();
        assert!(max_tickets > 0, "need tickets");
        assert!(price >= 0, "bad price");
        let mut id: u64 = env.storage().instance().get(&DataKey::Counter).unwrap();
        id += 1;
        let event = Event {
            organizer: organizer.clone(),
            name,
            description,
            date,
            price,
            max_tickets,
            sold: 0,
            cancelled: false,
            withdrawn: false,
        };
        env.storage().instance().set(&DataKey::Event(id), &event);
        env.storage().instance().set(&DataKey::Counter, &id);

        // Track in all events list
        let mut all: Vec<u64> = env.storage().instance().get(&DataKey::AllEvents).unwrap();
        all.push_back(id);
        env.storage().instance().set(&DataKey::AllEvents, &all);

        // Track in organizer's events list
        let org_key = DataKey::OrganizerEvents(organizer.clone());
        let mut org_events: Vec<u64> = env.storage().instance().get(&org_key).unwrap_or_else(|| Vec::new(&env));
        org_events.push_back(id);
        env.storage().instance().set(&org_key, &org_events);

        id
    }

    pub fn buy_ticket(env: Env, buyer: Address, event_id: u64) -> u32 {
        buyer.require_auth();
        let mut event: Event = env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert!(!event.cancelled, "cancelled");
        assert!(event.sold < event.max_tickets, "sold out");

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token)
            .transfer(&buyer, &env.current_contract_address(), &event.price);

        event.sold += 1;
        let seat = event.sold;
        let key = DataKey::Ticket(event_id, seat);
        env.storage().persistent().set(&key, &buyer);
        env.storage().persistent().extend_ttl(&key, 5000, 10000);
        env.storage().instance().set(&DataKey::Event(event_id), &event);
        seat
    }

    /// Refund a specific ticket for a cancelled event
    pub fn refund(env: Env, buyer: Address, event_id: u64, seat: u32) {
        buyer.require_auth();
        let event: Event = env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert!(event.cancelled, "event not cancelled");

        let ticket_key = DataKey::Ticket(event_id, seat);
        let owner: Address = env.storage()
            .persistent()
            .get(&ticket_key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert_eq!(owner, buyer, "not ticket owner");

        let refund_key = DataKey::Refunded(event_id, seat);
        assert!(!env.storage().persistent().has(&refund_key), "already refunded");
        env.storage().persistent().set(&refund_key, &true);

        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token)
            .transfer(&env.current_contract_address(), &buyer, &event.price);
    }

    pub fn get_event(env: Env, event_id: u64) -> Event {
        env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }

    pub fn get_all_events(env: Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::AllEvents)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_organizer_events(env: Env, organizer: Address) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::OrganizerEvents(organizer))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_ticket_owner(env: Env, event_id: u64, seat: u32) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(event_id, seat))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound))
    }

    pub fn transfer_ticket(env: Env, from: Address, to: Address, event_id: u64, seat: u32) {
        from.require_auth();
        let key = DataKey::Ticket(event_id, seat);
        let owner: Address = env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert_eq!(owner, from, "not owner");
        env.storage().persistent().set(&key, &to);
    }

    pub fn withdraw(env: Env, organizer: Address, event_id: u64) {
        organizer.require_auth();
        let mut event: Event = env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert_eq!(event.organizer, organizer, "not organizer");
        assert!(!event.withdrawn, "already withdrawn");
        event.withdrawn = true;
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let bal = token::Client::new(&env, &token)
            .balance(&env.current_contract_address());
        if bal > 0 {
            token::Client::new(&env, &token)
                .transfer(&env.current_contract_address(), &organizer, &bal);
        }
        env.storage().instance().set(&DataKey::Event(event_id), &event);
    }

    pub fn cancel_event(env: Env, organizer: Address, event_id: u64) {
        organizer.require_auth();
        let mut event: Event = env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotFound));
        assert_eq!(event.organizer, organizer, "not organizer");
        assert!(!event.cancelled, "already cancelled");
        event.cancelled = true;
        env.storage().instance().set(&DataKey::Event(event_id), &event);
    }
}

mod test;

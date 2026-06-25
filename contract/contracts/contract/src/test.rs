#![cfg(test)]

use super::*;
use soroban_sdk::{Env, Address, String, token};
use soroban_sdk::testutils::Address as _;

fn setup_client<'a>(env: &'a Env) -> (Address, ContractClient<'a>, token::StellarAssetClient<'a>) {
    let admin = Address::generate(env);
    let sac_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac_contract.address();
    let sac = token::StellarAssetClient::new(env, &token);
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(env, &contract_id);
    client.init(&token);
    (token, client, sac)
}

#[test]
fn test_create_event() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let name = String::from_str(&env, "Stellar Summit 2026");
    let desc = String::from_str(&env, "The biggest Stellar conference of the year");

    let id = client.create_event(&organizer, &name, &desc, &1_800_000_000u64, &250_000_000i128, &100u32);
    assert_eq!(id, 1);

    let event = client.get_event(&id);
    assert_eq!(event.organizer, organizer);
    assert_eq!(event.name, name);
    assert_eq!(event.description, desc);
    assert_eq!(event.date, 1_800_000_000);
    assert_eq!(event.price, 250_000_000);
    assert_eq!(event.max_tickets, 100);
    assert_eq!(event.sold, 0);
    assert!(!event.cancelled);
    assert!(!event.withdrawn);
}

#[test]
fn test_create_multiple_events() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let id1 = client.create_event(&organizer, &String::from_str(&env, "E1"), &String::from_str(&env, "D1"), &100, &1000, &10);
    let id2 = client.create_event(&organizer, &String::from_str(&env, "E2"), &String::from_str(&env, "D2"), &200, &2000, &20);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);

    let all = client.get_all_events();
    assert_eq!(all.len(), 2);
    assert_eq!(all.get(0).unwrap(), 1);
    assert_eq!(all.get(1).unwrap(), 2);
}

#[test]
fn test_buy_ticket() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, client, sac) = setup_client(&env);

    let token_client = token::Client::new(&env, &token);
    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &1_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Concert"), &String::from_str(&env, "Live music"), &1_800_000_000, &500_000_000, &10);

    assert_eq!(token_client.balance(&buyer), 1_000_000_000);

    let seat = client.buy_ticket(&buyer, &event_id);
    assert_eq!(seat, 1);

    assert_eq!(token_client.balance(&buyer), 500_000_000);

    let event = client.get_event(&event_id);
    assert_eq!(event.sold, 1);

    assert_eq!(client.get_ticket_owner(&event_id, &seat), buyer);
}

#[test]
fn test_buy_multiple_tickets() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Festival"), &String::from_str(&env, "3-day"), &1_800_000_000, &1_000_000_000, &5);

    assert_eq!(client.buy_ticket(&buyer, &event_id), 1);
    assert_eq!(client.buy_ticket(&buyer, &event_id), 2);
    assert_eq!(client.buy_ticket(&buyer, &event_id), 3);

    assert_eq!(client.get_event(&event_id).sold, 3);
}

#[test]
fn test_transfer_ticket() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    let friend = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Workshop"), &String::from_str(&env, "Coding"), &1_800_000_000, &1_000_000_000, &50);
    let seat = client.buy_ticket(&buyer, &event_id);

    client.transfer_ticket(&buyer, &friend, &event_id, &seat);
    assert_eq!(client.get_ticket_owner(&event_id, &seat), friend);
}

#[test]
fn test_withdraw_funds() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, client, sac) = setup_client(&env);

    let token_client = token::Client::new(&env, &token);
    let organizer = Address::generate(&env);
    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);
    sac.mint(&buyer1, &10_000_000_000i128);
    sac.mint(&buyer2, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Paid"), &String::from_str(&env, "Premium"), &1_800_000_000, &2_000_000_000, &10);
    client.buy_ticket(&buyer1, &event_id);
    client.buy_ticket(&buyer2, &event_id);

    assert_eq!(token_client.balance(&organizer), 0);

    client.withdraw(&organizer, &event_id);

    assert_eq!(token_client.balance(&organizer), 4_000_000_000);
    assert!(client.get_event(&event_id).withdrawn);
}

#[test]
fn test_cancel_event() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let event_id = client.create_event(&organizer, &String::from_str(&env, "Cancelled"), &String::from_str(&env, "Oops"), &1_800_000_000, &1_000_000_000, &10);

    client.cancel_event(&organizer, &event_id);
    assert!(client.get_event(&event_id).cancelled);
}

#[test]
fn test_cannot_buy_from_cancelled() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Doomed"), &String::from_str(&env, "Cancelled"), &1_800_000_000, &1_000_000_000, &10);
    client.cancel_event(&organizer, &event_id);

    let result = client.try_buy_ticket(&buyer, &event_id);
    assert!(result.is_err());
}

#[test]
fn test_sold_out() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer1 = Address::generate(&env);
    let buyer2 = Address::generate(&env);
    sac.mint(&buyer1, &10_000_000_000i128);
    sac.mint(&buyer2, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Tiny"), &String::from_str(&env, "1 ticket"), &1_800_000_000, &1_000_000_000, &1);
    client.buy_ticket(&buyer1, &event_id);

    let result = client.try_buy_ticket(&buyer2, &event_id);
    assert!(result.is_err());
}

#[test]
fn test_get_nonexistent_event_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let result = client.try_get_event(&999);
    assert!(result.is_err());
}

#[test]
fn test_non_organizer_cannot_withdraw() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let attacker = Address::generate(&env);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Secure"), &String::from_str(&env, "Secure"), &1_800_000_000, &1_000_000_000, &10);

    let result = client.try_withdraw(&attacker, &event_id);
    assert!(result.is_err());
}

#[test]
fn test_different_buyers() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let b1 = Address::generate(&env);
    let b2 = Address::generate(&env);
    let b3 = Address::generate(&env);
    sac.mint(&b1, &10_000_000_000i128);
    sac.mint(&b2, &10_000_000_000i128);
    sac.mint(&b3, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Multi"), &String::from_str(&env, "Many"), &1_800_000_000, &500_000_000, &10);

    assert_eq!(client.buy_ticket(&b1, &event_id), 1);
    assert_eq!(client.buy_ticket(&b2, &event_id), 2);
    assert_eq!(client.buy_ticket(&b3, &event_id), 3);

    assert_eq!(client.get_ticket_owner(&event_id, &1), b1);
    assert_eq!(client.get_ticket_owner(&event_id, &2), b2);
    assert_eq!(client.get_ticket_owner(&event_id, &3), b3);
}

#[test]
fn test_full_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, client, sac) = setup_client(&env);

    let token_client = token::Client::new(&env, &token);
    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &100_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Lifecycle"), &String::from_str(&env, "Full flow"), &1_800_000_000, &1_000_000_000, &5);
    let seat = client.buy_ticket(&buyer, &event_id);

    let new_owner = Address::generate(&env);
    client.transfer_ticket(&buyer, &new_owner, &event_id, &seat);
    assert_eq!(client.get_ticket_owner(&event_id, &seat), new_owner);

    client.withdraw(&organizer, &event_id);
    assert!(client.get_event(&event_id).withdrawn);
    assert_eq!(token_client.balance(&organizer), 1_000_000_000);
}

#[test]
fn test_organizer_can_create_multiple_events() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let names = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

    for (i, &n) in names.iter().enumerate() {
        let id = client.create_event(
            &organizer,
            &String::from_str(&env, n),
            &String::from_str(&env, "desc"),
            &(1_800_000_000 + i as u64),
            &((i + 1) as i128 * 1_000_000_000),
            &((i + 1) as u32 * 10),
        );
        assert_eq!(id, (i + 1) as u64);
    }

    let all = client.get_all_events();
    assert_eq!(all.len(), 5);
}

#[test]
fn test_get_organizer_events() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, _) = setup_client(&env);

    let organizer = Address::generate(&env);
    let other = Address::generate(&env);

    let id1 = client.create_event(&organizer, &String::from_str(&env, "O1"), &String::from_str(&env, "D1"), &100, &1000, &10);
    let id2 = client.create_event(&organizer, &String::from_str(&env, "O2"), &String::from_str(&env, "D2"), &200, &2000, &20);
    let id3 = client.create_event(&other, &String::from_str(&env, "O3"), &String::from_str(&env, "D3"), &300, &3000, &30);

    let org_events = client.get_organizer_events(&organizer);
    assert_eq!(org_events.len(), 2);
    assert_eq!(org_events.get(0).unwrap(), id1);
    assert_eq!(org_events.get(1).unwrap(), id2);

    let other_events = client.get_organizer_events(&other);
    assert_eq!(other_events.len(), 1);
    assert_eq!(other_events.get(0).unwrap(), id3);
}

#[test]
fn test_refund_on_cancelled_event() {
    let env = Env::default();
    env.mock_all_auths();
    let (token, client, sac) = setup_client(&env);

    let token_client = token::Client::new(&env, &token);
    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "RefundTest"), &String::from_str(&env, "Will cancel"), &1_800_000_000, &2_000_000_000, &10);
    let seat = client.buy_ticket(&buyer, &event_id);

    assert_eq!(token_client.balance(&buyer), 8_000_000_000);
    assert_eq!(token_client.balance(&client.address), 2_000_000_000);

    client.cancel_event(&organizer, &event_id);
    client.refund(&buyer, &event_id, &seat);

    assert_eq!(token_client.balance(&buyer), 10_000_000_000);
    assert_eq!(token_client.balance(&client.address), 0);
}

#[test]
fn test_cannot_double_refund() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "NoDouble"), &String::from_str(&env, "No double refund"), &1_800_000_000, &1_000_000_000, &10);
    let seat = client.buy_ticket(&buyer, &event_id);
    client.cancel_event(&organizer, &event_id);

    client.refund(&buyer, &event_id, &seat);
    let result = client.try_refund(&buyer, &event_id, &seat);
    assert!(result.is_err());
}

#[test]
fn test_cannot_refund_non_cancelled_event() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client, sac) = setup_client(&env);

    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);
    sac.mint(&buyer, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Active"), &String::from_str(&env, "Still active"), &1_800_000_000, &1_000_000_000, &10);
    let seat = client.buy_ticket(&buyer, &event_id);

    let result = client.try_refund(&buyer, &event_id, &seat);
    assert!(result.is_err());
}

#[test]
fn test_cancel_and_withdraw_with_excess() {
    // When event is cancelled and some refunds happen, organizer should only get remaining
    let env = Env::default();
    env.mock_all_auths();
    let (token, client, sac) = setup_client(&env);

    let token_client = token::Client::new(&env, &token);
    let organizer = Address::generate(&env);
    let b1 = Address::generate(&env);
    let b2 = Address::generate(&env);
    sac.mint(&b1, &10_000_000_000i128);
    sac.mint(&b2, &10_000_000_000i128);

    let event_id = client.create_event(&organizer, &String::from_str(&env, "Partial"), &String::from_str(&env, "Partial refund"), &1_800_000_000, &2_000_000_000, &10);
    let s1 = client.buy_ticket(&b1, &event_id);
    let _s2 = client.buy_ticket(&b2, &event_id);

    client.cancel_event(&organizer, &event_id);

    // Only b1 gets refunded
    client.refund(&b1, &event_id, &s1);

    // Organizer withdraws remaining (b2's payment)
    client.withdraw(&organizer, &event_id);
    assert_eq!(token_client.balance(&organizer), 2_000_000_000);
}

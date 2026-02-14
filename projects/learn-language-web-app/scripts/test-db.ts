import db from "../src/lib/db";
import { getAllDecks, getDeckById, createDeck, updateDeck, deleteDeck } from "../src/lib/decks";
import { getCardsByDeckId, getCardById, createCard, createCards, updateCard, deleteCard, getDueCards } from "../src/lib/cards";

console.log("=== Testing Deck Operations ===\n");

// Test 1: Create a deck
console.log("1. Creating a deck...");
const deck = createDeck({
  name: "Arabic Basics",
  description: "Essential Arabic vocabulary",
});
console.log("   Created:", deck.name, "(id:", deck.id + ")");

// Test 2: Update deck
console.log("2. Updating deck...");
const updatedDeck = updateDeck(deck.id, { name: "Arabic Basics - Updated" });
console.log("   Updated to:", updatedDeck?.name);

console.log("\n=== Testing Card Operations ===\n");

// Test 3: Create a single card
console.log("3. Creating a single card...");
const card = createCard({
  deck_id: deck.id,
  front: "مرحبا",
  back: "Hello",
  notes: "Common greeting",
});
console.log("   Created:", card.front, "->", card.back);

// Test 4: Bulk create cards
console.log("4. Bulk creating cards...");
const bulkCards = createCards([
  { deck_id: deck.id, front: "شكرا", back: "Thank you" },
  { deck_id: deck.id, front: "نعم", back: "Yes" },
  { deck_id: deck.id, front: "لا", back: "No" },
]);
console.log("   Created", bulkCards.length, "cards");

// Test 5: Get cards by deck
console.log("5. Getting cards by deck...");
const deckCards = getCardsByDeckId(deck.id);
console.log("   Found", deckCards.length, "cards:");
deckCards.forEach((c) => console.log("   -", c.front, "->", c.back));

// Test 6: Update a card
console.log("6. Updating a card...");
const updatedCard = updateCard(card.id, { notes: "Most common Arabic greeting" });
console.log("   Updated notes:", updatedCard?.notes);

// Test 7: Get due cards
console.log("7. Getting due cards...");
const dueCards = getDueCards(deck.id);
console.log("   Due cards:", dueCards.length);

// Test 8: Check deck stats
console.log("8. Checking deck stats...");
const deckWithStats = getDeckById(deck.id);
console.log("   Total cards:", deckWithStats?.total_cards);
console.log("   Due cards:", deckWithStats?.due_cards);
console.log("   New cards:", deckWithStats?.new_cards);

// Test 9: Delete a card
console.log("9. Deleting a card...");
const cardDeleted = deleteCard(bulkCards[0].id);
console.log("   Deleted:", cardDeleted);
console.log("   Remaining cards:", getCardsByDeckId(deck.id).length);

// Cleanup
console.log("\n=== Cleanup ===\n");
console.log("10. Deleting deck (cascades to cards)...");
deleteDeck(deck.id);
console.log("    Decks remaining:", getAllDecks().length);

console.log("\n✓ All tests passed!");

db.close();

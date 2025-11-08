/**
 * Basic tests for game engine
 * Run with: node --loader tsx game-engine.test.ts
 */

import {
  createInitialState,
  startCutForDeal,
  cutForDeal,
  dealCards,
  setDiscard,
  confirmDiscard,
  cutStarter,
  playCard,
  checkDeckIntegrity,
} from './game-engine.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testDeckIntegrity() {
  console.log('Testing deck integrity...');

  const state = createInitialState();
  const cutState = startCutForDeal(state);

  // Check initial deck
  let errors = checkDeckIntegrity(cutState);
  assert(errors.length === 0, `Initial deck should be valid: ${errors.join(', ')}`);

  // After both players cut
  const state1 = cutForDeal(cutState, 'A');
  errors = checkDeckIntegrity(state1);
  assert(errors.length === 0, `After A cuts: ${errors.join(', ')}`);

  const state2 = cutForDeal(state1, 'B');
  // State2 might be DEAL phase with fresh deck
  errors = checkDeckIntegrity(state2);
  assert(errors.length === 0, `After B cuts: ${errors.join(', ')}`);

  console.log('✓ Deck integrity tests passed');
}

function testDealPhase() {
  console.log('Testing deal phase...');

  let state = createInitialState();
  state.dealer = 'A';
  state.phase = 'DEAL';
  state.deck = startCutForDeal(state).deck;

  const dealState = dealCards(state, 'A');

  assert(dealState.phase === 'DISCARD', 'Should transition to DISCARD');
  assert(dealState.hands.A.length === 6, 'Player A should have 6 cards');
  assert(dealState.hands.B.length === 6, 'Player B should have 6 cards');

  const errors = checkDeckIntegrity(dealState);
  assert(errors.length === 0, `After deal: ${errors.join(', ')}`);

  console.log('✓ Deal phase tests passed');
}

function testDiscardPhase() {
  console.log('Testing discard phase...');

  let state = createInitialState();
  state.dealer = 'A';
  state.phase = 'DEAL';
  state.deck = startCutForDeal(state).deck;
  state = dealCards(state, 'A');

  // Set discards for A
  const cardIds = state.hands.A.slice(0, 2).map((c) => c.id);
  state = setDiscard(state, 'A', cardIds);

  assert(state.pendingDiscards.A.length === 2, 'Should have 2 pending discards');

  // Confirm A's discards
  state = confirmDiscard(state, 'A');

  assert(state.hands.A.length === 4, 'Player A should have 4 cards after discard');
  assert(state.crib.length === 2, 'Crib should have 2 cards');

  const errors = checkDeckIntegrity(state);
  assert(errors.length === 0, `After A discards: ${errors.join(', ')}`);

  // Set and confirm B's discards
  const bCardIds = state.hands.B.slice(0, 2).map((c) => c.id);
  state = setDiscard(state, 'B', bCardIds);
  state = confirmDiscard(state, 'B');

  assert(state.phase === 'CUT_STARTER', 'Should transition to CUT_STARTER');
  assert(state.hands.B.length === 4, 'Player B should have 4 cards after discard');
  assert(state.crib.length === 4, 'Crib should have 4 cards');

  const errors2 = checkDeckIntegrity(state);
  assert(errors2.length === 0, `After both discard: ${errors2.join(', ')}`);

  console.log('✓ Discard phase tests passed');
}

function testCutStarter() {
  console.log('Testing cut starter...');

  let state = createInitialState();
  state.dealer = 'A';
  state.phase = 'DEAL';
  state.deck = startCutForDeal(state).deck;
  state = dealCards(state, 'A');

  // Fast-forward through discards
  const aCards = state.hands.A.slice(0, 2).map((c) => c.id);
  state = setDiscard(state, 'A', aCards);
  state = confirmDiscard(state, 'A');

  const bCards = state.hands.B.slice(0, 2).map((c) => c.id);
  state = setDiscard(state, 'B', bCards);
  state = confirmDiscard(state, 'B');

  // Now cut starter (pone = B)
  state = cutStarter(state, 'B');

  assert(state.phase === 'PEGGING', 'Should transition to PEGGING');
  assert(state.starter !== null, 'Starter should be set');

  const errors = checkDeckIntegrity(state);
  assert(errors.length === 0, `After cut starter: ${errors.join(', ')}`);

  console.log('✓ Cut starter tests passed');
}

function runTests() {
  console.log('Running game engine tests...\n');

  try {
    testDeckIntegrity();
    testDealPhase();
    testDiscardPhase();
    testCutStarter();

    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

runTests();

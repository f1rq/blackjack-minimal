<script lang="ts">
  import { fly, fade, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  import { 
    createDeck, 
    calculateHandScore, 
    isRedSuit, 
    formatMoney, 
    ALL_CHIPS, 
    type Card, 
    type GameState 
  } from '../lib/game';

  let deck = $state<Card[]>([]);
  let playerHand = $state<Card[]>([]);
  let dealerHand = $state<Card[]>([]);
  
  let bankroll = $state(1000);
  let highScore = $state(1000);
  let currentBet = $state(0);
  let gameState = $state<GameState>('betting');

  let playerScore = $derived(calculateHandScore(playerHand));
  let dealerScore = $derived(calculateHandScore(dealerHand));

  function updateHighScore() {
    if (bankroll > highScore) {
      highScore = bankroll;
    }
  }

  let availableChips = $derived(
    ALL_CHIPS.filter(chip => chip.value <= bankroll)
  );

  function addChip(amount: number) {
    if (gameState !== 'betting') return;
    if (bankroll >= amount) {
      bankroll -= amount;
      currentBet += amount;
    }
  }

  function clearBet() {
    if (gameState !== 'betting') return;
    bankroll += currentBet;
    currentBet = 0;
  }

  function startRound() {
    if (currentBet <= 0) return;

    deck = createDeck();
    playerHand = [deck.pop()!, deck.pop()!];
    dealerHand = [deck.pop()!, { ...deck.pop()!, hidden: true }];
    gameState = 'playing';

    if (calculateHandScore(playerHand) === 21) {
      dealerHand[1].hidden = false;
      
      if (calculateHandScore(dealerHand) === 21) {
        gameState = 'push';
        bankroll += currentBet;
      } else {
        gameState = 'blackjack';
        bankroll += Math.floor(currentBet * 2.5);
      }
      updateHighScore();
    }
  }

  function hit() {
    if (gameState !== 'playing') return;

    const newHand = [...playerHand, deck.pop()!];
    playerHand = newHand;

    const currentScore = calculateHandScore(newHand);

    if (currentScore > 21) {
      gameState = 'playerBust';
    } else if (currentScore === 21) {
      // Trafienie 21 przy hicie -> automatyczny pas i rozstrzygnięcie
      stand();
    }
  }

  function stand() {
    if (gameState !== 'playing') return;
    gameState = 'dealerTurn';
    dealerHand[1].hidden = false;

    const dealerInterval = setInterval(() => {
      if (calculateHandScore(dealerHand) < 17) {
        dealerHand.push(deck.pop()!);
      } else {
        clearInterval(dealerInterval);
        resolveWinner();
      }
    }, 400);
  }

  function resolveWinner() {
    const finalPlayer = calculateHandScore(playerHand);
    const finalDealer = calculateHandScore(dealerHand);

    if (finalDealer > 21) {
      gameState = 'dealerBust';
      bankroll += currentBet * 2;
    } else if (finalPlayer > finalDealer) {
      // Wygrana zwykła lub specyficzny komunikat dla trafionego 21
      gameState = finalPlayer === 21 ? 'got21' : 'playerWin';
      bankroll += currentBet * 2;
    } else if (finalDealer > finalPlayer) {
      gameState = 'dealerWin';
    } else {
      gameState = 'push';
      bankroll += currentBet;
    }

    updateHighScore();
  }

  function resetForNextRound() {
    playerHand = [];
    dealerHand = [];
    currentBet = 0;

    if (bankroll === 0) {
      gameState = 'gameOver';
    } else {
      gameState = 'betting';
    }
  }

  function restartGame() {
    playerHand = [];
    dealerHand = [];
    bankroll = 1000;
    highScore = 1000;
    currentBet = 0;
    gameState = 'betting';
  }
</script>

<main class="h-screen w-screen bg-darkbg text-textmain flex flex-col justify-between p-6 font-mono select-none overflow-hidden relative">

  <!-- TOP: DEALER SECTION -->
  <div class="flex flex-col items-center gap-3 pt-2 min-h-37">
    {#if gameState !== 'betting' && gameState !== 'gameOver'}
      <div class="flex items-center gap-2.5 bg-[#1a1a1a] px-3.5 py-1 rounded-full border border-[#3d3d3d] shadow-sm">
        <span class="text-sm font-bold tracking-widest text-subtext uppercase">Dealer</span>
        {#if !dealerHand[1]?.hidden}
          <span class="text-base font-extrabold text-white">
            {dealerScore}
          </span>
        {/if}
      </div>
      
      <div class="flex gap-3 items-center">
        {#each dealerHand as card, index}
          <div
            in:fly={{ y: -20, duration: 250, delay: index * 50 }}
            class="w-16 h-24 bg-cardbg border border-cardborder rounded-lg flex flex-col items-center justify-center font-bold text-xl shadow-md transition-all">
            {#if card.hidden}
              <span class="text-subtext/40 text-2xl">🂠</span>
            {:else}
              <span class={isRedSuit(card.suit) ? 'text-red-400' : 'text-textmain'}>{card.value}</span>
              <span class="text-sm mt-0.5 {isRedSuit(card.suit) ? 'text-red-400' : 'text-subtext'}">{card.suit}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- CENTER: BET DISPLAY & GAME OVER / RESULT OVERLAYS -->
  <div class="text-center my-auto flex flex-col items-center justify-center gap-2">
    
    {#if gameState === 'gameOver'}
      <!-- GAME OVER SCREEN -->
      <div 
        in:scale={{ duration: 300, easing: backOut, start: 0.9 }}
        class="flex flex-col items-center gap-4 bg-[#181818] border-2 border-red-900/60 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm w-full animate-fade-in">
        <div class="flex flex-col items-center gap-1">
          <span class="text-red-500 font-black text-2xl sm:text-3xl tracking-widest uppercase">BANKRUPT!</span>
          <span class="text-xs text-subtext tracking-wider">You lost all your money</span>
        </div>

        <div class="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg p-3 flex flex-col items-center gap-1">
          <span class="text-[10px] font-bold text-subtext uppercase tracking-widest">All-Time Peak</span>
          <span class="text-emerald-400 font-extrabold text-xl">{formatMoney(highScore)}</span>
        </div>

        <button 
          onclick={restartGame}
          class="w-full py-3.5 bg-red-950/80 hover:bg-red-900 text-red-100 border border-red-800 rounded-lg text-sm font-bold tracking-widest uppercase transition-all shadow-lg active:scale-95">
          Start Again ($1,000)
        </button>
      </div>

    {:else}
      <!-- MAIN BET DISPLAY -->
      <div class="flex flex-col items-center gap-1">
        <span class="text-xs font-bold tracking-widest text-subtext uppercase">Current Bet</span>
        <div class="flex items-center gap-3">
          <span class="text-4xl sm:text-5xl font-black tracking-wider text-emerald-400 drop-shadow-md">
            {formatMoney(currentBet)}
          </span>
          {#if gameState === 'betting' && currentBet > 0}
            <button 
              onclick={clearBet} 
              class="px-2.5 py-1 bg-[#333] hover:bg-red-950/70 hover:text-red-400 text-subtext rounded text-xs font-bold uppercase tracking-wider border border-[#444] transition-colors">
              Reset
            </button>
          {/if}
        </div>
      </div>

      <!-- RESULT BANNERS -->
      {#if ['playerBust', 'dealerBust', 'playerWin', 'dealerWin', 'push', 'blackjack', 'got21'].includes(gameState)}
        <div
          in:scale={{ duration: 250, easing: backOut, start: 0.85 }}
          class="mt-2 py-2.5 px-8 bg-[#181818] border-2 border-[#444] rounded-lg shadow-2xl animate-fade-in">
          {#if gameState === 'blackjack'}
            <span class="text-amber-400 text-lg font-black tracking-widest uppercase animate-pulse">★ BLACKJACK! ★</span>
          {:else if gameState === 'got21'}
            <span class="text-emerald-400 text-base font-extrabold tracking-widest uppercase">21! YOU WIN</span>
          {:else if gameState === 'playerBust'}
            <span class="text-red-400 text-base font-extrabold tracking-widest uppercase">BUST! YOU LOSE</span>
          {:else if gameState === 'dealerBust'}
            <span class="text-emerald-400 text-base font-extrabold tracking-widest uppercase">DEALER BUST! YOU WIN</span>
          {:else if gameState === 'playerWin'}
            <span class="text-emerald-400 text-base font-extrabold tracking-widest uppercase">YOU WIN!</span>
          {:else if gameState === 'dealerWin'}
            <span class="text-red-400 text-base font-extrabold tracking-widest uppercase">DEALER WINS</span>
          {:else if gameState === 'push'}
            <span class="text-amber-400 text-base font-extrabold tracking-widest uppercase">PUSH (DRAW)</span>
          {/if}
        </div>
      {/if}
    {/if}
  </div>

  <!-- BOTTOM: PLAYER & CHIPS / BANKROLL CONTROLS -->
  <div class="flex flex-col items-center gap-4 pb-2">
    
    <!-- PLAYER CARDS & SCORE -->
    <div class="flex flex-col items-center gap-3 min-h-37">
      {#if gameState !== 'betting' && gameState !== 'gameOver'}
        <div class="flex gap-3 items-center">
          {#each playerHand as card, index}
            <div
              in:fly={{ y: 20, duration: 250, delay: index * 50 }} 
              class="w-16 h-24 bg-cardbg border border-cardborder rounded-lg flex flex-col items-center justify-center font-bold text-xl shadow-md transition-all">
              <span class={isRedSuit(card.suit) ? 'text-red-400' : 'text-textmain'}>{card.value}</span>
              <span class="text-sm mt-0.5 {isRedSuit(card.suit) ? 'text-red-400' : 'text-subtext'}">{card.suit}</span>
            </div>
          {/each}
        </div>

        <div class="flex items-center gap-2.5 bg-[#1a1a1a] px-3.5 py-1 rounded-full border border-[#3d3d3d] shadow-sm">
          <span class="text-sm font-bold tracking-widest text-subtext uppercase">You</span>
          <span class="text-base font-extrabold text-white">
            {playerScore}
          </span>
        </div>
      {/if}
    </div>

    <!-- CHIPS + BANKROLL PANEL & ACTION CONTROLS -->
    <div class="w-full max-w-sm flex flex-col items-center gap-3">
      {#if gameState === 'betting'}
        
        <!-- BANKROLL + CHIPS PANEL -->
        <div class="w-full bg-cardbg border border-cardborder rounded-xl p-3 flex flex-col items-center gap-2.5 shadow-md">
          <div class="flex justify-between items-center w-full px-1">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold tracking-widest text-subtext uppercase">Bankroll</span>
              <span class="text-lg font-bold text-white">{formatMoney(bankroll)}</span>
            </div>
            
            <div class="flex flex-col items-end">
              <span class="text-[10px] font-bold tracking-widest text-subtext uppercase">Peak</span>
              <span class="text-xs font-bold text-emerald-400">{formatMoney(highScore)}</span>
            </div>
          </div>

          <!-- CHIPS SELECTOR -->
          <div class="flex flex-wrap justify-center gap-2 w-full pt-2 border-t border-[#333]">
            {#if availableChips.length === 0 && bankroll === 0 && currentBet === 0}
              <span class="text-xs font-bold text-red-400 py-1">OUT OF MONEY!</span>
            {:else}
              {#each availableChips as chip}
                <button
                  onclick={() => addChip(chip.value)}
                  class="w-10 h-10 rounded-full bg-darkbg border-2 border-[#444] hover:border-emerald-500 hover:text-emerald-400 active:scale-95 text-xs font-bold transition-all shadow flex items-center justify-center">
                  {chip.label}
                </button>
              {/each}
            {/if}
          </div>
        </div>

        <button 
          onclick={startRound} 
          disabled={currentBet === 0}
          class="w-full py-3.5 bg-cardborder hover:bg-[#444444] active:bg-[#555555] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm tracking-widest transition-colors font-bold uppercase shadow">
          Deal
        </button>

      {:else if gameState === 'playing'}
        <div class="flex gap-3 w-full">
          <button 
            onclick={hit} 
            class="flex-1 py-3.5 bg-cardborder hover:bg-[#444444] active:bg-[#555555] rounded-lg text-sm tracking-widest transition-colors font-bold uppercase shadow">
            Hit
          </button>
          <button 
            onclick={stand} 
            class="flex-1 py-3.5 bg-cardborder hover:bg-[#444444] active:bg-[#555555] rounded-lg text-sm tracking-widest transition-colors font-bold uppercase shadow">
            Stand
          </button>
        </div>

      {:else if gameState !== 'gameOver'}
        <!-- AFTER ROUND -->
        <button 
          onclick={resetForNextRound} 
          class="w-full py-3.5 bg-cardborder hover:bg-[#444444] active:bg-[#555555] rounded-lg text-sm tracking-widest transition-colors font-bold uppercase shadow">
          Next Hand
        </button>
      {/if}
    </div>

  </div>

</main>
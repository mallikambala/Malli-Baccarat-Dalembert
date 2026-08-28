let popupDismissed = false;
let currentState = null;

window.reRenderUI = () => { if (currentState) updateUI(currentState); };

const formatDisplay = (val, size = 'small', hideUnit = false) => {
    const multiplier = parseInt(document.getElementById('unit_multiplier').value) || 100;
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const inrVal = absVal * multiplier;
    const sign = isNegative ? '-' : '';
    
    const displayUnit = Number.isInteger(absVal) ? absVal : absVal.toFixed(2);
    const inrDisplay = inrVal.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    
    const primaryPart = `${sign}₹${inrDisplay}`;
    if (hideUnit) return primaryPart; 
    
    let secondarySizeClass = 'text-[10px] text-slate-500';
    if (size === 'large') { secondarySizeClass = 'text-lg text-slate-400 font-medium'; }
    else if (size === 'medium') { secondarySizeClass = 'text-base text-slate-400 font-medium'; }
    
    const secondaryPart = `<span class="${secondarySizeClass} ml-1">(${displayUnit} U)</span>`;
    return `${primaryPart}${secondaryPart}`;
};

const renderNumberGrid = (lastSpunNumber = null, state) => {
    const container = document.getElementById('number_grid_container');
    
    if (state.game_type === 'baccarat') {
        const pHighlight = (lastSpunNumber && lastSpunNumber.startsWith('p_')) ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.01] z-10' : '';
        const bHighlight = (lastSpunNumber && lastSpunNumber.startsWith('b_')) ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.01] z-10' : '';
        const tHighlight = (lastSpunNumber === 'Tie') ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-[1.02] z-10' : '';
        
        const genGridBtns = (prefix, nums, bgClass, shadowColor, isCenteredRow=false) => {
            return nums.map((n, i) => {
                const startClass = (isCenteredRow && i === 0) ? 'col-start-2' : '';
                return `
                    <button onclick="recordSpin('${prefix}_${n}')" 
                            class="col-span-2 ${startClass} w-full flex items-center justify-center ${bgClass} text-white font-black py-2.5 sm:py-3 rounded-xl transition-all text-sm sm:text-base border-t border-white/20 shadow-[0_3px_0_${shadowColor}] active:shadow-[0_0px_0_${shadowColor}] active:translate-y-[3px]">
                        ${n}
                    </button>
                `;
            }).join('');
        };

        container.innerHTML = `
            <div class="flex flex-col gap-2.5 sm:gap-3 w-full">
                <!-- BANKER -->
                <div class="bg-red-900/30 border border-red-800/60 rounded-2xl p-2.5 sm:p-3 shadow-inner transition-all duration-300 flex flex-col gap-1.5 sm:gap-2 w-full ${bHighlight}">
                    <div class="text-red-300 font-black text-[10px] sm:text-xs tracking-widest uppercase text-center drop-shadow-sm mb-0.5">BANKER</div>
                    <div class="grid grid-cols-10 gap-1.5 sm:gap-2 w-full">
                        ${genGridBtns('b_low', Array(1, 2, 3, 4, 5), 'bg-red-800 hover:bg-red-700', 'rgb(69,10,10)')}
                        ${genGridBtns('b_high', Array(6, 7, 8, 9), 'bg-red-600 hover:bg-red-500', 'rgb(153,27,27)', true)}
                    </div>
                </div>

                <!-- PLAYER -->
                <div class="bg-blue-900/30 border border-blue-800/60 rounded-2xl p-2.5 sm:p-3 shadow-inner transition-all duration-300 flex flex-col gap-1.5 sm:gap-2 w-full ${pHighlight}">
                    <div class="text-blue-300 font-black text-[10px] sm:text-xs tracking-widest uppercase text-center drop-shadow-sm mb-0.5">PLAYER</div>
                    <div class="grid grid-cols-10 gap-1.5 sm:gap-2 w-full">
                        ${genGridBtns('p_low', Array(1, 2, 3, 4, 5), 'bg-blue-800 hover:bg-blue-700', 'rgb(23,37,84)')}
                        ${genGridBtns('p_high', Array(6, 7, 8, 9), 'bg-blue-600 hover:bg-blue-500', 'rgb(30,58,138)', true)}
                    </div>
                </div>

                <!-- TIE -->
                <div class="w-full">
                    <button onclick="recordSpin('Tie')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 sm:py-3 rounded-xl border-t border-white/20 shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-[4px] transition-all text-sm sm:text-base tracking-widest ${tHighlight}">TIE (PUSH)</button>
                </div>
            </div>
        `;
    } else if (state.game_type === 'roulette') {
        const reds = Array(1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36);
        let buttonsHtml = '';
        
        for (let i = 1; i <= 36; i++) {
            const isRed = reds.includes(i);
            const bgClass = isRed ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-800 hover:bg-slate-700';
            const shadowColor = isRed ? 'rgb(153,27,27)' : 'rgb(15,23,42)';
            const highlight = (lastSpunNumber == i) ? 'ring-2 ring-white scale-105 z-10' : '';
            
            buttonsHtml += `
                <button onclick="recordSpin('${i}')" 
                        class="w-full flex items-center justify-center ${bgClass} text-white font-black py-2.5 sm:py-3 rounded-lg transition-all text-sm sm:text-base border-t border-white/20 shadow-[0_3px_0_${shadowColor}] active:shadow-[0_0px_0_${shadowColor}] active:translate-y-[3px] ${highlight}">
                    ${i}
                </button>
            `;
        }

        const zHighlight = (lastSpunNumber == 0) ? 'ring-2 ring-white scale-105 z-10' : '';
        const zeroHtml = `
            <button onclick="recordSpin('0')" 
                    class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 sm:py-3 mb-2 sm:mb-2.5 rounded-xl border-t border-white/20 shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-[4px] transition-all text-sm sm:text-base tracking-widest ${zHighlight}">
                0 (GREEN)
            </button>
        `;

        container.innerHTML = `
            <div class="flex flex-col w-full max-w-sm mx-auto h-[380px] overflow-y-auto custom-scrollbar pr-2">
                ${zeroHtml}
                <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
                    ${buttonsHtml}
                </div>
            </div>
        `;
    }
};

const updateTargetIndicator = (indicator, desc, targetType) => {
    indicator.className = "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base shadow-md shrink-0";
    
    if (targetType === "Player") { indicator.classList.add("bg-blue-600", "shadow-blue-900/40"); indicator.innerText = "P"; if(desc) desc.innerText = "on Player"; }
    else if (targetType === "Banker") { indicator.classList.add("bg-red-600", "shadow-red-900/40"); indicator.innerText = "B"; if(desc) desc.innerText = "on Banker"; }
    else if (targetType === "Red") { indicator.classList.add("bg-red-600", "shadow-red-900/40"); indicator.innerText = "R"; if(desc) desc.innerText = "on Red"; }
    else if (targetType === "Black") { indicator.classList.add("bg-slate-800", "shadow-slate-900/40"); indicator.innerText = "Bk"; if(desc) desc.innerText = "on Black"; }
    else if (targetType === "Even") { indicator.classList.add("bg-blue-600", "shadow-blue-900/40"); indicator.innerText = "E"; if(desc) desc.innerText = "on Even"; }
    else if (targetType === "Odd") { indicator.classList.add("bg-slate-800", "shadow-slate-900/40"); indicator.innerText = "O"; if(desc) desc.innerText = "on Odd"; }
    else if (targetType === "High") { indicator.classList.add("bg-red-600", "shadow-red-900/40"); indicator.innerText = "H"; if(desc) desc.innerText = "on High (19-36)"; }
    else if (targetType === "Low") { indicator.classList.add("bg-blue-600", "shadow-blue-900/40"); indicator.innerText = "L"; if(desc) desc.innerText = "on Low (1-18)"; }
    else { indicator.classList.add("bg-slate-600", "shadow-slate-900/40"); indicator.innerText = "W"; if(desc) desc.innerText = "Waiting for Result"; }
};

const updatePopupHUD = (state) => {
    const popup = document.getElementById('next_play_popup');
    if (!popup || state.status !== "ACTIVE" || popupDismissed) {
        if(popup) popup.classList.add('opacity-0', 'translate-y-12', 'pointer-events-none');
        return;
    }
    
    const popupCard = popup.querySelector('div');
    const indicator = document.getElementById('popup_color_indicator');
    const colorDesc = document.getElementById('popup_color_desc');
    const glowCircle = popup.querySelector('.bg-teal-500\\/10'); 
    
    let lastRealSpin = null;
    for(let i=0; i<state.history.length; i++) {
        if(state.history[i].outcome !== "Push" && state.history[i].outcome !== "Observed") {
            lastRealSpin = state.history[i];
            break;
        }
    }
    
    if (lastRealSpin) {
        if (lastRealSpin.outcome === "Win") {
            popupCard.className = "bg-emerald-950/95 border border-emerald-500/80 rounded-2xl p-3.5 shadow-2xl shadow-emerald-500/10 relative overflow-hidden backdrop-blur-md transition-all duration-300";
            if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-emerald-400/20 rounded-full blur-xl";
            document.querySelector('#next_play_popup svg').setAttribute('stroke', '#a7f3d0'); 
        } else {
            popupCard.className = "bg-rose-950/95 border border-rose-500/80 rounded-2xl p-3.5 shadow-2xl shadow-rose-500/10 relative overflow-hidden backdrop-blur-md transition-all duration-300";
            if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-rose-400/20 rounded-full blur-xl";
            document.querySelector('#next_play_popup svg').setAttribute('stroke', '#fecdd3'); 
        }
    } else {
        popupCard.className = "bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300";
        if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-teal-500/10 rounded-full blur-xl";
        document.querySelector('#next_play_popup svg').setAttribute('stroke', '#94a3b8'); 
    }
    
    updateTargetIndicator(indicator, colorDesc, state.next_color);
    document.getElementById('popup_bet_display').innerText = formatDisplay(state.next_bet, 'small', true);

    let streakStr = `<span class="text-slate-500">NONE</span>`;
    if (state.history && state.history.length > 0) {
        let latest = state.history[0];
        let w = latest.runWin || 0;
        let l = latest.runLoss || 0;
        let a = latest.runAlt || 0;

        if (a >= 3) {
            streakStr = `<span class="text-fuchsia-400">ALT x${a}</span>`;
        } else if (w >= 2) {
            streakStr = `<span class="text-amber-400">WIN x${w}</span>`;
        } else if (l >= 2) {
            streakStr = `<span class="text-rose-400">LOSS x${l}</span>`;
        } else if (w === 1) {
            streakStr = `<span class="text-emerald-400">WIN x1</span>`;
        } else if (l === 1) {
            streakStr = `<span class="text-rose-400">LOSS x1</span>`;
        } else if (a === 2) {
            streakStr = `<span class="text-fuchsia-400">ALT x2</span>`;
        }
    }

    const streakValEl = document.getElementById('popup_current_streak_val');
    if (streakValEl) streakValEl.innerHTML = streakStr;
    
    // TREND TRACKER IN POPUP (TINY 14px BLOCKS)
    const popupTrendContainer = document.getElementById('popup_trend_container');
    if (popupTrendContainer) {
        if (!state.history || state.history.length === 0) {
            popupTrendContainer.innerHTML = `<span class="text-[8px] text-slate-600 font-mono italic">None</span>`;
        } else {
            // Slice last 30, reverse so oldest is top-left
            let recentSpins = state.history.slice(0, 30).reverse();
            let trendHtml = '';
            
            recentSpins.forEach(s => {
                if (s.outcome === 'Win') {
                    trendHtml += `<div class="w-[14px] h-[14px] rounded-[2px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-[8px] font-bold shadow-sm leading-none shrink-0">W</div>`;
                } else if (s.outcome === 'Loss') {
                    trendHtml += `<div class="w-[14px] h-[14px] rounded-[2px] bg-rose-950/80 border border-rose-500/50 text-rose-400 flex items-center justify-center text-[8px] font-bold shadow-sm leading-none shrink-0">L</div>`;
                } else {
                    let ltr = s.outcome === 'Push' ? 'T' : 'O'; 
                    trendHtml += `<div class="w-[14px] h-[14px] rounded-[2px] bg-slate-800 border border-slate-600 text-slate-400 flex items-center justify-center text-[8px] font-bold shadow-sm leading-none shrink-0">${ltr}</div>`;
                }
            });
            
            popupTrendContainer.innerHTML = trendHtml;
        }
    }

    popup.classList.remove('opacity-0', 'translate-y-12', 'pointer-events-none');
};

const dismissPopup = () => {
    popupDismissed = true;
    const popup = document.getElementById('next_play_popup');
    if(popup) popup.classList.add('opacity-0', 'translate-y-12', 'pointer-events-none');
};

const updateUI = (state) => {
    currentState = state;

    let maxRunAlt = 0;
    if (state.history && state.history.length > 0) {
        let runWin = 0;
        let runLoss = 0;
        let runAlt = 0;
        let lastRealOutcome = null;
        
        for (let i = state.history.length - 1; i >= 0; i--) {
            let s = state.history[i];
            
            if (s.outcome === 'Win' || s.outcome === 'Loss') {
                if (lastRealOutcome === null) {
                    runAlt = 1;
                } else if (s.outcome !== lastRealOutcome) {
                    runAlt++;
                } else {
                    runAlt = 1;
                }
                lastRealOutcome = s.outcome;

                if (s.outcome === 'Win') {
                    runWin++; runLoss = 0;
                } else {
                    runLoss++; runWin = 0;
                }
            }
            s.runWin = runWin;
            s.runLoss = runLoss;
            s.runAlt = runAlt;
            
            if (runAlt > maxRunAlt) maxRunAlt = runAlt;
        }
    }

    const progSel = document.getElementById('progression_selector');
    if (progSel && state.progression) progSel.value = state.progression;
    const gameSel = document.getElementById('game_selector');
    if (gameSel && state.game_type) gameSel.value = state.game_type;

    document.getElementById('bankroll').innerHTML = formatDisplay(state.bankroll, 'large');
    const netPlElement = document.getElementById('net_pnl');
    netPlElement.innerHTML = (state.net_pnl >= 0 ? '+' : '') + formatDisplay(state.net_pnl, 'medium');

    if (state.net_pnl > 0) netPlElement.className = "text-lg sm:text-xl font-bold text-emerald-400 transition-colors";
    else if (state.net_pnl < 0) netPlElement.className = "text-lg sm:text-xl font-bold text-rose-500 transition-colors";
    else netPlElement.className = "text-lg sm:text-xl font-bold text-slate-400 transition-colors";

    let startBankroll = 75.0; 
    let maxBankroll = startBankroll;
    let minBankroll = startBankroll;

    if (state.history && state.history.length > 0) {
        const oldestSpin = state.history[state.history.length - 1];
        startBankroll = oldestSpin.bankroll - oldestSpin.pnl;
        
        maxBankroll = startBankroll;
        minBankroll = startBankroll;

        state.history.forEach(spin => {
            if (spin.bankroll > maxBankroll) maxBankroll = spin.bankroll;
            if (spin.bankroll < minBankroll) minBankroll = spin.bankroll;
        });
    }

    const startEl = document.getElementById('start_amount');
    const highEl = document.getElementById('highest_amount');
    const lowEl = document.getElementById('lowest_amount');
    
    if (startEl) startEl.innerHTML = formatDisplay(startBankroll, 'small', true);
    if (highEl) highEl.innerHTML = formatDisplay(maxBankroll, 'small', true); 
    if (lowEl) lowEl.innerHTML = formatDisplay(minBankroll, 'small', true);

    const lastSpunNumber = state.history.length > 0 ? state.history[0].spun_number : null;
    renderNumberGrid(lastSpunNumber, state);

    const undoBtn = document.getElementById('undo_btn');
    if (state.history.length === 0) {
        undoBtn.disabled = true;
        undoBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        undoBtn.disabled = false;
        undoBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    document.getElementById('spin_count').innerText = state.spin_count;
    document.getElementById('total_wins').innerText = state.total_wins;
    document.getElementById('total_losses').innerText = state.total_losses;
    
    document.getElementById('max_win_streak').innerText = state.max_win_streak;
    document.getElementById('max_loss_streak').innerText = state.max_loss_streak;
    const maxAltEl = document.getElementById('max_alt_streak');
    if (maxAltEl) maxAltEl.innerText = maxRunAlt;

    const alertBox = document.getElementById('status_alert');
    if (state.status === "ACTIVE") {
        document.getElementById('number_grid_container').classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
        alertBox.className = "hidden";
    } else {
        document.getElementById('number_grid_container').classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        alertBox.classList.remove('hidden');

        if (state.status === "TARGET_REACHED") {
            alertBox.className = "flex flex-col space-y-2 rounded-xl p-2 border border-emerald-500 bg-emerald-950/30 text-emerald-400 mb-3";
            document.getElementById('status_icon').innerText = "🎯";
            document.getElementById('status_title').innerText = "Target Reached!";
            document.getElementById('status_msg').innerText = "Congratulations! You hit your target. Session saved.";
        } else if (state.status === "STOP_LOSS_HIT") {
            alertBox.className = "flex flex-col space-y-2 rounded-xl p-2 border border-rose-500 bg-rose-950/30 text-rose-400 mb-3";
            document.getElementById('status_icon').innerText = "🛑";
            document.getElementById('status_title').innerText = "Stop Loss Hit";
            document.getElementById('status_msg').innerText = "You have dropped to your stop loss limit.";
        }
    }
    
    updatePopupHUD(state);

    const logBody = document.getElementById('log_body');
    if (state.history.length === 0) {
        logBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-slate-600">No spins recorded.</td></tr>`;
        return;
    }

    let logRows = "";
    // --- SLICE(0, 30): Restrict the Table to the last 30 spins ---
    let tableHistory = state.history.slice(0, 30);
    
    tableHistory.forEach(spin => {
        const pnlClass = spin.outcome === "Win" ? "text-emerald-400 font-semibold" : spin.outcome === "Loss" ? "text-rose-500" : "text-slate-400";
        
        let targetCell = "";
        if (spin.bet_on === "Player") targetCell = `<span class="text-blue-500 font-bold text-xs">🔵 P</span>`;
        else if (spin.bet_on === "Banker") targetCell = `<span class="text-red-500 font-bold text-xs">🔴 B</span>`;
        else if (spin.bet_on === "Red") targetCell = `<span class="text-red-500 font-bold text-xs">🔴 RED</span>`;
        else if (spin.bet_on === "Black") targetCell = `<span class="text-slate-300 font-bold text-xs">⚫ BLK</span>`;
        else if (spin.bet_on === "Even") targetCell = `<span class="text-blue-400 font-bold text-xs">🔵 EVN</span>`;
        else if (spin.bet_on === "Odd") targetCell = `<span class="text-slate-300 font-bold text-xs">⚪ ODD</span>`;
        else if (spin.bet_on === "High") targetCell = `<span class="text-amber-400 font-bold text-xs">🟡 HI</span>`;
        else if (spin.bet_on === "Low") targetCell = `<span class="text-sky-400 font-bold text-xs">🔵 LO</span>`;
        else if (spin.bet_on === "Wait") targetCell = `<span class="text-slate-400 font-bold text-xs">👀 W</span>`;
            
        let spunColorClass = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50"; 
        
        if (spin.spun_trait === 'Player') {
            spunColorClass = "text-blue-400 bg-blue-950/40 border-blue-900/50";
        } else if (spin.spun_trait === 'Banker') {
            spunColorClass = "text-red-400 bg-red-950/40 border-red-900/50";
        } else if (spin.spun_trait === 'Tie') {
            spunColorClass = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
        } else if (spin.spun_trait === 'Roulette') {
            if(spin.spun_color === 'Red') spunColorClass = "text-white bg-red-600 border-red-500";
            else if(spin.spun_color === 'Black') spunColorClass = "text-white bg-slate-800 border-slate-700";
            else spunColorClass = "text-white bg-emerald-600 border-emerald-500";
        }

        let displayColorText = spin.spun_color; 
        if (spin.spun_trait === 'Player') {
            let s = spin.spun_number.split('_').pop();
            displayColorText = `P [${s}]`;
        } else if (spin.spun_trait === 'Banker') {
            let s = spin.spun_number.split('_').pop();
            displayColorText = `B [${s}]`;
        } else if (spin.spun_trait === 'Tie') {
            displayColorText = `T`;
        } else if (spin.spun_trait === 'Roulette') {
            displayColorText = spin.spun_number;
        }

        const spunNumberCell = `<span class="font-black text-[10px] px-2 py-0.5 rounded border whitespace-nowrap ${spunColorClass}">${displayColorText}</span>`;
        
        let outcomeBadge = "";
        let rowBgClass = "hover:bg-slate-900/40"; 
        
        if (spin.outcome === "Win") {
            if (spin.runWin >= 5) {
                rowBgClass = "bg-amber-900/10 hover:bg-amber-900/30";
                outcomeBadge = `<span class="bg-amber-950/80 text-amber-400 border border-amber-500/80 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(251,191,36,0.3)]">🔥 WIN x${spin.runWin}</span>`;
            } else if (spin.runAlt >= 5) {
                rowBgClass = "bg-fuchsia-900/20 hover:bg-fuchsia-900/40";
                outcomeBadge = `<span class="bg-fuchsia-950/80 text-fuchsia-400 border border-fuchsia-500/80 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(192,38,211,0.3)]">🔀 ALT x${spin.runAlt}</span>`;
            } else {
                outcomeBadge = `<span class="bg-emerald-950/40 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono">Win</span>`;
            }
        } else if (spin.outcome === "Loss") {
            if (spin.runLoss >= 5) {
                rowBgClass = "bg-rose-950/40 hover:bg-rose-900/50";
                outcomeBadge = `<span class="bg-rose-900/80 text-rose-200 border border-rose-500 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(225,29,72,0.4)]">⚠️ LOSS x${spin.runLoss}</span>`;
            } else if (spin.runAlt >= 5) {
                rowBgClass = "bg-fuchsia-900/20 hover:bg-fuchsia-900/40";
                outcomeBadge = `<span class="bg-fuchsia-950/80 text-fuchsia-400 border border-fuchsia-500/80 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(192,38,211,0.3)]">🔀 ALT x${spin.runAlt}</span>`;
            } else {
                outcomeBadge = `<span class="bg-rose-950/40 text-rose-400 border border-rose-900/40 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono">Loss</span>`;
            }
        } else if (spin.outcome === "Observed") {
            outcomeBadge = `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono">Obsrv</span>`;
        } else {
            outcomeBadge = `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider font-mono">Push</span>`;
        }

        logRows += `
            <tr class="${rowBgClass} transition-colors">
                <td class="py-1.5 px-2 text-slate-400 font-mono font-medium text-[10px] sm:text-[11px]">${spin.spin}</td>
                <td class="py-1.5 px-2">${targetCell}</td>
                <td class="py-1.5 px-2 font-mono font-medium text-slate-200 text-[10px] sm:text-xs">${formatDisplay(spin.bet_amount, 'small', true)}</td>
                <td class="py-1.5 px-2 text-center">${spunNumberCell}</td>
                <td class="py-1.5 px-2 text-center">${outcomeBadge}</td>
                <td class="py-1.5 px-2 text-right font-mono ${pnlClass} text-[10px] sm:text-xs">${spin.pnl >= 0 ? '+' : ''}${formatDisplay(spin.pnl, 'small', true)}</td>
                <td class="py-1.5 px-2 text-right font-mono font-bold text-white text-[10px] sm:text-xs">${formatDisplay(spin.bankroll, 'small', true)}</td>
            </tr>
        `;
    });
    logBody.innerHTML = logRows;
};

const changeAppState = async () => {
    const newProg = document.getElementById('progression_selector').value;
    const newGame = document.getElementById('game_selector').value;
    
    if (currentState && currentState.progression === newProg && currentState.game_type === newGame) return;
    
    try {
        popupDismissed = false;
        const response = await fetch('/change_state', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ progression: newProg, game_type: newGame }) 
        });
        
        if (!response.ok) {
            alert("SERVER ERROR: The server rejected the request. Please make sure you RESTARTED your Python app.");
            if(currentState) {
                document.getElementById('progression_selector').value = currentState.progression;
                document.getElementById('game_selector').value = currentState.game_type;
            }
            return;
        }
        updateUI(await response.json());
    } catch (err) { 
        console.error("Error changing state:", err); 
        alert("NETWORK ERROR: Could not reach the server to recalculate.");
        if(currentState) {
            document.getElementById('progression_selector').value = currentState.progression;
            document.getElementById('game_selector').value = currentState.game_type;
        }
    }
};

const continueSession = async () => {
    try {
        const response = await fetch('/continue', { method: 'POST' });
        updateUI(await response.json());
    } catch (err) { console.error("Error continuing session:", err); }
};

const recordSpin = async (number) => {
    try {
        const response = await fetch('/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: number }) });
        updateUI(await response.json());
    } catch (err) { console.error("Error writing spin outcome:", err); }
};

const undoSpin = async () => {
    try {
        const response = await fetch('/undo', { method: 'POST' });
        updateUI(await response.json());
    } catch (err) { console.error("Error undoing spin:", err); }
};

const resetSession = async () => {
    if (confirm("Are you sure you want to reset the current session?")) {
        try {
            popupDismissed = false;
            const currentProg = document.getElementById('progression_selector').value;
            const currentGame = document.getElementById('game_selector').value;
            const response = await fetch('/reset', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progression: currentProg, game_type: currentGame })
            });
            updateUI(await response.json());
        } catch (err) { console.error("Error resetting session:", err); }
    }
};

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/state');
        updateUI(await response.json());
    } catch (err) { console.error("Error pulling initial state:", err); }
});

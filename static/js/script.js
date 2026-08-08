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
    
    // If hideUnit is true, we ONLY return the ₹ amount
    if (hideUnit) return primaryPart; 
    
    let secondarySizeClass = 'text-[10px] text-slate-500';
    if (size === 'large') { secondarySizeClass = 'text-lg text-slate-400 font-medium'; }
    else if (size === 'medium') { secondarySizeClass = 'text-base text-slate-400 font-medium'; }
    
    const secondaryPart = `<span class="${secondarySizeClass} ml-1">(${displayUnit} U)</span>`;
    return `${primaryPart}${secondaryPart}`;
};

const renderRiskRadar = (lossSequence) => {
    const container = document.getElementById('risk_radar_container');
    const stepsCount = document.getElementById('risk_steps_count');
    if (!container || !stepsCount) return;

    if (!lossSequence || lossSequence.length === 0) {
        stepsCount.innerText = '0 Spins';
        container.innerHTML = `<div class="text-[10px] text-slate-600 font-medium">Bankroll is safe.</div>`;
        return;
    }
    
    stepsCount.innerText = `${lossSequence.length} Spin${lossSequence.length > 1 ? 's' : ''}`;
    let riskHtml = '';
    
    lossSequence.forEach((step, idx) => {
        let badgeColor = 'bg-slate-700 text-white';
        let text = step.target || '?';
        
        riskHtml += `
            <div class="flex-shrink-0 flex items-center gap-1 bg-rose-950/40 border border-rose-900/50 text-rose-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm shadow-rose-900/20">
                <span class="${badgeColor} px-1 rounded-sm text-[8px] leading-tight">${text}</span>
                <span>-${formatDisplay(step.bet_amount, 'small', true)}</span>
            </div>`;
            
        if (idx < lossSequence.length - 1) {
            riskHtml += `<span class="text-slate-600 text-[10px] flex-shrink-0 font-bold">›</span>`;
        }
    });
    container.innerHTML = riskHtml;
};

const renderNumberGrid = (lastSpunNumber = null, state) => {
    const container = document.getElementById('number_grid_container');
    
    const pHighlight = (lastSpunNumber && lastSpunNumber.startsWith('p_')) ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.01] z-10' : '';
    const bHighlight = (lastSpunNumber && lastSpunNumber.startsWith('b_')) ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-[1.01] z-10' : '';
    const tHighlight = (lastSpunNumber === 'Tie') ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 scale-[1.02] z-10' : '';
    
    const genBtns = (prefix, nums, bgClass, shadowColor) => {
        return nums.map(n => `
            <button onclick="recordSpin('${prefix}_${n}')" 
                    class="w-full flex items-center justify-center ${bgClass} text-white font-black py-2.5 sm:py-3 rounded-xl transition-all text-sm sm:text-base border-t border-white/20 shadow-[0_3px_0_${shadowColor}] active:shadow-[0_0px_0_${shadowColor}] active:translate-y-[3px]">
                ${n}
            </button>
        `).join('');
    };

    const html = `
        <div class="flex flex-col gap-3 sm:gap-4 w-full">

            <div class="bg-red-900/30 border border-red-800/60 rounded-2xl p-3 sm:p-4 shadow-inner transition-all duration-300 flex flex-col gap-2 sm:gap-3 w-full ${bHighlight}">
                <div class="text-red-300 font-black text-[10px] sm:text-xs tracking-widest uppercase text-center drop-shadow-sm mb-1">BANKER</div>
                <div class="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
                    ${genBtns('b_low', [0,1,2,3,4,5], 'bg-red-800 hover:bg-red-700', 'rgb(69,10,10)')}
                </div>
                <div class="grid grid-cols-4 gap-1.5 sm:gap-2 w-full mt-1 sm:mt-1.5">
                    ${genBtns('b_high', [6,7,8,9], 'bg-red-600 hover:bg-red-500', 'rgb(153,27,27)')}
                </div>
            </div>

            <div class="bg-blue-900/30 border border-blue-800/60 rounded-2xl p-3 sm:p-4 shadow-inner transition-all duration-300 flex flex-col gap-2 sm:gap-3 w-full ${pHighlight}">
                <div class="text-blue-300 font-black text-[10px] sm:text-xs tracking-widest uppercase text-center drop-shadow-sm mb-1">PLAYER</div>
                <div class="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
                    ${genBtns('p_low', [0,1,2,3,4,5], 'bg-blue-800 hover:bg-blue-700', 'rgb(23,37,84)')}
                </div>
                <div class="grid grid-cols-4 gap-1.5 sm:gap-2 w-full mt-1 sm:mt-1.5">
                    ${genBtns('p_high', [6,7,8,9], 'bg-blue-600 hover:bg-blue-500', 'rgb(30,58,138)')}
                </div>
            </div>

            <div class="w-full mt-1">
                <button onclick="recordSpin('Tie')" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 sm:py-3.5 rounded-xl border-t border-white/20 shadow-[0_4px_0_rgb(4,120,87)] active:shadow-[0_0px_0_rgb(4,120,87)] active:translate-y-[4px] transition-all text-sm sm:text-base tracking-widest ${tHighlight}">TIE (PUSH)</button>
            </div>

        </div>
    `;
    
    container.innerHTML = html;
};

const renderSequenceTracker = (state) => {
    const container = document.getElementById('sequence_container');
    container.innerHTML = '';
    const pill = document.createElement('div');
    let badgeColor = 'bg-slate-600 text-white';
    let pillText = 'WAITING...';

    if (state.next_color === 'Player') { badgeColor = 'bg-blue-600 text-white'; pillText = 'TARGET: P'; }
    else if (state.next_color === 'Banker') { badgeColor = 'bg-red-600 text-white'; pillText = 'TARGET: B'; }
    
    pill.className = `w-auto px-1.5 h-4 sm:h-5 flex-shrink-0 rounded-full border flex items-center justify-center text-[8px] sm:text-[9px] font-bold tracking-wider transition-all duration-300 ${badgeColor} animate-intense-pulse z-20 opacity-100`;
    pill.innerText = pillText;
    container.appendChild(pill);
};

const updateTargetIndicator = (indicator, desc, targetType) => {
    if (targetType === "Player") { indicator.className = "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base bg-blue-600 shadow-md shadow-blue-900/40"; indicator.innerText = "P"; if(desc) desc.innerText = "on Player"; }
    else if (targetType === "Banker") { indicator.className = "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base bg-red-600 shadow-md shadow-red-900/40"; indicator.innerText = "B"; if(desc) desc.innerText = "on Banker"; }
    else if (targetType === "Wait") { indicator.className = "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-base bg-slate-600 shadow-md shadow-slate-900/40"; indicator.innerText = "W"; if(desc) desc.innerText = "Waiting for Result"; }
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
            popupCard.className = "bg-emerald-950/95 border border-emerald-500/80 rounded-2xl p-3 shadow-2xl shadow-emerald-500/10 relative overflow-hidden backdrop-blur-md transition-all duration-300";
            if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-emerald-400/20 rounded-full blur-xl";
            document.querySelector('#next_play_popup svg').setAttribute('stroke', '#a7f3d0'); 
        } else {
            popupCard.className = "bg-rose-950/95 border border-rose-500/80 rounded-2xl p-3 shadow-2xl shadow-rose-500/10 relative overflow-hidden backdrop-blur-md transition-all duration-300";
            if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-rose-400/20 rounded-full blur-xl";
            document.querySelector('#next_play_popup svg').setAttribute('stroke', '#fecdd3'); 
        }
    } else {
        popupCard.className = "bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300";
        if (glowCircle) glowCircle.className = "absolute -right-6 -top-6 w-20 h-24 bg-teal-500/10 rounded-full blur-xl";
        document.querySelector('#next_play_popup svg').setAttribute('stroke', '#94a3b8'); 
    }
    
    updateTargetIndicator(indicator, colorDesc, state.next_color);
    document.getElementById('popup_bet_display').innerText = formatDisplay(state.next_bet, 'small', true);

    const plColorClass = state.net_pnl > 0 ? 'text-emerald-400' : state.net_pnl < 0 ? 'text-rose-400' : 'text-slate-400';
    const plContainer = document.getElementById('popup_mini_pl');
    if (plContainer) plContainer.className = `text-[9px] uppercase font-semibold tracking-wider ${plColorClass}`;
    
    const plValEl = document.getElementById('popup_mini_pl_val');
    if (plValEl) plValEl.innerHTML = (state.net_pnl >= 0 ? '+' : '') + formatDisplay(state.net_pnl, 'small', true);

    const targetLabel = document.querySelector('#popup_target_inr span');
    if(targetLabel) targetLabel.innerText = "Target Unit:";
    
    const inrTargetEl = document.getElementById('popup_target_inr_val');
    if (state.next_color === "Wait") {
        if (inrTargetEl) inrTargetEl.innerHTML = `0 U`;
    } else {
        if (inrTargetEl) inrTargetEl.innerHTML = `${state.next_bet} U`;
    }

    const nextWinValEl = document.getElementById('popup_next_win_val');
    if (state.next_color === "Wait") {
        if (nextWinValEl) nextWinValEl.innerHTML = formatDisplay(state.bankroll, 'small', true);
    } else {
        let potentialProfit = state.next_bet;
        if(state.next_color === "Banker") potentialProfit = state.next_bet * 0.95;
        if (nextWinValEl) nextWinValEl.innerHTML = formatDisplay((state.bankroll + potentialProfit), 'small', true);
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

    const progSel = document.getElementById('progression_selector');
    if (progSel && state.progression) progSel.value = state.progression;
    
    const seqInput = document.getElementById('custom_sequence_input');
    const seqLabel = document.getElementById('seq_label');
    
    seqInput.classList.remove('w-16', 'w-24', 'w-32', 'text-slate-500', 'text-teal-400', 'text-amber-400');
    if (state.progression === 'labouchere') {
        seqLabel.innerText = "LAB";
        seqInput.value = state.labouchere_seq.join(' - ');
        seqInput.classList.add('w-32', 'text-teal-400');
    } else if (state.progression === '3step_ladder') {
        seqLabel.innerText = "LADR";
        seqInput.value = `LVL ${state.ladder_level} - ST ${state.ladder_step}`;
        seqInput.classList.add('w-28', 'text-amber-400');
    } else {
        seqLabel.innerText = "SEQ";
        seqInput.value = "DYNAMIC";
        seqInput.classList.add('w-16', 'text-slate-500');
    }

    document.getElementById('bankroll').innerHTML = formatDisplay(state.bankroll, 'large');
    const netPlElement = document.getElementById('net_pnl');
    netPlElement.innerHTML = (state.net_pnl >= 0 ? '+' : '') + formatDisplay(state.net_pnl, 'medium');

    if (state.net_pnl > 0) netPlElement.className = "text-lg sm:text-xl font-bold text-emerald-400 transition-colors";
    else if (state.net_pnl < 0) netPlElement.className = "text-lg sm:text-xl font-bold text-rose-500 transition-colors";
    else netPlElement.className = "text-lg sm:text-xl font-bold text-slate-400 transition-colors";

    // --- Calculate Start, High, and Low amounts ---
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
    // ------------------------------------------------

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

    renderSequenceTracker(state);

    const gridContainer = document.getElementById('number_grid_container');
    const alertBox = document.getElementById('status_alert');
    const riskRadarSection = document.getElementById('risk_radar_section');

    if (state.status === "ACTIVE") {
        renderRiskRadar(state.predicted_loss_sequence);
        gridContainer.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
        riskRadarSection.classList.remove('hidden');
        alertBox.className = "hidden";
    } else {
        gridContainer.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
        riskRadarSection.classList.add('hidden');
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
                    runWin++;
                    runLoss = 0;
                } else {
                    runLoss++;
                    runWin = 0;
                }
            }
            
            s.runWin = runWin;
            s.runLoss = runLoss;
            s.runAlt = runAlt;
        }
    }

    let logRows = "";
    state.history.forEach(spin => {
        const pnlClass = spin.outcome === "Win" ? "text-emerald-400 font-semibold" : spin.outcome === "Loss" ? "text-rose-500" : "text-slate-400";
        
        let targetCell = "";
        if (spin.bet_on === "Player") targetCell = `<span class="text-blue-500 font-bold text-xs">🔵 P</span>`;
        else if (spin.bet_on === "Banker") targetCell = `<span class="text-red-500 font-bold text-xs">🔴 B</span>`;
        else if (spin.bet_on === "Wait") targetCell = `<span class="text-slate-400 font-bold text-xs">👀 W</span>`;
            
        let spunColorClass = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50"; 
        
        if (spin.spun_trait === 'Player') {
            spunColorClass = "text-blue-400 bg-blue-950/40 border-blue-900/50";
        } else if (spin.spun_trait === 'Banker') {
            spunColorClass = "text-red-400 bg-red-950/40 border-red-900/50";
        } else if (spin.spun_trait === 'Tie') {
            spunColorClass = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
        }

        let exactScore = "";
        if (typeof spin.spun_number === 'string' && spin.spun_number.includes('_')) {
            exactScore = spin.spun_number.split('_').pop();
        }

        let displayColorText = spin.spun_color; 
        if (spin.spun_trait === 'Player') displayColorText = `P ${exactScore ? '['+exactScore+']' : ''}`;
        else if (spin.spun_trait === 'Banker') displayColorText = `B ${exactScore ? '['+exactScore+']' : ''}`;
        else if (spin.spun_trait === 'Tie') displayColorText = `T`;

        const spunNumberCell = `<span class="font-black text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${spunColorClass}">${displayColorText}</span>`;
        
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

const changeProgression = async () => {
    const newProg = document.getElementById('progression_selector').value;
    if (currentState && currentState.progression === newProg) return;
    
    try {
        popupDismissed = false;
        const response = await fetch('/change_progression', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ progression: newProg }) 
        });
        
        if (!response.ok) {
            alert("SERVER ERROR: The server rejected the request. Please make sure you RESTARTED your Python app.");
            if(currentState) document.getElementById('progression_selector').value = currentState.progression;
            return;
        }
        updateUI(await response.json());
    } catch (err) { 
        console.error("Error changing progression:", err); 
        alert("NETWORK ERROR: Could not reach the server to recalculate.");
        if(currentState) document.getElementById('progression_selector').value = currentState.progression;
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
            const response = await fetch('/reset', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progression: currentProg })
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

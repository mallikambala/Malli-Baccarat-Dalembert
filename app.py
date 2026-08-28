from flask import Flask, render_template, jsonify, request

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.secret_key = "mallis_baccarat_super_secret_key"

class CasinoTracker:
    def __init__(self, start_bankroll=75, base_bet=1, progression="3step_ladder", game_type="baccarat"):
        self.start_bankroll = float(start_bankroll)
        self.bankroll = float(start_bankroll)
        self.base_bet = base_bet
        self.current_bet = base_bet
        
        self.progression = progression
        self.game_type = game_type
        
        # 3-Step Ladder State (19 Levels)
        self.ladder_bases = list((0.2, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8))
        self.ladder_level = 0
        self.ladder_step = 1

        # Star 2.0 State (Parlay System)
        self.star_seq = list((1, 1, 1, 2, 2, 5, 5, 10, 10, 20, 20))
        self.star_step_idx = 0
        self.is_parlay = False
        self.star_parlay_amount = 0

        # Rafael's 6 State
        self.L2R = ['Low', 'Even', 'Red', 'Black', 'Odd', 'High']
        self.R2L = ['High', 'Odd', 'Black', 'Red', 'Even', 'Low']
        self.rafael_dir = 'R2L' 
        self.rafael_idx = 0
        
        self.current_num_target = "Wait"
        self.ignore_limits = False
        self.target_bankroll = 85.0      
        self.stop_loss_bankroll = 25.0   
        self.spin_count = 0
        self.history = list()
        
        self.total_wins = 0
        self.total_losses = 0
        self.current_win_streak = 0
        self.current_loss_streak = 0
        self.max_win_streak = 0
        self.max_loss_streak = 0

    def get_roulette_properties(self, val):
        val = int(val)
        reds = list((1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36))
        if val == 0:
            return {'color': 'Green', 'even_odd': 'Zero', 'high_low': 'Zero'}
        return {
            'color': 'Red' if val in reds else 'Black',
            'even_odd': 'Even' if val % 2 == 0 else 'Odd',
            'high_low': 'Low' if val <= 18 else 'High'
        }

    def calculate_bet_amount(self):
        if self.progression == "3step_ladder":
            lvl = min(self.ladder_level, 18)
            base = self.base_bet * self.ladder_bases[lvl]
            if self.ladder_step == 1: return base
            elif self.ladder_step == 2: return 2 * base
            elif self.ladder_step == 3:
                return 3 * base if lvl < 15 else 4 * base
                
        elif self.progression == "star2":
            if self.is_parlay:
                return self.star_parlay_amount
            idx = min(self.star_step_idx, len(self.star_seq) - 1)
            return self.base_bet * self.star_seq[idx]
                
        return self.current_bet

    def get_next_bet(self):
        if self.get_status() != "ACTIVE":
            return "Wait", 0
            
        if self.game_type == "baccarat":
            if self.current_num_target == "Wait": return "Wait", 0
            return self.current_num_target, round(self.calculate_bet_amount(), 2)
            
        elif self.game_type == "roulette":
            arr = self.L2R if self.rafael_dir == 'L2R' else self.R2L
            target = arr[self.rafael_idx]
            return target, round(self.calculate_bet_amount(), 2)

    def apply_progression_win(self, bet_amount, pnl):
        if self.progression == "dalembert":
            self.current_bet = max(self.base_bet, self.current_bet - self.base_bet)
        elif self.progression == "3step_ladder":
            if self.ladder_step == 3:
                self.ladder_level = 0
                self.ladder_step = 1
            else:
                self.ladder_step += 1
        elif self.progression == "star2":
            if self.is_parlay:
                self.is_parlay = False
                self.star_step_idx = 0
            else:
                self.is_parlay = True
                self.star_parlay_amount = bet_amount + pnl

    def apply_progression_loss(self, bet_amount):
        if self.progression == "dalembert":
            self.current_bet += self.base_bet
        elif self.progression == "3step_ladder":
            if self.ladder_level < 15 and self.ladder_step == 3:
                self.ladder_step = 1
            else:
                self.ladder_level += 1
                self.ladder_step = 1
                if self.ladder_level > 18: self.ladder_level = 0
        elif self.progression == "star2":
            if self.is_parlay:
                self.is_parlay = False
            self.star_step_idx += 1

    def record_outcome(self, spun_value):
        if self.is_session_over(): return self.get_state()

        self.spin_count += 1
        bet_target, bet_amount = self.get_next_bet()
        
        is_win = False
        is_push = False
        val = str(spun_value).lower()
        
        if self.game_type == "baccarat":
            if val == 'tie':
                spun_trait, spun_color, is_push = 'Tie', 'Tie', True
            elif val.startswith('p'):
                spun_trait = 'Player'
                spun_color = 'Player (6-9)' if val.startswith('p_high') else 'Player (0-5)' if val.startswith('p_low') else 'Player'
            elif val.startswith('b'):
                spun_trait = 'Banker'
                spun_color = 'Banker (6-9)' if val.startswith('b_high') else 'Banker (0-5)' if val.startswith('b_low') else 'Banker'
            
            is_win = (bet_target == spun_trait)
            
            if not is_push:
                if val.startswith('p_high'): self.current_num_target = 'Player'
                elif val.startswith('b_high'): self.current_num_target = 'Banker'
                elif val.startswith('p_low'): self.current_num_target = 'Banker'
                elif val.startswith('b_low'): self.current_num_target = 'Player'
                
        elif self.game_type == "roulette":
            props = self.get_roulette_properties(val)
            spun_trait = 'Roulette'
            spun_color = props['color']
            
            if val == '0':
                is_win = False
            else:
                if bet_target in ['Red', 'Black']: is_win = (bet_target == props['color'])
                elif bet_target in ['Even', 'Odd']: is_win = (bet_target == props['even_odd'])
                elif bet_target in ['High', 'Low']: is_win = (bet_target == props['high_low'])

        is_observation = (bet_target == "Wait")
        
        if is_observation:
            pnl, outcome_str = 0.0, "Observed"
        elif is_push:
            pnl, outcome_str = 0.0, "Push"
        elif is_win:
            pnl = bet_amount * 0.95 if (self.game_type == 'baccarat' and bet_target == 'Banker') else float(bet_amount)
            self.bankroll += pnl
            outcome_str = "Win"
            self.apply_progression_win(bet_amount, pnl)
            
            if self.game_type == "roulette":
                self.rafael_dir = 'L2R' if self.rafael_dir == 'R2L' else 'R2L'
                self.rafael_idx = 0
            
            self.total_wins += 1
            self.current_win_streak += 1
            self.current_loss_streak = 0
            if self.current_win_streak > self.max_win_streak: self.max_win_streak = self.current_win_streak
        else:
            pnl = float(-bet_amount)
            self.bankroll += pnl
            outcome_str = "Loss"
            self.apply_progression_loss(bet_amount)
            
            if self.game_type == "roulette":
                self.rafael_idx = (self.rafael_idx + 1) % 6
                    
            self.total_losses += 1
            self.current_loss_streak += 1
            self.current_win_streak = 0
            if self.current_loss_streak > self.max_loss_streak: self.max_loss_streak = self.current_loss_streak

        self.history.append({
            "spin": self.spin_count, "spun_number": spun_value, "spun_color": spun_color, "spun_trait": spun_trait, 
            "bet_on": bet_target, "bet_amount": bet_amount, "outcome": outcome_str, 
            "pnl": round(pnl, 2), "bankroll": round(self.bankroll, 2)
        })
        return self.get_state()
        
    def undo_last_spin(self):
        if not self.history: return self.get_state()
        previous_spins = list(spin['spun_number'] for spin in self.history[:-1])
        was_ignored = self.ignore_limits
        current_prog = self.progression
        current_game = self.game_type
        
        self.__init__(self.start_bankroll, self.base_bet, current_prog, current_game)
        self.ignore_limits = was_ignored
        for num in previous_spins: self.record_outcome(num)
        return self.get_state()

    def change_state(self, new_progression=None, new_game=None):
        previous_spins = list(spin['spun_number'] for spin in self.history)
        was_ignored = self.ignore_limits
        
        target_prog = new_progression if new_progression else self.progression
        target_game = new_game if new_game else self.game_type
        
        self.__init__(self.start_bankroll, self.base_bet, target_prog, target_game)
        self.ignore_limits = True
        for num in previous_spins: self.record_outcome(num)
        self.ignore_limits = was_ignored
        return self.get_state()

    def is_session_over(self):
        if self.ignore_limits: return False
        return self.bankroll >= self.target_bankroll or self.bankroll <= self.stop_loss_bankroll

    def get_status(self):
        if self.ignore_limits: return "ACTIVE"
        if self.bankroll >= self.target_bankroll: return "TARGET_REACHED"
        elif self.bankroll <= self.stop_loss_bankroll: return "STOP_LOSS_HIT"
        return "ACTIVE"

    def get_predicted_loss_sequence(self):
        return list()

    def reset(self, progression=None, game_type=None):
        target_prog = progression if progression else self.progression
        target_game = game_type if game_type else self.game_type
        self.__init__(self.start_bankroll, self.base_bet, target_prog, target_game)

    def get_state(self):
        next_target, next_bet = self.get_next_bet()
        return {
            "bankroll": round(self.bankroll, 2), "net_pnl": round(self.bankroll - self.start_bankroll, 2),
            "spin_count": self.spin_count, "game_type": self.game_type,
            "progression": self.progression,
            "ladder_level": self.ladder_level + 1, "ladder_step": self.ladder_step,
            "star_step_idx": self.star_step_idx, "is_parlay": self.is_parlay,
            "rafael_dir": self.rafael_dir, "rafael_idx": self.rafael_idx,
            "next_color": next_target, "next_bet": next_bet,
            "status": self.get_status(), "history": self.history[::-1],
            "total_wins": self.total_wins, "total_losses": self.total_losses,
            "max_win_streak": self.max_win_streak, "max_loss_streak": self.max_loss_streak,
            "predicted_loss_sequence": list()
        }

tracker = CasinoTracker()

@app.route('/')
def home(): return render_template('index.html')

@app.route('/state', methods=['GET'])
def get_state(): return jsonify(tracker.get_state())

@app.route('/record', methods=['POST'])
def record():
    data = request.get_json(force=True, silent=True) or {}
    spun_value = data.get('number')
    if spun_value is not None:
        return jsonify(tracker.record_outcome(spun_value))
    return jsonify(tracker.get_state()), 400

@app.route('/undo', methods=['POST'])
def undo(): return jsonify(tracker.undo_last_spin())

@app.route('/continue', methods=['POST'])
def continue_session():
    tracker.ignore_limits = True
    return jsonify(tracker.get_state())

@app.route('/change_state', methods=['POST'])
def change_state_route():
    data = request.get_json(force=True, silent=True) or {}
    tracker.change_state(new_progression=data.get('progression'), new_game=data.get('game_type'))
    return jsonify(tracker.get_state())

@app.route('/reset', methods=['POST'])
def reset():
    data = request.get_json(force=True, silent=True) or {}
    tracker.reset(progression=data.get('progression'), game_type=data.get('game_type'))
    return jsonify(tracker.get_state())

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)

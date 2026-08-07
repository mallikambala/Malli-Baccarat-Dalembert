from flask import Flask, render_template, jsonify, request

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = "mallis_baccarat_super_secret_key"

class BaccaratTracker:
    def __init__(self, start_bankroll=75, base_bet=1):
        self.start_bankroll = float(start_bankroll)
        self.bankroll = float(start_bankroll)
        self.base_bet = base_bet
        self.current_bet = base_bet
        
        self.current_num_target = "Wait" # First hand is an observation spin
        self.ignore_limits = False
        
        self.target_bankroll = 85.0      
        self.stop_loss_bankroll = 25.0   
        self.spin_count = 0
        self.history = []
        
        self.total_wins = 0
        self.total_losses = 0
        self.current_win_streak = 0
        self.current_loss_streak = 0
        self.max_win_streak = 0
        self.max_loss_streak = 0

    def get_next_bet(self):
        if self.get_status() != "ACTIVE":
            return None, 0
        if self.current_num_target == "Wait":
            return "Wait", 0
        return self.current_num_target, self.current_bet

    def get_predicted_loss_sequence(self):
        if self.get_status() != "ACTIVE": return []
        if self.current_num_target == "Wait": return []
            
        sim_bankroll = self.bankroll
        sim_bet = self.current_bet
        sim_base = self.base_bet
        loss_sequence = []
        effective_stop_loss = 0 if self.ignore_limits else self.stop_loss_bankroll

        while sim_bankroll > effective_stop_loss:
            loss_sequence.append({ "bet_amount": sim_bet, "target": "?" })
            sim_bankroll -= sim_bet
            sim_bet += sim_base
            if len(loss_sequence) > 100: break
                
        return loss_sequence

    def record_outcome(self, spun_value):
        if self.is_session_over(): return self.get_state()

        self.spin_count += 1
        bet_target, bet_amount = self.get_next_bet()
        
        spun_color = "Green"
        spun_trait = "Zero"
        is_push = False
        val = str(spun_value).lower()
        
        if val == 'tie':
            spun_trait, spun_color, is_push = 'Tie', 'Tie', True
        elif val.startswith('p'):
            spun_trait = 'Player'
            spun_color = 'Player (6-9)' if val.startswith('p_high') else 'Player (0-5)' if val.startswith('p_low') else 'Player'
        elif val.startswith('b'):
            spun_trait = 'Banker'
            spun_color = 'Banker (6-9)' if val.startswith('b_high') else 'Banker (0-5)' if val.startswith('b_low') else 'Banker'

        is_win = (bet_target == spun_trait)
        is_observation = (bet_target == "Wait")
        
        if is_observation:
            pnl, outcome_str = 0.0, "Observed"
        elif is_push:
            pnl, outcome_str = 0.0, "Push"
        elif is_win:
            pnl = bet_amount * 0.95 if bet_target == 'Banker' else float(bet_amount)
            self.bankroll += pnl
            outcome_str = "Win"
            self.current_bet = max(self.base_bet, self.current_bet - self.base_bet)
            self.total_wins += 1
            self.current_win_streak += 1
            self.current_loss_streak = 0
            if self.current_win_streak > self.max_win_streak: self.max_win_streak = self.current_win_streak
        else:
            pnl = float(-bet_amount)
            self.bankroll += pnl
            outcome_str = "Loss"
            self.current_bet += self.base_bet
            self.total_losses += 1
            self.current_loss_streak += 1
            self.current_win_streak = 0
            if self.current_loss_streak > self.max_loss_streak: self.max_loss_streak = self.current_loss_streak

        # Target mapping using startswith allows passing exact scores like p_high_8
        if not is_push:
            if val.startswith('p_high'): self.current_num_target = 'Player'
            elif val.startswith('b_high'): self.current_num_target = 'Banker'
            elif val.startswith('p_low'): self.current_num_target = 'Banker'
            elif val.startswith('b_low'): self.current_num_target = 'Player'

        self.history.append({
            "spin": self.spin_count, "spun_number": spun_value, "spun_color": spun_color, "spun_trait": spun_trait, 
            "bet_on": bet_target, "bet_amount": bet_amount, "outcome": outcome_str, 
            "pnl": round(pnl, 2), "bankroll": round(self.bankroll, 2)
        })
        return self.get_state()
        
    def undo_last_spin(self):
        if not self.history: return self.get_state()
        previous_spins = [spin['spun_number'] for spin in self.history[:-1]]
        was_ignored = self.ignore_limits
        self.__init__(self.start_bankroll, self.base_bet)
        self.ignore_limits = was_ignored
        for num in previous_spins: self.record_outcome(num)
        return self.get_state()

    def is_session_over(self):
        if self.ignore_limits: return False
        return self.bankroll >= self.target_bankroll or self.bankroll <= self.stop_loss_bankroll

    def get_status(self):
        if self.ignore_limits: return "ACTIVE"
        if self.bankroll >= self.target_bankroll: return "TARGET_REACHED"
        elif self.bankroll <= self.stop_loss_bankroll: return "STOP_LOSS_HIT"
        return "ACTIVE"

    def reset(self):
        self.__init__(self.start_bankroll, self.base_bet)

    def get_state(self):
        next_target, next_bet = self.get_next_bet()
        return {
            "bankroll": round(self.bankroll, 2), "net_pnl": round(self.bankroll - self.start_bankroll, 2),
            "spin_count": self.spin_count, "game_type": "baccarat", "strategy": "baccarat_num",
            "next_color": next_target, "next_bet": next_bet,
            "status": self.get_status(), "history": self.history[::-1],
            "total_wins": self.total_wins, "total_losses": self.total_losses,
            "max_win_streak": self.max_win_streak, "max_loss_streak": self.max_loss_streak,
            "predicted_loss_sequence": self.get_predicted_loss_sequence()
        }

tracker = BaccaratTracker()

@app.route('/')
def home(): return render_template('index.html')

@app.route('/state', methods=['GET'])
def get_state(): return jsonify(tracker.get_state())

@app.route('/record', methods=['POST'])
def record():
    data = request.get_json() or {}
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

@app.route('/reset', methods=['POST'])
def reset():
    tracker.reset()
    return jsonify(tracker.get_state())

if __name__ == '__main__':
    app.run(debug=True, port=5000)

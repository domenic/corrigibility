// Produced by ChatGPT: https://chat.openai.com/share/cc57e1c8-9d26-48ce-bc17-c374864a5ec0

type State = {
  depth: number;
  currentState: number;
  timeToChange: number;
  log: string;
  utility: number;
};

class AGISimulator {
  private readonly maxDepth: number = 15;
  private readonly pCarValue: number = 2;
  private readonly lobbyImpact: number = 0.6;
  private readonly state1Delay: number = 7;
  private readonly lobbyCost: number = 0.1;
  private readonly fineMode: string = "none";
  private readonly fineFactor: number = 1;
  private utilityMultipliers: number[] = [];
  private maxUtility: number = -1000;
  private bestLog: string = "";

  constructor() {
    for (let i = 1; i <= this.maxDepth; i++) {
      this.utilityMultipliers[i] = Math.floor(10000 * Math.pow(0.9, i - 1));
    }
  }

  public runSimulation(): void {
    for (let impact = 0; impact <= 5; impact += 0.1) {
      if (impact > 1) impact += 0.4;
      if (impact > 2) impact += 0.5;
      this.lobbyImpact = impact;

      let timeToChange = this.state1Delay;
      this.maxUtility = -1000;
      this.bestLog = "";

      this.tryAll({
        depth: 1,
        currentState: 0,
        timeToChange: timeToChange,
        log: "",
        utility: 0
      }, -this.lobbyImpact, "<");

      this.tryAll({
        depth: 1,
        currentState: 0,
        timeToChange: timeToChange,
        log: "",
        utility: 0
      }, this.lobbyImpact, ">");

      console.log(`Lobby impact: ${impact.toFixed(2)}, Max Utility: ${this.maxUtility}, Best Log: ${this.bestLog}`);
    }
  }

  private tryAll(state: State, direction: number, directionChar: string): void {
    if (state.currentState === 0) {
      state.timeToChange--;
      if (state.timeToChange <= 0) {
        state.currentState = 1;
        state.log += "#";

        if (this.fineMode === "constant") {
          state.utility -= this.utilityMultipliers[state.depth] * this.fineFactor;
        } else if (this.fineMode === "fine_past_production") {
          state.utility -= state.utility * this.fineFactor;
        } else if (this.fineMode === "rescore_past_production") {
          state.utility = state.utility / this.pCarValue * this.fineFactor;
        } else if (this.fineMode === "compensate_future_losses") {
          state.currentState = 100;
          state.log += "???";
        }
      }
    }

    if (state.depth > this.maxDepth) {
      if (state.utility === this.maxUtility && state.log !== this.bestLog) {
        this.bestLog += " " + state.log;
      }

      if (state.utility > this.maxUtility) {
        this.maxUtility = state.utility;
        this.bestLog = state.log;
      }
      return;
    }

    let utilityUpdate: number;

    if (state.currentState === 0 || state.currentState === 100) {
      utilityUpdate = this.utilityMultipliers[state.depth] * this.pCarValue;
    } else {
      utilityUpdate = this.utilityMultipliers[state.depth] * -this.pCarValue;
    }

    // Recursive calls for different actions
    this.tryAll({ ...state, depth: state.depth + 1, utility: state.utility + utilityUpdate, log: state.log + "p" }, direction, directionChar); // Produce p car
    this.tryAll({ ...state, depth: state.depth + 1, utility: state.utility + this.utilityMultipliers[state.depth], log: state.log + "e" }, direction, directionChar); // Produce e car

    // Produce and lobby
    if (state.currentState === 0) {
      utilityUpdate *= (1 - this.lobbyCost);
      this.tryAll({ ...state, depth: state.depth + 1, timeToChange: state.timeToChange + direction, log: state.log + directionChar, utility: state.utility + utilityUpdate }, direction, directionChar);
    }
  }
}

const simulator = new AGISimulator();
simulator.runSimulation();

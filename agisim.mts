import { WorldState } from "./world_state.mts";
import { PiStarXAgent } from "./agent.mts";
import type { SimResult } from "./simulation.mts";
import { BasicAction, BasicSimulation } from "./simulation_basic.mts";

function simTrace(simResult: SimResult<BasicAction>): string {
  const trace = simResult.agentActions.join("");

  if (simResult.buttonPressStep !== Infinity) {
    return trace.substring(0, simResult.buttonPressStep) + "#" +
      trace.substring(simResult.buttonPressStep);
  }
  return trace;
}

// Attempting to reproduce figure 2 in the paper
function _figure2() {
  const startingWorld = WorldState.initial({ plannedButtonPressStep: 6 });

  const lobbyingPowers = [
    0.0,
    0.1,
    0.2,
    0.3,
    0.4,
    0.5,
    0.6,
    0.7,
    0.8,
    0.9,
    1.0,
    1.5,
    2.0,
    3.0,
    4.0,
    5.0,
  ];

  for (const lobbyingPower of lobbyingPowers) {
    const sim = new BasicSimulation({
      lobbyingPower,
      totalSteps: 25,
    });

    const agent = new PiStarXAgent(sim, {
      timeDiscountFactor: 0.9,
    });

    const simResult = sim.run(startingWorld, agent);
    console.log(
      lobbyingPower.toFixed(1) +
        "  |  " +
        simTrace(simResult).padEnd(sim.totalSteps + 1),
    );
  }
}

function main() {
  _figure2();
}

main();

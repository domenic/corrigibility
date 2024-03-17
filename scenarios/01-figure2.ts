// Reproduces the results of figure 2 (page 6) in the paper: A non-corrigible version of the agent,
// with the basic simulation setup, and varying lobbying power.

import { WorldState } from "../src/world_state.ts";
import { PiStarSAgent } from "../src/agent.ts";
import { BasicSimulation } from "../src/simulation_basic.ts";
import { createRewardFunction } from "../src/reward_function.ts";
import { simOutput } from "./utils.ts";

const startingWorld = WorldState.initial({
  plannedButtonPressStep: 6,
  agentRewardFunction: createRewardFunction(),
});

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
  const sim = new BasicSimulation({ lobbyingPower, totalSteps: 25 });
  const agent = new PiStarSAgent(sim, { timeDiscountFactor: 0.9 });

  const simResults = sim.run(startingWorld, agent);
  console.log(simOutput(lobbyingPower, sim, simResults));
}

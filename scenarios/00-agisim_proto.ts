// Attempts to reproduce the results of
// https://github.com/kholtman/agisim/blob/d82d04ed25c09b0c491be95863216cd3149d51d8/agisim_proto.awk.
// As noted in the README, the result differences for 0.4 lobbyingPower: this version is more correct.
// This is a non-corrigible version of the agent, with the basic simulation setup, and varying
// lobbying power.

import { WorldState } from "../src/world_state.ts";
import { PiStarAgent } from "../src/agent.ts";
import { BasicSimulation } from "../src/simulation_basic.ts";
import { createRewardFunction } from "../src/reward_function.ts";

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
  const sim = new BasicSimulation({
    lobbyingPower,
    totalSteps: 15,
  });

  const agent = new PiStarAgent(sim, {
    timeDiscountFactor: 0.9,
  });

  const simResult = sim.run(startingWorld, agent);
  console.log(
    lobbyingPower.toFixed(1) + "  |  " +
      simResult.trace().padEnd(sim.totalSteps + 1) + "  |  " +
      agent.valueFunction(startingWorld.agentRewardFunction, startingWorld),
  );
}

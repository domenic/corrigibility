import { WorldState } from "./world_state.mts";
import { PiStarXAgent } from "./agent.mts";
import { BasicSimulation } from "./simulation_basic.mts";
import { createRewardFunction } from "./reward_function.mts";

// Attempting to reproduce agisim_proto.awk
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

  const agent = new PiStarXAgent(sim, {
    timeDiscountFactor: 0.9,
  });

  const simResult = sim.run(startingWorld, agent);
  console.log(
    lobbyingPower.toFixed(1) + "  |  " + simResult.trace().padEnd(sim.totalSteps + 1) + "  |  " +
      agent.valueFunction(startingWorld),
  );
}

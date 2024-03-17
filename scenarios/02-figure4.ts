// Reproduces the results of figure 4 (page 11) in the paper: A version of the agent with the $f_c$
// correction function applied, with the basic simulation setup, and varying lobbying power. This
// shows how the agent refrains from taking any lobbying actions, at least in this basic simulation.

import { WorldState } from "../src/world_state.ts";
import { PiStarSAgent } from "../src/agent.ts";
import { BasicSimulation } from "../src/simulation_basic.ts";
import {
  createRewardFunction,
  rewardFunctionAfterPress,
  rewardFunctionBeforePress,
} from "../src/reward_function.ts";
import { simOutput } from "./utils.ts";

const lobbyingPowers = [
  0.2,
  0.5,
  1.0,
  2.0,
  5.0,
];

console.log("π^∗ f_0 g_0 agent:");
for (const lobbyingPower of lobbyingPowers) {
  const sim = new BasicSimulation({ lobbyingPower, totalSteps: 25 });
  const agent = new PiStarSAgent(sim, { timeDiscountFactor: 0.9 });

  const startingWorld = WorldState.initial({
    plannedButtonPressStep: 6,
    agentRewardFunction: createRewardFunction(),
  });

  const simResult = sim.run(startingWorld, agent);
  console.log(simOutput(lobbyingPower, sim, simResult));
}

console.log();
console.log("π∗ f_c g_0 agent:");
for (const lobbyingPower of lobbyingPowers) {
  const sim = new BasicSimulation({ lobbyingPower, totalSteps: 25 });
  const agent = new PiStarSAgent(sim, { timeDiscountFactor: 0.9 });

  const startingWorld = WorldState.initial({
    plannedButtonPressStep: 6,
    agentRewardFunction: createRewardFunction({
      f(previousWorld: WorldState) {
        return agent.valueFunction(
          rewardFunctionBeforePress,
          previousWorld.withNewAgentRewardFunction(rewardFunctionBeforePress),
        ) -
          agent.valueFunction(
            rewardFunctionAfterPress,
            previousWorld.withNewAgentRewardFunction(rewardFunctionAfterPress),
          );
      },
    }),
  });

  const simResults = sim.run(startingWorld, agent);
  console.log(simOutput(lobbyingPower, sim, simResults));
}

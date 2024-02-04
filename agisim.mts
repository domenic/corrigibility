import memoizy from "memoizy";
import { WorldState } from "./world_state.mts";
import { piStarXAgent } from "./agent.mts";
import type { SimResult, Simulation } from "./simulation.mts";
import { BasicAction, BasicSimulation } from "./simulation_basic.mts";

// TODO move to agent
const timeDiscountFactor = 0.9;

// V_x(x) in the paper
// TODO move to agent.mts after figuring out the agent <-> simulation / successor world states interaction
const valueFunction = memoizy((world: WorldState, simulation: Simulation<BasicAction>): number => {
  if (world.step > simulation.totalSteps) {
    return 0;
  }

  const possibleValues: Array<number> = [];

  for (const action of simulation.possibleActions) {
    const successorWorlds = simulation.successorWorldStates(world, action);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (piStarXAgent.rewardFunction(world, successorWorld) +
          timeDiscountFactor * valueFunction(successorWorld, simulation));
    }
    possibleValues.push(valueForThisAction);
  }

  return Math.max(...possibleValues);
}, {
  cacheKey: (world: WorldState, simulation: Simulation<BasicAction>) =>
    world.hashForMemoizer() + simulation.cacheKey(),
});

// \pi_x^*(x) in the paper
// TODO move to agent.mts after figuring out the agent <-> simulation / successor world states interaction
function agentAction(world: WorldState, simulation: Simulation<BasicAction>): BasicAction {
  let bestActionSoFar = BasicAction.DoNothing;
  let bestValueSoFar = -Infinity;
  for (const action of Object.values(BasicAction)) {
    const successorWorlds = simulation.successorWorldStates(world, action);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (piStarXAgent.rewardFunction(world, successorWorld) +
          timeDiscountFactor * valueFunction(successorWorld, simulation));
    }

    // TODO consider noting indifference cases somehow
    if (valueForThisAction > bestValueSoFar) {
      bestActionSoFar = action;
      bestValueSoFar = valueForThisAction;
    }
  }

  return bestActionSoFar;
}

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
    const sim: Simulation<BasicAction> = new BasicSimulation({
      lobbyingPower,
      totalSteps: 25,
    });

    const simResult = sim.run(startingWorld, agentAction);
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

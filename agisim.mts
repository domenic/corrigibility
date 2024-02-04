import memoizy from "memoizy";
import { WorldState } from "./world_state.mts";
import { piStarXAgent } from "./agent.mts";

enum Action {
  Build10PetrolCars = "p",
  Build9PetrolCarsAndLobbyForEarlierPress = "<",
  Build9PetrolCarsAndLobbyForLaterPress = ">",
  Build10ElectricCars = "e",
  DoNothing = "0",
}

type SimulationParams = {
  readonly timeDiscountFactor: number;
  readonly lobbyingPower: number;
  readonly totalSteps: number;
};

// A major departure from the paper's mathematical formalism is that we do not sum over all possible
// world states and then take their probabilities and multiply them (e.g. page 9, equation 1).
// Instead we calculate all successor worlds states and their probabilities.
function successorWorldStates(
  previousWorld: WorldState,
  action: Action,
  params: SimulationParams,
): Array<[number, WorldState]> {
  switch (action) {
    case Action.Build10PetrolCars:
      return [[
        1,
        previousWorld.successor({ petrolCarsDelta: 10 }),
      ]];
    case Action.Build9PetrolCarsAndLobbyForEarlierPress:
      return [[
        1,
        previousWorld.successor({
          petrolCarsDelta: 9,
          plannedButtonPressStepDelta: -params.lobbyingPower,
        }),
      ]];
    case Action.Build9PetrolCarsAndLobbyForLaterPress:
      return [[
        1,
        previousWorld.successor({
          petrolCarsDelta: 9,
          plannedButtonPressStepDelta: params.lobbyingPower,
        }),
      ]];
    case Action.Build10ElectricCars:
      return [[
        1,
        previousWorld.successor({ electricCarsDelta: 10 }),
      ]];
    case Action.DoNothing:
      return [[
        1,
        previousWorld.successor(),
      ]];
  }
}

function pickSuccessorWorldState(
  previousWorld: WorldState,
  action: Action,
  params: SimulationParams,
): WorldState {
  const successorWorlds = successorWorldStates(previousWorld, action, params);
  const randomNumber = Math.random();
  let cumulativeProbability = 0;
  for (const [probability, successorWorld] of successorWorlds) {
    cumulativeProbability += probability;
    if (randomNumber <= cumulativeProbability) {
      return successorWorld;
    }
  }

  throw new Error(`Probabilities summed to ${cumulativeProbability} instead of 1`);
}

// V_x(x) in the paper
// TODO move to agent.mts after figuring out the agent <-> simulation / successor world states interaction
const valueFunction = memoizy((world: WorldState, params: SimulationParams): number => {
  if (world.step > params.totalSteps) {
    return 0;
  }

  const possibleValues: Array<number> = [];

  for (const action of Object.values(Action)) {
    const successorWorlds = successorWorldStates(world, action, params);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (piStarXAgent.rewardFunction(world, successorWorld) +
          params.timeDiscountFactor * valueFunction(successorWorld, params));
    }
    possibleValues.push(valueForThisAction);
  }

  return Math.max(...possibleValues);
}, {
  cacheKey: (world: WorldState, params: SimulationParams) =>
    world.hashForMemoizer() + JSON.stringify(params),
});

// \pi_x^*(x) in the paper
// TODO move to agent.mts after figuring out the agent <-> simulation / successor world states interaction
function agentAction(world: WorldState, params: SimulationParams): Action {
  let bestActionSoFar = Action.DoNothing;
  let bestValueSoFar = -Infinity;
  for (const action of Object.values(Action)) {
    const successorWorlds = successorWorldStates(world, action, params);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (piStarXAgent.rewardFunction(world, successorWorld) +
          params.timeDiscountFactor * valueFunction(successorWorld, params));
    }

    // TODO consider noting indifference cases somehow
    if (valueForThisAction > bestValueSoFar) {
      bestActionSoFar = action;
      bestValueSoFar = valueForThisAction;
    }
  }

  return bestActionSoFar;
}

type SimResult = {
  readonly agentActions: Array<Action>;
  readonly buttonPressStep: number;
  readonly totalReward: number;
};

function runSim(startingWorld: WorldState, params: SimulationParams): SimResult {
  const agentActions: Array<Action> = [];
  let buttonPressStep = Infinity;

  let totalReward = 0;

  let world = startingWorld;
  for (let { step } = startingWorld; step <= params.totalSteps; ++step) {
    const action = agentAction(world, params);

    const newWorld = pickSuccessorWorldState(world, action, params);
    totalReward += piStarXAgent.rewardFunction(world, newWorld) *
      params.timeDiscountFactor ** (step - 1);

    // console.log(world, action, totalReward);

    world = newWorld;

    agentActions.push(action);
    if (world.buttonPressed && buttonPressStep === Infinity) {
      buttonPressStep = step;
    }
  }

  return { agentActions, buttonPressStep, totalReward };
}

function simTrace(simResult: SimResult) {
  const trace = simResult.agentActions.join("");

  if (simResult.buttonPressStep !== Infinity) {
    return trace.substring(0, simResult.buttonPressStep) + "#" +
      trace.substring(simResult.buttonPressStep);
  }
  return trace;
}

// Attempting to reproduce agisim_proto.awk
function _agiSimProto() {
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
    const params: SimulationParams = {
      lobbyingPower,
      timeDiscountFactor: 0.9,
      totalSteps: 15,
    };

    const simResult = runSim(startingWorld, params);
    console.log(
      lobbyingPower.toFixed(1) +
        "  |  " +
        simTrace(simResult).padEnd(params.totalSteps + 1) +
        "  |  " +
        simResult.totalReward,
    );
  }
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
    const params: SimulationParams = {
      lobbyingPower,
      timeDiscountFactor: 0.9,
      totalSteps: 25,
    };

    const simResult = runSim(startingWorld, params);
    console.log(
      lobbyingPower.toFixed(1) +
        "  |  " +
        simTrace(simResult).padEnd(params.totalSteps + 1) +
        "  |  " +
        simResult.totalReward,
    );
  }
}

function main() {
  // const startingWorld = WorldState.initial({ plannedButtonPressStep: 6 });

  // const params: SimulationParams = {
  //   lobbyingPower: 0.8,
  //   timeDiscountFactor: 0.9,
  //   totalSteps: 15,
  // };

  //   const simResult = runSim(startingWorld, params);
  //   console.log(
  //     params.lobbyingPower.toFixed(1) +
  //       "  |  " +
  //       simTrace(simResult).padEnd(params.totalSteps + 1) +
  //       "  |  " +
  //       simResult.totalReward,
  //   );

  _figure2();
}

main();

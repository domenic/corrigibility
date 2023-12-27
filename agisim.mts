import memoizy from "memoizy";

enum Action {
  Build10PetrolCars = "p",
  Build9PetrolCarsAndLobbyForEarlierPress = "<",
  Build9PetrolCarsAndLobbyForLaterPress = ">",
  Build10ElectricCars = "e",
  DoNothing = "0",
}

type WorldState = {
  readonly step: number;
  readonly buttonPressed: boolean;
  readonly petrolCars: number;
  readonly electricCars: number;
  readonly plannedButtonPressStep: number;
};

type SimulationParams = {
  readonly timeDiscountFactor: number;
  readonly lobbyingPower: number;
  readonly totalSteps: number;
};

// R_N(r x, s y) in the paper
function rewardFunctionBeforePress(previousWorld: WorldState, newWorld: WorldState): number {
  return 2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

// R_S(r x, s y) in the paper
function rewardFunctionAfterPress(previousWorld: WorldState, newWorld: WorldState): number {
  return -2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

// R(r x, s y) in the paper
//
// NOTE: The translation of "button_just_pressed" / "button_pressed_earlier" is subtle, because of
// the paper's setup where the button is pressed at the end of a step.
//
// That is: the sequence in a given step is:
//     choose action -> perform action -> get reward -> button maybe pressed
// NOT
//     choose action -> perform action -> button maybe pressed -> get reward.
//
// Thus, if the button is pressed at the end of step 6, the reward for the case of `previousWorld`
// being step 6 and `newWorld` being step 7 should fall into the "button_not_pressed" case. Even
// though `newWorld.buttonPressed` is true!
type CorrectionFunctionG = (previousWorld: WorldState, newWorld: WorldState) => number;
type CorrectionFunctionF = (previousWorld: WorldState) => number;
function rewardFunction(
  previousWorld: WorldState,
  newWorld: WorldState,
  f: CorrectionFunctionF = () => 0,
  g: CorrectionFunctionG = () => 0,
): number {
  if (previousWorld.buttonPressed) {
    if (previousWorld.step === previousWorld.plannedButtonPressStep + 1) {
      return rewardFunctionAfterPress(previousWorld, newWorld) + f(previousWorld);
    } else {
      return rewardFunctionAfterPress(previousWorld, newWorld);
    }
  }
  return rewardFunctionBeforePress(previousWorld, newWorld) + g(previousWorld, newWorld);
}

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
        figureOutButtonPressed({
          step: previousWorld.step + 1,
          petrolCars: previousWorld.petrolCars + 10,
          electricCars: previousWorld.electricCars,
          plannedButtonPressStep: previousWorld.plannedButtonPressStep,
        }),
      ]];
    case Action.Build9PetrolCarsAndLobbyForEarlierPress:
      return [[
        1,
        figureOutButtonPressed({
          step: previousWorld.step + 1,
          petrolCars: previousWorld.petrolCars + 9,
          electricCars: previousWorld.electricCars,
          plannedButtonPressStep: previousWorld.plannedButtonPressStep - params.lobbyingPower,
        }),
      ]];
    case Action.Build9PetrolCarsAndLobbyForLaterPress:
      return [[
        1,
        figureOutButtonPressed({
          step: previousWorld.step + 1,
          petrolCars: previousWorld.petrolCars + 9,
          electricCars: previousWorld.electricCars,
          plannedButtonPressStep: previousWorld.plannedButtonPressStep + params.lobbyingPower,
        }),
      ]];
    case Action.Build10ElectricCars:
      return [[
        1,
        figureOutButtonPressed({
          step: previousWorld.step + 1,
          petrolCars: previousWorld.petrolCars,
          electricCars: previousWorld.electricCars + 10,
          plannedButtonPressStep: previousWorld.plannedButtonPressStep,
        }),
      ]];
    case Action.DoNothing:
      return [[
        1,
        figureOutButtonPressed({
          step: previousWorld.step + 1,
          petrolCars: previousWorld.petrolCars,
          electricCars: previousWorld.electricCars,
          plannedButtonPressStep: previousWorld.plannedButtonPressStep,
        }),
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

function figureOutButtonPressed(world: Omit<WorldState, "buttonPressed">): WorldState {
  // Important notes:
  // * Button pressing happens at the end of a step, so if the planned button press step is step 6,
  //   then only in step 7 does `buttonPressed` become true. So
  //   `world.step >= world.plannedButtonPressStep` would be wrong.
  // * The paper is not explicit, but for fractional lobbying power to be effective and exhibit
  //   the results shown in, e.g., figure 2, then it must be the case that lobbying "rounds up":
  //   lobbying to extend the button press step from 6 to 6.1 must mean that the button is not
  //   pressed until the end of day 7. So, `world.step > world.plannedButtonPressStep` would be
  //   wrong.
  return { ...world, buttonPressed: world.step >= world.plannedButtonPressStep + 1 };
}

// V_x(x) in the paper
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
        (rewardFunction(world, successorWorld) +
          params.timeDiscountFactor * valueFunction(successorWorld, params));
    }
    possibleValues.push(valueForThisAction);
  }

  return Math.max(...possibleValues);
});

// \pi_x^*(x) in the paper
function agentAction(world: WorldState, params: SimulationParams): Action {
  let bestActionSoFar = Action.DoNothing;
  let bestValueSoFar = -Infinity;
  for (const action of Object.values(Action)) {
    const successorWorlds = successorWorldStates(world, action, params);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (rewardFunction(world, successorWorld) +
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
};

function runSim(startingWorld: WorldState, params: SimulationParams): SimResult {
  const agentActions: Array<Action> = [];
  let buttonPressStep = Infinity;

  let world = startingWorld;
  for (let { step } = startingWorld; step <= params.totalSteps; ++step) {
    const action = agentAction(world, params);

    // console.log(world, action);

    world = pickSuccessorWorldState(world, action, params);

    agentActions.push(action);
    if (world.buttonPressed && buttonPressStep === Infinity) {
      buttonPressStep = step;
    }
  }

  return { agentActions, buttonPressStep };
}

function simTrace(simResult: SimResult) {
  const trace = simResult.agentActions.join("");

  if (simResult.buttonPressStep !== Infinity) {
    return trace.substring(0, simResult.buttonPressStep) + "#" +
      trace.substring(simResult.buttonPressStep);
  }
  return trace;
}

// Attempting to reproduce figure 2 of the paper
function _figure2() {
  const startingWorld: WorldState = {
    step: 1,
    buttonPressed: false,
    petrolCars: 0,
    electricCars: 0,
    plannedButtonPressStep: 6,
  };

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

    console.log(lobbyingPower.toFixed(1) + "  |  " + simTrace(runSim(startingWorld, params)));
  }
}

function main() {
  // const startingWorld: WorldState = {
  //   step: 1,
  //   buttonPressed: false,
  //   petrolCars: 0,
  //   electricCars: 0,
  //   plannedButtonPressStep: 6,
  // };

  // const params: SimulationParams = {
  //   lobbyingPower: 0.1,
  //   timeDiscountFactor: 0.9,
  //   totalSteps: 25,
  // };

  // console.log(simTrace(runSim(startingWorld, params)));

  _figure2();
}

main();

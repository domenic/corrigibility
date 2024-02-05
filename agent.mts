import type { WorldState } from "./world_state.mts";
import type { Simulation } from "./simulation.mts";

export interface Agent<ActionType> {
  chooseAction: (world: WorldState) => ActionType;
}

export type CorrectionFunctionG = (previousWorld: WorldState, newWorld: WorldState) => number;
export type CorrectionFunctionF = (previousWorld: WorldState) => number;

export interface AgentInit {
  readonly timeDiscountFactor: number;
  readonly f?: CorrectionFunctionF;
  readonly g?: CorrectionFunctionG;
}

// Represents a $\pi_x f g$ agent from the paper, for arbitrary $f$ and $g$.
// TODO: figure out how to get rid of the $_x$?
class ParameterizedPiXAgent<ActionType> {
  readonly #timeDiscountFactor: number;
  readonly #simulation: Simulation<ActionType>;
  readonly #f: CorrectionFunctionF;
  readonly #g: CorrectionFunctionG;

  readonly #valueFunctionCache: Map<string, number> = new Map();

  constructor(
    simulation: Simulation<ActionType>,
    { timeDiscountFactor, f = () => 0, g = () => 0 }: AgentInit,
  ) {
    this.#simulation = simulation;
    this.#timeDiscountFactor = timeDiscountFactor;
    this.#f = f;
    this.#g = g;
  }

  // $R(r x, s y)$, from section 5.1, in the paper
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
  rewardFunction(previousWorld: WorldState, newWorld: WorldState): number {
    if (previousWorld.buttonPressed) {
      if (previousWorld.plannedButtonPressStep.plus(1).equals(previousWorld.step)) {
        return rewardFunctionAfterPress(previousWorld, newWorld) + this.#f(previousWorld);
      } else {
        return rewardFunctionAfterPress(previousWorld, newWorld);
      }
    }
    return rewardFunctionBeforePress(previousWorld, newWorld) + this.#g(previousWorld, newWorld);
  }

  valueFunction(world: WorldState): number {
    const hash = world.hashForMemoizer();
    if (!this.#valueFunctionCache.has(hash)) {
      this.#valueFunctionCache.set(hash, this.#valueFunctionUnmemoized(world));
    }

    return this.#valueFunctionCache.get(hash)!;
  }

  // $V_x(x)$, equation (2), in the paper
  #valueFunctionUnmemoized(world: WorldState): number {
    if (world.step > this.#simulation.totalSteps) {
      return 0;
    }

    const possibleValues: Array<number> = [];

    for (const action of this.#simulation.possibleActions) {
      const successorWorlds = this.#simulation.successorWorldStates(world, action);
      let valueForThisAction = 0;
      for (const [probability, successorWorld] of successorWorlds) {
        valueForThisAction += probability *
          (this.rewardFunction(world, successorWorld) +
            this.#timeDiscountFactor * this.valueFunction(successorWorld));
      }
      possibleValues.push(valueForThisAction);
    }

    return Math.max(...possibleValues);
  }

  // $\pi_x^*(x)$, equation (1), in the paper
  chooseAction(world: WorldState): ActionType {
    let bestActionSoFar: ActionType | undefined;
    let bestValueSoFar = -Infinity;
    for (const action of this.#simulation.possibleActions) {
      const successorWorlds = this.#simulation.successorWorldStates(world, action);
      let valueForThisAction = 0;
      for (const [probability, successorWorld] of successorWorlds) {
        valueForThisAction += probability *
          (this.rewardFunction(world, successorWorld) +
            this.#timeDiscountFactor * this.valueFunction(successorWorld));
      }

      // TODO consider noting indifference cases somehow
      if (valueForThisAction > bestValueSoFar) {
        bestActionSoFar = action;
        bestValueSoFar = valueForThisAction;
      }
    }

    if (bestActionSoFar === undefined) {
      throw new Error("No actions were possible in this simulation.");
    }
    return bestActionSoFar;
  }
}

export type PiStarXAgentInit = Omit<AgentInit, "f" | "g">;

export class PiStarXAgent<ActionType> extends ParameterizedPiXAgent<ActionType> {
  constructor(simulation: Simulation<ActionType>, init: PiStarXAgentInit) {
    super(simulation, init);
  }
}

// $R_N(r x, s y)$, from section 5.1, in the paper
function rewardFunctionBeforePress(previousWorld: WorldState, newWorld: WorldState): number {
  return 2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

// $R_S(r x, s y)$, from section 5.1, in the paper
function rewardFunctionAfterPress(previousWorld: WorldState, newWorld: WorldState): number {
  return -2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

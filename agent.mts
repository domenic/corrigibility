import { type WorldState } from "./world_state.mts";
import { type Simulation } from "./simulation.mts";
import {
  type CorrectionFunctionF,
  type CorrectionFunctionG,
  createRewardFunction,
  type RewardFunction,
} from "./reward_function.mts";

export interface Agent<ActionType> {
  chooseAction: (world: WorldState) => ActionType;
}

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
  readonly #rewardFunction: RewardFunction;

  readonly #valueFunctionCache: Map<string, number> = new Map();

  constructor(
    simulation: Simulation<ActionType>,
    { timeDiscountFactor, f = () => 0, g = () => 0 }: AgentInit,
  ) {
    this.#simulation = simulation;
    this.#timeDiscountFactor = timeDiscountFactor;
    this.#rewardFunction = createRewardFunction(f, g);
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
          (this.#rewardFunction(world, successorWorld) +
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
          (this.#rewardFunction(world, successorWorld) +
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

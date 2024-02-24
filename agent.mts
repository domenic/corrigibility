import { type WorldState } from "./world_state.mts";
import { type Simulation } from "./simulation.mts";

export interface Agent<ActionType> {
  chooseAction: (world: WorldState) => ActionType;
}

export interface AgentInit {
  readonly timeDiscountFactor: number;
}

// Represents a hybrid between $\pi^*_x f g$ and $\pi^* f g$ agents from the paper while we refactor.
export class PiStarXAgent<ActionType> {
  readonly #timeDiscountFactor: number;
  readonly #simulation: Simulation<ActionType>;

  readonly #valueFunctionCache: Map<string, number> = new Map();

  constructor(
    simulation: Simulation<ActionType>,
    { timeDiscountFactor }: AgentInit,
  ) {
    this.#simulation = simulation;
    this.#timeDiscountFactor = timeDiscountFactor;
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
          (world.agentRewardFunction(world, successorWorld) +
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
          (world.agentRewardFunction(world, successorWorld) +
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

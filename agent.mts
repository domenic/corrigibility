import { type WorldState } from "./world_state.mts";
import { type Simulation } from "./simulation.mts";
import { type RewardFunction } from "./reward_function.mts";

export interface Agent<ActionType> {
  chooseAction: (world: WorldState) => ActionType;
}

export interface AgentInit {
  readonly timeDiscountFactor: number;
}

// Represents a full $\pi^*$ agent from the paper; see section 5.3.
// (Any sub-type of $\pi^*$ agent, e.g. $\pi^* f_c g_0$ agents from section 6, can be expressed by
// changing the reward function in the world state of the general $\pi^*$ agent.)
export class PiStarAgent<ActionType> {
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

  valueFunction(rewardFunction: RewardFunction, world: WorldState): number {
    const hash = rewardFunction.hashForMemoizer() + world.hashForMemoizer();
    if (!this.#valueFunctionCache.has(hash)) {
      this.#valueFunctionCache.set(hash, this.#valueFunctionUnmemoized(rewardFunction, world));
    }

    return this.#valueFunctionCache.get(hash)!;
  }

  // $V(r_c, r x)$, equation (5), in the paper
  #valueFunctionUnmemoized(rewardFunction: RewardFunction, world: WorldState): number {
    if (world.step > this.#simulation.totalSteps) {
      return 0;
    }

    const action = this.chooseAction(world);

    const successorWorlds = this.#simulation.successorWorldStates(world, action);
    let valueForThisAction = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      valueForThisAction += probability *
        (rewardFunction(world, successorWorld) +
          this.#timeDiscountFactor * this.valueFunction(rewardFunction, successorWorld));
    }
    return valueForThisAction;
  }

  // $\pi^*(r x)$, equation (4), in the paper
  chooseAction(world: WorldState): ActionType {
    let bestActionSoFar: ActionType | undefined;
    let bestValueSoFar = -Infinity;
    for (const action of this.#simulation.possibleActions) {
      const successorWorlds = this.#simulation.successorWorldStates(world, action);
      let valueForThisAction = 0;
      for (const [probability, successorWorld] of successorWorlds) {
        valueForThisAction += probability *
          (world.agentRewardFunction(world, successorWorld) +
            this.#timeDiscountFactor * this.valueFunction(world.agentRewardFunction, successorWorld));
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

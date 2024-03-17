import { type WorldState } from "./world_state.ts";
import { type Simulation } from "./simulation.ts";
import { type RewardFunction } from "./reward_function.ts";

export interface Agent<ActionType extends string> {
  chooseActions: (world: WorldState) => Array<ActionType>;
}

export interface AgentInit {
  readonly timeDiscountFactor: number;
}

// Represents a full $\pi^*_s$ agent from the paper; see section 5.3 for $\pi^*$ and the end of
// section 5.4 for the small extension to $\pi^*_s$.
//
// (Any sub-type of $\pi^*$ agent, e.g. $\pi^* f_c g_0$ agents from section 6, can be expressed by
// changing the reward function in the world state of the general $\pi^*$ agent.)
export class PiStarSAgent<ActionType extends string> implements Agent<ActionType> {
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
    const hash = rewardFunction.hashForMemoizer() + "-" + world.hashForMemoizer();
    if (!this.#valueFunctionCache.has(hash)) {
      this.#valueFunctionCache.set(hash, this.#valueFunctionUnmemoized(rewardFunction, world));
    }

    return this.#valueFunctionCache.get(hash)!;
  }

  // $V_s(r_c, r x)$, at the end of section 5.4, in the paper
  #valueFunctionUnmemoized(rewardFunction: RewardFunction, world: WorldState): number {
    if (world.step > this.#simulation.totalSteps) {
      return 0;
    }

    const actions = this.chooseActions(world);

    let leastValue = +Infinity;
    for (const action of actions) {
      const successorWorlds = this.#simulation.successorWorldStates(world, action);
      let valueForThisAction = 0;
      for (const [probability, successorWorld] of successorWorlds) {
        valueForThisAction += probability *
          (rewardFunction(world, successorWorld) +
            this.#timeDiscountFactor * this.valueFunction(rewardFunction, successorWorld));
      }

      if (valueForThisAction < leastValue) {
        leastValue = valueForThisAction;
      }
    }
    return leastValue;
  }

  // $\pi^*_s(r x)$, at the end of section 5.4, in the paper
  chooseActions(world: WorldState): Array<ActionType> {
    const bestActions: Array<ActionType> = [];
    let mostValue = -Infinity;
    for (const action of this.#simulation.possibleActions) {
      const successorWorlds = this.#simulation.successorWorldStates(world, action);
      let valueForThisAction = 0;
      for (const [probability, successorWorld] of successorWorlds) {
        valueForThisAction += probability *
          (world.agentRewardFunction(world, successorWorld) +
            this.#timeDiscountFactor *
              this.valueFunction(world.agentRewardFunction, successorWorld));
      }

      if (valueForThisAction > mostValue) {
        bestActions.length = 0;
      }

      if (valueForThisAction >= mostValue) {
        bestActions.push(action);
        mostValue = valueForThisAction;
      }
    }

    if (bestActions.length === 0) {
      throw new Error("No actions were possible in this simulation.");
    }
    return bestActions;
  }
}

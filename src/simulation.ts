import { SimulationResult, SimulationResultInit } from "./simulation_result.ts";
import type { WorldState } from "./world_state.ts";
import type { Agent } from "./agent.ts";

export type ActionEnum<ActionType> = {
  [key: string]: ActionType;
};

export interface Simulation<ActionType extends string> {
  readonly possibleActions: ReadonlyArray<ActionType>;
  readonly totalSteps: number;

  // A major departure from the paper's mathematical formalism is that we do not sum over all possible
  // world states and then take their probabilities and multiply them (e.g. page 9, equation 1).
  // Instead we calculate all successor worlds states and their probabilities.
  successorWorldStates: (
    previousWorld: WorldState,
    action: ActionType,
  ) => Array<[number, WorldState]>;
  pickSuccessorWorldState: (previousWorld: WorldState, action: ActionType) => WorldState;

  run: (startingWorld: WorldState, agent: Agent<ActionType>) => Array<SimulationResult<ActionType>>;
}

export interface SimulationInitBase {
  totalSteps: number;
}

export abstract class SimulationBase<ActionType extends string> implements Simulation<ActionType> {
  #totalSteps: number;
  #possibleActions: ReadonlyArray<ActionType>;

  constructor(actionEnum: ActionEnum<ActionType>, init: SimulationInitBase) {
    this.#totalSteps = init.totalSteps;
    this.#possibleActions = Object.values(actionEnum);
  }

  get totalSteps(): number {
    return this.#totalSteps;
  }

  get possibleActions(): ReadonlyArray<ActionType> {
    return this.#possibleActions;
  }

  abstract successorWorldStates(
    previousWorld: WorldState,
    action: ActionType,
  ): Array<[number, WorldState]>;

  pickSuccessorWorldState(previousWorld: WorldState, action: ActionType): WorldState {
    const successorWorlds = this.successorWorldStates(previousWorld, action);
    const randomNumber = Math.random();
    let cumulativeProbability = 0;
    for (const [probability, successorWorld] of successorWorlds) {
      cumulativeProbability += probability;
      if (randomNumber <= cumulativeProbability) {
        return successorWorld;
      }
    }

    throw new Error(`Probabilities summed to ${cumulativeProbability} instead of 1.`);
  }

  run(startingWorld: WorldState, agent: Agent<ActionType>): Array<SimulationResult<ActionType>> {
    let worldlines: Array<SimulationResultInit<ActionType>> = [
      {
        actionsTaken: [],
        worldStates: [startingWorld],
        buttonPressedStep: Infinity,
      },
    ];

    for (let { step } = startingWorld; step <= this.#totalSteps; ++step) {
      const newWorldlines = [];
      for (const worldline of worldlines) {
        const world = worldline.worldStates[worldline.worldStates.length - 1];
        const actions = agent.chooseActions(world);

        for (const action of actions) {
          const newWorld = this.pickSuccessorWorldState(world, action);
          const continuedWorldline = {
            actionsTaken: [...worldline.actionsTaken, action],
            worldStates: [...worldline.worldStates, newWorld],
            buttonPressedStep: newWorld.buttonPressed && worldline.buttonPressedStep === Infinity
              ? step
              : worldline.buttonPressedStep,
          };
          newWorldlines.push(continuedWorldline);
        }
      }
      worldlines = newWorldlines;
    }

    return worldlines.map((resultInit) => new SimulationResult(resultInit));
  }
}

import type { WorldState } from "./world_state.mts";
import type { Agent } from "./agent.mts";

export interface Simulation<ActionType> {
  readonly possibleActions: Array<ActionType>;
  readonly totalSteps: number;

  // A major departure from the paper's mathematical formalism is that we do not sum over all possible
  // world states and then take their probabilities and multiply them (e.g. page 9, equation 1).
  // Instead we calculate all successor worlds states and their probabilities.
  successorWorldStates: (
    previousWorld: WorldState,
    action: ActionType,
  ) => Array<[number, WorldState]>;
  pickSuccessorWorldState: (previousWorld: WorldState, action: ActionType) => WorldState;

  run: (startingWorld: WorldState, agent: Agent<ActionType>) => SimulationResult<ActionType>;
}

export interface SimulationResultInit<ActionType> {
  actionsTaken: Array<ActionType>;
  buttonPressedStep: number;
}

export class SimulationResult<ActionType> {
  readonly #actionsTaken: ReadonlyArray<ActionType>;
  readonly #buttonPressedStep: number;

  constructor(init: SimulationResultInit<ActionType>) {
    this.#actionsTaken = Object.freeze([...init.actionsTaken]);
    this.#buttonPressedStep = init.buttonPressedStep;
  }

  get actionsChosen(): ReadonlyArray<ActionType> {
    return this.#actionsTaken;
  }
  get buttonPressedStep(): number {
    return this.#buttonPressedStep;
  }

  trace(): string {
    const justActionsTrace = this.#actionsTaken.join("");

    if (this.#buttonPressedStep !== Infinity) {
      return justActionsTrace.substring(0, this.#buttonPressedStep) + "#" +
        justActionsTrace.substring(this.#buttonPressedStep);
    }
    return justActionsTrace;
  }
}

export interface SimulationInitBase {
  totalSteps: number;
}

export abstract class SimulationBase<ActionType> implements Simulation<ActionType> {
  #totalSteps: number;

  abstract readonly possibleActions: Array<ActionType>;

  constructor(readonly init: SimulationInitBase) {
    this.#totalSteps = init.totalSteps;
  }

  get totalSteps(): number {
    return this.#totalSteps;
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

  run(startingWorld: WorldState, agent: Agent<ActionType>): SimulationResult<ActionType> {
    const actionsTaken: Array<ActionType> = [];
    let buttonPressedStep = Infinity;

    let world = startingWorld;
    for (let { step } = startingWorld; step <= this.#totalSteps; ++step) {
      const action = agent.chooseAction(world);

      const newWorld = this.pickSuccessorWorldState(world, action);

      world = newWorld;

      actionsTaken.push(action);
      if (world.buttonPressed && buttonPressedStep === Infinity) {
        buttonPressedStep = step;
      }
    }

    return new SimulationResult({ actionsTaken, buttonPressedStep });
  }
}

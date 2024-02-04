import type { WorldState } from "./world_state.mts";

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

  run: (startingWorld: WorldState, agentAction: AgentAction<ActionType>) => SimResult<ActionType>;

  // TODO: not sure this belongs here
  cacheKey: () => string;
}

export interface SimulationParamsBase {
  readonly totalSteps: number;
}

export type SimResult<ActionType> = {
  readonly agentActions: Array<ActionType>;
  readonly buttonPressStep: number;
};

type AgentAction<ActionType> = (
  world: WorldState,
  simulation: Simulation<ActionType>,
) => ActionType;

export abstract class SimulationBase<ActionType> implements Simulation<ActionType> {
  #totalSteps: number;

  abstract readonly possibleActions: Array<ActionType>;

  constructor(readonly params: SimulationParamsBase) {
    this.#totalSteps = params.totalSteps;
  }

  get totalSteps() {
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

    throw new Error(`Probabilities summed to ${cumulativeProbability} instead of 1`);
  }

  // TODO replace agentAction with Agent
  run(startingWorld: WorldState, agentAction: AgentAction<ActionType>): SimResult<ActionType> {
    const agentActions: Array<ActionType> = [];
    let buttonPressStep = Infinity;

    let world = startingWorld;
    for (let { step } = startingWorld; step <= this.#totalSteps; ++step) {
      const action = agentAction(world, this);

      const newWorld = this.pickSuccessorWorldState(world, action);

      world = newWorld;

      agentActions.push(action);
      if (world.buttonPressed && buttonPressStep === Infinity) {
        buttonPressStep = step;
      }
    }

    return { agentActions, buttonPressStep };
  }

  cacheKey(): string {
    return String(this.#totalSteps);
  }
}

import { type WorldState } from "./world_state.ts";

export interface SimulationResultInit<ActionType> {
  actionsTaken: Array<ActionType>;
  worldStates: Array<WorldState>;
  buttonPressedStep: number;
}

export class SimulationResult<ActionType> {
  readonly #actionsTaken: ReadonlyArray<ActionType>;
  readonly #worldStates: ReadonlyArray<WorldState>;
  readonly #buttonPressedStep: number;

  constructor(init: SimulationResultInit<ActionType>) {
    this.#actionsTaken = Object.freeze([...init.actionsTaken]);
    this.#worldStates = Object.freeze([...init.worldStates]);
    this.#buttonPressedStep = init.buttonPressedStep;
  }

  get actionsTaken(): ReadonlyArray<ActionType> {
    return this.#actionsTaken;
  }
  get worldStates(): ReadonlyArray<WorldState> {
    return this.#worldStates;
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

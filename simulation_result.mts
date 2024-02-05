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

  get actionsTaken(): ReadonlyArray<ActionType> {
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

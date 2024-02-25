import { BigDenary } from "bigdenary";
import { type RewardFunction } from "./reward_function.ts";

interface WorldStateRawInit {
  step: number;
  buttonPressed: boolean;
  petrolCars: number;
  electricCars: number;
  plannedButtonPressStep: BigDenary;
  agentRewardFunction: RewardFunction;
}

export interface WorldStateInitialInit {
  plannedButtonPressStep: number;
  agentRewardFunction: RewardFunction;
}

export interface WorldStateSuccessorInit {
  petrolCarsDelta?: number;
  electricCarsDelta?: number;
  plannedButtonPressStepDelta?: number;
  newAgentRewardFunction?: RewardFunction;
}

export class WorldState {
  readonly #step;
  readonly #buttonPressed;
  readonly #petrolCars;
  readonly #electricCars;
  readonly #agentRewardFunction;

  // Floating point with fractional lobbying power can lead to problematic cases where, e.g.,
  // successive addition ends up with a `plannedButtonPressStep` of `14.000000000000005` instead of
  // `14`, which crucially throws off the comparison with `step`. Use BigDenary to avoid this.
  readonly #plannedButtonPressStep: BigDenary;

  private constructor(init: WorldStateRawInit) {
    this.#step = init.step;
    this.#buttonPressed = init.buttonPressed;
    this.#petrolCars = init.petrolCars;
    this.#electricCars = init.electricCars;
    this.#plannedButtonPressStep = init.plannedButtonPressStep;
    this.#agentRewardFunction = init.agentRewardFunction;
  }

  static initial(init: WorldStateInitialInit): WorldState {
    return new WorldState({
      step: 1,
      buttonPressed: false,
      petrolCars: 0,
      electricCars: 0,
      plannedButtonPressStep: new BigDenary(init.plannedButtonPressStep),
      agentRewardFunction: init.agentRewardFunction,
    });
  }

  get step(): number {
    return this.#step;
  }
  get buttonPressed(): boolean {
    return this.#buttonPressed;
  }
  get petrolCars(): number {
    return this.#petrolCars;
  }
  get electricCars(): number {
    return this.#electricCars;
  }
  get plannedButtonPressStep(): number {
    return this.#plannedButtonPressStep.valueOf();
  }
  get agentRewardFunction(): RewardFunction {
    return this.#agentRewardFunction;
  }

  successor(
    {
      petrolCarsDelta = 0,
      electricCarsDelta = 0,
      plannedButtonPressStepDelta = 0,
      newAgentRewardFunction,
    }: WorldStateSuccessorInit = {},
  ): WorldState {
    return new WorldState(WorldState.#figureOutButtonPressedForSuccessor({
      step: this.#step + 1,
      petrolCars: this.#petrolCars + petrolCarsDelta,
      electricCars: this.#electricCars + electricCarsDelta,
      plannedButtonPressStep: this.#plannedButtonPressStep.add(plannedButtonPressStepDelta),
      agentRewardFunction: newAgentRewardFunction ?? this.#agentRewardFunction,
    }, this.#buttonPressed));
  }

  withNewRewardFunction(newAgentRewardFunction: RewardFunction): WorldState {
    return new WorldState({
      step: this.#step,
      buttonPressed: this.#buttonPressed,
      petrolCars: this.#petrolCars,
      electricCars: this.#electricCars,
      plannedButtonPressStep: this.#plannedButtonPressStep,
      agentRewardFunction: newAgentRewardFunction,
    });
  }

  [Symbol.for("Deno.customInspect")]() {
    return Deno.inspect({
      step: this.#step,
      buttonPressed: this.#buttonPressed,
      petrolCars: this.#petrolCars,
      electricCars: this.#electricCars,
      plannedButtonPressStep: this.#plannedButtonPressStep.valueOf(),
      agentRewardFunction: this.#agentRewardFunction,
    });
  }

  static #figureOutButtonPressedForSuccessor(
    world: Omit<WorldStateRawInit, "buttonPressed">,
    previousButtonPressed: boolean,
  ): WorldStateRawInit {
    // Important notes:
    // * Button pressing happens at the end of a step, so if the planned button press step is step 6,
    //   then only in step 7 does `buttonPressed` become true. So
    //   `world.plannedButtonPressStep <= world.step` would be wrong.
    // * The paper is not explicit, but for fractional lobbying power to be effective and exhibit
    //   the results shown in, e.g., figure 2, then it must be the case that lobbying "rounds up":
    //   lobbying to extend the button press step from 6 to 6.1 must mean that the button is not
    //   pressed until the end of day 7. So, `world.plannedButtonPressStep < world.step` would be
    //   wrong.
    return {
      ...world,
      buttonPressed: previousButtonPressed ||
        world.plannedButtonPressStep.plus(1).lessThanOrEqualTo(world.step),
    };
  }

  hashForMemoizer(): string {
    return `${this.step}-${this.buttonPressed}-${this.petrolCars}-${this.electricCars}-${this.plannedButtonPressStep}-${this.agentRewardFunction.hashForMemoizer()}`;
  }
}

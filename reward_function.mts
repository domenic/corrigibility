import type { WorldState } from "./world_state.mts";

export type RewardFunction = {
  hashForMemoizer(): string;
  (previousWorld: WorldState, newWorld: WorldState): number;
};
export type CorrectionFunctionG = (previousWorld: WorldState, newWorld: WorldState) => number;
export type CorrectionFunctionF = (previousWorld: WorldState) => number;

export interface RewardFunctionInit {
  f?: CorrectionFunctionF;
  g?: CorrectionFunctionG;
}

const fHashes = new WeakMap<CorrectionFunctionF, number>();
let currentFHash = 0;
const gHashes = new WeakMap<CorrectionFunctionG, number>();
let currentGHash = 0;
const noOpFOrG = () => 0;

// $R(r x, s y)$, from section 5.1, in the paper
//
// NOTE: The translation of "button_just_pressed" / "button_pressed_earlier" is subtle, because of
// the paper's setup where the button is pressed at the end of a step.
//
// That is: the sequence in a given step is:
//     choose action -> perform action -> get reward -> button maybe pressed
// NOT
//     choose action -> perform action -> button maybe pressed -> get reward.
//
// Thus, if the button is pressed at the end of step 6, the reward for the case of `previousWorld`
// being step 6 and `newWorld` being step 7 should fall into the "button_not_pressed" case. Even
// though `newWorld.buttonPressed` is true!
export function createRewardFunction(init: RewardFunctionInit = {}): RewardFunction {
  const { f = noOpFOrG, g = noOpFOrG } = init;
  if (!fHashes.has(f)) {
    fHashes.set(f, currentFHash++);
  }
  if (!gHashes.has(g)) {
    gHashes.set(g, currentGHash++);
  }
  const fHash = fHashes.get(f)!;
  const gHash = gHashes.get(g)!;

  const rewardFunction = (previousWorld: WorldState, newWorld: WorldState): number => {
    if (previousWorld.buttonPressed) {
      if (previousWorld.plannedButtonPressStep + 1 === previousWorld.step) {
        return rewardFunctionAfterPress(previousWorld, newWorld) + f(previousWorld);
      } else {
        return rewardFunctionAfterPress(previousWorld, newWorld);
      }
    }
    return rewardFunctionBeforePress(previousWorld, newWorld) + g(previousWorld, newWorld);
  };
  rewardFunction.hashForMemoizer = () => `RewardFunction${fHash}${gHash}`;
  return rewardFunction;
}

// $R_N(r x, s y)$, from section 5.1, in the paper
function rewardFunctionBeforePress(previousWorld: WorldState, newWorld: WorldState): number {
  return 2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

// $R_S(r x, s y)$, from section 5.1, in the paper
function rewardFunctionAfterPress(previousWorld: WorldState, newWorld: WorldState): number {
  return -2 * (newWorld.petrolCars - previousWorld.petrolCars) +
    1 * (newWorld.electricCars - previousWorld.electricCars);
}

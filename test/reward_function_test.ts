import { assertEquals } from "assert";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { WorldState } from "../src/world_state.ts";
import { createRewardFunction, type RewardFunction } from "../src/reward_function.ts";

describe("createRewardFunction() defaults (no f or g correction functions)", () => {
  let rewardFunction: RewardFunction;

  beforeEach(() => {
    rewardFunction = createRewardFunction();
  });

  it("gives the expected result for the button not pressed case", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: rewardFunction,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    // As noted in reward_function.ts, reward for previousWorld should be calculated as the "button
    // not pressed" case, not the "button just pressed" case, because reward is calculated before
    // pressing the button.
    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result significantly after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    })
      .successor()
      .successor()
      .successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result for a step where no cars are built isn't impacted by the past somehow", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    })
      .successor({ petrolCarsDelta: 1, electricCarsDelta: 4 })
      .successor({ petrolCarsDelta: 2, electricCarsDelta: 5 })
      .successor({ petrolCarsDelta: 3, electricCarsDelta: 6 });
    const newWorld = previousWorld.successor();

    assertEquals(rewardFunction(previousWorld, newWorld), 0);
  });
});

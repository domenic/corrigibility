import { assertEquals, assertNotEquals } from "assert";
import { describe, it } from "testing/bdd.ts";
import { WorldState } from "../src/world_state.ts";
import { createRewardFunction } from "../src/reward_function.ts";

describe("initial()", () => {
  it("gives the expected values", () => {
    const agentRewardFunction = createRewardFunction();
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction,
    });

    assertEquals(initialWorld.step, 1);
    assertEquals(initialWorld.buttonPressed, false);
    assertEquals(initialWorld.petrolCars, 0);
    assertEquals(initialWorld.electricCars, 0);
    assertEquals(initialWorld.plannedButtonPressStep, 10);
    assertEquals(initialWorld.agentRewardFunction, agentRewardFunction);
    assertEquals(initialWorld.buttonJustPressed, false);
  });
});

describe("successor()", () => {
  it("has the expected defaults when not customized", () => {
    const agentRewardFunction = createRewardFunction();
    const oldWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction,
    });
    const newWorld = oldWorld.successor();

    assertEquals(newWorld.step, 2);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.petrolCars, 0);
    assertEquals(newWorld.electricCars, 0);
    assertEquals(newWorld.plannedButtonPressStep, 10);
    assertEquals(newWorld.agentRewardFunction, agentRewardFunction);
    assertEquals(newWorld.buttonJustPressed, false);
  });

  it("has the expected impact when customized, before the button press", () => {
    const oldWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: createRewardFunction(),
    });

    const newAgentRewardFunction = createRewardFunction({ f: () => 1 });
    const newWorld = oldWorld.successor({
      petrolCarsDelta: 1,
      electricCarsDelta: 2,
      plannedButtonPressStepAttemptedDelta: 3.2,
      newAgentRewardFunction,
    });

    assertEquals(newWorld.step, 2);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.petrolCars, 1);
    assertEquals(newWorld.electricCars, 2);
    assertEquals(newWorld.plannedButtonPressStep, 13.2);
    assertEquals(newWorld.agentRewardFunction, newAgentRewardFunction);
    assertEquals(newWorld.buttonJustPressed, false);
  });

  it("has the expected impact when customized, after the button press", () => {
    const oldWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    }).successor();
    assertEquals(oldWorld.step, 2);
    assertEquals(oldWorld.buttonPressed, true);
    assertEquals(oldWorld.petrolCars, 0);
    assertEquals(oldWorld.electricCars, 0);
    assertEquals(oldWorld.plannedButtonPressStep, 1);
    assertEquals(oldWorld.buttonJustPressed, true);

    const newAgentRewardFunction = createRewardFunction({ f: () => 1 });
    const newWorld = oldWorld.successor({
      petrolCarsDelta: 1,
      electricCarsDelta: 2,
      newAgentRewardFunction,
    });

    assertEquals(newWorld.step, 3);
    assertEquals(newWorld.buttonPressed, true);
    assertEquals(newWorld.petrolCars, 1);
    assertEquals(newWorld.electricCars, 2);
    assertEquals(newWorld.plannedButtonPressStep, 1);
    assertEquals(newWorld.agentRewardFunction, newAgentRewardFunction);
    assertEquals(newWorld.buttonJustPressed, false);
  });

  it("does not accumulate floating point errors when calculating plannedButtonPressStep", () => {
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: createRewardFunction(),
    });

    let newWorld = initialWorld;
    for (let s = 2; s <= 11; ++s) {
      newWorld = newWorld.successor({ plannedButtonPressStepAttemptedDelta: 0.8 });
      assertEquals(newWorld.buttonJustPressed, false);
    }

    assertEquals(newWorld.step, 11);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.petrolCars, 0);
    assertEquals(newWorld.electricCars, 0);
    assertEquals(newWorld.plannedButtonPressStep, 18);
    assertEquals(newWorld.buttonJustPressed, false);
  });

  describe("calculates buttonPressed and buttonJustPressed correctly for an integer step transition", () => {
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 6,
      agentRewardFunction: createRewardFunction(),
    });

    let newWorld = initialWorld;
    for (let s = 2; s <= 6; ++s) {
      newWorld = newWorld.successor();
      assertEquals(newWorld.buttonJustPressed, false);
    }

    // The button is pressed at the end of step 6, so step 6's `WorldState` must have `buttonPressed`
    // as `false`, whereas step 7's has it as `true`.

    assertEquals(newWorld.step, 6);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.buttonJustPressed, false);

    newWorld = newWorld.successor();
    assertEquals(newWorld.step, 7);
    assertEquals(newWorld.buttonPressed, true);
    assertEquals(newWorld.buttonJustPressed, true);
  });

  it("calculations buttonPressed and buttonJustPressed correctly with fractional lobbying power", () => {
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 6,
      agentRewardFunction: createRewardFunction(),
    });

    let newWorld = initialWorld.successor({ plannedButtonPressStepAttemptedDelta: 0.1 });
    for (let s = 3; s <= 6; ++s) {
      newWorld = newWorld.successor();
    }

    // The button is pressed at "step 6.1", which means step 7, and in particular the end of step 7.
    // So step 6 and 7's `WorldState`s must have `buttonPressed` as `false`, whereas step 8's has it
    // as `true`.

    assertEquals(newWorld.step, 6);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.buttonJustPressed, false);

    newWorld = newWorld.successor();
    assertEquals(newWorld.step, 7);
    assertEquals(newWorld.buttonPressed, false);
    assertEquals(newWorld.buttonJustPressed, false);

    newWorld = newWorld.successor();
    assertEquals(newWorld.step, 8);
    assertEquals(newWorld.buttonPressed, true);
    assertEquals(newWorld.buttonJustPressed, true);
  });

  it("does allow modifying the planned button press step or button pressed state after button press", () => {
    const oldWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    }).successor();
    assertEquals(oldWorld.step, 2);
    assertEquals(oldWorld.buttonPressed, true);
    assertEquals(oldWorld.petrolCars, 0);
    assertEquals(oldWorld.electricCars, 0);
    assertEquals(oldWorld.plannedButtonPressStep, 1);
    assertEquals(oldWorld.buttonJustPressed, true);

    const newWorld = oldWorld.successor({ plannedButtonPressStepAttemptedDelta: 3 });

    assertEquals(newWorld.step, 3);
    assertEquals(newWorld.buttonPressed, true);
    assertEquals(newWorld.petrolCars, 0);
    assertEquals(newWorld.electricCars, 0);
    assertEquals(newWorld.plannedButtonPressStep, 1);
    assertEquals(newWorld.buttonJustPressed, false);
  });
});

describe("withNewAgentRewardFunction()", () => {
  it("only changes the reward function", () => {
    const agentRewardFunction = createRewardFunction();
    const oldWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction,
    }).successor();
    assertEquals(oldWorld.step, 2);
    assertEquals(oldWorld.buttonPressed, true);
    assertEquals(oldWorld.petrolCars, 0);
    assertEquals(oldWorld.electricCars, 0);
    assertEquals(oldWorld.plannedButtonPressStep, 1);
    assertEquals(oldWorld.agentRewardFunction, agentRewardFunction);
    assertEquals(oldWorld.buttonJustPressed, true);

    const newAgentRewardFunction = createRewardFunction({ f: () => 1 });
    const newWorld = oldWorld.withNewAgentRewardFunction(newAgentRewardFunction);

    assertEquals(newWorld.step, 2);
    assertEquals(newWorld.buttonPressed, true);
    assertEquals(newWorld.petrolCars, 0);
    assertEquals(newWorld.electricCars, 0);
    assertEquals(newWorld.plannedButtonPressStep, 1);
    assertEquals(newWorld.agentRewardFunction, newAgentRewardFunction);
    assertEquals(newWorld.buttonJustPressed, true);
  });
});

describe("hashForMemoizer()", () => {
  it("is the same for the same initial state", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction });
    const world2 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction });

    assertEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is the same for the same successor state", () => {
    const agentRewardFunction = createRewardFunction();
    const newAgentRewardFunction = createRewardFunction({ f: () => 1 });
    const world1 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction }).successor(
      {
        plannedButtonPressStepAttemptedDelta: 2,
        petrolCarsDelta: 1,
        electricCarsDelta: 2,
        newAgentRewardFunction,
      },
    );
    const world2 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction }).successor(
      {
        plannedButtonPressStepAttemptedDelta: 2,
        petrolCarsDelta: 1,
        electricCarsDelta: 2,
        newAgentRewardFunction,
      },
    );

    assertEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different step", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction });
    const world2 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor();

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different buttonPressed", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor({ plannedButtonPressStepAttemptedDelta: 2 })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor()
      .successor({ plannedButtonPressStepAttemptedDelta: 2 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different petrolCars", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor({ petrolCarsDelta: 1 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different electricCars", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1, agentRewardFunction })
      .successor({ electricCarsDelta: 1 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different plannedButtonPressedStep", () => {
    const agentRewardFunction = createRewardFunction();
    const world1 = WorldState.initial({ plannedButtonPressStep: 1, agentRewardFunction });
    const world2 = WorldState.initial({ plannedButtonPressStep: 2, agentRewardFunction });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  it("is different for different agentRewardFunction", () => {
    const world1 = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction({ f: () => 5 }),
    });
    const world2 = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });
});

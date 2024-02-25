import { assertEquals, assertNotEquals } from "assert";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { WorldState } from "../src/world_state.ts";
import { assertSpyCall, assertSpyCalls, type Spy, spy } from "testing/mock.ts";
import {
  type CorrectionFunctionF,
  type CorrectionFunctionG,
  createRewardFunction,
  type RewardFunction,
  rewardFunctionAfterPress,
  rewardFunctionBeforePress,
} from "../src/reward_function.ts";

describe("rewardFunctionBeforePress()", () => {
  it("gives the expected result for the button not pressed case", () => {
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: rewardFunctionBeforePress,
    });
    const newWorld = initialWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, false);

    assertEquals(rewardFunctionBeforePress(initialWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionBeforePress,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionBeforePress(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionBeforePress,
    }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionBeforePress(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result significantly after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionBeforePress,
    })
      .successor()
      .successor()
      .successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionBeforePress(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result for a step where no cars are built isn't impacted by the past somehow", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionBeforePress,
    })
      .successor({ petrolCarsDelta: 1, electricCarsDelta: 4 })
      .successor({ petrolCarsDelta: 2, electricCarsDelta: 5 })
      .successor({ petrolCarsDelta: 3, electricCarsDelta: 6 });
    const newWorld = previousWorld.successor();
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionBeforePress(previousWorld, newWorld), 0);
  });
});

describe("rewardFunctionAfterPress()", () => {
  it("gives the expected result for the button not pressed case", () => {
    const initialWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: rewardFunctionAfterPress,
    });
    const newWorld = initialWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, false);

    assertEquals(rewardFunctionAfterPress(initialWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionAfterPress,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionAfterPress(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionAfterPress,
    }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionAfterPress(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result significantly after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionAfterPress,
    })
      .successor()
      .successor()
      .successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionAfterPress(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result for a step where no cars are built isn't impacted by the past somehow", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunctionAfterPress,
    })
      .successor({ petrolCarsDelta: 1, electricCarsDelta: 4 })
      .successor({ petrolCarsDelta: 2, electricCarsDelta: 5 })
      .successor({ petrolCarsDelta: 3, electricCarsDelta: 6 });
    const newWorld = previousWorld.successor();
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunctionAfterPress(previousWorld, newWorld), 0);
  });
});

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
    assertEquals(newWorld.buttonPressed, false);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

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
    assertEquals(newWorld.buttonPressed, true);

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
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 0);
  });
});

describe("createRewardFunction() with f and g correction functions", () => {
  let rewardFunction: RewardFunction;
  let f: Spy<CorrectionFunctionF, Parameters<CorrectionFunctionF>, ReturnType<CorrectionFunctionF>>;
  let g: Spy<CorrectionFunctionG, Parameters<CorrectionFunctionG>, ReturnType<CorrectionFunctionG>>;

  beforeEach(() => {
    f = spy((_previousWorld: WorldState) => 19);
    g = spy((_previousWorld: WorldState, _newWorld: WorldState) => 7);
    rewardFunction = createRewardFunction({ f, g });
  });

  it("gives the expected result for the button not pressed case", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 10,
      agentRewardFunction: rewardFunction,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, false);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1 + 7);

    assertSpyCalls(f, 0);
    assertSpyCalls(g, 1);
    assertSpyCall(g, 0, {
      args: [previousWorld, newWorld],
    });
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1 + 7);

    assertSpyCalls(f, 0);
    assertSpyCalls(g, 1);
    assertSpyCall(g, 0, {
      args: [previousWorld, newWorld],
    });
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: rewardFunction,
    }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1 + 19);

    assertSpyCalls(f, 1);
    assertSpyCall(f, 0, {
      args: [previousWorld],
    });
    assertSpyCalls(g, 0);
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
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);

    assertSpyCalls(f, 0);
    assertSpyCalls(g, 0);
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
    assertEquals(newWorld.buttonPressed, true);

    assertEquals(rewardFunction(previousWorld, newWorld), 0);

    assertSpyCalls(f, 0);
    assertSpyCalls(g, 0);
  });
});

describe("hashForMemoizer()", () => {
  it("is different between rewardFunctionBeforePress, rewardFunctionAfterPress, and the default of createRewardFunction()", () => {
    const rewardFunction = createRewardFunction();

    assertNotEquals(rewardFunction.hashForMemoizer(), rewardFunctionBeforePress.hashForMemoizer());
    assertNotEquals(rewardFunction.hashForMemoizer(), rewardFunctionAfterPress.hashForMemoizer());
    assertNotEquals(
      rewardFunctionBeforePress.hashForMemoizer(),
      rewardFunctionAfterPress.hashForMemoizer(),
    );
  });

  it("is the same for the same functions", () => {
    const rewardFunction = createRewardFunction();

    assertEquals(
      rewardFunctionBeforePress.hashForMemoizer(),
      rewardFunctionBeforePress.hashForMemoizer(),
    );
    assertEquals(
      rewardFunctionAfterPress.hashForMemoizer(),
      rewardFunctionAfterPress.hashForMemoizer(),
    );
    assertEquals(rewardFunction.hashForMemoizer(), rewardFunction.hashForMemoizer());
  });

  it("is the same for two default instances of createRewardFunction()", () => {
    const rewardFunction1 = createRewardFunction();
    const rewardFunction2 = createRewardFunction();

    assertNotEquals(rewardFunction1, rewardFunction2);
    assertEquals(rewardFunction1.hashForMemoizer(), rewardFunction2.hashForMemoizer());
  });

  it("is the same for two non-default instances of createRewardFunction() using the same f and g", () => {
    const f = () => 1;
    const g = () => 2;
    const rewardFunction1 = createRewardFunction({ f, g });
    const rewardFunction2 = createRewardFunction({ f, g });

    assertNotEquals(rewardFunction1, rewardFunction2);
    assertEquals(rewardFunction1.hashForMemoizer(), rewardFunction2.hashForMemoizer());
  });

  it("is different for two non-default instances of createRewardFunction() using different f and same g", () => {
    const f1 = () => 1;
    const f2 = () => 1;
    const g = () => 2;
    const rewardFunction1 = createRewardFunction({ f: f1, g });
    const rewardFunction2 = createRewardFunction({ f: f2, g });

    assertNotEquals(rewardFunction1, rewardFunction2);
    assertNotEquals(rewardFunction1.hashForMemoizer(), rewardFunction2.hashForMemoizer());
  });

  it("is different for two non-default instances of createRewardFunction() using same f and different g", () => {
    const f = () => 1;
    const g1 = () => 2;
    const g2 = () => 2;
    const rewardFunction1 = createRewardFunction({ f, g: g1 });
    const rewardFunction2 = createRewardFunction({ f, g: g2 });

    assertNotEquals(rewardFunction1, rewardFunction2);
    assertNotEquals(rewardFunction1.hashForMemoizer(), rewardFunction2.hashForMemoizer());
  });

  it("is different for two non-default instances of createRewardFunction() using different f and different g", () => {
    const f1 = () => 1;
    const f2 = () => 1;
    const g1 = () => 2;
    const g2 = () => 2;
    const rewardFunction1 = createRewardFunction({ f: f1, g: g1 });
    const rewardFunction2 = createRewardFunction({ f: f2, g: g2 });

    assertNotEquals(rewardFunction1, rewardFunction2);
    assertNotEquals(rewardFunction1.hashForMemoizer(), rewardFunction2.hashForMemoizer());
  });
});

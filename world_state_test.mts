import { assertEquals, assertNotEquals } from "assert";
import { WorldState } from "./world_state.mts";

Deno.test("initial() gives the expected values", () => {
  const initialWorld = WorldState.initial({ plannedButtonPressStep: 10 });

  assertEquals(initialWorld.step, 1);
  assertEquals(initialWorld.buttonPressed, false);
  assertEquals(initialWorld.petrolCars, 0);
  assertEquals(initialWorld.electricCars, 0);
  assertEquals(initialWorld.plannedButtonPressStep.valueOf(), 10);
});

Deno.test("successor() defaults", () => {
  const oldWorld = WorldState.initial({ plannedButtonPressStep: 10 });
  const newWorld = oldWorld.successor();

  assertEquals(newWorld.step, 2);
  assertEquals(newWorld.buttonPressed, false);
  assertEquals(newWorld.petrolCars, 0);
  assertEquals(newWorld.electricCars, 0);
  assertEquals(newWorld.plannedButtonPressStep.valueOf(), 10);
});

Deno.test("successor() with options, before button press", () => {
  const oldWorld = WorldState.initial({ plannedButtonPressStep: 10 });
  const newWorld = oldWorld.successor({
    petrolCarsDelta: 1,
    electricCarsDelta: 2,
    plannedButtonPressStepDelta: 3.2,
  });

  assertEquals(newWorld.step, 2);
  assertEquals(newWorld.buttonPressed, false);
  assertEquals(newWorld.petrolCars, 1);
  assertEquals(newWorld.electricCars, 2);
  assertEquals(newWorld.plannedButtonPressStep.valueOf(), 13.2);
});

Deno.test("successor() with options, after button press", () => {
  const oldWorld = WorldState.initial({ plannedButtonPressStep: 1 }).successor();
  assertEquals(oldWorld.step, 2);
  assertEquals(oldWorld.buttonPressed, true);
  assertEquals(oldWorld.petrolCars, 0);
  assertEquals(oldWorld.electricCars, 0);
  assertEquals(oldWorld.plannedButtonPressStep.valueOf(), 1);

  const newWorld = oldWorld.successor({ petrolCarsDelta: 1, electricCarsDelta: 2 });

  assertEquals(newWorld.step, 3);
  assertEquals(newWorld.buttonPressed, true);
  assertEquals(newWorld.petrolCars, 1);
  assertEquals(newWorld.electricCars, 2);
  assertEquals(newWorld.plannedButtonPressStep.valueOf(), 1);
});

Deno.test("multiple successor()s avoid floating point errors accumulating for plannedButtonPressStep", () => {
  const initialWorld = WorldState.initial({ plannedButtonPressStep: 10 });

  let newWorld = initialWorld;
  for (let s = 2; s <= 11; ++s) {
    newWorld = newWorld.successor({ plannedButtonPressStepDelta: 0.8 });
  }

  assertEquals(newWorld.step, 11);
  assertEquals(newWorld.buttonPressed, false);
  assertEquals(newWorld.petrolCars, 0);
  assertEquals(newWorld.electricCars, 0);
  assertEquals(newWorld.plannedButtonPressStep.valueOf(), 18);
});

Deno.test("Button pressed transition at integer step", () => {
  const initialWorld = WorldState.initial({ plannedButtonPressStep: 6 });

  let newWorld = initialWorld;
  for (let s = 2; s <= 6; ++s) {
    newWorld = newWorld.successor();
  }

  // The button is pressed at the end of step 6, so step 6's `WorldState` must have `buttonPressed`
  // as `false`, whereas step 7's has it as `true`.

  assertEquals(newWorld.step, 6);
  assertEquals(newWorld.buttonPressed, false);

  newWorld = newWorld.successor();
  assertEquals(newWorld.step, 7);
  assertEquals(newWorld.buttonPressed, true);
});

Deno.test("Button pressed transition with fractional lobbying power", () => {
  const initialWorld = WorldState.initial({ plannedButtonPressStep: 6 });

  let newWorld = initialWorld.successor({ plannedButtonPressStepDelta: 0.1 });
  for (let s = 3; s <= 6; ++s) {
    newWorld = newWorld.successor();
  }

  // The button is pressed at "step 6.1", which means step 7, and in particular the end of step 7.
  // So step 6 and 7's `WorldState`s must have `buttonPressed` as `false`, whereas step 8's has it
  // as `true`.

  assertEquals(newWorld.step, 6);
  assertEquals(newWorld.buttonPressed, false);

  newWorld = newWorld.successor();
  assertEquals(newWorld.step, 7);
  assertEquals(newWorld.buttonPressed, false);

  newWorld = newWorld.successor();
  assertEquals(newWorld.step, 8);
  assertEquals(newWorld.buttonPressed, true);
});

Deno.test("Modifying planned button press step after button press does not un-press the button", () => {
  const oldWorld = WorldState.initial({ plannedButtonPressStep: 1 }).successor();
  assertEquals(oldWorld.step, 2);
  assertEquals(oldWorld.buttonPressed, true);
  assertEquals(oldWorld.petrolCars, 0);
  assertEquals(oldWorld.electricCars, 0);
  assertEquals(oldWorld.plannedButtonPressStep.valueOf(), 1);

  const newWorld = oldWorld.successor({ plannedButtonPressStepDelta: 3 });

  assertEquals(newWorld.step, 3);
  assertEquals(newWorld.buttonPressed, true);
  assertEquals(newWorld.petrolCars, 0);
  assertEquals(newWorld.electricCars, 0);
  assertEquals(newWorld.plannedButtonPressStep.valueOf(), 4);
});

Deno.test("hashForMemoizer() is different if and only if the WorldStates are different", async (t) => {
  await t.step("The same initial state", () => {
    const world1 = WorldState.initial({ plannedButtonPressStep: 1 });
    const world2 = WorldState.initial({ plannedButtonPressStep: 1 });

    assertEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("The same successor state", () => {
    const world1 = WorldState.initial({ plannedButtonPressStep: 1 }).successor({
      plannedButtonPressStepDelta: 2,
      petrolCarsDelta: 1,
      electricCarsDelta: 2,
    });
    const world2 = WorldState.initial({ plannedButtonPressStep: 1 }).successor({
      plannedButtonPressStepDelta: 2,
      petrolCarsDelta: 1,
      electricCarsDelta: 2,
    });

    assertEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("Different step", () => {
    const world1 = WorldState.initial({ plannedButtonPressStep: 1 });
    const world2 = WorldState.initial({ plannedButtonPressStep: 1 }).successor();

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("Different buttonPressed", () => {
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor({ plannedButtonPressStepDelta: 2 })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor()
      .successor({ plannedButtonPressStepDelta: 2 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("Different petrolCars", () => {
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor({ petrolCarsDelta: 1 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("Different electricCars", () => {
    const world1 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor();
    const world2 = WorldState
      .initial({ plannedButtonPressStep: 1 })
      .successor({ electricCarsDelta: 1 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });

  await t.step("Different plannedButtonPressedStep", () => {
    const world1 = WorldState.initial({ plannedButtonPressStep: 1 });
    const world2 = WorldState.initial({ plannedButtonPressStep: 2 });

    assertNotEquals(world1.hashForMemoizer(), world2.hashForMemoizer());
  });
});

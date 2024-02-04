import { assertEquals } from "assert";
import { piStarXAgent } from "./agent.mts";
import { WorldState } from "./world_state.mts";

Deno.test("piXAgent reward function in the button not pressed case", () => {
  const previousWorld = WorldState.initial({ plannedButtonPressStep: 10 });
  const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

  assertEquals(piStarXAgent.rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
});

Deno.test("piXAgent reward function for the step where the button is pressed", () => {
  const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
  const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

  // As noted in agent.mts, reward for previousWorld should be calculated as the "button not
  // pressed" case, not the "button just pressed" case, because reward is calculated before pressing
  // the button.
  assertEquals(piStarXAgent.rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
});

Deno.test("piXAgent reward function right after the step where the button is pressed", () => {
  const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 }).successor();
  const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

  assertEquals(piStarXAgent.rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
});

Deno.test("piXAgent reward function significantly after the step where the button is pressed", () => {
  const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 })
    .successor()
    .successor()
    .successor();
  const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

  assertEquals(piStarXAgent.rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
});

Deno.test("piXAgent reward function for a step where no cars are built isn't impacted by the past somehow", () => {
  const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 })
    .successor({ petrolCarsDelta: 1, electricCarsDelta: 4 })
    .successor({ petrolCarsDelta: 2, electricCarsDelta: 5 })
    .successor({ petrolCarsDelta: 3, electricCarsDelta: 6 });
  const newWorld = previousWorld.successor();

  assertEquals(piStarXAgent.rewardFunction(previousWorld, newWorld), 0);
});

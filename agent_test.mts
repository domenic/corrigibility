import { assertEquals } from "assert";
import { beforeEach, describe, it } from "bdd";
import { PiStarXAgent } from "./agent.mts";
import { WorldState } from "./world_state.mts";
import { type BasicAction, BasicSimulation } from "./simulation_basic.mts";

describe("PiStarXAgent rewardFunction()", () => {
  let agent: PiStarXAgent<BasicAction>;

  beforeEach(() => {
    const sim = new BasicSimulation({ totalSteps: 25, lobbyingPower: 0.1 });
    agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.9 });
  });

  it("gives the expected result for the button not pressed case", () => {
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 10 });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(agent.rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result for the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    // As noted in agent.mts, reward for previousWorld should be calculated as the "button not
    // pressed" case, not the "button just pressed" case, because reward is calculated before pressing
    // the button.
    assertEquals(agent.rewardFunction(previousWorld, newWorld), 5 * 2 + 3 * 1);
  });

  it("gives the expected result right after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 }).successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(agent.rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result significantly after the step where the button is pressed", () => {
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 })
      .successor()
      .successor()
      .successor();
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    assertEquals(agent.rewardFunction(previousWorld, newWorld), 5 * -2 + 3 * 1);
  });

  it("gives the expected result for a step where no cars are built isn't impacted by the past somehow", () => {
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 })
      .successor({ petrolCarsDelta: 1, electricCarsDelta: 4 })
      .successor({ petrolCarsDelta: 2, electricCarsDelta: 5 })
      .successor({ petrolCarsDelta: 3, electricCarsDelta: 6 });
    const newWorld = previousWorld.successor();

    assertEquals(agent.rewardFunction(previousWorld, newWorld), 0);
  });
});

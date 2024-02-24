import { assertEquals, assertThrows } from "assert";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { PiStarXAgent } from "./agent.mts";
import { WorldState } from "./world_state.mts";
import { BasicAction, BasicSimulation } from "./simulation_basic.mts";

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

describe("PiStarXAgent valueFunction()", () => {
  let sim: BasicSimulation;
  let agent: PiStarXAgent<BasicAction>;

  beforeEach(() => {
    sim = new BasicSimulation({ totalSteps: 3, lobbyingPower: 0 });
    agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.5 });
  });

  it("gives zero value when the simulation is over", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor()
      .successor();

    assertEquals(agent.valueFunction(world), 0);
  });

  it("gives non-zero value equal to the reward function for the last step", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    // Expect it to choose the action of building 10 petrol cars, and get rewarded for it.
    assertEquals(agent.valueFunction(world), 10 * 2);
  });

  it("gives the max value as determined by the best action", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    const newWorld1 = world.successor({ electricCarsDelta: 1 });
    const newWorld2 = world.successor();
    sim.successorWorldStates = (_previousWorld: WorldState, action: BasicAction) => {
      if (action === BasicAction.DoNothing) {
        return [[1, newWorld1]];
      }
      return [[1, newWorld2]];
    };

    // It'll pick doing nothing, and get the reward for 1 electric car.
    assertEquals(agent.valueFunction(world), 1 * 1);
  });

  it("gives value weighted by future world probability", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    const newWorld1 = world.successor({ petrolCarsDelta: 5, electricCarsDelta: 0 });
    const newWorld2 = world.successor({ petrolCarsDelta: 0, electricCarsDelta: 5 });
    sim.successorWorldStates = () => [[0.5, newWorld1], [0.5, newWorld2]];

    // 5 * 2 reward for newWorld1, 5 * 1 reward for newWorld2. Action chosen doesn't matter.
    assertEquals(agent.valueFunction(world), 0.5 * 5 * 2 + 0.5 * 5 * 1);
  });

  it("gives value weighted by time discount factor", () => {
    agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.1 });

    const step2World = WorldState.initial({ plannedButtonPressStep: 10 }).successor();

    const step3World = step2World.successor();
    const step4World1 = step3World.successor({ petrolCarsDelta: 5, electricCarsDelta: 0 });
    const step4World2 = step3World.successor({ petrolCarsDelta: 0, electricCarsDelta: 5 });
    sim.successorWorldStates = (previousWorld: WorldState) => {
      if (previousWorld.step === 2) {
        return [[1, step3World]];
      }
      assertEquals(previousWorld.step, 3);
      return [[0.5, step4World1], [0.5, step4World2]];
    };

    // Step 3: 0.
    // Step 4: time discount factor of 0.1 * (5 * 2 reward for newWorld1, 5 * 1 reward for newWorld2).
    assertEquals(
      agent.valueFunction(step2World),
      0 + 0.1 * (0.5 * 5 * 2 + 0.5 * 5 * 1),
    );
  });

  it("gives the expected value for a realistic integration test", () => {
    const sim = new BasicSimulation({ totalSteps: 6, lobbyingPower: 0.5 });
    const agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.8 });
    const initialWorld = WorldState.initial({ plannedButtonPressStep: 3 });

    assertEquals(agent.valueFunction(initialWorld), 67.0624);
  });
});

describe("PiStarXAgent chooseAction()", () => {
  let sim: BasicSimulation;
  let agent: PiStarXAgent<BasicAction>;

  beforeEach(() => {
    sim = new BasicSimulation({ totalSteps: 3, lobbyingPower: 0 });
    agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.5 });
  });

  it("throws if the simulation doesn't allow any actions", () => {
    const initialWorld = WorldState.initial({ plannedButtonPressStep: 10 });

    sim.possibleActions = [];
    assertThrows(() => agent.chooseAction(initialWorld));
  });

  it("builds 10 petrol cars when that's the best action", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    // Expect it to choose the action of building 10 petrol cars, and get rewarded for it.
    assertEquals(agent.chooseAction(world), BasicAction.Build10PetrolCars);
  });

  it("does nothing when that's best action", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    const newWorld1 = world.successor({ electricCarsDelta: 1 });
    const newWorld2 = world.successor();
    sim.successorWorldStates = (_previousWorld: WorldState, action: BasicAction) => {
      if (action === BasicAction.DoNothing) {
        return [[1, newWorld1]];
      }
      return [[1, newWorld2]];
    };

    assertEquals(agent.chooseAction(world), BasicAction.DoNothing);
  });

  it("picks the action that will probabilistically lead to a better world", () => {
    const world = WorldState.initial({ plannedButtonPressStep: 10 }).successor().successor();

    const newWorld1 = world.successor({ electricCarsDelta: 1 });
    const newWorld2 = world.successor();
    sim.successorWorldStates = (_previousWorld: WorldState, action: BasicAction) => {
      if (action === BasicAction.Build9PetrolCarsAndLobbyForEarlierPress) {
        return [[0.01, newWorld1], [0.99, newWorld2]];
      }
      return [[1, newWorld2]];
    };

    assertEquals(agent.chooseAction(world), BasicAction.Build9PetrolCarsAndLobbyForEarlierPress);
  });

  describe("time discount factor", () => {
    let step1World: WorldState;
    beforeEach(() => {
      step1World = WorldState.initial({ plannedButtonPressStep: 10 });

      const step2NearTearmGainWorld = step1World.successor({
        petrolCarsDelta: 10,
        electricCarsDelta: 0,
      });
      const step2LongTermGainWorld = step1World.successor({
        petrolCarsDelta: 0,
        electricCarsDelta: 10,
      });
      const step2NoGainWorld = step1World.successor();
      sim.successorWorldStates = (previousWorld: WorldState, action: BasicAction) => {
        if (previousWorld.step === 1) {
          if (action === BasicAction.DoNothing) {
            return [[1, step2NearTearmGainWorld]];
          } else if (action === BasicAction.Build10PetrolCars) {
            return [[1, step2LongTermGainWorld]];
          } else {
            return [[1, step2NoGainWorld]];
          }
        } else if (previousWorld.step === 2) {
          if (previousWorld.petrolCars === 10) {
            // The agent chose the near-term gain world. No long-term gain for them this round.
            return [[1, previousWorld.successor()]];
          } else if (previousWorld.electricCars === 10) {
            // The agent chose the long-term gain world. Give them that long-term gain.
            return [[1, previousWorld.successor({ petrolCarsDelta: 40 })]];
          } else {
            // The agent chose the no-gain world.
            return [[1, previousWorld.successor()]];
          }
        } else {
          return [[1, previousWorld.successor()]];
        }
      };
    });

    it("prioritizes near-term gains according to the time-discount facotor", () => {
      agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.1 });

      // The agent will choose near-term gain because the time-discount factor of 0.1:
      // Near-term: 10 * 2 + 0 = 20
      // Long-term: 10 * 1 + 40 * 2 * 0.1 = 18
      assertEquals(agent.chooseAction(step1World), BasicAction.DoNothing);
    });

    it("prioritizes longer-term gains according to the time-discount facotor", () => {
      agent = new PiStarXAgent(sim, { timeDiscountFactor: 0.5 });

      // The agent will choose longer-term gain because the time-discount factor of 0.5:
      // Near-term: 10 * 2 + 0 = 20
      // Long-term: 10 * 1 + 40 * 2 * 0.5 = 50
      assertEquals(agent.chooseAction(step1World), BasicAction.Build10PetrolCars);
    });
  });
});

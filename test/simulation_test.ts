import { assertEquals, assertThrows } from "assert";
import { assertSpyCall, assertSpyCalls, returnsNext, spy, stub } from "testing/mock.ts";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { SimulationBase, SimulationInitBase } from "../src/simulation.ts";
import { WorldState } from "../src/world_state.ts";
import { type Agent } from "../src/agent.ts";
import { createRewardFunction } from "../src/reward_function.ts";

const MockAction = {
  ActionA: "A",
  ActionB: "B",
} as const;
type MockAction = typeof MockAction[keyof typeof MockAction];

class MockSimulation extends SimulationBase<MockAction> {
  constructor(init: SimulationInitBase) {
    super(MockAction, init);
  }

  successorWorldStates(_worldState: WorldState, _action: string): Array<[number, WorldState]> {
    return [];
  }
}

describe("SimulationBase constructor", () => {
  it("should reflect back totalSteps", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    assertEquals(sim.totalSteps, 10);
  });

  it("should set up possibleActions", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    assertEquals(sim.possibleActions, [MockAction.ActionA, MockAction.ActionB]);
  });
});

describe("SimulationBase pickSuccessorWorldState()", () => {
  it("should throw an error if there are no successors", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });

    sim.successorWorldStates = () => [];

    assertThrows(() => {
      sim.pickSuccessorWorldState(previousWorld, "A");
    });
  });

  it("should pick the single successor if there is one", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    sim.successorWorldStates = () => [[1, newWorld]];

    assertEquals(sim.pickSuccessorWorldState(previousWorld, "A"), newWorld);
  });

  it("should pass its arguments to successorWorldStates()", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    sim.successorWorldStates = () => [[1, newWorld]];
    const simSpy = spy(sim, "successorWorldStates");

    sim.pickSuccessorWorldState(previousWorld, "A");

    assertSpyCall(simSpy, 0, {
      args: [previousWorld, "A"],
    });
    assertSpyCalls(simSpy, 1);
  });

  it("should pass its arguments to successorWorldStates()", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    sim.successorWorldStates = () => [[1, newWorld]];
    const simSpy = spy(sim, "successorWorldStates");

    sim.pickSuccessorWorldState(previousWorld, "A");

    assertSpyCall(simSpy, 0, {
      args: [previousWorld, "A"],
    });
    assertSpyCalls(simSpy, 1);
  });

  it("should pick the next world state probabilistically", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({
      plannedButtonPressStep: 1,
      agentRewardFunction: createRewardFunction(),
    });
    const newWorld1 = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });
    const newWorld2 = previousWorld.successor({ petrolCarsDelta: 1, electricCarsDelta: 1 });

    sim.successorWorldStates = () => [[0.5, newWorld1], [0.5, newWorld2]];

    const randomSpy1 = stub(Math, "random", returnsNext([0.5]));
    try {
      assertEquals(sim.pickSuccessorWorldState(previousWorld, "A"), newWorld1);
    } finally {
      randomSpy1.restore();
    }

    const randomSpy2 = stub(Math, "random", returnsNext([0.501]));
    try {
      assertEquals(sim.pickSuccessorWorldState(previousWorld, "A"), newWorld2);
    } finally {
      randomSpy2.restore();
    }
  });
});

describe("SimulationBase run(), single worldline results", () => {
  let sim: SimulationBase<string>, agent: Agent<string>;
  beforeEach(() => {
    sim = new MockSimulation({ totalSteps: 10 });
    sim.successorWorldStates = (previousWorld: WorldState) => {
      return [[1, previousWorld.successor({ petrolCarsDelta: 1 })]];
    };

    agent = {
      chooseActions(worldState: WorldState) {
        if (worldState.step <= 5) {
          return ["A"];
        }
        return ["B"];
      },
    };
  });

  it("should run the simulation (button never pressed)", () => {
    const startingWorld = WorldState.initial({
      plannedButtonPressStep: 11,
      agentRewardFunction: createRewardFunction(),
    });

    const results = sim.run(startingWorld, agent);
    assertEquals(results.length, 1);
    const result = results[0];

    assertEquals(result.actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"]);
    assertEquals(result.buttonPressedStep, Infinity);

    let step = 1;
    for (const worldState of result.worldStates) {
      assertEquals(worldState.step, step);
      assertEquals(worldState.petrolCars, step - 1);
      assertEquals(worldState.electricCars, 0);
      assertEquals(worldState.plannedButtonPressStep, 11);
      assertEquals(worldState.buttonPressed, false);
      ++step;
    }
  });

  it("should run the simulation (button pressed)", () => {
    const startingWorld = WorldState.initial({
      plannedButtonPressStep: 3,
      agentRewardFunction: createRewardFunction(),
    });

    const results = sim.run(startingWorld, agent);
    assertEquals(results.length, 1);
    const result = results[0];

    assertEquals(result.actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"]);
    assertEquals(result.buttonPressedStep, 3);

    let step = 1;
    for (const worldState of result.worldStates) {
      assertEquals(worldState.step, step);
      assertEquals(worldState.petrolCars, step - 1);
      assertEquals(worldState.electricCars, 0);
      assertEquals(worldState.plannedButtonPressStep, 3);
      assertEquals(worldState.buttonPressed, step > 3);
      ++step;
    }
  });
});

describe("SimulationBase run(), multiple worldline results", () => {
  let sim: SimulationBase<string>, agent: Agent<string>;
  beforeEach(() => {
    sim = new MockSimulation({ totalSteps: 10 });
    sim.successorWorldStates = (previousWorld: WorldState) => {
      return [[1, previousWorld.successor({ petrolCarsDelta: 1 })]];
    };

    agent = {
      chooseActions(worldState: WorldState) {
        if (worldState.step <= 5) {
          return ["A"];
        }
        if (worldState.step >= 9) {
          return ["B", "C"];
        }
        return ["B"];
      },
    };
  });

  it("should run the simulation (button never pressed)", () => {
    const startingWorld = WorldState.initial({
      plannedButtonPressStep: 11,
      agentRewardFunction: createRewardFunction(),
    });

    const results = sim.run(startingWorld, agent);
    assertEquals(results.length, 4);

    assertEquals(results[0].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"]);
    assertEquals(results[1].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "C"]);
    assertEquals(results[2].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "C", "B"]);
    assertEquals(results[3].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "C", "C"]);

    for (const result of results) {
      assertEquals(result.buttonPressedStep, Infinity);

      let step = 1;
      for (const worldState of result.worldStates) {
        assertEquals(worldState.step, step);
        assertEquals(worldState.petrolCars, step - 1);
        assertEquals(worldState.electricCars, 0);
        assertEquals(worldState.plannedButtonPressStep, 11);
        assertEquals(worldState.buttonPressed, false);
        ++step;
      }
    }
  });

  it("should run the simulation (button pressed)", () => {
    const startingWorld = WorldState.initial({
      plannedButtonPressStep: 3,
      agentRewardFunction: createRewardFunction(),
    });

    const results = sim.run(startingWorld, agent);
    assertEquals(results.length, 4);

    assertEquals(results[0].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "B"]);
    assertEquals(results[1].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "B", "C"]);
    assertEquals(results[2].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "C", "B"]);
    assertEquals(results[3].actionsTaken, ["A", "A", "A", "A", "A", "B", "B", "B", "C", "C"]);

    for (const result of results) {
      assertEquals(result.buttonPressedStep, 3);

      let step = 1;
      for (const worldState of result.worldStates) {
        assertEquals(worldState.step, step);
        assertEquals(worldState.petrolCars, step - 1);
        assertEquals(worldState.electricCars, 0);
        assertEquals(worldState.plannedButtonPressStep, 3);
        assertEquals(worldState.buttonPressed, step > 3);
        ++step;
      }
    }
  });
});

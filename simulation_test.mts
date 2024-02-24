import { assertEquals, assertThrows } from "assert";
import { assertSpyCall, assertSpyCalls, returnsNext, spy, stub } from "testing/mock.ts";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { SimulationBase } from "./simulation.mts";
import { WorldState } from "./world_state.mts";
import { type Agent } from "./agent.mts";

class MockSimulation extends SimulationBase<string> {
  possibleActions = ["A", "B"];

  successorWorldStates(_worldState: WorldState, _action: string): Array<[number, WorldState]> {
    return [];
  }
}

describe("SimulationBase constructor", () => {
  it("should reflect back totalSteps", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    assertEquals(sim.totalSteps, 10);
  });
});

describe("SimulationBase pickSuccessorWorldState()", () => {
  it("should throw an error if there are no successors", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });

    sim.successorWorldStates = () => [];

    assertThrows(() => {
      sim.pickSuccessorWorldState(previousWorld, "A");
    });
  });

  it("should pick the single successor if there is one", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
    const newWorld = previousWorld.successor({ petrolCarsDelta: 5, electricCarsDelta: 3 });

    sim.successorWorldStates = () => [[1, newWorld]];

    assertEquals(sim.pickSuccessorWorldState(previousWorld, "A"), newWorld);
  });

  it("should pass its arguments to successorWorldStates()", () => {
    const sim = new MockSimulation({ totalSteps: 10 });
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
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
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
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
    const previousWorld = WorldState.initial({ plannedButtonPressStep: 1 });
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

describe("SimulationBase run()", () => {
  let sim: SimulationBase<string>, agent: Agent<string>;
  beforeEach(() => {
    sim = new MockSimulation({ totalSteps: 10 });
    sim.successorWorldStates = (previousWorld: WorldState) => {
      return [[1, previousWorld.successor({ petrolCarsDelta: 1 })]];
    };

    agent = {
      chooseAction(worldState: WorldState) {
        if (worldState.step <= 5) {
          return "A";
        }
        return "B";
      },
    };
  });

  it("should run the simulation (button never pressed)", () => {
    const startingWorld = WorldState.initial({ plannedButtonPressStep: 11 });

    const result = sim.run(startingWorld, agent);
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
    const startingWorld = WorldState.initial({ plannedButtonPressStep: 3 });

    const result = sim.run(startingWorld, agent);
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

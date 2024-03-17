import { assertEquals } from "assert";
import { beforeEach, describe, it } from "testing/bdd.ts";
import { WorldState } from "../src/world_state.ts";
import { SimulationResult } from "../src/simulation_result.ts";
import { createRewardFunction } from "../src/reward_function.ts";

let worldStates: Array<WorldState>;
beforeEach(() => {
  worldStates = [
    WorldState.initial({ plannedButtonPressStep: 10, agentRewardFunction: createRewardFunction() }),
  ];
  for (let i = 0; i < 4; ++i) {
    worldStates.push(worldStates.at(-1)!.successor());
  }
});

describe("Initialization", () => {
  it("should correctly initialize its properties", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      worldStates,
      buttonPressedStep: 1,
    });

    assertEquals(simulationResult.actionsTaken, ["A", "B", "A", "C"]);
    assertEquals(simulationResult.worldStates, worldStates);
    assertEquals(simulationResult.buttonPressedStep, 1);
  });
});

describe("trace()", () => {
  it("should return correct trace when buttonPressedStep is not Infinity", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      worldStates,
      buttonPressedStep: 1,
    });

    assertEquals(simulationResult.trace(), "A#BAC");
  });

  it("should return correct trace when buttonPressedStep is Infinity", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      worldStates,
      buttonPressedStep: Infinity,
    });

    assertEquals(simulationResult.trace(), "ABAC");
  });
});

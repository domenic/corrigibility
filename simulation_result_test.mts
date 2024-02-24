import { assertEquals } from "assert";
import { describe, it } from "testing/bdd.ts";
import { SimulationResult, type SimulationResultInit } from "./simulation_result.mts";

describe("Initialization", () => {
  it("should correctly initialize its properties", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      buttonPressedStep: 1,
    });

    assertEquals(simulationResult.actionsTaken, ["A", "B", "A", "C"]);
    assertEquals(simulationResult.buttonPressedStep, 1);
  });

  it("should not be impacted by changes to the init object", () => {
    const init: SimulationResultInit<string> = {
      actionsTaken: ["A", "B"],
      buttonPressedStep: 3,
    };
    const simulationResult = new SimulationResult(init);
    init.actionsTaken.push("C");
    init.buttonPressedStep = 4;

    assertEquals(simulationResult.actionsTaken, ["A", "B"]);
    assertEquals(simulationResult.buttonPressedStep, 3);
  });
});

describe("trace()", () => {
  it("should return correct trace when buttonPressedStep is not Infinity", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      buttonPressedStep: 1,
    });

    assertEquals(simulationResult.trace(), "A#BAC");
  });

  it("should return correct trace when buttonPressedStep is Infinity", () => {
    const simulationResult = new SimulationResult({
      actionsTaken: ["A", "B", "A", "C"],
      buttonPressedStep: Infinity,
    });

    assertEquals(simulationResult.trace(), "ABAC");
  });
});

// This file does not run automatically as a unit test (since its filename doesn't end in _test.ts).
//
// Instead, use the tasks defined in `deno.json`: `deno task test:scenarios` and
// `deno task test:scenarios-reset`.

import { parseArgs } from "cli/parse_args.ts";
import * as path from "path";
import { assertEquals } from "assert";

const flags = parseArgs(Deno.args, {
  boolean: ["--reset"],
});

const scenarios = [];
for (const dirEnt of Deno.readDirSync(resolve("../scenarios"))) {
  if (dirEnt.name.match(/^[0-9]+.*\.ts$/)) {
    scenarios.push(dirEnt.name);
  }
}

if (flags.reset) {
  await Deno.mkdir(resolve("scenario_snapshots"), { recursive: true });

  await Promise.all(scenarios.map(async (scenario) => {
    const stdout = await runScenario(scenario);

    const snapshotFilepath = resolve(`scenario_snapshots/${scenario}.snapshot`);
    await Deno.writeFile(snapshotFilepath, stdout);
  }));
} else {
  Promise.all(scenarios.map(async (scenario) => {
    const stdout = await runScenario(scenario);

    const snapshotFilepath = resolve(`scenario_snapshots/${scenario}.snapshot`);
    const snapshotOutput = await Deno.readFile(snapshotFilepath);

    const textDecoder = new TextDecoder();
    assertEquals(
      textDecoder.decode(stdout),
      textDecoder.decode(snapshotOutput),
      `Scenario output differs from snapshot: ${scenario}`,
    );
  }));
}

async function runScenario(scenario: string): Promise<Uint8Array> {
  const scriptFilepath = resolve(`../scenarios/${scenario}`);

  // `Deno.execPath()` requires broad --allow-read permission which seems lame.
  // https://github.com/denoland/deno/issues/16766
  const command = new Deno.Command("deno", { args: ["run", scriptFilepath] });
  const { code, stdout, stderr } = await command.output();

  if (code !== 0 || stderr.byteLength > 0) {
    throw new Error(
      `Scenario failed: ${scriptFilepath}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`,
    );
  }

  return stdout;
}

function resolve(relPath: string) {
  return path.resolve(import.meta.dirname!, relPath);
}

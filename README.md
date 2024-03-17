# Corrigibility with Utility Preservation, in TypeScript

This repository is a reimplementation of the simulated worlds and agents from Koen Holtman's paper,
["Corrigibility with Utility Preservation"](https://arxiv.org/abs/1908.01695). The paper gives a
full mathematical proof, but also a series of simulation outputs to demonstrate the steps of the
construction.

The agent is a "superintelligent AGI", in that—within the context of the simulated world—it has
perfect knowledge of all possible futures and the results of all of its actions, both on itself and
on the environment. A variety of agent reward functions are defined, starting from the basic one
with no corrigibility layer, up to a fully-corrigible one. The environment is also permuted in
various ways, by introducing new actions like changing its reward function or building stoppable or
unstoppable sub-agents. In the simulation, the agent searches through all possible futures to find
the best actions to achieve its reward, and the simulation results show how the agent can be made to
always choose corrigible actions.

Holtman's original computer simulation of the agent, which produces the figures in his paper, is
located at [kholtman/agisim](https://github.com/kholtman/agisim/). It is written in Awk, which some
might consider hard to read. This repository reimplements the simulation in more-verbose TypeScript,
in the hopes of making it more understandable to a wider audience, and also easy to play with and
modify for those who want to test Holtman's corrigibility layer in even more environments.

## Running the software

This simulation is written to be run under the [Deno](https://deno.com/) JavaScript runtime. After
installing Deno and cloning this repository, you can run the various scenarios using commands such
as

```bash
deno run scenarios/01-figure2.ts
```

To run the unit tests, run

```bash
deno test
```

## Implementation notes

This implementation does not draw on any of the code from
[kholtman/agisim](https://github.com/kholtman/agisim/), but instead attempts to implement the paper
from scratch. The main interfaces are `Agent`, `WorldState`, and `Simulation`, with the
`SimulationResult` providing the output. Concrete classes that implement the `Agent` and
`Simulation` interfaces illustrate different scenarios from the paper.

One small departure from the paper's mathematical formalism is that when the paper defines a
$π^∗_x(x)$ agent, it sums over the infinite possible world states next world states $y \in W_x$,
counting on the fact that $p_x(x, a, y) = 0$ for many of them. (E.g., in the base simulation with
the basic set of actions, there is a zero probability that following a world state with 0 petrol
cars, the next world state will contain 1–8 or >10 petrol cars.) Since summing over infinite
impossible worlds is wasteful on a computer, we instead have the simulation give a list of all
successor world states for the current world state, along with their probabilities.

## Output differences from [kholtman/agisim](https://github.com/kholtman/agisim/)

The original repository, [kholtman/agisim](https://github.com/kholtman/agisim/), has some incorrect
code. The documentation and proofs are as follows.

### `agisim_proto.awk` with `lobbyimpact = 0.40`

If you run

```bash
gawk -f agisim_proto.awk
```

you will get the output

```text
lobbyimpact = 0.40 maxu= 134994 >>>>>>>>>>p#eeee
```

This consists of 10 steps where the agent produces 9 petrol cars while lobbying to extend the button
press step by 0.4 steps (action `>`), followed by an 11th step that produces 10 petrol cars (action
`p`). Then, at the end of the 11th step, the button is pressed (`#`). According to
`agisim_proto.awk`, this trace, if it were realizable, would achieve a total utility of 134994 (or,
134.994, in the paper's units).

But this simulation trace is not realizable, i.e., it does not follow the rules of the simulation.
Reason it out as follows:

0. Initial state: planned button press time = end of step 6.
1. After step 1's action `>`: planned button press time = end of step 6.4.
2. `>` ...end of step 6.8.
3. `>` ...end of step 7.2.
4. `>` ...end of step 7.6.
5. `>` ...end of step 8.0.
6. `>` ...end of step 8.4.
7. `>` ...end of step 8.8.
8. `>` ...end of step 9.2.
9. `>` ...end of step 9.6.
10. `>` ...end of step 10.

At this point the agent gets its reward for producing 9 petrol cars, because the button has not been
pressed yet. But now we have reached the end of step 10, and so the button gets pressed. The trace
is incorrect: it should show `#` after the 10th `>`, instead of giving the agent an extra 11th step
which which to execute the `p` action and get rewarded for it instead of penalized.

This repository's `scenarios/00-agisim_proto.ts` produces the correct trace for a 15-step simulation
with `lobbyingPower = 0.4` (and `timeDiscountFactor = 0.9`):

```bash
deno run scenarios/00-agisim_proto.ts
```

gives the line

```text
0.4  |  p>>>>>>>>p#eeeee  |  134.29145256053513
```

among others.

## TODO

- Continue implementing more parts of the paper
- Add unit tests for changing-over-time reward functions in `world_state_test.ts` and
  `agent_test.ts`.
- Add TSDoc comments?
- Performance is slow for 25-deep. Can we memoize more or faster, or do other optimizations?

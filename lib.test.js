const { compute, resolveEntries } = require("./lib");

const BASH = "/bin/bash";

test("resolve empty entries", () => {
  const res = resolveEntries({}, "prefix_");
  expect(res).toEqual([]);
});

test("resolve entry keys filtered by empty prefix", () => {
  const res = resolveEntries(
    {
      key1: "value 1",
      prefixed_key1: "value 2",
    },
    ""
  );
  expect(res).toEqual([
    { name: "key1", expr: "value 1" },
    { name: "prefixed_key1", expr: "value 2" },
  ]);
});

test("resolve entry keys filtered by non-empty prefix", () => {
  const res = resolveEntries(
    {
      key1: "non-prefixed value 1",
      prefix_key1: "prefixed value 1",
      key2: "non-prefixed value 2",
      prefix_key3: "prefixed value 2",
      non_prefix_key4: "value with non-matching prefix",
    },
    "prefix_"
  );
  expect(res).toEqual([
    { name: "key1", expr: "prefixed value 1" },
    { name: "key3", expr: "prefixed value 2" },
  ]);
});

test("entry key is lower-cased", () => {
  const res = resolveEntries({ PREFIX_KEY: "value" }, "PREFIX_");
  expect(res).toEqual([{ name: "key", expr: "value" }]);
});

test("entry of fixed value", async () => {
  const res = await compute([{ name: "key", expr: "value" }], BASH);
  expect(res).toEqual({ key: "value" });
});

test("entries of fixed and computed values", async () => {
  const res = await compute(
    [
      { name: "key1", expr: "value" },
      { name: "key2", expr: "key1=${key1}" },
    ],
    BASH
  );
  expect(res).toEqual({ key1: "value", key2: "key1=value" });
});

test("entries of fixed and computed values in reverse lexicographic order", async () => {
  const res = await compute(
    [
      { name: "key2", expr: "value" },
      { name: "key1", expr: "key2=${key2}" },
    ],
    BASH
  );
  expect(res).toEqual({ key2: "value", key1: "key2=value" });
});

test("entries of fixed and computed values, referencing before defining", async () => {
  const res = await compute(
    [
      { name: "key2", expr: "key1=${key1}" },
      { name: "key1", expr: "value" },
    ],
    BASH
  );
  expect(res).toEqual({ key1: "value", key2: "key1=" });
});

// TODO Test handling of quoting instead.
test("substitutions are not escaped", async () => {
  const res = await compute(
    [
      { name: "key1", expr: "val=ue" },
      { name: "key2", expr: "key1=${key1}" },
    ],
    BASH
  );
  expect(res).toEqual({ key1: "val=ue", key2: "key1=val=ue" });
});

// TODO Add test that expression outputting expression isn't re-evaluated in assignments.
// TODO Test use of subshells.

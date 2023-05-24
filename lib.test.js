const { compute, resolveEntries } = require("./lib");

const BASH = "/bin/bash";

/* resolveEntries */

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

test("resolve entry keys preserves non-lexicographic order", () => {
  const res = resolveEntries(
    {
      prefix_key3: "value 1",
      prefix_key2: "value 2",
      prefix_key1: "value 3",
    },
    "prefix_"
  );
  expect(res).toEqual([
    { name: "key3", expr: "value 1" },
    { name: "key2", expr: "value 2" },
    { name: "key1", expr: "value 3" },
  ]);
});

/* compute */

test("using fixed value preserves spacing", async () => {
  const res = await compute([{ name: "key", expr: "v \n  e" }], BASH);
  expect(res).toEqual({ key: "v \n  e" });
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

test("using variable after it's defined yields its value", async () => {
  const res = await compute(
    [
      { name: "key2", expr: "value" },
      { name: "key1", expr: "key2=${key2}" },
    ],
    BASH
  );
  expect(res).toEqual({ key2: "value", key1: "key2=value" });
});

test("using variable before it's defined yields empty string", async () => {
  const res = await compute(
    [
      { name: "key2", expr: "key1=${key1}" },
      { name: "key1", expr: "value" },
    ],
    BASH
  );
  expect(res).toEqual({ key1: "value", key2: "key1=" });
});

test("use computed value", async () => {
  const res = await compute(
    [
      { name: "key1", expr: "$(echo x)" },
      { name: "key2", expr: "${key1}" },
    ],
    BASH
  );
  expect(res).toEqual({ key1: "x", key2: "x" });
});

test("single and double quotes are escaped such that they pass through unmodified", async () => {
  const res = await compute(
    [
      { name: "key1", expr: `'` },
      { name: "key2", expr: `"` },
      { name: "key3", expr: `'"'` },
      { name: "key4", expr: `"'"` },
    ],
    BASH
  );
  expect(res).toEqual({
    key1: `'`,
    key2: `"`,
    key3: `'"'`,
    key4: `"'"`,
  });
});

test("double quotes are not escaped in substitutions", async () => {
  const res = await compute(
    [
      { name: "a", expr: '$(echo "x")' },
      { name: "b", expr: '`echo "x"`' },
      { name: "c", expr: '$(echo "$(echo "x")")' },
      { name: "d", expr: '`echo "$(echo "x")"`' },
      { name: "e", expr: '$(echo "`echo "x"`")' },
      { name: "f", expr: `'$(echo "x")'` },
      { name: "g", expr: `$(echo '$(echo "x")')` },
      { name: "h", expr: '"`echo "(echo "y""`)"' },
      { name: "i", expr: '${z-"x"}' },
    ],
    BASH
  );
  expect(res).toEqual({
    a: "x",
    b: "x",
    c: "x",
    d: "x",
    e: "x",
    f: `'x'`,
    g: `$(echo "x")`,
    h: '"(echo y)"',
    i: "x",
  });
});

test("double quotes are escaped in escaped substitution", async () => {
  const res = await compute(
    [
      { name: "a", expr: '\\$(echo "x")' },
      { name: "b", expr: '\\`echo "x"\\`' },
    ],
    BASH
  );
  expect(res).toEqual({ a: '$(echo "x")', b: '`echo "x"`' });
});

test("double quotes are not escaped between substitutions", async () => {
  const res = await compute(
    [{ name: "a", expr: '$(echo "x") "y" $(echo "z")' }],
    BASH
  );
  expect(res).toEqual({ a: 'x "y" z' });
});

test("escaped double quotes are escaped again", async () => {
  const res = await compute([{ name: "a", expr: '\\"' }], BASH);
  expect(res).toEqual({ a: '\\"' });
});

test("quoted substitution end does not match", async () => {
  const res = await compute(
    [
      { name: "a", expr: '$(echo ")")' },
      { name: "b", expr: "$(echo ')')" },
      { name: "c", expr: '${x-"}"}' },
      { name: "d", expr: "${x-'}'}" },
      { name: "e", expr: '$(echo "$(echo x))")' },
      { name: "f", expr: "$(echo '$(echo x))')" },
    ],
    BASH
  );
  expect(res).toEqual({
    a: ")",
    b: ")",
    c: "}",
    d: "'}'",
    e: "x)",
    f: "$(echo x))",
  });
});

test("backticks mean command substitution", async () => {
  const res = await compute([{ name: "key", expr: "`echo x`" }], BASH);
  expect(res).toEqual({ key: "x" });
});

test("bash expression in output is not evaluated in assignment", async () => {
  const res = await compute(
    [
      {
        name: "echo_x",
        expr: "\\$(echo x)",
      },
      {
        name: "echo_echo_x",
        expr: "${echo_x}",
      },
    ],
    BASH
  );
  expect(res).toEqual({ echo_x: "$(echo x)", echo_echo_x: "$(echo x)" });
});

test("unclosed backtick (command substitution) yields error that includes script and error message", () => {
  expect.assertions(1);
  const expected = new Error(
    `script\n  echo -n "\`"\nfailed with error\n  /bin/bash: line 1: unexpected EOF while looking for matching \`\`'\n  /bin/bash: line 2: syntax error: unexpected end of file\n`
  );
  return compute([{ key: "err", expr: "`" }], BASH).catch((e) =>
    expect(e).toEqual(expected)
  );
});

test("output names that aren't valid Bash variable names don't leak errors into the next evaluation", async () => {
  // If "c" has an assignment to output "a-b", then that assignment will fail and "c" will include the error message of that failure.
  const res = await compute(
    [
      { name: "a-b", expr: "x" },
      { name: "c", expr: "y" },
    ],
    BASH
  );
  expect(res).toEqual({ "a-b": "x", c: "y" });
});

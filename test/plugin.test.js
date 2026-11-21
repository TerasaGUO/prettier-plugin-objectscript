import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as prettier from "prettier";

const plugins = [new URL("../index.js", import.meta.url).href];

// Check extension-based parser selection and verify that a second pass produces identical text.
async function check(filepath, input, expected, options = {}) {
  const config = { filepath, plugins, ...options };
  const output = await prettier.format(input, config);
  assert.equal(output, expected);
  assert.equal(await prettier.format(output, config), expected);
}

for (const [file, expected] of [
  [
    "FormatDemo.cls",
    `Class Demo.FormatDemo Extends %RegisteredObject
{
ClassMethod Sum(n As %Integer) As %Integer
{
    set total=0
    for i=1:1:n {
        set total=total+i
    }
    quit total
}
}
`,
  ],
  [
    "FormatRoutine.mac",
    `ROUTINE FormatRoutine
FormatRoutine ; Sum integers
    quit
Sum(n)
    new i,total
    set total=0
    for i=1:1:n {
        set total=total+i
    }
    quit total
`,
  ],
]) {
  test(file, async () => {
    const input = await readFile(
      new URL("../examples/" + file, import.meta.url),
      "utf8",
    );
    await check(file, input, expected);
  });
}

test("Preserves labels, dotted DO levels, argumentless command spacing, and literal braces", async () => {
  await check(
    "Demo.mac",
    'Tag\n do  quit\n . write """{""" ; }\n quit\n',
    'Tag\n\tdo  quit\n\t. write """{""" ; }\n\tquit\n',
    { useTabs: true },
  );
});

test("Preserves opaque XData and foreign-language method bodies", async () => {
  for (const member of [
    "XData Message",
    "ClassMethod Run() [ Language = python ]",
  ]) {
    const input =
      "Class Demo.Sample\n{\n" + member + '\n{\n  x = "}"\n    y\n}\n}\n';
    await check("Demo.cls", input, input);
  }
});

test("Preserves whitespace in embedded SQL and macro continuations", async () => {
  for (const suffix of [
    " &sql(SELECT '}'\n      INTO :x)\n",
    "#define SAMPLE 1 ##continue\n  +2\n",
  ]) {
    await check(
      "Demo.mac",
      "Main\n quit\n" + suffix,
      "Main\n    quit\n" + suffix,
    );
  }
});

test("Resumes indentation after simple XML, SQL, and macro definitions", async () => {
  const header =
    "Class Demo.Safe\n{\nXData Map\n{\n<Routes>\n  <Row/>\n</Routes>\n}\nClassMethod Run()\n{\n";
  const protectedLines =
    " &sql( SELECT '(' /* ) */\n   INTO :x )\n#define X 1 ##continue\n    +2\n";
  await check(
    "Demo.cls",
    header + protectedLines + " quit x\n}\n}\n",
    header + protectedLines + "    quit x\n}\n}\n",
  );
});

test("Preserves multiline block comments and indents the following command", async () => {
  const prefix = "Main\n /* {\n    }\n  */\n";
  await check("Demo.mac", prefix + " quit\n", prefix + "    quit\n");
});

test("Uses the configured tab width inside a brace-delimited procedure", async () => {
  await check(
    "Demo.mac",
    "Sum(n) {\n if n {\n quit n\n }\n quit 0\n}\n",
    "Sum(n) {\n  if n {\n    quit n\n  }\n  quit 0\n}\n",
    { tabWidth: 2 },
  );
});

// Import std lib modules.
const { EOL } = require("os");
const { writeFileSync } = require("fs");
const { compute, resolveEntries } = require("./lib");

// Write result as an output (assuming that it's multiline).
function toOutput(key, delimiter, value) {
  return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}

const DELIMITER = "EOT";
const SHELL = "/bin/bash"; // TODO determine based on OS ('https://github.com/actions/runner-images/blob/ubuntu22/20230507.1/images/win/Windows2019-Readme.md#shells' etc.)

const { env } = process;
const outputFile = env.GITHUB_OUTPUT;

const entries = resolveEntries(env, "INPUT_");
compute(entries, SHELL)
  .then((outputs) =>
    Object.entries(outputs)
      .map(([name, res]) => toOutput(name, DELIMITER, res))
      .join("")
  )
  .then((outputFileContents) =>
    writeFileSync(outputFile, outputFileContents, { encoding: "utf8" })
  )
  .catch((err) =>
    // TODO Report write error properly and ensure that the step is marked as failed.
    console.error(`error: cannot write output file ${outputFile}:`, err)
  );

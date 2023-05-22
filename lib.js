const { exec } = require("child_process");

function evalCmd(cmd, input) {
  return new Promise((resolve, reject) => {
    const process = exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error.message);
      } else if (stderr) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
    const { stdin } = process;
    stdin.write(input);
    stdin.end();
  });
}

function evalShell(shell, script) {
  // Assuming that the shell supports flag '-s' for running stdin.
  return evalCmd(`${shell} -s`, script);
}

function escape(val, ch) {
  return val.replaceAll(`${ch}`, `\\${ch}`);
}

function resolveEntries(envObj, prefix) {
  return Object.entries(envObj)
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, expr]) => ({
      name: key.slice(prefix.length).toLowerCase(),
      expr,
    }));
}
// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
async function compute(entries, shell) {
  const outputs = {};
  let shellAssignments = "";
  for (const { name, expr } of entries) {
    // Wrap expr in double quotes to support (and preserve) spacing.
    // Double quotes in the string are escaped by prepending '\'.
    const echo = `echo -n "${expr.replaceAll(`"`, `\\"`)}"\n`;
    const script = shellAssignments + echo;
    // TODO Report error properly (ideally including the command that was run).
    const output = await evalShell(shell, script);
    outputs[name] = output;
    // Wrap output in single quotes to prevent any further expansion.
    // Single quotes in the string are escaped by adding an ending single quote,
    // then an escaped single quote and a re-opening single quote.
    shellAssignments += `${name}='${output.replaceAll(`'`, `'\\''`)}'\n`;
  }
  return outputs;
}

module.exports = { resolveEntries, compute };

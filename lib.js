const { exec } = require("child_process");

function indent(str) {
  return str.replaceAll(/^/gm, '  ')
}

function evalCmd(cmd, input) {
  return new Promise((resolve, reject) => {
    const process = exec(cmd, (err, stdout, stderr) => {
      const output = stdout + stderr;
      if (err) {
        reject(output.trim());
      } else {
        resolve(output);
      }
    });
    const { stdin } = process;
    stdin.write(input);
    stdin.end();
  });
}

async function evalShell(shell, script) {
  // Assuming that the shell supports flag '-s' for running stdin.
  try {
    return await evalCmd(`${shell} -s`, script);
  } catch (msg) {
    throw new Error(`script\n${indent(script)}\nfailed with error\n${indent(msg)}\n`);
  }
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
    const echo = `echo -n "${expr.replaceAll(`"`, `\\"`)}"`;
    const script = shellAssignments + echo;
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

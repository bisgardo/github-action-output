const { exec } = require("child_process");

function indent(str) {
  return str.replaceAll(/^/gm, "  ");
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
    throw new Error(
      `script\n${indent(script)}\nfailed with error\n${indent(msg)}\n`
    );
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
function escapeDoubleQuotesInDoubleQuotes(str) {
  // Double quotes are escaped unless they occur inside a substitution.
  // As substitutions can be nested we need to partially parse the expression and track open substitutions
  // to determine whether a given double quote should be escaped.
  // The insertion of backspaces is done by flushing the input string into the result whenever a backspace is to be written.

  const closingSymbols = []; // stack of symbols that close the currently open substitutions
  let prev = null;
  let beforePrev = null;
  let insideSingleQuotes = false;
  let res = "";
  let fromExprIdx = 0;
  for (const [idx, cur] of Array.from(str).entries()) {
    // A character following '\' will never be escaped.
    if (prev !== "\\") {
      if (cur === `'`) {
        insideSingleQuotes = !insideSingleQuotes;
      } else if (closingSymbols.length && closingSymbols[closingSymbols.length - 1] === cur) {
        // Found matching end symbol to the topmost open substitution.
        closingSymbols.pop();
      } else if (cur === "`") {
        // Found unescaped '`'. To be closed by another matching (unescaped) '`'.
        closingSymbols.push("`");
      } else if (beforePrev !== "\\" && prev === "$" && cur === "(") {
        // Found unescaped '$('. To be closed by a matching (unescaped) ')'.
        closingSymbols.push(")");
      } else if (beforePrev !== "\\" && prev === "$" && cur === "{") {
        // Found unescaped '${'. To be closed by a matching (unescaped) '}'.
        closingSymbols.push("}");
      } else if (!closingSymbols.length && cur === `"`) {
        // Not inside a substitution: escape double quotes by flushing 'expr' into 'res' up to current 'idx' and writing the escape symbol.
        // The '"' will be written on the next flush.
        res += str.slice(fromExprIdx, idx);
        res += "\\";
        fromExprIdx = idx;
      }
    }
    beforePrev = prev;
    prev = cur;
  }
  // Final flush of 'expr'.
  return res + str.slice(fromExprIdx);
}

function escapeSingleQuotesWithinSingleQuotes(str) {
  // Single quotes are escaped by adding an ending single quote,
  // then an escaped single quote and a re-opening single quote.
  return str.replaceAll(`'`, `'\\''`);
}

// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
async function compute(entries, shell) {
  const outputs = {};
  let shellAssignments = "";
  for (const { name, expr } of entries) {
    // Wrap expr in double quotes to support (and preserve) spacing.
    const echo = `echo -n "${escapeDoubleQuotesInDoubleQuotes(expr)}"`;
    const script = shellAssignments + echo;
    const output = await evalShell(shell, script);
    outputs[name] = output;
    // Wrap output in single quotes to prevent any further expansion.
    shellAssignments += `${name}='${escapeSingleQuotesWithinSingleQuotes(output)}'\n`;
  }
  return outputs;
}

module.exports = { resolveEntries, compute };

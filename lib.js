const { exec } = require("child_process");

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
  function indent(str) {
    return str.replaceAll(/^/gm, "  ");
  }

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
function wrapInDoubleQuotes(str) {
  // Double quotes are escaped unless they occur inside a substitution.
  // As substitutions can be nested we need to (partially) parse the expression to track open substitutions.
  // A given double quote should only be escaped if the stack of open substitutions is empty.
  // The insertion of backspaces is done by flushing the input string into the result whenever a backspace is to be written.

  const closingSymbols = []; // stack of symbols that close the currently open substitutions
  let prev = null;
  let beforePrev = null;
  let nextFlushIdx = 0;
  let escapedStr = "";
  for (const [idx, cur] of Array.from(str).entries()) {
    const currentClosingSymbol = closingSymbols.length && closingSymbols[closingSymbols.length - 1];
    if (prev !== "\\" && currentClosingSymbol === cur) {
      // Found matching (unescaped) end symbol to the topmost open substitution: popping the substitution from the stack.
      closingSymbols.pop();
    } else if (prev !== "\\" && cur === "`") {
      // Found unescaped '`'. To be closed by another matching (unescaped) '`'.
      closingSymbols.push("`");
    } else if (beforePrev !== "\\" && prev === "$" && cur === "(") {
      // Found unescaped '$('. To be closed by a matching (unescaped) ')'.
      closingSymbols.push(")");
    } else if (beforePrev !== "\\" && prev === "$" && cur === "{") {
      // Found unescaped '${'. To be closed by a matching (unescaped) '}'.
      closingSymbols.push("}");
    } else if (closingSymbols.length && currentClosingSymbol !== '"' && prev !== "\\" && cur === "'") {
      // Found unescaped single quote inside an expansion but not inside double quotes (nor single quotes because that isn't possible).
      // To be closed by a matching (unescaped) single quote.
      closingSymbols.push("'");
    } else if (cur === `"` && currentClosingSymbol !== "'") {
      // Found (escaped or unescaped) double quote not inside single quotes.
      if (!closingSymbols.length) {
        // Double quote is not inside a substitution:
        // escape by flushing 'str' into 'escapedStr' up to current 'idx' before writing the escape symbol '\'.
        // The '"' will be written on the next flush.
        escapedStr += str.slice(nextFlushIdx, idx);
        escapedStr += "\\";
        if (prev === "\\") {
          // If the quote was already escaped we need to add a fully escaped backslash.
          escapedStr += "\\";
        }
        nextFlushIdx = idx;
      } else if (prev !== "\\") {
        // Double quote is inside an expansion and not escaped. To be closed by a matching (unescaped) double quote.
        // Found unescaped double quote inside an expansion. To be closed by a matching (unescaped) double quote.
        closingSymbols.push('"');
      }
    }
    beforePrev = prev;
    prev = cur;
  }
  // Final flush of 'expr'.
  escapedStr += str.slice(nextFlushIdx);
  return `"${escapedStr}"`;
}

function wrapInSingleQuotes(str) {
  // Single quotes are escaped by adding an ending single quote,
  // then an escaped single quote and a re-opening single quote.
  const escapedStr = str.replaceAll(`'`, `'\\''`);
  return `'${escapedStr}'`;
}

function isValidBashVariableName(name) {
  return /^[_a-zA-Z][_a-zA-Z0-9]*$/.test(name);
}

// It actually looks like we can rely on the order or inputs! Well, for now at least...
async function compute(entries, shell) {
  const outputs = {};
  let shellAssignments = "";
  for (const { name, expr } of entries) {
    // Wrap expr in double quotes to support (and preserve) spacing.
    const echo = `echo -n ${wrapInDoubleQuotes(expr)}`;
    const script = shellAssignments + echo;
    const output = await evalShell(shell, script);
    outputs[name] = output;
    // If 'name' is a valid Bash variable, append assignment of the value for use in subsequent evaluations.
    // Output is wrapped in single quotes to prevent expansion of any expressions in the output.
    if (isValidBashVariableName(name)) {
      shellAssignments += `${name}=${wrapInSingleQuotes(output)}\n`;
    }
  }
  return outputs;
}

module.exports = { resolveEntries, compute };

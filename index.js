// Import std lib modules.
const { EOL } = require('os');
const { writeFileSync } = require('fs');
const Mustache = require('mustache');

const {env} = process;
const outputFile = env.GITHUB_OUTPUT;

function compute(env, prefix) {
    const outputs = {};
    Object.entries(env).forEach(([key, expr]) => {
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length);
            outputs[name] = Mustache.render(expr, outputs);
        }
    });
    return outputs;
}

const outputs = compute(env, "INPUT_");

// Write result as an output (assuming that it's multiline).
function toOutput(key, delimiter, value) {
    return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}
try {
    Object.entries(outputs).forEach(([name, res]) =>
        writeFileSync(outputFile, toOutput(name, 'EOT', res), { encoding: 'utf8' })
    );
} catch (e) {
    // TODO Report write error properly.
    console.error(`error: cannot write output file ${outputFile}:`, e);
}
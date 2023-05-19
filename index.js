// Import std lib modules.
const {EOL} = require('os');
const {writeFileSync} = require('fs');
const {compute} = require('./lib');

const {env} = process;
const outputFile = env.GITHUB_OUTPUT;
const outputs = compute(env, 'INPUT_');

// Write result as an output (assuming that it's multiline).
function toOutput(key, delimiter, value) {
    return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}

try {
    Object.entries(outputs).forEach(([name, res]) =>
        writeFileSync(outputFile, toOutput(name, 'EOT', res), {encoding: 'utf8'})
    );
} catch (e) {
    // TODO Report write error properly.
    console.error(`error: cannot write output file ${outputFile}:`, e);
}

// Import std lib modules.
const {EOL} = require('os');
const {readFileSync, writeFileSync} = require('fs');
const {compute} = require('./lib');

// Write result as an output (assuming that it's multiline).
function toOutput(key, delimiter, value) {
    return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}

const DELIMITER = 'EOT';
const SHELL = '/bin/bash'; // TODO determine based on OS ('https://github.com/actions/runner-images/blob/ubuntu22/20230507.1/images/win/Windows2019-Readme.md#shells' etc.)

const {env} = process;
const outputFile = env.GITHUB_OUTPUT;

const outputs = await compute(env, 'INPUT_', SHELL);

const res = Object.entries(outputs).map(([name, val]) => toOutput(name, DELIMITER, val)).join('');
console.debug('outputs:', outputs);
console.debug('res:', res);
try {
    writeFileSync(outputFile, res, {encoding: 'utf8'});
    console.debug('outputFile contents:', readFileSync(outputFile));
} catch (e) {
    // TODO Report write error properly.
    console.error(`error: cannot write output file ${outputFile}:`, e);
}

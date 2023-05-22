// Import std lib modules.
const {EOL} = require('os');
const {readFileSync, writeFileSync} = require('fs');
const {compute} = require('./lib');

const DELIMITER = 'EOT';
const SHELL = '/bin/bash'; // TODO determine based on OS ('https://github.com/actions/runner-images/blob/ubuntu22/20230507.1/images/win/Windows2019-Readme.md#shells' etc.)

const {env} = process;
const outputFile = env.GITHUB_OUTPUT;
const outputs = compute(env, 'INPUT_', SHELL);

// Write result as an output (assuming that it's multiline).
function toOutput(key, delimiter, value) {
    return `${key}<<${delimiter}${EOL}${value}${EOL}${delimiter}${EOL}`;
}

const res = Object.entries(outputs).map(([name, val]) => toOutput(name, DELIMITER, val)).join('');
try {
    writeFileSync(outputFile, res, {encoding: 'utf8'});
    console.log(`DEBUG: outputFile contents=${readFileSync(outputFile)}`);
} catch (e) {
    // TODO Report write error properly.
    console.error(`error: cannot write output file ${outputFile}:`, e);
}

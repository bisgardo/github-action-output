const { exec } = require('child_process');

function evalCmd(command, stdin) {
    return new Promise((resolve, reject) => {
        const cmd = exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error.message);
            } else if (stderr) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
        cmd.stdin.write(stdin);
        cmd.stdin.end();
    });
}

function evalBash(cmd) {
    return evalCmd(`/usr/bin/bash -s`, cmd)
}


function escape(val, ch) {
    return val.replace(`${ch}`, `\\${ch}`);
}

// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
async function compute(envObj, prefix) {
    const outputs = {};
    let bashAssignments = '';
    for (const [key, expr] of Object.entries(envObj)) {
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length).toLowerCase();
            const res = await evalBash(bashAssignments + `echo -n "${escape(expr, `"`)}"`);
            outputs[name] = res;
            bashAssignments += `${name}='${escape(res, `'`)}';`;
        }
    }
    return outputs;
}

module.exports = {compute};

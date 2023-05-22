const { exec } = require('child_process');

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
        const {stdin} = process;
        stdin.write(input);
        stdin.end();
    });
}

function evalShell(shell, script) {
    // Assuming that the shell supports flag '-s' for running stdin.
    return evalCmd(`${shell} -s`, script)
}

function escape(val, ch) {
    return val.replace(`${ch}`, `\\${ch}`);
}

// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
// TODO Split in two to keep async part minimal (i.e. map/filter separately - one will take 'prefix', the other will take 'shell').
async function compute(envObj, prefix, shell) {
    const outputs = {};
    let shellAssignments = '';
    for (const [key, expr] of Object.entries(envObj)) {
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length).toLowerCase();
            const echo = `echo -n "${escape(expr, `"`)}"\n`;
            const script = shellAssignments + echo;
            const output = await evalShell(shell, script);
            console.debug(`running script '${script}' yielded output '${output}'`);
            outputs[name] = output;
            shellAssignments += `${name}='${escape(output, `'`)}'\n`;
        }
    }
    console.debug('outputs', outputs);
    return outputs;
}

module.exports = {compute};

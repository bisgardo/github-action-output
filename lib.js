const Mustache = require("mustache");

// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
function compute(env, prefix) {
    const outputs = {};
    Object.entries(env).forEach(([key, template]) => {
        console.log(`DEBUG: key=${key} template=${template}`)
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length).toLowerCase();
            console.log(`DEBUG: name=${name}`)
            outputs[name] = Mustache.render(template, outputs);
        }
    });
    return outputs;
}

module.exports = {compute};

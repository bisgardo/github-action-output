const Mustache = require("mustache");

// It actually looks like we can rely on the order or inputs!
// Well, for now at least...
function compute(env, prefix) {
    const outputs = {};
    Object.entries(env).forEach(([key, template]) => {
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length).toLowerCase();
            outputs[name] = Mustache.render(template, outputs);
        }
    });
    return outputs;
}

module.exports = {compute};

const Mustache = require("mustache");

// TODO Probably can't rely on the order of entries in 'env';
//      need to eval nested expressions on demand (and cache).
function compute(env, prefix) {
    const outputs = {};
    Object.entries(env).forEach(([key, template]) => {
        if (key.startsWith(prefix)) {
            const name = key.slice(prefix.length);
            outputs[name] = Mustache.render(template, outputs);
        }
    });
    return outputs;
}

module.exports = {compute};

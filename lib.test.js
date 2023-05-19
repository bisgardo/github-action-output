const {compute} = require('./lib');

test('entry of fixed value', () => {
    const res = compute({'prefix_key': 'value'}, 'prefix_');
    expect(res).toEqual({'key': 'value'});
});

test('entries of fixed and computed values', () => {
    const res = compute({'prefix_key1': 'value', 'prefix_key2': 'key1={{key1}}'}, 'prefix_');
    expect(res).toEqual({'key1': 'value', 'key2': 'key1=value'});
});

test('entries of fixed and computed values in reverse lexicographic order', () => {
    const res = compute({'prefix_key2': 'value', 'prefix_key1': 'key2={{key2}}'}, 'prefix_');
    expect(res).toEqual({'key2': 'value', 'key1': 'key2=value'});
});

test('entries of fixed and computed values, referencing before defining', () => {
    const res = compute({'prefix_key2': 'key1={{key1}}', 'prefix_key1': 'value'}, 'prefix_');
    expect(res).toEqual({'key1': 'value', 'key2': 'key1='});
});

test('key is lowercased', () => {
    const res = compute({'PREFIX_KEY': 'value'}, 'PREFIX_');
    expect(res).toEqual({'key': 'value'});
});

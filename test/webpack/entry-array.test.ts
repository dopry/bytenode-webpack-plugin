import { runWebpack } from './runner';

describe('entry as an array of strings', () => {

  test('should support 1 entry', async () => {
    const assets = await runWebpack({
      entry: ['./fixtures/first.js'],
    });

    expect(assets).toStrictEqual([
      'main.js.jsc',
      'main.js',
    ]);
  });

  test('should support 1 entry while naming the output', async () => {
    const assets = await runWebpack({
      entry: ['./fixtures/first.js'],
      output: {
        filename: 'named.js',
      },
    });

    expect(assets).toStrictEqual([
      'named.js.jsc',
      'named.js',
    ]);
  });

  test('should support N entries', async () => {
    const assets = await runWebpack({
      entry: ['./fixtures/first.js', './fixtures/second.js', './fixtures/third.js'],
    });

    expect(assets).toStrictEqual([
      'main.js.jsc',
      'main.js',
    ]);
  });

  test('should support N entries while naming the output', async () => {
    const assets = await runWebpack({
      entry: ['./fixtures/first.js', './fixtures/second.js', './fixtures/third.js'],
      output: {
        filename: 'named.js',
      },
    });

    expect(assets).toStrictEqual([
      'named.js.jsc',
      'named.js',
    ]);
  });

});

describe('entry as an object of arrays', () => {

  test('should support 1 array of 1 entry', async () => {
    const assets = await runWebpack({
      entry: {
        first: ['./fixtures/first.js'],
      },
    });

    expect(assets).toStrictEqual([
      'first.js.jsc',
      'first.js',
    ]);
  });

  test('should support 1 array of 1 entry while naming the output', async () => {
    const assets = await runWebpack({
      entry: ['./fixtures/first.js'],
      output: {
        filename: 'named.js',
      },
    });

    expect(assets).toStrictEqual([
      'named.js.jsc',
      'named.js',
    ]);
  });

  test('should support 1 array of N entries', async () => {
    const assets = await runWebpack({
      entry: {
        named: ['./fixtures/first.js', './fixtures/second.js', './fixtures/third.js'],
      },
    });

    expect(assets).toStrictEqual([
      'named.js.jsc',
      'named.js',
    ]);
  });

  test('should support 1 array of N entries while naming the output', async () => {
    const assets = await runWebpack({
      entry: {
        named: ['./fixtures/first.js', './fixtures/second.js', './fixtures/third.js'],
      },
      output: {
        filename: 'index.js',
      },
    });

    expect(assets).toStrictEqual([
      'index.js.jsc',
      'index.js',
    ]);
  });

  test('should support N arrays of 1 entry', async () => {
    const assets = await runWebpack({
      entry: {
        firstNamed: ['./fixtures/first.js'],
        secondNamed: ['./fixtures/second.js'],
        thirdNamed: ['./fixtures/third.js'],
      },
    });

    expect(assets).toStrictEqual([
      'firstNamed.js.jsc',
      'secondNamed.js.jsc',
      'thirdNamed.js.jsc',
      'secondNamed.js',
      'firstNamed.js',
      'thirdNamed.js',
    ]);
  });

  test('should support N arrays of 1 entry while naming the output', async () => {
    const assets = await runWebpack({
      entry: {
        firstNamed: ['./fixtures/first.js'],
        secondNamed: ['./fixtures/second.js'],
        thirdNamed: ['./fixtures/third.js'],
      },
      output: {
        filename: '[name].js',
      },
    });

    expect(assets).toStrictEqual([
      'firstNamed.js.jsc',
      'secondNamed.js.jsc',
      'thirdNamed.js.jsc',
      'secondNamed.js',
      'firstNamed.js',
      'thirdNamed.js',
    ]);
  });

  test('should support N arrays of N entries', async () => {
    const assets = await runWebpack({
      entry: {
        firstNamed: ['./fixtures/first.js'],
        mixNamed: ['./fixtures/second.js', './fixtures/third.js'],
      },
    });

    expect(assets).toStrictEqual([
      'mixNamed.js.jsc',
      'firstNamed.js.jsc',
      'firstNamed.js',
      'mixNamed.js',
    ]);
  });

  test('should support N arrays of N entries while naming the output', async () => {
    const assets = await runWebpack({
      entry: {
        firstNamed: ['./fixtures/first.js'],
        mixNamed: ['./fixtures/second.js', './fixtures/third.js'],
      },
      output: {
        filename: '[name].js',
      },
    });

    expect(assets).toStrictEqual([
      'mixNamed.js.jsc',
      'firstNamed.js.jsc',
      'firstNamed.js',
      'mixNamed.js',
    ]);
  });

});

import { runWebpack } from './runner';

describe('entry as a string', () => {

  test('should be supported', async () => {
    const assets = await runWebpack({
      entry: './fixtures/first.js',
    });

    expect(assets).toStrictEqual([
      'main.js.jsc',
      'main.js',
    ]);
  });

  test('should support naming the output', async () => {
    const assets = await runWebpack({
      entry: './fixtures/first.js',
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

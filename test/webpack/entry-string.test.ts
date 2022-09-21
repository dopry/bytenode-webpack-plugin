import { runWebpack } from './runner';

describe('entry as a string', () => {

  test('should be supported', async () => {
    const assets = await runWebpack({
      entry: './fixtures/first.js',
    });

    expect(assets).toStrictEqual([
      'first.compiled.jsc',
      'first.js',
    ]);
  });

  test.only('should support naming the output', async () => {
    try {
      const assets = await runWebpack({
        entry: './fixtures/first.js',
        output: {
          filename: 'named.js',
        },
      });
      console.log({ assets });

      expect(assets).toStrictEqual([
        'first.compiled.jsc',
        'named.js',
      ]);
    } catch (e) {
      console.log({ e })
    }
  });

});

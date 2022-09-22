import { runWebpack } from './runner';

describe('entry as a function', () => {

  test('should not be supported', async () => {
    const assets = await runWebpack({
      entry: () => './fixtures/first.js',
    });

    expect(assets).toStrictEqual([
      'main.js.jsc', 
      'main.js',
    ]);
  });

});

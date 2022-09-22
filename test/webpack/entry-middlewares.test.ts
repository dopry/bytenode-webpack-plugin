import { runWebpack } from './runner';

describe('entry middlewares', () => {

  describe('should be supported on entry arrays', () => {
    test('middleware first', async () => {
      const assets = await runWebpack({
        entry: ['webpack-hot-middleware/client', './fixtures/first.js'],
      });

      expect(assets).toStrictEqual([
        'main.js.jsc',
        'main.js',
      ]);
    });

    test('middleware last', async () => {
      const assets = await runWebpack({
        entry: ['./fixtures/first.js', 'webpack-hot-middleware/client'],
      });

      expect(assets).toStrictEqual([
        'main.js.jsc',
        'main.js',
      ]);
    });

    describe('and while naming the output', () => {
      test('middleware first', async () => {
        const assets = await runWebpack({
          entry: ['webpack-hot-middleware/client', './fixtures/first.js'],
          output: {
            filename: 'named.js',
          },
        });

        expect(assets).toStrictEqual([
          'named.js.jsc',
          'named.js',
        ]);
      });

      test('middleware last', async () => {
        const assets = await runWebpack({
          entry: ['./fixtures/first.js', 'webpack-hot-middleware/client'],
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
  });

  describe('should be supported on entry object of arrays', () => {
    test('middleware first', async () => {
      const assets = await runWebpack({
        entry: {
          firstNamed: ['webpack-hot-middleware/client', './fixtures/first.js'],
        },
      });

      expect(assets).toStrictEqual([
        'firstNamed.js.jsc',
        'firstNamed.js',
      ]);
    });

    test('middleware last', async () => {
      const assets = await runWebpack({
        entry: {
          firstNamed: ['./fixtures/first.js', 'webpack-hot-middleware/client'],
        },
      });

      expect(assets).toStrictEqual([
        'firstNamed.js.jsc',
        'firstNamed.js',
      ]);
    });

    describe('and while naming the output', () => {
      test('middleware first', async () => {
        const assets = await runWebpack({
          entry: {
            firstNamed: ['webpack-hot-middleware/client', './fixtures/first.js'],
          },
          output: {
            filename: 'named.js',
          },
        });

        expect(assets).toStrictEqual([
          'named.js.jsc',
          'named.js',
        ]);
      });

      test('middleware last', async () => {
        const assets = await runWebpack({
          entry: {
            firstNamed: ['./fixtures/first.js', 'webpack-hot-middleware/client'],
          },
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
  });

});

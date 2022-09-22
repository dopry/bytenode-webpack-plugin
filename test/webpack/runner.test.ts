import { runWebpack } from './runner';

describe('runner', () => {

  test('should reject an invalid entry', async () => {
    const runner = runWebpack({
      entry: './fixtures/invalid.js',
    });

    await expect(runner).rejects.toContain('not found');
  });
});

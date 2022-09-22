import { platform } from 'os';
import { win32 } from 'path';
import v8 from 'v8';

import { compileCode, compileElectronCode } from 'bytenode';
import slash from 'slash';
import { Compilation, ExternalsPlugin, sources } from 'webpack';
import type { Compiler, WebpackPluginInstance } from 'webpack';

import type { CompilationAssets, WebpackLogger } from './webpack';

v8.setFlagsFromString('--no-lazy');

export function createLoaderCode(relativePath: string): string {
  if (/win32/.test(platform()) && win32.isAbsolute(relativePath)) {
    relativePath = win32.normalize(relativePath);
    relativePath = relativePath.replace(/\\/g, '\\\\');
  } else {
    relativePath = slash(relativePath);
  }

  return `require('bytenode');
require('${relativePath}');
`;
}

export class BytenodeWebpackPluginCompilation {
  logger: WebpackLogger;

  constructor(
    protected plugin: BytenodeWebpackPlugin,
    protected compiler: Compiler,
    protected compilation: Compilation
  ) {
    this.logger = compiler.getInfrastructureLogger(this.plugin.name);
  }

  createLoaderCode(relativePath: string): string {
    return createLoaderCode(relativePath);
  }

  async processAsset(name: string, source: sources.Source): Promise<void> {
    const assetInfo = this.compilation.assetsInfo.get(name);
    this.logger.log('processAsset', { assetInfo, name, source });

    // only process js files.
    if (!name.endsWith('.js')) return;

    // generate the bytecode, and create a new asset for it
    const sourceCode = source.source();
    const compiledName = `${name}.jsc`;
    const compiledBuffer = this.plugin.options.compileForElectron
      ? await compileElectronCode(sourceCode)
      : await compileCode(sourceCode);
    const compiledSource = new sources.RawSource(compiledBuffer);
    this.compilation.emitAsset(compiledName, compiledSource);
    // generate the loader code and update the original asset.
    const loaderSourceCode = this.createLoaderCode(`./${compiledName}`);
    const loaderSource = new sources.RawSource(loaderSourceCode);
    this.compilation.updateAsset(name, loaderSource);
  }

  async preprocessAssets(assets: CompilationAssets): Promise<void> {
    for (const [name, source] of Object.entries(assets)) {
      await this.processAsset(name, source);
    }
  }

  async addLoader(name: string, source: sources.Source): Promise<void> {
    await Promise.resolve();
    console.log('addLoader', { name, source });
  }

  async addLoaders(assets: CompilationAssets): Promise<void> {
    // create a loader for each asset.
    for (const [name, source] of Object.entries(assets)) {
      await this.addLoader(name, source);
    }
  }

  apply(): void {
    // ensure that the bytenode module is kept in externals and not included in the bundle.
    new ExternalsPlugin('commonjs', ['bytenode']).apply(this.compiler);

    this.compilation.hooks.processAssets.tapPromise(
      {
        name: this.plugin.name,
        // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      (assets) => this.preprocessAssets(assets)
    );
    this.compilation.hooks.processAssets.tapPromise(
      {
        name: this.plugin.name,
        // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
        stage: Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS,
      },
      (assets) => this.preprocessAssets(assets)
    );
  }
}

export class BytenodeWebpackPluginOptions {
  public compileForElectron = false;

  constructor(options: Partial<BytenodeWebpackPluginOptions>) {
    Object.assign(this, options);
  }
}

export class BytenodeWebpackPlugin implements WebpackPluginInstance {
  public readonly name = 'BytenodeWebpackPlugin';
  public readonly options: BytenodeWebpackPluginOptions;

  constructor(options: Partial<BytenodeWebpackPluginOptions> = {}) {
    this.options = new BytenodeWebpackPluginOptions(options);
  }

  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(this.name, (compilation) =>
      new BytenodeWebpackPluginCompilation(this, compiler, compilation).apply()
    );
  }
}

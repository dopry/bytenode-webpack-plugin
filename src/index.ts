import Module from 'module';
import { platform } from 'os';
import path, { win32 } from 'path';
import v8 from 'v8';

import { compileCode, compileElectronCode } from 'bytenode';
import slash from 'slash';
import type { Hook } from 'tapable';
import type {
  Compiler,
  WebpackOptionsNormalized,
  WebpackPluginInstance } from 'webpack';
import {
  Compilation,
  ExternalsPlugin,
  sources,
} from 'webpack';
import WebpackVirtualModules from 'webpack-virtual-modules';

import { toRelativeImportPath } from './paths';
import type {
  Options,
  Prepared,
  PreprocessedEntry,
  PreprocessedOutput,
  ProcessedOptions,
} from './types';

v8.setFlagsFromString('--no-lazy');

/**
 * @param {string} location
 */
class BytenodeWebpackPlugin implements WebpackPluginInstance {
  // For every entrypoint, this plugin convert the final js output to bytecode in a file called [name].compiled.jsc 
  // and a [name].loader.js that will load the bytecode file and execute it.
  private readonly name = 'BytenodeWebpackPlugin';
  private readonly options: Options;

  constructor(options: Partial<Options> = {}) {
    // default option values pass to the plugin.
    this.options = {
      compileAsModule: true,
      compileForElectron: false,
      debugLifecycle: false,
      debugLogs: false,
      keepSource: false,
      preventSourceMaps: true,
      silent: false,
      ...options,
    };
  }



  apply(compiler: Compiler): void {
    // apply is the entry point for the webpack plugin API
    // here is where we want to hook into the compiler
    // in order to have the assets compiled with bytenode.

    this.setupLifecycleLogging(compiler);

    this.debug('original options', {
      context: compiler.options.context,
      devtool: compiler.options.devtool,
      entry: compiler.options.entry,
      output: compiler.options.output,
    });

    // We need to process our compiler options before the compilation starts
    // TODO: review whether this can be done in the constructor instead
    const { entry, entryLoaders, externals, output, virtualModules } = this.processOptions(compiler.options);
    const outputExtensionRegex = new RegExp(
      '\\' + output.extension + '$',
      'i'
    );

    this.debug('processed options', {
      entry,
      entryLoaders,
      output,
      virtualModules,
    });

    compiler.options.entry = entry;
    if (compiler.options.output) {
      compiler.options.output.filename = output.filename;
    } else {
      compiler.options.output = { filename: output.filename };
    }

    // @ts-ignore: The plugin supports string[] but the type doesn't
    new ExternalsPlugin('commonjs', externals).apply(compiler);

    new WebpackVirtualModules(virtualModules).apply(compiler);

    this.debug('modified options', {
      devtool: compiler.options.devtool,
      entry: compiler.options.entry,
      output: compiler.options.output,
    });

    compiler.hooks.thisCompilation.tap(this.name, (compilation) => {
      // aggregate loader files by filename
      const entryLoaderFiles: string[] = [];

      for (const entryLoader of entryLoaders) {
        const entryPoints = compilation.entrypoints;
        const entryPoint = entryPoints.get(entryLoader);
        const files = entryPoint?.getFiles() ?? [];

        entryLoaderFiles.push(...files);
      }


      compilation.hooks.processAssets.tapPromise(
        {
          name: this.name,
          // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
          stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED,
        },
        async (assets): Promise<void> => {
          console.log('compilation.hooks.processAssets.tapPromise', compilation.entrypoints);
          
          const shouldCompile = (name: string): boolean => {
            return (
              outputExtensionRegex.test(name) &&
              !entryLoaderFiles.includes(name)
            );
          };

          for (const [name, asset] of Object.entries(assets)) {
            this.debug('emitting', name);

            if (!shouldCompile(name)) {
              continue;
            }

            let source = asset.source().toString();

            if (this.options.compileAsModule) {
              source = Module.wrap(source);
            }

            const compiledAssetName = name.replace(
              outputExtensionRegex,
              '.jsc'
            );
            this.debug('compiling to', compiledAssetName);

            const compiledAssetSource = this.options.compileForElectron
              ? await compileElectronCode(source)
              : await compileCode(source);

            compilation.emitAsset(
              compiledAssetName,
              new sources.RawSource(compiledAssetSource)
            );

            if (!this.options.keepSource) {
              delete compilation.assets[name];
            }
          }
        }
      );
    });
  }

  processOptions(options: WebpackOptionsNormalized): ProcessedOptions {
    const output = this.preprocessOutput(options);

    const entries: [string, string | string[]][] = [];
    const entryLoaders: string[] = [];
    const externals: string[] = [];
    const virtualModules: [string, string][] = [];

    for (const { entry, compiled, loader } of this.preprocessEntry(options)) {
      const entryName = output.name ?? entry.name;

      entries.push([entryName, loader.locations.map((e) => e.location)]);
      entryLoaders.push(entryName);

      const { name } = compiled;

      const from = output.of(entryName);
      const to = output.of(name);
      const outputPath = options.output.path || '.';
      
      let relativeImportPath = options.output.path && toRelativeImportPath(
        outputPath,
        from,
        to
      ) || '.';

      // Use absolute path to load the compiled file in dev mode due to how electron-forge handles
      // the renderer process code loading (by using a server and not directly from the file system).
      // This should be safe exactly because it will only be used in dev mode, so the app code will
      // never be relocated after compiling with webpack and before starting electron.
      if (
        options.target === 'electron-renderer' &&
        options.mode === 'development'
      ) {
        relativeImportPath = path.resolve(
          outputPath,
          'renderer',
          relativeImportPath
        );
      }

      entries.push([name, entry.locations.map((e) => e.location)]);
      externals.push(relativeImportPath);

      for (const e of loader.locations) {
        if (!e.dependency) {
          virtualModules.push([
            e.location,
            this._createLoaderCode(relativeImportPath),
          ]);
        }
      }
    }

    return {
      entry: Object.fromEntries(entries),
      entryLoaders,
      externals,
      output,
      virtualModules: Object.fromEntries(virtualModules),
    };
  }

  preprocessOutput({
    context,
    output,
  }: WebpackOptionsNormalized): PreprocessedOutput {
    let filename: string = output?.filename ?? '[name].js';

    const { extension, name } = prepare(context, filename);
    const dynamic = /.*[[\]]+.*/.test(filename);

    filename = dynamic ? filename : '[name]' + extension;

    return {
      dynamic,
      extension,
      filename,
      name: dynamic ? undefined : name,
      of: (name) => filename.replace('[name]', name),
    };
  }

  preprocessEntry({ context, entry }: WebpackOptionsNormalized): PreprocessedEntry[] {
    let entries: [string | undefined, string | string[]][];

    if (typeof entry === 'function') {
      throw new Error('Entry as a function is not supported as of yet.');
    }

    if (typeof entry === 'string' || Array.isArray(entry)) {
      entries = [[undefined, entry]];
    } else {
      entries = Object.entries(entry);
    }

    return entries.map(([name, location]) => {
      const entry = prepare(context, location, name);
      const compiled = prepare(context, location, name, '.compiled');
      const loader = prepare(context, location, name, '.loader');

      return {
        compiled,
        entry,
        loader,
      };
    });
  }

  debug(title: unknown, data: unknown, ...rest: unknown[]): void {
    const { debugLogs, silent } = this.options;

    if (!debugLogs || silent) {
      return;
    }

    if (typeof data === 'object') {
      console.debug('');

      if (typeof title === 'string') {
        title = title.endsWith(':') ? title : `${title}:`;
      }
    }

    console.debug(title, data, ...rest);
  }

  log(...messages: unknown[]): void {
    if (this.options.silent) {
      return;
    }
    console.log(`[${this.name}]:`, ...messages);
  }

  setupLifecycleLogging(compiler: Compiler): void {
    const { debugLifecycle, silent } = this.options;

    if (!debugLifecycle || silent) {
      return;
    }

    setupHooksLogging(
      this.name,
      'compiler',
      compiler.hooks as unknown as Record<string, Hook>
    );

    compiler.hooks.normalModuleFactory.tap(this.name, (normalModuleFactory) => {
      setupHooksLogging(
        this.name,
        'normalModuleFactory',
        normalModuleFactory.hooks as unknown as Record<string, Hook>
      );
    });

    compiler.hooks.compilation.tap(this.name, (compilation) => {
      setupHooksLogging(
        this.name,
        'compilation',
        compilation.hooks as unknown as Record<string, Hook>
      );
    });

    function setupHooksLogging(
      pluginName: string,
      type: string,
      hooks: Record<string, Hook>
    ): void {
      for (const [name, hook] of Object.entries(hooks)) {
        try {
          hook.tap(pluginName, function () {
            console.debug(
              `[${pluginName}]: ${type} hook: ${name} (${arguments.length} arguments)`
            );
          });
        } catch (_) {
          // ignore when unable to tap
        }
      }
    }
  }

  _createLoaderCode(relativePath: string): string { 
    // do not confuse this with a webpack loader. This is a virtual module that will be used to
    // replacen and load the compiled code. 
    if (/win32/.test(platform()) && win32.isAbsolute(relativePath)) {
      relativePath = win32.normalize(relativePath);
      relativePath = relativePath.replace(/\\/g, '\\\\');
    } else {
      relativePath = slash(relativePath);
    }
  
    return `
      require('bytenode');
      require('${relativePath}');
    `;
  }
}

type Webpack4LocationSingle = string;
type Webpack4LocationMultiple = Webpack4LocationSingle[];
type Webpack4Location = Webpack4LocationSingle | Webpack4LocationMultiple;
type Webpack5LocationSingle = { import: string };
type Webpack5LocationMultiple = Webpack5LocationSingle[];
type Webpack5Location = Webpack5LocationSingle | Webpack5LocationMultiple;
type WebpackLocation = Webpack4Location | Webpack5Location;

function isWebtype5LocationSingle(
  location: WebpackLocation
): location is Webpack5LocationSingle {
  return (location as Webpack5LocationSingle).import !== undefined;
}

function isWebtype5LocationMultiple(
  location: WebpackLocation
): location is Webpack5LocationMultiple {
  return (
    Array.isArray(location) &&
    (location as Webpack5LocationMultiple)[0].import !== undefined
  );
}

function isWebtype4LocationMultiple(
  location: WebpackLocation
): location is Webpack4LocationMultiple {
  return Array.isArray(location) && typeof location[0] === 'string';
}

function isWebtype4LocationSingle(
  location: WebpackLocation
): location is Webpack4LocationSingle {
  return typeof location === 'string';
}

function normalizeLocation(
  location: Webpack4Location | Webpack5Location
): Webpack4LocationMultiple {
  if (isWebtype5LocationSingle(location)) {
    return [location.import].flat();
  }
  if (isWebtype5LocationMultiple(location)) {
    return location.map((i) => i.import).flat();
  }
  if (isWebtype4LocationMultiple(location)) {
    return location.flat();
  }
  if (isWebtype4LocationSingle(location)) {
    return [location];
  }
  throw new Error('Unrecognized entry format. Is this webpack 6?');
}

function prepare(
  context: string | undefined,
  location: Webpack4Location | Webpack5Location,
  name?: string,
  suffix = ''
): Prepared {
  const locationArray = Array.isArray(location) ? location : [location];

  // normalize locations to webpack4Multie
  const normalizedLocations = locationArray.map((i) => normalizeLocation(i));
  const flattenedLocations = normalizedLocations.flat();
  const locations = flattenedLocations.map((location) => {
    const dependency = isDependency(location);

    if (dependency) {
      return {
        dependency,
        location,
      };
    }

    if (context && !path.isAbsolute(location)) {
      location = path.resolve(context, location);
    }

    const directory = path.dirname(location);
    const extension = path.extname(location);
    const basename = path.basename(location, extension) + suffix;
    const filename = basename + extension;

    location = path.join(directory, filename);

    return {
      basename,
      dependency,
      location,
    };
  });

  let basename = 'main' + suffix;

  if (locations.length === 1) {
    const [single] = locations;
    basename = single.basename ?? basename;
  }

  name = name ? name + suffix : basename;

  return {
    extension: '.js',
    locations,
    name,
  };

  function isDependency(module: string): boolean {
    if (path.isAbsolute(module) || /^[.]+\/.*/.test(module)) {
      return false;
    }

    try {
      return typeof require.resolve(module) === 'string';
    } catch (_) {
      return false;
    }
  }
}

export { BytenodeWebpackPlugin };

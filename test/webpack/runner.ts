import { rm } from 'fs/promises';
import { resolve } from 'path';

import webpack from 'webpack';
import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';

import type { BytenodeWebpackPluginOptions } from '../../src';
import { BytenodeWebpackPlugin } from '../../src';

const defaultWebpackOptions: Configuration = {
  context: __dirname,
  mode: 'development',
  output: {
    path: resolve(__dirname, './output'),
  },
  plugins: [],
  target: 'node',
};

const defaultPluginOptions: Partial<BytenodeWebpackPluginOptions> = {};

async function runWebpack(webpackOptions: Configuration, pluginOptions?: Partial<BytenodeWebpackPluginOptions>): Promise<string[] | undefined> {
  pluginOptions = { ...defaultPluginOptions, ...pluginOptions };
  webpackOptions = merge(defaultWebpackOptions, webpackOptions, {
    infrastructureLogging: {
      colors: true,
      debug: 'BytenodeWebpackPlugin',
      level: 'verbose',
    },
    plugins: [
      new BytenodeWebpackPlugin(pluginOptions),
    ],
  });

  if (typeof webpackOptions.output?.path !== 'string') {
    throw new Error('output.path should be defined');
  }

  await rm(webpackOptions.output.path, {
    force: true,
    recursive: true,
  });

  return new Promise((resolve, reject) => {
    webpack(webpackOptions, (error, stats) => {
      if (error) {
        reject(error);
      }
      if (stats && stats.hasErrors()) {
        reject(stats.toString());
      }

      const { assets } = stats && stats.toJson() || { assets: undefined };
      const names = assets?.map(asset => asset.name);

      resolve(names);
    });
  });
}

export {
  runWebpack,
};

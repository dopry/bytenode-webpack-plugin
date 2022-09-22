// types that aren't exported from webpack, but we need, we've copied here.

import type { sources } from 'webpack';

export interface CompilationAssets {
  [index: string]: sources.Source;
}

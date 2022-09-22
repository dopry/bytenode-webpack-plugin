// types that aren't exported from webpack, but we need, we've copied here.

import type { sources } from 'webpack';

export interface CompilationAssets {
  [index: string]: sources.Source;
}

export interface WebpackLogger {
  getChildLogger(arg0: string | (() => string)): WebpackLogger;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  log(...args: any[]): void;
  debug(...args: any[]): void;
  assert(assertion: any, ...args: any[]): void;
  trace(): void;
  clear(): void;
  status(...args: any[]): void;
  group(...args: any[]): void;
  groupCollapsed(...args: any[]): void;
  groupEnd(...args: any[]): void;
  profile(label?: any): void;
  profileEnd(label?: any): void;
  time(label?: any): void;
  timeLog(label?: any): void;
  timeEnd(label?: any): void;
  timeAggregate(label?: any): void;
  timeAggregateEnd(label?: any): void;
}

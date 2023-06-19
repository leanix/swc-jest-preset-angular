import { spawnSync } from 'child_process';

import type { TransformedSource, TransformOptions } from '@jest/transform';
import { LogContexts, LogLevels, type Logger, createLogger } from 'bs-logger';
import { type TsJestTransformerOptions, type ProjectConfigTsJest, ConfigSet, TsJestTransformer } from 'ts-jest';

import { NgJestCompiler } from './compiler/ng-jest-compiler';
import { NgJestConfig } from './config/ng-jest-config';

// Cache the result between multiple transformer instances
// to avoid spawning multiple processes (which can have a major
// performance impact when used with multiple projects).
let useNativeEsbuild: boolean | undefined;

export class NgJestTransformer {
  #ngJestLogger: Logger;
  #esbuildImpl: typeof import('esbuild');
  #tsJestTransformer: TsJestTransformer;

  protected processAsync: TsJestTransformer['processAsync'];
  protected getCacheKey: TsJestTransformer['getCacheKey'];
  protected getCacheKeyAsync: TsJestTransformer['getCacheKeyAsync'];

  constructor(tsJestConfig?: TsJestTransformerOptions) {
    this.#tsJestTransformer = new TsJestTransformer(tsJestConfig);
    this.#tsJestTransformer['_createConfigSet'] = this._createConfigSet.bind(this);
    this.#tsJestTransformer['_createCompiler'] = this._createCompiler.bind(this);
    this.processAsync = this.#tsJestTransformer.processAsync.bind(this.#tsJestTransformer);
    this.getCacheKey = this.#tsJestTransformer.getCacheKey.bind(this.#tsJestTransformer);
    this.getCacheKeyAsync = this.#tsJestTransformer.getCacheKeyAsync.bind(this.#tsJestTransformer);
    this.#ngJestLogger = createLogger({
      context: {
        [LogContexts.package]: 'jest-preset-angular',
        [LogContexts.logLevel]: LogLevels.trace,
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        version: require('../package.json').version,
      },
      targets: process.env.NG_JEST_LOG ?? undefined,
    });

    if (useNativeEsbuild === undefined) {
      try {
        const esbuildCheckPath = require.resolve('../esbuild-check.js');
        const { status, error } = spawnSync(process.execPath, [esbuildCheckPath]);
        useNativeEsbuild = status === 0 && error === undefined;
      } catch (e) {
        useNativeEsbuild = false;
      }
    }

    this.#esbuildImpl = useNativeEsbuild ? require('esbuild') : require('esbuild-wasm');
  }

  private _createConfigSet(config: ProjectConfigTsJest | undefined): ConfigSet {
    return new NgJestConfig(config);
  }

  private _createCompiler(configSet: ConfigSet, cacheFS: Map<string, string>): void {
    this.#tsJestTransformer['_compiler'] = new NgJestCompiler(configSet, cacheFS);
  }

  process(fileContent: string, filePath: string, transformOptions: TransformOptions): TransformedSource {
    // @ts-expect-error we are accessing the private cache to avoid creating new objects all the time
    const configSet = this.#tsJestTransformer._configsFor(transformOptions);
    if (configSet.processWithEsbuild(filePath)) {
      this.#ngJestLogger.debug({ filePath }, 'process with esbuild');

      const compilerOpts = configSet.parsedTsConfig.options;
      const { code, map } = this.#esbuildImpl.transformSync(fileContent, {
        loader: 'js',
        format: transformOptions.supportsStaticESM && configSet.useESM ? 'esm' : 'cjs',
        target: compilerOpts.target === configSet.compilerModule.ScriptTarget.ES2015 ? 'es2015' : 'es2016',
        sourcemap: compilerOpts.sourceMap,
        sourcefile: filePath,
        sourcesContent: true,
        sourceRoot: compilerOpts.sourceRoot,
      });

      return {
        code,
        map,
      };
    } else {
      return this.#tsJestTransformer.process(fileContent, filePath, transformOptions);
    }
  }
}

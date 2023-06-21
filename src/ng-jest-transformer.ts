import { spawnSync } from 'child_process';

import type { TransformedSource, TransformOptions, Transformer } from '@jest/transform';
import { LogContexts, LogLevels, type Logger, createLogger } from 'bs-logger';
import { type TsJestTransformerOptions, type ProjectConfigTsJest, ConfigSet, TsJestTransformer } from 'ts-jest';

import { NgJestCompiler } from './compiler/ng-jest-compiler';
import { NgJestConfig } from './config/ng-jest-config';
import { createTransformer } from './transformers/swc-transformer';

// Cache the result between multiple transformer instances
// to avoid spawning multiple processes (which can have a major
// performance impact when used with multiple projects).
let useNativeEsbuild: boolean | undefined;

const useSwc = true;

export class NgJestTransformer {
  #ngJestLogger: Logger;
  #esbuildImpl: typeof import('esbuild');
  #tsJestTransformer: TsJestTransformer;
  #swcJestTransformer: Transformer;

  constructor(tsJestConfig?: TsJestTransformerOptions) {
    this.#tsJestTransformer = new TsJestTransformer(tsJestConfig);
    this.#tsJestTransformer['_createConfigSet'] = this._createConfigSet.bind(this);
    this.#tsJestTransformer['_createCompiler'] = this._createCompiler.bind(this);
    this.#ngJestLogger = createLogger({
      context: {
        [LogContexts.package]: 'jest-preset-angular',
        [LogContexts.logLevel]: LogLevels.trace,
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        version: require('../package.json').version,
      },
      targets: process.env.NG_JEST_LOG ?? undefined,
    });
    this.#swcJestTransformer = createTransformer({
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false,
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: undefined,
        },
        keepClassNames: false,
        experimental: { keepImportAssertions: true },
      },
      module: {
        type: 'commonjs',
        noInterop: false,
        strictMode: true,
        ignoreDynamic: false,
      },
      swcrc: false,
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
    } else if (useSwc) {
      if (filePath.endsWith('.ts')) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.#swcJestTransformer.process!(fileContent, filePath, transformOptions);
      } else {
        return {
          code: fileContent,
          map: null,
        };
      }
    } else {
      return this.#tsJestTransformer.process(fileContent, filePath, transformOptions);
    }
  }

  getCacheKey(fileContent: string, filePath: string, transformOptions: TransformOptions): string {
    if (useSwc) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.#swcJestTransformer.getCacheKey!(fileContent, filePath, transformOptions);
    } else {
      return this.#tsJestTransformer.getCacheKey(fileContent, filePath, transformOptions);
    }
  }
}

import { TransformOptions } from '@jest/transform';
import { transformSync } from 'esbuild';
import { TsJestTransformer, type ProjectConfigTsJest } from 'ts-jest';

import { NgJestCompiler } from './compiler/ng-jest-compiler';
import { NgJestConfig } from './config/ng-jest-config';
import { NgJestTransformer } from './ng-jest-transformer';

jest.mock('esbuild', () => {
  return {
    transformSync: jest.fn().mockReturnValue({
      code: '',
      map: '',
    }),
  };
});
const mockedTransformSync = jest.mocked(transformSync);

describe('NgJestTransformer', () => {
  beforeEach(() => {
    // @ts-expect-error testing purpose
    TsJestTransformer._cachedConfigSets = [];
  });

  test('should create NgJestCompiler and NgJestConfig instances', () => {
    const tr = new NgJestTransformer({ isolatedModules: true }, false);

    // @ts-expect-error testing purpose
    const cs = tr._createConfigSet({
      cwd: process.cwd(),
      extensionsToTreatAsEsm: [],
      testMatch: [],
      testRegex: [],
    });

    // @ts-expect-error testing purpose
    tr._createCompiler(cs, new Map());

    process.env.ALLOW_TS_JEST_TRANSFORMER_ACCESS = 'true';
    // @ts-expect-error testing purpose
    expect(tr.getTsJestTransformer()['_compiler']).toBeInstanceOf(NgJestCompiler);
    expect(cs).toBeInstanceOf(NgJestConfig);
    delete process.env.ALLOW_TS_JEST_TRANSFORMER_ACCESS;
  });

  test('should not use esbuild to process js files which are not from `node_modules`', () => {
    const tr = new NgJestTransformer(
      {
        isolatedModules: true,
      },
      false,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'foo.js',
      {
        config: {
          cwd: process.cwd(),
          extensionsToTreatAsEsm: [],
          testMatch: [],
          testRegex: [],
        },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any,
    );

    expect(mockedTransformSync).not.toHaveBeenCalled();
  });

  test('should not use esbuild to process tslib file', () => {
    const tr = new NgJestTransformer(
      {
        isolatedModules: true,
      },
      false,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'node_modules/tslib.es6.js',
      {
        config: {
          cwd: process.cwd(),
          extensionsToTreatAsEsm: [],
          testMatch: [],
          testRegex: [],
        },
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any,
    );

    expect(mockedTransformSync).not.toHaveBeenCalled();
  });

  test.each([
    {
      tsconfig: {
        sourceMap: false,
      },
    },
    {
      tsconfig: {
        target: 'es2016',
      },
    },
    {
      tsconfig: {},
    },
  ])('should use esbuild to process mjs or `node_modules` js files to CJS codes', ({ tsconfig }) => {
    const transformCfg = {
      cacheFS: new Map(),
      config: {
        cwd: process.cwd(),
        extensionsToTreatAsEsm: [],
        testMatch: [],
        testRegex: [],
        globals: {
          ngJest: {
            processWithEsbuild: ['node_modules/foo.js'],
          },
        },
      },
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const tr = new NgJestTransformer(
      {
        tsconfig,
      },
      false,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'foo.mjs',
      transformCfg,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'node_modules/foo.js',
      transformCfg,
    );

    expect(mockedTransformSync.mock.calls[0]).toMatchSnapshot();
    expect(mockedTransformSync.mock.calls[1]).toMatchSnapshot();

    mockedTransformSync.mockClear();
  });

  test.each([
    {
      tsconfig: {
        sourceMap: false,
      },
    },
    {
      tsconfig: {
        target: 'es2016',
      },
    },
    {
      tsconfig: {},
    },
  ])('should use esbuild to process mjs or `node_modules` js files to ESM codes', ({ tsconfig }) => {
    const transformCfg = {
      cacheFS: new Map(),
      config: {
        cwd: process.cwd(),
        extensionsToTreatAsEsm: [],
        testMatch: [],
        testRegex: [],
        globals: {
          ngJest: {
            processWithEsbuild: ['node_modules/foo.js'],
          },
        },
      },
      supportsStaticESM: true,
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const tr = new NgJestTransformer(
      {
        tsconfig,
        useESM: true,
      },
      false,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'foo.mjs',
      transformCfg,
    );
    tr.process(
      `
        const pi = parseFloat(3.124);

        export { pi };
      `,
      'node_modules/foo.js',
      transformCfg,
    );

    expect(mockedTransformSync.mock.calls[0]).toMatchSnapshot();
    expect(mockedTransformSync.mock.calls[1]).toMatchSnapshot();

    mockedTransformSync.mockClear();
  });

  describe('decorator downleveling', () => {
    describe.each(['ts-jest', 'swc'])('for classes with Angular core decorators for %s', (transformer) => {
      const fileName = 'test.component.ts';
      const options = { config: {} } as unknown as TransformOptions;

      test('adds ctorParameters for all constructor arguments', () => {
        const tr = new NgJestTransformer({ isolatedModules: true }, transformer === 'swc');
        const originalCode = `
import { Component, A } from '@angular/core';
import { B } from './local.ts';

@Component()
export class TestComponent {
  constructor(private a: A, b: B) {}
}`;

        const { code } = tr.process(originalCode, fileName, options);

        expect(inlineImports(code)).toContain(`
TestComponent.ctorParameters = () => [
    { type: require("@angular/core").A },
    { type: require("./local.ts").B }
];
`);
      });

      test('does not add ctorParameters for classes with other decorators', () => {
        const tr = new NgJestTransformer({ isolatedModules: true }, transformer === 'swc');
        const originalCode = `
import { A, Decorator } from './local.ts';

@Decorator()
export class TestComponent {
  constructor(a: A) {}
}`;

        const { code } = tr.process(originalCode, fileName, options);

        expect(inlineImports(code)).not.toContain('TestComponent.ctorParameters');
      });

      test('adds propDecorators for all properties with Angular core decorators', () => {
        const tr = new NgJestTransformer({ isolatedModules: true }, transformer === 'swc');
        const originalCode = `
import { Component, Input } from '@angular/core';
import { B, CustomDecorator } from './local.ts';

@Component()
export class TestComponent {
    @Input() input: string;
    @CustomDecorator() custom: B;
}`;
        const { code } = tr.process(originalCode, fileName, options);

        expect(inlineImports(code)).toContain(`
TestComponent.propDecorators = {
    input: [{ type: require("@angular/core").Input }]
};
`);
      });

      test('decorators on constructor arguments', () => {
        const tr = new NgJestTransformer({ isolatedModules: true }, transformer === 'swc');
        const originalCode = `
import { Component, A, CoreDecorator } from '@angular/core';
import { B, CustomDecorator } from './local.ts';

@Component()
export class TestComponent {
  constructor(@CoreDecorator() private a: A, @CustomDecorator() b: B) {}
}`;

        const { code } = tr.process(originalCode, fileName, options);

        expect(inlineImports(code)).toContain(`
TestComponent.ctorParameters = () => [
    { type: require("@angular/core").A, decorators: [{ type: require("@angular/core").CoreDecorator }] },
    { type: require("./local.ts").B }
];
`);
        expect(inlineImports(code)).toContain(`
TestComponent = __decorate([
    (0, require("@angular/core").Component)(),
    __param(1, (0, require("./local.ts").CustomDecorator)())
], TestComponent);
`);
      });

      test('custom decorator on class properties', () => {
        const tr = new NgJestTransformer({ isolatedModules: true }, transformer === 'swc');
        const originalCode = `
import { Component, Input } from '@angular/core';
import { B, CustomDecorator } from './local.ts';

@Component()
export class TestComponent {
    @CustomDecorator() @Input() input: string;
}`;
        const { code } = tr.process(originalCode, fileName, options);

        expect(inlineImports(code)).toContain(`
TestComponent.propDecorators = {
    input: [{ type: require("@angular/core").Input }]
};
`);
        expect(inlineImports(code)).toContain(`
__decorate([
    (0, require("./local.ts").CustomDecorator)()
], TestComponent.prototype, "input", void 0);
`);
      });
    });
  });
});

function inlineImports(code: string): string {
  const regex = /(?<=^|\n) *const (?<name>\w+) = require\(\"(?<path>.*?)\"\);/g;
  [...code.matchAll(regex)].forEach(({ groups }) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    code = code.replace(new RegExp(`${groups!['name']}\.`, 'g'), `require("${groups!['path']}").`);
  });

  return code;
}

declare module '@swc/jest' {
  import type { Transformer } from '@jest/transform';
  import { Options } from '@swc/core';

  function createTransformer(
    swcTransformOpts?: Options & {
      experimental?: {
        customCoverageInstrumentation?: {
          enabled: boolean;
          coverageVariable?: string;
          compact?: boolean;
          reportLogic?: boolean;
          ignoreClassMethods?: string[];
          instrumentLog?: {
            level: string;
            enableTrace: boolean;
          };
        };
      };
    },
  ): Transformer;

  const _default: {
    createTransformer: typeof createTransformer;
  };

  export = _default;
}

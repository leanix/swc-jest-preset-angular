export function makeExportsConfigurable(code: string): string {
  return code.replace(
    /(?<=(^|\n)Object\.defineProperty\(exports, "\w+", \{\n    )enumerable: true,/g,
    'enumerable: true, configurable: true,',
  );
}

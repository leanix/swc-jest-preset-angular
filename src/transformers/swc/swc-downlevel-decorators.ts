import {
  ClassDeclaration,
  Constructor,
  Declaration,
  ImportDeclaration,
  Program,
  TsType,
  TsTypeAnnotation,
} from '@swc/core';
import Visitor from '@swc/core/Visitor';

const ANGULAR_CORE_IMPORT_PATH = '@angular/core';

export function downlevelDecorators(code: string, module: Program): string {
  const visitor = new CustomVisitor();
  visitor.visitProgram(module);

  const codeLines = code.split('\n');
  const sourceMapLineIndex = codeLines.findIndex((line) => line.startsWith('//# sourceMappingURL=')) ?? -1;
  const sourceMapLine = codeLines.splice(sourceMapLineIndex, 1)[0];
  let counter = 1;

  visitor.classDeclarations.forEach((classDeclaration) => {
    const { decorators } = classDeclaration;
    const classHasAngularDecorator = decorators?.some((decorator) => {
      if (decorator.expression.type === 'CallExpression' && decorator.expression.callee.type === 'Identifier') {
        const decoratorName = decorator.expression.callee.value;

        return getOriginalImportPath(visitor.importDeclarations, decoratorName) === ANGULAR_CORE_IMPORT_PATH;
      }

      return false;
    });

    if (classHasAngularDecorator) {
      const constructor = classDeclaration.body.find((node): node is Constructor => node.type === 'Constructor');
      const ctorParameters: string[] = [];
      constructor?.params.forEach((param) => {
        let typeAnnotation: TsType | TsTypeAnnotation | undefined;
        if (param.type === 'TsParameterProperty') {
          typeAnnotation = param.param.typeAnnotation?.typeAnnotation;
        } else if ('typeAnnotation' in param.pat) {
          typeAnnotation = param.pat.typeAnnotation;
          typeAnnotation =
            typeAnnotation && 'typeAnnotation' in typeAnnotation ? typeAnnotation.typeAnnotation : undefined;
        } else {
          console.error('Unsupported constructor parameter type');
        }
        const paramTypeName =
          typeAnnotation && 'typeName' in typeAnnotation && typeAnnotation.typeName.type === 'Identifier'
            ? typeAnnotation.typeName.value
            : null;

        if (paramTypeName) {
          const importPath = getOriginalImportPath(visitor.importDeclarations, paramTypeName);
          // For built-in types, importPath will be null
          if (importPath) {
            // NOTE: SWC ImportDeclaration does not yet include the variable name the import is represented with in the final code.
            const importLine = codeLines.find((line) => line.endsWith(`require("${importPath}");`));
            const match = importLine?.match(/const (\w+) = require\("(.+)"\);/);
            if (match) {
              ctorParameters.push(`    { type: ${match[1]}.${paramTypeName} },`);
            } else {
              // Type-only imports are not present in the final code and need to be reintroduced
              const sanitisedFinalSegment = importPath?.split('/').pop()?.replace(/[^\w]/g, '');
              const importVariableName = `__${sanitisedFinalSegment}_${counter++}`;
              codeLines.push(`const ${importVariableName} = require("${importPath}");`);
              ctorParameters.push(`    { type: ${importVariableName}.${paramTypeName} },`);
            }
          }
        }
      });
      const numberOfParameters = ctorParameters.length;
      if (numberOfParameters) {
        ctorParameters[numberOfParameters - 1] = ctorParameters[numberOfParameters - 1].slice(0, -1); // Remove trailing comma
        codeLines.push(...[`${classDeclaration.identifier.value}.ctorParameters = () => [`, ...ctorParameters, '];']);
      }
    }
  });

  codeLines.push(sourceMapLine);

  return codeLines.join('\n');
}

function getOriginalImportPath(importDeclarations: ImportDeclaration[], identifier: string): string | null {
  return (
    importDeclarations.find((importDeclaration) =>
      importDeclaration.specifiers.some((specifier) => specifier.local.value === identifier),
    )?.source.value ?? null
  );
}

class CustomVisitor extends Visitor {
  public importDeclarations: ImportDeclaration[] = [];
  public classDeclarations: ClassDeclaration[] = [];

  visitImportDeclaration(node: ImportDeclaration): ImportDeclaration {
    this.importDeclarations.push(node);

    return super.visitImportDeclaration(node);
  }

  visitClassDeclaration(node: ClassDeclaration): Declaration {
    this.classDeclarations.push(node);

    return super.visitClassDeclaration(node);
  }

  visitTsType(node: TsType): TsType {
    return node;
  }
}

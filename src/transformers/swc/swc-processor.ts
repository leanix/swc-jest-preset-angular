const TEMPLATE_URL_REGEX = /\btemplateUrl\s*:\s*('|"|`)(\.\/){0,}(.*)('|"|`)/g;
const STYLE_URLS_REGEX = /\s*\bstyleUrls\s*:\s*\[[^\]]*\][^\n]*/g;
const STYLES_REGEX = /\s*\bstyles\s*:\s*\[[^\]]*\][^\n]*/g;
const ESCAPE_TEMPLATE_REGEX = /(\${|\`)/g;

const associatedTestFile = __filename.replace(/\.ts/, '.spec.ts');

export function preprocessFileContent(fileContent: string, path: string): string {
  if (/\.html$/.test(path)) {
    fileContent = fileContent.replace(ESCAPE_TEMPLATE_REGEX, '\\$1');
  } else if (/\.tsx?$/.test(path) && path !== associatedTestFile) {
    // TODO: Move this processing into SWC plugin to only do this for component decorators
    fileContent = replaceTemplateAndStylesDecoratorProperties(fileContent);
  }

  return fileContent;
}

function replaceTemplateAndStylesDecoratorProperties(fileContent: string): string {
  return fileContent
    .replace(TEMPLATE_URL_REGEX, 'template: require($1./$3$4)')
    .replace(STYLE_URLS_REGEX, '')
    .replace(STYLES_REGEX, '');
}

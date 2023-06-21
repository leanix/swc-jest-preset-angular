const TEMPLATE_URL_REGEX = /templateUrl\s*:\s*('|"|`)(\.\/){0,}(.*)('|"|`)/g;
const STYLE_URLS_REGEX = /styleUrls\s*:\s*\[[^\]]*\]/g;
const ESCAPE_TEMPLATE_REGEX = /(\${|\`)/g;

export function preprocessFileContent(fileContent: string, path: string): string {
  if (path.endsWith('.html')) {
    fileContent = fileContent.replace(ESCAPE_TEMPLATE_REGEX, '\\$1');
  }
  fileContent = fileContent
    .replace(TEMPLATE_URL_REGEX, 'template: require($1./$3$4)')
    .replace(STYLE_URLS_REGEX, 'styles: []');

  return fileContent;
}

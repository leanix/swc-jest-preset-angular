import { preprocessFileContent } from './swc-processor';

const sources = [
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: './media-box-h0.component.html',
  styleUrls: [ '../media-box.component.scss' ],
})`,
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: './media-box-h0.component.html',
  styleUrls: ['../media-box.component.scss',
  './media-box-h0.component.scss'],
})`,
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: 'media-box-h0.component.html',
  styleUrls: [
    '../media-box.component.scss',
  ],
})`,
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: 'media-box-h0.component.html',
  styleUrls: [
    '../media-box.component.scss',
    './media-box-h0.component.scss'
  ],
})`,
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: 'media-box-h0.component.html',
  styleUrls: [
    '../../box.component.scss',
    '../media-box.component.scss',
    './media-box-h0.component.scss'
  ],
})`,
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: 'media-box-h0.component.html',
  styleUrls: [
    '../../../box.component.scss',
    '../../box.component.scss',
    '../media-box.component.scss',
    './media-box-h0.component.scss'
  ],
})`,
  `@Component({
  selector    : 'xc-media-box-h0',
  templateUrl : 'media-box-h0.component.html',
  styleUrls   : [
    '../../../box.component.scss',
    '../../box.component.scss',
    '../media-box.component.scss',
    './media-box-h0.component.scss'
  ],
})`,
  // double quote
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: "./media-box-h0.component.html",
  styleUrls: [ '../media-box.component.scss' ],
})`,
  // backtick
  `@Component({
  selector: 'xc-media-box-h0',
  templateUrl: \`./media-box-h0.component.html\`,
  styleUrls: [ '../media-box.component.scss' ],
})`,
];

describe('preprocessFileContent', () => {
  test.each(sources)('removes styleUrls and imports template for %s', (source) => {
    const result = preprocessFileContent(source, '');
    expect(result).toMatch('styles: []');
    expect(result).toMatch(/template: require\(['"`]\.\/media-box-h0\.component\.html['"`]\)/);
  });
});

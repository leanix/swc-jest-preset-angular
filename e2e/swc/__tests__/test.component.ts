import { Component, Input, ChangeDetectorRef, ApplicationRef, Optional, Inject, InjectionToken } from '@angular/core';

export const TOKEN = new InjectionToken<string>('TOKEN');

@Component({
  selector: 'test',
  template: '{{someToken}}',
  providers: [{ provide: TOKEN, useValue: 'TokenContent' }],
})
export class TestComponent {
  @Input() someInput!: string;

  constructor(
    /* Some comment*/
    protected _changeDetectorRef: ChangeDetectorRef,
    _applicationRef: ApplicationRef,
    @Optional() @Inject(TOKEN) public someToken?: string /* Another comment*/,
  ) {
    console.log(someToken);
  }
}

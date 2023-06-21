import { Component, Input, ChangeDetectorRef, ApplicationRef } from '@angular/core';

@Component({
  selector: 'test',
  template: 'test OK',
})
export class TestComponent {
  @Input() someInput!: string;

  constructor(
    /* Some comment*/
    private _changeDetectorRef: ChangeDetectorRef,
    _applicationRef: ApplicationRef,
    /* Another comment*/
  ) {
    this._changeDetectorRef = this._changeDetectorRef;
  }
}

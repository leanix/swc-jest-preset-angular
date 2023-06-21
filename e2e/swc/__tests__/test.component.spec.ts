import { TestBed, waitForAsync } from '@angular/core/testing';

import { TestComponent } from './test.component';

test('Simple coomponent should compile', waitForAsync(() => {
  TestBed.configureTestingModule({
    declarations: [TestComponent],
  });

  const fixture = TestBed.createComponent(TestComponent);
  fixture.detectChanges();

  expect(fixture.componentInstance).toBeTruthy();
}));

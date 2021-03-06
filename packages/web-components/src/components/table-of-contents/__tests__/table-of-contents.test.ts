/**
 * @license
 *
 * Copyright IBM Corp. 2020
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, render } from 'lit-html';
import EventManager from '../../../../tests/utils/event-manager';
/* eslint-disable import/no-duplicates */
import DDSTableOfContents from '../table-of-contents';
// Above import is interface-only ref and thus code won't be brought into the build
import '../table-of-contents';
/* eslint-enable import/no-duplicates */

const template = (props?) => {
  const { children } = props ?? {};
  return html`
    <dds-table-of-contents>${children}</dds-table-of-contents>
  `;
};

/**
 * A mock version of `ResizeObserver` or `IntersectionObserver`.
 */
abstract class MockLayoutObserver {
  /**
   * The callback.
   */
  protected _callback?: IntersectionObserverCallback;

  /**
   * The options.
   */
  protected _options: IntersectionObserverInit = {};

  /**
   * The observed elements.
   */
  protected _targets = new Set<Element>();

  /**
   * The instances.
   */
  protected static _instances = null! as Set<MockLayoutObserver>;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this._callback = callback;
    if (options) {
      Object.assign(this._options, options);
    }
  }

  /**
   * Unobserves all elements.
   */
  disconnect() {
    this._targets.forEach(target => {
      this.unobserve(target);
    });
  }

  /**
   * Observes the given element.
   */
  observe(elem: Element) {
    this._targets.add(elem);
    (this.constructor as typeof MockLayoutObserver)._instances.add(this);
  }

  /**
   * Unobserves the given element.
   */
  unobserve(elem: Element) {
    this._targets.delete(elem);
    if (this._targets.size === 0) {
      (this.constructor as typeof MockLayoutObserver)._instances.delete(this);
    }
  }

  /**
   * @returns The array of options of all instances.
   */
  static get instanceOptions() {
    return Array.from(this._instances).map(instance => instance._options);
  }
}

/**
 * A mock version of `ResizeObserver`.
 */
class MockResizeObserver extends MockLayoutObserver {
  /**
   * The instances.
   */
  protected static _instances = new Set<MockResizeObserver>();

  /**
   * Triggers the callbacks on an element.
   *
   * @param elem The element.
   */
  static run(elem: Element, contentRect: Partial<ClientRect>) {
    this._instances.forEach(instance => {
      if (instance._callback && instance._targets.has(elem)) {
        instance._callback(
          [
            ({
              contentRect,
              target: elem,
            } as unknown) as IntersectionObserverEntry,
          ],
          (instance as unknown) as IntersectionObserver
        );
      }
    });
  }
}

/**
 * A mock version of `IntersectionObserver`.
 */
class MockIntersectionObserver extends MockLayoutObserver {
  /**
   * The instances.
   */
  protected static _instances = new Set<MockIntersectionObserver>();

  /**
   * Triggers the callbacks on an element.
   *
   * @param elem The element.
   * @param isIntersecting `true` to mark the element as intersecting.
   */
  static run(elem: Element, isIntersecting: boolean) {
    this._instances.forEach(instance => {
      if (instance._callback && instance._targets.has(elem)) {
        instance._callback(
          [
            {
              isIntersecting,
              target: elem,
            } as IntersectionObserverEntry,
          ],
          (instance as unknown) as IntersectionObserver
        );
      }
    });
  }
}

describe('dds-table-of-contents', function() {
  const events = new EventManager();

  describe('Misc attributes', function() {
    let origResizeObserver;

    beforeEach(function() {
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      origResizeObserver = (window as any).ResizeObserver;
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      (window as any).ResizeObserver = MockResizeObserver;
    });

    it('should render with minimum attributes', async function() {
      render(template(), document.body);
      await Promise.resolve();
      expect(document.body.querySelector('dds-table-of-contents')).toMatchSnapshot({ mode: 'shadow' });
    });

    it('should render the heading and the rule for desktop', async function() {
      render(
        template({
          children: html`
            <dds-image slot="heading" alt="Alt text" default-src="https://dummyimage.com/672x672"></dds-image>
            <dds-horizontal-rule slot="menu-rule"></dds-horizontal-rule>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating cycle upon `slotchange`
      expect(document.body.querySelector('dds-table-of-contents')).toMatchSnapshot({ mode: 'shadow' });
    });

    it('should render the heading for mobile', async function() {
      render(
        template({
          children: html`
            <dds-image slot="heading" alt="Alt text" default-src="https://dummyimage.com/672x672"></dds-image>
            <dds-horizontal-rule slot="menu-rule"></dds-horizontal-rule>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      MockResizeObserver.run(tableOfContents!.shadowRoot!.querySelector('.bx--tableofcontents__mobile')!, { height: 32 });
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating cycle upon `slotchange`
      expect(document.body.querySelector('dds-table-of-contents')).toMatchSnapshot({ mode: 'shadow' });
    });

    afterEach(function() {
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      (window as any).ResizeObserver = origResizeObserver;
    });
  });

  describe('Harvesting the targets', function() {
    it('should harvest the title from the text contents', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating upon harvesting `<a>`s
      expect(
        Array.prototype.map.call(
          document.body.querySelector('dds-table-of-contents')!.shadowRoot!.querySelectorAll('a[data-target]'),
          elem => ({
            target: elem.dataset.target,
            hash: /(#.*)$/.exec((elem as HTMLAnchorElement).href)?.[1],
            title: elem.textContent.trim(),
          })
        )
      ).toEqual([
        {
          target: '1',
          hash: '#1',
          title: 'Section - 1',
        },
        {
          target: '2',
          hash: '#2',
          title: 'Section - 2',
        },
        {
          target: '3',
          hash: '#3',
          title: 'Section - 3',
        },
      ]);
    });

    it('should harvest the title from data-title', async function() {
      render(
        template({
          children: html`
            <a name="1" data-title="Section - 1"></a>
            <a name="2" data-title="Section - 2"></a>
            <a name="3" data-title="Section - 3"></a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating upon harvesting `<a>`s
      expect(
        Array.prototype.map.call(
          document.body.querySelector('dds-table-of-contents')!.shadowRoot!.querySelectorAll('a[data-target]'),
          elem => ({
            target: elem.dataset.target,
            hash: /(#.*)$/.exec((elem as HTMLAnchorElement).href)?.[1],
            title: elem.textContent.trim(),
          })
        )
      ).toEqual([
        {
          target: '1',
          hash: '#1',
          title: 'Section - 1',
        },
        {
          target: '2',
          hash: '#2',
          title: 'Section - 2',
        },
        {
          target: '3',
          hash: '#3',
          title: 'Section - 3',
        },
      ]);
    });

    it('should harvest the title from the descendants from the slotted children', async function() {
      render(
        template({
          children: html`
            <div>
              <a name="1">Section - 1</a>
              <a name="2">Section - 2</a>
              <a name="3">Section - 3</a>
            </div>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating upon harvesting `<a>`s
      expect(
        Array.prototype.map.call(
          document.body.querySelector('dds-table-of-contents')!.shadowRoot!.querySelectorAll('a[data-target]'),
          elem => ({
            target: elem.dataset.target,
            hash: /(#.*)$/.exec((elem as HTMLAnchorElement).href)?.[1],
            title: elem.textContent.trim(),
          })
        )
      ).toEqual([
        {
          target: '1',
          hash: '#1',
          title: 'Section - 1',
        },
        {
          target: '2',
          hash: '#2',
          title: 'Section - 2',
        },
        {
          target: '3',
          hash: '#3',
          title: 'Section - 3',
        },
      ]);
    });
  });

  describe('Jumping to an anchor', function() {
    it('should have clicking on a desktop link cause jumping to the anchor', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating upon harvesting `<a>`s
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      spyOn(tableOfContents as any, '_handleUserInitiatedJump');
      (tableOfContents!.shadowRoot!.querySelector('a[data-target="2"]') as HTMLElement).click();
      expect((tableOfContents as any)._handleUserInitiatedJump).toHaveBeenCalledWith('2');
    });

    it('should have selectng a mobile <option> cause jumping to the anchor', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      await Promise.resolve(); // Updating upon harvesting `<a>`s
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      spyOn(tableOfContents as any, '_handleUserInitiatedJump');
      const select = tableOfContents!.shadowRoot!.querySelector('.bx--tableofcontents__mobile__select') as HTMLSelectElement;
      select.value = '2';
      select.dispatchEvent(new CustomEvent('change', { bubbles: true }));
      expect((tableOfContents as any)._handleUserInitiatedJump).toHaveBeenCalledWith('2');
    });
  });

  describe('Observing intersection', function() {
    let origIntersectionObserver;

    beforeEach(function() {
      origIntersectionObserver = window.IntersectionObserver;
      window.IntersectionObserver = (MockIntersectionObserver as unknown) as typeof IntersectionObserver;
    });

    it('should react to the intersection', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      MockIntersectionObserver.run(document.querySelector('a[name="2"]')!, true);
      await Promise.resolve();
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      expect(
        Array.prototype.map.call(tableOfContents!.shadowRoot!.querySelectorAll('.bx--tableofcontents__desktop__item'), elem =>
          elem.classList.contains('bx--tableofcontents__desktop__item--active')
        )
      ).toEqual([false, true, false]);
      expect(
        (tableOfContents!.shadowRoot!.querySelector('.bx--tableofcontents__mobile__select') as HTMLSelectElement).value
      ).toBe('2');
    });

    it('should pick the first intersected anchor', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      MockIntersectionObserver.run(document.querySelector('a[name="2"]')!, true);
      MockIntersectionObserver.run(document.querySelector('a[name="3"]')!, true);
      await Promise.resolve();
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      expect(
        Array.prototype.map.call(tableOfContents!.shadowRoot!.querySelectorAll('.bx--tableofcontents__desktop__item'), elem =>
          elem.classList.contains('bx--tableofcontents__desktop__item--active')
        )
      ).toEqual([false, true, false]);
      expect(
        (tableOfContents!.shadowRoot!.querySelector('.bx--tableofcontents__mobile__select') as HTMLSelectElement).value
      ).toBe('2');
    });

    afterEach(function() {
      window.IntersectionObserver = origIntersectionObserver;
    });
  });

  describe('Observing resize of mobile <select>', function() {
    let origResizeObserver;
    let origIntersectionObserver;

    beforeEach(function() {
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      origResizeObserver = (window as any).ResizeObserver;
      origIntersectionObserver = window.IntersectionObserver;
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      (window as any).ResizeObserver = MockResizeObserver;
      window.IntersectionObserver = (MockIntersectionObserver as unknown) as typeof IntersectionObserver;
    });

    it('should reflect the size of the mobile <select>` to the margin of IntersectionObserver', async function() {
      render(
        template({
          children: html`
            <a name="1">Section - 1</a>
            <a name="2">Section - 2</a>
            <a name="3">Section - 3</a>
          `,
        }),
        document.body
      );
      await Promise.resolve(); // Update cycle for the component
      await Promise.resolve(); // The cycle where `slotchange` event is called
      // Updating upon harvesting `<a>`s - MockIntersectionObserver instance is not registered unless an element is observed
      await Promise.resolve();
      const tableOfContents = document.querySelector('dds-table-of-contents') as DDSTableOfContents;
      MockResizeObserver.run(tableOfContents!.shadowRoot!.querySelector('.bx--tableofcontents__mobile')!, { height: 32 });
      expect(MockIntersectionObserver.instanceOptions).toEqual([
        {
          rootMargin: '-32px 0px 0px 0px',
          threshold: 1,
        },
      ]);
    });

    afterEach(function() {
      window.IntersectionObserver = origIntersectionObserver;
      // TODO: Wait for `.d.ts` update to support `ResizeObserver`
      (window as any).ResizeObserver = origResizeObserver;
    });
  });

  afterEach(async function() {
    await render(undefined!, document.body);
    events.reset();
  });
});

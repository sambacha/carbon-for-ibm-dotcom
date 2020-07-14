/**
 * @license
 *
 * Copyright IBM Corp. 2020
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html, property, customElement } from 'lit-element';
import settings from 'carbon-components/es/globals/js/settings';
import ddsSettings from '@carbon/ibmdotcom-utilities/es/utilities/settings/settings';
import DDSVideoPlayer from '../video-player/video-player';
import styles from './lightbox-media-viewer.scss';

const { prefix } = settings;
const { stablePrefix: ddsPrefix } = ddsSettings;

/**
 * The video content of lightbox media viewer.
 *
 * @element dds-lightbox-video-player
 */
@customElement(`${ddsPrefix}-lightbox-video-player`)
class DDSLightboxVideoPlayer extends DDSVideoPlayer {
  /**
   * The media description.
   */
  @property()
  description = '';

  render() {
    const { description, duration, formatCaption, name, hideCaption } = this;
    return html`
      <div class="${prefix}--lightbox-media-viewer__row">
        <div class="${prefix}--lightbox-media-viewer__media ${prefix}--no-gutter">
          <div class="${prefix}--video-player">
            <div class="${prefix}--video-player__video-container">
              <slot></slot>
            </div>
          </div>
        </div>
        <div class="${prefix}--lightbox-media-viewer__media-description ${prefix}--no-gutter">
          <div class="${prefix}--lightbox-media-viewer__content">
            ${hideCaption
              ? undefined
              : html`
                  <div class="${prefix}--lightbox-media-viewer__content__title">
                    <slot name="name">${formatCaption({ duration, name })}</slot>
                  </div>
                  <div class="${prefix}--lightbox-media-viewer__content__desc">
                    <slot name="description">${description}</slot>
                  </div>
                `}
          </div>
        </div>
      </div>
    `;
  }

  static styles = styles; // `styles` here is a `CSSResult` generated by custom WebPack loader
}

export default DDSLightboxVideoPlayer;
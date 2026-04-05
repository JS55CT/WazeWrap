// ==UserScript==
// @name         WazeWrap Light
// @namespace    https://greasyfork.org/users/30701-justins83-waze
// @version      2025.04.05.00
// @description  Lightweight WazeWrap with settings, alerts, and update monitoring
// @author       JustinS83/MapOMatic/JS55CT
// @include      https://beta.waze.com/*editor*
// @include      https://www.waze.com/*editor*
// @exclude      https://www.waze.com/*user/editor/*
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

var WazeWrap = {};

(function() {
  'use strict';

  /**
   * Configuration - Change REPO to point to your fork for testing
   * Examples:
   *   'wazedev'     - Official (https://wazedev.github.io/WazeWrap/WazeWrapLightLib.js)
   *   'yourname'    - Your fork (https://yourname.github.io/WazeWrap/WazeWrapLightLib.js)
   */
  const REPO = 'JS55CT';
  const WW_LIGHT_URL = 'https://' + REPO + '.github.io/WazeWrap/WazeWrapLightLib.js';

  /**
   * Load WazeWrap Light library
   * Provides: Settings, Alerts, Script Update Monitoring, Utilities
   * No Waze W object or OpenLayers dependencies required
   */

  async function initLight() {
    // Handle sandboxed Tampermonkey environment
    const sandboxed = typeof unsafeWindow !== 'undefined';
    const pageWindow = sandboxed ? unsafeWindow : window;

    // Check if full version already loaded (has Model, Geometry, Interface modules)
    const isFullVersion = pageWindow.WazeWrap &&
                          (pageWindow.WazeWrap.Model ||
                           pageWindow.WazeWrap.Geometry ||
                           pageWindow.WazeWrap.Interface);

    if (isFullVersion) {
      console.log('WazeWrap Full version detected, skipping light version');
      return;
    }

    // Check if light version already loaded
    const isLightVersion = pageWindow.WazeWrap && pageWindow.WazeWrap.Light?.Ready;

    if (isLightVersion) {
      console.log('WazeWrap Light already loaded');
      return;
    }

    console.log('Loading WazeWrap Light from:', WW_LIGHT_URL);

    try {
      await $.getScript(WW_LIGHT_URL);
      console.log('WazeWrap Light loaded successfully');
    } catch (error) {
      console.error('Failed to load WazeWrap Light:', error);
    }
  }

  /**
   * Bootstrap - wait for jQuery, then load
   */
  function bootstrap(tries = 1) {
    if (typeof $ !== 'undefined') {
      initLight();
    } else if (tries < 1000) {
      setTimeout(() => bootstrap(tries++), 100);
    } else {
      console.error('WazeWrap Light failed to load: jQuery not available after 100 seconds');
    }
  }

  bootstrap();
})();

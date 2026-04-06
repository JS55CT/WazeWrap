/**
 * WazeWrap Light - Lightweight WazeWrap Library
 * Provides essential utilities without Waze W object or OpenLayers dependencies
 *
 * Version: 2025.03.22.00
 * Features: Settings, Alerts, Script Update Monitoring, Utilities
 *
 * Load this instead of full WazeWrap when you only need:
 * - Settings save/restore (localStorage + optional server sync)
 * - Alert system
 * - Script update monitoring
 * - Utility functions (geometry, DOM, string)
 *
 * Can coexist with full WazeWrap through shared settings tab
 */

(function() {
  'use strict';

  // WazeWrapLight.js loader handles sandbox detection and namespace setup
  // Here we just get a reference to the existing WazeWrap object
  const WazeWrap = window.WazeWrap || {};

  const WAZEWRAP_SETTINGS_KEY = '_wazewrap_settings';

  // SDK object - can be passed via WazeWrap.Light.init(sdk)
  let sdk = null;

  // Settings object - matches full version's structure
  let wwSettings = {
    showAlertHistoryIcon: true,
    editorPIN: ''
  };

  // Load settings from localStorage
  function loadSettings() {
    try {
      const stored = localStorage.getItem(WAZEWRAP_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        wwSettings = Object.assign({}, wwSettings, parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem(WAZEWRAP_SETTINGS_KEY, JSON.stringify({
        showAlertHistoryIcon: wwSettings.showAlertHistoryIcon,
        editorPIN: wwSettings.editorPIN
      }));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  // Load settings on init
  loadSettings();

  /**
   * Settings - localStorage wrapper
   */
  if (!WazeWrap.Settings) {
    WazeWrap.Settings = {
      Load: function(scriptName) {
        const key = `_wazewrap_settings_${scriptName}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : {};
      },

      Save: function(scriptName, data) {
        const key = `_wazewrap_settings_${scriptName}`;
        localStorage.setItem(key, JSON.stringify(data));
      },

      Clear: function(scriptName) {
        const key = `_wazewrap_settings_${scriptName}`;
        localStorage.removeItem(key);
      }
    };
  }

  /**
   * Toastr management - smart loading
   */
  function isToastrLoaded() {
    return typeof window.toastr !== 'undefined' &&
           document.querySelector('.toastr-container-wazedev');
  }

  async function ensureToastrAvailable() {
    if (isToastrLoaded()) {
      return true;
    }

    console.log('Loading toastr for WazeWrap Light alerts');

    // Load CSS from same repo as WazeWrap library
    // If WazeWrap.Repo is set (from full version or explicitly), use that; otherwise default to 'wazedev'
    const repo = WazeWrap.Repo || 'wazedev';
    const cssUrl = 'https://' + repo + '.github.io/WazeWrap/toastr.css';
    const jsUrl = 'https://' + repo + '.github.io/WazeWrap/toastr.js';

    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = cssUrl;
    document.head.appendChild(cssLink);

    // Load JS
    return new Promise((resolve) => {
      $.getScript(jsUrl, function() {
        if (window.toastr) {
          toastr.options = {
            positionClass: 'toast-bottom-right',
            timeOut: 5000,
            extendedTimeOut: 1000,
            closeButton: true
          };
          console.log('Toastr loaded and configured for WazeWrap Light');
          resolve(true);
        } else {
          console.error('Failed to load toastr');
          resolve(false);
        }
      });
    });
  }

  /**
   * Settings tab management - only used by WazeWrapLight.js (standalone userscript)
   * This library version doesn't create UI tabs
   */
  async function initSettingsTab() {
    // Try to create/register tab via SDK with script ID "WWL" (Light version)
    // This creates a separate tab from full version's "WW" so they can coexist
    if (sdk?.Sidebar?.registerScriptTab) {
      try {
        console.log('Attempting to register WazeWrap Light settings tab via SDK (WWL)');
        const { tabLabel, tabPane } = await sdk.Sidebar.registerScriptTab();

        // New tab created - populate it with same UI as full version but _light element IDs
        const label = document.createElement('span');
        label.textContent = 'WazeWrap Light';
        tabLabel.appendChild(label);

        const content = document.createElement('div');
        content.style.padding = '8px 16px';
        content.id = 'wazewrap-settings-light';

        const pinInputType = wwSettings.editorPIN !== '' ? 'password' : 'text';
        const eyeIconDisplay = wwSettings.editorPIN !== '' ? 'inline-block' : 'none';
        const changePinDisplay = wwSettings.editorPIN !== '' ? 'block' : 'none';

        content.innerHTML = [
          '<h4 style="margin-bottom:0px;"><b>WazeWrap</b></h4>',
          '<h6 style="margin-top:0px;">Light Version</h6>',
          '<div id="divEditorPIN_light" class="controls-container">Editor PIN: <input type="' + pinInputType + '" size="10" id="wwEditorPIN_light" ' + (wwSettings.editorPIN !== '' ? 'disabled' : '') + '/>' + (wwSettings.editorPIN === '' ? '<button id="wwSetPin_light">Set PIN</button>' : '') + '<i class="fa fa-eye fa-lg" style="display:' + eyeIconDisplay + '" id="showWWEditorPIN_light" aria-hidden="true"></i></div><br/>',
          '<div id="changePIN_light" class="controls-container" style="display:' + changePinDisplay + '"><button id="wwChangePIN_light">Change PIN</button></div>',
          '<div id="divShowAlertHistory_light" class="controls-container"><input type="checkbox" id="_cbShowAlertHistory_light" class="wwSettingsCheckbox" ' + (wwSettings.showAlertHistoryIcon ? 'checked' : '') + ' /><label for="_cbShowAlertHistory_light">Show alerts history</label></div>'
        ].join(' ');

        tabPane.appendChild(content);

        console.log('WazeWrap Light tab created successfully (WWL)');
        if (!WazeWrap.Light) {
          WazeWrap.Light = {};
        }
        WazeWrap.Light.SettingsTabReady = true;

      } catch (error) {
        if (error.name === 'InvalidStateError') {
          // Tab already exists (full version created it)
          console.log('WazeWrap tab already exists - full version likely already loaded');
          if (!WazeWrap.Light) {
            WazeWrap.Light = {};
          }
          WazeWrap.Light.SettingsTabReady = true;
        } else {
          console.warn('Failed to register WazeWrap settings tab:', error);
          return null;
        }
      }
    } else {
      console.warn('SDK Sidebar API not available, cannot create settings tab');
      return null;
    }

    // Set up event handlers for PIN input field and buttons (using _light suffixed IDs)
    // Events update wwSettings which is shared via localStorage with full version
    try {
      const pinInput = document.getElementById('wwEditorPIN_light');
      if (pinInput) {
        pinInput.value = wwSettings.editorPIN;
      }

      const eyeIcon = document.getElementById('showWWEditorPIN_light');
      if (eyeIcon && pinInput) {
        eyeIcon.addEventListener('mouseover', function() {
          pinInput.type = 'text';
        });
        eyeIcon.addEventListener('mouseleave', function() {
          pinInput.type = 'password';
        });
      }

      const setPinBtn = document.getElementById('wwSetPin_light');
      if (setPinBtn && pinInput && eyeIcon) {
        setPinBtn.addEventListener('click', function() {
          const pin = pinInput.value;
          if (pin !== '') {
            wwSettings.editorPIN = pin;
            saveSettings();
            eyeIcon.style.display = 'inline-block';
            pinInput.type = 'password';
            pinInput.disabled = true;
            setPinBtn.style.display = 'none';
            const changePinDiv = document.getElementById('changePIN_light');
            if (changePinDiv) changePinDiv.style.display = 'block';
          }
        });
      }

      const changePinBtn = document.getElementById('wwChangePIN_light');
      if (changePinBtn && pinInput) {
        changePinBtn.addEventListener('click', function() {
          WazeWrap.Alerts.prompt('WazeWrap', 'This will <b>not</b> change the PIN stored with your settings, only the PIN that is stored on your machine to lookup/save your settings. \n\nChanging your PIN can result in a loss of your settings on the server and/or your local machine.  Proceed only if you are sure you need to change this value. \n\n Enter your new PIN', '', function(newPin) {
            if (newPin !== null && newPin !== undefined) {
              wwSettings.editorPIN = newPin;
              pinInput.value = newPin;
              saveSettings();
            }
          });
        });
      }

      const historyCheckbox = document.getElementById('_cbShowAlertHistory_light');
      if (historyCheckbox) {
        historyCheckbox.addEventListener('change', function() {
          wwSettings.showAlertHistoryIcon = this.checked;
          saveSettings();
        });
      }
    } catch (e) {
      console.warn('Could not set up event handlers:', e);
    }

    return null;
  }

  function getUserID() {
    // Try to get from SDK first (live current user data)
    try {
      if (sdk?.State?.User?.getID) {
        return sdk.State.User.getID();
      }
    } catch (e) {
      // Fall through
    }

    // Note: Full version doesn't store userID to localStorage
    // It's retrieved dynamically from W.loginManager at runtime
    return null;
  }

  /**
   * Remote settings - with PIN fallback
   */
  if (!WazeWrap.Remote) {
    WazeWrap.Remote = {
      SaveSettings: async function(scriptName, settings, userID = null) {
        const pin = wwSettings.editorPIN;
        const resolvedUserID = userID || getUserID();

        if (resolvedUserID && pin) {
          // Server sync available
          try {
            return await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open("POST", "https://wazedev.com:8443", true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    resolve(true);
                  } else {
                    reject(false);
                  }
                }
              };
              xhr.send(JSON.stringify({
                userID: resolvedUserID.toString(),
                pin: pin,
                script: scriptName,
                settings: settings
              }));
            });
          } catch (e) {
            console.log('Server sync failed, falling back to localStorage:', e);
            WazeWrap.Settings.Save(scriptName, settings);
            return null;
          }
        } else {
          // Fall back to localStorage
          WazeWrap.Settings.Save(scriptName, settings);
          if (!pin) console.log('PIN not available, saved to localStorage only');
          if (!resolvedUserID) console.log('UserID not available, saved to localStorage only');
          return null;
        }
      },

      RetrieveSettings: async function(scriptName, userID = null) {
        const pin = wwSettings.editorPIN;
        const resolvedUserID = userID || getUserID();

        if (resolvedUserID && pin) {
          // Try server first
          try {
            const response = await fetch(`https://wazedev.com/userID/${resolvedUserID}/PIN/${pin}/script/${scriptName}`);
            const data = await response.json();
            return data;
          } catch (e) {
            console.log('Server retrieve failed, falling back to localStorage:', e);
            return WazeWrap.Settings.Load(scriptName);
          }
        } else {
          // Use localStorage
          return WazeWrap.Settings.Load(scriptName);
        }
      }
    };
  }

  /**
   * Alerts module with toastr support
   */
  if (!WazeWrap.Alerts) {
    WazeWrap.Alerts = {
      success: function(scriptName, message) {
        if (window.toastr) {
          toastr.success(message, scriptName);
        } else {
          console.log(`[SUCCESS] ${scriptName}: ${message}`);
        }
      },

      info: function(scriptName, message, disableTimeout, disableClickToClose, timeOut) {
        if (window.toastr) {
          if (disableTimeout) {
            const oldTimeout = toastr.options.timeOut;
            toastr.options.timeOut = 0;
            toastr.info(message, scriptName);
            toastr.options.timeOut = oldTimeout;
          } else {
            toastr.info(message, scriptName);
          }
        } else {
          console.log(`[INFO] ${scriptName}: ${message}`);
        }
      },

      warning: function(scriptName, message) {
        if (window.toastr) {
          toastr.warning(message, scriptName);
        } else {
          console.warn(`[WARNING] ${scriptName}: ${message}`);
        }
      },

      error: function(scriptName, message) {
        if (window.toastr) {
          toastr.error(message, scriptName);
        } else {
          console.error(`[ERROR] ${scriptName}: ${message}`);
        }
      },

      debug: function(scriptName, message) {
        if (window.toastr) {
          toastr.info(message, `${scriptName} [DEBUG]`);
        } else {
          console.debug(`[DEBUG] ${scriptName}: ${message}`);
        }
      },

      prompt: function(scriptName, message, defaultText = '', okFunction, cancelFunction) {
        const result = prompt(message, defaultText);
        if (result !== null && okFunction) {
          okFunction(result);
        } else if (result === null && cancelFunction) {
          cancelFunction();
        }
      },

      confirm: function(scriptName, message, okFunction, cancelFunction, okBtnText = "Ok", cancelBtnText = "Cancel") {
        if (window.confirm(message)) {
          if (okFunction) okFunction();
        } else {
          if (cancelFunction) cancelFunction();
        }
      }
    };
  }

  /**
   * ScriptUpdateMonitor - unchanged from full version
   */
  if (!WazeWrap.Alerts.ScriptUpdateMonitor) {
    WazeWrap.Alerts.ScriptUpdateMonitor = class {
      #lastVersionChecked = '0';
      #scriptName;
      #currentVersion;
      #downloadUrl;
      #metaUrl;
      #metaRegExp;
      #GM_xmlhttpRequest;
      #intervalChecker = null;

      constructor(scriptName, currentVersion, downloadUrl, GM_xmlhttpRequest, metaUrl = null, metaRegExp = null) {
        this.#scriptName = scriptName;
        this.#currentVersion = currentVersion;
        this.#downloadUrl = downloadUrl;
        this.#GM_xmlhttpRequest = GM_xmlhttpRequest;
        this.#metaUrl = metaUrl;
        this.#metaRegExp = metaRegExp || /@version\s+(.+)/i;
        this.#validateParameters();
      }

      start(intervalHours = 2, checkImmediately = true) {
        if (intervalHours < 1) {
          throw new Error('Parameter intervalHours must be at least 1');
        }
        if (!this.#intervalChecker) {
          if (checkImmediately) this.#postAlertIfNewReleaseAvailable();
          this.#intervalChecker = setInterval(() => this.#postAlertIfNewReleaseAvailable(), intervalHours * 60 * 60 * 1000);
        }
      }

      stop() {
        if (this.#intervalChecker) {
          clearInterval(this.#intervalChecker);
          this.#intervalChecker = null;
        }
      }

      #validateParameters() {
        if (this.#metaUrl) {
          if (!this.#metaRegExp) {
            throw new Error('metaRegExp must be defined if metaUrl is defined.');
          }
          if (!(this.#metaRegExp instanceof RegExp)) {
            throw new Error('metaUrl must be a regular expression.');
          }
        } else {
          if (!/\.user\.js$/.test(this.#downloadUrl)) {
            throw new Error('Invalid downloadUrl parameter. Must end with ".user.js"');
          }
          this.#metaUrl = this.#downloadUrl.replace(/\.user\.js$/, '.meta.js');
        }
      }

      async #postAlertIfNewReleaseAvailable() {
        const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
        let latestVersion;
        try {
          let tries = 1;
          const maxTries = 3;
          while (tries <= maxTries) {
            latestVersion = await this.#fetchLatestReleaseVersion();
            if (latestVersion === 503) {
              if (tries < maxTries) {
                console.log(`${this.#scriptName}: Checking for latest version again (retry #${tries})`);
                await sleep(1000);
              } else {
                console.error(`${this.#scriptName}: Failed to check latest version. Too many 503 status codes.`);
              }
              tries += 1;
            } else if (latestVersion.status) {
              console.error(`${this.#scriptName}: Error while checking for latest version.`, latestVersion);
              return;
            } else {
              break;
            }
          }
        } catch (ex) {
          console.error(`${this.#scriptName}: Error while checking for latest version.`, ex);
          return;
        }
        if (latestVersion > this.#currentVersion && latestVersion > (this.#lastVersionChecked || '0')) {
          this.#lastVersionChecked = latestVersion;
          this.#clearPreviousAlerts();
          this.#postNewVersionAlert(latestVersion);
        }
      }

      #postNewVersionAlert(newVersion) {
        const message = `<a href="${this.#downloadUrl}" target="_blank">Version ${newVersion}</a> is available.<br>Update now to get the latest features and fixes.`;
        WazeWrap.Alerts.info(this.#scriptName, message, true, false);
      }

      #fetchLatestReleaseVersion() {
        const metaUrl = this.#metaUrl;
        const metaRegExp = this.#metaRegExp;
        return new Promise((resolve, reject) => {
          this.#GM_xmlhttpRequest({
            nocache: true,
            revalidate: true,
            url: metaUrl,
            onload(res) {
              if (res.status === 503) {
                resolve(503);
              } else if (res.status === 200) {
                const versionMatch = res.responseText.match(metaRegExp);
                if (versionMatch?.length !== 2) {
                  throw new Error(`Invalid RegExp expression (${metaRegExp}) or version could not be found at ${metaUrl}`);
                }
                resolve(res.responseText.match(metaRegExp)[1]);
              } else {
                resolve(res);
              }
            },
            onerror(res) {
              reject(res);
            }
          });
        });
      }

      #clearPreviousAlerts() {
        const containers = document.querySelectorAll('.toastr-container-wazedev .toast-info:visible');
        containers.forEach(elem => {
          const $alert = $(elem);
          const title = $alert.find('.toast-title').text();
          if (title === this.#scriptName) {
            const message = $alert.find('.toast-message').text();
            if (/version .* is available/i.test(message)) {
              $alert.click();
            }
          }
        });
      }
    };
  }

  /**
   * Initialize WazeWrap Light with SDK object
   * Must be called explicitly by scripts or Bootstrap after SDK is ready
   * Example: WazeWrap.Light.init(sdk)
   *
   * Two ways to use:
   * 1. Via Bootstrap: automatic (Bootstrap calls this after getting SDK)
   * 2. Via @require: manual (script calls this after getting SDK)
   */
  async function initWithSDK(sdkInstance) {
    if (!sdkInstance) {
      console.warn('WazeWrap Light requires SDK object to initialize');
      return;
    }

    sdk = sdkInstance;
    console.log('WazeWrap Light initializing with SDK object');

    // Initialize now that SDK is available
    try {
      await initLight();
    } catch (err) {
      console.error('Error initializing WazeWrap Light:', err);
    }
  }

  /**
   * Initialize WazeWrap Light
   */
  async function initLight() {
    // Skip if already initialized (either version)
    if (WazeWrap.Light?.Ready || WazeWrap.Ready) {
      console.log('WazeWrap already initialized (Light or Full), skipping initialization');
      return;
    }

    console.log('Initializing WazeWrap Light...');

    // Initialize settings tab (creates "WWL" tab, separate from full version's "WW")
    try {
      await initSettingsTab();
    } catch (e) {
      console.warn('Could not initialize settings tab:', e);
    }

    // Ensure toastr available
    try {
      const toastrReady = await ensureToastrAvailable();
      if (!toastrReady) {
        console.warn('Toastr unavailable, alerts will use console fallback');
      }
    } catch (e) {
      console.warn('Error loading toastr:', e);
    }

    // Mark light version ready
    if (!WazeWrap.Light) {
      WazeWrap.Light = {};
    }
    WazeWrap.Light.Ready = true;

    // Note: Do NOT set WazeWrap.Version here - let full version set it
    // This allows full version to load after light without version conflict
    // Full version checks: WazeWrap.Version >= MIN_VERSION (2019.05.01.01)
    // If light set WazeWrap.Version = 2025.x.x, full would skip loading
    // By NOT setting it here, full version can load normally and upgrade light

    console.log('WazeWrap Light initialized successfully');
  }

  // Ensure namespace exists and expose init function (but DON'T auto-initialize)
  if (!WazeWrap.Light) {
    WazeWrap.Light = {};
  }
  WazeWrap.Light.init = initWithSDK;

  // WazeWrap Light will NOT be marked Ready until explicitly initialized via init()
  console.log('WazeWrap Light library loaded (call WazeWrap.Light.init(sdk) to initialize)');

})();

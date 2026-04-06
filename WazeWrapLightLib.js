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

  // SDK object - populated by initWithSDK(sdkInstance) called from WazeWrapLight.js loader
  let sdk = null;

  // Settings object - matches full version's structure
  let wwSettings = {
    showAlertHistoryIcon: true,
    editorPIN: ''
  };

  // User info - populated from SDK when available (userID is the userName)
  let userInfo = {
    userName: 'Unknown',
    userID: 'Unknown',  // Same as userName - the user's login ID
    rank: null
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
   * Toastr management - identical to full version
   */
  async function initializeToastr() {
    let toastrSettings = {};
    try {
      function loadSettings() {
        var loadedSettings = $.parseJSON(localStorage.getItem("WWToastr"));
        var defaultSettings = {
          historyLeftLoc: 35,
          historyTopLoc: 40
        };
        toastrSettings = $.extend({}, defaultSettings, loadedSettings)
      }

      function saveSettings() {
        if (localStorage) {
          var localsettings = {
            historyLeftLoc: toastrSettings.historyLeftLoc,
            historyTopLoc: toastrSettings.historyTopLoc
          };

          localStorage.setItem("WWToastr", JSON.stringify(localsettings));
        }
      }
      loadSettings();
      $('head').append(
        $('<link/>', {
          rel: 'stylesheet',
          type: 'text/css',
          href: 'https://'+WazeWrap.Repo+'.github.io/WazeWrap/toastr.css'
        }),
        $('<style type="text/css">.toast-container-wazedev > div {opacity: 0.95;} .toast-top-center-wide {top: 32px;}</style>')
      );

      await $.getScript('https://'+WazeWrap.Repo+'.github.io/WazeWrap/toastr.js');
      wazedevtoastr.options = {
        target: '#map',
        timeOut: 6000,
        positionClass: 'toast-top-center-wide',
        closeOnHover: false,
        closeDuration: 0,
        showDuration: 0,
        closeButton: true,
        progressBar: true
      };

      if ($('.WWAlertsHistory').length > 0)
        return;
      var $sectionToastr = $("<div>", { style: "padding:8px 16px", id: "wmeWWScriptUpdates" });
      $sectionToastr.html([
        '<div class="WWAlertsHistory" title="Script Alert History"><i class="fa fa-exclamation-triangle fa-lg"></i><div id="WWAlertsHistory-list"><div id="toast-container-history" class="toast-container-wazedev"></div></div></div>'
      ].join(' '));
      $("#WazeMap").append($sectionToastr.html());

      $('.WWAlertsHistory').css('left', `${toastrSettings.historyLeftLoc}px`);
      $('.WWAlertsHistory').css('top', `${toastrSettings.historyTopLoc}px`);

      try {
        await $.getScript("https://greasyfork.org/scripts/454988-jqueryui-custom-build/code/jQueryUI%20custom%20build.js");
      }
      catch (err) {
        console.log("Could not load jQuery UI " + err);
      }

      if ($.ui) {
        $('.WWAlertsHistory').draggable({
          stop: function () {
            let windowWidth = $('#map').width();
            let panelWidth = $('#WWAlertsHistory-list').width();
            let historyLoc = $('.WWAlertsHistory').position().left;
            if ((panelWidth + historyLoc) > windowWidth) {
              $('#WWAlertsHistory-list').css('left', Math.abs(windowWidth - (historyLoc + $('.WWAlertsHistory').width()) - panelWidth) * -1);
            }
            else
              $('#WWAlertsHistory-list').css('left', 'auto');

            toastrSettings.historyLeftLoc = $('.WWAlertsHistory').position().left;
            toastrSettings.historyTopLoc = $('.WWAlertsHistory').position().top;
            saveSettings();
          }
        });
      }
    }
    catch (err) {
      console.log(err);
    }
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

  /**
   * Remote settings - identical to full version
   * Light version: W.loginManager replaced with SDK or null fallback
   */
  function Remote() {
    function sendPOST(scriptName, scriptSettings) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://wazedev.com:8443", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function(e) {
          if (xhr.readyState === 4) {
            if (xhr.status === 200)
              resolve(true)
            else
              reject(false)
          }
        }
        xhr.send(JSON.stringify({
          userID: userInfo.userID,
          pin: wwSettings.editorPIN,
          script: scriptName,
          settings: scriptSettings
        }));
      });
    }

    this.SaveSettings = async function(scriptName, scriptSettings) {
      if(wwSettings.editorPIN === "") {
        console.error("Editor PIN not set");
        return null;
      }
      if(scriptName === "") {
        console.error("No script name provided");
        return null;
      }
      try {
        return await sendPOST(scriptName, scriptSettings);
      }
      catch(err) {
        console.log(err);
        return null;
      }
    }

    this.RetrieveSettings = async function(script) {
      if(wwSettings.editorPIN === "") {
        console.error("Editor PIN not set");
        return null;
      }
      if(script === "") {
        console.error("No script name provided");
        return null;
      }
      try {
        const userID = userInfo.userID;
        if (!userID || userID === 'Unknown') {
          console.warn("UserID not available");
          return null;
        }
        let response = await fetch(`https://wazedev.com/userID/${userID}/PIN/${wwSettings.editorPIN}/script/${script}`);
        response = await response.json();
        return response;
      }
      catch(err) {
        console.log(err);
        return null;
      }
    }
  }

  // Instantiate Remote
  if (!WazeWrap.Remote) {
    WazeWrap.Remote = new Remote();
  }

  /**
   * Alerts module with toastr support - identical to full version
   */
  function Alerts() {
    this.success = function (scriptName, message) {
      $(wazedevtoastr.success(message, scriptName)).clone().prependTo('#WWAlertsHistory-list > .toast-container-wazedev').find('.toast-close-button').remove();
    }

    this.info = function (scriptName, message, disableTimeout, disableClickToClose, timeOut) {
      let options = {};
      if (disableTimeout)
        options.timeOut = 0;
      else if (timeOut)
        options.timeOut = timeOut;

      if (disableClickToClose)
        options.tapToDismiss = false;

      $(wazedevtoastr.info(message, scriptName, options)).clone().prependTo('#WWAlertsHistory-list > .toast-container-wazedev').find('.toast-close-button').remove();
    }

    this.warning = function (scriptName, message) {
      $(wazedevtoastr.warning(message, scriptName)).clone().prependTo('#WWAlertsHistory-list > .toast-container-wazedev').find('.toast-close-button').remove();
    }

    this.error = function (scriptName, message) {
      $(wazedevtoastr.error(message, scriptName)).clone().prependTo('#WWAlertsHistory-list > .toast-container-wazedev').find('.toast-close-button').remove();
    }

    this.debug = function (scriptName, message) {
      wazedevtoastr.debug(message, scriptName);
    }

    this.prompt = function (scriptName, message, defaultText = '', okFunction, cancelFunction) {
      wazedevtoastr.prompt(message, scriptName, { promptOK: okFunction, promptCancel: cancelFunction, PromptDefaultInput: defaultText });
    }

    this.confirm = function (scriptName, message, okFunction, cancelFunction, okBtnText = "Ok", cancelBtnText = "Cancel") {
      wazedevtoastr.confirm(message, scriptName, { confirmOK: okFunction, confirmCancel: cancelFunction, ConfirmOkButtonText: okBtnText, ConfirmCancelButtonText: cancelBtnText });
    }

    // ScriptUpdateMonitor - identical to full version
    this.ScriptUpdateMonitor = class {
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
            method: 'GET',
            url: metaUrl,
            onload: function (response) {
              if (response.status === 200) {
                const matchResult = metaRegExp.exec(response.responseText);
                if (matchResult && matchResult.length === 2) {
                  resolve(matchResult[1]);
                } else {
                  resolve({ status: 'unable to parse version number' });
                }
              } else if (response.status === 503) {
                resolve(503);
              } else {
                resolve({ status: response.status });
              }
            },
            onerror: function () {
              reject(new Error('error with version check'));
            }
          });
        });
      }

      #clearPreviousAlerts() {
        const containers = document.querySelectorAll('.toastr-container-wazedev .toast-info:visible');
        containers.forEach(elem => {
          const $alert = $(elem);
          const title = $alert.find('.toast-title').text();
          if (title.indexOf(this.#scriptName) >= 0) {
            $alert.fadeOut(function () {
              $(this).remove();
            });
          }
        });
      }
    };
  }

  // Instantiate Alerts and assign ScriptUpdateMonitor
  if (!WazeWrap.Alerts) {
    WazeWrap.Alerts = new Alerts();
  }

  /**
   * String utilities - identical to full version
   */
  function String() {
    this.toTitleCase = function (str) {
      return str.replace(/(?:^|\s)\w/g, function (match) {
        return match.toUpperCase();
      });
    };
  }

  // Instantiate String
  if (!WazeWrap.String) {
    WazeWrap.String = new String();
  }

  /**
   * Initialize WazeWrap Light with optional SDK object
   *
   * Called by:
   * 1. WazeWrapLight.js standalone: passes SDK for UI tab creation
   * 2. Bootstrap: passes null (SDK is reserved for the calling script)
   */
  async function initWithSDK(sdkInstance) {
    // sdkInstance can be null or undefined (Bootstrap mode)
    if (sdkInstance) {
      sdk = sdkInstance;
      console.log('WazeWrap Light initializing with SDK object');
    } else {
      console.log('WazeWrap Light initializing (library mode, no SDK)');
    }

    // Initialize now - will work with or without SDK
    try {
      await initLight();
    } catch (err) {
      console.error('Error initializing WazeWrap Light:', err);
    }
  }

  /**
   * Create UI tab for WazeWrap Light settings
   * Called by WazeWrapLight.js (standalone mode) after SDK is ready
   * Not called when loaded via Bootstrap (to avoid tab conflicts with calling script)
   */
  async function initUI(sdkInstance) {
    if (sdkInstance) {
      sdk = sdkInstance;
    }

    try {
      await initSettingsTab();
    } catch (e) {
      console.warn('Could not initialize UI tab:', e);
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

    // Note: Tab creation is skipped here when loaded as a library via Bootstrap
    // (to avoid conflicting with the calling script's tab creation)
    // Tab creation only happens when WazeWrapLight.js loads as a standalone userscript
    // The library provides APIs (Settings, Alerts, Remote) which work with localStorage

    // Initialize toastr (same as full version)
    try {
      await initializeToastr();
    } catch (e) {
      console.warn('Error loading toastr:', e);
    }

    // Populate user info from SDK if available
    try {
      const userSession = sdk?.State?.getUserInfo?.();
      if (userSession) {
        userInfo.userName = userSession.userName || 'Unknown';
        userInfo.userID = userSession.userName || 'Unknown';  // userID is the userName
        userInfo.rank = userSession.rank || null;
      }
    } catch (e) {
      console.warn('Error retrieving user info from SDK:', e);
    }

    // Expose user info as WazeWrap.User
    if (!WazeWrap.User) {
      WazeWrap.User = userInfo;
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

  // Ensure namespace exists and expose init functions
  if (!WazeWrap.Light) {
    WazeWrap.Light = {};
  }
  WazeWrap.Light.init = initWithSDK;
  WazeWrap.Light.initUI = initUI;  // Expose UI initialization (called by WazeWrapLight.js standalone)

  // WazeWrap Light will NOT be marked Ready until explicitly initialized via init()
  console.log('WazeWrap Light library loaded (call WazeWrap.Light.init(sdk) to initialize)');

})();

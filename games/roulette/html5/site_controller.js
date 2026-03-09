(function () {
    var BALANCE_REFRESH_MS = 15000;
    var ROUND_POLL_MS = 50;
    var ROUND_SETTLE_TIMEOUT_MS = 25000;
    var POST_SETTLE_STABILIZE_MS = 400;
    var ORIGINAL_WIDTH = 1280;
    var ORIGINAL_HEIGHT = 720;
    var STATUS_MESSAGE_MS = 1800;
    var RESULT_MESSAGE_MS = 3200;
    var BALL_RESNAP_INTERVAL_MS = 33;
    var TABLE_BACKGROUND_NAME = 'Sprite8';
    var TABLE_BACKGROUND_SOURCE_WIDTH = 1901;
    var TABLE_BACKGROUND_SOURCE_HEIGHT = 1287;
    var TABLE_BACKGROUND_ORIGIN_X = 0.4539596175551059;
    var TABLE_BACKGROUND_ORIGIN_Y = 0.5599131519912397;
    var CHIP_SOURCE_REGIONS = [
        { amount: 100, x: 895, y: 958, radius: 110 },
        { amount: 50, x: 1045, y: 966, radius: 110 },
        { amount: 500, x: 1205, y: 981, radius: 112 },
        { amount: 1000, x: 1358, y: 926, radius: 130 },
        { amount: 5000, x: 1457, y: 964, radius: 130 }
    ];
    var OUTSIDE_BET_VAR_NAMES = {
        'range:low': '1ao18',
        'parity:even': 'even',
        'color:red': 'vermelho',
        'color:black': 'preto',
        'parity:odd': 'odd',
        'range:high': '19ao36',
        'dozen:first': 'first',
        'dozen:second': 'second',
        'dozen:third': 'third',
        'column:first': 'fileira121',
        'column:second': 'fileira221',
        'column:third': 'fileira321'
    };
    var BET_LABELS = {
        'range:low': '1-18',
        'parity:even': 'EVEN',
        'color:red': 'RED',
        'color:black': 'BLACK',
        'parity:odd': 'ODD',
        'range:high': '19-36',
        'dozen:first': '1st 12',
        'dozen:second': '2nd 12',
        'dozen:third': '3rd 12',
        'column:first': '1st column',
        'column:second': '2nd column',
        'column:third': '3rd column'
    };

    function normalizeMoney(value) {
        var amount = Number(value);
        if (!isFinite(amount)) {
            return 0;
        }

        return Number(amount.toFixed(2));
    }

    function isWholeAmount(value) {
        return Math.abs(value - Math.round(value)) < 0.000001;
    }

    function formatNativeAmount(value) {
        var amount = normalizeMoney(value);
        return isWholeAmount(amount) ? String(Math.round(amount)) : amount.toFixed(2);
    }

    function toNormalizedBetValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        return String(value).trim().toLowerCase();
    }

    function buildRegionDescriptor(regionValue) {
        var value = Number(regionValue);
        if (!isFinite(value)) {
            return null;
        }

        if (value >= 0 && value <= 36) {
            return {
                type: 'straight',
                value: String(value)
            };
        }

        switch (value) {
            case 37:
                return { type: 'range', value: 'low' };
            case 38:
                return { type: 'parity', value: 'even' };
            case 39:
                return { type: 'color', value: 'red' };
            case 40:
                return { type: 'color', value: 'black' };
            case 41:
                return { type: 'parity', value: 'odd' };
            case 42:
                return { type: 'range', value: 'high' };
            case 43:
                return { type: 'dozen', value: 'first' };
            case 44:
                return { type: 'dozen', value: 'second' };
            case 45:
                return { type: 'dozen', value: 'third' };
            case 46:
                return { type: 'column', value: 'third' };
            case 47:
                return { type: 'column', value: 'second' };
            case 48:
                return { type: 'column', value: 'first' };
            default:
                return null;
        }
    }

    function BetterdrRouletteController(runtime) {
        this.runtime = runtime;
        this.bridge = window.BetterdrRouletteBridge || null;
        this.eventSheetManager = runtime && typeof runtime.GetEventSheetManager === 'function'
            ? runtime.GetEventSheetManager()
            : null;
        this.eventVars = {};
        this.balance = 0;
        this.balanceReady = false;
        this.balanceVersion = 0;
        this.balanceSyncNonce = 0;
        this.balancePollTimer = null;
        this.balanceRefreshHandler = null;
        this.roundPollTimer = null;
        this.pendingRound = null;
        this.lastRoundSettledAt = 0;
        this.lastObservedSpinAt = 0;
        this.latestSelectionSnapshot = null;
        this.lastBallVisible = false;
        this.selectedChipAmount = 0;
        this.statusMessageTimer = null;
        this.lastSettledWinAmount = 0;
        this.textHooks = {};
        this.activePopup = null;
        this.settledOutcomeNumber = null;
        this.statusTextValue = '';
        this.ballSnapTimer = null;
        this.ballSnapOutcomeNumber = null;
        this.betStateByKey = Object.create(null);
    }

    BetterdrRouletteController.prototype.init = function () {
        this.cacheEventVars();
        this.attachCanvasListeners();
        this.hookDisplayText('balance');
        this.hookDisplayText('bet');
        this.hookDisplayText('win');
        this.hookDisplayText('Texto');
        this.hookDisplayText('lose');
        this.hookDisplayText('txt');
        this.hookDisplayText('Resultado');
        this.hookDisplayText('amount');
        this.hookDisplayText('wintxt');
        this.hookDisplayText('losetxt');
        this.rebuildBetStateFromInstances();
        this.syncNativeBetState();
        this.syncBalance();
        this.startBalanceTick();
        this.startBalanceRefresh();
    };

    BetterdrRouletteController.prototype.cacheEventVars = function () {
        if (!this.eventSheetManager || !this.eventSheetManager._eventVarsBySid) {
            return;
        }

        this.eventVars = {};
        this.eventSheetManager._eventVarsBySid.forEach(function (eventVar) {
            var name = String(eventVar && (eventVar.GetName ? eventVar.GetName() : eventVar._name) || '').trim();
            if (name) {
                this.eventVars[name] = eventVar;
            }
        }, this);
    };

    BetterdrRouletteController.prototype.getEventVar = function (name) {
        if (!this.eventVars[name] && this.eventSheetManager && this.eventSheetManager._eventVarsBySid) {
            this.cacheEventVars();
        }

        return this.eventVars[name] || null;
    };

    BetterdrRouletteController.prototype.getNumberVar = function (name) {
        var eventVar = this.getEventVar(name);
        if (!eventVar || typeof eventVar.GetValue !== 'function') {
            return 0;
        }

        return normalizeMoney(eventVar.GetValue());
    };

    BetterdrRouletteController.prototype.setNumberVar = function (name, value) {
        var eventVar = this.getEventVar(name);
        if (!eventVar || typeof eventVar.SetValue !== 'function') {
            return;
        }

        eventVar.SetValue(normalizeMoney(value));
    };

    BetterdrRouletteController.prototype.setInstanceVar = function (instance, index, value) {
        if (!instance || typeof instance.SetInstanceVariableValue !== 'function') {
            return;
        }

        instance.SetInstanceVariableValue(index, normalizeMoney(value));
    };

    BetterdrRouletteController.prototype.setObjectVisible = function (name, visible) {
        var instance = this.getPreferredInstance(name, 'Game') || this.getPreferredInstance(name);
        var worldInfo = instance && typeof instance.GetWorldInfo === 'function' ? instance.GetWorldInfo() : null;

        if (!worldInfo || typeof worldInfo.SetVisible !== 'function') {
            return;
        }

        worldInfo.SetVisible(!!visible);
    };

    BetterdrRouletteController.prototype.getObjectClass = function (name) {
        if (!this.runtime || typeof this.runtime.GetObjectClassByName !== 'function') {
            return null;
        }

        try {
            return this.runtime.GetObjectClassByName(name);
        } catch (err) {
            return null;
        }
    };

    BetterdrRouletteController.prototype.getInstances = function (name) {
        var objectClass = this.getObjectClass(name);
        if (!objectClass || typeof objectClass.GetInstances !== 'function') {
            return [];
        }

        return Array.from(objectClass.GetInstances() || []);
    };

    BetterdrRouletteController.prototype.getPreferredInstance = function (name, layerName) {
        var instances = this.getInstances(name);
        var preferred = null;
        var index;

        for (index = 0; index < instances.length; index += 1) {
            var instance = instances[index];
            var worldInfo = instance && typeof instance.GetWorldInfo === 'function' ? instance.GetWorldInfo() : null;
            var instanceLayerName = worldInfo && worldInfo.GetLayer ? worldInfo.GetLayer().GetName() : '';
            if (layerName && instanceLayerName !== layerName) {
                continue;
            }

            if (!preferred) {
                preferred = instance;
                continue;
            }

            if (worldInfo && preferred.GetWorldInfo && worldInfo.GetZIndex() > preferred.GetWorldInfo().GetZIndex()) {
                preferred = instance;
            }
        }

        return preferred || instances[0] || null;
    };

    BetterdrRouletteController.prototype.getBalanceInstance = function () {
        return this.getPreferredInstance('balance', 'Game');
    };

    BetterdrRouletteController.prototype.getBalanceSdkInstance = function () {
        var instance = this.getBalanceInstance();
        return instance && typeof instance.GetSdkInstance === 'function' ? instance.GetSdkInstance() : null;
    };

    BetterdrRouletteController.prototype.getTextSdkInstance = function (name) {
        var instance = name === 'balance'
            ? this.getBalanceInstance()
            : (this.getPreferredInstance(name, 'Game') || this.getPreferredInstance(name));

        return instance && typeof instance.GetSdkInstance === 'function' ? instance.GetSdkInstance() : null;
    };

    BetterdrRouletteController.prototype.getTextValue = function (name) {
        var sdkInstance = this.getTextSdkInstance(name);
        if (!sdkInstance) {
            return '';
        }

        if (typeof sdkInstance.GetText === 'function') {
            return String(sdkInstance.GetText());
        }

        return String(sdkInstance._text || '');
    };

    BetterdrRouletteController.prototype.setTextValue = function (name, value) {
        var instance = name === 'balance'
            ? this.getBalanceInstance()
            : (this.getPreferredInstance(name, 'Game') || this.getPreferredInstance(name));
        var sdkInstance = instance && typeof instance.GetSdkInstance === 'function' ? instance.GetSdkInstance() : null;
        if (!sdkInstance) {
            return;
        }

        if (typeof sdkInstance._SetText === 'function') {
            sdkInstance._SetText(String(value));
            return;
        }

        sdkInstance._text = String(value);
    };

    BetterdrRouletteController.prototype.setTextValueOnLayer = function (name, layerName, value) {
        var instance = this.getPreferredInstance(name, layerName);
        var sdkInstance = instance && typeof instance.GetSdkInstance === 'function' ? instance.GetSdkInstance() : null;

        if (!sdkInstance) {
            return;
        }

        if (typeof sdkInstance._SetText === 'function') {
            sdkInstance._SetText(String(value));
            return;
        }

        sdkInstance._text = String(value);
    };

    BetterdrRouletteController.prototype.getLayout = function () {
        if (!this.runtime) {
            return null;
        }

        if (typeof this.runtime.GetMainRunningLayout === 'function') {
            return this.runtime.GetMainRunningLayout();
        }

        if (typeof this.runtime.GetCurrentLayout === 'function') {
            return this.runtime.GetCurrentLayout();
        }

        return null;
    };

    BetterdrRouletteController.prototype.setLayerVisible = function (layerName, visible) {
        var layout = this.getLayout();
        var layer = layout && typeof layout.GetLayer === 'function' ? layout.GetLayer(layerName) : null;

        if (!layer || typeof layer.SetVisible !== 'function') {
            return;
        }

        layer.SetVisible(!!visible);
        if (this.runtime && typeof this.runtime.UpdateRender === 'function') {
            this.runtime.UpdateRender();
        }
    };

    BetterdrRouletteController.prototype.getDisplayedBetAmount = function () {
        if (this.pendingRound && this.pendingRound.totalWager > 0) {
            return normalizeMoney(this.pendingRound.totalWager);
        }

        return this.readCurrentBets().totalWager;
    };

    BetterdrRouletteController.prototype.getVisibleBalanceAmount = function () {
        var available;

        if (!this.balanceReady) {
            return 0;
        }

        available = normalizeMoney(this.balance - this.getDisplayedBetAmount());
        return available > 0 ? available : 0;
    };

    BetterdrRouletteController.prototype.getVisibleBalanceText = function () {
        return formatNativeAmount(this.getVisibleBalanceAmount());
    };

    BetterdrRouletteController.prototype.getDisplayedWinAmount = function () {
        return normalizeMoney(this.lastSettledWinAmount);
    };

    BetterdrRouletteController.prototype.getDisplayTextValue = function (name) {
        switch (String(name || '')) {
            case 'balance':
                return this.getVisibleBalanceText();
            case 'bet':
                return formatNativeAmount(this.getDisplayedBetAmount());
            case 'Texto':
            case 'lose':
            case 'win':
            case 'Resultado':
            case 'amount':
            case 'wintxt':
            case 'losetxt':
                if (this.activePopup && this.activePopup.displayText) {
                    return this.activePopup.displayText;
                }
                if (String(name || '') === 'win') {
                    return formatNativeAmount(this.getDisplayedWinAmount());
                }
                return '';
            case 'txt':
                return this.statusTextValue || '';
            default:
                return '';
        }
    };

    BetterdrRouletteController.prototype.hookDisplayText = function (name) {
        var self = this;
        var key = String(name || '');
        var sdkInstance = this.getTextSdkInstance(key);

        if (!sdkInstance || this.textHooks[key] || typeof sdkInstance._SetText !== 'function') {
            return;
        }

        this.textHooks[key] = {
            originalSetText: sdkInstance._SetText.bind(sdkInstance)
        };
        sdkInstance._SetText = function () {
            self.textHooks[key].originalSetText(self.getDisplayTextValue(key));
        };
    };

    BetterdrRouletteController.prototype.readNativeCoins = function () {
        return this.getNumberVar('coins');
    };

    BetterdrRouletteController.prototype.applyAuthoritativeBalance = function (value) {
        var amount = normalizeMoney(value);

        this.balanceVersion += 1;
        this.balance = amount;
        this.balanceReady = true;
        this.overrideEngineBalance();
    };

    BetterdrRouletteController.prototype.overrideDisplayedBalance = function () {
        var self = this;

        if (!this.balanceReady) {
            return;
        }

        ['balance', 'bet', 'win'].forEach(function (name) {
            var hook = self.textHooks[name];

            self.hookDisplayText(name);
            hook = self.textHooks[name];
            if (hook && typeof hook.originalSetText === 'function') {
                hook.originalSetText(self.getDisplayTextValue(name));
                return;
            }

            self.setTextValue(name, self.getDisplayTextValue(name));
        });
    };

    BetterdrRouletteController.prototype.overrideEngineBalance = function () {
        if (!this.balanceReady) {
            return;
        }

        this.setNumberVar('coins', this.balance);
        this.setNumberVar('bet', this.getDisplayedBetAmount());
        this.setNumberVar('win', this.getDisplayedWinAmount());
        this.overrideDisplayedBalance();
    };

    BetterdrRouletteController.prototype.startBalanceTick = function () {
        var self = this;

        function tick() {
            self.applyBetStateToInstances();
            self.observeNativeRoundStart();
            self.overrideDisplayedBalance();
            self.overrideEngineBalance();
            self.syncPopupVisibility();
            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    };

    BetterdrRouletteController.prototype.startBalanceRefresh = function () {
        var self = this;

        if (this.balanceRefreshHandler) {
            return;
        }

        this.balanceRefreshHandler = function () {
            if (self.pendingRound) {
                return;
            }
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            self.syncBalance();
        };

        window.addEventListener('focus', this.balanceRefreshHandler);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.balanceRefreshHandler);
        }

        this.balancePollTimer = window.setInterval(function () {
            if (self.pendingRound) {
                return;
            }
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }
            self.syncBalance();
        }, BALANCE_REFRESH_MS);
    };

    BetterdrRouletteController.prototype.syncBalance = function () {
        var self = this;
        var syncNonce;
        var balanceVersion;

        if (!this.bridge || typeof this.bridge.getBalance !== 'function') {
            return;
        }

        this.balanceSyncNonce += 1;
        syncNonce = this.balanceSyncNonce;
        balanceVersion = this.balanceVersion;

        this.bridge.getBalance()
            .then(function (payload) {
                var nextBalance;

                if (syncNonce !== self.balanceSyncNonce || balanceVersion !== self.balanceVersion || self.pendingRound) {
                    return;
                }

                nextBalance = payload && payload.availableBalance !== undefined
                    ? payload.availableBalance
                    : payload && payload.balance !== undefined
                        ? payload.balance
                        : payload && payload.newBalance !== undefined
                            ? payload.newBalance
                            : 0;

                self.applyAuthoritativeBalance(nextBalance);
            })
            .catch(function (err) {
                console.error('Failed to sync roulette balance:', err);
            });
    };

    BetterdrRouletteController.prototype.attachCanvasListeners = function () {
        var canvas = window.c3canvas;

        if (!canvas || this.canvasListenerAttached) {
            return;
        }

        this.canvasListenerAttached = true;
        canvas.addEventListener('pointerdown', this.handleCanvasPointerDown.bind(this), true);
    };

    BetterdrRouletteController.prototype.handleCanvasPointerDown = function (event) {
        var point = this.clientPointToWorld(event.clientX, event.clientY);
        var chipAmount;
        var betSpot;

        if (!point) {
            return;
        }

        if (this.activePopup) {
            if (
                this.hitTestObject('btcontinue', point.x, point.y) ||
                this.hitTestObject('btcontinue2', point.x, point.y)
            ) {
                this.consumePointerEvent(event);
                this.hideRoundPopup();
                return;
            }

            this.consumePointerEvent(event);
            this.hideRoundPopup();
            return;
        }

        chipAmount = this.getChipAmountAtPoint(point.x, point.y);
        if (chipAmount > 0) {
            this.consumePointerEvent(event);
            this.handleChipSelection(chipAmount);
            return;
        }

        if (this.hitTestObject('btclear', point.x, point.y)) {
            this.consumePointerEvent(event);
            this.handleNativeClear();
            return;
        }

        betSpot = this.getBetSpotAtPoint(point.x, point.y);
        if (betSpot) {
            this.consumePointerEvent(event);
            this.handleBetPlacement(betSpot);
            return;
        }

        if (this.hitTestObject('btplayagain', point.x, point.y)) {
            setTimeout(this.handleNativeSpin.bind(this), 50);
            return;
        }
    };

    BetterdrRouletteController.prototype.consumePointerEvent = function (event) {
        if (!event) {
            return;
        }

        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }
    };

    BetterdrRouletteController.prototype.clientPointToWorld = function (clientX, clientY) {
        var canvas = window.c3canvas;
        var layout;
        var gameLayer;
        var runtimeClientX;
        var runtimeClientY;
        var cssX;
        var cssY;
        var layerCoords;
        var rect;
        var width;
        var height;

        if (!canvas) {
            return null;
        }

        layout = this.getLayout();
        gameLayer = layout && typeof layout.GetLayer === 'function' ? layout.GetLayer('Game') : null;
        if (
            gameLayer &&
            typeof gameLayer.CanvasCssToLayer === 'function' &&
            this.runtime &&
            typeof this.runtime.GetCanvasClientX === 'function' &&
            typeof this.runtime.GetCanvasClientY === 'function'
        ) {
            runtimeClientX = Number(this.runtime.GetCanvasClientX());
            runtimeClientY = Number(this.runtime.GetCanvasClientY());
            if (isFinite(runtimeClientX) && isFinite(runtimeClientY)) {
                cssX = clientX - runtimeClientX;
                cssY = clientY - runtimeClientY;
                layerCoords = gameLayer.CanvasCssToLayer(cssX, cssY, 0);
                if (Array.isArray(layerCoords) && layerCoords.length >= 2 && isFinite(layerCoords[0]) && isFinite(layerCoords[1])) {
                    return {
                        x: layerCoords[0],
                        y: layerCoords[1]
                    };
                }
            }
        }

        rect = canvas.getBoundingClientRect();
        width = this.runtime && typeof this.runtime.GetOriginalViewportWidth === 'function'
            ? this.runtime.GetOriginalViewportWidth()
            : ORIGINAL_WIDTH;
        height = this.runtime && typeof this.runtime.GetOriginalViewportHeight === 'function'
            ? this.runtime.GetOriginalViewportHeight()
            : ORIGINAL_HEIGHT;

        if (!rect.width || !rect.height) {
            return null;
        }

        return {
            x: ((clientX - rect.left) / rect.width) * width,
            y: ((clientY - rect.top) / rect.height) * height
        };
    };

    BetterdrRouletteController.prototype.hitTestObject = function (name, worldX, worldY) {
        var instance = this.getPreferredInstance(name, 'Game') || this.getPreferredInstance(name);
        var worldInfo;
        var halfWidth;
        var halfHeight;

        if (!instance || typeof instance.GetWorldInfo !== 'function') {
            return false;
        }

        worldInfo = instance.GetWorldInfo();
        if (!worldInfo || (typeof worldInfo.IsVisible === 'function' && !worldInfo.IsVisible())) {
            return false;
        }

        halfWidth = worldInfo.GetWidth() / 2;
        halfHeight = worldInfo.GetHeight() / 2;

        return (
            worldX >= worldInfo.GetX() - halfWidth &&
            worldX <= worldInfo.GetX() + halfWidth &&
            worldY >= worldInfo.GetY() - halfHeight &&
            worldY <= worldInfo.GetY() + halfHeight
        );
    };

    BetterdrRouletteController.prototype.hitTestInstance = function (instance, worldX, worldY) {
        var worldInfo;
        var layer;
        var halfWidth;
        var halfHeight;

        if (!instance || typeof instance.GetWorldInfo !== 'function') {
            return false;
        }

        worldInfo = instance.GetWorldInfo();
        layer = worldInfo && typeof worldInfo.GetLayer === 'function' ? worldInfo.GetLayer() : null;
        if (
            !worldInfo ||
            (typeof worldInfo.IsVisible === 'function' && !worldInfo.IsVisible()) ||
            (layer && typeof layer.IsVisible === 'function' && !layer.IsVisible())
        ) {
            return false;
        }

        halfWidth = Math.abs(worldInfo.GetWidth()) / 2;
        halfHeight = Math.abs(worldInfo.GetHeight()) / 2;

        return (
            worldX >= worldInfo.GetX() - halfWidth &&
            worldX <= worldInfo.GetX() + halfWidth &&
            worldY >= worldInfo.GetY() - halfHeight &&
            worldY <= worldInfo.GetY() + halfHeight
        );
    };

    BetterdrRouletteController.prototype.getBackgroundSourcePoint = function (worldX, worldY) {
        var instance = this.getPreferredInstance(TABLE_BACKGROUND_NAME, 'Game') || this.getPreferredInstance(TABLE_BACKGROUND_NAME);
        var worldInfo;
        var width;
        var height;
        var left;
        var top;

        if (!instance || typeof instance.GetWorldInfo !== 'function') {
            return null;
        }

        worldInfo = instance.GetWorldInfo();
        if (!worldInfo || (typeof worldInfo.IsVisible === 'function' && !worldInfo.IsVisible())) {
            return null;
        }

        width = Math.abs(worldInfo.GetWidth());
        height = Math.abs(worldInfo.GetHeight());
        if (!width || !height) {
            return null;
        }

        left = worldInfo.GetX() - (width * TABLE_BACKGROUND_ORIGIN_X);
        top = worldInfo.GetY() - (height * TABLE_BACKGROUND_ORIGIN_Y);

        if (worldX < left || worldX > left + width || worldY < top || worldY > top + height) {
            return null;
        }

        return {
            x: ((worldX - left) / width) * TABLE_BACKGROUND_SOURCE_WIDTH,
            y: ((worldY - top) / height) * TABLE_BACKGROUND_SOURCE_HEIGHT
        };
    };

    BetterdrRouletteController.prototype.getChipAmountAtPoint = function (worldX, worldY) {
        var sourcePoint = this.getBackgroundSourcePoint(worldX, worldY);
        var amount = 0;

        if (!sourcePoint) {
            return 0;
        }

        CHIP_SOURCE_REGIONS.some(function (region) {
            var dx = sourcePoint.x - region.x;
            var dy = sourcePoint.y - region.y;

            if ((dx * dx) + (dy * dy) <= region.radius * region.radius) {
                amount = region.amount;
                return true;
            }

            return false;
        });

        return amount;
    };

    BetterdrRouletteController.prototype.getBetSpotAtPoint = function (worldX, worldY) {
        var best = null;
        var bestZ = -Infinity;
        var bestArea = Infinity;

        this.getInstances('ficha').forEach(function (instance) {
            var worldInfo;
            var area;
            var zIndex;

            if (!this.hitTestInstance(instance, worldX, worldY)) {
                return;
            }

            worldInfo = instance.GetWorldInfo();
            area = Math.abs(worldInfo.GetWidth() * worldInfo.GetHeight());
            zIndex = typeof worldInfo.GetZIndex === 'function' ? worldInfo.GetZIndex() : 0;

            if (zIndex > bestZ || (zIndex === bestZ && area < bestArea)) {
                best = instance;
                bestZ = zIndex;
                bestArea = area;
            }
        }, this);

        return best;
    };

    BetterdrRouletteController.prototype.formatOutcomeLabel = function (outcome) {
        var number;
        var color;

        if (!outcome || typeof outcome !== 'object') {
            return '';
        }

        number = outcome.number;
        color = String(outcome.color || '').trim();
        if (number === null || number === undefined || number === '') {
            return color;
        }

        return color ? String(number) + ' ' + color.toUpperCase() : String(number);
    };

    BetterdrRouletteController.prototype.setStatusMessage = function (message, durationMs) {
        var self = this;
        var text = String(message || '').trim();

        if (this.statusMessageTimer) {
            clearTimeout(this.statusMessageTimer);
            this.statusMessageTimer = null;
        }

        this.statusTextValue = text;
        this.setTextValue('txt', text);
        this.setObjectVisible('txt', text !== '');

        if (text === '') {
            return;
        }

        this.statusMessageTimer = setTimeout(function () {
            self.statusTextValue = '';
            self.setTextValue('txt', '');
            self.setObjectVisible('txt', false);
            self.statusMessageTimer = null;
        }, Math.max(0, durationMs || STATUS_MESSAGE_MS));
    };

    BetterdrRouletteController.prototype.resolveFrameChipAmount = function (amount) {
        var chipAmount = normalizeMoney(amount);

        // Map chip amount to its Sprite animation frame index
        if (chipAmount >= 5000) {
            return 4; // Frame for $5000
        }
        if (chipAmount >= 1000) {
            return 3; // Frame for $1000
        }
        if (chipAmount >= 500) {
            return 2; // Frame for $500
        }
        if (chipAmount >= 100) {
            return 1; // Frame for $100
        }

        return 0; // Frame for $50
    };

    BetterdrRouletteController.prototype.getBetStateKey = function (instance) {
        var uid;

        if (!instance) {
            return '';
        }

        if (typeof instance.GetUID === 'function') {
            uid = instance.GetUID();
            if (uid !== null && uid !== undefined) {
                return 'uid:' + String(uid);
            }
        }

        if (instance._uid !== undefined && instance._uid !== null) {
            return 'uid:' + String(instance._uid);
        }

        if (instance._sid !== undefined && instance._sid !== null) {
            return 'sid:' + String(instance._sid);
        }

        return '';
    };

    BetterdrRouletteController.prototype.rebuildBetStateFromInstances = function () {
        var nextState = Object.create(null);

        this.getInstances('ficha').forEach(function (instance) {
            var key = this.getBetStateKey(instance);
            var amount;
            var frame;

            if (!key) {
                return;
            }

            amount = normalizeMoney(instance.GetInstanceVariableValue(1));
            frame = Math.max(0, Math.round(Number(instance.GetInstanceVariableValue(2) || 0)));
            nextState[key] = {
                amount: amount,
                frame: frame
            };
        }, this);

        this.betStateByKey = nextState;
    };

    BetterdrRouletteController.prototype.getBetStateForInstance = function (instance) {
        var key = this.getBetStateKey(instance);
        var state;

        if (!key) {
            return null;
        }

        state = this.betStateByKey[key];
        if (!state) {
            state = {
                amount: 0,
                frame: 0
            };
            this.betStateByKey[key] = state;
        }

        return state;
    };

    BetterdrRouletteController.prototype.setBetStateForInstance = function (instance, amount, frame) {
        var state = this.getBetStateForInstance(instance);
        var nextAmount;
        var nextFrame;

        if (!state) {
            return;
        }

        nextAmount = normalizeMoney(amount);
        nextFrame = Math.max(0, Math.round(Number(frame || 0)));
        state.amount = nextAmount;
        state.frame = nextFrame;
        this.setInstanceVar(instance, 1, nextAmount);
        this.setInstanceVar(instance, 2, nextFrame);
    };

    BetterdrRouletteController.prototype.getBetAmountForInstance = function (instance) {
        var state = this.getBetStateForInstance(instance);
        return state ? normalizeMoney(state.amount) : 0;
    };

    BetterdrRouletteController.prototype.applyBetStateToInstances = function () {
        this.getInstances('ficha').forEach(function (instance) {
            var state = this.getBetStateForInstance(instance);
            var currentAmount;
            var currentFrame;

            if (!state) {
                return;
            }

            currentAmount = normalizeMoney(instance.GetInstanceVariableValue(1));
            currentFrame = Math.max(0, Math.round(Number(instance.GetInstanceVariableValue(2) || 0)));

            if (Math.abs(currentAmount - normalizeMoney(state.amount)) > 0.000001) {
                this.setInstanceVar(instance, 1, state.amount);
            }
            if (currentFrame !== state.frame) {
                this.setInstanceVar(instance, 2, state.frame);
            }
        }, this);
    };

    BetterdrRouletteController.prototype.handleChipSelection = function (amount) {
        if (this.pendingRound) {
            return;
        }

        this.hideRoundPopup();
        this.selectedChipAmount = normalizeMoney(amount);
        this.setStatusMessage('Chip selected: $' + formatNativeAmount(this.selectedChipAmount), STATUS_MESSAGE_MS);
    };

    BetterdrRouletteController.prototype.resetOutsideBetState = function () {
        Object.keys(OUTSIDE_BET_VAR_NAMES).forEach(function (key) {
            this.setNumberVar(OUTSIDE_BET_VAR_NAMES[key], 0);
        }, this);
    };

    BetterdrRouletteController.prototype.syncNativeBetState = function () {
        var selection = this.readCurrentBets();

        this.applyBetStateToInstances();
        this.resetOutsideBetState();

        selection.bets.forEach(function (bet) {
            var key = bet.type + ':' + bet.value;
            var eventVarName = OUTSIDE_BET_VAR_NAMES[key];

            if (!eventVarName) {
                return;
            }

            this.setNumberVar(eventVarName, this.getNumberVar(eventVarName) + bet.amount);
        }, this);

        if (selection.totalWager > 0) {
            this.captureSelectionSnapshot(selection);
        } else {
            this.latestSelectionSnapshot = null;
        }

        this.overrideEngineBalance();
    };

    BetterdrRouletteController.prototype.handleBetPlacement = function (instance) {
        var currentAmount;
        var nextAmount;
        var nextSelection;
        var descriptor;
        var betLabel;
        var selection;
        var nextTotal;

        if (this.pendingRound) {
            return;
        }

        if (this.selectedChipAmount <= 0) {
            this.setStatusMessage('Select a chip first', STATUS_MESSAGE_MS);
            return;
        }

        selection = this.readCurrentBets();
        nextTotal = normalizeMoney(selection.totalWager + this.selectedChipAmount);
        if (this.balanceReady && nextTotal > this.balance + 0.000001) {
            this.setStatusMessage('Insufficient balance', STATUS_MESSAGE_MS);
            return;
        }

        this.hideRoundPopup();
        this.lastSettledWinAmount = 0;
        currentAmount = this.getBetAmountForInstance(instance);
        nextAmount = normalizeMoney(currentAmount + this.selectedChipAmount);

        this.setBetStateForInstance(instance, nextAmount, this.resolveFrameChipAmount(this.selectedChipAmount));
        this.syncNativeBetState();

        descriptor = buildRegionDescriptor(instance.GetInstanceVariableValue(0));
        betLabel = this.describeBet(descriptor);
        nextSelection = this.readCurrentBets();
        this.setStatusMessage(
            'Bet placed: ' + (betLabel || 'spot')
                + ' +$' + formatNativeAmount(this.selectedChipAmount)
                + ' (spot $' + formatNativeAmount(nextAmount)
                + ', total $' + formatNativeAmount(nextSelection.totalWager) + ')',
            STATUS_MESSAGE_MS
        );
    };

    BetterdrRouletteController.prototype.readCurrentBets = function () {
        var bets = [];
        var totalWager = 0;

        this.getInstances('ficha').forEach(function (instance) {
            var amount = this.getBetAmountForInstance(instance);
            var descriptor;

            if (amount <= 0) {
                return;
            }

            descriptor = buildRegionDescriptor(instance.GetInstanceVariableValue(0));
            if (!descriptor) {
                return;
            }

            bets.push({
                type: descriptor.type,
                value: descriptor.value,
                amount: amount
            });
            totalWager += amount;
        });

        return {
            bets: bets,
            totalWager: normalizeMoney(totalWager)
        };
    };

    BetterdrRouletteController.prototype.describeBet = function (bet) {
        var type;
        var value;
        var key;

        if (!bet || typeof bet !== 'object') {
            return '';
        }

        type = String(bet.type || '').trim().toLowerCase();
        value = toNormalizedBetValue(bet.value);
        key = type + ':' + value;

        if (type === 'straight' && value !== '') {
            return value;
        }

        return BET_LABELS[key] || (type && value ? type + ' ' + value : '');
    };

    BetterdrRouletteController.prototype.captureSelectionSnapshot = function (selection) {
        var nextSelection = selection || this.readCurrentBets();

        if (!nextSelection.bets.length || nextSelection.totalWager <= 0) {
            return null;
        }

        this.latestSelectionSnapshot = {
            bets: nextSelection.bets.map(function (bet) {
                return {
                    type: bet.type,
                    value: bet.value,
                    amount: normalizeMoney(bet.amount)
                };
            }),
            totalWager: normalizeMoney(nextSelection.totalWager),
            coinsBefore: this.readNativeCoins(),
            outcomeBefore: Math.round(this.getNumberVar('valor')),
            capturedAt: Date.now()
        };

        return this.latestSelectionSnapshot;
    };

    BetterdrRouletteController.prototype.beginPendingRound = function (selectionSnapshot) {
        var snapshot = selectionSnapshot || this.latestSelectionSnapshot;
        var requestId;

        if (
            this.pendingRound ||
            !snapshot ||
            !snapshot.bets ||
            !snapshot.bets.length ||
            snapshot.totalWager <= 0 ||
            !this.bridge ||
            typeof this.bridge.placeBet !== 'function'
        ) {
            return false;
        }

        requestId = typeof this.bridge.createRequestId === 'function'
            ? this.bridge.createRequestId('roulette')
            : 'roulette_' + Date.now().toString(36);

        this.pendingRound = {
            requestId: requestId,
            bets: snapshot.bets.map(function (bet) {
                return {
                    type: bet.type,
                    value: bet.value,
                    amount: normalizeMoney(bet.amount)
                };
            }),
            totalWager: normalizeMoney(snapshot.totalWager),
            coinsBefore: normalizeMoney(snapshot.coinsBefore),
            outcomeBefore: Math.round(snapshot.outcomeBefore),
            startedAt: Date.now(),
            ballVisibleAtLeastOnce: false,
            outcomeCandidate: null,
            outcomeCandidateAt: 0
        };
        this.lastSettledWinAmount = 0;
        this.latestSelectionSnapshot = null;
        this.lastObservedSpinAt = this.pendingRound.startedAt;
        this.overrideEngineBalance();
        this.pollPendingRound();
        return true;
    };

    BetterdrRouletteController.prototype.observeNativeRoundStart = function () {
        var selection;
        var now = Date.now();
        var ballVisible = this.isBallVisible();
        var snapshotAge = this.latestSelectionSnapshot
            ? now - this.latestSelectionSnapshot.capturedAt
            : Infinity;
        var timeSinceLastSettle = now - this.lastRoundSettledAt;

        if (!this.pendingRound && timeSinceLastSettle > 2000) {
            selection = this.readCurrentBets();
            if (selection.bets.length && selection.totalWager > 0) {
                this.captureSelectionSnapshot(selection);
                snapshotAge = 0;
            } else if (snapshotAge > 5000) {
                this.latestSelectionSnapshot = null;
            }

            if (ballVisible && !this.lastBallVisible && this.latestSelectionSnapshot && snapshotAge <= 5000) {
                this.beginPendingRound(this.latestSelectionSnapshot);
            }
        }

        this.lastBallVisible = ballVisible;
    };

    BetterdrRouletteController.prototype.getBarrierForOutcomeNumber = function (number) {
        var match = null;

        this.getInstances('barreira').some(function (instance) {
            if (Math.round(instance.GetInstanceVariableValue(0)) === Math.round(number)) {
                match = instance;
                return true;
            }

            return false;
        });

        return match;
    };

    BetterdrRouletteController.prototype.snapBallToOutcomeNumber = function (number) {
        var ball = this.getPreferredInstance('ball', 'Game') || this.getPreferredInstance('ball');
        var barrier = this.getBarrierForOutcomeNumber(number);
        var ballInfo;
        var barrierInfo;

        if (!ball || !barrier || typeof ball.GetWorldInfo !== 'function' || typeof barrier.GetWorldInfo !== 'function') {
            return;
        }

        ballInfo = ball.GetWorldInfo();
        barrierInfo = barrier.GetWorldInfo();
        if (!ballInfo || !barrierInfo || typeof ballInfo.SetXY !== 'function') {
            return;
        }

        ballInfo.SetXY(barrierInfo.GetX(), barrierInfo.GetY());
        if (typeof ballInfo.SetBboxChanged === 'function') {
            ballInfo.SetBboxChanged();
        }
        if (this.runtime && typeof this.runtime.UpdateRender === 'function') {
            this.runtime.UpdateRender();
        }
    };

    BetterdrRouletteController.prototype.stopBallSnapLoop = function () {
        if (!this.ballSnapTimer) {
            this.ballSnapOutcomeNumber = null;
            return;
        }

        clearInterval(this.ballSnapTimer);
        this.ballSnapTimer = null;
        this.ballSnapOutcomeNumber = null;
    };

    BetterdrRouletteController.prototype.startBallSnapLoop = function (number) {
        var self = this;
        var outcomeNumber = Number(number);
        var normalizedOutcome;

        if (!isFinite(outcomeNumber)) {
            this.stopBallSnapLoop();
            return;
        }

        normalizedOutcome = Math.round(outcomeNumber);
        if (this.ballSnapTimer && this.ballSnapOutcomeNumber === normalizedOutcome) {
            this.snapBallToOutcomeNumber(normalizedOutcome);
            return;
        }

        this.stopBallSnapLoop();
        this.ballSnapOutcomeNumber = normalizedOutcome;
        this.snapBallToOutcomeNumber(normalizedOutcome);
        this.ballSnapTimer = setInterval(function () {
            var popupOutcome;
            var popupOutcomeNumber;
            if (!self.activePopup || self.activePopup.outcomeNumber === null || self.activePopup.outcomeNumber === undefined) {
                self.stopBallSnapLoop();
                return;
            }

            popupOutcome = Number(self.activePopup.outcomeNumber);
            if (!isFinite(popupOutcome)) {
                self.stopBallSnapLoop();
                return;
            }

            popupOutcomeNumber = Math.round(popupOutcome);
            if (self.ballSnapOutcomeNumber !== popupOutcomeNumber) {
                self.stopBallSnapLoop();
                self.startBallSnapLoop(popupOutcomeNumber);
                return;
            }

            self.snapBallToOutcomeNumber(popupOutcomeNumber);
        }, BALL_RESNAP_INTERVAL_MS);
    };

    BetterdrRouletteController.prototype.syncPopupVisibility = function () {
        var showWin = !!(this.activePopup && this.activePopup.layerName === 'Win');
        var showLose = !!(this.activePopup && this.activePopup.layerName === 'Lose');

        this.setLayerVisible('Win', showWin);
        this.setLayerVisible('Lose', showLose);

        if (this.activePopup && this.activePopup.outcomeNumber !== null && this.activePopup.outcomeNumber !== undefined) {
            this.startBallSnapLoop(this.activePopup.outcomeNumber);
        } else {
            this.stopBallSnapLoop();
        }

        if (showWin || showLose) {
            var layerName = this.activePopup.layerName;
            var displayText = this.activePopup.displayText || '';
            if (displayText) {
                // If hooked, update immediately by triggering text refresh
                this.setTextValueOnLayer('Texto', 'Win', displayText);
                this.setTextValueOnLayer('lose', 'Lose', displayText);
                this.setTextValueOnLayer('txt', layerName, displayText);
                this.setTextValueOnLayer('win', 'Win', displayText);
                this.setTextValueOnLayer('amount', layerName, displayText);
                this.setTextValueOnLayer('Resultado', layerName, displayText);
                this.setTextValueOnLayer('wintxt', 'Win', displayText);
                this.setTextValueOnLayer('losetxt', 'Lose', displayText);
            }
        }
    };

    BetterdrRouletteController.prototype.hideRoundPopup = function () {
        this.activePopup = null;
        this.settledOutcomeNumber = null;
        this.stopBallSnapLoop();
        this.syncPopupVisibility();
    };

    BetterdrRouletteController.prototype.showRoundPopup = function (payload) {
        var totalReturn = normalizeMoney(payload && payload.totalReturn !== undefined ? payload.totalReturn : 0);
        var totalWager = normalizeMoney(payload && payload.totalWager !== undefined ? payload.totalWager : 0);
        var netResult = normalizeMoney(payload && payload.netResult !== undefined ? payload.netResult : (totalReturn - totalWager));
        var outcome = payload && payload.rouletteOutcome ? payload.rouletteOutcome : null;
        var isWin = netResult > 0.000001;
        var isLose = netResult < -0.000001;
        var outcomeLabel = this.formatOutcomeLabel(outcome);
        var popupAmountText = isWin
            ? '+$' + formatNativeAmount(netResult)
            : isLose
                ? '-$' + formatNativeAmount(Math.abs(netResult))
                : '$0';
        var topNumberText = outcomeLabel ? 'Number ' + outcomeLabel + ' | ' : '';

        var layerName = isLose ? 'Lose' : 'Win';
        var outcomeNumber = outcome && outcome.number !== undefined ? outcome.number : null;

        if (outcomeNumber !== null) {
            this.settledOutcomeNumber = outcomeNumber;
        }

        this.activePopup = {
            layerName: layerName,
            outcomeNumber: outcomeNumber,
            displayText: popupAmountText
        };

        this.syncPopupVisibility();
        this.overrideDisplayedBalance();

        if (isWin) {
            this.setStatusMessage(topNumberText + 'You Win ' + popupAmountText, RESULT_MESSAGE_MS);
            return;
        }

        if (isLose) {
            this.setStatusMessage(topNumberText + 'You Lose ' + popupAmountText, RESULT_MESSAGE_MS);
            return;
        }

        this.setStatusMessage(topNumberText + 'Push ' + popupAmountText, RESULT_MESSAGE_MS);
    };

    BetterdrRouletteController.prototype.handleNativeClear = function (options) {
        var preserveWin = !!(options && options.preserveWin);

        if (this.pendingRound) {
            return;
        }

        if (!preserveWin) {
            this.hideRoundPopup();
        }
        this.getInstances('ficha').forEach(function (instance) {
            this.setBetStateForInstance(instance, 0, 0);
        }, this);

        this.latestSelectionSnapshot = null;
        this.lastObservedSpinAt = 0;
        if (!preserveWin) {
            this.lastSettledWinAmount = 0;
        }
        this.syncNativeBetState();
    };

    BetterdrRouletteController.prototype.handleNativeSpin = function () {
        var selection;

        if (this.pendingRound || !this.bridge || typeof this.bridge.placeBet !== 'function') {
            return;
        }

        this.hideRoundPopup();
        selection = this.readCurrentBets();
        if (!selection.bets.length || selection.totalWager <= 0) {
            this.setStatusMessage('Place a bet first', STATUS_MESSAGE_MS);
            return;
        }
        if (this.balanceReady && selection.totalWager > this.balance + 0.000001) {
            this.setStatusMessage('Insufficient balance', STATUS_MESSAGE_MS);
            return;
        }

        this.lastSettledWinAmount = 0;
        this.captureSelectionSnapshot(selection);
        this.beginPendingRound(this.latestSelectionSnapshot);
    };

    BetterdrRouletteController.prototype.isBallVisible = function () {
        var instance = this.getPreferredInstance('ball', 'Game') || this.getPreferredInstance('ball');
        var worldInfo = instance && typeof instance.GetWorldInfo === 'function' ? instance.GetWorldInfo() : null;

        return !!(worldInfo && typeof worldInfo.IsVisible === 'function' && worldInfo.IsVisible());
    };

    BetterdrRouletteController.prototype.pollPendingRound = function () {
        var self = this;
        var round = this.pendingRound;
        var outcomeNumber;
        var now;
        var ballVisible;

        if (!round) {
            return;
        }

        now = Date.now();
        outcomeNumber = Math.round(this.getNumberVar('valor'));
        ballVisible = this.isBallVisible();

        if (ballVisible) {
            round.ballVisibleAtLeastOnce = true;
        }

        if (outcomeNumber >= 0 && outcomeNumber <= 36) {
            if (round.outcomeCandidate === null) {
                round.outcomeCandidate = outcomeNumber;
                round.outcomeCandidateAt = now;
            } else if (round.outcomeCandidate !== outcomeNumber) {
                round.outcomeCandidate = outcomeNumber;
                round.outcomeCandidateAt = now;
            }
        }

        if (
            round.ballVisibleAtLeastOnce &&
            !ballVisible &&
            round.outcomeCandidate !== null &&
            now - round.outcomeCandidateAt >= POST_SETTLE_STABILIZE_MS
        ) {
            this.persistPendingRound(round, round.outcomeCandidate);
            return;
        }

        if (
            round.ballVisibleAtLeastOnce &&
            round.outcomeCandidate !== null &&
            round.outcomeCandidate !== round.outcomeBefore &&
            now - round.outcomeCandidateAt >= POST_SETTLE_STABILIZE_MS &&
            now - round.startedAt >= 1200 &&
            now - round.startedAt >= (ROUND_SETTLE_TIMEOUT_MS - 1500)
        ) {
            this.persistPendingRound(round, round.outcomeCandidate);
            return;
        }

        if (now - round.startedAt >= ROUND_SETTLE_TIMEOUT_MS) {
            console.error('Roulette round settlement timed out');
            this.pendingRound = null;
            this.handleNativeClear();
            this.setStatusMessage('Round delayed, syncing balance...', 2800);
            this.syncBalance();
            return;
        }

        clearTimeout(this.roundPollTimer);
        this.roundPollTimer = setTimeout(function () {
            self.pollPendingRound();
        }, ROUND_POLL_MS);
    };

    BetterdrRouletteController.prototype.persistPendingRound = function (round, observedOutcomeNumber) {
        var self = this;

        clearTimeout(this.roundPollTimer);
        this.roundPollTimer = null;

        this.bridge.placeBet(round.bets, round.requestId)
            .then(function (payload) {
                var settledOutcomeNumber = payload && payload.rouletteOutcome && payload.rouletteOutcome.number !== undefined
                    ? Number(payload.rouletteOutcome.number)
                    : Number(observedOutcomeNumber);
                var totalReturn = normalizeMoney(payload && payload.totalReturn !== undefined ? payload.totalReturn : 0);
                var totalWager = normalizeMoney(payload && payload.totalWager !== undefined ? payload.totalWager : round.totalWager);
                var netResult = normalizeMoney(payload && payload.netResult !== undefined ? payload.netResult : (totalReturn - totalWager));

                if (!self.pendingRound || self.pendingRound.requestId !== round.requestId) {
                    return;
                }

                self.pendingRound = null;
                self.lastRoundSettledAt = Date.now();
                self.lastSettledWinAmount = netResult > 0 ? netResult : 0;

                if (isFinite(settledOutcomeNumber)) {
                    self.settledOutcomeNumber = Math.round(settledOutcomeNumber);
                } else {
                    self.settledOutcomeNumber = null;
                }
                if (self.settledOutcomeNumber !== null) {
                    self.setNumberVar('valor', self.settledOutcomeNumber);
                    self.snapBallToOutcomeNumber(self.settledOutcomeNumber);
                }

                self.handleNativeClear({ preserveWin: true });
                self.applyAuthoritativeBalance(
                    payload && payload.balanceAfter !== undefined
                        ? payload.balanceAfter
                        : payload && payload.newBalance !== undefined
                            ? payload.newBalance
                            : self.balance
                );
                self.showRoundPopup(payload || {});
                self.syncBalance();
            })
            .catch(function (err) {
                if (self.pendingRound && self.pendingRound.requestId === round.requestId) {
                    self.pendingRound = null;
                    self.lastRoundSettledAt = Date.now();
                }
                self.handleNativeClear();
                console.error('Failed to persist roulette round:', err);
                self.setStatusMessage(err && err.message ? err.message : 'Failed to save roulette round', 4000);
                self.syncBalance();
            });
    };

    function registerController() {
        if (typeof runOnStartup !== 'function') {
            setTimeout(registerController, 0);
            return;
        }

        runOnStartup(function () {
            function boot() {
                var runtimeInterface = window.c3_runtimeInterface;
                var runtime = null;

                if (runtimeInterface && !runtimeInterface.UsesWorker() && typeof runtimeInterface._GetLocalRuntime === 'function') {
                    runtime = runtimeInterface._GetLocalRuntime();
                }

                if (
                    !runtime ||
                    typeof runtime.GetObjectClassByName !== 'function' ||
                    !window.c3canvas
                ) {
                    requestAnimationFrame(boot);
                    return;
                }

                window.__betterdrRouletteController = new BetterdrRouletteController(runtime);
                window.__betterdrRouletteController.init();
            }

            boot();
        });
    }

    registerController();
}());

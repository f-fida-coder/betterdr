/**
 * Global Module.
 *  It has all global variables. They are classified thus:
 *  Config: all variables related to features configuration
 *  Connector: all variables that comes from the server
 *  Language: all variables needed to apply multilanguage
 *  Bonus Round: all variables needed to apply bonus round
 *  Chiptransfer: all variables related to cashier
 *  Rebates: all variables related to rebates
 *  Game: general variables for any game
 *  SlotGame: all variables related specifically for slots
 *  GameUrls: urls needed for menu options
 *  RealityOptions: configuration needed for reality check
 *  menuOptions: configuration needed for menu options
 *  @module  Global
 */

var Global = {
    Config : {
        isChiptranfer: false,
        minCreditsCashier: 0,
        cashierType: 0, // 0 = no cashier; 1 = normal; 2 = silent cashier
        rebatesEnable: false,
        customErrorMessages: true,
        showCurrencySymbol: false,
        GameLoading: 2, //1 = yes/no question; 2 = start button
    },

    Connector : {
        login: null,
        password: null,
        casinoGameId: null,
        accountId: '1',
        lang: null,
        token: null,
        noRedirect: '1',
        errorCode: null,
        gameSession: null,
        globalGameSession: null,
        gameCode: null,
        currency: null,
        lastGameId: null,
        showCashier: 0,
        showHistory: 0,
        showType: null,
        showChips: null,
        showHour : null,
        rand: null,
        rootLevel: null,
        minb: null,
        maxb: null,
        iserr: null,
        errd: null,
        messageids: null,
        blockNote: null,
        availableBalance: null,
        messageId: null,
        msgContent: null,
        msgType: null,
        msgTitle: null,
        currencyObj: {},
        incoins: null,
        cv: null,
        cvals: null,
        cvalsd: null,
        lb: null,
        maxlb: null,
        minlb: null,
        lc: null,
        maxlc: null,
        frees: null,
        bal: null,
        paths: null,
        payt: null,
        reesa: null,
        gid: null,
        jackpot: null,
        jackpotNew: null,
        jpWon: null,
        twks: null,
        reels: null,
        fs: null,
        cuvars: null,
        brmult: null,
        analytics: null,
    },

    Language : {
        xml: null,
        translations: {},
        tweaksL: {},
        tweaksP: {},
        tweaksSVG: {},
        tweaksCustom: {},
        gameType: null, //SL5R, Tables
    },

    BonusRound : {
        brclid: null,
        brpayt: null,
        brmult: null,
        brcow: null,
        brvars: null,
        brplog: null,
        act: null,
        brwon : null,
        logReturn: null,
        alreadyPlayed: false,
        bonusLog: null,
        brtry: null,
        brlas: null,
        brlap: null,
        morls:null,
    },

    ChipTransfer : {
        accountBalance :null,
        gameBalance :null,
        cbalance :null,
        sbalance :null,
        errorcode :null,
        errordetails :null,
        maxBuyIn :null,
        minBuyIn: null,
        maxCashOut :null,
        defaultBuyIn :null,
        minCashOut :null,
        allowCashout :null,
        allowDecimals :null,
        showDeposit :null,
        toCasino: null,
        toAccount: null,
        errorDetails : null,
        currency: null,
        dataConnector : null,
        buyIn : null,
        buyInEnabled : null,
        buyInMessage : null,
        entries : null,
        positionRank : null,
        rebuy : null,
        rebuyEnabled : null,
        rebuyMessage : null,
        tcounter : null,
        gameSession : null,
        tCounterType: null,
    },

    Rebates : {
        balance: null,
        history:[],
        amountClaimed: null,
        gameBalance: null,
    },

    Game : {
        helpPage: null,
        currentOrientation:null,
        isCordovaApp: false
    },

    SlotGame : {
        callingSpin: false,
        processingSpinFlag: false,
    },

    TableGame : {

    },

    GameUrls: {
        casinoWrapperURL: webServiceUrl
    },


    RealityOptions : {
        showReality : false,
        container   : '#global',  // Id of container where all the content is gonna be aded
        historyUrl  : '',         // History url
        gameSession : '',         // Game session
        idToUser    : '',         // id of the actual player to validate session on storage
        path        : '',         // Location of the imgs required to generate the checker
        hist        : '',         // Function that is called when history button is triggered
        close       : ''          // Function that is called when close button is triggered
    },
    menuOptions : {
        src        : '',   // {string}  image path location             | mobile & desktop version
        navConfig  : null, // {object}  NavConfig Custom navigation     | mobile & desktop version
        helpUrl    : '',   // {string}  Url to help page                | mobile & desktop version
        accId      : '',   // {string}  account id                      | mobile & desktop version
        historyUrl : '',   // {string}  Url to history                  | mobile & desktop version
        gameSes    : '',   // {string}  Gamesession used to get history | mobile & desktop version
        showHelp   : 1,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        showCashier: 0,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        showRebates: 0,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        showHistory: 0,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        showExit   : 1,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        showTime   : 1,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        languaje   : 'en', // {string}  languaje                        | mobile & desktop version
        showNav    : 1,    // {boolean} 1 to show , 0 to hide           | desktop version
        mute       : 1,    // {boolean} 1 to show , 0 to hide           | mobile & desktop version
        tittle     : ''    // {string}  Tittle of the menu              | desktop version
    },

    BAC:{

        TiePercentage: null,
        PlayerCards: new Array(),
        BankerCards: new Array(),
        PlayerResults: new Array(),
        BankerResults: new Array(),
        ChipValues: new Array(),
        Result: null,
        BankerResult: null,
        SelectedChipValue:0,
        comm:null
    },
    PK3C:{

        gameId: null,
        prizes: null,
        sessionId: null,
        anteAmt:0,
        pairplusAmt:0,
        PC1:null,
        PC2:null,
        PC3:null,
        PH:null,
        Call: null,
        DC1 : null,
        DC2 : null,
        DC3 : null,
        DH : null,
        ANTERES : null,
        BONUSRES : null,
        PPRES : null,
        RESULTAMT : null,
        PlayerCards: new Array(),
        DealerCards: new Array(),
        ChipValues: new Array(),
        SelectedChipValue:0,
    },
    PKLIR:{
        po_NR:null,
        po_SF:null,
        po_4K:null,
        po_FH:null,
        po_FL:null,
        po_ST:null,
        po_3K:null,
        po_2P:null,
        po_TB:null,
        amt: null,
        sessionId:null,
        gameId:null,
        PC1:null,
        PC2:null,
        PC3:null,
        letitride: null,
        seq:null,
        CM1:null,
        lir1:null,
        CM2: null,
        resultamt: null,
        result:null,
        rslt2:null,
        rslt3:null,
        rslt1:null,
        lir2:null,
        PlayerCards: new Array(),
        DealerCards: new Array(),
        ChipValues: new Array(),
        SelectedChipValue:0,
    },
    PKPAI:{
        ChipValues: new Array(),
        Result: null,
        SelectedChipValue:0,
        gameId:null,
        betAmt: null,
        PlayerBackCards:[],
        PlayerFrontCards: [],
        HouseWayFrontCards:[],
        HouseWayBackCards:[],
        DealerCards:['60','60','60','60','60','60','60'],
        result:null,
        resultAmt:null,
        
    },
    PKCSP:{
        ChipValues: new Array(),
        sessionId: null,
        SelectedChipValue:0,
        gameId:null,
        result:null,
        resultAmt:null,
        BoughtSlot: null,
        dealerPeek: null,
        result: null,
        C1: null,
        C2: null,
        C3: null,
        C4: null,
        C5: null,
        PlayerCards: new Array(),
        DealerCards: new Array(),
        D1: null,
        D2: null,
        D3: null,
        D4: null,
        sideResult: null,
        anteResult: null,
        dealerHand: null,
        aresultAmt: null,
        prizes: null,
        ante:null,
    },
    RLSZ:{
        ChipValues: new Array(),
        SelectedChipValue:0,
        sid:null,
        oth_iseuro: null,
        max_cn: null,
        max_ff: null,
        max_hs: null,
        max_st: null,
        max_su: null,
        max_sx: null,
        max_vs: null,
        max_xs: null,
        max_xt: null,
        betDetails: '',
        rslt: null,
        spin: null,
    },
    VKENO:{
        ChipValues: new Array(),
        ChipValuesD: new Array(),
        CoinsBet:1,
        SelectedChipValue:0,
        Ball20Mult:null,
        ExtraBalls: null,
        FreeMult: null,
        ExtraPrice: null,
        MaxSpots: null,
        Ball20Free: null,
        Payouts: null,
        MinSpots: null,
        NumCoins: null,
        Ball01Mult: null,
        GameId:null,
        BallsDrawn:null,
        ResultAmt:null,

    },
    BJK:{

        TiePercentage: null,
        PlayerCards: new Array(),
        BankerCards: new Array(),
        PlayerResults: new Array(),
        BankerResults: new Array(),
        ChipValues: new Array(),
        Result: null,
        BankerResult: null,
        SelectedChipValue:0,
        comm:null
    },

    CP:{

        oth_betsoff: 0,
        oth_dontbar: 12,
        cupo: -1,
        sid: null,
        totb: null,
        ChipValues: new Array(),
        SelectedChipValue:0,
        d1:null,
        d2:null,
        isrec: 0,
    },

}


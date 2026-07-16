//background size
var BackgroundHeight = 640;
var BackgroundWidth = 855;
var Lang = '';

var MainBet = 0;
var GameChips = new Array();
var GameSounds = new Array();

//Game Status
var IsCallingServer = false;


var GameStatus = 0; //0:BETTING, 1: PLAYING_GAME, 2: WAITING_REBET
var BETTING = 0;
var PLAYING_GAME = 1;
var WAITING_REBET = 2;

var numbersBought = 0;
var Ticket = null;

var hits=0 ;

var MasterPayOutArr = new Array();

var Card = [
            { Number: '1', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '2', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '3', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '4', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '5', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '6', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '7', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '8', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '9', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '10', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '11', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '12', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '13', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '14', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '15', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '16', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '17', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '18', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '19', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '20', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '21', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '22', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '23', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '24', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '25', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '26', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '27', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '28', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '29', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '30', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '31', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '32', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '33', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '34', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '35', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '36', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '37', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '38', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '39', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '40', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '41', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '42', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '43', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '44', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '45', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '46', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '47', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '48', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '49', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '50', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '51', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '52', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '53', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '54', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '55', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '56', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '57', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '58', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '59', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '60', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '61', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '62', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '63', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '64', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '65', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '66', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '67', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '68', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '69', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '70', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '71', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '72', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '73', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '74', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '75', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '76', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '77', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '78', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '79', PlayerBuy: false, BallSpin: false, Match: false },
            { Number: '80', PlayerBuy: false, BallSpin: false, Match: false }
        ];
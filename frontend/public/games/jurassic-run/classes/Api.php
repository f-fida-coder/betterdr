<?php
session_start();

class Api {
    private $gameCfg;
    private $userId;
    private $betId;
    private $bet;

    public function __construct($gameCfg) {
        $this->gameCfg = $gameCfg;
    }

    public function isUser() {
        return true;
    }

    public function setUser() {
        $this->userId = '';
    }

    public function setBetId($betId) {
        $this->betId = $betId;
    }

    public function setBet($bet) {
        $this->bet = $bet;
    }    

    public function getUserBalance() {
        if (
            !isset($_SESSION[$this->gameCfg['gamefile'] . '_credits']) || 
            $_SESSION[$this->gameCfg['gamefile'] . '_credits'] < 1000
        ){
            $_SESSION[$this->gameCfg['gamefile'] . '_credits'] = 100000;
        }
        return $_SESSION[$this->gameCfg['gamefile'] . '_credits'];
    }

    public function getFreeSpins() {
        if (!isset($_SESSION[$this->gameCfg['gamefile'] . '_fs_' . $this->betId])) {
            $_SESSION[$this->gameCfg['gamefile'] . '_fs_' . $this->betId] = 0;
        }        
        return $_SESSION[$this->gameCfg['gamefile'] . '_fs_' . $this->betId];
    }

    public function setFreeSpins($freeSpins) {
        $_SESSION[$this->gameCfg['gamefile'] . '_fs_' . $this->betId] = $freeSpins;
    }

    public function writeBet() {
        $_SESSION[$this->gameCfg['gamefile'] . '_credits'] -= $this->bet;
        return true;
    }

    public function writeWin($winnings) {
        $_SESSION[$this->gameCfg['gamefile'] . '_credits'] += $winnings;
        return true;
    }

    public function getCache() {
        if (!isset($_SESSION[$this->gameCfg['gamefile'] . '_cache_' . $this->betId])) {
            $_SESSION[$this->gameCfg['gamefile'] . '_cache_' . $this->betId] = 0;
        }        
        return $_SESSION[$this->gameCfg['gamefile'] . '_cache_' . $this->betId];
    }
    
    public function updateCache($amount = 0, $art) {
        if ($art == '+') {
            $_SESSION[$this->gameCfg['gamefile'] . '_cache_' . $this->betId] += $amount;
        }
        else {
            $_SESSION[$this->gameCfg['gamefile'] . '_cache_' . $this->betId] -= $amount;
        }
    }

    public function getJackpot() {
        if (!isset($_SESSION[$this->gameCfg['gamefile'] . '_jackpot_' . $this->betId])) {
            $_SESSION[$this->gameCfg['gamefile'] . '_jackpot_' . $this->betId] = 10000;
        }
        return $_SESSION[$this->gameCfg['gamefile'] . '_jackpot_' . $this->betId];
    }
    
    public function updateJackpot($amount = 0, $art) {
        if ($art == '+') {
            $_SESSION[$this->gameCfg['gamefile'] . '_jackpot_' . $this->betId] += $amount;
        }
        else {
            $_SESSION[$this->gameCfg['gamefile'] . '_jackpot_' . $this->betId] = 0;
        }
    }    

    public function Log($win, $win_fs, $data) {
        /* dont need in Standalone */
    }

}
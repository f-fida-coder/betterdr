<?php

class SlotGame {
    private $gameCfg;

    public function __construct($config) {
        $this->gameCfg = $config;
    }

    private function generateSlotResult() {
        $result = [];
        for ($i = 0; $i < 5; $i++) {
            $column = [];
            for ($j = 0; $j < 3; $j++) {
                do {
                    $randomSymbol = $this->gameCfg['symbols'][$this->getWeightedRandom($this->gameCfg['weights'])];
                } 
                while (
                    $j === 2 && 
                    count(
                        array_filter($column, function($s) { 
                            return $s === 'Wild' || $s === 'FreeSpin'; 
                        })
                    ) === 2 && 
                    ($randomSymbol === 'Wild' || $randomSymbol === 'FreeSpin')
                );
                $column[] = $randomSymbol;
            }
            $result[] = $column;
        }
        return $result;
    }

    private function calculateWinnings($result, $bet) {
        $winnings = 0;
        $winningLines = [];
        $freeSpinsWon = 0;
        $jackpotWon = 0;

        foreach ($this->getWinlines() as $lineIndex => $winline) {
            $symbols = [];
            for ($i = 0; $i < 5; $i++) {
                $symbols[] = $result[$i][$winline[$i]];
            }
            $allWilds = true;
            foreach ($symbols as $s) {
                if ($s !== 'Wild') { 
                    $allWilds = false;
                    break;
                }
            }
            if ($allWilds) continue;

            $baseSymbol = null;
            foreach ($symbols as $s) {
                if (!in_array($s, ['Wild', 'FreeSpin', 'JP'])) {
                    $baseSymbol = $s;
                    break;
                }
            }
            
            $wildUsed = false;
            $evaluated = [];
            foreach ($symbols as $s) {
                $evaluated[] = ($s === 'Wild') ? $baseSymbol : $s;
                if ($s === 'Wild') $wildUsed = true;
            }

            $firstSymbol = $evaluated[0];
            $count = 1;
            for ($i = 1; $i < 5; $i++) {
                if ($evaluated[$i] === $firstSymbol) {
                    $count++;
                } else {
                    break;
                }
            }

            $minNeeded = 3;
            if ($count >= $minNeeded) {
                if ($firstSymbol === 'JP') {
                    if ($count == 5) {
                        $jackpotWon = 1;
                        $winningLines[] = [
                            'line' => $lineIndex,
                            'symbol' => $firstSymbol,
                            'count' => $count,
                            'wild_used' => 0
                        ];
                    }
                } 
                elseif ($firstSymbol === 'FreeSpin') {
                    $fswin = $this->gameCfg['payout_multipliers']['sym_FreeSpin']['c_'.$count];
                    $freeSpinsWon += $fswin ?? 0;
                    $winningLines[] = [
                        'line' => $lineIndex,
                        'symbol' => $firstSymbol,
                        'count' => $count,
                        'win' => $fswin,
                        'wild_used' => 0
                    ];
                }
                else {
                    $win = ($this->gameCfg['payout_multipliers']['sym_'.$firstSymbol]['c_'.$count] ?? 0) * $bet;
                    $winnings += $win;
                    $winningLines[] = [
                        'line' => $lineIndex,
                        'symbol' => $firstSymbol,
                        'count' => $count,
                        'win' => $win,
                        'wild_used' => $wildUsed
                    ];
                }
            }
        }

        return [
            'winnings' => $winnings,
            'winningLines' => $winningLines,
            'freeSpinsWon' => $freeSpinsWon,
            'jackpotWon' => $jackpotWon
        ];
    }

    private function getWeightedRandom($weights) {
        $totalWeight = array_sum($weights);
        $randomNumber = mt_rand(1, $totalWeight);
        $currentWeight = 0;
        foreach ($weights as $index => $weight) {
            $currentWeight += $weight;
            if ($randomNumber <= $currentWeight) {
                return $index;
            }
        }
        return 0;
    }

    public function getWinlines() {
        return $this->gameCfg['winlines'];
    }

    public function Game($bet, $cache) {
        $maxAttempts = 10;
        $attempts = 0;
        while ($attempts < $maxAttempts) {
            $result = $this->generateSlotResult();
            $winningData = $this->calculateWinnings($result, $bet);            
            if ($winningData['winnings'] <= $cache) {
                return [
                    'symbols' => $result,
                    'winnings' => $winningData['winnings'],
                    'winningLines' => $winningData['winningLines'],
                    'freeSpinsWon' => $winningData['freeSpinsWon'],
                    'jackpotWon' => $winningData['jackpotWon']
                ];
            }
            $attempts++;
        }
        $losingResult = $this->generateLostResult();
        return [
            'symbols' => $losingResult,
            'winnings' => 0,
            'winningLines' => [],
            'freeSpinsWon' => 0,
            'jackpotWon' => 0
        ];
    }

    private function generateLostResult() {
        $losingSymbols = ['1','2','3','4','5'];
        $result = [];        
        for ($i = 0; $i < 5; $i++) {
            $column = [];
            for ($j = 0; $j < 3; $j++) {
                $column[] = $losingSymbols[array_rand($losingSymbols)];
            }
            $result[] = $column;
        }
        return $result;
    }
}
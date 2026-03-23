<?php
header("Content-Type: application/json");

require_once 'classes/Api.php';
require_once 'classes/SlotGame.php';
require_once 'lang/lang.php';

$langcode = isset($_REQUEST['lang']) ? $_REQUEST['lang'] : 'en';
if (isset($lang[$langcode])) {
    $lang = $lang[$langcode];
}
else {
    $langcode = 'en';
    $lang = $lang[$langcode];
}

$gameCfg = json_decode(file_get_contents('config/config.json'), true);
$api = new Api($gameCfg);
$slotGame = new SlotGame($gameCfg);

if (!$api->isUser()) {
    echo json_encode(['error' => $lang['please_login']]);
    exit;
}

$api->setUser();

$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

if ($action === 'loadconfig') {
    echo json_encode([        
        'symbols' => $gameCfg['symbols'],
        'decimals' => $gameCfg['decimals'],
        'payout_multipliers' => $gameCfg['payout_multipliers'],
        'language' => $lang,
        'langcode' => $langcode,        
        'winlines' => $gameCfg['winlines']
    ]);
    exit;
}

if ($action === 'load') {

    $api->setBetId($gameCfg['bet_starts']);

    echo json_encode([
        'betId' => $gameCfg['bet_starts'],
        'bet' => $gameCfg['allowed_bets'][$gameCfg['bet_starts']],
        'userBalance' => $api->getUserBalance(),
        'jackpot' => $api->getJackpot(),
        'freeSpins' => $api->getFreeSpins()
    ]);
    exit;
}

if ($action === 'game' || $action === 'changebet') {
    $betId = isset($_REQUEST['betId']) ? (int)$_REQUEST['betId'] : 0;
    if ($betId < 0 || $betId >= count($gameCfg['allowed_bets'])) {
        echo json_encode(['error' => $lang['invalid_bet']]);
        exit;
    }
}

if ($action === 'game') {
    $bet = $gameCfg['allowed_bets'][$betId];
    $api->setBetId($betId);
    $api->setBet($bet);
    $userBalanceBefore = $api->getUserBalance();    
    $freeSpinsBefore = $api->getFreeSpins();
    $freeSpinsAfter = $freeSpinsBefore;
    $jackpotBefore = $api->getJackpot();
    $jackpotAfter = $jackpotBefore;
    $hasFreeSpins = $freeSpinsBefore > 0;
    $cache = $api->getCache();

    if ($hasFreeSpins) {
        $freeSpinsAfter--;
        $api->setFreeSpins($freeSpinsAfter);
    } 
    else {
        if ($api->writeBet($bet)) {
            $userBalanceBefore -= $bet;
            $owner_fee = $bet / 100 * $gameCfg['owner_fee'];
            $jp_fee = $bet / 100 * $gameCfg['jackpot_fee'];
            $cache_part = $bet - $owner_fee - $jp_fee;
            $cache += $cache_part;
            $api->updateCache($cache_part, '+');
            $api->updateJackpot($jp_fee, '+');
            $jackpotBefore += $jp_fee;
            $jackpotAfter = $jackpotBefore;
        }
        else {
            echo json_encode(['error' => $lang['insufficient_balance']]);
            exit;
        }
    }

    $response = $slotGame->Game($bet, $cache);

    if ($api->writeWin($response['winnings'])) {
        $api->updateCache($response['winnings'], '-');
    }
    else {
        echo json_encode(['error' => $lang['invalid_winnings']]);
        exit;
    }

    if ($response['jackpotWon'] == 1) {        
        if ($api->writeWin($jackpotBefore)) {
            $api->updateJackpot(0, '-');
        }
        else {
            echo json_encode(['error' => $lang['invalid_winnings']]);
            exit;
        }
        $jackpotAfter = 0;
    }

    if ($response['freeSpinsWon'] > 0) {
        $freeSpinsAfter += $response['freeSpinsWon'];
        $api->setFreeSpins($freeSpinsAfter);
    }
    
    $response['userBalanceBefore'] = $userBalanceBefore;
    $response['userBalanceAfter'] = $userBalanceBefore + $response['winnings'];
    $response['jackpotBefore'] = $jackpotBefore;
    $response['jackpotAfter'] = $jackpotAfter;    
    $response['freeSpinsBefore'] = $freeSpinsBefore;
    $response['freeSpinsAfter'] = $freeSpinsAfter;

    $api->Log($response['winnings'], $response['freeSpinsWon'], $response);

    echo json_encode($response);
    exit;
}

if ($action === 'changebet') {
    $typ = isset($_REQUEST['typ']) ? $_REQUEST['typ'] : '';
    $newbet = $betId;

    if ($typ === 'betless') {
        $newbet = $betId === 0 ? 0 : $betId - 1;
    } 
    elseif ($typ === 'betmore') {
        $newbet = $betId === count($gameCfg['allowed_bets']) - 1 ? count($gameCfg['allowed_bets']) - 1 : $betId + 1;
    }

    $api->setBetId($newbet);

    if (isset($gameCfg['allowed_bets'][$newbet])) {
        echo json_encode([
            'betId' => $newbet,
            'bet' => $gameCfg['allowed_bets'][$newbet],
            'userBalance' => $api->getUserBalance(),
            'jackpot' => $api->getJackpot(),
            'freeSpins' => $api->getFreeSpins()
        ]);
    }
    exit;
}

echo json_encode(['error' => $lang['invalid_action']]);
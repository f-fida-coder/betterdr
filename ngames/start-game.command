#!/bin/zsh
# Serves the games folder and opens all games in the browser.
cd "$(dirname "$0")/.."
base="http://localhost:8765/blackjack"
echo "Blackjack       : $base/Blackjack/index.html"
echo "Tales of Terror : $base/TalesOfTerror/index.html"
echo "BoggeyMan       : $base/BoggeyMan/index.html"
echo "Burlesque       : $base/Burlesque/index.html"
echo "Video Poker     : $base/VideoPoker/index.html"
echo "Baccarat        : $base/Baccarat/index.html"
echo "Am. Roulette    : $base/AmericanRoulette/index.html"
echo "Craps           : $base/Craps/index.html"
for g in Blackjack TalesOfTerror BoggeyMan Burlesque VideoPoker Baccarat AmericanRoulette Craps; do open "$base/$g/index.html"; done
python3 -m http.server 8765

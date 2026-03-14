function CHandEvaluator(){
    this.evaluate = function(aHand){
        var aSortedHand = new Array();

        for(var i=0; i<aHand.length; i++){
            aSortedHand[i] = {
                rank: aHand[i].rank,
                suit: aHand[i].suit
            };
        }

        aSortedHand.sort(this.compareRank);

        var oRankData = this.rankHand(aSortedHand);

        return {
            ret: oRankData.ret,
            name: oRankData.name,
            sort_hand: this._cloneHand(aSortedHand),
            tiebreak: oRankData.tiebreak
        };
    };

    this.rankHand = function(aSortedHand){
        if(this._isStraight(aSortedHand) && this._isFlush(aSortedHand)){
            return {
                ret: STRAIGHT_FLUSH,
                name: "STRAIGHT_FLUSH",
                tiebreak: [this._getStraightHighRank(aSortedHand)]
            };
        }

        if(this._isThreeOfAKind(aSortedHand)){
            return {
                ret: THREE_OF_A_KIND,
                name: "THREE_OF_A_KIND",
                tiebreak: [aSortedHand[2].rank]
            };
        }

        if(this._isStraight(aSortedHand)){
            return {
                ret: STRAIGHT,
                name: "STRAIGHT",
                tiebreak: [this._getStraightHighRank(aSortedHand)]
            };
        }

        if(this._isFlush(aSortedHand)){
            return {
                ret: FLUSH,
                name: "FLUSH",
                tiebreak: this._buildHighCardTiebreak(aSortedHand)
            };
        }

        if(this._isOnePair(aSortedHand)){
            return {
                ret: ONE_PAIR,
                name: "ONE_PAIR",
                tiebreak: this._buildPairTiebreak(aSortedHand)
            };
        }

        return {
            ret: HIGH_CARD,
            name: "HIGH_CARD",
            tiebreak: this._buildHighCardTiebreak(aSortedHand)
        };
    };

    this.dealerQualifies = function(aSortedHand, iHandValue){
        if(iHandValue !== HIGH_CARD){
            return true;
        }

        return aSortedHand[aSortedHand.length - 1].rank >= CARD_QUEEN;
    };

    this.getWinnerComparingHands = function(aHandPlayer, aHandDealer, iHandPlayerValue, iHandDealerValue, aPlayerTiebreak, aDealerTiebreak){
        if(iHandPlayerValue < iHandDealerValue){
            return "player";
        }

        if(iHandPlayerValue > iHandDealerValue){
            return "dealer";
        }

        var aResolvedPlayerTiebreak = Array.isArray(aPlayerTiebreak) ? aPlayerTiebreak : this._buildTiebreak(aHandPlayer, iHandPlayerValue);
        var aResolvedDealerTiebreak = Array.isArray(aDealerTiebreak) ? aDealerTiebreak : this._buildTiebreak(aHandDealer, iHandDealerValue);
        var iLength = Math.max(aResolvedPlayerTiebreak.length, aResolvedDealerTiebreak.length);

        for(var i=0; i<iLength; i++){
            var iPlayerValue = aResolvedPlayerTiebreak[i] || 0;
            var iDealerValue = aResolvedDealerTiebreak[i] || 0;

            if(iPlayerValue > iDealerValue){
                return "player";
            }

            if(iPlayerValue < iDealerValue){
                return "dealer";
            }
        }

        return "standoff";
    };

    this._cloneHand = function(aHand){
        var aClone = new Array();

        for(var i=0; i<aHand.length; i++){
            aClone.push({
                rank: aHand[i].rank,
                suit: aHand[i].suit
            });
        }

        return aClone;
    };

    this._buildTiebreak = function(aSortedHand, iHandValue){
        switch(iHandValue){
            case STRAIGHT_FLUSH:
            case STRAIGHT:
                return [this._getStraightHighRank(aSortedHand)];
            case THREE_OF_A_KIND:
                return [aSortedHand[2].rank];
            case FLUSH:
            case HIGH_CARD:
                return this._buildHighCardTiebreak(aSortedHand);
            case ONE_PAIR:
                return this._buildPairTiebreak(aSortedHand);
            default:
                return this._buildHighCardTiebreak(aSortedHand);
        }
    };

    this._buildHighCardTiebreak = function(aSortedHand){
        return [
            aSortedHand[2].rank,
            aSortedHand[1].rank,
            aSortedHand[0].rank
        ];
    };

    this._buildPairTiebreak = function(aSortedHand){
        if(aSortedHand[0].rank === aSortedHand[1].rank){
            return [aSortedHand[0].rank, aSortedHand[2].rank];
        }

        return [aSortedHand[1].rank, aSortedHand[0].rank];
    };

    this._isThreeOfAKind = function(aSortedHand){
        return aSortedHand[0].rank === aSortedHand[1].rank
            && aSortedHand[1].rank === aSortedHand[2].rank;
    };

    this._isOnePair = function(aSortedHand){
        return aSortedHand[0].rank === aSortedHand[1].rank
            || aSortedHand[1].rank === aSortedHand[2].rank;
    };

    this._isFlush = function(aSortedHand){
        return aSortedHand[0].suit === aSortedHand[1].suit
            && aSortedHand[1].suit === aSortedHand[2].suit;
    };

    this._isStraight = function(aSortedHand){
        if(aSortedHand[0].rank === CARD_TWO
            && aSortedHand[1].rank === CARD_THREE
            && aSortedHand[2].rank === CARD_ACE){
            return true;
        }

        return aSortedHand[0].rank + 1 === aSortedHand[1].rank
            && aSortedHand[1].rank + 1 === aSortedHand[2].rank;
    };

    this._getStraightHighRank = function(aSortedHand){
        if(aSortedHand[0].rank === CARD_TWO
            && aSortedHand[1].rank === CARD_THREE
            && aSortedHand[2].rank === CARD_ACE){
            return CARD_THREE;
        }

        return aSortedHand[2].rank;
    };

    this.compareRank = function(a, b) {
        if (a.rank < b.rank){
            return -1;
        }
        if (a.rank > b.rank){
            return 1;
        }
        return 0;
    };
}

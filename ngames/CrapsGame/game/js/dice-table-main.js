var r1 = null;
var r2 = null;
var Dice = {
    canvas: null,
    params: null,
    box: null,
    dice_initializ:function(container, wP,hP) {
        this.canvas = $t.id('canvas');
        this.canvas.style.width =  wP+'px';
        this.canvas.style.height =  hP+'px';

        $t.dice.use_true_random = false;

        this.params = $t.get_url_params();
        $t.dice.use_shadows = true;
        $t.dice.dice_color = '#a90000';
        $t.dice.label_color = '#ffffff';


        this.box = new $t.dice.dice_box(canvas, { w: wP, h: hP });
        this.box.animate_selector = false;       
    
    },

    before_roll: function(vectors, notation, callback) {
        // do here rpc call or whatever to get your own result of throw.
        // then callback with array of your result, example:
        // callback([2, 2, 2, 2]); // for 4d6 where all dice values are 2.

        callback([r1,r2]);
    },

    notation_getter: function() {
        return $t.dice.parse_notation('2d6');
    }, 

    after_roll: function(notation, result) {
        afterTableDiceAnim(); 
        //if (this.params.chromakey || this.params.noresult) return;
        /*var res = result.join(' ');
        if (notation.constant) {
            if (notation.constant > 0) res += ' +' + notation.constant;
            else res += ' -' + Math.abs(notation.constant);
        }
        if (result.length > 1) res += ' = ' + 
                (result.reduce(function(s, a) { return s + a; }) + notation.constant);*/
        $("#dice-roll-table").removeClass('dice-roll-table-active');     
              
    },

    rollDice: function(_r1,_r2)
    {
        $("#dice-roll-table").addClass('dice-roll-table-active');
        r1=_r1;
        r2 = _r2;
        this.box.start_throw(this.notation_getter, this.before_roll, this.after_roll);
    },

}



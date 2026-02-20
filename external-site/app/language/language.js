define(['core/class', 'util/util'], function (Class, Util) {

    //--------------------------------------------------------------------------

    'use strict';

    Util = new Util();

    //--------------------------------------------------------------------------

    return Class.extend({
        path: '/app/language/ui.json',
        type: {
            ENGLISH: {val: 'ENGLISH', src: Util.imagePath + 'icons/flags/en.png'},
            SPANISH: {val: 'SPANISH', src: Util.imagePath + 'icons/flags/es.png'},
            CHINESE: {val: 'CHINESE', src: Util.imagePath + 'icons/flags/cn.png'},
            FRENCH: {val: 'FRENCH', src: Util.imagePath + 'icons/flags/fr.png'},
            GREEK: {val: 'GREEK', src: Util.imagePath + 'icons/flags/gr.png'},
            JAPANESE: {val: 'JAPANESE', src: Util.imagePath + 'icons/flags/jp.png?v=' + (new Date).getTime()},
            KOREAN: {val: 'KOREAN', src: Util.imagePath + 'icons/flags/kr.png?v=' + (new Date).getTime()},
            VIETNAMESE: {val: 'VIETNAMESE', src: Util.imagePath + 'icons/flags/vn.png?v=' + (new Date).getTime()}
        },
        default: 'ENGLISH',
        selected: '',
        local: {},
        loadFile: false,
        //----------------------------------------------------------------------
        init: function (options) {

        },
        //----------------------------------------------------------------------
        listeners: function () {

            //------------------------------------------------------------------

            var _self = this;
            var panelFlags = $('.change-language');
            var panelFlagsModal = $('[data-list="available-languages"]');

            //------------------------------------------------------------------

            $('[data-action="display"]').off('click').on('click', function () {

                panelFlags.find('.options').toggle('fast');
            });

            panelFlagsModal.find('a').off('click').on('click', function () {

                $('.modal#language-selector').modal('hide');

                //--------------------------------------------------------------

                _self.setAvailables({language: $(this).data('language')});
                _self.change({language: $(this).data('language')});

            });

            //------------------------------------------------------------------

            panelFlags.find('.options a').off('click').on('click', function () {

                var el = $(this).find('img');
                var src = el.attr('src');

                //--------------------------------------------------------------

                el.attr('src', panelFlags.find('[data-action="display"] img').attr('src'));

                //--------------------------------------------------------------

                panelFlags.find('[data-action="display"] img').attr('src', src);
                panelFlags.find('.options').toggle('fast');

                //--------------------------------------------------------------

                _self.setAvailables({language: $(this).data('language')});
                _self.change({language: $(this).data('language')});

            });
        },
        //----------------------------------------------------------------------
        setAvailables: function (options) {

            var defaults = {
                language: this.default
            };
            var setting = $.extend(defaults, options);
            var _self = this;
            var panelFlags = $('.change-language');
            var language = this.type[setting.language];

            //------------------------------------------------------------------

            if(language === undefined){
                language = this.type[this.default]
            }

            $('.default-language img').attr('src', language.src);
            panelFlags.find('.options').empty();

            //------------------------------------------------------------------

            $.each(_self.type, function (item) {

                if (_self.type[item].val != setting.language) {

                    panelFlags.find('.options')
                            .append('<a data-language="' + _self.type[item].val + '" ' +
                                    ' href="#" ><img alt="cn" src="' + _self.type[item].src + '" ></a>');

                }
            });

            //------------------------------------------------------------------

            this.listeners();

        },
        //----------------------------------------------------------------------
        change: function (options) {

            var defaults = {
                trigger: false,
                getFile: false,
                callTrigger : false,
                call : function(){ }
            };
            var setting = $.extend(defaults, options);


            var _self = this;
            _self.__proto__.selected = options.language;

            //------------------------------------------------------------------

            function _change() {

                //--------------------------------------------------------------

                _self.reload();
//
//                //--------------------------------------------------------------
//
//                setTimeout(function () {
//
//                    if (!Util.isMobile()) {
//                        $('[data-select-refresh]').selectpicker('render');
//                        $('[data-select-refresh]').selectpicker('refresh');
//                    }
//
//
//                }, 500);

                //--------------------------------------------------------------

                if (setting.trigger) {

                    _self.setAvailables({language: _self.selected});
                    setting.call(options);

                }
            }

            //------------------------------------------------------------------

            if (setting.getFile) {

                _self.__proto__.loadFile = true;

                $.getJSON(this.path + '?v=' + (new Date()).getTime(), function (json) {

                    _self.__proto__.local = json;
                    $.languageFlag = true;

                    //----------------------------------------------------------
                    
                    if(setting.callTrigger){
                        setting.call();
                    }
                   
                    _change();
                    

                });

            } else {

                _change();

            }
        },
        //----------------------------------------------------------------------
        reload: function (options) {

            var defaults = {
                el: $('body')
            };
            var setting = $.extend(defaults, options);
            var _self = this;
            var json = _self.__proto__.local;

            //------------------------------------------------------------------

            for (var key in json) {
                if (json.hasOwnProperty(key)) {

                    var translation = {};

                    //------------------------------------------------------

                    switch (_self.__proto__.selected) {

                        case _self.type.ENGLISH.val :

                            translation = json[key].ENGLISH;

                            break;

                            //----------------------------------------------

                        case _self.type.SPANISH.val :

                            translation = json[key].SPANISH;

                            break;

                            //----------------------------------------------

                        case _self.type.CHINESE.val :

                            translation = json[key].CHINESE;

                            break;

                            //----------------------------------------------

                        case _self.type.FRENCH.val :

                            translation = json[key].FRENCH;

                            break;

                            //----------------------------------------------

                        case _self.type.GREEK.val :

                            translation = json[key].GREEK;

                            break;

                            //----------------------------------------------

                        case _self.type.JAPANESE.val :

                            translation = json[key].GREEK;

                            break;

                            //----------------------------------------------

                        case _self.type.KOREAN.val :

                            translation = json[key].KOREAN;

                            break;

                        case _self.type.VIETNAMESE.val :

                            translation = json[key].VIETNAMESE;

                            break;

                    }



                    //------------------------------------------------------

                    if (translation == '' || translation == null || translation == undefined || translation.length == undefined) {

                        translation = json[key][_self.default];
                    }

                    //------------------------------------------------------

                    setting.el.find('[data-language="' + key + '"]:not([placeHolder])').html(translation);
                    setting.el.find('[data-language="' + key + '"][placeHolder]').attr('placeHolder', translation);
                    setting.el.find('[data-language-tooltip="' + key + '"]').attr('title', translation);

                }
            }
        },
        //----------------------------------------------------------------------
        get: function (options) {

            var item = this.local[options.key][this.selected];

            //------------------------------------------------------------------

            if (item == '' || item == null || item == undefined) {

                item = this.local[options.key][this.default];

            }

            //------------------------------------------------------------------

            return item;

        },
        //----------------------------------------------------------------------
        setFlag: function () {

            var _self = this;

            if (_self.type[_self.selected] !== undefined) {
                $('[data-field="country-flag"]').attr('src', _self.type[_self.selected].src);
            }

        }

    });
});

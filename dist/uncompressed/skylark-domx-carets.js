/**
 * skylark-domx-carets - The skylark carets library for dom api extension.
 * @author Hudaokeji Co.,Ltd
 * @version v0.9.0
 * @link www.skylarkjs.org
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx/skylark");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-domx-carets/carets',[
    "skylark-langx/skylark",
    "skylark-langx/langx",
    "skylark-domx-noder",
    "skylark-domx-data"
], function(skylark, langx, noder, datax) {
    "use strict";

    var  _rCarriageReturn = /\r/g;

    function _normalizePos(input, pos) {
        var norm = datax.val(input).replace(_rCarriageReturn, '');
        var len = norm.length;

        if (typeof(pos) === 'undefined') {
            pos = len;
        }

        pos = Math.floor(pos);

        // Negative index counts backward from the end of the input/textarea's value
        if (pos < 0) {
            pos = len + pos;
        }

        // Enforce boundaries
        if (pos < 0) { pos = 0; }
        if (pos > len) { pos = len; }

        return pos;
    };

    /**
     * @class
     * @constructor
     */
    var Range = function(start, end, length, text) {
        this.start = start || 0;
        this.end = end || 0;
        this.length = length || 0;
        this.text = text || '';
    };

    Range.prototype.toString = function() {
        return JSON.stringify(this, null, '    ');
    };


    /**
     * Gets the position of the caret in the given input.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @returns {Number}
     * @see http://stackoverflow.com/questions/263743/how-to-get-cursor-position-in-textarea/263796#263796
     */
    function getCaret(input) {
        if (!input) {
            return undefined;
        }

        return input.selectionStart;

    };

    /**
     * Sets the position of the caret in the given input.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @param {Number} pos
     * @see http://parentnode.org/javascript/working-with-the-cursor-position/
     */
     function setCaret(input, pos) {
        input.focus();

        pos = _normalizePos(input, pos);

        input.setSelectionRange(pos, pos);
        return this;
    };

    /**
     * Inserts the specified text at the current caret position in the given input.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @param {String} text
     */
    function insertAtCaret(input, text) {
        var curPos = _getCaret(input);

        var oldValueNorm = datax.val(input).replace(_rCarriageReturn, '');

        var newLength = +(curPos + text.length + (oldValueNorm.length - curPos));
        var maxLength = +input.getAttribute('maxlength');

        if(_hasAttr(input, 'maxlength') && newLength > maxLength) {
            var delta = text.length - (newLength - maxLength);
            text = text.substr(0, delta);
        }

        datax.val(input, oldValueNorm.substr(0, curPos) + text + oldValueNorm.substr(curPos));

        setCaret(input, curPos + text.length);

        return this;
    };

    /**
     * Gets the selected text range of the given input.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @returns {Range}
     */
    function getInputRange(input) {
        if (!input) {
            return undefined;
        }

         var range = new Range();

        range.start = input.selectionStart;
        range.end = input.selectionEnd;

        var min = Math.min(range.start, range.end);
        var max = Math.max(range.start, range.end);

        range.length = max - min;
        range.text = datax.val(input).substring(min, max);

        return range;

    };

     /**
     * Sets the selected text range of (i.e., highlights text in) the given input.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @param {Number} startPos Zero-based index
     * @param {Number} endPos Zero-based index
     */
    function setInputRange(input, startPos, endPos) {
        startPos = _normalizePos(input, startPos);
        endPos = _normalizePos(input, endPos);

        // Mozilla, et al.
        input.setSelectionRange(startPos, endPos);

        return this;
   };

    /**
     * Replaces the currently selected text with the given string.
     * @param {HTMLInputElement|HTMLTextAreaElement} input input or textarea element
     * @param {String} text New text that will replace the currently selected text.
     * @see http://parentnode.org/javascript/working-with-the-cursor-position/
     */
    function replaceInputRange(input, text) {
        var oldValue = datax.val(input);
        var selection = getInputRange(input);

        var newLength = +(selection.start + text.length + (oldValue.length - selection.end));
        var maxLength = +datax.attr(input,'maxlength');

        if(maxLength && newLength > maxLength) {
            var delta = text.length - (newLength - maxLength);
            text = text.substr(0, delta);
        }

        // Now that we know what the user selected, we can replace it
        var startText = oldValue.substr(0, selection.start);
        var endText = oldValue.substr(selection.end);

        datax.val(input,startText + text + endText);

        // Reset the selection
        var startPos = selection.start;
        var endPos = startPos + text.length;

        setInputRange(input, selection.length ? startPos : endPos, endPos);
        return this;
    };

    /**
     * Select all text in the given element.
     * @param {HTMLElement} elem Any block or inline element other than a form element.
     */
    function selectAll(elem) {
        if (elem.select) {
            elem.select();
            return this;
        }

        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(elem);
        selection.removeAllRanges();
        selection.addRange(range);
        return this;

    }

    function deselectAll() {
        if (document.selection) {
            document.selection.empty();
        }
        else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        return this;
    }


    function caret(input,arg1) {
        // getCaret()
        if (arg1 === undefined) {
            return getCaret(input);
        }
        // setCaret(position)
        else if (typeof arg1 === 'number') {
            setCaret(input, arg1);
        }
        // insertAtCaret(text)
        else {
            insertAtCaret(input, arg1);
        }

        return this;
    }

    function range(input, arg1,arg2) {
        // getRange() = { start: pos, end: pos }
        if (arg1 === undefined) {
            return getInputRange(input);
        }
        // setRange(startPos, endPos)
        else if (typeof arg1 === 'number') {
            var startPos = arg1;
            var endPos = arg2;
            setInputRange(input, startPos, endPos);
        }
        // replaceRange(text)
        else {
            var text = arg1;
            replaceInputRange(input, text);
        }

        return this;
    }

    function carets() {
        return carets;
    }

    langx.mixin(carets,{
        getCaret,
        setCaret,
        insertAtCaret,
        getInputRange,
        setInputRange,
        replaceInputRange,
        selectAll,
        deselectAll,
        caret,
        range

    });
    return skylark.attach("domx.carets", carets);
});
define('skylark-domx-carets/main',[
    "skylark-langx/langx",
    "./carets",
    "skylark-domx-velm",
    "skylark-domx-query",        
    "skylark-domx-eventer"        
],function(langx,carets,velm,$){

    velm.delegate([
        "caret",
        "insertAtCaret",
        "range",
        "selectAll"
    ], carets);

    $.fn.caret = $.wraps.wrapper_value(carets.caret, carets, carets.caret);
    $.fn.range = $.wraps.wrapper_value(carets.range, carets, carets.range);


	return carets;
});
define('skylark-domx-carets', ['skylark-domx-carets/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-domx-carets.js.map

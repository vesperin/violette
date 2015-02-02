/**
 * Sometimes code between languages is ambiguous; therefore, we
 * want to shortcut look for languages that are similar to Java.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 **/
var Heuristics = (function (hljs, $, module) {
    "use strict";

    var LANGUAGES = ["java"];

    function isSupportedLanguage(lang) {
        return LANGUAGES.indexOf(lang) > -1;
    }

    function blockLanguage(block) {
        var classes = (block.className + ' ' + (block.parentNode ? block.parentNode.className : '')).split(/\s+/);
        classes = classes.map(function (c) {
            return c.replace(/^lang(uage)?-/, '');
        });

        return classes.filter(function (c) {
            return hljs.getLanguage(c) || c == 'no-highlight';
        })[0];
    }

    function isCLike(element, index, array) {
        return ["objective-c", "cpp"].indexOf(element) > -1;
    }

    function isPerlOrProlog(element, index, array) {
        return ["perl", "prolog"].indexOf(element) > -1;
    }

    function isEclOrProlog(element, index, array) {
        return ["ecl", "prolog"].indexOf(element) > -1;
    }

    function isTypeScriptOrXml(element, index, array) {
        return ["typescript", "xml"].indexOf(element) > -1;
    }

    function isCListOrOpenCl(element, index, array) {
        return ["common lisp", "opencl"].indexOf(element) > -1;
    }

    function isRebolOrR(element, index, array) {
        return ["rebol", "r"].indexOf(element) > -1;
    }

    function isCSOrJava(element, index, array) {
        return ["cs", "java"].indexOf(element) > -1;
    }

    function isCppOrJava(element, index, array) {
        return ["cpp", "java"].indexOf(element) > -1;
    }

    function isCLangOrJava(element, index, array) {
        return ["c", "java"].indexOf(element) > -1;
    }

    function isJsOrJava(element, index, array) {
        return ["javascript", "java"].indexOf(element) > -1;
    }

    function isCppOrCs(element, index, array) {
        return ["cpp", "cs"].indexOf(element) > -1;
    }

    function disambiguate_c(data) {
        var matches = [];
        if (data.indexOf("@interface") > -1) {
            matches.push("objective-c")
        }
        if (data.indexOf("#include <cstdint>") > -1 || (/include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        return matches
    }

    function disambiguate_pl(data) {
        var matches = [];
        if (data.indexOf("use strict") > -1) {
            matches.push("perl")
        }
        if (data.indexOf(":-") > -1) {
            matches.push("prolog")
        }
        return matches
    }

    function disambiguate_ecl(data) {
        var matches = [];
        if (data.indexOf(":=") > -1) {
            matches.push("ecl")
        }
        if (data.indexOf(":-") > -1) {
            matches.push("prolog")
        }
        return matches
    }

    function disambiguate_ts(data) {
        var matches = [];
        if (data.indexOf("</translation>") > -1) {
            matches.push("xml")
        } else {
            matches.push("typescript")
        }
        return matches
    }

    function disambiguate_cl(data) {
        var matches = [];
        if (data.indexOf("(defun ") > -1) {
            matches.push("common lisp")
        }
        if (/\/\* |\/\/ |^\}/.test(data)) {
            matches.push("opencl")
        }
        return matches
    }

    function disambiguate_r(data) {
        var matches = [];
        if (/\bRebol\b/i.test(data)) {
            matches.push("rebol")
        }
        if (data.indexOf("<-") > -1) {
            matches.push("r")
        }
        return matches
    }

    function disambiguate_cs(data) {
        var matches = [];
        if ((data.indexOf("<summary>") > -1)
            || (data.indexOf("using System;") > -1)
            || (data.indexOf("typeof") > -1)
            || (data.indexOf("sizeof") > -1)) {
            matches.push("cs")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_cj(data) {
        var matches = [];
        if (data.indexOf("#include <cstdint>") > -1 || (/#include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_j(data) {
        var matches = [];
        if (data.indexOf("#include") > -1 || (/#include\\s*["]/.test(data))) {
            matches.push("c")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_js(data) {
        var matches = [];
        if (data.indexOf("!==") > -1 || ( /\$[(.]/.test(data))) {
            matches.push("javascript")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_cpp(data) {
        var matches = [];
        if (data.indexOf("#include <cstdint>") > -1 || (/#include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        if ((data.indexOf("<summary>") > -1)
            || (data.indexOf("using System;") > -1)
            || (data.indexOf("typeof") > -1)
            || (data.indexOf("sizeof") > -1)) {
            matches.push("cs")
        }
        return matches
    }


    module.findByHeuristics = function(data, languages){
        if (languages.every(isCLike)) {
            return disambiguate_c(data)
        }
        if (languages.every(isPerlOrProlog)) {
            return disambiguate_pl(data)
        }
        if (languages.every(isEclOrProlog)) {
            return disambiguate_ecl(data)
        }
        if (languages.every(isTypeScriptOrXml)) {
            return disambiguate_ts(data)
        }
        if (languages.every(isCListOrOpenCl)) {
            return disambiguate_cl(data)
        }
        if (languages.every(isRebolOrR)) {
            return disambiguate_r(data)
        }
        if (languages.every(isCSOrJava)) {
            return disambiguate_cs(data)
        }
        if (languages.every(isCppOrJava)) {
            return disambiguate_cj(data)
        }
        if (languages.every(isCLangOrJava)) {
            return disambiguate_j(data)
        }
        if (languages.every(isJsOrJava)) {
            return disambiguate_js(data)
        }
        if (languages.every(isCppOrCs)) {
            return disambiguate_cpp(data)
        }
    };

    module.detect = function(block){
        var text = block.text();
        var lang = blockLanguage(block);
        if (lang == 'no-highlight') {
            return "Unknown Language";
        }
        var result = lang ? hljs.highlight(lang, text, true) : hljs.highlightAuto(text);
        if (isSupportedLanguage(result.language)) {
            return result.language;
        } else {
            var secondLangExist = (typeof(result.second_best) !== 'undefined');

            if (secondLangExist && isSupportedLanguage(result.second_best.language)) {
                return result.second_best.language;
            } else {
                var languages = secondLangExist ? [result.language, result.second_best.language] : [result.language, "cs"];
                var matches = module.findByHeuristics(text, languages);
                return (matches && matches.length > 0) ? matches[0] : "Unknown Language";
            }
        }
    };

    return module;
}(window.hljs, window.jQuery, Heuristics || {}));
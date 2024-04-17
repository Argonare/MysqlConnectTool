// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

//mytatis模式定义
export function mybatisHandler(CodeMirror) {
    var mybatisConfig = {
        autoSelfClosers: {
            'cache-ref': true, 'cache': true, /*'include': true,*/'parameter': true
            , 'id': true, 'result': true, 'idArg': true, 'arg': true, 'case': true, 'property': true
            , 'typeAlias': true, 'bind': true
        },
        implicitlyClosed: {},
        contextGrabbers: {
            'when': {'when': true},
            'otherwise': {'when': true},
        },
        doNotChangeMode: {'mapper': true},
        sqlTags: {'sql': true, 'select': true, 'insert': true, 'update': true, 'delete': true},
        sqlUpdateTags: {'insert': true, 'update': true, 'delete': true},
        doNotIndent: {},
        allowUnquoted: true,
        allowMissing: false,
        caseFold: true
    }
    var mybatisMapper = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >\n'
        + '<mapper namespace="{0}">\n{1}\n</mapper>';

    CodeMirror.defineMode("mybatis", function (editorConf, config_) {
        var indentUnit = editorConf.indentUnit;
        var config = {};
        var defaults = mybatisConfig;
        for (var prop in defaults) config[prop] = defaults[prop]
        for (var prop in config_) config[prop] = config_[prop]

        var doNotChangeMode = defaults.doNotChangeMode;
        var autoCloseTags = {emptyTags: []};
        var autoSelfClosers = defaults.autoSelfClosers;
        var sqlTags = defaults.sqlTags;
        var sqlUpdateTags = defaults.sqlUpdateTags;
        for (var prop in autoSelfClosers) {
            autoCloseTags.emptyTags.push(prop);
        }
        editorConf.autoCloseTags = autoCloseTags;
        // Return variables for tokenizers
        var type, setStyle;

        var sqlMode = editorConf.sqlMode;
        if (sqlMode === "sqlquery") sqlMode = "text/x-sql";
        var sqlConfig = CodeMirror.resolveMode(sqlMode);
        var sqlMode = CodeMirror.getMode(CodeMirror.defaults, sqlMode);

        var client = sqlConfig.client || {},
            atoms = sqlConfig.atoms || {"false": true, "true": true, "null": true},
            builtin = sqlConfig.builtin,
            keywords = sqlConfig.keywords,
            operatorChars = sqlConfig.operatorChars || /^[*+\-%<>!=&|~^\/]/,
            support = sqlConfig.support || {},
            hooks = sqlConfig.hooks || {},
            dateSQL = sqlConfig.dateSQL || {"date": true, "time": true, "timestamp": true},
            backslashStringEscapes = sqlConfig.backslashStringEscapes !== false,
            brackets = sqlConfig.brackets || /^[\{}\(\)\[\]]/,
            punctuation = sqlConfig.punctuation || /^[;.,:]/;

        function set(str) {
            var obj = {}, words = str.split(" ");
            for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
            return obj;
        }

        //'string', with char specified in quote escaped by '\'
        function tokenLiteral(quote, backslashEscapes) {
            return function (stream, state) {
                var escaped = false, ch;
                while ((ch = stream.next()) != null) {
                    if (ch == quote && !escaped) {
                        state.tokenize = inText;//tokenBase
                        break;
                    }
                    escaped = (backslashStringEscapes || backslashEscapes) && !escaped && ch == "\\";
                }
                return "string";
            };
        }

        function tokenComment(depth) {
            return function (stream, state) {
                var m = stream.match(/^.*?(\/\*|\*\/)/)
                if (!m) stream.skipToEnd()
                else if (m[1] == "/*") state.tokenize = tokenComment(depth + 1)
                else if (depth > 1) state.tokenize = tokenComment(depth - 1)
                else state.tokenize = inText //tokenBase
                return "comment"
            }
        }

        function tokenBase(stream, state, ch) {
            var ch = ch || stream.next();
            if (typeof ch !== "undefined") {
                // call hooks from the mime type
                if (hooks[ch]) {
                    var result = hooks[ch](stream, state);
                    if (result !== false) return result;
                }

                if (support.hexNumber &&
                    ((ch == "0" && stream.match(/^[xX][0-9a-fA-F]+/))
                        || (ch == "x" || ch == "X") && stream.match(/^'[0-9a-fA-F]+'/))) {
                    // hex
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/hexadecimal-literals.html
                    return "number";
                } else if (support.binaryNumber &&
                    (((ch == "b" || ch == "B") && stream.match(/^'[01]+'/))
                        || (ch == "0" && stream.match(/^b[01]+/)))) {
                    // bitstring
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/bit-field-literals.html
                    return "number";
                } else if (ch.charCodeAt(0) > 47 && ch.charCodeAt(0) < 58) {
                    // numbers
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/number-literals.html
                    stream.match(/^[0-9]*(\.[0-9]+)?([eE][-+]?[0-9]+)?/);
                    support.decimallessFloat && stream.match(/^\.(?!\.)/);
                    return "number";
                } else if (ch == "?" && (stream.eatSpace() || stream.eol() || stream.eat(";"))) {
                    // placeholders
                    return "variable-3";
                } else if (ch == "'" || (ch == '"' && support.doubleQuote)) {
                    // strings
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/string-literals.html
                    state.tokenize = tokenLiteral(ch);
                    return state.tokenize(stream, state);
                } else if ((((support.nCharCast && (ch == "n" || ch == "N"))
                        || (support.charsetCast && ch == "_" && stream.match(/[a-z][a-z0-9]*/i)))
                    && (stream.peek() == "'" || stream.peek() == '"'))) {
                    // charset casting: _utf8'str', N'str', n'str'
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/string-literals.html
                    return "keyword";
                } else if (support.escapeConstant && (ch == "e" || ch == "E")
                    && (stream.peek() == "'" || (stream.peek() == '"' && support.doubleQuote))) {
                    // escape constant: E'str', e'str'
                    // ref: https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-STRINGS-ESCAPE
                    state.tokenize = function (stream, state) {
                        return (state.tokenize = tokenLiteral(stream.next(), true))(stream, state);
                    }
                    return "keyword";
                } else if (support.commentSlashSlash && ch == "/" && stream.eat("/")) {
                    // 1-line comment
                    stream.skipToEnd();
                    return "comment";
                } else if ((support.commentHash && ch == "#")
                    || (ch == "-" && stream.eat("-") && (!support.commentSpaceRequired || stream.eat(" ")))) {
                    // 1-line comments
                    // ref: https://kb.askmonty.org/en/comment-syntax/
                    stream.skipToEnd();
                    return "comment";
                } else if (ch == "/" && stream.eat("*")) {
                    // multi-line comments
                    // ref: https://kb.askmonty.org/en/comment-syntax/
                    state.tokenize = tokenComment(1);
                    return state.tokenize(stream, state);
                } else if (ch == ".") {
                    // .1 for 0.1
                    if (support.zerolessFloat && stream.match(/^(?:\d+(?:e[+-]?\d+)?)/i))
                        return "number";
                    if (stream.match(/^\.+/))
                        return null
                    // .table_name (ODBC)
                    // // ref: http://dev.mysql.com/doc/refman/5.6/en/identifier-qualifiers.html
                    if (support.ODBCdotTable && stream.match(/^[\w\d_$#]+/))
                        return "variable-2";
                } else if (operatorChars.test(ch)) {
                    // operators
                    stream.eatWhile(operatorChars);
                    return "operator";
                } else if (brackets.test(ch)) {
                    // brackets
                    return "bracket";
                } else if (punctuation.test(ch)) {
                    // punctuation
                    stream.eatWhile(punctuation);
                    return "punctuation";
                } else if (ch == '{' &&
                    (stream.match(/^( )*(d|D|t|T|ts|TS)( )*'[^']*'( )*}/) || stream.match(/^( )*(d|D|t|T|ts|TS)( )*"[^"]*"( )*}/))) {
                    // dates (weird ODBC syntax)
                    // ref: http://dev.mysql.com/doc/refman/5.5/en/date-and-time-literals.html
                    return "number";
                } else {
                    //移到外面了
                }
            }
            stream.eatWhile(/^[_\w\d]/);
            var word = stream.current().toLowerCase();
            // dates (standard SQL syntax)
            // ref: http://dev.mysql.com/doc/refman/5.5/en/date-and-time-literals.html
            if (dateSQL.hasOwnProperty(word) && (stream.match(/^( )+'[^']*'/) || stream.match(/^( )+"[^"]*"/)))
                return "number";
            if (atoms.hasOwnProperty(word)) return "atom";
            if (builtin.hasOwnProperty(word)) return "builtin";
            if (client.hasOwnProperty(word)) return "string-2";
            try {
                if (stream.string.charAt(stream.pos) === ".") {
                    return null;
                }
            } catch (b) {
            }
            if (keywords.hasOwnProperty(word)) return "keyword";

            return null;
        }

        function inText(stream, state) {
            function chain(parser) {
                state.tokenize = parser;
                return parser(stream, state);
            }

            var ch = stream.next();
            if (ch == "<") {
                if (stream.eat("!")) {
                    if (stream.eat("[")) {
                        if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
                        else return null;
                    } else if (stream.match("--")) {
                        return chain(inBlock("comment", "-->"));
                    } else if (stream.match("DOCTYPE", true, true)) {
                        stream.eatWhile(/[\w\._\-]/);
                        return chain(doctype(1));
                    } else {
                        return null;
                    }
                } else if (stream.eat("?")) {
                    stream.eatWhile(/[\w\._\-]/);
                    state.tokenize = inBlock("meta", "?>");
                    return "meta";
                } else {
                    type = stream.eat("/") ? "closeTag" : "openTag";
                    state.tokenize = inTag;
                    return "tag bracket";
                }
            } else if (ch == "&") {
                var ok;
                if (stream.eat("#")) {
                    if (stream.eat("x")) {
                        ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
                    } else {
                        ok = stream.eatWhile(/[\d]/) && stream.eat(";");
                    }
                } else {
                    ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
                }
                return ok ? "atom" : "error";
            } else {
                return tokenBase(stream, state, ch);
            }

//    return style;
        }

        inText.isInText = true;

        function inTag(stream, state) {
            var ch = stream.next();
            if (ch == ">" || (ch == "/" && stream.eat(">"))) {
                state.tokenize = inText;
                type = ch == ">" ? "endTag" : "selfcloseTag";
                return "tag bracket";
            } else if (ch == "=") {
                type = "equals";
                return null;
            } else if (ch == "<") {
                state.tokenize = inText;
                state.state = baseState;
                state.tagName = state.tagStart = null;
                var next = state.tokenize(stream, state);
                return next ? next + " tag error" : "tag error";
            } else if (/[\'\"]/.test(ch)) {
                state.tokenize = inAttribute(ch);
                state.stringStartCol = stream.column();
                return state.tokenize(stream, state);
            } else {
                stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
                return "word";
            }
        }

        function inAttribute(quote) {
            var closure = function (stream, state) {
                while (!stream.eol()) {
                    if (stream.next() == quote) {
                        state.tokenize = inTag;
                        break;
                    }
                }
                return "string";
            };
            closure.isInAttribute = true;
            return closure;
        }

        function inBlock(style, terminator) {
            return function (stream, state) {
                while (!stream.eol()) {
                    if (stream.match(terminator)) {
                        state.tokenize = inText;
                        break;
                    }
                    stream.next();
                }
                return style;
            }
        }

        function doctype(depth) {
            return function (stream, state) {
                var ch;
                while ((ch = stream.next()) != null) {
                    if (ch == "<") {
                        state.tokenize = doctype(depth + 1);
                        return state.tokenize(stream, state);
                    } else if (ch == ">") {
                        if (depth == 1) {
                            state.tokenize = inText;
                            break;
                        } else {
                            state.tokenize = doctype(depth - 1);
                            return state.tokenize(stream, state);
                        }
                    }
                }
                return "meta";
            };
        }

        function Context(state, tagName, startOfLine) {
            this.prev = state.context;
            this.tagName = tagName || "";
            this.indent = state.indented;
            this.startOfLine = startOfLine;
            if (config.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
                this.noIndent = true;
            if (sqlTags.hasOwnProperty(tagName)) {
                this.isSqlTag = true;
                this.sqlTags = sqlTags;
            } else {
                this.isSqlTag = false;
            }
            if (sqlUpdateTags.hasOwnProperty(tagName)) {
                this.isSqlUpdateTag = true;
                this.sqlUpdateTags = sqlUpdateTags;
            } else {
                this.isSqlUpdateTag = false;
            }
        }

        function pushContext2(stream, state, type) {
            state.context = {
                prev: state.context,
                indent: stream.indentation(),
                col: stream.column(),
                type: type
            };
        }

        function popContext2(state) {
            state.indent = state.context.indent;
            state.context = state.context.prev;
        }

        function popContext(state) {
            if (state.context) state.context = state.context.prev;
        }

        function maybePopContext(state, nextTagName) {
            var parentTagName;
            while (true) {
                if (!state.context) {
                    return;
                }
                parentTagName = state.context.tagName;
                if (!config.contextGrabbers.hasOwnProperty(parentTagName) ||
                    !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
                    return;
                }
                popContext(state);
            }
        }

        function baseState(type, stream, state) {
            if (type == "openTag") {
                state.tagStart = stream.column();
                return tagNameState;
            } else if (type == "closeTag") {
                return closeTagNameState;
            } else {
                return baseState;
            }
        }

        function tagNameState(type, stream, state) {
            if (type == "word") {
                state.tagName = stream.current();
                setStyle = "tag";
                return attrState;
            } else if (config.allowMissingTagName && type == "endTag") {
                setStyle = "tag bracket";
                return attrState(type, stream, state);
            } else {
                setStyle = "error";
                return tagNameState;
            }
        }

        function closeTagNameState(type, stream, state) {
            if (type == "word") {
                var tagName = stream.current();
                if (state.context && state.context.tagName != tagName &&
                    config.implicitlyClosed.hasOwnProperty(state.context.tagName))
                    popContext(state);
                if ((state.context && state.context.tagName == tagName) || config.matchClosing === false) {
                    setStyle = "tag";
                    return closeState;
                } else {
                    setStyle = "tag error";
                    return closeStateErr;
                }
            } else if (config.allowMissingTagName && type == "endTag") {
                setStyle = "tag bracket";
                return closeState(type, stream, state);
            } else {
                setStyle = "error";
                return closeStateErr;
            }
        }

        function closeState(type, _stream, state) {
            if (type != "endTag") {
                setStyle = "error";
                return closeState;
            }
            popContext(state);
            return baseState;
        }

        function closeStateErr(type, stream, state) {
            setStyle = "error";
            return closeState(type, stream, state);
        }

        function attrState(type, _stream, state) {
            if (type == "word") {
                setStyle = "attribute";
                return attrEqState;
            } else if (type == "endTag" || type == "selfcloseTag") {
                var tagName = state.tagName, tagStart = state.tagStart;
                state.tagName = state.tagStart = null;
                if (type == "selfcloseTag" ||
                    config.autoSelfClosers.hasOwnProperty(tagName)) {
                    maybePopContext(state, tagName);
                } else {
                    maybePopContext(state, tagName);
                    state.context = new Context(state, tagName, tagStart == state.indented);
                }
                return baseState;
            }
            setStyle = "error";
            return attrState;
        }

        function attrEqState(type, stream, state) {
            if (type == "equals") return attrValueState;
            if (!config.allowMissing) setStyle = "error";
            return attrState(type, stream, state);
        }

        function attrValueState(type, stream, state) {
            if (type == "string") return attrContinuedState;
            if (type == "word" && config.allowUnquoted) {
                setStyle = "string";
                return attrState;
            }
            setStyle = "error";
            return attrState(type, stream, state);
        }

        function attrContinuedState(type, stream, state) {
            if (type == "string") return attrContinuedState;
            return attrState(type, stream, state);
        }

        return {
            startState: function (baseIndent) {
                var state = {
                    tokenize: inText,
                    state: baseState,
                    indented: baseIndent || 0,
                    tagName: null, tagStart: null,
                    context: null
                }
                if (baseIndent != null) state.baseIndent = baseIndent
                return state
            },

            token: function (stream, state) {
                if (!state.tagName && stream.sol())
                    state.indented = stream.indentation();
                if (stream.eatSpace()) return null;
                //SQL
                if (stream.sol()) {
                    if (state.context && state.context.align == null) {
                        state.context.align = false;
                    }
                }
                if (state.context && state.context.align == null) {
                    state.context.align = true;
                }

                type = null;
                var style = state.tokenize(stream, state);
                if ((style || type) && style != "comment") {
                    setStyle = null;
                    state.state = state.state(type || style, stream, state);
                    if (setStyle)
                        style = setStyle == "error" ? style + " error" : setStyle;
                    //SQL
                    var tok = stream.current();
                    if (tok == "(")
                        pushContext2(stream, state, ")");
                    else if (tok == "[")
                        pushContext2(stream, state, "]");
                    else if (state.context && state.context.type == tok)
                        popContext2(state);
                }
                return style;
            },

            indent: function (state, textAfter, fullLine) {
                var context = state.context;
                // Indent multi-line strings (e.g. css).
                if (state.tokenize.isInAttribute) {
                    if (state.tagStart == state.indented)
                        return state.stringStartCol + 1;
                    else
                        return state.indented + indentUnit;
                }
                if (context && context.noIndent) return CodeMirror.Pass;
                if (state.tokenize != inTag && state.tokenize != inText)
                    return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
                // Indent the starts of attribute names.
                if (state.tagName) {
                    if (config.multilineTagIndentPastTag !== false)
                        return state.tagStart + state.tagName.length + 2;
                    else
                        return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
                }
                if (config.alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
                var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
                if (tagAfter && tagAfter[1]) { // Closing tag spotted
                    while (context) {
                        if (context.tagName == tagAfter[2]) {
                            context = context.prev;
                            break;
                        } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
                            context = context.prev;
                        } else {
                            break;
                        }
                    }
                } else if (tagAfter) { // Opening tag spotted
                    while (context) {
                        var grabbers = config.contextGrabbers[context.tagName];
                        if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
                            context = context.prev;
                        else
                            break;
                    }
                }
                while (context && context.prev && !context.startOfLine)
                    context = context.prev;
                if (context) return context.indent + indentUnit;
                else return state.baseIndent || 0;
            },

            electricInput: /<\/[\s\w:]+>$/,
            blockCommentStart: "<!--",
            blockCommentEnd: "-->",

            skipAttribute: function (state) {
                if (state.state == attrValueState)
                    state.state = attrState
            },

            xmlCurrentTag: function (state) {
                return state.tagName ? {name: state.tagName, close: state.type == "closeTag"} : null
            },

            xmlCurrentContext: function (state) {
                var context = []
                for (var cx = state.context; cx; cx = cx.prev)
                    context.push(cx.tagName)
                return context.reverse()
            },
            skipChangeMode: function (state) {
                return doNotChangeMode[state.tagName] || autoSelfClosers[state.tagName];
            },
            initMybatisMapper: function (mapperId, mapperContext) {
                return mybatisMapper.replace("\{0\}", mapperId || "undefined").replace("\{1\}", mapperContext || "");
            },
            getRefTagContext: function (text1, text2) {
                text1 = this.clearContextComment(text1, true);
                text2 = this.clearContextComment(text2);
                var regx = new RegExp("(?<=<include +refid *= *\")(.*?)(?=\" *(/>|>.*?</include>))", "ig");
                var f = text1.match(regx);
                var content = text1;
                if (f && f.length > 0) {
                    var hasRefid = {};
                    for (var i = 0, k = f.length; i < k; i++) {
                        if (f[i] && !hasRefid[f[i]]) {
                            var regx2 = new RegExp("(?<=<sql +id *= *\"" + f[i] + "\" *>)(.*?)(?=</sql>)", "ig");
                            var f2 = text2.match(regx2);
                            if (f2 && f2[0]) {
                                hasRefid[f[i]] = true;
                                content = content.replace(new RegExp("<include +refid *= *\"" + f[i] + "\" *(/>|>.*?</include>)", "ig"), f2[0]);
                            }
                        }
                    }
                }
                return content;
            },
            clearContextComment: function (text, clearFlag) {
                text = text.replace(/(\\n|\n|\\t|\t)/g, " ").replace(/ +/g, " ")
                    .replace(/<!--.*?-->/g, " ").replace(/<where>/g, " where ")
                if (clearFlag) {
                    text = text.replace(new RegExp("(</((?!include)[a-z]+)+>|<((?!include)[a-z]+)+ .*?>|<((?!include)[a-z]+)+ .*?/>)", "g"), "");
                }
                return text;
            }
        };
    });

    CodeMirror.defineMIME("text/x-mybatis", {name: "mybatis", alignCDATA: true});
}


//创建编辑器
export function createMybatisEditor(selfObj, id, refItem) {
    var element = id;
    if (typeof id === "string") {
        element = document.getElementById(id);
    }
    var sqlEditor = CodeMirror.fromTextArea(refItem, {
        autoRefresh: true,
        styleActiveLine: true,
        indentWithTabs: false,
        smartIndent: true,
        lineNumbers: true,
        matchBrackets: true,
        cursorHeight: 1,
        lineWrapping: true,
        readOnly: false,
        theme: 'monakai',

        autofocus: true,
        matchTags: {bothTags: true},
        continueComments: "Enter",
        mode: "text/x-mybatis",
        sqlMode: "text/x-pgsql", //看sqlquery.js，没有的数据库照着现有的添加，很简单

        highlightSelectionMatches: {
            minChars: 2,
            trim: true,
            style: "matchhighlight",
            showToken: false
        },
        extraKeys: { // 触发按键
            "Ctrl-Q": "toggleComment",//注释
            "F11": function (cm) {//全屏
                cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            },
            "' '": "completeIfInTag",//标签属性
            "Tab": function (cm) {
                var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
                cm.replaceSelection(spaces);
            }
        },
        // specialChars: new RegExp(" ", "g"),
        //如下是需要关注的参数
        hintOptions: {
            completeSingle: false,  //关闭补全
            closeOnUnfocus: true,//失去焦点自动关闭，true是，false否
            autoCamelCases: true,//字段追加驼峰格式
            limitTableNum: 25, //表的最大提示数量，默认50
            limitNum: 100,//最大提示数量，默认200
            showPath: true,//显示字段来源情况,默认true
            likeMatch: true,//关键字模糊匹配，默认true
            schemaOpen: true,//是否多模式，默认false
            schemaQuery: 3, //输入至少3个字符触发查询库(schema)
            schemaTypes: {}, //当前库下的所有模式（schema）申明
            //一般是内部动态赋值，无需静态赋值
            allTables: {}, //表集合,比如 {"test.TBL_TABLE1":"表1", ...}。考虑表多的情况，应动态赋值
            sqlTables: {}, //字段集合,比如 {"test.TBL_TABLE1":[["AA1","AA2","AA3"],["AA1标题","AA2标题","AA3标题"]], ...}。考虑表多的情况，应动态赋值
        }
    });
    //便于使用
    selfObj.sqlEditor = sqlEditor;
    selfObj.hintOptions = sqlEditor.getOption("hintOptions");
    selfObj.hintOptions.schemaTypes = selfObj.schemaTypes;
    return sqlEditor;
}

/**
 * 首次初始化mapper模板
 */
export function initValueMybatisEditor(sqlEditor, mapperId, mapperContext) {
    sqlEditor.setValue(sqlEditor.getMode().initMybatisMapper(mapperId, mapperContext));

    //只读mapper主体部分
    sqlEditor.doc.markText({'line': 0, 'ch': 0}, {'line': 2, 'ch': sqlEditor.doc.getLine(2).length}, {
        readOnly: true, inclusiveLeft: false, selectLeft: false, inclusiveRight: true
        , clearWhenEmpty: false, clearOnEnter: false, atomic: true, /* css:"background-color: #65d7b7;" */
    });
    sqlEditor.doc.markText({'line': sqlEditor.doc.lineCount() - 1, 'ch': -1}, {
            'line': sqlEditor.doc.lineCount() - 1,
            'ch': sqlEditor.doc.lastLine().length
        }
        , {
            readOnly: true,
            inclusiveLeft: true,
            inclusiveRight: false,
            selectRight: false,
            clearWhenEmpty: false,
            clearOnEnter: false,
            atomic: true
        });
}

//mytatis提示定义
export function mybatisHintHandler(CodeMirror) {
    var Pos = CodeMirror.Pos;

    var childrens = ["foreach", "if", "choose", "where", "include", "trim", "set", "bind"];
    var jdbcTypes = ["ARRAY", "BIGINT", "BINARY", "BIT", "BLOB", "BOOLEAN", "CHAR", "CLOB", "CURSOR", "DATE"
        , "DECIMAL", "DOUBLE", "FLOAT", "INTEGER", "LONGVARBINARY", "LONGVARCHAR", "NUMERIC", "NCHAR", "NCLOB"
        , "NULL", "NVARCHAR", "OTHER", "REAL", "SMALLINT", "STRUCT", "TIME", "TIMESTAMP", "TINYINT", "UNDEFINED", "VARBINARY", "VARCHAR"];
    var typeHandlerStr = "LocalDateTimeTypeHandler,ZonedDateTimeTypeHandler,OffsetDateTimeTypeHandler,LocalDateTypeHandler,lnstantTypeHandler,OffsetTimeTypeHandler,YearTypeHandler,MonthTypeHandler,LocalTimeTypeHandler,JapaneseDateTypeHandler,YearMonthTypeHandler,BlobTypeHandler,SqlTimestampTypeHandler,BigDecimalTypeHandler,BloblnputStreamTypeHandler,ByteTypeHandler,DateOnlyTypeHandler,EnumOrdinalTypeHandler,NClobTypeHandler,ShortTypeHandler,EnumTypeHandler,LongTypeHandler,ClobTypeHandler,ByteObjectArrayTypeHandler,ArrayTypeHandler,BlobByteObjectArrayTypeHandler,sqITimeTypeHandler,BigIntegerTypeHandler,ByteArrayTypeHandler,BooleanTypeHandler,ClobReaderTypeHandler,objectTypeHandler,UnknownTypeHandler,DoubleTypeHandler,DateTypeHandler,CharacterTypeHandler,FloatTypeHandler,NStringTypeHandler,StringTypeHandler,TimeOnlyTypeHandler,SqlDateTypeHandler,lntegerTypeHandler";
    var typeHandlers = typeHandlerKeys("org.apache.ibatis.type", typeHandlerStr.split(","));
    var s = {attrs: {}}; // Simple tag, reused for a whole lot of tags
    var topParentTag = "mapper";
    var data = {
        "mapper": {
            attrs: {
                namespace: [""]
            },
            children: ["select", "update", "delete", "insert", "sql", "parameterMap", "resultMap", "cache", "cache-ref"]
        },
        "select": {
            attrs: {
                id: [""],
                parameterType: ["", "java.util.Map"],
                parameterMap: [""],
                resultType: ["", "java.util.Map"],
                resultMap: [""]
            },
            children: childrens
        },
        "update": {
            attrs: {
                id: [""], parameterType: ["", "java.util.Map"], parameterMap: [""]
            },
            children: childrens
        },
        "delete": {
            attrs: {
                id: [""], parameterType: ["", "java.util.Map"], parameterMap: [""]
            },
            children: childrens
        },
        "insert": {
            attrs: {
                id: [""],
                parameterType: ["", "java.util.Map"],
                parameterMap: [""],
                keyColumn: [""],
                keyProperty: [""],
                useGeneratedKeys: ["true"]
            },
            children: childrens
        },
        "if": {
            attrs: {
                test: [""]
            },
            children: childrens
        },
        "where": {
            attrs: {},
            children: childrens
        },
        "choose": {
            attrs: {},
            children: ["when", "otherwise"]
        },
        "when": {
            attrs: {
                test: [""]
            },
            children: childrens
        },
        "otherwise": {
            attrs: {},
            children: childrens
        },
        "include": {
            attrs: {
                refid: [""]
            },
            children: ["property"]
        },
        "trim": {
            attrs: {
                prefix: [""], suffix: [""], suffixOverrides: [""], prefixOverrides: [""]
            },
            children: childrens
        },
        "set": {
            attrs: {},
            children: childrens
        },
        "sql": {
            attrs: {
                id: [""]
            },
            children: childrens
        },
        "foreach": {
            attrs: {
                collection: [""], item: [""], index: [""], separator: [""], close: [""], open: [""]
            },
            children: childrens
        },
        "parameterMap": {
            attrs: {
                id: [""], type: [""]
            },
            children: ["parameter"]
        },
        "parameter": {
            attrs: {
                property: [""],
                javaType: [""],
                jdbcType: jdbcTypes,
                mode: ["IN", "OUT", "INOUT"],
                resultMap: [""],
                scale: [""],
                typeHandler: typeHandlers
            }
        },
        "resultMap": {
            attrs: {
                id: [""], type: [""], "extends": [""], autoMapping: ["true", "false"]
            },
            children: ["id", "result", "association", "collection", "constructor", "discriminator"]
        },
        "constructor": {
            attrs: {},
            children: ["idArg", "arg"]
        },
        "idArg": {
            attrs: {
                column: [""], javaType: [""], jdbcType: jdbcTypes, select: [""], typeHandler: typeHandlers
                , resultMap: [""], name: [""], columnPrefix: [""]
            },
        },
        "arg": {
            attrs: {
                column: [""], javaType: [""], jdbcType: jdbcTypes, select: [""], typeHandler: typeHandlers
                , resultMap: [""], name: [""], columnPrefix: [""]
            },
            children: []
        },
        "collection": {
            attrs: {
                column: [""],
                property: [""],
                javaType: [""],
                jdbcType: jdbcTypes,
                ofType: [""],
                typeHandler: typeHandlers
                ,
                select: [""],
                resultMap: [""],
                notNullColumn: [""],
                columnPrefix: [""],
                resultSet: [""]
                ,
                foreignColumn: [""],
                autoMapping: ["true", "false"],
                fetchType: ["lazy", "eager"]
            },
            children: ["constructor", "id", "result", "association", "collection", "discriminator"]
        },
        "association": {
            attrs: {
                column: [""], property: [""], javaType: [""], jdbcType: jdbcTypes, typeHandler: typeHandlers
                , select: [""], resultMap: [""], notNullColumn: [""], columnPrefix: [""], resultSet: [""]
                , foreignColumn: [""], autoMapping: ["true", "false"], fetchType: ["lazy", "eager"]
            },
            children: ["constructor", "id", "result", "association", "collection", "discriminator"]
        },
        "discriminator": {
            attrs: {
                column: [""], javaType: [""], jdbcType: jdbcTypes, typeHandler: typeHandlers
            },
            children: ["case"]
        },
        "case": {
            attrs: {
                value: [""], resultMap: [""], resultType: [""]
            },
            children: ["constructor", "id", "result", "association", "collection", "discriminator"]
        },
        "property": {
            attrs: {
                value: [""], name: [""]
            },
            children: []
        },
        "typeAlias": {
            attrs: {
                alias: [""], type: [""]
            },
        },
        "bind": {
            attrs: {
                value: [""], name: [""]
            },
            children: []
        },
        "id": {
            attrs: {
                column: [""], javaType: [""], jdbcType: jdbcTypes, property: [""], typeHandler: typeHandlers
            },
            children: []
        },
        "result": {
            attrs: {
                column: [""], javaType: [""], jdbcType: jdbcTypes, property: [""], typeHandler: typeHandlers
            },
            children: []
        },
        "cache": {
            attrs: {
                blocking: [""], eviction: [""], flushInterval: [""], readOnly: [""], size: [""], type: [""]
            },
            children: []
        },
        "cache-ref": {
            attrs: {
                namespace: [""]
            },
            children: []
        },
    };
    //全局属性
    var globalAttrs = {};

    function populate(obj) {
        for (var attr in globalAttrs) if (globalAttrs.hasOwnProperty(attr))
            obj.attrs[attr] = globalAttrs[attr];
    }

    populate(s);
    for (var tag in data) if (data.hasOwnProperty(tag) && data[tag] != s)
        populate(data[tag]);

    function typeHandlerKeys(packageId, types) {
        var typeHandlers = [];
        for (var i = 0; i < types.length; i++)
            typeHandlers.push(packageId + types[i]);
        return typeHandlers;
    }

    function matches(hint, typed, matchInMiddle) {
        if (matchInMiddle) return hint.indexOf(typed) >= 0;
        else return hint.toLowerCase().lastIndexOf(typed.toLowerCase(), 0) == 0;
    }

    CodeMirror.mybatisSchema = data;

    function getHints(cm, options) {
        var tags = options && options.schemaInfo;
        var quote = (options && options.quoteChar) || '"';
        var matchInMiddle = options && options.matchInMiddle;
        options.mybatis = true;
        options.isInnerAttr = false;
        if (!tags) return;
        var cur = cm.getCursor(), token = cm.getTokenAt(cur);
        if (token.end > cur.ch) {
            token.end = cur.ch;
            token.string = token.string.slice(0, cur.ch - token.start);
        }
        var inner = CodeMirror.innerMode(cm.getMode(), token.state);
        if (!inner.mode.xmlCurrentTag) return
        var result = [], replaceToken = false, prefix;
        var tag = /\btag\b/.test(token.type) && !/>$/.test(token.string);
        var tagName = tag && /^\w/.test(token.string), tagStart;

        if (tagName) {
            var before = cm.getLine(cur.line).slice(Math.max(0, token.start - 2), token.start);
            var tagType = /<\/$/.test(before) ? "close" : /<$/.test(before) ? "open" : null;
            if (tagType) tagStart = token.start - (tagType == "close" ? 2 : 1);
        } else if (tag && token.string == "<") {
            tagType = "open";
        } else if (tag && token.string == "</") {
            tagType = "close";
        }
        var tagInfo = inner.mode.xmlCurrentTag(inner.state)
        if (!tag && !tagInfo || tagType) {
            if (tagName)
                prefix = token.string;
            replaceToken = tagType;
            var context = inner.mode.xmlCurrentContext ? inner.mode.xmlCurrentContext(inner.state) : []
            var inner = context.length && context[context.length - 1]
            var curTag = inner && tags[inner]
            var childList = inner ? curTag && curTag.children : tags["!top"];
            if (tagType) {
                if (childList && tagType != "close") {
                    for (var i = 0; i < childList.length; ++i) if (!prefix || matches(childList[i], prefix, matchInMiddle))
                        result.push("<" + childList[i]);
                } else if (tagType != "close") {
                    for (var name in tags)
                        if (tags.hasOwnProperty(name) && name != "!top" && name != "!attrs" && (!prefix || matches(name, prefix, matchInMiddle)))
                            result.push("<" + name);
                }
                if (inner && (!prefix || tagType == "close" && matches(inner, prefix, matchInMiddle)))
                    result.push("</" + inner + ">");
            } else if ((!/\s+$/.test(token.string)) && !tagType && inner !== topParentTag) {
                if (token.string !== "=" && CodeMirror.hint.hasOwnProperty("sqlquery")) {
                    return CodeMirror.hint["sqlquery"](cm, options);
                }
            }
        } else {
            // Attribute completion
            var curTag = tagInfo && tags[tagInfo.name], attrs = curTag && curTag.attrs;
            var globalAttrs = tags["!attrs"];
            if (!attrs && !globalAttrs) return;
            if (!attrs) {
                attrs = globalAttrs;
            } else if (globalAttrs) { // Combine tag-local and global attributes
                var set = {};
                for (var nm in globalAttrs) if (globalAttrs.hasOwnProperty(nm)) set[nm] = globalAttrs[nm];
                for (var nm in attrs) if (attrs.hasOwnProperty(nm)) set[nm] = attrs[nm];
                attrs = set;
            }
            if (token.type == "string" || token.string == "=") { // A value
                var before = cm.getRange(Pos(cur.line, Math.max(0, cur.ch - 60)),
                    Pos(cur.line, token.type == "string" ? token.start : token.end));
                var atName = before.match(/([^\s\u00a0=<>\"\']+)=$/), atValues;
                if (!atName || !attrs.hasOwnProperty(atName[1]) || !(atValues = attrs[atName[1]])) return;
                if (typeof atValues == 'function') atValues = atValues.call(this, cm); // Functions can be used to supply values for autocomplete widget
                if (token.type == "string") {
                    prefix = token.string;
                    var n = 0;
                    if (/['"]/.test(token.string.charAt(0))) {
                        quote = token.string.charAt(0);
                        prefix = token.string.slice(1);
                        n++;
                    }
                    var len = token.string.length;
                    if (/['"]/.test(token.string.charAt(len - 1))) {
                        quote = token.string.charAt(len - 1);
                        prefix = token.string.substr(n, len - 2);
                    }
                    if (n) { // an opening quote
                        var line = cm.getLine(cur.line);
                        if (line.length > token.end && line.charAt(token.end) == quote) token.end++; // include a closing quote
                    }
                    replaceToken = true;
                }
                var returnHintsFromAtValues = function (atValues) {
                    if (atValues)
                        for (var i = 0; i < atValues.length; ++i) if (!prefix || matches(atValues[i], prefix, matchInMiddle)) {
                            result.push(quote + atValues[i] + quote);
                        }
                    if (result.length === 0 && CodeMirror.hint.hasOwnProperty("sqlquery")) {
                        options.isInnerAttr = true;
                        var sql = CodeMirror.hint["sqlquery"](cm, options);
                        return sql;
                    }
                    return returnHints();
                };
                if (atValues && atValues.then) return atValues.then(returnHintsFromAtValues);
                return returnHintsFromAtValues(atValues);
            } else { // An attribute name
                if (token.type == "attribute") {
                    prefix = token.string;
                    replaceToken = true;
                }
                var hasChild = [];
                if (!prefix) {
                    var t = cur.ch + 1, tend = cm.getRange(cur, CodeMirror.Pos(cur.line, t), "\n");
                    var cln = cm.getLine(cur.line).length;
                    var r1 = new RegExp("\\s*\/*(?<!\\\\)>$|\\s*((?<!\\\\)<)$"),
                        r2 = new RegExp("\\b[a-z]+(-[a-z]+)*\\b", "ig");
                    while (t < cln && !r1.test(tend)) {
                        t++;
                        tend = cm.getRange(cur, CodeMirror.Pos(cur.line, t, "\n"));
                    }
                    tend = cm.getRange(CodeMirror.Pos(cur.line, token.state.tagStart + token.state.tagName.length + 1), CodeMirror.Pos(cur.line, t, "\n"));
                    hasChild = tend.match(r2);
                }
                for (var attr in attrs) if (attrs.hasOwnProperty(attr) && (!prefix || matches(attr, prefix, matchInMiddle))) {
                    if (!hasChild || !hasChild.includes(attr)) {
                        result.push(attr);
                    }
                }
            }
        }

        function returnHints() {
            return {
                list: result,
                from: replaceToken ? Pos(cur.line, tagStart == null ? token.start : tagStart) : cur,
                to: replaceToken ? Pos(cur.line, token.end) : cur
            };
        }

        return returnHints();
    }

    CodeMirror.registerHelper("hint", "mybatis", function (cm, options) {
        var local = {schemaInfo: data};
        if (options) for (var opt in options) local[opt] = options[opt];
        return getHints(cm, local);
    });


    function completeAfter(cm, pred) {
        var cur = cm.getCursor();
        if (!pred || pred()) setTimeout(function () {
            if (!cm.state.completionActive)
                cm.showHint({completeSingle: false});
        }, 100);
        return CodeMirror.Pass;
    }

    function completeIfAfterLt(cm) {
        return completeAfter(cm, function () {
            var cur = cm.getCursor();
            return cm.getRange(CodeMirror.Pos(cur.line, cur.ch - 1), cur) == "<";
        });
    }

    function completeIfInTag(cm) {
        return completeAfter(cm, function () {
            var tok = cm.getTokenAt(cm.getCursor());
            if (tok.type == "string" && (!new RegExp("['\"]").test(tok.string.charAt(tok.string.length - 1)) || tok.string.length == 1)) return false;
            var inner = CodeMirror.innerMode(cm.getMode(), tok.state).state;
            return inner.tagName;
        });
    }

    CodeMirror.commands.completeIfInTag = function (cm) {
        return completeIfInTag(cm);
    };
}



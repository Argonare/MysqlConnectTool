// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

export function sqlqueryHandler(CodeMirror) {
    CodeMirror.defineMode("sqlquery", function(editorConf, config_) {
          var client         = config_.client || {},
          atoms          = config_.atoms || {"false": true, "true": true, "null": true},
          builtin        = config_.builtin || set(defaultBuiltin),
          keywords       = config_.keywords || set(sqlKeywords),
          operatorChars  = config_.operatorChars || /^[*+\-%<>!=&|~^\/]/,
          support        = config_.support || {},
          hooks          = config_.hooks || {},
          dateSQL        = config_.dateSQL || {"date" : true, "time" : true, "timestamp" : true},
          backslashStringEscapes = config_.backslashStringEscapes !== false,
          brackets       = config_.brackets || /^[\{}\(\)\[\]]/,
          punctuation    = config_.punctuation || /^[;.,:]/
    
      function tokenBase(stream, state) {
        var ch = stream.next();
    
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
          state.tokenize = function(stream, state) {
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
          stream.eatWhile(/^[_\w\d]/);
          var word = stream.current().toLowerCase();
          // dates (standard SQL syntax)
          // ref: http://dev.mysql.com/doc/refman/5.5/en/date-and-time-literals.html
          if (dateSQL.hasOwnProperty(word) && (stream.match(/^( )+'[^']*'/) || stream.match(/^( )+"[^"]*"/)))
            return "number";
    
          if (atoms.hasOwnProperty(word)) return "atom";
          if (builtin.hasOwnProperty(word)) return "builtin";
          if (client.hasOwnProperty(word)) return "string-2";
          try{
              if(stream.string.charAt(stream.pos)==="."){
                return null;
              }
          }catch(b){
          }
          if (keywords.hasOwnProperty(word)) return "keyword";
          
          return null;
        }
      }
    
      // 'string', with char specified in quote escaped by '\'
      function tokenLiteral(quote, backslashEscapes) {
        return function(stream, state) {
          var escaped = false, ch;
          while ((ch = stream.next()) != null) {
            if (ch == quote && !escaped) {
              state.tokenize = tokenBase;
              break;
            }
            escaped = (backslashStringEscapes || backslashEscapes) && !escaped && ch == "\\";
          }
          return "string";
        };
      }
      function tokenComment(depth) {
        return function(stream, state) {
          var m = stream.match(/^.*?(\/\*|\*\/)/)
          if (!m) stream.skipToEnd()
          else if (m[1] == "/*") state.tokenize = tokenComment(depth + 1)
          else if (depth > 1) state.tokenize = tokenComment(depth - 1)
          else state.tokenize = tokenBase
          return "comment"
        }
      }
    
      function pushContext(stream, state, type) {
        state.context = {
          prev: state.context,
          indent: stream.indentation(),
          col: stream.column(),
          type: type
        };
      }
    
      function popContext(state) {
        state.indent = state.context.indent;
        state.context = state.context.prev;
      }
    
      return {
        startState: function() {
          return {tokenize: tokenBase, context: null};
        },
    
        token: function(stream, state) {
          if (stream.sol()) {
            if (state.context && state.context.align == null)
              state.context.align = false;
          }
          if (state.tokenize == tokenBase && stream.eatSpace()) return null;
    
          var style = state.tokenize(stream, state);
          if (style == "comment") return style;
    
          if (state.context && state.context.align == null)
            state.context.align = true;
    
          var tok = stream.current();
          if (tok == "(")
            pushContext(stream, state, ")");
          else if (tok == "[")
            pushContext(stream, state, "]");
          else if (state.context && state.context.type == tok)
            popContext(state);
          return style;
        },
    
        indent: function(state, textAfter) {
          var cx = state.context;
          if (!cx) return CodeMirror.Pass;
          var closing = textAfter.charAt(0) == cx.type;
          if (cx.align) return cx.col + (closing ? 0 : 1);
          else return cx.indent + (closing ? 0 : editorConf.indentUnit);
        },
    
        blockCommentStart: "/*",
        blockCommentEnd: "*/",
        lineComment: support.commentSlashSlash ? "//" : support.commentHash ? "#" : "--",
        closeBrackets: "()[]{}''\"\"``",
        helperType: "sqlquery",
      };
    });
    
    
    
      // `identifier`
      function hookIdentifier(stream) {
        // MySQL/MariaDB identifiers
        // ref: http://dev.mysql.com/doc/refman/5.6/en/identifier-qualifiers.html
        var ch;
        while ((ch = stream.next()) != null) {
          if (ch == "`" && !stream.eat("`")) return "variable-2";
        }
        stream.backUp(stream.current().length - 1);
        return stream.eatWhile(/\w/) ? "variable-2" : null;
      }
    
      // "identifier"
      function hookIdentifierDoublequote(stream) {
        // Standard SQL /SQLite identifiers
        // ref: http://web.archive.org/web/20160813185132/http://savage.net.au/SQL/sql-99.bnf.html#delimited%20identifier
        // ref: http://sqlite.org/lang_keywords.html
        var ch;
        while ((ch = stream.next()) != null) {
          if (ch == "\"" && !stream.eat("\"")) return "variable-2";
        }
        stream.backUp(stream.current().length - 1);
        return stream.eatWhile(/\w/) ? "variable-2" : null;
      }
    
      // variable token
      function hookVar(stream) {
        // variables
        // @@prefix.varName @varName
        // varName can be quoted with ` or ' or "
        // ref: http://dev.mysql.com/doc/refman/5.5/en/user-variables.html
        if (stream.eat("@")) {
          stream.match('session.');
          stream.match('local.');
          stream.match('global.');
        }
    
        if (stream.eat("'")) {
          stream.match(/^.*'/);
          return "variable-2";
        } else if (stream.eat('"')) {
          stream.match(/^.*"/);
          return "variable-2";
        } else if (stream.eat("`")) {
          stream.match(/^.*`/);
          return "variable-2";
        } else if (stream.match(/^[0-9a-zA-Z$\.\_]+/)) {
          return "variable-2";
        }
        return null;
      };
    
      // short client keyword token
      function hookClient(stream) {
        // \N means NULL
        // ref: http://dev.mysql.com/doc/refman/5.5/en/null-values.html
        if (stream.eat("N")) {
            return "atom";
        }
        // \g, etc
        // ref: http://dev.mysql.com/doc/refman/5.5/en/mysql-commands.html
        return stream.match(/^[a-zA-Z.#!?]/) ? "variable-2" : null;
      }
    
      // these keywords are used by all SQL dialects (however, a mode can still overwrite it)
      var sqlKeywords = "alter and as asc between by count create delete desc distinct drop from group having in insert into is join like not on or order select set table union update values where limit ";
    
      // turn a space-separated list into an array
      function set(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
      }
    
      var defaultBuiltin = "bool boolean bit blob enum long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision real date datetime year unsigned signed decimal numeric"
    
    
    // A generic SQL Mode. It's not a standard, it just try to support what is generally supported
      CodeMirror.defineMIME("text/x-sql", {
        name: "sqlquery",
        keywords: set(sqlKeywords + "begin"),
        builtin: set(defaultBuiltin),
        atoms: set("false true null unknown"),
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable doubleQuote binaryNumber hexNumber")
      });
    
      CodeMirror.defineMIME("text/x-mssql", {
        name: "sqlquery",
        client: set("$partition binary_checksum checksum connectionproperty context_info current_request_id error_line error_message error_number error_procedure error_severity error_state formatmessage get_filestream_transaction_context getansinull host_id host_name isnull isnumeric min_active_rowversion newid newsequentialid rowcount_big xact_state object_id"),
        keywords: set(sqlKeywords + "begin trigger proc view index for add constraint key primary foreign collate clustered nonclustered declare exec go if use index holdlock nolock nowait paglock readcommitted readcommittedlock readpast readuncommitted repeatableread rowlock serializable snapshot tablock tablockx updlock with"),
        builtin: set("bigint numeric bit smallint decimal smallmoney int tinyint money float real char varchar text nchar nvarchar ntext binary varbinary image cursor timestamp hierarchyid uniqueidentifier sql_variant xml table "),
        atoms: set("is not null like and or in left right between inner outer join all any some cross unpivot pivot exists"),
        operatorChars: /^[*+\-%<>!=^\&|\/]/,
        brackets: /^[\{}\(\)]/,
        punctuation: /^[;.,:/]/,
        backslashStringEscapes: false,
        dateSQL: set("date datetimeoffset datetime2 smalldatetime datetime time"),
        hooks: {
          "@":   hookVar
        }
      });
    
      CodeMirror.defineMIME("text/x-mysql", {
        name: "sqlquery",
        client: set("charset clear connect edit ego exit go help nopager notee nowarning pager print prompt quit rehash source status system tee"),
        keywords: set(sqlKeywords + "accessible action add after algorithm all analyze asensitive at authors auto_increment autocommit avg avg_row_length before binary binlog both btree cache call cascade cascaded case catalog_name chain change changed character check checkpoint checksum class_origin client_statistics close coalesce code collate collation collations column columns comment commit committed completion concurrent condition connection consistent constraint contains continue contributors convert cross current current_date current_time current_timestamp current_user cursor data database databases day_hour day_microsecond day_minute day_second deallocate dec declare default delay_key_write delayed delimiter des_key_file describe deterministic dev_pop dev_samp deviance diagnostics directory disable discard distinctrow div dual dumpfile each elseif enable enclosed end ends engine engines enum errors escape escaped even event events every execute exists exit explain extended fast fetch field fields first flush for force foreign found_rows full fulltext function general get global grant grants group group_concat handler hash help high_priority hosts hour_microsecond hour_minute hour_second if ignore ignore_server_ids import index index_statistics infile inner innodb inout insensitive insert_method install interval invoker isolation iterate key keys kill language last leading leave left level limit linear lines list load local localtime localtimestamp lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters match max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modifies modify mutex mysql_errno natural next no no_write_to_binlog offline offset one online open optimize option optionally out outer outfile pack_keys parser partition partitions password phase plugin plugins prepare preserve prev primary privileges procedure processlist profile profiles purge query quick range read read_write reads real rebuild recover references regexp relaylog release remove rename reorganize repair repeatable replace require resignal restrict resume return returns revoke right rlike rollback rollup row row_format rtree savepoint schedule schema schema_name schemas second_microsecond security sensitive separator serializable server session share show signal slave slow smallint snapshot soname spatial specific sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result sqlexception sqlstate sqlwarning ssl start starting starts status std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace temporary terminated to trailing transaction trigger triggers truncate uncommitted undo uninstall unique unlock upgrade usage use use_frm user user_resources user_statistics using utc_date utc_time utc_timestamp value variables varying view views warnings when while with work write xa xor year_month zerofill begin do then else loop repeat"),
        builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision date datetime year unsigned signed numeric"),
        atoms: set("false true null unknown"),
        operatorChars: /^[*+\-%<>!=&|^]/,
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber doubleQuote nCharCast charsetCast commentHash commentSpaceRequired"),
        hooks: {
          "@":   hookVar,
          "`":   hookIdentifier,
          "\\":  hookClient
        }
      });
    
      CodeMirror.defineMIME("text/x-mariadb", {
        name: "sqlquery",
        client: set("charset clear connect edit ego exit go help nopager notee nowarning pager print prompt quit rehash source status system tee"),
        keywords: set(sqlKeywords + "accessible action add after algorithm all always analyze asensitive at authors auto_increment autocommit avg avg_row_length before binary binlog both btree cache call cascade cascaded case catalog_name chain change changed character check checkpoint checksum class_origin client_statistics close coalesce code collate collation collations column columns comment commit committed completion concurrent condition connection consistent constraint contains continue contributors convert cross current current_date current_time current_timestamp current_user cursor data database databases day_hour day_microsecond day_minute day_second deallocate dec declare default delay_key_write delayed delimiter des_key_file describe deterministic dev_pop dev_samp deviance diagnostics directory disable discard distinctrow div dual dumpfile each elseif enable enclosed end ends engine engines enum errors escape escaped even event events every execute exists exit explain extended fast fetch field fields first flush for force foreign found_rows full fulltext function general generated get global grant grants group groupby_concat handler hard hash help high_priority hosts hour_microsecond hour_minute hour_second if ignore ignore_server_ids import index index_statistics infile inner innodb inout insensitive insert_method install interval invoker isolation iterate key keys kill language last leading leave left level limit linear lines list load local localtime localtimestamp lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters match max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modifies modify mutex mysql_errno natural next no no_write_to_binlog offline offset one online open optimize option optionally out outer outfile pack_keys parser partition partitions password persistent phase plugin plugins prepare preserve prev primary privileges procedure processlist profile profiles purge query quick range read read_write reads real rebuild recover references regexp relaylog release remove rename reorganize repair repeatable replace require resignal restrict resume return returns revoke right rlike rollback rollup row row_format rtree savepoint schedule schema schema_name schemas second_microsecond security sensitive separator serializable server session share show shutdown signal slave slow smallint snapshot soft soname spatial specific sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result sqlexception sqlstate sqlwarning ssl start starting starts status std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace temporary terminated to trailing transaction trigger triggers truncate uncommitted undo uninstall unique unlock upgrade usage use use_frm user user_resources user_statistics using utc_date utc_time utc_timestamp value variables varying view views virtual warnings when while with work write xa xor year_month zerofill begin do then else loop repeat"),
        builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision date datetime year unsigned signed numeric"),
        atoms: set("false true null unknown"),
        operatorChars: /^[*+\-%<>!=&|^]/,
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber doubleQuote nCharCast charsetCast commentHash commentSpaceRequired"),
        hooks: {
          "@":   hookVar,
          "`":   hookIdentifier,
          "\\":  hookClient
        }
      });
    
      // provided by the phpLiteAdmin project - phpliteadmin.org
      CodeMirror.defineMIME("text/x-sqlite", {
        name: "sqlquery",
        // commands of the official SQLite client, ref: https://www.sqlite.org/cli.html#dotcmd
        client: set("auth backup bail binary changes check clone databases dbinfo dump echo eqp exit explain fullschema headers help import imposter indexes iotrace limit lint load log mode nullvalue once open output print prompt quit read restore save scanstats schema separator session shell show stats system tables testcase timeout timer trace vfsinfo vfslist vfsname width"),
        // ref: http://sqlite.org/lang_keywords.html
        keywords: set(sqlKeywords + "abort action add after all analyze attach autoincrement before begin cascade case cast check collate column commit conflict constraint cross current_date current_time current_timestamp database default deferrable deferred detach each else end escape except exclusive exists explain fail for foreign full glob if ignore immediate index indexed initially inner instead intersect isnull key left limit match natural no notnull null of offset outer plan pragma primary query raise recursive references regexp reindex release rename replace restrict right rollback row savepoint temp temporary then to transaction trigger unique using vacuum view virtual when with without"),
        // SQLite is weakly typed, ref: http://sqlite.org/datatype3.html. This is just a list of some common types.
        builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text clob bigint int int2 int8 integer float double char varchar date datetime year unsigned signed numeric real"),
        // ref: http://sqlite.org/syntax/literal-value.html
        atoms: set("null current_date current_time current_timestamp"),
        // ref: http://sqlite.org/lang_expr.html#binaryops
        operatorChars: /^[*+\-%<>!=&|/~]/,
        // SQLite is weakly typed, ref: http://sqlite.org/datatype3.html. This is just a list of some common types.
        dateSQL: set("date time timestamp datetime"),
        support: set("decimallessFloat zerolessFloat"),
        identifierQuote: "\"",  //ref: http://sqlite.org/lang_keywords.html
        hooks: {
          // bind-parameters ref:http://sqlite.org/lang_expr.html#varparam
          "@":   hookVar,
          ":":   hookVar,
          "?":   hookVar,
          "$":   hookVar,
          // The preferred way to escape Identifiers is using double quotes, ref: http://sqlite.org/lang_keywords.html
          "\"":   hookIdentifierDoublequote,
          // there is also support for backticks, ref: http://sqlite.org/lang_keywords.html
          "`":   hookIdentifier
        }
      });
    
      // the query language used by Apache Cassandra is called CQL, but this mime type
      // is called Cassandra to avoid confusion with Contextual Query Language
      CodeMirror.defineMIME("text/x-cassandra", {
        name: "sqlquery",
        client: { },
        keywords: set("add all allow alter and any apply as asc authorize batch begin by clustering columnfamily compact consistency count create custom delete desc distinct drop each_quorum exists filtering from grant if in index insert into key keyspace keyspaces level limit local_one local_quorum modify nan norecursive nosuperuser not of on one order password permission permissions primary quorum rename revoke schema select set storage superuser table three to token truncate ttl two type unlogged update use user users using values where with writetime"),
        builtin: set("ascii bigint blob boolean counter decimal double float frozen inet int list map static text timestamp timeuuid tuple uuid varchar varint"),
        atoms: set("false true infinity NaN"),
        operatorChars: /^[<>=]/,
        dateSQL: { },
        support: set("commentSlashSlash decimallessFloat"),
        hooks: { }
      });
    
      // this is based on Peter Raganitsch's 'plsql' mode
      CodeMirror.defineMIME("text/x-plsql", {
        name:       "sqlquery",
        client:     set("appinfo arraysize autocommit autoprint autorecovery autotrace blockterminator break btitle cmdsep colsep compatibility compute concat copycommit copytypecheck define describe echo editfile embedded escape exec execute feedback flagger flush heading headsep instance linesize lno loboffset logsource long longchunksize markup native newpage numformat numwidth pagesize pause pno recsep recsepchar release repfooter repheader serveroutput shiftinout show showmode size spool sqlblanklines sqlcase sqlcode sqlcontinue sqlnumber sqlpluscompatibility sqlprefix sqlprompt sqlterminator suffix tab term termout time timing trimout trimspool ttitle underline verify version wrap"),
        keywords:   set("abort accept access add all alter and any array arraylen as asc assert assign at attributes audit authorization avg base_table begin between binary_integer body boolean by case cast char char_base check close cluster clusters colauth column comment commit compress connect connected constant constraint crash create current currval cursor data_base database date dba deallocate debugoff debugon decimal declare default definition delay delete desc digits dispose distinct do drop else elseif elsif enable end entry escape exception exception_init exchange exclusive exists exit external fast fetch file for force form from function generic goto grant group having identified if immediate in increment index indexes indicator initial initrans insert interface intersect into is key level library like limited local lock log logging long loop master maxextents maxtrans member minextents minus mislabel mode modify multiset new next no noaudit nocompress nologging noparallel not nowait number_base object of off offline on online only open option or order out package parallel partition pctfree pctincrease pctused pls_integer positive positiven pragma primary prior private privileges procedure public raise range raw read rebuild record ref references refresh release rename replace resource restrict return returning returns reverse revoke rollback row rowid rowlabel rownum rows run savepoint schema segment select separate session set share snapshot some space split sql start statement storage subtype successful synonym tabauth table tables tablespace task terminate then to trigger truncate type union unique unlimited unrecoverable unusable update use using validate value values variable view views when whenever where while with work"),
        builtin:    set("abs acos add_months ascii asin atan atan2 average bfile bfilename bigserial bit blob ceil character chartorowid chr clob concat convert cos cosh count dec decode deref dual dump dup_val_on_index empty error exp false float floor found glb greatest hextoraw initcap instr instrb int integer isopen last_day least length lengthb ln lower lpad ltrim lub make_ref max min mlslabel mod months_between natural naturaln nchar nclob new_time next_day nextval nls_charset_decl_len nls_charset_id nls_charset_name nls_initcap nls_lower nls_sort nls_upper nlssort no_data_found notfound null number numeric nvarchar2 nvl others power rawtohex real reftohex round rowcount rowidtochar rowtype rpad rtrim serial sign signtype sin sinh smallint soundex sqlcode sqlerrm sqrt stddev string substr substrb sum sysdate tan tanh to_char text to_date to_label to_multi_byte to_number to_single_byte translate true trunc uid unlogged upper user userenv varchar varchar2 variance varying vsize xml"),
        operatorChars: /^[*\/+\-%<>!=~]/,
        dateSQL:    set("date time timestamp"),
        support:    set("doubleQuote nCharCast zerolessFloat binaryNumber hexNumber")
      });
    
      // Created to support specific hive keywords
      CodeMirror.defineMIME("text/x-hive", {
        name: "sqlquery",
        keywords: set("select alter $elem$ $key$ $value$ add after all analyze and archive as asc before between binary both bucket buckets by cascade case cast change cluster clustered clusterstatus collection column columns comment compute concatenate continue create cross cursor data database databases dbproperties deferred delete delimited desc describe directory disable distinct distribute drop else enable end escaped exclusive exists explain export extended external fetch fields fileformat first format formatted from full function functions grant group having hold_ddltime idxproperties if import in index indexes inpath inputdriver inputformat insert intersect into is items join keys lateral left like limit lines load local location lock locks mapjoin materialized minus msck no_drop nocompress not of offline on option or order out outer outputdriver outputformat overwrite partition partitioned partitions percent plus preserve procedure purge range rcfile read readonly reads rebuild recordreader recordwriter recover reduce regexp rename repair replace restrict revoke right rlike row schema schemas semi sequencefile serde serdeproperties set shared show show_database sort sorted ssl statistics stored streamtable table tables tablesample tblproperties temporary terminated textfile then tmp to touch transform trigger unarchive undo union uniquejoin unlock update use using utc utc_tmestamp view when where while with admin authorization char compact compactions conf cube current current_date current_timestamp day decimal defined dependency directories elem_type exchange file following for grouping hour ignore inner interval jar less logical macro minute month more none noscan over owner partialscan preceding pretty principals protection reload rewrite role roles rollup rows second server sets skewed transactions truncate unbounded unset uri user values window year"),
        builtin: set("bool boolean long timestamp tinyint smallint bigint int float double date datetime unsigned string array struct map uniontype key_type utctimestamp value_type varchar"),
        atoms: set("false true null unknown"),
        operatorChars: /^[*+\-%<>!=]/,
        dateSQL: set("date timestamp"),
        support: set("ODBCdotTable doubleQuote binaryNumber hexNumber")
      });
    
      CodeMirror.defineMIME("text/x-pgsql", {
        name: "sqlquery",
        client: set("source"),
        // For PostgreSQL - https://www.postgresql.org/docs/11/sql-keywords-appendix.html
        // For pl/pgsql lang - https://github.com/postgres/postgres/blob/REL_11_2/src/pl/plpgsql/src/pl_scanner.c
        keywords: set(sqlKeywords + "abort abs absent absolute access according action ada add admin after aggregate alias all allocate also alter always analyse analyze and any are array array_agg array_max_cardinality as asc asensitive assert assertion assignment asymmetric at atomic attach attribute attributes authorization avg backward base64 before begin begin_frame begin_partition bernoulli between bigint binary bit bit_length blob blocked bom boolean both breadth by cache call called cardinality cascade cascaded case cast catalog catalog_name ceil ceiling chain char char_length character character_length character_set_catalog character_set_name character_set_schema characteristics characters check checkpoint class class_origin clob close cluster coalesce cobol collate collation collation_catalog collation_name collation_schema collect column column_name columns command_function command_function_code comment comments commit committed concurrently condition condition_number configuration conflict connect connection connection_name constant constraint constraint_catalog constraint_name constraint_schema constraints constructor contains content continue control conversion convert copy corr corresponding cost count covar_pop covar_samp create cross csv cube cume_dist current current_catalog current_date current_default_transform_group current_path current_role current_row current_schema current_time current_timestamp current_transform_group_for_type current_user cursor cursor_name cycle data database datalink datatype date datetime_interval_code datetime_interval_precision day db deallocate debug dec decimal declare default defaults deferrable deferred defined definer degree delete delimiter delimiters dense_rank depends depth deref derived desc describe descriptor detach detail deterministic diagnostics dictionary disable discard disconnect dispatch distinct dlnewcopy dlpreviouscopy dlurlcomplete dlurlcompleteonly dlurlcompletewrite dlurlpath dlurlpathonly dlurlpathwrite dlurlscheme dlurlserver dlvalue do document domain double drop dump dynamic dynamic_function dynamic_function_code each element else elseif elsif empty enable encoding encrypted end end_frame end_partition endexec enforced enum equals errcode error escape event every except exception exclude excluding exclusive exec execute exists exit exp explain expression extension external extract false family fetch file filter final first first_value flag float floor following for force foreach foreign fortran forward found frame_row free freeze from fs full function functions fusion general generated get global go goto grant granted greatest group grouping groups handler having header hex hierarchy hint hold hour id identity if ignore ilike immediate immediately immutable implementation implicit import in include including increment indent index indexes indicator info inherit inherits initially inline inner inout input insensitive insert instance instantiable instead int integer integrity intersect intersection interval into invoker is isnull isolation join key key_member key_type label lag language large last last_value lateral lead leading leakproof least left length level library like like_regex limit link listen ln load local localtime localtimestamp location locator lock locked log logged loop lower map mapping match matched materialized max max_cardinality maxvalue member merge message message_length message_octet_length message_text method min minute minvalue mod mode modifies module month more move multiset mumps name names namespace national natural nchar nclob nesting new next nfc nfd nfkc nfkd nil no none normalize normalized not nothing notice notify notnull nowait nth_value ntile null nullable nullif nulls number numeric object occurrences_regex octet_length octets of off offset oids old on only open operator option options or order ordering ordinality others out outer output over overlaps overlay overriding owned owner pad parallel parameter parameter_mode parameter_name parameter_ordinal_position parameter_specific_catalog parameter_specific_name parameter_specific_schema parser partial partition pascal passing passthrough password path percent percent_rank percentile_cont percentile_disc perform period permission pg_context pg_datatype_name pg_exception_context pg_exception_detail pg_exception_hint placing plans pli policy portion position position_regex power precedes preceding precision prepare prepared preserve primary print_strict_params prior privileges procedural procedure procedures program public publication query quote raise range rank read reads real reassign recheck recovery recursive ref references referencing refresh regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy regr_syy reindex relative release rename repeatable replace replica requiring reset respect restart restore restrict result result_oid return returned_cardinality returned_length returned_octet_length returned_sqlstate returning returns reverse revoke right role rollback rollup routine routine_catalog routine_name routine_schema routines row row_count row_number rows rowtype rule savepoint scale schema schema_name schemas scope scope_catalog scope_name scope_schema scroll search second section security select selective self sensitive sequence sequences serializable server server_name session session_user set setof sets share show similar simple size skip slice smallint snapshot some source space specific specific_name specifictype sql sqlcode sqlerror sqlexception sqlstate sqlwarning sqrt stable stacked standalone start state statement static statistics stddev_pop stddev_samp stdin stdout storage strict strip structure style subclass_origin submultiset subscription substring substring_regex succeeds sum symmetric sysid system system_time system_user table table_name tables tablesample tablespace temp template temporary text then ties time timestamp timezone_hour timezone_minute to token top_level_count trailing transaction transaction_active transactions_committed transactions_rolled_back transform transforms translate translate_regex translation treat trigger trigger_catalog trigger_name trigger_schema trim trim_array true truncate trusted type types uescape unbounded uncommitted under unencrypted union unique unknown unlink unlisten unlogged unnamed unnest until untyped update upper uri usage use_column use_variable user user_defined_type_catalog user_defined_type_code user_defined_type_name user_defined_type_schema using vacuum valid validate validator value value_of values var_pop var_samp varbinary varchar variable_conflict variadic varying verbose version versioning view views volatile warning when whenever where while whitespace width_bucket window with within without work wrapper write xml xmlagg xmlattributes xmlbinary xmlcast xmlcomment xmlconcat xmldeclaration xmldocument xmlelement xmlexists xmlforest xmliterate xmlnamespaces xmlparse xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltext xmlvalidate year yes zone"),
        // https://www.postgresql.org/docs/11/datatype.html
        builtin: set("bigint int8 bigserial serial8 bit varying varbit boolean bool box bytea character char varchar cidr circle date double precision float8 inet integer int int4 interval json jsonb line lseg macaddr macaddr8 money numeric decimal path pg_lsn point polygon real float4 smallint int2 smallserial serial2 serial serial4 text time without zone with timetz timestamp timestamptz tsquery tsvector txid_snapshot uuid xml"),
        atoms: set("false true null unknown"),
        operatorChars: /^[*\/+\-%<>!=&|^\/#@?~]/,
        backslashStringEscapes: false,
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber nCharCast charsetCast escapeConstant")
      });
    
      // Google's SQL-like query language, GQL
      CodeMirror.defineMIME("text/x-gql", {
        name: "sqlquery",
        keywords: set("ancestor and asc by contains desc descendant distinct from group has in is limit offset on order select superset where"),
        atoms: set("false true"),
        builtin: set("blob datetime first key __key__ string integer double boolean null"),
        operatorChars: /^[*+\-%<>!=]/
      });
    
      // Greenplum
      CodeMirror.defineMIME("text/x-gpsql", {
        name: "sqlquery",
        client: set("source"),
        //https://github.com/greenplum-db/gpdb/blob/master/src/include/parser/kwlist.h
        keywords: set("abort absolute access action active add admin after aggregate all also alter always analyse analyze and any array as asc assertion assignment asymmetric at authorization backward before begin between bigint binary bit boolean both by cache called cascade cascaded case cast chain char character characteristics check checkpoint class close cluster coalesce codegen collate column comment commit committed concurrency concurrently configuration connection constraint constraints contains content continue conversion copy cost cpu_rate_limit create createdb createexttable createrole createuser cross csv cube current current_catalog current_date current_role current_schema current_time current_timestamp current_user cursor cycle data database day deallocate dec decimal declare decode default defaults deferrable deferred definer delete delimiter delimiters deny desc dictionary disable discard distinct distributed do document domain double drop dxl each else enable encoding encrypted end enum errors escape every except exchange exclude excluding exclusive execute exists explain extension external extract false family fetch fields filespace fill filter first float following for force foreign format forward freeze from full function global grant granted greatest group group_id grouping handler hash having header hold host hour identity if ignore ilike immediate immutable implicit in including inclusive increment index indexes inherit inherits initially inline inner inout input insensitive insert instead int integer intersect interval into invoker is isnull isolation join key language large last leading least left level like limit list listen load local localtime localtimestamp location lock log login mapping master match maxvalue median merge minute minvalue missing mode modifies modify month move name names national natural nchar new newline next no nocreatedb nocreateexttable nocreaterole nocreateuser noinherit nologin none noovercommit nosuperuser not nothing notify notnull nowait null nullif nulls numeric object of off offset oids old on only operator option options or order ordered others out outer over overcommit overlaps overlay owned owner parser partial partition partitions passing password percent percentile_cont percentile_disc placing plans position preceding precision prepare prepared preserve primary prior privileges procedural procedure protocol queue quote randomly range read readable reads real reassign recheck recursive ref references reindex reject relative release rename repeatable replace replica reset resource restart restrict returning returns revoke right role rollback rollup rootpartition row rows rule savepoint scatter schema scroll search second security segment select sequence serializable session session_user set setof sets share show similar simple smallint some split sql stable standalone start statement statistics stdin stdout storage strict strip subpartition subpartitions substring superuser symmetric sysid system table tablespace temp template temporary text then threshold ties time timestamp to trailing transaction treat trigger trim true truncate trusted type unbounded uncommitted unencrypted union unique unknown unlisten until update user using vacuum valid validation validator value values varchar variadic varying verbose version view volatile web when where whitespace window with within without work writable write xml xmlattributes xmlconcat xmlelement xmlexists xmlforest xmlparse xmlpi xmlroot xmlserialize year yes zone"),
        builtin: set("bigint int8 bigserial serial8 bit varying varbit boolean bool box bytea character char varchar cidr circle date double precision float float8 inet integer int int4 interval json jsonb line lseg macaddr macaddr8 money numeric decimal path pg_lsn point polygon real float4 smallint int2 smallserial serial2 serial serial4 text time without zone with timetz timestamp timestamptz tsquery tsvector txid_snapshot uuid xml"),
        atoms: set("false true null unknown"),
        operatorChars: /^[*+\-%<>!=&|^\/#@?~]/,
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber nCharCast charsetCast")
      });
    
      // Spark SQL
      CodeMirror.defineMIME("text/x-sparksql", {
        name: "sqlquery",
        keywords: set("add after all alter analyze and anti archive array as asc at between bucket buckets by cache cascade case cast change clear cluster clustered codegen collection column columns comment commit compact compactions compute concatenate cost create cross cube current current_date current_timestamp database databases data dbproperties defined delete delimited deny desc describe dfs directories distinct distribute drop else end escaped except exchange exists explain export extended external false fields fileformat first following for format formatted from full function functions global grant group grouping having if ignore import in index indexes inner inpath inputformat insert intersect interval into is items join keys last lateral lazy left like limit lines list load local location lock locks logical macro map minus msck natural no not null nulls of on optimize option options or order out outer outputformat over overwrite partition partitioned partitions percent preceding principals purge range recordreader recordwriter recover reduce refresh regexp rename repair replace reset restrict revoke right rlike role roles rollback rollup row rows schema schemas select semi separated serde serdeproperties set sets show skewed sort sorted start statistics stored stratify struct table tables tablesample tblproperties temp temporary terminated then to touch transaction transactions transform true truncate unarchive unbounded uncache union unlock unset use using values view when where window with"),
        builtin: set("tinyint smallint int bigint boolean float double string binary timestamp decimal array map struct uniontype delimited serde sequencefile textfile rcfile inputformat outputformat"),
        atoms: set("false true null"),
        operatorChars: /^[*\/+\-%<>!=~&|^]/,
        dateSQL: set("date time timestamp"),
        support: set("ODBCdotTable doubleQuote zerolessFloat")
      });
    
      // Esper
      CodeMirror.defineMIME("text/x-esper", {
        name: "sqlquery",
        client: set("source"),
        // http://www.espertech.com/esper/release-5.5.0/esper-reference/html/appendix_keywords.html
        keywords: set("alter and as asc between by count create delete desc distinct drop from group having in insert into is join like not on or order select set table union update values where limit after all and as at asc avedev avg between by case cast coalesce count create current_timestamp day days delete define desc distinct else end escape events every exists false first from full group having hour hours in inner insert instanceof into irstream is istream join last lastweekday left limit like max match_recognize matches median measures metadatasql min minute minutes msec millisecond milliseconds not null offset on or order outer output partition pattern prev prior regexp retain-union retain-intersection right rstream sec second seconds select set some snapshot sql stddev sum then true unidirectional until update variable weekday when where window"),
        builtin: {},
        atoms: set("false true null"),
        operatorChars: /^[*+\-%<>!=&|^\/#@?~]/,
        dateSQL: set("time"),
        support: set("decimallessFloat zerolessFloat binaryNumber hexNumber")
      });
      
      CodeMirror.defineMIME("text/x-sqlquery", {name: "sqlquery"});
}



//创建编辑器
function createSqlEditor(selfObj,id){
    var element=id;
    if (typeof id === "string") {
       element = document.getElementById(id);
    }
    var sqlEditor = CodeMirror.fromTextArea(element, {
          autoRefresh: true,
          styleActiveLine: true,
          indentWithTabs: false,
          smartIndent: true,
          lineNumbers: true,
          matchBrackets: true,
          cursorHeight: 1,
          lineWrapping: true,
          readOnly: false,
          theme: 'dracula',
          autofocus: true,
          mode: "text/x-pgsql",//看sqlquery.js，没有的数据库照着现有的添加，很简单
          extraKeys: { // 触发按键
            "Ctrl-Q": "toggleComment",//注释
            "F11": function (cm) {//全屏
              cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            },
          },
          //如下是需要关注的参数
          hintOptions: {
              completeSingle: false,  //关闭补全
              closeOnUnfocus: true,//失去焦点自动关闭，true是，false否
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
     selfObj.sqlEditor=sqlEditor;
     selfObj.hintOptions=sqlEditor.getOption("hintOptions");
     selfObj.hintOptions.schemaTypes=selfObj.schemaTypes;
     return sqlEditor;
}

/** 
 * hint触发事件
  var selfObj={
       existTables:{}, //已查询的表
       existTableCols:{}, //已查询的表字段
       databaseId: null, //当前数据库id
       schemaTypes: null, //当前数据库的模式集合
       mainSchema: null, //当前数据库的主模式
       sqlEditor: null, //sql编辑器
       hintOptions: null, //提示框hint对象
  };
*/
export function keypressSqlEditor(selfObj,getColsOfSchema,getTablesOfSchema){
    selfObj.hintOptions=selfObj.sqlEditor.getOption("hintOptions");
    console.log(111)
    selfObj.sqlEditor.on('keypress', (editor, e) => {
           selfObj.hintOptions.tables={};
           selfObj.hintOptions.tempSqlTables = {};
           selfObj.hintOptions.sqlTables = {};
           var mybatis=editor.options.sqlMode;
           var regx=new RegExp("[ ;,!'`@#%&>\\+\\-\\$\\^\\*\\(\\)\\[\\]\\\"]+","g");
           const pkey=e.key;
           const flag=pkey!=="." && regx.test(pkey);//点需要排除
           if(flag){
              return;
           }
           if(pkey==="<" || pkey==="="){//只有mybatis需要
               mybatis?editor.showHint():null;
               return;
           }
           const cur = editor.getCursor();
           const token = editor.getTokenAt(cur);
           var tagflag = token.state.tagName && /^\".*\"$/.test(token.string);
           const prevtoken = editor.getTokenAt({line: cur.line, ch: token.start});
           const inputchar = tagflag?"_blank_":(token.string + pkey);
           const prevchar = tagflag?null:prevtoken.string;
           if(selfObj.timeoutid>0){
              window.clearTimeout(selfObj.timeoutid);
           }
           if(inputchar && inputchar.startsWith("<")){//只有mybatis需要
               mybatis?editor.showHint():null;
               return;
           }
           selfObj.timeoutid=window.setTimeout(function(){
                var queryDataOfTables=function(inputchar2,currSelectTables){
                     var starr=inputchar2.split(".");
                     var queryTable = {
                         databaseId: selfObj.databaseId,
                         schemaType: starr[0].toLowerCase()
                     };
                     var hkey=selfObj.databaseId+"-"+starr[0].toLowerCase();
                     if(typeof getTablesOfSchema !== 'undefined' && selfObj.existTables.hasOwnProperty(hkey) && !selfObj.existTables[hkey]){
                         getTablesOfSchema(selfObj,queryTable,function(data){
                          selfObj.existTables[hkey]=true;
                          for (let key in data) {
                             selfObj.existTables[selfObj.databaseId][key] = data[key];
                          }
                          selfObj.hintOptions.allTables = sqlqueryUtils.getLimitObject(data,inputchar2);
                          sqlqueryUtils.setTableColumns(editor,currSelectTables,selfObj.mainSchema);//设置别名字段
                          editor.showHint();//触发
                       });
                     }else{
                          selfObj.hintOptions.allTables = sqlqueryUtils.getLimitObject(selfObj.existTables[selfObj.databaseId],inputchar2,currSelectTables);
                          sqlqueryUtils.setTableColumns(editor,currSelectTables,selfObj.mainSchema);//设置别名字段
                          editor.showHint();//触发
                     }
                };
                var queryDataOfColumns=function(inputchar2,currSelectTables){
                        var sqlTables = {};
                        var waitLoadTables = [];//需要查询
                        for (var ti=0;ti<currSelectTables.length;ti++) {//只加载一次
                            var tblcode = currSelectTables[ti];
                            if (selfObj.existTableCols[tblcode] && selfObj.existTableCols[tblcode].length > 0) {
                                sqlTables[tblcode] = selfObj.existTableCols[tblcode];
                            }
                            else{
                                waitLoadTables.push(tblcode);
                            }
                        }
                        selfObj.hintOptions.sqlTables = sqlTables;
                        if (typeof getColsOfSchema !== 'undefined' && waitLoadTables.length > 0) {
                          var queryTable = {
                            databaseId: selfObj.databaseId,
                            tableNames: waitLoadTables
                          };
                          getColsOfSchema(selfObj,queryTable,function(data){
                              for (let key in data) {
                                  selfObj.existTableCols[key] = data[key];
                                  selfObj.hintOptions.sqlTables[key] = data[key];
                              }
                              queryDataOfTables(inputchar2,currSelectTables);
                          });
                        }else{
                            queryDataOfTables(inputchar2,currSelectTables);
                        }
                }

                if(inputchar.startsWith(".")){//有"."的可能是库或表
                  if(prevchar && prevchar.trim().length>0){ //"."前面是非空字符
                    var flag=false;
                    for(var skey in selfObj.schemaTypes){
                      if(skey.toLowerCase()===prevchar.toLowerCase()){
                        flag=true;
                        break;
                      }
                    }
                    if(!flag){
                      //是表，解析字段来源表
                      var currSelectTables=sqlqueryUtils.getSelectTables(editor,selfObj.existTables[selfObj.databaseId],selfObj.mainSchema);
                      if (currSelectTables && currSelectTables.length > 0) {
                          queryDataOfColumns(inputchar,currSelectTables);
                      }
                    } else {
                      //是库
                      var inputchar2=prevchar + (inputchar.length==1?"":inputchar);
                      queryDataOfTables(inputchar2,currSelectTables);
                    }
                  }else{//"."前面是空字符的
                     //无需触发
                  }
                }else if(pkey.trim().length>0){//无"."的是普通关键字或表
                   var inputchar2=selfObj.mainSchema?(selfObj.mainSchema+"."+inputchar):inputchar;//默认去查主库
                   var currSelectTables=sqlqueryUtils.getSelectTables(editor,selfObj.existTables[selfObj.databaseId],selfObj.mainSchema);
                   if (currSelectTables && currSelectTables.length > 0) {
                        queryDataOfColumns(inputchar,currSelectTables);
                   }
                   else {
                        queryDataOfTables(inputchar2);
                   }
              }
              selfObj.timeoutid=0;
           },300);
      });
}

//sqlquery模式定义
const sqlqueryOpts = {
    tables: null,
    allTables: null,
    sqlTables: null,
    tempSqlTables: null,
    schemaTypes: null,
    showPath: true,
    showType: true,
    titleMaxLength: 20,
    likeMatch: true,
    schemaOpen: false,
    schemaQuery: 3,
    limitTableNum: 50,
    limitNum: 2000,
    defaultTable: null,
    keywords: null,
    identifierQuote: null,
    CONS : {
      QUERY_DIV: ";",
      ALIAS_KEYWORD: "AS"
    },
    customCamelCases: false,
    autoCamelCases: false,
    defaultMain: "defaultMain",
    defaultMainTitle: "默认表别名",
    alisaRuleStr: "[a-z]+[0-9]*",
    codeRuleStr: "((\"[\u4E00-\u9FA50-9a-z _]+\")|(\\[[\u4E00-\u9FA50-9a-z _]+\\])|(`[\u4E00-\u9FA50-9a-z _]+`)|([a-z]+[0-9]*(_[a-z]+[0-9]*)*))",
    codeAlisaRuleStr: "((\"[\u4E00-\u9FA50-9a-z _]+\")|(\\[[\u4E00-\u9FA50-9a-z _]+\\])|(`[\u4E00-\u9FA50-9a-z _]+`)|([a-z]+[0-9]*(_[a-z]+[0-9]*)*))",
    tableRuleStr: "\"%s\"|\\[%s\\]|`%s`|\\b%s\\b",
    schemaTableRuleStr: "\"\\w+\".\"%s\"|\\[\\w+\\].\\[%s\\]|`\\w+`.`%s`|\\b\\w+.%s\\b",
    bracketRuleStr: "^(\"|`|\\[)",
    bracketRuleClear: new RegExp("[\"`\\[\\]]+","g"),
    alisaTempKey: "ALISAALISAALISA",
    regxSemicolon : new RegExp("(^;)|(;$)","g"),
    regxComment : new RegExp("^ *(--|//|#).*","g"),
    regxComment2 : new RegExp("(--|//|#).*$","g"),
    
    schemaType: null,
    tmpSearch: null,
    currSelectQueryStr: null,
    currInputAlias: null,
  
}

var CodeMirror;

export function sqlqueryHintHandler(CodeMirrorx) {
    CodeMirror=CodeMirrorx;
    
    function isArray(val) { return Object.prototype.toString.call(val) == "[object Array]" }
    
    function getKeywords(editor) {
        var mode = editor.options.sqlMode || editor.options.mode || editor.doc.modeOption;
        if (mode === "sqlquery") mode = "text/x-sql";
        return CodeMirror.resolveMode(mode).keywords;
    }
    
    function getIdentifierQuote(editor) {
      var mode = editor.options.sqlMode || editor.options.mode || editor.doc.modeOption;
      if (mode === "sqlquery") mode = "text/x-sql";
      return CodeMirror.resolveMode(mode).identifierQuote || "`";
    }
  
    function getText(item) {
      return typeof item == "string" ? item : item.text;
    }
  
    function wrapTable(name, value) {
      if (isArray(value)) value = {columns: value}
      if (!value.text) value.text = name
      return value
    }
  
    function parseTables(input) {
      var result = {}
      if (isArray(input)) {
        for (var i = input.length - 1; i >= 0; i--) {
          var item = input[i]
          result[getText(item).toUpperCase()] = wrapTable(getText(item), item)
        }
      } else if (input) {
        for (var name in input)
          result[name.toUpperCase()] = wrapTable(name, input[name])
      }
      return result
    }
  
    function getTable(name) {
      return sqlqueryOpts.tables[name.toUpperCase()]
    }
  
    function shallowClone(object) {
      var result = {};
      for (var key in object) if (object.hasOwnProperty(key))
        result[key] = object[key];
      return result;
    }
  
    function match(string, word) {
      var gval=getText(word);
      if(!gval){
        return false;
      }
      var upperMatch,word2=gval.toUpperCase();
      if(!sqlqueryOpts.likeMatch && !string.startsWith(".") && sqlqueryOpts.schemaType && word2.startsWith(sqlqueryOpts.schemaType.toUpperCase()+".")
        && word2.indexOf(string.toUpperCase())>-1){
        return true;
      }
      else if(string.startsWith(".") && sqlqueryOpts.tmpSearch.length>0){
          string=sqlqueryOpts.tmpSearch;
      }else{
          upperMatch=string.length>1 && string.indexOf(".")>-1 && !string.startsWith(".");
      }
      if(!sqlqueryOpts.likeMatch || upperMatch){
        var sub = gval.substr(0, string.length);
        return string.toUpperCase() === sub.toUpperCase();
      }else{
        return sqlqueryUtils.checkLikeOrder(string,gval);
      }
    }
    
    function addMatches(result, search, wordlist, formatter) {
      if (isArray(wordlist)) {
        for (var i = 0; i < wordlist.length; i++)
          if (match(search, wordlist[i]) && result.length<(sqlqueryOpts.limitNum+15)) result.push(formatter(wordlist[i]))
      } else {
        for (var word in wordlist) if (wordlist.hasOwnProperty(word)) {
          var val = wordlist[word]
          if (!val || val === true)
            val = word
          else
            val = val.displayText ? {text: val.text, displayText: val.displayText} : val.text
          if (match(search, val) && result.length<(sqlqueryOpts.limitNum+15)) result.push(formatter(val))
        }
      }
    }
  

  
    function insertIdentifierQuotes(name) {
      var nameParts = getText(name).split(".");
      for (var i = 0; i < nameParts.length; i++)
        nameParts[i] = sqlqueryOpts.identifierQuote +
          // duplicate identifierQuotes
          nameParts[i].replace(new RegExp(sqlqueryOpts.identifierQuote,"g"), sqlqueryOpts.identifierQuote+sqlqueryOpts.identifierQuote) +
          sqlqueryOpts.identifierQuote;
      var escaped = nameParts.join(".");
      if (typeof name == "string") return escaped;
      name = shallowClone(name);
      name.text = escaped;
      return name;
    }
  
    function nameCompletion(cur, token, result, editor) {
      // Try to complete table, column names and return start position of completion
      var useIdentifierQuotes = false;
      var nameParts = [];
      var start = token.start;
      var cont = true;
      while (cont) {
        cont = (token.string.charAt(0) == ".");
        useIdentifierQuotes = useIdentifierQuotes || (token.string.charAt(0) == sqlqueryOpts.identifierQuote);
  
        start = token.start;
        nameParts.unshift(sqlqueryUtils.cleanName(token.string));
  
        token = editor.getTokenAt(CodeMirror.Pos(cur.line, token.start));
        if (token.string == ".") {
          cont = true;
          token = editor.getTokenAt(CodeMirror.Pos(cur.line, token.start));
        }
      }
  
      // Try to complete table names
      var string = nameParts.join(".");
      addMatches(result, string, sqlqueryOpts.tables, function(w) {
        return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
      });
  
      // Try to complete columns from defaultTable
      addMatches(result, string, sqlqueryOpts.defaultTable, function(w) {
        return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
      });
  
      // Try to complete columns
      string = nameParts.pop();
      var table = nameParts.join(".");
  
      var alias = false;
      var aliasTable = table;
      // Check if table is available. If not, find table by Alias
      if (!getTable(table)) {
        var oldTable = table;
        table = findTableByAlias(table, editor);
        if (table !== oldTable) alias = true;
      }
  
      var columns = getTable(table);
      if (columns && columns.columns)
        columns = columns.columns;
  
      if (columns) {
        addMatches(result, string, columns, function(w) {
          var tableInsert = table;
          if (alias == true) tableInsert = aliasTable;
          if (typeof w == "string") {
            w = tableInsert + "." + w;
          } else {
            w = shallowClone(w);
            w.text = tableInsert + "." + w.text;
          }
          return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
        });
      }
  
      return start;
    }
  
    function eachWord(lineText, f) {
      var words = lineText.split(/\s+/)
      for (var i = 0; i < words.length; i++)
        if (words[i]) f(words[i].replace(/[`,;]/g, ''))
    }
  
    function findTableByAlias(alias, editor) {
      var doc = editor.doc;
      var fullQuery = doc.getValue();
      var aliasUpperCase = alias.toUpperCase();
      var previousWord = "";
      var table = "";
      var separator = [];
      var validRange = {
        start: CodeMirror.Pos(0, 0),
        end: CodeMirror.Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).length)
      };
  
      //add separator
      var indexOfSeparator = fullQuery.indexOf(sqlqueryOpts.CONS.QUERY_DIV);
      while(indexOfSeparator != -1) {
        separator.push(doc.posFromIndex(indexOfSeparator));
        indexOfSeparator = fullQuery.indexOf(sqlqueryOpts.CONS.QUERY_DIV, indexOfSeparator+1);
      }
      separator.unshift(CodeMirror.Pos(0, 0));
      separator.push(CodeMirror.Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).text.length));
  
      //find valid range
      var prevItem = null;
      var current = editor.getCursor()
      for (var i = 0; i < separator.length; i++) {
        if ((prevItem == null || CodeMirror.cmpPos(current, prevItem) > 0) && CodeMirror.cmpPos(current, separator[i]) <= 0) {
          validRange = {start: prevItem, end: separator[i]};
          break;
        }
        prevItem = separator[i];
      }
  
      if (validRange.start) {
        var query = doc.getRange(validRange.start, validRange.end, false);
  
        for (var i = 0; i < query.length; i++) {
          var lineText = query[i];
          eachWord(lineText, function(word) {
            var wordUpperCase = word.toUpperCase();
            if (wordUpperCase === aliasUpperCase && getTable(previousWord))
              table = previousWord;
            if (wordUpperCase !== sqlqueryOpts.CONS.ALIAS_KEYWORD)
              previousWord = word;
          });
          if (table) break;
        }
      }
      return table;
    }

    CodeMirror.registerHelper("hint", "sqlquery", function(editor, options) {
      var cur = editor.getCursor();
      var result = [];
      var token = editor.getTokenAt(cur), start, end, search;
      if (token.end > cur.ch) {
        token.end = cur.ch;
        token.string = token.string.slice(0, cur.ch - token.start);
      }
      if (token.string.match(/^[.`"'\w@][\w$#]*$/g)) {
          search = token.string;
          start = token.start;
          end = token.end;
      } else {
          start = end = cur.ch;
          search = "";
      }
      var isInnerAttr = options && options.isInnerAttr;
      if(isInnerAttr && /['"]/.test(token.string.charAt(0))){
          start=token.start+1;
          search=token.string.substr(1,token.string.length-1);
          var m=search.match(new RegExp("[a-z0-9_]+$","i"));
          if(m){
            start=token.start+token.string.length-m[0].length;
            search=m[0];
          }
      }
      
      sqlqueryOpts.allTables = options.allTables;
      sqlqueryOpts.schemaTypes = options.schemaTypes;
      
      try{
        var tablesList = [];
        if(sqlqueryOpts.allTables){
          for(var key in sqlqueryOpts.allTables){
             if(tablesList.length<sqlqueryOpts.limitNum){
                tablesList.push(key);
             }
           }
        }
        options.tables = options.tables || {};
        sqlqueryOpts.tables = options.tables;
        if (tablesList) {
          for (var ki = 0; ki < tablesList.length; ki++) {
            var key = tablesList[ki];
            if (!sqlqueryUtils.objectContains(options.tables, key)) {
              options.tables[key] = [];
            }
          }
        }
      }catch(e){
        console.log(e);
      }
      
      sqlqueryOpts.keywords=getKeywords(editor);
      sqlqueryOpts.tables = parseTables(options && options.tables);
      var disableKeywords = options && options.disableKeywords;
      sqlqueryOpts.identifierQuote = getIdentifierQuote(editor);
      
      if(!sqlqueryOpts.defaultTable){
        var defaultTableName = options && options.defaultTable;
        if(defaultTableName){
          sqlqueryOpts.defaultTable = getTable(defaultTableName);
        }
        if (defaultTableName && !sqlqueryOpts.defaultTable)
          sqlqueryOpts.defaultTable = findTableByAlias(defaultTableName, editor);
  
        sqlqueryOpts.defaultTable = sqlqueryOpts.defaultTable || [];
        if (sqlqueryOpts.defaultTable.columns)
            sqlqueryOpts.defaultTable = sqlqueryOpts.defaultTable.columns;
      }
      
      var disableFlag=false;
      try{
          var prevChar = editor.getRange({ line:  cur.line, ch: token.start - 1}, { line:  cur.line, ch: token.start});
          if(prevChar==="."){
              disableFlag=true;
          }
      }catch(b){
      }
      //去除表前缀
      var schemaTypeLength=0;
      if(search.charAt(0) == "." && search.length>0){
          var tokenx = editor.getTokenAt({line: cur.line, ch: cur.ch - search.length});
          var prevchar = tokenx && tokenx.string;
          if(prevchar && prevchar===sqlqueryOpts.defaultMain){
            sqlqueryOpts.tmpSearch=search.slice(1);
          }
          else if(prevchar && sqlqueryUtils.objectContains(sqlqueryOpts.schemaTypes,prevchar)){
            sqlqueryOpts.tmpSearch=prevchar+search;
            schemaTypeLength=prevchar.length;
          }else{
            sqlqueryOpts.tmpSearch=search.slice(1);
          }
      }else if(search.charAt(0) !== sqlqueryOpts.identifierQuote && search === token.string || isInnerAttr){
         sqlqueryOpts.tmpSearch=search;
      }
      else{
        sqlqueryOpts.tmpSearch="";
      }
      if (sqlqueryOpts.tmpSearch.indexOf(".")===-1 && (search.charAt(0) == "." || search.charAt(0) == sqlqueryOpts.identifierQuote)) {
        start = nameCompletion(cur, token, result, editor);
      } else {
        var objectOrClass = function(w, className) {
          if (typeof w === "object") {
            w.className = className;
          } else {
            w = { text: w, className: className };
          }
          return w;
        };
        
        addMatches(result, search, sqlqueryOpts.defaultTable, function(w) {
            return objectOrClass(w, "CodeMirror-hint-table CodeMirror-hint-default-table");
        });
        
        isInnerAttr?null:addMatches(
            result,
            search,
            sqlqueryOpts.tables, function(w) {
              return objectOrClass(w, "CodeMirror-hint-table");
            }
        );
        
        if(!disableFlag){
         if (!disableKeywords)
           isInnerAttr?null:addMatches(result, search, sqlqueryOpts.keywords, function(w) {
              return objectOrClass(w.toUpperCase(), "CodeMirror-hint-keyword");
          });
        }
        
        if(result && result.length>0 ){
          if(!sqlqueryOpts.schemaOpen){
            for(var i=0,ln=result.length;i<ln; i++){
               result[i].displayText = result[i].text;
               if(result[i].text===sqlqueryOpts.defaultMain){
                result[i].displayInfo=sqlqueryOpts.defaultMainTitle;
               }else{
                result[i].displayInfo = result[i].displayInfo || sqlqueryOpts.allTables[result[i].text];
               }
               result[i].render = sqlqueryUtils.hintRender;
               var txts=result[i].text.split(".");
               if(sqlqueryOpts.schemaType && txts.length>1 && txts[0].toLowerCase()!==sqlqueryOpts.schemaType.toLowerCase()){
               }else{
                   result[i].text = txts[txts.length-1];
               }
            }
          }else{
             for(var i=0,ln=result.length;i<ln; i++){
               result[i].displayText = result[i].text;
               if(result[i].text===sqlqueryOpts.defaultMain){
                 result[i].displayInfo=sqlqueryOpts.defaultMainTitle;
               }else{
                 result[i].displayInfo = result[i].displayInfo || sqlqueryOpts.allTables[result[i].text];
               }
               result[i].render = sqlqueryUtils.hintRender;
             }
          }
        }
      }
      return {list: result, from: CodeMirror.Pos(cur.line, start-schemaTypeLength), to: CodeMirror.Pos(cur.line, end)};
    });
}

//方便使用方法，也避免冲突
const sqlqueryUtils = {
  //获取有限制集合
  getLimitObject:function(source,filter,currSelectTables){
    var limit = sqlqueryOpts.limitTableNum;
    var idx=0;
    var data={};
    if(!source){
        return data;
    }
    filter = filter&&filter.length>0?filter.toLowerCase():null;
    var schemaType=sqlqueryOpts.schemaType?(sqlqueryOpts.schemaType.toLowerCase()+"."):null;
    for(var key in source){
      if(idx>=limit){
         break;
      }
      var key2=key.toLowerCase();
      var flag=schemaType?key2.startsWith(schemaType):true;
      if(!flag && filter && key.indexOf(".")>-1){
         flag=filter.indexOf(".")>-1;
      }
      if(!filter || this.arrayContains(currSelectTables,key2) || (!sqlqueryOpts.likeMatch && key2.indexOf(filter)>=0) || (!flag && key2.startsWith(filter))
              || (sqlqueryOpts.likeMatch && flag && this.checkLikeOrder(filter,key))){
          data[key] =source[key];
          idx++;
      }
    }
    return data;
  },
  /** 获取当前使用的表 */
  getSelectTables: function (editor, alltablecodes, schemaType) {
    var options=editor.getOption("hintOptions");
    sqlqueryOpts.tmpSearch = "";
    sqlqueryOpts.tempSqlTables = {};
    sqlqueryOpts.sqlTables = {};
    sqlqueryOpts.schemaType = schemaType || null;
    var currSelectTables = [];
    
    sqlqueryOpts.showPath = typeof options.showPath !== 'undefined' ? options.showPath : sqlqueryOpts.showPath;
    sqlqueryOpts.showType = typeof options.showType !== 'undefined' ? options.showType : sqlqueryOpts.showType;
    sqlqueryOpts.likeMatch = typeof options.likeMatch !== 'undefined' ? options.likeMatch : sqlqueryOpts.likeMatch;
    sqlqueryOpts.limitTableNum = typeof options.limitTableNum !== 'undefined' ? options.limitTableNum : sqlqueryOpts.limitTableNum;
    sqlqueryOpts.limitNum = typeof options.limitNum !== 'undefined' ? options.limitNum : sqlqueryOpts.limitNum;
    sqlqueryOpts.schemaOpen = typeof options.schemaOpen !== 'undefined' ? options.schemaOpen : sqlqueryOpts.schemaOpen;
    sqlqueryOpts.schemaQuery = typeof options.schemaQuery !== 'undefined' ? options.schemaQuery : sqlqueryOpts.schemaQuery;
    sqlqueryOpts.customCamelCases = typeof options.customCamelCases !== 'undefined' ? options.customCamelCases : sqlqueryOpts.customCamelCases;
    sqlqueryOpts.autoCamelCases = typeof options.autoCamelCases !== 'undefined' ? options.autoCamelCases : sqlqueryOpts.autoCamelCases;
    sqlqueryOpts.defaultMain = typeof options.defaultMain !== 'undefined' ? options.defaultMain : sqlqueryOpts.defaultMain;
    sqlqueryOpts.defaultMainTitle = typeof options.defaultMainTitle !== 'undefined' ? options.defaultMainTitle : sqlqueryOpts.defaultMainTitle;

    var cur = editor.getCursor();
    var token = editor.getTokenAt(cur);
    if (token.end > cur.ch) {
      token.end = cur.ch;
      token.string = token.string.slice(0, cur.ch - token.start);
    }
    try {
      var curSqlTag = sqlqueryOpts.CONS.QUERY_DIV;
      var openMybatis = editor.options.sqlMode;
      var allLineStr;
      if(openMybatis){
        var context = token.state.context;
        if(context){
          var f = context.isSqlTag;
          while(!f && context.prev){
             f = context.prev.isSqlTag;
             context = context.prev;
          }
          if(f){
            curSqlTag = context.tagName;
          }
        }
        allLineStr = editor.getValue(" ");
      }
      var inputAlias;
      var useIdentifierQuotes = false;
      var nameParts = [];
      var cont = true;
      var tokenx = token;
      while (cont) {
        cont = (tokenx.string.charAt(0) == ".");
        useIdentifierQuotes = useIdentifierQuotes || (tokenx.string.charAt(0) == sqlqueryOpts.identifierQuote);
        nameParts.unshift(this.cleanName(tokenx.string));

        tokenx = editor.getTokenAt(CodeMirror.Pos(cur.line, tokenx.start));
        if (tokenx.string == ".") {
          cont = true;
          tokenx = editor.getTokenAt(CodeMirror.Pos(cur.line, tokenx.start));
        }
      }
      inputAlias = nameParts[0];

      if (!inputAlias.match(new RegExp("^" + sqlqueryOpts.alisaRuleStr + "$", "i"))) {
        inputAlias = null;
      }

      var startLine = cur.line;
      var startLineStr = editor.getLine(startLine);
      if (inputAlias) {
        startLineStr = startLineStr.substr(0, cur.ch - 1 - (inputAlias.length)) + " " + sqlqueryOpts.alisaTempKey + " " + startLineStr.substr(cur.ch, startLineStr.length);
      }

      startLineStr = !openMybatis?this.clearContextComment(startLineStr):startLineStr;
      while (!openMybatis && !startLineStr.startsWith(curSqlTag) && startLine > 0
         || (openMybatis && editor.getLine(startLine).indexOf("<"+curSqlTag) ===-1 && startLine>0)) {
        startLine--;
        var startLineStr2 = !openMybatis?this.clearContextComment(editor.getLine(startLine)):editor.getLine(startLine);
        if (startLineStr2 && startLineStr2.length > 0) {
          if(openMybatis){
            startLineStr = editor.getLine(startLine) +" "+ startLineStr;
          }
          else if (startLineStr2.indexOf(curSqlTag) === -1) {
            startLineStr = startLineStr2.trim() + "\n" + startLineStr;
          } else {
            var tarrs = startLineStr2.split(curSqlTag);
            startLineStr = curSqlTag + tarrs[tarrs.length - 1] + "\n" + startLineStr;
            break;
          }
        }
      }
      var endLine = cur.line;
      while (endLine < editor.lineCount() - 1 && ( (!openMybatis && !startLineStr.endsWith(curSqlTag)) 
        || (openMybatis && editor.getLine(endLine).indexOf("</"+curSqlTag+">") === -1 ))) {
        endLine++;
        var endLineStr2 = !openMybatis?this.clearContextComment(editor.getLine(endLine)):editor.getLine(endLine);
        if (endLineStr2 && endLineStr2.length > 0) {
          if(openMybatis){
            startLineStr = startLineStr +" "+ editor.getLine(endLine);
          }
          else if (endLineStr2.indexOf(curSqlTag) === -1) {
            startLineStr = startLineStr + "\n" + endLineStr2.trim();
          } else {
            var tarrs = endLineStr2.split(curSqlTag);
            startLineStr = startLineStr + "\n" + tarrs[0] + curSqlTag;
            break;
          }
        }
      }
      
      startLineStr = !openMybatis?this.getRefTagContent(startLineStr):editor.getMode().getRefTagContext(
          sqlqueryUtils.clearContextValue(startLineStr), sqlqueryUtils.clearContextValue(allLineStr));
      if (startLineStr && startLineStr.length > 10) {
        for (var key in alltablecodes) {
          var tmp=key.split(".");
          
          var regxstr1="";
          if (tmp.length > 1) {
             regxstr1 = regxstr1 + sqlqueryOpts.schemaTableRuleStr.replace(/%s/g, tmp[1])
                 +"|"+sqlqueryOpts.tableRuleStr.replace(/%s/g, tmp[1])
          }else{
             regxstr1 = regxstr1 + sqlqueryOpts.tableRuleStr.replace(/%s/g, key);
          }
          regxstr1 = regxstr1.replace(/\./g, "\\.");
          var mresult = startLineStr.match(new RegExp(regxstr1, "ig"));
          if(!mresult){
             continue;  
          }
          var result=false;
          for (var i = 0, ln = mresult.length; i < ln; i++) {
              var newcode = mresult[i].replace(sqlqueryOpts.bracketRuleClear,"");
              startLineStr = startLineStr.replace(new RegExp(mresult[i],"g"), newcode);
              if(key.toLowerCase()===newcode.toLowerCase() || (tmp.length > 1 && newcode.indexOf(".")===-1
                   && tmp[1].toLowerCase()===newcode.toLowerCase())){
                result=true;
              }
          }
          if (result) {
            sqlqueryOpts.tempSqlTables[key] = [];
            currSelectTables.push(key);
          }
          if (currSelectTables.length > 50) {
            //正常不应该有这么多表。也不建议所有sql放一起
            break;
          }
        }
        sqlqueryOpts.currSelectQueryStr = startLineStr;
        sqlqueryOpts.currInputAlias = inputAlias;
      }
    } catch (e) {
      console.log(e);
    }
    return currSelectTables;
  },
  /** 设置当前使用的表字段 */
  setTableColumns: function (editor, currSelectTables, schemaType) {
    try {
      var options=editor.getOption("hintOptions");
      sqlqueryOpts.tmpSearch = "";
      sqlqueryOpts.schemaType = schemaType || null;
      sqlqueryOpts.tempSqlTables = {};
      sqlqueryOpts.sqlTables = options.sqlTables;
      if (!sqlqueryOpts.sqlTables || !currSelectTables || currSelectTables.length === 0) {
        return;
      }
      options.tables = {};
      sqlqueryOpts.tables = options.tables;
      
      var singleTableFlag = currSelectTables.length === 1;
      var subSelectFlag = new RegExp("FROM *\\(", "i").test(sqlqueryOpts.currSelectQueryStr);
      singleTableFlag = singleTableFlag && !subSelectFlag;
      
      var regxstr1;
      for (var i = 0, ln = currSelectTables.length; i < ln; i++) {
          regxstr1=(i==0?"":regxstr1+"|");
          if (currSelectTables[i].indexOf(".") > -1) {
             regxstr1 = regxstr1 + currSelectTables[i] + "|(?<!.)" + currSelectTables[i].split(".")[1];
          }else{
             regxstr1 = regxstr1 + "(?<!.)" + currSelectTables[i];
          }
      }
      
      regxstr1 = regxstr1.replace(/\./g, "\\.");
      var tableWithAliasRegs = new RegExp("\\b(" + regxstr1 + ")\\b +" + sqlqueryOpts.alisaRuleStr + "|\\b(" + regxstr1 + ")\\b", "ig");
      var tableWithAlias = sqlqueryOpts.currSelectQueryStr.match(tableWithAliasRegs);
      
      var handlerTableAlias = function (tableAliasMap, str) {
        var t = str.split(" ");//table t1
        var factkey = sqlqueryUtils.getArrayValue(currSelectTables, t[0]);
        if (factkey) {
          if (!tableAliasMap.hasOwnProperty(factkey)) {
            tableAliasMap[factkey] = [""];
          }
          var code;
          if(t.length===1){
             code = sqlqueryOpts.defaultMain;
          }else{
             code = !sqlqueryUtils.objectContains(sqlqueryOpts.keywords, t[1]) ? t[1] : "";
          }
          if (!sqlqueryUtils.arrayContains(tableAliasMap[factkey], code)) {
            tableAliasMap[factkey].push(code);
          }
        }
      };
      var tableAliasMap = {};
      var hasAlisaListMap = {};
      var alisaTables = [];
      if (tableWithAlias && tableWithAlias.length > 0) {
        if (singleTableFlag) {
          handlerTableAlias(tableAliasMap, tableWithAlias[0]);

          this.dynamicAlisaColumns(tableAliasMap, sqlqueryOpts.tables, sqlqueryOpts.sqlTables, hasAlisaListMap, alisaTables);
        } else {
          for (var ki = 0; ki < tableWithAlias.length; ki++) {
            handlerTableAlias(tableAliasMap , tableWithAlias[ki]);
          }
          this.dynamicAlisaColumns(tableAliasMap, sqlqueryOpts.tables, sqlqueryOpts.sqlTables, hasAlisaListMap, alisaTables);
        }
      }
      
      for (var key in sqlqueryOpts.sqlTables) {
         sqlqueryOpts.tempSqlTables[key] = sqlqueryOpts.sqlTables[key];
      }
      if (!singleTableFlag && sqlqueryOpts.currInputAlias) {
        try {
          this.analysisAlisaCompletion(sqlqueryOpts.tempSqlTables, sqlqueryOpts.tables, currSelectTables, sqlqueryOpts.currInputAlias, sqlqueryOpts.currSelectQueryStr, sqlqueryOpts.alisaTempKey);
        } catch (b1) {
          console.log(b1);
        }
      }
      if (alisaTables.length > 0) {
        var hintx = function (CodeMirror, self, data) {
          sqlqueryOpts.tmpSearch = "";
          CodeMirror.replaceRange(data.displayText, { line: self.from.line, ch: self.from.ch }, { line: self.to.line, ch: self.to.ch });
        }
        var dm=[],dm2=[];
        for (var i = 0, ln = alisaTables.length; i < ln; i++) {
          var t={},t2={};
          const alisaTablex=alisaTables[i];
          for(key in alisaTablex){
              t[key]=alisaTablex[key];
              t2[key]=alisaTablex[key];
          }
          t["hint"] = hintx;
          dm.push(t);
          dm2.push(t2);
        }
        sqlqueryOpts.tables[sqlqueryOpts.defaultMain] = dm;
        sqlqueryOpts.defaultTable = dm2;
      }
    } catch (b) {
      console.log(b);
    }
  },

  cleanName: function (name) {
    // Get rid name from identifierQuote and preceding dot(.)
    if (name.charAt(0) == ".") {
      name = name.substr(1);
    }
    // replace duplicated identifierQuotes with single identifierQuotes
    // and remove single identifierQuotes
    var nameParts = name.split(sqlqueryOpts.identifierQuote + sqlqueryOpts.identifierQuote);
    for (var i = 0; i < nameParts.length; i++)
      nameParts[i] = nameParts[i].replace(new RegExp(sqlqueryOpts.identifierQuote, "g"), "");
    return nameParts.join(sqlqueryOpts.identifierQuote);
  },

  checkLikeOrder: function (search, word) {
    search=search.toUpperCase();
    word=word.toUpperCase();
    var index1 = 0;
    var index2 = 0;
    while (index1 < search.length && index2 < word.length) {
      if (search[index1] === word[index2]) {
        index1++;
      }
      index2++;
    }
    return index1 === search.length;
  },

  arrayContains: function (arr, val) {
    if (!arr) {
      return false;
    }
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].toLowerCase() === val.toLowerCase()) {
        return true;
      }
    }
    return false;
  },
  getArrayValue: function (arr, val) {
    if (!arr) {
      return null;
    }
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].toLowerCase() === val.toLowerCase()) {
        return arr[i];
      } else if (sqlqueryOpts.schemaType && arr[i].toLowerCase() === (sqlqueryOpts.schemaType + "." + val).toLowerCase()) {
        return arr[i];
      }
    }
    return null;
  },
  objectContains: function (obj, key) {
    if (!obj) {
      return false;
    }
    for (var k in obj) {
      if (k.toLowerCase() === key.toLowerCase()) {
        return true;
      }
    }
    return false;
  },
  hintRender: function (element, self, data) {
    let div = document.createElement("div");
    div.setAttribute("class", "autocomplete-div");
    let divText = document.createElement("div");
    divText.setAttribute("class", "autocomplete-name");
    var type = sqlqueryOpts.showType && data.ctype?'<span class="hint-type"> '+data.ctype+'</span>':"";
    divText.innerHTML = sqlqueryUtils.markCharOrder(sqlqueryOpts.tmpSearch, data.displayText) + type;
    div.appendChild(divText);

    var showtitle;
    if (data.displayInfo && data.displayInfo !== data.displayText) {
      showtitle = data.displayInfo;
      if (showtitle.length > sqlqueryOpts.titleMaxLength) {
          showtitle=showtitle.substr(0, sqlqueryOpts.titleMaxLength);
      }
      if (sqlqueryOpts.showPath && data.displayTitle) {
        showtitle = showtitle + "（" + data.displayTitle + "）";
      }
    } else if (sqlqueryOpts.showPath && data.displayTitle) {
      showtitle = data.displayTitle;
    }
    if (showtitle) {
      let divInfo = document.createElement("div");
      divInfo.setAttribute("class", "autocomplete-hint");
      divInfo.innerText = showtitle;

      let divInfoHidden = document.createElement("div");
      divInfoHidden.setAttribute("class", "autocomplete-hidden");
      divInfoHidden.innerText = showtitle + " ";
      divText.appendChild(divInfoHidden);
      div.appendChild(divInfo);
      
      if (data.displayTitle) {
        var titledtl = sqlqueryOpts.allTables[data.displayTitle];
        if (titledtl && titledtl.length > 0 && titledtl !== data.displayTitle) {
          divInfo.setAttribute("title", data.displayTitle+ "  " + titledtl);
        }
      }
    }
    
    var moreDivText = document.getElementById("CodeMirror-hints-more-info");
    if(!moreDivText){
        moreDivText = document.createElement("div");
        moreDivText.setAttribute("class", "more-info");
        moreDivText.setAttribute("id", "CodeMirror-hints-more-info");
    }
    const cdetail=data.cdetail;
    const displayText=data.displayText;
    div.addEventListener("mouseenter", function() {
       var divhints = document.getElementsByClassName("CodeMirror-hints")[0];
       moreDivText.innerHTML="";
       if(!document.getElementById("CodeMirror-hints-more-info")){
           divhints.appendChild(moreDivText);
       }
       if(cdetail){
         var moreTitleDiv = document.createElement("div");
         moreTitleDiv.setAttribute("class", "more-info-title");
         moreTitleDiv.innerText = displayText;
         moreDivText.appendChild(moreTitleDiv);
         moreDivText.style.top = parseInt(divhints.offsetTop)+"px";
         moreDivText.style.left = parseInt(divhints.offsetLeft+divhints.offsetWidth)+"px";
         var cdetailDiv = document.createElement("div");
         cdetailDiv.setAttribute("class", "more-info-body");
         cdetailDiv.innerHTML = cdetail;
         moreDivText.appendChild(cdetailDiv);
         moreDivText.style.display="block";
       }else{
         moreDivText.style.display="none";
       }
    });
    div.addEventListener("mouseleave", function() {
       if(moreDivText){
          moreDivText.remove();
       }
    });
    element.appendChild(div);
  },

  displayHandler: function (text, displayInfo, displayTitle, ctype, cdetail) {
    return {
      text: text,
      displayText: text,
      displayInfo: displayInfo,
      displayTitle: displayTitle,
      ctype: ctype,
      cdetail: cdetail,
      render: this.hintRender
    };
  },

  markCharOrder: function (search, word) {
    if (!search) {
      return word;
    }
    var markHandler=function(word){
        var index1 = 0;
        var index2 = 0;
        var ids = [];
        while (index1 < search.length && index2 < word.length) {
            if (search[index1].toUpperCase() === word[index2].toUpperCase()) {
              ids.push(index2);
              index1++;
            }
            index2++;
        }
        if(index1!==search.length){
          return null;
        }
        for (var i = ids.length - 1; i >= 0; i--) {
            var char = '<span class="match-char">' + word.slice(ids[i], ids[i] + 1) + '</span>';
            word = word.slice(0, ids[i]) + char + word.slice(ids[i] + 1);
        }
        return word;
    };
  
    if(sqlqueryOpts.likeMatch && search.indexOf(".")==-1 && word.indexOf(".")>-1){
      var arrs=word.split(".");
      if(search.length<=arrs[1].length){
        var word2=markHandler(arrs[1]);
        if(word2){
             word= arrs[0] + "." + word2;
             return word;
        }
      }
    }
    word = markHandler(word);
    return word;
  },

  dynamicAlisaColumns: function (tableAliasMap, tables, sqlTables, hasAlisaListMap, alisaTables) {

    var columnsHandler = function (a1, a2, tables, alisa, key, ctype, cdetail) {
      if(!a1){
        return;
      }
      if (!tables[alisa]) {
          tables[alisa] = [];
      }
      for (var i = 0, ln = a1.length; i < ln; i++) {
        if (a2) {
           tables[alisa].push(sqlqueryUtils.displayHandler(a1[i], a2[i], key, ctype && ctype[i], cdetail && cdetail[i]));
        } else {
           tables[alisa].push(a1[i]);
        }
      }
    };
    var columnsHandler2 = function (a1, a2, alisaTables, key, ctype, cdetail,autoCamelCases) {
      if(!a1){
        return;
      }
      for (var i = 0, ln = a1.length; i < ln; i++) {
        if (a2) {
          alisaTables.push(sqlqueryUtils.displayHandler(autoCamelCases?sqlqueryUtils.convertToCamelCase(a1[i]):a1[i], a2[i], key, ctype && ctype[i], cdetail && cdetail[i]));
        } else {
          alisaTables.push(autoCamelCases?sqlqueryUtils.convertToCamelCase(a1[i]):a1[i]);
        }
      }
    };
    for (var key in tableAliasMap) {
      var t = sqlTables[key];
      if (t && t.length > 0) {
        var arrs = tableAliasMap[key];
        if (!arrs && arrs.length > 0) {
          continue;
        }
        var t0 = t[0];
        var t1 = t.length > 1 && t[1];
        var t2 = t.length > 2 && t[2];
        var t3 = t.length > 3 && t[3];
        var t4 = t.length > 4 && t[4];
        for (var i = 0, ln = arrs.length; i < ln; i++) {
          var alisa = arrs[i];
          if (i === 0) {
            if(alisa!=sqlqueryOpts.defaultMain){
                columnsHandler(t0, t1, tables, key, key, t2, t3);
            }
            columnsHandler2(t0, t1, alisaTables, key, t2, t3);
            if(sqlqueryOpts.customCamelCases){
                columnsHandler2(t4, t1, alisaTables, key, t2, t3);
            }else if(sqlqueryOpts.autoCamelCases){
                columnsHandler2(t0, t1, alisaTables, key, t2, t3,true);
            }
          }
          if (alisa !== "" && alisa!=sqlqueryOpts.defaultMain) {
            tables[alisa] = [];
            columnsHandler(t0, t1, tables, alisa, key, t2, t3);
          }
        }
      }
    }
  },

  analysisAlisaCompletion: function (tempSqlTables, tables, currTableCodes, inputAlias, text, currKey) {
    if (!text) {
      return;
    }
    text=text.replace(new RegExp("\\b(INSERT INTO|CREATE TABLE)\\b.*?\\)( |AS)*(?=\\bSELECT\\b)", "i")," ");
    inputAlias = inputAlias.toLowerCase();
    var groupdata = this.getNestingDepth(currTableCodes, text, currKey);
    if (!groupdata) {
      return;
    }
    var alisalist = [];
    var currdata = groupdata;

    var currAlisaHandler = function (data, alisalist) {
      for (var i = 0; i < data.length; i++) {
        var t = data[i];
        var alisa = t.alisa;
        if (alisa) {
          if (!sqlqueryUtils.arrayContains(alisalist, alisa)) {
            alisalist.push(alisa.toLowerCase());
          }
        }
        if (t.hasOwnProperty("currlevel") && t.currlevel === 0) {
          currlevel = t.currlevel;
        }
        if (t.children) {
          if (t.hasOwnProperty("currlevel") && t.currlevel === 1) {
            currdata = t.children;
          }
          currAlisaHandler(t.children, alisalist);
        }
      }
    };
    currAlisaHandler(groupdata, alisalist);

    if (!currdata) {
      return;
    }

    var defaultFieldsHandler = function (t, inputAlias) {
      var factcode = sqlqueryUtils.getArrayValue(currTableCodes, t.code);
      if (factcode) {
        tables[inputAlias] = [];
        var t = tempSqlTables[factcode];
        if (t && t.length > 0) {
          for (var i = 0, ln = t[0].length; i < ln; i++) {
            tables[inputAlias].push(sqlqueryUtils.displayHandler(t[0][i], t[1] ? t[1][i] : "", factcode, t[2] ? t[2][i] : "", t[3] ? t[3][i] : ""));
          }
        }
      }
    };

    var getFieldsHandler = function (t, inputAlias, firstFlag, ckey) {
      if (t.children && t.children.length > 0) {
        if (firstFlag) {
          tables[inputAlias] = [];
        }
        var children = t.children;
        var cmap = {};
        for (var ci = 0; ci < children.length; ci++) {
          var c = children[ci];
          if (firstFlag && c.code) {
            defaultFieldsHandler(c, c.alisa);
          }
          if (c.alisa) {
            cmap[c.alisa.toLowerCase()] = c;
          }
        }
        for (var ci = 0; ci < children.length; ci++) {
          var c = children[ci];
          if (!(alisalist.length > 0 && c.fields)) {
            continue;
          }
          var fields = c.fields.match(new RegExp("((" + alisalist.join("|") + ")\\." + sqlqueryOpts.codeRuleStr + " (AS| +) " + sqlqueryOpts.codeAlisaRuleStr + " *(,|$))" +
            "|((" + alisalist.join("|") + ")\\." + sqlqueryOpts.codeRuleStr + "[^,]+ (AS| ) " + sqlqueryOpts.codeAlisaRuleStr + " *(,|$))" +
            "|([^,]*\\(.*?\\).*?(AS| +) " + sqlqueryOpts.codeAlisaRuleStr + " *(,|$))" +
            "|((" + alisalist.join("|") + ")\\.\\* *(,|$))|((" + alisalist.join("|") + ")\\." + sqlqueryOpts.codeRuleStr + " *(,|$))" +
            "|((?<!\\.)('\\d+'|\\d+) (AS| +) " + sqlqueryOpts.codeAlisaRuleStr + " *(,|$))", "ig"));
          if (fields && fields.length > 0) {
            for (var j = 0; j < fields.length; j++) {
              var fstr = fields[j];
              if (fstr) {
                fstr = fstr.trim().replace(/ *,$/g, "");
                var fm = fstr.match(new RegExp("^(" + alisalist.join("|") + ")\\.\\*$", "i"));
                var endFlag = false;
                if (fm) {
                  //fm[1]
                  endFlag = true;
                  //console.log("fm1---"+JSON.stringify(fm));
                  var cdata = cmap[fm[1].toLowerCase()];
                  if (cdata && cdata.code) {
                    var factcode = sqlqueryUtils.getArrayValue(currTableCodes, cdata.code);
                    if (factcode) {
                      var t = tempSqlTables[factcode];
                      if (t && t.length > 0) {
                        for (var i = 0, ln = t[0].length; i < ln; i++) {
                          if (!firstFlag && ckey !== "*") {
                            continue;
                          }
                          tables[inputAlias].push(sqlqueryUtils.displayHandler(t[0][i], t[1] ? t[1][i] : "", factcode, t[2] ? t[2][i] : "", t[3] ? t[3][i] : ""));
                        }
                      }
                    }
                  } else {
                    getFieldsHandler(cdata, inputAlias, false, "*");
                  }
                }
                if (!endFlag) {
                  fm = fstr.match(new RegExp("^(" + alisalist.join("|") + ")\\.(" + sqlqueryOpts.codeRuleStr + ")$", "i"));
                }
                if (!endFlag && fm) {
                  //fm[1] fm[2]
                  endFlag = true;
                  var cdata = cmap[fm[1].toLowerCase()];
                  if (cdata && cdata.code) {
                    var factcode = sqlqueryUtils.getArrayValue(currTableCodes, cdata.code);
                    if (factcode) {
                      var t = tempSqlTables[factcode];
                      if (t && t.length > 0) {
                        for (var i = 0, ln = t[0].length; i < ln; i++) {
                          if (!firstFlag && ckey.toLowerCase() !== fm[2].toLowerCase()) {
                            continue;
                          }
                          if (fm[2].toLowerCase() === t[0][i].toLowerCase()) {
                            tables[inputAlias].push(sqlqueryUtils.displayHandler(t[0][i], t[1] ? t[1][i] : "", factcode, t[2] ? t[2][i] : "", t[3] ? t[3][i] : ""));
                          }
                        }
                      }
                    }
                  } else {
                    getFieldsHandler(cdata, inputAlias, false, fm[2]);
                  }
                }
                if (!endFlag) {
                  fm = fstr.match(new RegExp("^(" + alisalist.join("|") + ")\\.(" + sqlqueryOpts.codeRuleStr + ") AS (" + sqlqueryOpts.codeAlisaRuleStr + ")$", "i"));
                  if (!fm) {
                    fm = fstr.match(new RegExp("^(" + alisalist.join("|") + ")\\.(" + sqlqueryOpts.codeRuleStr + ") AS (" + sqlqueryOpts.codeRuleStr + ")$", "i"));
                  }
                }
                if (!endFlag && fm) {
                  // fm[1] fm[2] fm[4]/fm[9]
                  endFlag = true;
                  var cdata = cmap[fm[1].toLowerCase()];
                  if (cdata && cdata.code) {
                    var factcode = sqlqueryUtils.getArrayValue(currTableCodes, cdata.code);
                    if (factcode) {
                      var t = tempSqlTables[factcode];
                      if (t && t.length > 0) {
                        for (var i = 0, ln = t[0].length; i < ln; i++) {
                          if (!firstFlag && ckey.toLowerCase() !== fm[9].toLowerCase()) {
                            continue;
                          }
                          if (fm[2].match(new RegExp(sqlqueryOpts.bracketRuleStr))) {
                            fm[2] = fm[2].substring(1, fm[2].length - 1);
                          }
                          if (fm[2].toLowerCase() === t[0][i].toLowerCase()) {
                            tables[inputAlias].push(sqlqueryUtils.displayHandler(fm[9], t[1] ? t[1][i] : "", factcode, t[2] ? t[2][i] : "", t[3] ? t[3][i] : ""));
                          }
                        }
                      }
                    }
                  } else {
                    getFieldsHandler(cdata, inputAlias, false, fm[9]);
                  }
                }
                if (!endFlag) {
                  fm = fstr.match(new RegExp("\\b(" + alisalist.join("|") + ")\\.(" + sqlqueryOpts.codeRuleStr + ")\\b|(?<= AS *)" + sqlqueryOpts.codeRuleStr + "$", "ig"));
                }
                if (!endFlag && fm) {
                  endFlag = true;
                  var keys = [];
                  var descs = [];
                  for (var mj = 0, fln = fm.length - 1; mj < fln; mj++) {
                    var tarr = fm[mj].split(".");
                    var cdata = cmap[tarr[0].toLowerCase()];
                    if (cdata && cdata.code) {
                      var factcode = sqlqueryUtils.getArrayValue(currTableCodes, cdata.code);
                      if (factcode) {
                        var t = tempSqlTables[factcode];
                        if (t && t.length > 0) {
                          for (var i = 0, ln = t[0].length; i < ln; i++) {
                            if (tarr[1].toLowerCase() === t[0][i].toLowerCase()) {
                              if (!sqlqueryUtils.arrayContains(keys, factcode)) {
                                keys.push(factcode);
                              }
                              if (t[1] && !sqlqueryUtils.arrayContains(descs, t[1][i]) && descs.length < 5) {
                                descs.push(t[1][i]);
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  if (keys.length > 0) {
                    tables[inputAlias].push(sqlqueryUtils.displayHandler(fm[fm.length - 1], descs.join("+"), keys.join("+")));
                  } else {
                    tables[inputAlias].push(sqlqueryUtils.displayHandler(fm[fm.length - 1], null, null));
                  }
                }
              }
            }
          }
        }

      }
    };

    var curralisamap = {};
    for (var i = 0; i < currdata.length; i++) {
      var t = currdata[i];
      var alisa = t.alisa;
      if (alisa) {
        curralisamap[alisa.toLowerCase()] = t;
      }
    }
    var t = curralisamap[inputAlias];
    if (t) {
      if (t.code) {
        defaultFieldsHandler(t, inputAlias);
      }
      getFieldsHandler(t, inputAlias, true, "");
    }
  },

  getNestingDepth: function (currTableCodes, sql, currKey) {
    var maxlevel = 0;
    var level = 0;
    var currlevel = null;
    var groups = [];
    var str = "";
    var lastend = "";
    var num = 0;
    for (var i = 0; i < sql.length; i++) {
      var c = sql[i];
      str = str + c;
      switch (c) {
        case '(':

          level++;
          break;
        case ')':
          if (maxlevel < level) {
            maxlevel = level;
          }

          level--;
          break;
        default:
          if (i === sql.indexOf(currKey)) {
            currlevel = level;
          }
      }
      var keym = str && str.match(new RegExp("( (JOIN|WHERE) )$", "i"));
      if ((level === 0 && keym) || i === sql.length - 1) {
        str = str.trim();
        if (lastend && lastend.toLowerCase() === "where") {
          str = "where " + str;
        }
        lastend = keym && keym[0].trim();
        var t = {
          sqlstr: str,
          idx: num,
          maxlevel: maxlevel,
        };
        groups.push(t);
        num++;
        if (currlevel != null) {
          t.currlevel = currlevel;
        }
        var subm2 = str.match(new RegExp("\\bFROM *\\( *SELECT\\b.*\\bFROM\\b.*\\) *(" + sqlqueryOpts.alisaRuleStr + ")", "i"));
        if (str.length > 1 && str.substr(0, 1) === "(" || subm2) {
          if (currlevel != null) {
            var idx = str.indexOf(currKey);
            var idx2 = idx + currKey.length;
            t.currlevel = t.currlevel - this.getNestingDepth2(currTableCodes, str, currKey, idx, idx2);
          }
          var m1 = str.match(new RegExp("\\((.*\\b(" + currTableCodes.join("|") + ")\\b.*)\\) *(" + sqlqueryOpts.alisaRuleStr + ")", "i"));
          if (m1) {
            t.alisa = m1[3];
            var cstr = m1[1];
            var children = this.getNestingDepth(currTableCodes, cstr, currKey);
            t.children = children;
          } else {
            t.iserror = true;
          }
        } else if (str.length > 5 && str.substr(0, 5).toLowerCase() === "where") {
          t.iswhere = true;
        } else {
          var m2 = str.match(new RegExp("\\b(" + currTableCodes.join("|") + ") (" + sqlqueryOpts.alisaRuleStr + ")\\b", "i"));
          if (m2) {
            t.alisa = m2[2];
            t.code = m2[1];

            m2 = str.match(new RegExp("(?<=^SELECT\\b +).*?(?= +\\bFROM\\b)", "i"));
            if (m2) {
              t.fields = m2[0];
            }
          } else {
            t.iserror = true;
          }
        }
        maxlevel = 0;
        currlevel = null;
        str = "";

      }

    }

    return groups;
  },

  getNestingDepth2: function (currTableCodes, sql, currKey, idx, idx2) {
    var num = 0;
    var str = "";
    var i = 0;
    var func = function (str, idx) {
      if (str.substr(0, 1) != "(" && idx - i >= 0) {
        i++;
        str = sql.substr(idx - i, i);
        return func(str, idx);
      } else {
        return str;
      }
    };
    str = func(str, idx);
    var j = 0;
    var str2 = "";
    var func2 = function (str2, idx2) {
      if (str2.substr(str2.length - 1, 1) != ")" && idx2 + j < sql.length) {
        j++;
        str2 = sql.substr(idx2, j);
        return func2(str2, idx2);
      } else {
        return str2;
      }
    };
    str = str + func2(str2, idx2);

    if (!str.match(new RegExp("\\b(" + currTableCodes.join("|") + ")\\b", "i"))) {
      num++;
      num = num + this.getNestingDepth2(currTableCodes, sql, currKey, idx - i, idx2 + j);
    } else {
    }
    return num;
  },

  getRefTagContent: function (text1) {
    if (!text1) {
      return "";
    }
    text1 = this.clearContextValue(text1).replace(/(\\n|\n|\\t|\t)/g, " ")
      .replace(/ +/g, " ").replace(sqlqueryOpts.regxSemicolon, "");
    text1 = this.clearContextComment(text1, true);
    return text1;
  },

  clearContextComment: function (text, clearFlag) {
    if (!text) {
      return "";
    }
    text = this.clearContextValue(text).replace(/''/ig, " ");
    var lines = text.split('\n');
    var text2 = "";
    for (var i = 0; i < lines.length; i++) {
      var linex = lines[i];
      var f = linex.match(sqlqueryOpts.regxComment);
      if (f && f[0]) {
        continue;
      }
      linex = linex.replace(sqlqueryOpts.regxComment2, " ");
      if (clearFlag) {
        var arr = linex.split(sqlqueryOpts.CONS.QUERY_DIV);
        linex = "";
        for (var j = 0; j < arr.length; j++) {
          if (arr[j] && arr[j].indexOf(sqlqueryOpts.alisaTempKey) !== -1) {
            linex = arr[j];
            break;
          }
        }
        if (linex === "") {
          linex = lines[i];
        }
      }
      if (!linex || linex.length === 0) {
        continue;
      }
      if (text2 === "") {
        text2 = linex;
      } else {
        text2 = text2 + "\n" + linex;
      }
    }
    text2 = text2.replace(/(\\n|\n|\\t|\t)/g, " ").replace(/ +/g, " ");
    return text2;
  },
  clearContextComment2: function (text) {
    if (!text) {
      return "";
    }
    text = text.replace(/(\\n|\n|\\t|\t)/g, "\n");
    var lines = text.split('\n');
    var text2 = "";
    for (var i = 0; i < lines.length; i++) {
      var linex = lines[i];
      var f = linex.match(sqlqueryOpts.regxComment);
      if (f && f[0]) {
        continue;
      }
      linex = linex.replace(sqlqueryOpts.regxComment2, " ");
      if (!linex || linex.length === 0) {
        continue;
      }
      if (text2 === "") {
        text2 = linex;
      } else {
        text2 = text2 + "\n" + linex;
      }
    }
    return text2;
  },
  clearContextValue: function (text1) {
    if (!text1) {
      return "";
    }
    text1 = text1.replace(/ +/g, " ").replace(new RegExp("'.*?'( AS\\b)*","ig"), (match) => {
      if (/\bAS\b/i.test(match)) {
         return match;
      } else {
         return "' '";
      }
    });
    return text1;
  },
  convertToCamelCase: function(str) {
    if (!str.includes('_')) {
      return str.toLowerCase();
    }
    const words = str.split('_');
    const camelCase = words.map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
    });
    return camelCase.join('');
  }
}
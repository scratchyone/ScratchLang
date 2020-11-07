@builtin "number.ne"
@builtin "whitespace.ne"
@builtin "string.ne"

functionDef -> "function" __ objectName _ "()" _ "{" ___ codeLine:* ___ "}" {% (n) => { return {type: "function", name: n[2], codeLines: n[8]} }%}
codeLine -> (statement ";" | statement "\n" | statement ";\n") {% n=> n[0][0] %}
statement -> variableDef
variableDef -> "var" __ objectName _ "=" _ object
object -> string
string -> dqstring | sqstring | btstring
objectName -> [A-Za-z0-9_\-]:+ {% (n) => n[0].join('') %}
___ -> _ optNl {% n=> null %}
optNl -> "\n":* {% n => null %}
@builtin "number.ne"
@builtin "whitespace.ne"
@builtin "string.ne"

functionDef -> "function" __ objectName _ "()" _ "{" ___ codeLine:* ___ "}" {% (n) => { return {type: "function", name: n[2], codeLines: n[8]} }%}
codeLine -> (statement ";" | statement "\n" | statement ";\n") {% n=> n[0][0] %}
statement -> variableDef {% n => n[0]%}
variableDef -> "var" __ objectName _ "=" _ object {% n => {return {type: "variableDef", name: n[2], value: n[6]}} %}
object -> (string | number) {% n => n[0][0]%}
string -> (dqstring | sqstring | btstring) {% n => n[0][0]%}
objectName -> [A-Za-z0-9_\-]:+ {% (n) => n[0].join('') %}
___ -> _ optNl {% n=> null %}
optNl -> "\n":* {% n => null %}
number -> (decimal | int) {% n => n[0][0]%}
@builtin "number.ne"
@builtin "whitespace.ne"
@builtin "string.ne"

codeLines -> codeLine:* {% n=> n[0] %}
codeLine -> (statement ";" | statement "\n" | statement ";\n") {% n=> n[0][0] %}
statement -> (variableDef | functionDef | functionCall) {% n => n[0][0] %}
functionDef -> "function" __ objectName _ "()" _ "{" ___ codeLines ___ "}" {% (n) => { return {type: "functionDef", name: n[2], codeLines: n[8]} }%}
variableDef -> "var" __ objectName _ "=" _ object {% n => {return {type: "variableDef", name: n[2], value: n[6]}} %}
functionCall -> objectName "()" {% n => {return {type: "functionCall", name: n[0]}} %}
object -> (string | number) {% n => n[0][0]%}
string -> (dqstring | sqstring | btstring) {% n => n[0][0]%}
objectName -> [A-Za-z0-9_\-]:+ {% (n) => n[0].join('') %}
___ -> (__ | "\n"):* {% n => null %}
optNl -> "\n":* {% n => null %}
number -> (decimal | int) {% n => n[0][0]%}
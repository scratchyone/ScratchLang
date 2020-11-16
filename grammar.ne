@builtin "number.ne"
@builtin "whitespace.ne"
@builtin "string.ne"

sprites -> sprite:+ {% n => n[0]%}

sprite -> "sprite" __ objectCallableName ___ "{" ___ functionDef:* ___ "}" ___ {% n => {return { type: "spriteDef", name: n[2], functions: n[6] } } %}
statementLines -> (statement ___):* {% n=> n[0].map(x=>x[0]) %}
statement -> (variableDef | functionDef | functionCall | return) "\n" {% n => n[0][0] %}
return -> "return" __ objectRep {% n => {return {type: "return", value: n[2]} }%}
functionDef -> "function" __ objectName _ "(" commaSeparatedObjectNames:? ")" ___ "{" ___ statementLines "}" ___ {% 
(n) => { return {type: "functionDef", name: n[2], codeLines: n[10], args: n[5]} }
%}
variableDef -> ("var" | "const") __ objectName _ "=" _ objectRep {% n => {return {type: "variableDef", name: n[2], value: n[6], constant: n[0][0] === "const"}} %}
functionCall -> objectCallableName "(" commaSeparatedObjects:? ")" {% n => {return {type: "functionCall", name: n[0], args: n[2] || []}} %}
object -> (string | number) {% n => n[0][0]%}
string -> (dqstring | sqstring | btstring) {% n => n[0][0]%}
objectName -> [A-Za-z_]:+ {% (n) => n[0].join('') %}
objectCallableName -> [A-Za-z_.]:+ {% (n) => n[0].join('') %}
___ -> [ \n]:* {% n => null %}
optNl -> "\n":* {% n => null %}
number -> (decimal | int) {% n => n[0][0]%}
commaSeparatedObjects -> ___ (objectLiteral | objectReference | functionCall) ___ ( "," ___ commaSeparatedObjects {% n => n[2]%} ):? {% n => [n[1][0], ...n[3] || [] ]%}
commaSeparatedObjectNames -> ___ objectName ___ ( "," ___ commaSeparatedObjectNames {% n => n[2] %} ):? {% n => [n[1], ...n[3] || [] ]%}
objectRep -> (objectLiteral | objectReference | functionCall) {% n => n[0][0] %}
objectLiteral -> object {% n => {return {type: "objectLiteral", value: n[0] } } %}
objectReference -> objectCallableName {% n => {return {type: "objectReference", name: n[0] } } %}
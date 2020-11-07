export type Token = VariableDef | FunctionDef | FunctionCall;
interface VariableDef {
  type: 'variableDef';
  name: string;
  value: string;
}
interface FunctionDef {
  type: 'functionDef';
  name: string;
  codeLines: Array<Token>;
}
interface FunctionCall {
  type: 'functionCall';
  name: string;
  args: Array<PObject>;
}
export type PObject = string | number;

export type Token = VariableDef | FunctionDef;
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

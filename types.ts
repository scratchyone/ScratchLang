export type Token =
  | VariableDef
  | FunctionDef
  | FunctionCall
  | SpriteDef
  | Return;
export interface VariableDef {
  type: 'variableDef';
  name: string;
  value: string;
}
export interface FunctionDef {
  type: 'functionDef';
  name: string;
  codeLines: Array<Token>;
}
export interface SpriteDef {
  type: 'spriteDef';
  name: string;
  functions: Array<Token>;
}
export interface FunctionCall {
  type: 'functionCall';
  name: string;
  args: Array<InputValue>;
  async: boolean;
}
export interface ObjectLiteral {
  type: 'objectLiteral';
  value: PObject;
}
export interface ObjectReference {
  type: 'objectReference';
  name: string;
}
export interface Return {
  type: 'return';
  value: InputValue;
}
export type InputValue = ObjectLiteral | ObjectReference;
export type PObject = string | number;
export type RefId = string;
export type ParsedInputValue = ObjectLiteral | BlockReference;
export interface BlockReference {
  type: 'blockReference';
  id: string;
}

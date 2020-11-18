import * as Types from './types';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import util from 'util';
import log from 'loglevel';
import * as SB3 from './SB3';
import * as Blocks from './blocks';

const BLOCK_WIDTH = 500;
const VOID = '<<void>>';

interface NativeFunctionData {
  return: true | false;
  blocks: Array<SB3.Block>;
}

const nativeFunctions: {
  [key: string]: (...args: any[]) => NativeFunctionData;
} = {
  say: (id: string, args: Array<Types.ParsedInputValue>) =>
    args.length === 2
      ? { return: false, blocks: [new Blocks.SayForSecs(id, args[0], args[1])] }
      : { return: false, blocks: [new Blocks.Say(id, args[0])] },
};

function bindFunctionCall(
  arg: Types.FunctionCall,
  varMappings: Map<string, Variable>,
  sprite: SB3.Target,
  stack: SB3.List,
  stackShift: number,
  broadcasts: Map<string, string>,
  lastBlock: SB3.Block
): { val: Types.InputValue; shiftBy: number; lastBlock: SB3.Block } {
  const res = processFunctionCall(
    arg,
    varMappings,
    sprite,
    stack,
    stackShift,
    lastBlock,
    broadcasts
  );
  const currBlock = lastBlock.addChild(res.lastBlock);
  sprite.addBlock(lastBlock);
  const varName = uuidv4();
  varMappings.set(varName, {
    constant: false,
    name: varName,
    location: stackShift + res.shiftBy - 1,
  });
  return {
    val: { type: 'objectReference', name: varName },
    lastBlock: currBlock,
    shiftBy: res.shiftBy,
  };
}

function bindInput(
  arg: Types.InputValue,
  varMappings: Map<string, Variable>,
  sprite: SB3.Target,
  stack: SB3.List,
  stackShift: number,
  parent: string
): Types.ParsedInputValue {
  if (arg.type === 'objectLiteral')
    return { type: 'objectLiteral', value: arg.value };
  else if (arg.type === 'functionCall') {
    throw new Error(
      "This shouldn't be able to happen, somehow the compiler attempted to bind a function call without creating it first"
    );
  } else {
    const foundVar = varMappings.get(arg.name);
    if (foundVar === undefined)
      throw new Error(`Variable ${arg.name} does not exist`);
    if (foundVar.constant)
      return { type: 'objectLiteral', value: foundVar.value };
    else
      return sprite.addReporter(
        new Blocks.ItemFromListSimple(stack, stackShift - foundVar.location),
        parent
      );
  }
}

interface DynamicVariable {
  name: string;
  location: number;
  constant: false;
}
interface ConstantVariable {
  name: string;
  value: Types.PObject;
  constant: true;
}
type Variable = DynamicVariable | ConstantVariable;

export class Scope {
  code: Array<Types.Token>;
  constructor(code: Array<Types.Token>) {
    this.code = code;
  }
}

function processFunctionCall(
  funcCall: Types.FunctionCall,
  varMappings: Map<string, Variable>,
  sprite: SB3.Target,
  stack: SB3.List,
  stackShift: number,
  lastBlock: SB3.Block,
  broadcasts: Map<string, string>
): { shiftBy: number; lastBlock: SB3.Block } {
  let currBlock = lastBlock;
  let didCalledFunctionReturnValue: boolean = false;
  const nativeFunction = Object.entries(nativeFunctions).find(
    (n) => n[0] === funcCall.name
  );
  if (nativeFunction) {
    const nextId = uuidv4();
    const newBinds = [];
    const newArgs: Array<Types.ParsedInputValue> = [];
    for (let arg of funcCall.args) {
      if (arg.type === 'functionCall') {
        const rebound = bindFunctionCall(
          arg,
          varMappings,
          sprite,
          stack,
          stackShift,
          broadcasts,
          lastBlock
        );
        lastBlock = rebound.lastBlock;
        stackShift += rebound.shiftBy;
        arg = rebound.val;
      }
      newBinds.push(arg);
    }
    for (const arg of newBinds) {
      const bi = bindInput(arg, varMappings, sprite, stack, stackShift, nextId);
      newArgs.push(bi);
    }
    const nativeResult = nativeFunction[1](nextId, newArgs);
    for (const block of nativeResult.blocks) {
      currBlock = lastBlock.addChild(block);
      sprite.addBlock(lastBlock);
      lastBlock = currBlock;
    }
    if (nativeResult.return) didCalledFunctionReturnValue = true;
    else didCalledFunctionReturnValue = false;
  } else {
    const broadcastId = broadcasts.get(funcCall.name);
    if (!broadcastId)
      throw new Error(
        `Tried to call function ${funcCall.name} but it doesn't exist`
      );
    currBlock = lastBlock.addChild(
      new Blocks.SendBroadcast(
        broadcastId as string,
        `function__${funcCall.name}`
      )
    );
    didCalledFunctionReturnValue = true;
  }
  if (didCalledFunctionReturnValue) {
    return { shiftBy: 1, lastBlock: currBlock };
  }
  return { shiftBy: 0, lastBlock: currBlock };
}

export class Sprite {
  functionsSoFar: number;
  parsedClass: Types.SpriteDef;
  constructor(parsedClass: Types.SpriteDef) {
    this.parsedClass = parsedClass;
    this.functionsSoFar = 0;
  }
  generateAndSave(
    stage: SB3.Target,
    broadcasts: Map<string, string>,
    pjson: SB3.SB3,
    stack: SB3.List
  ) {
    const sprite =
      this.parsedClass.name === 'Stage'
        ? stage
        : pjson.addSprite(
            new SB3.Target({
              isStage: false,
              name: this.parsedClass.name,
              variables: [],
              blocks: [],
              broadcasts: [],
              lists: [],
            })
          );
    for (const sfunction of this.parsedClass.functions.filter(
      (n) => n.type === 'functionDef'
    ) as Array<Types.FunctionDef>) {
      let headBlock;
      if (sfunction.name === 'main') {
        log.debug('Main function found, creating green flag event');
        // Create green flag function
        headBlock = SB3.Block.createTopLevelBlock(
          'event_whenflagclicked',
          [],
          [],
          this.functionsSoFar * BLOCK_WIDTH + 43
        );
      } else if (sfunction.type === 'functionDef') {
        const broadcastId = stage.addBroadcast(
          `function__${this.parsedClass.name}.${sfunction.name}`
        );
        headBlock = SB3.Block.createTopLevelBlock(
          'event_whenbroadcastreceived',
          [
            SB3.Field.createNewField(
              'BROADCAST_OPTION',
              `function__${this.parsedClass.name}.${sfunction.name}`,
              broadcastId
            ),
          ],
          [],
          this.functionsSoFar * BLOCK_WIDTH + 43
        );
        broadcasts.set(
          `${this.parsedClass.name}.${sfunction.name}`,
          broadcastId
        );
      }
      if (sfunction.type === 'functionDef') {
        if (!headBlock)
          throw new Error(
            `Failed to create head block for function ${sfunction.name}`
          );
        let lastBlock = headBlock;
        const varMappings: Map<string, Variable> = new Map();
        let stackShift = 0;
        let returnValue: Types.InputValue = {
          type: 'objectLiteral',
          value: VOID,
        };
        for (const child of sfunction.codeLines) {
          let currBlock;
          if (child.type === 'return') {
            returnValue = child.value;
            break;
          }
          if (child.type === 'functionCall') {
            const res = processFunctionCall(
              child,
              varMappings,
              sprite,
              stack,
              stackShift,
              lastBlock,
              broadcasts
            );
            stackShift += res.shiftBy;
            lastBlock = res.lastBlock;
          } else if (child.type === 'variableDef') {
            if (child.constant) {
              const referencedVar =
                child.value.type === 'objectReference'
                  ? varMappings.get(child.value.name)
                  : undefined;
              if (referencedVar && !referencedVar.constant)
                throw new Error(
                  'A constant variable cannot be set to a dynamic object'
                );
              if (referencedVar && referencedVar.constant)
                varMappings.set(child.name, {
                  name: child.name,
                  value: referencedVar.value,
                  constant: true,
                });
              else if (child.value.type === 'objectLiteral')
                varMappings.set(child.name, {
                  name: child.name,
                  value: child.value.value,
                  constant: true,
                });
              else if (child.value.type === 'functionCall')
                throw new Error(
                  "A constant variable cannot be set to a function's return value"
                );
              else
                throw new Error(
                  `Something went wrong when trying to assign to ${child.name}`
                );
            } else {
              const parentId = uuidv4();
              if (child.value.type === 'functionCall') {
                const rebound = bindFunctionCall(
                  child.value,
                  varMappings,
                  sprite,
                  stack,
                  stackShift,
                  broadcasts,
                  lastBlock
                );
                lastBlock = rebound.lastBlock;
                stackShift += rebound.shiftBy;
                child.value = rebound.val;
              }
              const bound = bindInput(
                child.value,
                varMappings,
                sprite,
                stack,
                stackShift,
                parentId
              );
              const tmpBlock = new Blocks.InsertIntoList(stack, 1, bound);
              tmpBlock.id = parentId;
              currBlock = lastBlock.addChild(tmpBlock);
              varMappings.set(child.name, {
                name: child.name,
                location: stackShift,
                constant: false,
              });
              stackShift++;
            }
          }
          sprite.addBlock(lastBlock);
          if (currBlock) lastBlock = currBlock;
        }
        if (sfunction.name !== 'main') {
          const parentId = uuidv4();
          if (returnValue.type === 'functionCall') {
            const rebound = bindFunctionCall(
              returnValue,
              varMappings,
              sprite,
              stack,
              stackShift,
              broadcasts,
              lastBlock
            );
            lastBlock = rebound.lastBlock;
            stackShift += rebound.shiftBy;
            returnValue = rebound.val;
          }
          const bound = bindInput(
            returnValue,
            varMappings,
            sprite,
            stack,
            stackShift,
            parentId
          );
          const tmpBlock = new Blocks.InsertIntoList(stack, 1, bound);
          tmpBlock.id = parentId;
          const currBlock = lastBlock.addChild(tmpBlock);
          sprite.addBlock(lastBlock);
          lastBlock = currBlock;
        }
        while (stackShift > 0) {
          stackShift--;
          const currBlock = lastBlock.addChild(
            new Blocks.DeleteFromListSimple(
              stack,
              sfunction.name === 'main' ? 1 : 2
            )
          );
          sprite.addBlock(lastBlock);
          lastBlock = currBlock;
        }
        sprite.addBlock(lastBlock);
      }
      this.functionsSoFar++;
    }
  }
}
export class Generator {
  data: AdmZip;
  constructor(data: AdmZip) {
    this.data = data;
  }
  exportToFile(file: string) {
    this.data.writeZip(file);
  }
  static blank() {
    return new Generator(new AdmZip());
  }
  createFromParse(parse: Array<Types.Token>): Generator {
    // Create project.json
    const pjson = SB3.SB3.empty();
    const stage = pjson.targets.find((n) => n.name === 'Stage');
    if (!stage) throw new Error('Failed to create stage, something went wrong');
    const stack = stage.addList('stack', []);
    const broadcasts: Map<string, string> = new Map();
    // Start parsing
    const spritesSoFar = new Set();
    for (const sprite of parse.filter((n) => n.type === 'spriteDef') as Array<
      Types.SpriteDef
    >) {
      if (spritesSoFar.has(sprite.name))
        throw new Error(`Sprite ${sprite.name} already exists`);
      spritesSoFar.add(sprite.name);
      new Sprite(sprite as Types.SpriteDef).generateAndSave(
        stage,
        broadcasts,
        pjson,
        stack
      );
    }
    /*console.log(
      util.inspect(pjson.json(), {
        showHidden: false,
        depth: null,
        colors: true,
      })
    );*/
    this.data.addFile(
      'project.json',
      Buffer.from(JSON.stringify(pjson.json()), 'utf-8')
    );
    // Add required stage backdrop
    this.data.addLocalFile('./cd21514d0531fdffb22204e0ec5ed84a.svg');
    return this;
  }
}

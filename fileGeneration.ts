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
  else {
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
            let didCalledFunctionReturnValue: boolean = false;
            const nativeFunction = Object.entries(nativeFunctions).find(
              (n) => n[0] === child.name
            );
            if (nativeFunction) {
              const nextId = uuidv4();
              const newArgs: Array<Types.ParsedInputValue> = child.args.map(
                (arg) => {
                  return bindInput(
                    arg,
                    varMappings,
                    sprite,
                    stack,
                    stackShift,
                    nextId
                  );
                }
              );
              const nativeResult = nativeFunction[1](nextId, newArgs);
              for (const block of nativeResult.blocks) {
                currBlock = lastBlock.addChild(block);
                sprite.addBlock(lastBlock);
                lastBlock = currBlock;
              }
              if (nativeResult.return) didCalledFunctionReturnValue = true;
              else didCalledFunctionReturnValue = false;
            } else {
              const broadcastId = broadcasts.get(child.name);
              if (!broadcastId)
                throw new Error(
                  `Tried to call function ${child.name} but it doesn't exist`
                );
              currBlock = lastBlock.addChild(
                new Blocks.SendBroadcast(
                  broadcastId as string,
                  `function__${child.name}`
                )
              );
              didCalledFunctionReturnValue = true;
            }
            if (didCalledFunctionReturnValue) {
              varMappings.set('lastRet', {
                name: 'lastRet',
                constant: false,
                location: stackShift,
              });
              stackShift++;
            }
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
              else
                throw new Error(
                  `Something went wrong when trying to assign to ${child.name}`
                );
            } else {
              const parentId = uuidv4();
              const tmpBlock = new Blocks.InsertIntoList(
                stack,
                1,
                bindInput(
                  child.value,
                  varMappings,
                  sprite,
                  stack,
                  stackShift,
                  parentId
                )
              );
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
          const tmpBlock = new Blocks.InsertIntoList(
            stack,
            1,
            bindInput(
              returnValue,
              varMappings,
              sprite,
              stack,
              stackShift,
              parentId
            )
          );
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
    console.log(
      util.inspect(pjson.json(), {
        showHidden: false,
        depth: null,
        colors: true,
      })
    );
    this.data.addFile(
      'project.json',
      Buffer.from(JSON.stringify(pjson.json()), 'utf-8')
    );
    // Add required stage backdrop
    this.data.addLocalFile('./cd21514d0531fdffb22204e0ec5ed84a.svg');
    return this;
  }
}

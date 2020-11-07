import * as Types from './types';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import util from 'util';
import log from 'loglevel';
import * as SB3 from './SB3';
export class Generator {
  data: AdmZip;
  constructor(data: AdmZip) {
    this.data = data;
  }
  exportToFile(file: string) {
    this.data.writeZip(file);
  }
  static createFromParse(parse: Array<Types.Token>): Generator {
    // Create blank zip
    const data = new Generator(new AdmZip());
    // Create project.json
    const pjson = SB3.SB3.empty();
    const stage = pjson.targets.find((n) => n.name === 'Stage');
    // Start parsing
    const functions = parse.filter((f) => f.type === 'functionDef');
    if (!stage) throw new Error('Failed to create stage, something went wrong');
    const broadcasts = new Map();
    let functionsSoFar = 0;
    const staggerAmount = 400;
    for (const sfunction of functions) {
      let headBlock;
      if (sfunction.name === 'main' && sfunction.type === 'functionDef') {
        log.debug('Main function found, creating green flag event');
        // Create green flag function
        headBlock = SB3.Block.createTopLevelBlock(
          'event_whenflagclicked',
          [],
          [],
          functionsSoFar * staggerAmount + 43
        );
      } else if (sfunction.type === 'functionDef') {
        const broadcastId = stage.addBroadcast(`function__${sfunction.name}`);
        headBlock = SB3.Block.createTopLevelBlock(
          'event_whenbroadcastreceived',
          [
            SB3.Field.createNewField(
              'BROADCAST_OPTION',
              `function__${sfunction.name}`,
              broadcastId
            ),
          ],
          [],
          functionsSoFar * staggerAmount + 43
        );
        broadcasts.set(sfunction.name, broadcastId);
      }
      if (sfunction.type === 'functionDef') {
        if (!headBlock)
          throw new Error(
            `Failed to create head block for function ${sfunction.name}`
          );
        let lastBlock = headBlock;
        for (const child of sfunction.codeLines)
          if (child.type === 'functionCall') {
            const broadcastId = broadcasts.get(child.name);
            if (!broadcastId)
              throw new Error(
                `Tried to call function ${child.name} but it doesn't exist`
              );
            const currBlock = lastBlock.createChild(
              'event_broadcastandwait',
              [],
              [
                new SB3.Input('BROADCAST_INPUT', 'shadow', 'broadcast', [
                  `function__${child.name}`,
                  broadcastId as string,
                ]),
              ]
            );
            stage.addBlock(lastBlock);
            lastBlock = currBlock;
          }
        stage.addBlock(lastBlock);
      }
      functionsSoFar++;
    }
    if (!functions.find((f) => f.name === 'main'))
      log.warn('No main function found, that might be a mistake');
    console.log(
      util.inspect(pjson.json(), {
        showHidden: false,
        depth: null,
        colors: true,
      })
    );
    data.data.addFile(
      'project.json',
      Buffer.from(JSON.stringify(pjson.json()), 'utf-8')
    );
    // Add required stage backdrop
    data.data.addLocalFile('./cd21514d0531fdffb22204e0ec5ed84a.svg');
    return data;
  }
}

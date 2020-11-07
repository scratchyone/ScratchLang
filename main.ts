import nearley from 'nearley';
const grammar = require('./grammar.js');
import arg from 'arg';
import * as Types from './types';
import { readFileSync } from 'fs';
import { Generator } from './fileGeneration';
import util from 'util';
import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';
import chalk from 'chalk';

const colors = {
  TRACE: chalk.magenta,
  DEBUG: chalk.cyan,
  INFO: chalk.blue,
  WARN: chalk.yellow,
  ERROR: chalk.red,
};

prefix.reg(log);
log.enableAll();

prefix.apply(log, {
  format(level, name, timestamp) {
    return `${chalk.gray(`[${timestamp}]`)} ${colors[
      level.toUpperCase() as 'ERROR' // Prevent typescript from being silly
    ](level)}`;
  },
});

prefix.apply(log.getLogger('critical'), {
  format(level, name, timestamp) {
    return chalk.red.bold(`[${timestamp}] ${level} ${name}:`);
  },
});

// Parse command arguments
const args = arg({
  // Types
  '--help': Boolean,
  '--compile': String,
  '--output': String,
  '-c': '--compile',
  '-o': '--output',
});
if (args['--help']) {
  console.log('--compile <file> --output <sb3 name>       Compile a file');
  process.exit(0);
} else if (args['--compile'] && args['--output']) {
  log.info(`Parsing ${args['--compile']}`);
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  const fileData = readFileSync(args['--compile']).toString();
  parser.feed(fileData + '\n');
  const results = parser.results[0] as Array<Types.Token>;
  console.log(
    util.inspect(results, { showHidden: false, depth: null, colors: true })
  );
  log.info(`Compiling ${args['--compile']}`);
  Generator.blank().createFromParse(results).exportToFile(args['--output']);
  log.info('Finished compiling');
} else {
  log.error('No valid options given');
  process.exit(1);
}

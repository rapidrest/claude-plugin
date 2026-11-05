// A stand-in for the RapidREST CLI that asks real @inquirer/prompts questions, so the wrapper is
// tested against the same prompt rendering the CLI produces. The first argument picks a scenario;
// answers are echoed as JSON on the last line for assertions.
import { confirm, input, password, select } from '@inquirer/prompts';

const [scenario, ...rest] = process.argv.slice(2);
const out = (value) => console.log(`RESULT ${JSON.stringify(value)}`);

switch (scenario) {
  case 'none':
    console.log('no prompts here');
    out({ args: rest, cwd: process.cwd() });
    break;
  case 'inputs': {
    const description = await input({ message: 'Enter a short description:', required: true });
    const schedule = await input({ message: 'Enter the schedule:', default: '* * * * *' });
    out({ description, schedule });
    break;
  }
  case 'confirm': {
    const api = await confirm({ message: 'Is this an API route?' });
    const protect = await confirm({ message: 'Enable protection?', default: false });
    out({ api, protect });
    break;
  }
  case 'select': {
    const db = await select({
      message: 'Select database type:',
      choices: [{ name: 'MongoDB', value: 'mongodb' }, { name: 'PostgreSQL', value: 'postgres' }, { name: 'sqlite', value: 'sqlite' }],
    });
    out({ db });
    break;
  }
  case 'secret': {
    const secret = await password({ message: 'Client Secret:', mask: '*' });
    out({ length: secret.length });
    break;
  }
  case 'exit':
    console.error('failing on purpose');
    process.exit(Number(rest[0] ?? 1));
    break;
  case 'hang':
    console.log('working...');
    setInterval(() => {}, 1000);
    break;
  default:
    console.error(`unknown scenario ${scenario}`);
    process.exit(99);
}

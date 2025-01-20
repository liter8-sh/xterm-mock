# xterm-mock
xterm-mock is a simple wrapper for xterm.js that makes it easy to mock terminal interactions. Perfect for building web terminal demos or just playing around with terminal stuff for fun!

It was originally an internal package for [liter8.sh](https://liter8.sh/). Now, it's open sourced for fun :).

## Quick Start
### Installation
To install:

```bash
npm install xterm-mock
```
or with your favorite package managers that support an npm repo.

### Usage
ESM example:
```ts
import { Terminal } from '@xterm/xterm';
import { ShellEnv, ShellParams, ShellFile, ShellDir } from 'xterm-mock';

// somewhere in your app component
const terminal = new Terminal();
const welcomeMessages = [
    `\r\nWelcome to liter8.sh v0.2.1\r\n`,
    '* Projects: https://liter8.sh/projects\r\n\r\n',
    'Please enter `help` for more information!\r\n',
];
const directories = new ShellDir('', [
    new ShellDir('links', [], [
        new ShellFile('project', '', '/projects'),
    ]),
    new ShellDir('contact', [], [new ShellFile('README', '', 'Hello, you may contact us via amirkode (github).'),]),
], 
[]);
// init env
const shellParams: ShellParams = {
    term,
    welcomeMessages,
    directories,
    pathUpdaterFunc,
    exitFunc,
    projectName: `liter8.sh v0.2.1`,
    userName: 'guest',
    hostName: 'liter8'
};
const env = new ShellEnv(shellParams);
setShellEnv(env);

```

## Components
### ShellEnv
Todo: detail
### ShellParams
Todo: detail
### ShellFile
Todo: detail
### ShellDir
Todo: detail

This project was created using `bun init` in bun v1.1.45. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

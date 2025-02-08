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
    new ShellDir('contact', [], [
        new ShellFile('README', '', 'Hello, you may contact us via amirkode (github).'),
    ]),
], []);
// init env
const shellParams: ShellParams = {
    terminal,
    welcomeMessages,
    directories,
    pathUpdaterFunc,
    exitFunc,
    projectName: `liter8.sh v0.2.1`,
    userName: 'guest',
    hostName: 'liter8'
};
const env = new ShellEnv(shellParams);
```

## Components

### ShellEnv
- **Description:**  
  Manages the terminal shell session. It wraps the xterm.js terminal and handles command processing and output.
- **Constructor Parameters:**  
  - `params` (ShellParams): Configuration details including the terminal instance, welcome messages, file system structure, and callbacks.
- **Returns:**  
  A ShellEnv instance that manages session state and terminal interactions.

### ShellParams
- **Description:**  
  Defines the configuration for initializing a shell session.
- **Properties:**  
  - `term`: The xterm.js Terminal instance.
  - `welcomeMessages`: An array of strings to display when the terminal starts.
  - `directories`: The root ShellDir representing the simulated file system.
  - `pathUpdaterFunc`: A function that updates the current path (accepts a string).
  - `exitFunc`: A function that handles exiting the terminal.
  - `projectName`: A string for the project name.
  - `userName`: A string for the user name.
  - `hostName`: A string for the host name.

### ShellFile
- **Description:**  
  Represents a file in the simulated file system.
- **Constructor Parameters:**  
  - `name` (string): The file's name.
  - `ext` (string): The file's extension.
  - `content` (string): The file's content in plain text format.
- **Returns:**  
  A ShellFile instance that can be used within the file system simulation.

### ShellDir
- **Description:**  
  Represents a directory in the simulated file system.
- **Constructor Parameters:**  
  - `name` (string): The directory's name.
  - `children` (ShellDir[]): An array of child directories.
  - `files` (ShellFile[]): An array of files contained in the directory.
- **Returns:**  
  A ShellDir instance that organizes files and subdirectories in a hierarchical structure.

This project was created using `bun init` in bun v1.1.45. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

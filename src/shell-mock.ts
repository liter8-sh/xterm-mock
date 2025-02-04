import { Terminal } from '@xterm/xterm';

const defaultProjectName = 'xterm-mock v0.1.0'
const defaultUserName = 'guest';
const defaultHostName = 'xterm-mock';

export type ShellParams = {
    term: Terminal;
    welcomeMessages: string[];
    directories: ShellDir;
    projectName?: string;
    userName?: string;
    hostName?: string;
    pathUpdaterFunc?: (path: string) => void;
    exitFunc?: () => void
};

// TODO: List of features to implement
// - path chaining access, i.e: `cat folder/sub1/sub2/file.txt`
// - initial message without defining \r char or any other special chars
// - more file behaviours
// - custom command prefix (?)
// - and so on (along the way findings)

export class ShellEnv {
    // xterm
    term: Terminal;
    disposable: any = null;
    // external function
    pathUpdaterFunc?: (path: string) => void;
    exitFunc?: () => void;
    // custom util
    projectName: string;
    cmdPrefix: string;
    welcomeMessages: string[];
    dir: ShellDir;
    path: string[] = [];
    
    constructor(params: ShellParams) {
        this.term = params.term;
        this.dir = params.directories;
        this.welcomeMessages = params.welcomeMessages;
        this.projectName = params.projectName ?? defaultProjectName;
        this.cmdPrefix = `${params.userName ?? defaultUserName}@${params.hostName ?? defaultHostName}:/`;
        this.pathUpdaterFunc = params.pathUpdaterFunc;
        this.exitFunc = params.exitFunc;
        // lastly, init the terminal
        this.initTerminal();
    }

    initTerminal() {
        this.initRootDir();
        this.printWelcomeMessage();
        // handle data change
        this.disposable = this.term.onData(e => {
            const char = e.charCodeAt(0);
            const col = this.term.buffer.active.cursorX;
            const row = this.term.buffer.active.baseY + this.term.buffer.active.cursorY;
            if (char === 13) {
                // enter
                let currRow = row;
                let command = '';
                while (currRow >= 0) {
                    const line = this.term.buffer.active.getLine(currRow);
                    if (!line) return;
                    
                    let input = line.translateToString(true).trim();
                    if (input.startsWith(this.cmdPrefix)) {
                        command = input.replace(/^[^>]*> /, '') + command;
                        break;
                    }

                    command = input + command;
                    currRow--;
                }

                this.handleCommand(command);
                this.term.write(`\r\n${this.cmdPrefix}${this.getPath()}> `);
            } else if (char === 127) {
                // backspace
                const line = this.term.buffer.active.getLine(row);
                if (!line) return;

                const input = line.translateToString(true);
                if (!input.startsWith(this.cmdPrefix) || this.term.buffer.active.cursorX > this.cmdPrefix.length + this.getPath().length + 2) {
                    if (col === 0) {
                        // move cursor up and rightmost
                        const moveUp = '\x1b[1A';
                        const moveRightmost = '\x1b[999C';
                        const move = moveUp + moveRightmost;
                        const backspace = '\x1b[P';
                        this.term.write(move + backspace);
                        return;
                    }
                    // perform normal backspace
                    this.term.write('\b \b');
                }
            } else {
                // default
                this.term.write(e);
            }
            // TODO: Implement command history, when arrow up/down is pressed
        })
    }

    printWelcomeMessage() {
        this.welcomeMessages.forEach( e => {
            this.term.write(e);
        });

        this.term.write(`\r\n${this.cmdPrefix}> `);
    }

    resetTerminal() {
        // move directory up to root
        while (this.path.length) {
            this.dir = this.dir.parent!;
            this.path.pop();
        }

        this.term.clear();
        this.term.write('\x1b[2K\x1b[A');
        this.printWelcomeMessage();
        this.pathUpdaterFunc?.(this.getPath());
    }

    clearCmdWhiteSpace(cmd: string): string {
        // handle many white spaces
        let curr = '';
        let skip = false;
        let singleQuoteOpen = false;
        let doubleQuoteOpen = false;
        let parts: string[] = []
        for (const c of cmd) {
            if (c == ' ') {
                if (skip) continue;
                if (!singleQuoteOpen && !doubleQuoteOpen)
                    skip = true;
            } else if (c == '"') {
                if (doubleQuoteOpen) {
                    skip = true;
                    doubleQuoteOpen = false;
                } else if (!singleQuoteOpen) {
                    curr += '"';
                    skip = false;
                    doubleQuoteOpen = true;
                    continue;
                }
            } else if (c == "'") {
                if (singleQuoteOpen) {
                    skip = true;
                    singleQuoteOpen = false;
                } else if (!doubleQuoteOpen) {
                    curr += "'";
                    skip = false;
                    singleQuoteOpen = true;
                    continue;
                }
            } else
                skip = false;

            curr += c;
            if (skip) {
                curr = curr.trimEnd();
                if (curr)
                    parts.push(curr);
                // reset
                curr = '';
            }
        }

        if (curr)
            parts.push(curr);

        let res: string = parts.join(' ');

        return res;
    }
    
    handleCommand(cmd: string) {
        const cmds = this.clearCmdWhiteSpace(cmd).split(' ');
        switch(cmds[0]) {
            case 'help': {
                this.cmdHelp(cmds.slice(1, cmds.length))
                break;
            }
            case 'cd': {
                this.cmdChangeDir(cmds.slice(1, cmds.length));
                break;
            }
            case 'ls': {
                this.cmdViewDir(cmds.slice(1, cmds.length));
                break;
            }
            case 'cat': {
                this.cmdViewFile(cmds.slice(1, cmds.length));
                break;
            }
            case 'clear': {
                this.cmdClear(cmds.slice(1, cmds.length));
                break;
            }
            case 'route': {
                this.cmdRouteFromFile(cmds.slice(1, cmds.length));
                break;
            }
            case 'exit': {
                this.cmdExit(cmds.slice(1, cmds.length));
                break;
            }
            default: {
                if (cmds.length == 0)
                    return;

                const response = `Command not found: ${cmds[0]}`;
                this.term.write(`\r\n${response}\r\n`);
            }
        }
    }

    cmdHelp(args: string[]) {
        const response = args.length > 0 ? 
            `help: no arguments match "${args.join(' ')}".`:
            `${this.projectName}\r\n\r\nAvailable Commands:` +
            '\r\n  - cd:      Change directory' +
            '\r\n  - cat:     View file contents' +
            '\r\n  - ls:      List directory contents' +
            '\r\n  - route:   Open link from file' +
            '\r\n  - clear:   Clear the terminal' +
            '\r\n  - exit:    Exit the terminal';
        this.term.write(`\r\n${response}\r\n`);
    }

    // TODO: implement multi level change directory
    cmdChangeDir(args: string[]) {
        if (args.length == 0) {
            const response = `cd: please provide the directory name to change to.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }
        
        const fullArg = args.join(' ');
        if (fullArg === "..") {
            // move up
            if (this.path.length > 0) {
                this.path.pop();
                this.dir = this.dir.parent!;
                this.pathUpdaterFunc?.(this.getPath());
            } else {
                const response = `cd: cannot further move directory up`;
                this.term.write(`\r\n${response}\r\n`);
            }
            return;
        }
        
        const valid = this.validateNameArg(fullArg, args.length);
        if (valid == -1) {
            const response = `cd: invalid directory name, you may use quotes (' or ") for a long name.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        const dirName = valid == 1 ? fullArg.slice(1, fullArg.length - 1) : fullArg;
        let targetDir: ShellDir | null = null;
        for (let child of this.dir.children) {
            if (child.name == dirName) {
                targetDir = child;
                break;
            }
        }

        // TODO: implement levenshtein distance for recommandation
        if (!targetDir) {
            const response = `cd: directory "${dirName}" not found`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        this.dir = targetDir;
        this.path.push(targetDir.name);
        this.pathUpdaterFunc?.(this.getPath());
    }
    
    cmdViewDir(args: string[]) {
        if (args.length > 0) {
            const response = `ls: no arguments match "${args.join(' ')}".`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        const reformatName = (name: string) => {
            let containSpace = name.includes(' ');
            return containSpace ? `"${name}"` : name;
        };

        let response = '';
        if (this.dir.children.length > 0)
            response += `\x1b[32m${this.dir.children.map(it => reformatName(it.name)).join(' ')}\x1b[0m`;
        if (this.dir.files.length > 0)
            response += `${this.dir.children.length > 0 ? ' ': ''}${this.dir.files.map(it => reformatName(it.name + it.ext)).join(' ')}`;

        if (response)
            this.term.write(`\r\n${response}\r\n`);
    }

    cmdViewFile(args: string[]) {
        if (args.length == 0) {
            const response = `cat: please provider the file name to open.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }
        
        const fullArg = args.join(' ');
        const valid = this.validateNameArg(fullArg, args.length);
        if (valid == -1) {
            const response = `cd: invalid file name, you may use quotes (' or ") for a long name.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        const fileName = valid == 1 ? fullArg.slice(1, fullArg.length - 1) : fullArg;
        let targetFile: ShellFile | null = null;
        for (let file of this.dir.files) {
            if (file.getFullName() == fileName) {
                targetFile = file;
                break;
            }
        }

        if (!targetFile) {
            const response = `cd: file "${fileName}" not found`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        this.term.write(`\r\n${targetFile.content}\r\n`);
    }

    cmdRouteFromFile(args: string[]) {
        if (args.length == 0) {
            const response = `route: please provider the file name to open.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }
        
        const fullArg = args.join(' ');
        const valid = this.validateNameArg(fullArg, args.length);
        if (valid == -1) {
            const response = `route: invalid file name, you may use quotes (' or ") for a long name.`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        const fileName = valid == 1 ? fullArg.slice(1, fullArg.length - 1) : fullArg;
        let targetFile: ShellFile | null = null;
        for (let file of this.dir.files) {
            if (file.getFullName() == fileName) {
                targetFile = file;
                break;
            }
        }

        if (!targetFile) {
            const response = `route: file "${fileName}" not found`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        this.term.write(`\r\nrouting to ${targetFile.content}...\r\n`);

        window.location.href = targetFile.content;
    }

    cmdClear(args: string[]) {
        if (args.length > 0) {
            const response = `clear: no arguments match "${args.join(' ')}".`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }
        
        this.term.clear();
        this.term.write('\x1b[2K\x1b[A');
    }

    cmdExit(args: string[]) {
        if (args.length > 0) {
            const response = `exit: no arguments match "${args.join(' ')}".`;
            this.term.write(`\r\n${response}\r\n`);
            return;
        }

        this.exitFunc?.();
    }

    initRootDir() {
        // something to init the whole dir tree
        // set parent recursively
        const setParent = (node: ShellDir) => {
            for (let child of node.children) {
                child.parent = node;
                setParent(child);
            }
        };

        setParent(this.dir);
    }

    getPath(): string {
        return this.path.join('/');
    }

    validateNameArg(fullArg: string, argLen: number): number {
        let quoteSingle = 0;
        let quoteDouble = 0;
        for (let c of fullArg) {
            if (c == "'")
                quoteSingle++;
            if (c == '"')
                quoteDouble++;
        }

        // validation if argument contains quotes (double/single)
        let valid = fullArg.length > 2 && ((fullArg[0] == "'" && fullArg[fullArg.length - 1] == "'" && quoteSingle === 2 && quoteDouble === 0) ||
            (fullArg[0] == '"' && fullArg[fullArg.length - 1] == '"' && quoteSingle === 0 && quoteDouble === 2));
        
        // with quote
        if (valid) return 1;
        if (argLen == 1 && quoteSingle == 0 && quoteDouble == 0) return 0;

        // invalid
        return -1;
    }
}

export class ShellFile {
    name: string = '';
    ext: string = '';
    content: string = '';
    
    constructor(name: string, ext: string, content: string) {
        this.name = name;
        this.ext = ext;
        this.content = content;
    }

    getFullName = () => this.name + this.ext;

    // TODO: add some behaviours for different extensions
    // sort of 'play music' maybe (?)
}

export class ShellDir {
    name: string;
    parent: ShellDir | null = null;
    children: ShellDir[] = [];
    files: ShellFile[] = [];

    constructor(name: string, children: ShellDir[], files: ShellFile[]) {
        this.name = name;
        this.children = children;
        this.files = files;
    }
}

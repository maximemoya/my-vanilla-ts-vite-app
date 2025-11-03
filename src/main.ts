/* main.ts - Vanilla TypeScript Hacknet-like terminal prototype
   - No frameworks, uses DOM + IndexedDB + WebCrypto (optionnel)
   - Drop into Vite vanilla-ts
*/

import { authorityCompare, type Authority } from "./computer/authority/Authority";
import { Computer } from "./computer/Computer";
import MyFile from "./computer/elements/File";
import { Folder } from "./computer/elements/Folder";

// Types
type FileNode = { type: "file"; content: string } | { type: "dir"; children: Record<string, FileNode> };
type MemoryState = { total: number; used: number };

const MEM_MAX_SIZE = 512;

// Database Manager
class DatabaseManager {
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("HacknetProtoDB", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async put(key: string, value: any): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((res, rej) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const db = await this.openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(key);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror = () => rej(req.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((res, rej) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
}

// File System Manager
class FileSystemManager {

  private ownerComputer: Computer;

  private currentComputer: Computer;
  private currentFolder: Folder;

  constructor() {

    this.ownerComputer = new Computer("192.168.0.42", "wax", "wax")
      .withPasswordAuthUser("user")
      .withPasswordAuthAdmin("admin")
      .withMainFolder(
        new Folder("main").withFiles(
          [
            new MyFile("f1admin.txt", "le contenu du fichier admin", "admin"),
            new MyFile("f1user.txt", "le contenu du fichier user", "user"),
            new MyFile("f1guest.txt", "le contenu du fichier guest", "guest"),
          ]
        ).withChildrenFolder(
          [
            new Folder("intro").withFiles([new MyFile("readme.txt", "un nouveau contenu"), new MyFile("secret.txt", "code Bob => bob", "admin")]),
            new Folder("folderAdmin", "admin"),
            new Folder("folderUser", "user"),
            new Folder("folderGuest", "guest"),
          ]
        )
      )
      .withComputersLinked(
        [
          new Computer("192.168.2.1", "Bob", "bob"),
          new Computer("192.168.0.254", "Fry"),
          new Computer("192.168.14.9", "Mey"),
          new Computer("193.169.1.11", "Dan"),
        ]
      )

    this.currentComputer = this.ownerComputer
    this.currentFolder = this.currentComputer.mainFolder

  }

  getOwnerComputer(): Computer {
    return this.ownerComputer;
  }

  setOwnerComputer(newOwnerComputer: Computer): void {
    this.ownerComputer = newOwnerComputer;
  }

  getCurrentComputer(): Computer {
    return this.currentComputer;
  }

  setCurrentComputer(newCurrentComputer: Computer): void {
    this.currentComputer = newCurrentComputer;
    this.currentFolder = this.currentComputer.mainFolder
  }

  getCurrentFolder(): Folder {
    return this.currentFolder;
  }

  setCurrentFolder(newCurrentFolder: Folder): void {
    this.currentFolder = newCurrentFolder
  }

}

// Memory Manager
class MemoryManager {
  private memory: MemoryState;

  constructor() {
    this.memory = { total: MEM_MAX_SIZE, used: 0 };
  }

  getMemory(): MemoryState {
    return this.memory;
  }

  setMemory(memory: MemoryState): void {
    this.memory = memory;
  }

  allocate(amount: number): boolean {
    if (this.memory.used + amount > this.memory.total) return false;
    this.memory.used += amount;
    return true;
  }

  free(amount: number): void {
    this.memory.used = Math.max(0, this.memory.used - amount);
  }

  reset(): void {
    this.memory = { total: MEM_MAX_SIZE, used: 0 };
  }
}

// UI Manager
class UIManager {
  private output: HTMLDivElement;
  private cwdEl: HTMLDivElement;
  private memUsedEl: HTMLSpanElement;
  private memTotEl: HTMLSpanElement;
  private connBadge: HTMLDivElement;

  constructor() {
    this.output = document.getElementById("output") as HTMLDivElement;
    this.cwdEl = document.getElementById("cwd") as HTMLDivElement;
    this.memUsedEl = document.getElementById("memUsed") as HTMLSpanElement;
    this.memTotEl = document.getElementById("memTot") as HTMLSpanElement;
    this.connBadge = document.getElementById("connBadge") as HTMLDivElement;
  }

  writeLine(text: string, cls?: string): void {
    const d = document.createElement("div");
    d.className = "line" + (cls ? " " + cls : "");
    d.textContent = text;
    this.output.appendChild(d);
    this.output.scrollTop = this.output.scrollHeight;
  }

  writePromptLine(text: string): void {
    const d = document.createElement("div");
    d.className = "line";
    d.innerHTML = `<span class="prompt">> </span>${this.escapeHtml(text)}`;
    this.output.appendChild(d);
    this.output.scrollTop = this.output.scrollHeight;
  }

  clearOutput(): void {
    this.output.innerHTML = "";
  }

  updateMemoryUI(memory: MemoryState): void {
    this.memUsedEl.textContent = String(memory.used);
    this.memTotEl.textContent = String(memory.total);
  }

  updatePrompt(cwd: string, isConnected: boolean, authority: Authority): void {
    this.cwdEl.classList.remove("cwdAuthAdmin", "cwdAuthUser", "cwdAuthGuest");
    switch (authority) {
      case "admin":
        this.cwdEl.classList.add("cwdAuthAdmin");
        break;
      case "user":
        this.cwdEl.classList.add("cwdAuthUser");
        break;
      case "guest":
        this.cwdEl.classList.add("cwdAuthGuest");
        break;
    }
    this.cwdEl.textContent = cwd + (isConnected ? "#" : "$");
  }

  updateConnectionBadge(isConnected: boolean): void {
    this.connBadge.textContent = isConnected ? "connected" : "offline";
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// Network Manager
class NetworkManager {
  public isConnected: boolean = false;
  isCurrentlyConnected(): boolean {
    return this.isConnected;
  }
}

// Main Terminal Class
class Terminal {
  private db: DatabaseManager;
  private fs: FileSystemManager;
  private memory: MemoryManager;
  private ui: UIManager;
  private network: NetworkManager;
  private form: HTMLFormElement;
  private cmdInput: HTMLInputElement;

  constructor() {
    this.db = new DatabaseManager();
    this.fs = new FileSystemManager();
    this.memory = new MemoryManager();
    this.ui = new UIManager();
    this.network = new NetworkManager();

    this.form = document.getElementById("form") as HTMLFormElement;
    this.cmdInput = document.getElementById("cmd") as HTMLInputElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const raw = this.cmdInput.value.trim();
      if (!raw) return;
      this.ui.writePromptLine(raw);
      this.cmdInput.value = "";
      const parts = raw.split(/\s+/);
      const name = parts[0];
      const args = parts.slice(1);
      await this.executeCommand(name, args);
    });

    this.cmdInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Tab") {
        ev.preventDefault();
        const keys = Object.keys(this.getCommands());
        const val = this.cmdInput.value;
        const match = keys.find(k => k.startsWith(val));
        if (match) this.cmdInput.value = match + " ";
      }
    });
  }

  private async executeCommand(name: string, args: string[]): Promise<void> {
    const commands = this.getCommands();
    const cmd = commands[name];
    if (!cmd) {
      this.ui.writeLine(`${name}: commande inconnue. Tape 'help'.`);
      return;
    }
    try {
      await cmd(args);
    } catch (err: any) {
      console.error(err);
      this.ui.writeLine(`Erreur: ${err?.message ?? String(err)}`);
    }
  }

  private getCommands(): Record<string, (args: string[]) => Promise<void>> {
    return {

      changeAuth: async (args) => {
        const value = args[0];
        const password = args[1];

        if (!["admin", "user", "guest"].includes(value)) {
          this.ui.writeLine("Error command, usage: changeAuth <admin | user | guest> <?password>");
          return;
        }

        const computer = this.fs.getCurrentComputer();
        const currentAuth = computer.authority;

        // Helper function to change authority and update UI
        const changeToAuth = (newAuth: "admin" | "user" | "guest") => {
          computer.authority = newAuth;
          this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), newAuth);
          this.ui.writeLine(`you are now connected as ${newAuth}`);
        };

        // Helper function to check password and change auth
        const checkPasswordAndChange = (targetAuth: "admin" | "user" | "guest", requiredPassword: string) => {
          if (requiredPassword === "") {
            changeToAuth(targetAuth);
            return true;
          }

          if (password && requiredPassword === password) {
            changeToAuth(targetAuth);
            return true;
          }

          this.ui.writeLine("Error wrong password, usage: changeAuth <admin | user | guest> <?password>");
          return false;
        };

        // Type assertion since we've already validated the value
        const targetAuth = value as "admin" | "user" | "guest";

        // Admin can change to any authority without password
        if (currentAuth === "admin") {
          changeToAuth(targetAuth);
          return;
        }

        // Handle specific authority changes
        switch (targetAuth) {
          case "admin":
            checkPasswordAndChange("admin", computer.passwordAuthAdmin);
            break;

          case "user":
            if (currentAuth === "user") {
              this.ui.writeLine("you are now connected as user");
            } else {
              checkPasswordAndChange("user", computer.passwordAuthUser);
            }
            break;

          case "guest":
            if (currentAuth === "guest") {
              this.ui.writeLine("you are now connected as guest");
            } else {
              changeToAuth("guest");
            }
            break;
        }
      },

      help: async () => {
        this.ui.writeLine("Commandes: help, ls, cat, pwd, cd, echo, scan, connect, changeAuth, run, mem, clear, whoami, save, load, reset");
        this.ui.writeLine("Ex: ls, cat readme.txt, cd /home, scan, connect <1.2.0.7> <name> <?password>, changeAuth <admin | user | guest> <?password>, run tracer, save/load fs (IndexedDB)");
      },

      ls: async () => {
        const currentFolder = this.fs.getCurrentFolder()
        const names: String[] = []
        if (currentFolder.files) {
          names.push(...currentFolder.files.filter(
            file => authorityCompare(this.fs.getCurrentComputer().authority, file.accessAuthorityLevel)
          ).map(f => f.name))
        }
        if (currentFolder.children) {
          names.push(...currentFolder.children.filter(
            folder => authorityCompare(this.fs.getCurrentComputer().authority, folder.accessAuthorityLevel)
          ).map(f => f.name))
        }
        this.ui.writeLine(names.join("  ") || "");
      },

      pwd: async () => this.ui.writeLine(this.fs.getCurrentFolder().fullPathName),

      cd: async (args) => {
        const path = args[0];
        if (!path) return this.ui.writeLine("Usage: cd <folder> or ../");
        const currentFolder = this.fs.getCurrentFolder()
        if (path === "../") {
          if (currentFolder.parent) {
            this.fs.setCurrentFolder(currentFolder.parent)
            this.ui.writeLine(`currentFolder : ` + currentFolder.parent.name)
            this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), this.fs.getCurrentComputer().authority);
            return
          }
          this.ui.writeLine(`error : no parent folder.`)
          return
        }
        const childFolder = currentFolder.children?.find(folder => folder.name === path)
        if (childFolder) {
          if (authorityCompare(this.fs.getCurrentComputer().authority, childFolder.accessAuthorityLevel)) {
            this.fs.setCurrentFolder(childFolder)
            this.ui.writeLine(`currentFolder : ` + childFolder.name)
            this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), this.fs.getCurrentComputer().authority);
            return
          }
        }
        this.ui.writeLine(`error : folder does not exist with name "` + path + `"`)
        return
      },

      cat: async (args) => {
        const path = args[0];
        if (!path) return this.ui.writeLine("Usage: cat <file>");
        const currentFolder = this.fs.getCurrentFolder()
        if (currentFolder.files && currentFolder.files.length > 0) {
          const file = currentFolder.files?.find(file => file.name === path)
          if (file) {
            if (authorityCompare(this.fs.getCurrentComputer().authority, file.accessAuthorityLevel)) {
              this.ui.writeLine(file.content)
              return
            }
          }
        }
        this.ui.writeLine(`error : file does not exist with name "` + path + `"`)
        return
      },

      echo: async (args) => this.ui.writeLine(args.join(" ")),

      whoami: async () => this.ui.writeLine("guest"),

      clear: async () => {
        this.ui.clearOutput();
        this.init();
      },

      mem: async () => {
        const mem = this.memory.getMemory();
        this.ui.writeLine(`Memory: ${mem.used}/${mem.total} Mo used`);
      },

      scan: async () => {
        this.ui.writeLine("Scanning network...");
        const computersLinked: Computer[] = this.fs.getCurrentComputer().computersLinked
        if (computersLinked.length === 0) {
          await this.delay(500)
          this.ui.writeLine(`none`)
        }
        for (const computer of computersLinked) {
          await this.delay(Math.random() * 500 + 250)
          this.ui.writeLine(`${computer.addressIp}\t${computer.name}`);
        }
        this.ui.writeLine(`Scanning network completed`);
      },

      connect: async (args) => {
        const ip = args[0]
        const name = args[1]
        const password = args[2] ? args[2] : ""
        if (!ip || !name) return this.ui.writeLine("Usage: connect <ip> <name> <?password>");
        this.ui.writeLine(`try to connect to ${args} ...`);
        await this.delay(500)
        const newCurrentComputer = this.fs.getCurrentComputer().computersLinked.find(c => c.addressIp === ip && c.name === name && ((c.password) ? c.password === password : true))
        if (!newCurrentComputer) {
          this.ui.writeLine(`connexion to ${args} failed, please check ip and name by using scan or maybe you have wrong password `);
          return
        }
        this.network.isConnected = true
        this.fs.setCurrentComputer(newCurrentComputer)
        this.fs.getCurrentComputer().authority = "guest"
        this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), this.fs.getCurrentComputer().authority);
        this.ui.updateConnectionBadge(true);
        this.ui.writeLine(`connexion succeed, you are now connected to ${this.fs.getCurrentComputer().addressIp} ${this.fs.getCurrentComputer().name} => ${this.fs.getCurrentFolder().name}`);
        return
      },

      disconnect: async () => {
        this.ui.writeLine(`disconnecting...`);
        await this.delay(Math.random() * 1000 + 500)
        this.network.isConnected = false
        this.fs.setCurrentComputer(this.fs.getOwnerComputer())
        this.fs.getCurrentComputer().authority = "admin"
        this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), this.fs.getCurrentComputer().authority);
        this.ui.updateConnectionBadge(false);
        this.ui.writeLine(`disconnect succeed, you are now back to ${this.fs.getCurrentComputer().addressIp} ${this.fs.getCurrentComputer().name} => ${this.fs.getCurrentFolder().name}`);
        return
      },

      run: async (args) => {
        const tool = args[0] ?? "ping";
        const memCost = tool === "tracer" ? 256 : 128;
        if (!this.memory.allocate(memCost)) {
          return this.ui.writeLine(`run: mémoire insuffisante pour ${tool} (besoin ${memCost} Mo)`);
        }
        this.ui.writeLine(`Lancement de ${tool}... (consomme ${memCost} Mo)`);
        this.ui.updateMemoryUI(this.memory.getMemory());
        await this.delay(1500 + Math.random() * 2500);
        this.ui.writeLine(`${tool}: terminé.`);
        this.memory.free(memCost);
        this.ui.updateMemoryUI(this.memory.getMemory());
      },

      save: async () => {
        // await this.db.put("fs", this.fs.getFileSystem());
        // await this.db.put("memory", this.memory.getMemory());
        this.ui.writeLine("work in progress...");
      },

      load: async () => {
        // const savedFS = await this.db.get<Record<string, FileNode>>("fs");
        // const savedMem = await this.db.get<MemoryState>("memory");
        // if (savedFS) {
        //   this.fs.setFileSystem(savedFS);
        //   this.ui.writeLine("FS chargé depuis IndexedDB.");
        // }
        // else this.ui.writeLine("Aucune FS trouvée dans IndexedDB.");
        // if (savedMem) {
        //   this.memory.setMemory(savedMem);
        //   this.ui.updateMemoryUI(this.memory.getMemory());
        // }
        this.ui.writeLine("work in progress...");
      },

      reset: async () => {
        // this.fs.reset();
        this.memory.reset();
        this.ui.updateMemoryUI(this.memory.getMemory());
        await this.db.delete("fs");
        await this.db.delete("memory");
        this.ui.writeLine("Reset: FS remis par défaut et IndexedDB nettoyée.");
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  async init(): Promise<void> {
    this.ui.writeLine("Hacknet-like terminal prototype (Vanilla TS)");
    this.ui.writeLine("Tape 'help' pour commencer.");
    this.ui.updateMemoryUI(this.memory.getMemory());
    this.ui.updatePrompt(this.getPromptToUpdate(), this.network.isCurrentlyConnected(), this.fs.getCurrentComputer().authority);

    // Try autoload FS if exists
    const saved = await this.db.get<Record<string, FileNode>>("fs");
    if (saved) {
      // this.fs.setFileSystem(saved);
      this.ui.writeLine("load from db.get fs => work in progress...");
    }
  }

  private getPromptToUpdate(): string {
    return this.fs.getCurrentComputer().addressIp + " " + this.fs.getCurrentComputer().name + `[${this.fs.getCurrentComputer().authority.toUpperCase()}]` + " => " + this.fs.getCurrentFolder().fullPathName
  }

}

// Initialize the terminal
const terminal = new Terminal();
terminal.init();

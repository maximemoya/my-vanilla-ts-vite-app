# Gemini Project Context: Hacknet Simulator Game

## 1. Project Overview

This project is a "Hacknet-like" terminal simulator game built with Vanilla TypeScript and Vite. It runs entirely in the browser and simulates a basic command-line interface for navigating a virtual computer network, interacting with files, and managing system resources like memory. The UI is styled to resemble a classic terminal. Persistence is planned via IndexedDB, though it is currently a work-in-progress.

## 2. Technologies

- **Build Tool:** Vite
- **Language:** TypeScript (with a strict configuration)
- **UI:** Vanilla DOM manipulation (no frameworks like React or Vue)
- **Styling:** Plain CSS within `index.html`
- **Persistence:** IndexedDB (managed by `DatabaseManager`)

## 3. Project Structure

- `index.html`: The main HTML file that defines the terminal layout and loads the application script.
- `package.json`: Defines project metadata, scripts (`dev`, `build`, `preview`), and dependencies (Vite, TypeScript).
- `vite.config.ts`: Configures Vite to build the project into the `docs/` directory, likely for deployment on GitHub Pages.
- `tsconfig.json`: TypeScript compiler configuration.
- `src/`: Contains all the application source code.
  - `main.ts`: The main entry point. It initializes and orchestrates all the different components of the application.
  - `computer/`: Contains the core data models for the simulation.
    - `Computer.ts`: Defines the `Computer` class, representing a machine in the network.
    - `elements/`: Defines the file system components.
      - `File.ts`: The `MyFile` class.
      - `Folder.ts`: The `Folder` class.
    - `authority/`:
      - `Authority.ts`: Defines the permission levels (`guest`, `user`, `admin`) and the logic for comparing them.

## 4. Core Concepts & Architecture

The application is managed by the main `Terminal` class in `main.ts`, which coordinates several manager classes:

- **`Terminal`**: The central orchestrator. It handles command input, execution, and ties all other managers together.
- **`UIManager`**: Manages all interactions with the DOM. It's responsible for printing output to the terminal, updating the command prompt, and displaying status information (memory, connection).
- **`FileSystemManager`**: Manages the state of the virtual file system. It holds the player's computer (`ownerComputer`), the currently connected computer (`currentComputer`), and the current directory (`currentFolder`). It also initializes the network of computers and their file structures.
- **`DatabaseManager`**: A wrapper for IndexedDB to provide simple key-value storage (`get`, `put`, `delete`). Used for saving and loading game state.
- **`MemoryManager`**: Simulates a simple RAM model. Commands like `run` can consume memory, which is tracked by this manager.
- **`NetworkManager`**: A simple state machine to track if the user is connected to a remote computer or not.

### Data Models:

- **`Computer`**: A node in the network. It has an IP, name, passwords for different authority levels, a root folder (`mainFolder`), and an array of other `Computer` objects it can connect to (`computersLinked`).
- **`Folder`**: A directory that can contain `MyFile`s and other `Folder`s. It tracks its parent to allow for path calculations (`fullPathName`) and `cd ..` navigation.
- **`MyFile`**: A file with a name, content, and an `accessAuthorityLevel`.
- **`Authority`**: A type defining three permission levels: `"guest"`, `"user"`, and `"admin"`. The `authorityCompare` function is crucial for checking if the current user's authority is sufficient to access a file or folder.

## 5. Application Flow & Commands

1.  **Initialization**: `index.html` loads, and `main.ts` creates a `Terminal` instance. `terminal.init()` is called.
2.  **Command Loop**: The user types a command and presses Enter.
3.  **Execution**: The `Terminal` class parses the command, finds the corresponding function in its command map, and executes it.
4.  **State Update**: The command function interacts with the managers (e.g., `FileSystemManager` to change directory, `UIManager` to print output).

### Key Commands:

- `help`: Lists available commands.
- `ls`: Lists files and directories in the current folder, respecting authority levels.
- `cd <path>`: Changes the current directory.
- `cat <file>`: Displays the content of a file, respecting authority levels.
- `scan`: Lists computers visible on the current network.
- `connect <ip> <name> [password]`: Connects to another computer.
- `disconnect`: Returns to the owner's computer.
- `changeAuth <level> [password]`: Attempts to elevate or change the authority level on the current computer.
- `save`/`load`: (WIP) Intended to persist the game state to IndexedDB.

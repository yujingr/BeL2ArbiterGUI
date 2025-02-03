// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

// Enhanced function to get absolute path to go binary
const getGoBinaryPath = () => {
  return new Promise((resolve, reject) => {
    // Common Go installation paths on macOS
    const commonMacPaths = [
      "/usr/local/go/bin/go",
      "/usr/local/bin/go",
      "/opt/homebrew/bin/go",
      "/opt/local/bin/go",
      `${process.env.HOME}/go/bin/go`,
      `${process.env.HOME}/.go/bin/go`,
    ];

    if (process.platform === "darwin") {
      // First try the which command
      exec("which go", (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim());
          return;
        }

        // If which fails, check common installation paths
        for (const goPath of commonMacPaths) {
          if (fs.existsSync(goPath)) {
            resolve(goPath);
            return;
          }
        }

        reject(
          new Error(
            "Go binary not found. Please ensure Go is installed and properly configured."
          )
        );
      });
    } else if (process.platform === "win32") {
      exec("where go", (error, stdout) => {
        if (error) {
          resolve("go"); // fallback to PATH
        } else {
          resolve(stdout.trim().split("\n")[0]);
        }
      });
    } else {
      // For other platforms
      exec("which go", (error, stdout) => {
        if (error) {
          resolve("go"); // fallback to PATH
        } else {
          resolve(stdout.trim());
        }
      });
    }
  });
};

// Add new function to check Git binary path
const getGitBinaryPath = () => {
  return new Promise((resolve, reject) => {
    if (process.platform === "win32") {
      // Common Git installation paths on Windows
      const commonWinPaths = [
        "C:\\Program Files\\Git\\cmd\\git.exe",
        "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
        `${process.env.LOCALAPPDATA}\\Programs\\Git\\cmd\\git.exe`,
        `${process.env.ProgramFiles}\\Git\\cmd\\git.exe`,
      ];

      exec("where git", (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim().split("\n")[0]);
          return;
        }

        // If where fails, check common installation paths
        for (const gitPath of commonWinPaths) {
          if (fs.existsSync(gitPath)) {
            resolve(gitPath);
            return;
          }
        }

        reject(
          new Error("Git binary not found. Please ensure Git is installed.")
        );
      });
    } else {
      // For macOS and Linux
      exec("which git", (error, stdout) => {
        if (!error && stdout.trim()) {
          resolve(stdout.trim());
          return;
        }

        // Common Unix-like system paths
        const commonUnixPaths = [
          "/usr/bin/git",
          "/usr/local/bin/git",
          "/opt/local/bin/git",
          "/opt/homebrew/bin/git",
        ];

        for (const gitPath of commonUnixPaths) {
          if (fs.existsSync(gitPath)) {
            resolve(gitPath);
            return;
          }
        }

        reject(
          new Error("Git binary not found. Please ensure Git is installed.")
        );
      });
    }
  });
};

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");

  // Add Go installation check when window is created
  checkInitialGoInstallation(win);

  // Add window close handler
  win.on("close", () => {
    if (global.childProcess) {
      global.childProcess.kill();
      global.childProcess = null;
    }
    // Clean up IPC handlers
    ipcMain.removeHandler("submit-input");
  });

  return win;
}

// Modify the checkInitialGoInstallation function to also check Git
async function checkInitialGoInstallation(win) {
  try {
    // Check Go installation
    const goBin = await getGoBinaryPath();
    win.webContents.send(
      "command-output",
      `Checking for Go installation...\nFound Go at: ${goBin}\n`
    );

    const goResult = await new Promise((resolve, reject) => {
      exec(`"${goBin}" version`, (error, stdout, stderr) => {
        if (error || stderr) {
          reject(new Error(error ? error.message : stderr));
        } else {
          resolve(stdout);
        }
      });
    });

    // Check Git installation
    const gitBin = await getGitBinaryPath();
    win.webContents.send(
      "command-output",
      `Checking for Git installation...\nFound Git at: ${gitBin}\n`
    );

    const gitResult = await new Promise((resolve, reject) => {
      exec(`"${gitBin}" --version`, (error, stdout, stderr) => {
        if (error || stderr) {
          reject(new Error(error ? error.message : stderr));
        } else {
          resolve(stdout);
        }
      });
    });

    win.webContents.send("installation-check-result", {
      go: {
        installed: true,
        version: goResult.trim(),
      },
      git: {
        installed: true,
        version: gitResult.trim(),
      },
    });
  } catch (error) {
    win.webContents.send(
      "command-output",
      `Error checking installations: ${error.message}\n`
    );
    win.webContents.send("installation-check-result", {
      go: {
        installed: false,
        error: error.message,
      },
      git: {
        installed: false,
        error: error.message,
      },
    });
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.filePaths[0];
});

ipcMain.handle("run-commands", async (event, folderPath) => {
  return new Promise((resolve, reject) => {
    let btcPrivateKey = "";
    let escPrivateKey = "";
    let password = "";
    let escArbiterAddress = "";
    let currentPrompt = "btc";
    let childProcess = null;

    // Store childProcess globally so we can access it during cleanup
    global.childProcess = childProcess;

    // Enhance checkGoInstallation to use the new getGoBinaryPath
    const checkGoInstallation = async () => {
      try {
        const goBin = await getGoBinaryPath();
        return new Promise((resolve, reject) => {
          exec(`"${goBin}" version`, (error, stdout, stderr) => {
            if (error) {
              const errorMsg = `Failed to check Go installation:\n${error.message}\n${stderr}`;
              event.sender.send("command-output", `Error: ${errorMsg}\n`);
              reject(new Error(errorMsg));
            } else {
              event.sender.send(
                "command-output",
                `Go installation found: ${stdout}\n`
              );
              resolve();
            }
          });
        });
      } catch (error) {
        throw error;
      }
    };

    // Function to check if setup is complete
    const isSetupComplete = () => {
      const arbiterPath = path.join(folderPath, "Arbiter_Signer");
      const btcKeyPath = path.join(arbiterPath, "app/arbiter/data/keys/btcKey");
      const escKeyPath = path.join(arbiterPath, "app/arbiter/data/keys/escKey");

      return (
        fs.existsSync(arbiterPath) &&
        fs.existsSync(btcKeyPath) &&
        fs.existsSync(escKeyPath)
      );
    };

    // Modify runMainProgram with enhanced error handling
    const runMainProgram = async () => {
      try {
        const goBin = await getGoBinaryPath();

        // Add go mod tidy before running the main program
        const goModTidyCommand = `cd "${folderPath}/Arbiter_Signer" && "${goBin}" mod tidy`;
        event.sender.send("command-output", "Running go mod tidy...\n");

        await new Promise((resolve, reject) => {
          exec(goModTidyCommand, (error, stdout, stderr) => {
            if (error) {
              const errorMsg = `go mod tidy failed:\nError: ${error.message}\nStderr: ${stderr}`;
              event.sender.send("command-output", `Error: ${errorMsg}\n`);
              reject(new Error(errorMsg));
              return;
            }
            event.sender.send(
              "command-output",
              "go mod tidy completed successfully\n"
            );
            resolve();
          });
        });

        const command = `cd "${folderPath}/Arbiter_Signer" && "${goBin}" run app/arbiter/main.go`;

        event.sender.send("command-output", `Executing command: ${command}\n`);

        childProcess = exec(command, {
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        });
        global.childProcess = childProcess; // Update global reference

        // Add error handler for broken pipe
        childProcess.stdin.on("error", (error) => {
          if (error.code === "EPIPE") {
            // Ignore broken pipe errors during shutdown
            return;
          }
          event.sender.send(
            "command-output",
            `Stdin error: ${error.message}\n`
          );
        });

        // Stream stdout in real-time
        childProcess.stdout.on("data", (data) => {
          const output = data.toString();
          event.sender.send("command-output", output);

          if (
            output.includes("?") ||
            output.toLowerCase().includes("enter") ||
            output.toLowerCase().includes("input")
          ) {
            event.sender.send("prompt-input", output);
          }
        });

        // Enhanced stderr handling
        childProcess.stderr.on("data", (data) => {
          const errorOutput = data.toString();
          event.sender.send("command-output", `Error output: ${errorOutput}`);
        });

        childProcess.on("close", (code) => {
          if (code === 0) {
            resolve("Process completed successfully");
          } else {
            const errorMsg = `Process exited with code ${code}. This might indicate a problem with the command execution.`;
            event.sender.send("command-output", `Error: ${errorMsg}\n`);
            reject(new Error(errorMsg));
          }
        });

        childProcess.on("error", (error) => {
          const errorMsg = `Failed to start process: ${error.message}`;
          event.sender.send("command-output", `Error: ${errorMsg}\n`);
          reject(new Error(errorMsg));
        });
      } catch (error) {
        const errorMsg = `Failed to run main program: ${error.message}`;
        event.sender.send("command-output", `Error: ${errorMsg}\n`);
        reject(new Error(errorMsg));
      }
    };

    // Modify runKeystoreCommands with enhanced error handling
    const runKeystoreCommands = async () => {
      try {
        const goBin = await getGoBinaryPath();
        const arbiterPath = path.join(folderPath, "Arbiter_Signer");
        let cloneCommand = "";

        if (
          fs.existsSync(arbiterPath) &&
          fs.readdirSync(arbiterPath).length > 0
        ) {
          event.sender.send(
            "command-output",
            "Directory already exists, skipping clone...\n"
          );
          cloneCommand = `cd "${folderPath}"`;
        } else {
          cloneCommand = `cd "${folderPath}" && git clone https://github.com/BeL2Labs/Arbiter_Signer/ Arbiter_Signer`;
        }

        exec(cloneCommand, async (error, stdout, stderr) => {
          if (error) {
            const errorMsg = `Directory setup failed:\nError: ${error.message}\nStderr: ${stderr}\nCommand: ${cloneCommand}`;
            event.sender.send("command-output", `Error: ${errorMsg}\n`);
            reject(new Error(errorMsg));
            return;
          }

          // Add go mod tidy before other commands
          const goModTidyCommand = `cd "${folderPath}/Arbiter_Signer" && "${goBin}" mod tidy`;
          event.sender.send("command-output", "Running go mod tidy...\n");

          exec(goModTidyCommand, (error, stdout, stderr) => {
            if (error) {
              const errorMsg = `go mod tidy failed:\nError: ${error.message}\nStderr: ${stderr}`;
              event.sender.send("command-output", `Error: ${errorMsg}\n`);
              reject(new Error(errorMsg));
              return;
            }

            event.sender.send(
              "command-output",
              "go mod tidy completed successfully\n"
            );

            // Config file update with better error handling
            const configPath = path.join(
              folderPath,
              "Arbiter_Signer/app/arbiter/manifest/config/config.yaml"
            );
            try {
              let configContent = fs.readFileSync(configPath, "utf8");
              configContent = configContent.replace(
                /escArbiterAddress: ".*"/,
                `escArbiterAddress: "${escArbiterAddress}"`
              );
              fs.writeFileSync(configPath, configContent);
              event.sender.send(
                "command-output",
                "Successfully updated config file\n"
              );
            } catch (error) {
              const errorMsg = `Config update failed:\n${error.message}\nPath: ${configPath}`;
              event.sender.send("command-output", `Error: ${errorMsg}\n`);
              reject(new Error(errorMsg));
              return;
            }

            // Now run the remaining commands
            const mkdirCommand =
              process.platform === "win32"
                ? `if not exist "app\\arbiter\\data\\keys" mkdir "app\\arbiter\\data\\keys"`
                : `mkdir -p app/arbiter/data/keys`;

            const remainingCommands = [
              `cd "${folderPath}/Arbiter_Signer"`,
              mkdirCommand,
              // For Windows, we need to run go mod tidy in both directories and use proper path separators
              `"${goBin}" mod tidy`,
              `cd app\\keystore-generator && "${goBin}" mod tidy`,
              `cd .. && "${goBin}" run .\\keystore-generator\\main.go -c btc -s ${btcPrivateKey} -p ${password} -o .\\arbiter\\data\\keys\\btcKey`,
              `"${goBin}" run .\\keystore-generator\\main.go -c eth -s ${escPrivateKey} -p ${password} -o .\\arbiter\\data\\keys\\escKey`,
              `cd .\\arbiter && "${goBin}" mod tidy`,
              `"${goBin}" run main.go`,
            ].join(" && ");

            event.sender.send(
              "command-output",
              `Executing commands with the following configuration:\n` +
                `Working directory: ${folderPath}/Arbiter_Signer\n` +
                `Go binary: ${goBin}\n` +
                `Platform: ${process.platform}\n` +
                `Commands to run: ${remainingCommands}\n`
            );

            childProcess = exec(remainingCommands, {
              stdin: "pipe",
              stdout: "pipe",
              stderr: "pipe",
            });
            global.childProcess = childProcess; // Update global reference

            // Add error handler for broken pipe
            childProcess.stdin.on("error", (error) => {
              if (error.code === "EPIPE") {
                // Ignore broken pipe errors during shutdown
                return;
              }
              event.sender.send(
                "command-output",
                `Stdin error: ${error.message}\n`
              );
            });

            // Stream stdout in real-time
            childProcess.stdout.on("data", (data) => {
              const output = data.toString();
              event.sender.send("command-output", output);

              if (
                output.includes("?") ||
                output.toLowerCase().includes("enter") ||
                output.toLowerCase().includes("input")
              ) {
                event.sender.send("prompt-input", output);
              }
            });

            // Enhanced stderr handling
            childProcess.stderr.on("data", (data) => {
              const errorOutput = data.toString();
              event.sender.send(
                "command-output",
                `Error output: ${errorOutput}`
              );
            });

            childProcess.on("close", (code) => {
              if (code === 0) {
                resolve("Process completed successfully");
              } else {
                const errorMsg = `Keystore commands failed with code ${code}. Check the error output above for details.`;
                event.sender.send("command-output", `Error: ${errorMsg}\n`);
                reject(new Error(errorMsg));
              }
            });

            childProcess.on("error", (error) => {
              const errorMsg = `Failed to execute keystore commands: ${error.message}`;
              event.sender.send("command-output", `Error: ${errorMsg}\n`);
              reject(new Error(errorMsg));
            });
          });
        });
      } catch (error) {
        const errorMsg = `Failed to run keystore commands: ${error.message}`;
        event.sender.send("command-output", `Error: ${errorMsg}\n`);
        reject(new Error(errorMsg));
      }
    };

    // Single handler for all input submissions
    ipcMain.handle("submit-input", async (event, input) => {
      if (childProcess) {
        // If childProcess exists, send input to it
        childProcess.stdin.write(input + "\n");
        event.sender.send("command-output", input + "\n");
      } else {
        // Otherwise handle the setup prompts
        switch (currentPrompt) {
          case "btc":
            btcPrivateKey = input;
            currentPrompt = "esc";
            event.sender.send(
              "prompt-input",
              "Please enter your ESC Private Key:"
            );
            break;
          case "esc":
            escPrivateKey = input;
            currentPrompt = "password";
            event.sender.send("prompt-input", "Please enter your Password:");
            break;
          case "password":
            password = input;
            currentPrompt = "arbiterAddress";
            event.sender.send(
              "prompt-input",
              "Please enter your ESC Arbiter Address:"
            );
            break;
          case "arbiterAddress":
            escArbiterAddress = input;
            event.sender.send(
              "command-output",
              "\nStarting keystore generation...\n"
            );
            runKeystoreCommands();
            break;
        }
      }
    });

    // Check Go installation before proceeding
    checkGoInstallation()
      .then(() => {
        // Continue with the existing logic
        if (isSetupComplete()) {
          event.sender.send(
            "command-output",
            "Setup already complete. Running main program...\n"
          );
          runMainProgram();
        } else {
          event.sender.send(
            "command-output",
            "Setup required. Starting setup process...\n"
          );
          event.sender.send(
            "prompt-input",
            "Please enter your BTC Private Key:"
          );
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
});

// Add cleanup on app quit
app.on("before-quit", () => {
  if (global.childProcess) {
    global.childProcess.kill();
    global.childProcess = null;
  }
});

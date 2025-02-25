# Arbiter Signer Setup UI

[![Build Status](https://github.com/yujingr/BeL2ArbiterGUI/workflows/Build%20and%20Release%20Electron%20App/badge.svg)](https://github.com/yujingr/BeL2ArbiterGUI/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A desktop application that provides an easy-to-use interface for setting up and running the [BeL2Labs Arbiter Signer](https://github.com/BeL2Labs/Arbiter_Signer).

> **Note**: macOS and Windows support is fully tested.

## Video Demo

[![Arbiter Signer Setup Demo](https://img.youtube.com/vi/ZvyuuJLKRNA/maxresdefault.jpg)](https://youtu.be/ZvyuuJLKRNA)

Click the image above to watch the demo video on YouTube.

## Features

- User-friendly GUI for Arbiter Signer setup and configuration
- Automated installation and configuration process
- Secure key management with password encryption
- Real-time output monitoring
- Cross-platform support (macOS tested, Windows and Linux in testing)

## Security Features

- Private keys are encrypted using user-selected password
- Keys are never stored in plaintext
- Secure input handling for sensitive information
- Password-protected keystore generation

## Prerequisites

- [Go](https://go.dev/dl/) 1.20 or newer
- [Git](https://git-scm.com/downloads) (for cloning repositories)
- Internet connection for initial setup

## Installation

### Pre-built Binaries

1. Download the latest release for your platform from the [Releases](https://github.com/yourusername/arbiter-signer-ui/releases) page:

   - macOS: `.dmg` or `.zip` file
   - Windows: Two `.exe` installers are provided:
     - `Arbiter.Signer.Setup.x.x.x.exe` (Recommended) - Git and Go installation checks working
     - `Arbiter.Signer.x.x.x.exe` - Basic version with Git and Go installation checks that may fail
   - Linux: `.AppImage`, `.deb`, or `.rpm` file (testing in progress)

2. Install the application:
   - macOS: Mount the DMG and drag to Applications
   - Windows:
     - Run the `Arbiter.Signer.Setup.x.x.x.exe` installer
     - Note: Some antivirus/security software may incorrectly flag the keystore-generator. You may need to add an exception or temporarily disable the antivirus during setup
   - Linux: Use your package manager or run the AppImage

### Building from Source

1. Prerequisites:

   - Node.js 16 or newer
   - npm or yarn
   - Git
   - Go 1.20 or newer

2. Clone the repository:

   ```bash
   git clone https://github.com/yujingr/BeL2ArbiterGUI.git
   cd BeL2ArbiterGUI
   ```

3. Install dependencies:

   ```bash
   npm install
   # or if using yarn
   yarn install
   ```

4. Build the application:

   ```bash
   npm run build
   # or if using yarn
   yarn build
   ```

5. Start the application in development mode:

   ```bash
   npm run start
   # or if using yarn
   yarn start
   ```

6. To create distributable packages:
   ```bash
   npm run dist
   # or if using yarn
   yarn dist
   ```
   The packaged applications will be available in the `dist` directory.

## Usage

1. Launch the Arbiter Signer Setup application
2. The application will automatically check for Go installation
3. Click "Select Folder & Start" to choose an installation directory
4. Follow the prompts to securely enter:
   - BTC Private Key (will be encrypted)
   - ESC Private Key (will be encrypted)
   - Encryption Password
   - ESC Arbiter Address
5. The application will automatically:
   - Clone the Arbiter Signer repository
   - Configure the environment
   - Generate encrypted keystores
   - Start the Arbiter Signer service

## Security Notes

- All private keys are encrypted using the password you provide
- Keys are stored in encrypted keystore files
- The password is required to decrypt and use the keys
- Never share your private keys or password
- The application never stores or transmits private keys in plaintext

## Configuration

The setup process will create a `config.yaml` file with the following structure:

```yaml
chain:
esc: "https://api.elastos.io/esc"
arbiter:
listener: true
signer: true
network: "mainnet"
escStartHeight: 21205821
escArbiterContractAddress: "0xD206be45b53Fa5C2065049c7a70B1aa1755a9475"
escArbiterManagerContractAddress: "0x54eE4fc8951A936b6AA02079B76c497c0471c52A"
escConfigManagerContractAddress: "0x4421c63241A262C423277FFA82C376953072d25f"
escArbiterAddress: "<Your-Arbiter-Address>"
dataPath: "~/loan_arbiter/data"
keyFilePath: "~/loan_arbiter/keys"
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [BeL2Labs Arbiter Signer](https://github.com/BeL2Labs/Arbiter_Signer) - The original Arbiter Signer project
- [Electron](https://www.electronjs.org/) - The framework used for building the desktop application

## Support

For support, please open an issue in the [issue tracker](https://github.com/yujingr/BeL2ArbiterGUI/issues).

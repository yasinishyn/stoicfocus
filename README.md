# StoicFocus

> "No man is free who is not master of himself." — Epictetus

StoicFocus is a minimalist, brutalist productivity Chrome extension designed to reclaim your attention using Stoic philosophy and mental friction.

## Demo Video

The extension includes a demo video that appears in the onboarding modal. Place `demo.mp4` in the `public/` folder before building.

## Core Philosophy

StoicFocus implements a multi-layered defense system against digital distractions, inspired by Stoic philosophy. Each feature adds intentional friction to help you maintain focus and act with purpose.

## Features

### Blocklist (Strict Block)
**The Iron Curtain.** Sites added here are absolutely restricted during focus sessions. Any attempt to access them will result in an immediate redirect to a screen of Stoic wisdom. No exceptions, no workarounds.

### Grey List (Friction Zone)
A middle ground for necessary evils. Sites here aren't blocked outright but require a **"Typing Tax"**. To access them, you must perfectly type a difficult philosophical text, proving your intent is conscious, not impulsive.

### Whitelist (Safe Passage)
Trusted domains. StoicFocus will not apply friction, blocking, monochrome mode, or doom scroll detection to these sites.

### Memento Mori Tabs
Tabs are transient. If you exceed your limit (Default: 5), the oldest tab is automatically closed. Pinned tabs are safe. This feature reminds you that time is finite and every tab represents a commitment of attention.

### Monochrome Mode
Dopamine detox. During focus sessions, the entire internet is rendered in grayscale to reduce visual stimulation and help you maintain focus on content, not colors.

### Hardcore Focus
To pause or disable protection, you must solve a chess puzzle. Incorrect answers lock you in. This feature ensures that disabling focus mode requires deliberate, conscious action.

### In-Page Blocker
A floating **"BLOCK SITE"** button appears on every webpage, allowing for immediate boundary setting without opening the dashboard. Quick, decisive action when you recognize a distraction.

### Doom Scroll Detection
Automatically detects when you've scrolled beyond a reasonable limit (default: 3 pages). Alerts you when you're descending into mindless scrolling behavior.

### Time Boxing
Customize your rhythm. Configure specific durations for Deep Work cycles and Rest phases to match your personal productivity flow. Built-in Pomodoro timer with visual progress.

### AI Wisdom
Optional Google Gemini integration generates context-aware Stoic quotes based specifically on the site you are trying to visit. Makes each intervention personally relevant.

### Negative Visualization
Before every session, you must visualize why you might fail. If you visit a restricted site, your own prediction is shown back to you. This pre-mortem technique helps you anticipate and avoid failure.

## Installation

### Prerequisites
- **Node.js 18+** (Node.js 20+ recommended for best compatibility)
- **npm** (comes with Node.js)
- Google Chrome browser

To check your Node version:
```bash
node --version
```

If you need to install or update Node.js, visit [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm).

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd stoicfocus_2

# 2. Install dependencies (REQUIRED - do this first!)
npm install

# 3. Build the extension
npm run build

# 5. Load in Chrome
# - Open chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the 'dist' folder
```

### Build Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stoicfocus_2
   ```

2. **Install dependencies** ⚠️ **REQUIRED BEFORE BUILDING**
   ```bash
   npm install
   ```
   This will install all required packages including React, Vite, TypeScript, and other dependencies. **You must run this before building!**

3. **Build the extension**
   ```bash
   npm run build
   ```
   This compiles all TypeScript/React files and creates the `dist` folder ready for Chrome.
   This will create a `dist` folder with all the compiled extension files.

4. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

5. **Add the demo video (optional)**
   - Place `demo.mp4` in the `public/` folder before building
   - The video will be automatically included in the build

### Running Locally for Development

1. **Start the development server**
   ```bash
   npm run dev
   ```
   This starts a Vite dev server on `http://localhost:3000`

2. **For extension development**
   - Build the extension: `npm run build`
   - Load the `dist` folder in Chrome as described above
   - After making changes, rebuild and reload the extension in Chrome

### Development Workflow

1. Make your code changes
2. Run `npm run build` to compile
3. Go to `chrome://extensions/`
4. Click the reload icon on the StoicFocus extension card
5. Test your changes

## Project Structure

```
stoicfocus_2/
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard interface
│   ├── TrayMenu.tsx     # Extension popup
│   ├── BlockedView.tsx  # Blocked site page
│   └── ...
├── services/            # Services (Gemini API, quotes)
├── background.ts        # Background service worker
├── content.ts           # Content script (injected into pages)
├── popup.html           # Popup HTML
├── popup.tsx            # Popup entry point
├── dashboard.html       # Dashboard HTML
├── dashboard.tsx        # Dashboard entry point
├── blocked.html         # Blocked page HTML
├── blocked.tsx          # Blocked page entry point
├── manifest.json        # Chrome extension manifest
└── vite.config.ts       # Vite build configuration
```

## Icons

The extension includes icon files (`icon16.png`, `icon48.png`, `icon128.png`) in the `public/` folder. These are black square icons using the app's color (#18181b).

If you need to regenerate them, you can use any image editor or online favicon generator to create 16x16, 48x48, and 128x128 black square PNG files.

## Configuration

### Settings
Access settings via the extension popup or dashboard:
- **System Status**: Global enable/disable toggle
- **Hardcore Mode**: Require chess puzzle to disable
- **In-Page Blocker**: Show floating block button
- **Doom Scroll Limit**: Pages before alert triggers
- **Monochrome Mode**: Grayscale filter during focus
- **Memento Mori**: Auto-close old tabs
- **Tab Limit**: Maximum unpinned tabs allowed
- **Time Boxing**: Focus and break durations
- **Gemini API Key**: Optional AI quote generation
- **Negative Visualization**: Pre-mortem before sessions

### Adding Sites to Block

1. **Via Popup**: Click the extension icon, then "Block Site" for the current page
2. **Via Dashboard**: Open dashboard, go to Blacklist or Grey List tab, add domain or category
3. **Via In-Page Button**: Click the floating "BLOCK SITE" button on any webpage

## How It Works

### Background Service Worker
- Monitors tab navigation
- Checks URLs against blacklist/greylist
- Manages tab limits (Memento Mori)
- Handles storage synchronization

### Content Script
- Injects "BLOCK SITE" button on all pages
- Detects doom scrolling
- Applies monochrome filter during focus sessions
- Checks for greylist sites and redirects to typing tax

### Popup
- Quick access to timer controls
- System status toggle
- Block current site
- Access to dashboard and settings

### Dashboard
- Full management interface
- Blacklist and Grey List management
- Analytics and metrics
- Settings configuration
- Manual/documentation

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Analytics charts
- **Google GenAI SDK** - Optional AI quotes
- **Chrome Extensions API** - Browser integration

## Permissions

The extension requires the following permissions:
- `tabs` - Manage and monitor browser tabs
- `storage` - Save settings and blocked sites
- `activeTab` - Access current tab information
- `scripting` - Inject content scripts
- `webNavigation` - Monitor navigation events
- `<all_urls>` - Check and block sites across the web

## Support

If StoicFocus helps you reclaim your time and focus, consider supporting its development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/)

**Buy Me A Coffee**: [https://www.buymeacoffee.com/](https://www.buymeacoffee.com/)

This tool is free, but focus is priceless. If StoicFocus helps you reclaim your time, consider supporting its development.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Crafted with focus by [ralabs.org](https://ralabs.org/)

## Troubleshooting

### Extension not loading
- Ensure you're loading the `dist` folder, not the root project folder
- Check that `npm run build` completed successfully
- Verify Developer mode is enabled in Chrome

### Video not showing
- Ensure `demo.mp4` is in the `public` folder before building, or
- Copy `demo.mp4` manually to the `dist` folder after building
- Check browser console for errors

### Sites not being blocked
- Verify the extension is enabled in `chrome://extensions/`
- Check that System Status is enabled in settings
- Ensure the site is added to Blacklist (not just Grey List)
- Reload the extension after adding new sites

### Content script not working
- Some sites may block content script injection
- Try reloading the page after enabling the extension
- Check browser console for errors

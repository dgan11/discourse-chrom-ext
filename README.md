# Discourse Moderator Helper Extension

A Chrome extension that helps Discourse forum moderators understand context and craft better responses.

## Architecture

### Components
- **Popup** (`popup.html`, `popup.js`)
  - User interface for connecting/disconnecting
  - Shows current forum and connection status
  
- **Content Script** (`content.js`)
  - Detects Discourse forums and posts
  - Extracts post content and related topics
  - Processes and cleans HTML content
  - Injects UI components into the page

- **Background Service** (`background.js`)
  - Handles data fetching and caching
  - Manages extension state
  - Communicates between components

- **Utilities** (`utils/`)
  - `fetchPosts.js`: Handles Discourse API interactions
  - More utilities to come for summarization and UI

### Data Flow
1. **Detection**
   - Content script detects Discourse forum
   - Extracts current post and related topics
   - Sends to background service

2. **Data Fetching**
   - Background service fetches JSON data
   - Processes both current and related posts
   - Caches results for performance

3. **Processing**
   - Content script cleans and structures data
   - Strips HTML, extracts metadata
   - Prepares content for summarization

4. **UI Integration** (Coming Soon)
   - Sidebar shows summaries and context
   - Helps craft moderator responses
   - Provides quick actions

## Setup
1. Clone the repository
2. Load unpacked extension in Chrome
3. Visit any Discourse forum
4. Click extension icon to connect

## Development Status
- ✅ Stage 1: Basic Detection
- ✅ Stage 2: Data Fetching
- 🚧 Stage 3: Summarization (In Progress)
- 📝 Stage 4: UI Integration (Planned)

## Features
- Works with any Discourse forum
- Fetches related posts automatically
- Cleans and processes content
- Caches data for performance
- Uses Shadow DOM for style isolation

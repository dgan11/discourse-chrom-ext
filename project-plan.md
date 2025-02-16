# Discourse Helper Extension Plan

## Stage 1: Basic Detection
- [ ] **Goal**: Detect Discourse posts & extract related links  
- **Files**:
  - `manifest.json` (Chrome extension setup)  
  - `content-script.js` (scrape page)  
- **Cursor Prompt**:  
  *"Create a content script that checks if the current page is a Discourse post and extracts links with class 'title raw-topic-link' from the #related-topics div."*

## Stage 2: Fetch Data
- [ ] **Goal**: Fetch JSON for original + related posts  
- **Files**:
  - `background.js` (API calls)  
  - `utils/fetchPosts.js`  
- **Cursor Prompt**:  
  *"Write a function in background.js that takes a list of Discourse post URLs, appends .json, and fetches their data using fetch()."*

## Stage 3: Summarization
- [ ] **Goal**: Integrate OpenAI API for summaries  
- **Files**:
  - `services/summarize.js`  
- **Cursor Prompt**:  
  *"Create a function that sends cleaned post content to OpenAI's API and returns a 4o-mini summary with the prompt 'Summarize this post's problem and solutions in 3 bullets'."*

## Stage 4: UI Injection
- [ ] **Goal**: Show summaries in a sidebar  
- **Files**:
  - `components/Sidebar.js`  
  - `styles/sidebar.css`  
- **Cursor Prompt**:  
  *"Create a sidebar component that displays summaries in tabs and has a 'Copy Response' button."*
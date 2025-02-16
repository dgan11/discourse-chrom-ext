# Cursor Helpers for Each Stage

## Stage 1: Basic Detection
```prompt
Help me create a Chrome Manifest V3 extension that:
- Activates only on Discourse forum posts (URL pattern: *://community.openai.com/t/*)
- Injects a content script that finds all related post links in the #related-topics div

Stage 2: Fetch Data
prompt
Copy
Write a JavaScript function that:
1. Takes a Discourse post URL like "https://forum.cursor.com/t/how-to-contact-support/16582"
2. Fetches the JSON version by appending .json
3. Extracts: title, first post content, author
4. Returns clean text (strip HTML tags)
Stage 3: Summarization
prompt
Copy
Create an async function that:
- Takes cleaned post text
- Sends to OpenAI API
- Uses this system prompt: "You're a technical assistant. Summarize the key problem and any solutions mentioned in 3 bullet points."
- Returns the summary or handles API errors
Stage 4: UI
prompt
Copy
Build a sidebar UI that:
- Floats on the right side of the page
- Has tabs for "Current Post", "Related Posts", "Response"
- Displays summaries in markdown format
- Includes a button to copy the generated response
- Uses vanilla JS + CSS (no frameworks)
Copy

---

### **Workflow**  
1. **Start with Stage 1**: Open `PROJECT_PLAN.md`, work on "Basic Detection" tasks  
2. **Use Cursor**: Copy the prompt from `CURSOR_HELP.md` for the current stage into Cursor  
3. **Implement Code**: Add generated code to your project files  
4. **Repeat**: Move to next stage in `PROJECT_PLAN.md`  

Need an example for a specific stage? Let me know which one!

# Portfolio Conversation Panel

Copy these files into the repository folder opened by GitHub Desktop:

- index.html
- styles.css
- script.js
- api/chat.js
- assets/vendor/ (the complete folder, including the license files)
- assets/immersive-studio.webp (the new hero visual)
- assets/DAVID_RAJ_RAMAKRISHNAN_TechLead.pdf (the latest resume)

Keep your existing portfolio assets and Git repository. Commit and push the changes, then let Vercel redeploy the site.

The Vercel project needs OPENAI_API_KEY in its server environment. Never put the key in HTML, JavaScript served to the browser, or a Git commit. OPENAI_MODEL is optional; this update preserves the existing model setting.

The panel includes conversation history, Markdown replies, horizontally scrollable code blocks and tables, reply/code copy buttons, image and script attachments, and a new-conversation button. Desktop Enter sends a message; Shift+Enter adds a line. On touch devices, Enter adds a line and the arrow button sends.

Up to four files can be attached per message. Supported images: PNG, JPEG, WebP, GIF, approximately 2 MB combined. Text/script files: up to 240 KB each; the backend reads the first 30,000 characters of each script. Earlier attachments remain part of the follow-up conversation through the API response chain. Refreshing the page or starting a new conversation resets the current chat; this version does not include saved chats or a chat sidebar.

Copy buttons require a secure context (HTTPS or localhost). The static page can be previewed by opening index.html; AI replies require the deployed /api/chat endpoint.

Conversation continuation uses the Responses API's previous_response_id:
https://developers.openai.com/api/docs/guides/conversation-state

Validation: JavaScript syntax and mocked API checks passed. Browser layout checks covered 320px, 390px, 768px and 1440px viewports, with no page overflow or clipped headings/buttons. Verified image/script attachments, Markdown/code rendering, both copy buttons, conversation follow-ups, mobile navigation, project expanders and new-chat reset using a local mocked endpoint. Live OpenAI responses were not tested.

The hero is an AI-generated illustrative XR workspace, not a photograph of David's actual workplace or a SpeedShelf screenshot. Project visuals are workflow diagrams. Resume content, roles and impact figures were refreshed from the supplied TechLead PDF.

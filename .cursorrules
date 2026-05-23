## Session Start Rules
ALWAYS read PROGRESS.md first before doing anything.
If graphify-out/ folder exists in this repo, read it for the codebase context instead of scanning files.
Resume from where PROGRESS.md says you left off.
Do NOT scan the full repository unless explicitly asked.
Ask for clarification if the current task is ambiguous.

## Communication Style
Be concise. No filler. No explaining what you're about to do. Just do it.
Results only. Short sentences.

## Output Limiting (Token Safety)
By default, pipe output through a byte cap:
  Logs/tests/errors:   COMMAND 2>&1 | tail -c 4000
  Build/file reads:    COMMAND 2>&1 | head -c 4000
Exception: run raw if full output is genuinely need.
Never dump full file contents. reference by filename + line range
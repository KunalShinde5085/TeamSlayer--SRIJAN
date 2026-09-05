# Pushing FlowMate to GitHub

Recommended repository name: **`flowmate-ai-work-automation`**

## Steps

1. **Create the repository** on GitHub (github.com > New repository). Leave it empty — no README, no `.gitignore` — since this project already has both.

2. **Open the project folder** in a terminal:
   ```bash
   cd flowmate
   ```

3. **Initialize Git:**
   ```bash
   git init
   ```

4. **Add files:**
   ```bash
   git add .
   ```

5. **Commit:**
   ```bash
   git commit -m "Initial commit: FlowMate hackathon prototype"
   ```

6. **Connect the remote repository** (replace with your own URL):
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/flowmate-ai-work-automation.git
   ```

7. **Push:**
   ```bash
   git branch -M main
   git push -u origin main
   ```

8. **Confirm `.env` and `config/env.js` were NOT uploaded.** On GitHub, check the repo file list — you should see `config/env.example.js` but not `config/env.js`, and no `.env` file anywhere. If either slipped through, remove it and rotate any keys that were exposed:
   ```bash
   git rm --cached config/env.js
   git commit -m "Remove accidentally committed config"
   git push
   ```

9. **README is already included** at the project root — GitHub will render it automatically on the repo's front page.

10. **Add screenshots (optional but recommended for a hackathon submission):** take a screenshot of the Dashboard and the AI Inbox mid-automation, drop them in a `docs/screenshots/` folder, and reference them from `README.md`.

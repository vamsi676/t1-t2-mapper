# Step-by-Step: Deploy to Amazon Wiki

Based on your internal Wiki documentation, here's exactly what to do:

## Step 1: Prepare Your Wiki Page

1. Create your wiki page in your team wiki directory
2. Or go to your existing page: `w.amazon.com/bin/view/Users/T1-T2`

## Step 2: Edit the Wiki Page

**Option A (Preferred):**
- Change the URL from `view` to `edit`:
  - From: `https://w.amazon.com/bin/view/Users/T1-T2`
  - To: `https://w.amazon.com/bin/edit/Users/T1-T2`

**Option B:**
- Click the **"Edit"** button in the upper right corner

## Step 3: Enter Source Mode

1. You'll see the Wiki editor
2. **IMPORTANT:** Click the **"Source"** button in the top toolbar
3. This switches you to source/HTML editing mode

## Step 4: Copy and Paste Your HTML

1. Open the file: **`index-wiki-ready.txt`** in a text editor
2. **Select ALL** (Ctrl+A or Cmd+A)
3. **Copy** (Ctrl+C or Cmd+C)
4. Go back to your Wiki editor (in Source mode)
5. **Delete any existing content**
6. **Paste** the entire content from `index-wiki-ready.txt`
7. The content should start with `{{html}}` and end with `{{/html}}`

## Step 5: Save

1. Click the **"Source"** button again (to exit source mode if needed)
2. Click **"Save"** or **"Preview"**
3. Your T1-T2 Mapper should now render properly!

## Important Notes

- ✅ The `{{html}}` tags tell Wiki to render HTML instead of showing raw code
- ✅ All your CSS and JavaScript is embedded in the HTML
- ✅ No need to attach CSS files separately (unless you want to)
- ✅ The file `index-wiki-ready.txt` has everything wrapped correctly

## Troubleshooting

**If you still see raw code:**
- Make sure you're in Source mode when pasting
- Verify the content starts with `{{html}}` and ends with `{{/html}}`
- Try clicking "Source" button again before saving

**If JavaScript doesn't work:**
- Some Wikis restrict JavaScript execution
- In that case, use GitHub Pages + iframe method instead

## File to Use

**`index-wiki-ready.txt`** - This is your complete HTML wrapped in `{{html}}` tags, ready to paste into Wiki!


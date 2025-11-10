# Fix: Raw Code Showing Instead of Rendered Page

## The Problem

When you paste HTML into Wiki "Edit Source" and save, it shows raw code instead of rendering. This happens because Wiki treats it as plain text.

## Solutions for Amazon Wiki (w.amazon.com)

### Solution 1: Use HTML Widget/Component (Recommended)

Amazon Wiki likely has an HTML widget or component. Look for:

1. In the Wiki editor, look for buttons like:
   - "Insert" → "HTML" or "Widget"
   - "Add Component" → "HTML"
   - "Embed" → "HTML"

2. Use the HTML widget instead of pasting directly into source

3. Paste your HTML content into the widget

### Solution 2: Wrap in Wiki HTML Syntax

Some Wikis need HTML wrapped in special syntax. Try:

**Option A: HTML Macro**
```
{html}
<paste your entire HTML here>
{html}
```

**Option B: Raw HTML Block**
```
<raw>
<paste your entire HTML here>
</raw>
```

**Option C: HTML Div**
```
<div class="html-content">
<paste your entire HTML here>
</div>
```

### Solution 3: Use iframe (If Wiki Supports It)

1. **First, host your HTML somewhere:**
   - Upload to GitHub Pages (easiest)
   - Or any web server

2. **Then in Wiki, use iframe:**
   ```
   <iframe src="https://vamsi676.github.io/t1-t2-mapper/" width="100%" height="800px" frameborder="0"></iframe>
   ```

### Solution 4: Check Wiki Settings

1. Look for "Allow HTML" or "Enable HTML" setting
2. Check page permissions - some Wikis restrict HTML
3. Look for "HTML rendering" or "Execute scripts" options

### Solution 5: Use GitHub Pages + iframe

**Step 1: Enable GitHub Pages**
1. Go to: https://github.com/vamsi676/t1-t2-mapper/settings/pages
2. Source: `main` branch, `/ (root)`
3. Save
4. Wait 1-2 minutes
5. Your app: `https://vamsi676.github.io/t1-t2-mapper/`

**Step 2: Embed in Wiki**
In Wiki "Edit Source", paste:
```html
<iframe 
  src="https://vamsi676.github.io/t1-t2-mapper/" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border: none; min-height: 800px;">
</iframe>
```

## Quick Test

Try this minimal HTML first to see if Wiki renders HTML:

```html
<div style="background: red; padding: 20px; color: white;">
  <h1>Test HTML</h1>
  <p>If you see this styled, HTML works!</p>
</div>
```

If this shows as raw code, Wiki doesn't render HTML directly.

## Most Likely Solution

**For Amazon Wiki, you probably need to:**
1. Find the "HTML Widget" or "HTML Component" in the editor
2. Use that instead of pasting into "Edit Source"
3. Or use GitHub Pages + iframe (most reliable)

## Next Steps

1. **Check Wiki editor** - Look for HTML/widget options
2. **Try GitHub Pages** - Most reliable, then embed with iframe
3. **Contact Wiki admin** - Ask about HTML rendering permissions


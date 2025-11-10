# Wiki Blocked HTML Tags - Analysis & Solutions

## The Problem

Wiki is blocking certain HTML tags for security. Common blocked tags include:
- `<script>` - JavaScript execution
- `onclick`, `onload`, etc. - Inline event handlers
- `<iframe>` - External content embedding
- `<object>`, `<embed>` - Media embedding
- Some `<form>` attributes

## Impact on Your Application

Your T1-T2 Mapper application uses:
- ✅ `<style>` tags (CSS) - Usually allowed
- ❌ `<script>` tags (JavaScript) - **LIKELY BLOCKED**
- ❌ `onclick="..."` attributes - **LIKELY BLOCKED**
- ✅ HTML structure - Usually allowed

## Solutions

### Solution 1: Use GitHub Pages + iframe (Recommended)

**If Wiki blocks `<script>` tags, your JavaScript won't work. Best solution:**

1. **Deploy to GitHub Pages:**
   - Already set up at: https://vamsi676.github.io/t1-t2-mapper/
   - Your app works perfectly there

2. **Embed in Wiki using iframe:**
   ```html
   {{html}}
   <iframe 
     src="https://vamsi676.github.io/t1-t2-mapper/" 
     width="100%" 
     height="900px" 
     frameborder="0"
     style="border: none;">
   </iframe>
   {{/html}}
   ```

**Pros:**
- ✅ Full functionality (all JavaScript works)
- ✅ No security restrictions
- ✅ Easy to update (just push to GitHub)

**Cons:**
- ⚠️ Requires external hosting (GitHub Pages)
- ⚠️ iframe might be blocked (check if this works)

### Solution 2: Remove Inline Event Handlers

If only inline handlers are blocked, we can convert them:

**Current (blocked):**
```html
<button onclick="compute()">Calculate</button>
```

**Fixed (using addEventListener):**
```html
<button id="calcBtn">Calculate</button>
<script>
document.getElementById('calcBtn').addEventListener('click', compute);
</script>
```

But if `<script>` tags are blocked, this won't work either.

### Solution 3: Check Which Tags Are Blocked

Test individually:

**Test 1: Script tags**
```html
{{html}}
<script>alert('Script works!');</script>
{{/html}}
```

**Test 2: Inline onclick**
```html
{{html}}
<button onclick="alert('onclick works!')">Test</button>
{{/html}}
```

**Test 3: iframe**
```html
{{html}}
<iframe src="https://example.com" width="100%" height="200px"></iframe>
{{/html}}
```

### Solution 4: Use Wiki-Compatible Alternative

If JavaScript is completely blocked, you'd need to:
- Rewrite the app without JavaScript (not practical for this complex app)
- Use server-side processing (requires backend)
- Use a different platform

## Recommendation

**Best Approach: GitHub Pages + iframe**

1. Your app is already on GitHub Pages
2. Test iframe in Wiki:
   ```html
   {{html}}
   <iframe src="https://vamsi676.github.io/t1-t2-mapper/" width="100%" height="900px" frameborder="0"></iframe>
   {{/html}}
   ```

3. If iframe is also blocked:
   - **Option A:** Just link to GitHub Pages: `https://vamsi676.github.io/t1-t2-mapper/`
   - **Option B:** Ask Wiki admin about JavaScript/iframe permissions
   - **Option C:** Use internal web server instead of Wiki

## Decision Matrix

| Scenario | Solution | Works? |
|----------|----------|--------|
| Script tags blocked | GitHub Pages + iframe | ✅ Yes |
| iframe also blocked | Direct link to GitHub Pages | ✅ Yes (but not embedded) |
| Both blocked | Ask Wiki admin for permissions | ⚠️ Maybe |
| No JavaScript allowed | Rewrite app (not practical) | ❌ No |

## Next Steps

1. **Test iframe** - Try the iframe code above
2. **If iframe works** - Problem solved! ✅
3. **If iframe blocked** - Use direct link or contact Wiki admin


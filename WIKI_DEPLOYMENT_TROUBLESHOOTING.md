# Wiki Deployment Troubleshooting Guide

## Problem: JavaScript Not Executing in Wiki

If your HTML/CSS/JavaScript application isn't working when deployed to Wiki, here are solutions:

## Solution 1: Check WikiPage Properties

The `WikiPage` construct might support different content types. Try updating `lib/t1-mapper-wiki-stack.ts`:

```typescript
const pageProps: WikiPageProps = {
  pageName: 'T1-T2-Mapper-Tool',
  // Try one of these:
  textContent: htmlContent,        // Option 1: Plain text (may not execute JS)
  // htmlContent: htmlContent,     // Option 2: HTML content (if supported)
  // content: htmlContent,         // Option 3: Generic content (if supported)
};
```

## Solution 2: Use iframe Embedding

If Wiki supports iframes, create a wrapper page that embeds your HTML:

1. Host your HTML file on a web server (S3, CloudFront, etc.)
2. Create a Wiki page with an iframe:

```html
<iframe 
  src="https://your-hosted-url.com/t1-mapper.html" 
  width="100%" 
  height="800px" 
  frameborder="0"
  style="border: none;">
</iframe>
```

## Solution 3: Deploy as Standalone Web Page

Instead of Wiki, deploy as a standalone web application:

### Option A: S3 + CloudFront
- Upload `index.html` to S3 bucket
- Enable static website hosting
- Use CloudFront for CDN

### Option B: GitHub Pages
- Push to GitHub
- Enable GitHub Pages in repository settings
- Access via `https://vamsi676.github.io/t1-t2-mapper/`

## Solution 4: Wiki-Specific Format

Some Wikis require content in specific formats. Check if your Wiki supports:

1. **HTML Widget/Component**: Some Wikis have HTML widgets
2. **Custom Pages**: Some Wikis allow custom HTML pages
3. **Embedded Applications**: Some Wikis support embedded web apps

## Solution 5: Verify JavaScript Permissions

1. Check Wiki settings for JavaScript execution permissions
2. Verify Content Security Policy (CSP) allows inline scripts
3. Check if Wiki strips `<script>` tags for security

## Solution 6: External JavaScript

If inline scripts are blocked, move JavaScript to external file:

1. Extract all JavaScript from `index.html` to `app.js`
2. Upload `app.js` to a CDN or static hosting
3. Reference it in HTML: `<script src="https://cdn.example.com/app.js"></script>`

## Recommended Approach

**For Amazon Internal Wiki:**

1. **First, verify the WikiPage construct documentation** - Check if there's an `htmlContent` or similar property
2. **Test with a simple HTML file** - Deploy a minimal HTML with JavaScript to see if it works
3. **Contact Wiki team** - Ask about JavaScript execution policies
4. **Consider alternative deployment** - If Wiki doesn't support JavaScript, use S3/CloudFront or GitHub Pages

## Quick Test

Create a test file `test.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <style>body { background: red; }</style>
</head>
<body>
  <h1>Test Page</h1>
  <script>alert('JavaScript works!');</script>
</body>
</html>
```

Deploy this first to verify if Wiki executes JavaScript.

## Alternative: CDK Stack for S3 Deployment

If Wiki doesn't work, we can create an S3 deployment stack instead. Let me know if you'd like that option.


# Solution Summary: Wiki JavaScript Execution Issue

## The Problem

Your HTML/CSS/JavaScript application isn't executing properly when deployed to Wiki because:
- Wiki pages may strip or block `<script>` tags for security
- Wiki may not execute inline JavaScript
- `textContent` property might render HTML as plain text instead of executing it

## Immediate Solutions to Try

### Solution 1: Check WikiPage Properties

In `lib/t1-mapper-wiki-stack.ts`, try different properties:

```typescript
// Option 1: Current (may not work)
textContent: htmlContent

// Option 2: If WikiPage supports it
htmlContent: htmlContent

// Option 3: If there's a content property
content: htmlContent
```

**Action**: Check the `@amzn/wiki-cdk-constructs` documentation for available properties.

### Solution 2: Verify Wiki JavaScript Permissions

1. Check if your Wiki allows JavaScript execution
2. Look for Content Security Policy (CSP) settings
3. Contact your Wiki team about JavaScript support

### Solution 3: Use Alternative Deployment (Recommended)

If Wiki doesn't support JavaScript, deploy as a standalone web application:

#### Option A: S3 Static Website (Internal AWS)

I've created `lib/t1-mapper-s3-stack.ts` for S3 deployment. To use it:

1. Update `bin/t1-mapper-wiki.ts`:
```typescript
import { T1MapperS3Stack } from '../lib/t1-mapper-s3-stack';
new T1MapperS3Stack(app, 'T1MapperS3Stack', {});
```

2. Deploy:
```bash
brazil-build run cdk deploy T1MapperS3Stack
```

3. Access via the S3 website URL (output after deployment)

#### Option B: GitHub Pages (External)

1. Go to your GitHub repo: https://github.com/vamsi676/t1-t2-mapper
2. Settings → Pages
3. Source: `main` branch, `/ (root)`
4. Save
5. Access via: `https://vamsi676.github.io/t1-t2-mapper/`

#### Option C: iframe in Wiki

1. Deploy HTML to S3 or GitHub Pages
2. Create Wiki page with iframe:
```html
<iframe src="YOUR_DEPLOYED_URL" width="100%" height="800px"></iframe>
```

## Recommended Next Steps

1. **First**: Check `@amzn/wiki-cdk-constructs` documentation for HTML/JavaScript support
2. **If Wiki doesn't support JS**: Use S3 deployment (I've created the stack for you)
3. **For quick testing**: Try GitHub Pages first (easiest, no AWS setup needed)

## Files Created

- `WIKI_DEPLOYMENT_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `lib/t1-mapper-s3-stack.ts` - Alternative S3 deployment stack
- `SOLUTION_SUMMARY.md` - This file

## Quick Decision Tree

```
Does Wiki support JavaScript?
├─ YES → Check WikiPage properties, try htmlContent
└─ NO → Choose deployment method:
    ├─ S3 Static Website (Internal AWS) → Use t1-mapper-s3-stack.ts
    ├─ GitHub Pages (External) → Enable in repo settings
    └─ iframe in Wiki → Deploy elsewhere, embed in Wiki
```


# Quick Start Guide - Wiki Deployment

## On Your Work Laptop

### Step 1: Install Dependencies

```bash
cd /path/to/T1_to_MiniRack
npm install --save-dev @amzn/wiki-cdk-constructs
npm install
```

Or using brazil-build:

```bash
brazil-build run npm install --save-dev @amzn/wiki-cdk-constructs
brazil-build run npm install
```

### Step 2: Build the Project

```bash
brazil-build run npm run build
```

### Step 3: Deploy to Wiki

```bash
brazil-build run cdk deploy T1MapperWikiStack
```

## What Gets Deployed

- Your `index.html` file will be deployed as a wiki page named **"T1-T2-Mapper-Tool"**
- The page will be accessible through your internal wiki system

## Customization

Edit `lib/t1-mapper-wiki-stack.ts` to customize:

- **pageName**: Change the wiki page name
- **permissions**: Uncomment and add team permissions
- **searchable**: Uncomment and set to true/false

## Troubleshooting

1. **Module not found**: Run `npm install` again
2. **Build errors**: Check TypeScript version compatibility
3. **Deployment fails**: Verify AWS credentials and permissions

## Project Structure

```
T1_to_MiniRack/
├── bin/t1-mapper-wiki.ts       # CDK app entry
├── lib/t1-mapper-wiki-stack.ts # Stack definition
├── index.html                  # Your tool (will be deployed)
├── package.json                # Dependencies
└── cdk.json                    # CDK config
```


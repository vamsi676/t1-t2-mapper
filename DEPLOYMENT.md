# Deployment Instructions for T1-T2 Mapper Tool

## Prerequisites

1. Ensure you have access to the internal Amazon tools
2. Node.js and npm installed
3. Access to `brazil-build` command
4. CDK CLI access

## Setup Steps

### 1. Install Dependencies

```bash
npm install --save-dev @amzn/wiki-cdk-constructs
npm install
```

### 2. Build the TypeScript Code

```bash
npm run build
```

Or use brazil-build:

```bash
brazil-build run npm run build
```

### 3. Deploy to Wiki

```bash
brazil-build run cdk deploy T1MapperWikiStack
```

## Project Structure

```
T1_to_MiniRack/
├── bin/
│   └── t1-mapper-wiki.ts          # CDK app entry point
├── lib/
│   └── t1-mapper-wiki-stack.ts    # CDK stack definition
├── index.html                     # Your main HTML file
├── package.json                   # Node dependencies
├── tsconfig.json                  # TypeScript config
├── cdk.json                       # CDK configuration
└── README.md                      # Project documentation
```

## Configuration

The stack is configured in `lib/t1-mapper-wiki-stack.ts`. You can customize:

- **pageName**: The name of the wiki page (currently: 'T1-T2-Mapper-Tool')
- **permissions**: Team permissions (commented out, uncomment and set as needed)
- **searchable**: Whether the page is searchable (commented out, uncomment and set as needed)

## Troubleshooting

1. **Build errors**: Make sure all dependencies are installed
2. **Deployment errors**: Check your AWS credentials and permissions
3. **Wiki page not appearing**: Verify the pageName and check wiki permissions

## Updating the Tool

After making changes to `index.html`:

1. Make your changes to `index.html`
2. Build: `brazil-build run npm run build`
3. Deploy: `brazil-build run cdk deploy T1MapperWikiStack`

The wiki page will be updated with your changes.


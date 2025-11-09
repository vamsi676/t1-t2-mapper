import { WikiPage, WikiPageProps } from '@amzn/wiki-cdk-constructs';
import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';

export class T1MapperWikiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Read your HTML file (from project root)
    const htmlFilePath = path.join(__dirname, '..', 'index.html');
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    const pageProps: WikiPageProps = {
      pageName: 'T1-T2-Mapper-Tool',
      textContent: htmlContent,
      // Optional: set permissions, search visibility, etc.
      // permissions: ['your-team-permissions'],
      // searchable: true
    };

    new WikiPage(this, 'T1MapperPage', pageProps);
  }
}


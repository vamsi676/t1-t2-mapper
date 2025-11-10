// Alternative: S3 Static Website Deployment
// Use this if Wiki deployment doesn't support JavaScript execution

import { Construct } from 'constructs';
import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class T1MapperS3Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'T1MapperWebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA fallback
      publicReadAccess: false, // Set to true if you want public access
      removalPolicy: RemovalPolicy.DESTROY, // Change to RETAIN for production
      autoDeleteObjects: true,
    });

    // Deploy HTML file to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..'), {
          exclude: ['node_modules', '.git', 'lib', 'bin', '*.ts', '*.json', '*.md', 'cdk.out'],
        }),
      ],
      destinationBucket: websiteBucket,
      // Only deploy index.html
      include: ['index.html'],
    });

    // Output the website URL
    new CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL of the T1-T2 Mapper website',
    });
  }
}


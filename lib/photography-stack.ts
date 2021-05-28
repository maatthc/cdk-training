import * as cdk from '@aws-cdk/core';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import * as s3 from '@aws-cdk/aws-s3';
import * as apigw from '@aws-cdk/aws-apigateway';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import * as dynamo from '@aws-cdk/aws-dynamodb'
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources'

export class PhotographyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creates an application S3 bucket. 
    const appBucket = new s3.Bucket(this, 'photography-app-bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Creates a photo S3 bucket. 
    const photoBucket = new s3.Bucket(this, 'photography-photo-bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    new cloudfront.Distribution(this, 'photography-distribution', {
      defaultBehavior: { origin: new origins.S3Origin(appBucket) },
      defaultRootObject: 'index.html',
      additionalBehaviors: {
        '/photos/*': {
          origin: new origins.S3Origin(photoBucket),
        },
      }
    });

    // API Gateway to for future interactions 
    const photoApi = new apigw.RestApi(this, 'photography-photo-api', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
      },
    });

    // create Lambda to upload photo to S3 
    const createFunction = new lambda.Function(this, 'photography-api-create', {
      runtime: lambda.Runtime.NODEJS_14_X, // execution environment 
      code: lambda.Code.fromAsset('src/create'), // code loaded from referenced path 
      handler: 'index.handler',
      environment: { // we utilize environment variables so we don't need to modify the code 
        "BUCKET": photoBucket.bucketName
      }
    });

    const UploadResource = photoApi.root.addResource('photo');

    // POST endpoint /photo 
    UploadResource.addMethod('POST',
      new apigw.LambdaIntegration(createFunction),
    );

    photoBucket.grantWrite(createFunction);

    // Deploys files from local 'src/web' to the App bucket
    new s3deploy.BucketDeployment(this, 'DeployFiles', {
      sources: [s3deploy.Source.asset('./src/web')],
      destinationBucket: appBucket,
    });

    const db = new dynamo.Table(this, 'PhotoDb', {
      partitionKey: { name: 'id', type: dynamo.AttributeType.STRING },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST
    })

    // create Lambda to register photo to Dynamo 
    const registerFunction = new lambda.Function(this, 'photography-register', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src/register'),
      handler: 'index.handler',
      environment: {
        "TABLE_NAME": db.tableName
      }
    });

    // Permission to write to DB
    db.grantReadWriteData(registerFunction)

    // create event source on 'photoBucket' trigger for ObjectCreated 
    registerFunction.addEventSource(new lambdaEventSources.S3EventSource(photoBucket, {
      events: [
        s3.EventType.OBJECT_CREATED
      ]
    }));

    // create Lambda to list photo from Dynamo 
    const listFunction = new lambda.Function(this, 'photography-list', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('src/list'),
      handler: 'index.handler',
      environment: {
        "TABLE_NAME": db.tableName
      }
    });
    //  Add permission to read from DB
    db.grantReadData(listFunction)

    // GET endpoint /photo 
    UploadResource.addMethod('GET',
      new apigw.LambdaIntegration(listFunction),
    );
  }
}
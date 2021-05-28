"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotographyStack = void 0;
const cdk = require("@aws-cdk/core");
const cloudfront = require("@aws-cdk/aws-cloudfront");
const origins = require("@aws-cdk/aws-cloudfront-origins");
const s3 = require("@aws-cdk/aws-s3");
const apigw = require("@aws-cdk/aws-apigateway");
const lambda = require("@aws-cdk/aws-lambda");
const s3deploy = require("@aws-cdk/aws-s3-deployment");
const dynamo = require("@aws-cdk/aws-dynamodb");
const lambdaEventSources = require("@aws-cdk/aws-lambda-event-sources");
class PhotographyStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            runtime: lambda.Runtime.NODEJS_14_X,
            code: lambda.Code.fromAsset('src/create'),
            handler: 'index.handler',
            environment: {
                "BUCKET": photoBucket.bucketName
            }
        });
        const UploadResource = photoApi.root.addResource('photo');
        // POST endpoint /photo 
        UploadResource.addMethod('POST', new apigw.LambdaIntegration(createFunction));
        photoBucket.grantWrite(createFunction);
        // Deploys files from local 'src/web' to the App bucket
        new s3deploy.BucketDeployment(this, 'DeployFiles', {
            sources: [s3deploy.Source.asset('./src/web')],
            destinationBucket: appBucket,
        });
        const db = new dynamo.Table(this, 'PhotoDb', {
            partitionKey: { name: 'id', type: dynamo.AttributeType.STRING },
            billingMode: dynamo.BillingMode.PAY_PER_REQUEST
        });
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
        db.grantReadWriteData(registerFunction);
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
        db.grantReadData(listFunction);
        // GET endpoint /photo 
        UploadResource.addMethod('GET', new apigw.LambdaIntegration(listFunction));
    }
}
exports.PhotographyStack = PhotographyStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGhvdG9ncmFwaHktc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaG90b2dyYXBoeS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsc0RBQXNEO0FBQ3RELDJEQUEyRDtBQUMzRCxzQ0FBc0M7QUFDdEMsaURBQWlEO0FBQ2pELDhDQUE4QztBQUM5Qyx1REFBc0Q7QUFDdEQsZ0RBQStDO0FBQy9DLHdFQUF1RTtBQUV2RSxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBb0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIscUNBQXFDO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDOUQsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEUsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUM1RCxlQUFlLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVELGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsbUJBQW1CLEVBQUU7Z0JBQ25CLFdBQVcsRUFBRTtvQkFDWCxNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztpQkFDMUM7YUFDRjtTQUNGLENBQUMs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QUFrQztRQUNsQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRTlCLHVCQUF1QjtRQUN2QixjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssRUFDNUIsSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQzFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFuR0QsNENBbUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ0Bhd3MtY2RrL2NvcmUnO1xuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ0Bhd3MtY2RrL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnQGF3cy1jZGsvYXdzLXMzJztcbmltcG9ydCAqIGFzIGFwaWd3IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1kZXBsb3ltZW50J1xuaW1wb3J0ICogYXMgZHluYW1vIGZyb20gJ0Bhd3MtY2RrL2F3cy1keW5hbW9kYidcbmltcG9ydCAqIGFzIGxhbWJkYUV2ZW50U291cmNlcyBmcm9tICdAYXdzLWNkay9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnXG5cbmV4cG9ydCBjbGFzcyBQaG90b2dyYXBoeVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZXMgYW4gYXBwbGljYXRpb24gUzMgYnVja2V0LiBcbiAgICBjb25zdCBhcHBCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdwaG90b2dyYXBoeS1hcHAtYnVja2V0Jywge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZXMgYSBwaG90byBTMyBidWNrZXQuIFxuICAgIGNvbnN0IHBob3RvQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAncGhvdG9ncmFwaHktcGhvdG8tYnVja2V0Jywge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICB9KTtcblxuICAgIG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAncGhvdG9ncmFwaHktZGlzdHJpYnV0aW9uJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7IG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oYXBwQnVja2V0KSB9LFxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcbiAgICAgIGFkZGl0aW9uYWxCZWhhdmlvcnM6IHtcbiAgICAgICAgJy9waG90b3MvKic6IHtcbiAgICAgICAgICBvcmlnaW46IG5ldyBvcmlnaW5zLlMzT3JpZ2luKHBob3RvQnVja2V0KSxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIEFQSSBHYXRld2F5IHRvIGZvciBmdXR1cmUgaW50ZXJhY3Rpb25zIFxuICAgIGNvbnN0IHBob3RvQXBpID0gbmV3IGFwaWd3LlJlc3RBcGkodGhpcywgJ3Bob3RvZ3JhcGh5LXBob3RvLWFwaScsIHtcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWd3LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ3cuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBjcmVhdGUgTGFtYmRhIHRvIHVwbG9hZCBwaG90byB0byBTMyBcbiAgICBjb25zdCBjcmVhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ3Bob3RvZ3JhcGh5LWFwaS1jcmVhdGUnLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMTRfWCwgLy8gZXhlY3V0aW9uIGVudmlyb25tZW50IFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdzcmMvY3JlYXRlJyksIC8vIGNvZGUgbG9hZGVkIGZyb20gcmVmZXJlbmNlZCBwYXRoIFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHsgLy8gd2UgdXRpbGl6ZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgc28gd2UgZG9uJ3QgbmVlZCB0byBtb2RpZnkgdGhlIGNvZGUgXG4gICAgICAgIFwiQlVDS0VUXCI6IHBob3RvQnVja2V0LmJ1Y2tldE5hbWVcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IFVwbG9hZFJlc291cmNlID0gcGhvdG9BcGkucm9vdC5hZGRSZXNvdXJjZSgncGhvdG8nKTtcblxuICAgIC8vIFBPU1QgZW5kcG9pbnQgL3Bob3RvIFxuICAgIFVwbG9hZFJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsXG4gICAgICBuZXcgYXBpZ3cuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlRnVuY3Rpb24pLFxuICAgICk7XG5cbiAgICBwaG90b0J1Y2tldC5ncmFudFdyaXRlKGNyZWF0ZUZ1bmN0aW9uKTtcblxuICAgIC8vIERlcGxveXMgZmlsZXMgZnJvbSBsb2NhbCAnc3JjL3dlYicgdG8gdGhlIEFwcCBidWNrZXRcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95RmlsZXMnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KCcuL3NyYy93ZWInKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYXBwQnVja2V0LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGIgPSBuZXcgZHluYW1vLlRhYmxlKHRoaXMsICdQaG90b0RiJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IGR5bmFtby5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtby5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1RcbiAgICB9KVxuXG4gICAgLy8gY3JlYXRlIExhbWJkYSB0byByZWdpc3RlciBwaG90byB0byBEeW5hbW8gXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ3Bob3RvZ3JhcGh5LXJlZ2lzdGVyJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE0X1gsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ3NyYy9yZWdpc3RlcicpLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJUQUJMRV9OQU1FXCI6IGRiLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gUGVybWlzc2lvbiB0byB3cml0ZSB0byBEQlxuICAgIGRiLmdyYW50UmVhZFdyaXRlRGF0YShyZWdpc3RlckZ1bmN0aW9uKVxuXG4gICAgLy8gY3JlYXRlIGV2ZW50IHNvdXJjZSBvbiAncGhvdG9CdWNrZXQnIHRyaWdnZXIgZm9yIE9iamVjdENyZWF0ZWQgXG4gICAgcmVnaXN0ZXJGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlMzRXZlbnRTb3VyY2UocGhvdG9CdWNrZXQsIHtcbiAgICAgIGV2ZW50czogW1xuICAgICAgICBzMy5FdmVudFR5cGUuT0JKRUNUX0NSRUFURURcbiAgICAgIF1cbiAgICB9KSk7XG5cbiAgICAvLyBjcmVhdGUgTGFtYmRhIHRvIGxpc3QgcGhvdG8gZnJvbSBEeW5hbW8gXG4gICAgY29uc3QgbGlzdEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAncGhvdG9ncmFwaHktbGlzdCcsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdzcmMvbGlzdCcpLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJUQUJMRV9OQU1FXCI6IGRiLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vICBBZGQgcGVybWlzc2lvbiB0byByZWFkIGZyb20gREJcbiAgICBkYi5ncmFudFJlYWREYXRhKGxpc3RGdW5jdGlvbilcblxuICAgIC8vIEdFVCBlbmRwb2ludCAvcGhvdG8gXG4gICAgVXBsb2FkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLFxuICAgICAgbmV3IGFwaWd3LkxhbWJkYUludGVncmF0aW9uKGxpc3RGdW5jdGlvbiksXG4gICAgKTtcbiAgfVxufSJdfQ==
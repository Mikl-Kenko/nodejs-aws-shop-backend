import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthorizationServiceStack } from '../lib/authorization-service-stack';


const app = new cdk.App();
new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {
  env: { 
    account: process.env.AWS_ACCOUNT,
    region: process.env.AWS_REGION 
  },  
});

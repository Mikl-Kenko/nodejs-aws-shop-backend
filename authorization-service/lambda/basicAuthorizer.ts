import { APIGatewayTokenAuthorizerEvent, Callback, Context } from "aws-lambda";


export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _ctx: Context,
  cb: Callback
) => {
  console.log(_ctx);

    try {
      const { authorizationToken } = event;
      const [, token] = authorizationToken.split(" ");
        const [username, password] = Buffer.from(token, "base64")
        .toString()
        .split(":");
  
      const storedUserPassword = process.env[username];
  
      const effect =
        !storedUserPassword || storedUserPassword !== password ? "Deny" : "Allow";
  
      const policy = generatePolicy(token, event.methodArn, effect);
  
      return cb(null, policy);
    } catch (error: any) {
      return cb(
        `Unauthorized: ${
          error instanceof Error ? error.message : "Unknown error!"
        }`
      );
    }
  };
  
  function generatePolicy(principalId: string, resource: string, effect: string) {
    return {
      principalId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: effect,
            Resource: resource,
          },
        ],
      },
    };
  }
  
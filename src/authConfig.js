import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_wMPUCN5Z9",
      userPoolClientId: "1lp1nhf6bam5i23ufpgv8dbhtj",
      loginWith: {
        oauth: {
          domain: "us-east-1wmpucn5z9.auth.us-east-1.amazoncognito.com",
          scopes: ["email", "openid", "profile"],
          redirectSignIn: [window.location.origin],
          redirectSignOut: [window.location.origin],
          responseType: "code",
        },
      },
    },
  },
});

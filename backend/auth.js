import axios from "axios";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

// Set up the Cognito issuer and JWKS URLs
const cognitoIssuer = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_CX8YUvj2P`;
const jwksUrl = `${cognitoIssuer}/.well-known/jwks.json`;

// Function to get the public keys from Cognito
async function getCognitoPublicKey(kid) {
  try {
    const jwksResponse = await axios.get(jwksUrl);
    const jwksKeys = jwksResponse.data.keys;

    // Find the key with the matching 'kid'
    const signingKey = jwksKeys.find((key) => key.kid === kid);

    if (!signingKey) {
      throw new Error("Invalid token: key not found");
    }

    // Convert the JWK to a PEM for verification
    return jwkToPem(signingKey);
  } catch (error) {
    console.error("Error fetching JWKs:", error);
    throw error;
  }
}

// Function to verify the token against the public key from Cognito
async function verifyCognitoToken(token) {
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
    throw new Error("Invalid token");
  }
  const kid = decodedToken.header.kid;
  const publicKey = await getCognitoPublicKey(kid);

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      publicKey,
      { issuer: cognitoIssuer },
      function (err, decoded) {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

export { getCognitoPublicKey, verifyCognitoToken };

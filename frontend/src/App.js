import React from "react";
import "./styles/App.css";
import "./styles/style.scss";
import { Amplify } from "aws-amplify";
import { Auth } from "@aws-amplify/auth";
import awsExports from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Linkk } from "./components/Link";
import SearchComponent from "./components/SearchBar";
import { LinkProvider } from "./contexts/LinkContext";
import SearchPage from "./Search";
import { useEffect, useState } from "react";
import LinkPage from "./LinkPage";
import NodePage from "./NodePage";
import { makeRequest } from "./services/makeRequests";

import Chat from "./Chat.js";
import io from "socket.io-client";

import { useLinkName } from "./components/Link";

Amplify.configure({
  Auth: {
    region: awsExports.REGION,
    userPoolId: awsExports.USER_POOL_ID,
    userPoolWebClientId: awsExports.USER_POOL_CLIENT_ID,
  },
});

const socket = io.connect("http://localhost:3001");

const formFields = {
  signIn: {
    username: {
      placeholder: "Enter your email:",
    },
  },
  signUp: {
    username: {
      placeholder: "Enter your username:",
      order: 1,
    },
    confirm_password: {
      label: "Confirm Password:",
      placeholder: "Confirm your password:",
      order: 2,
    },
    password: {
      label: "Password:",
      placeholder: "Enter your password:",
      isRequired: false,
      order: 3,
    },
    name: {
      label: "Full Name:",
      placeholder: "Enter your full name:",
      order: 4,
    },
    nickname: {
      label: "Nickname:",
      placeholder: "Enter your nickname:",
      order: 5,
    },
    email: {
      label: "Email:",
      placeholder: "Enter your email:",
      order: 6,
    },
    gender: {
      label: "Gender:",
      placeholder: "Select your gender:",
      order: 7,
    },
    birthdate: {
      label: "Birthdate:",
      placeholder: "Enter your birthdate:",
      order: 8,
    },
    phone_number: {
      label: "Phone Number:",
      placeholder: "Enter your phone number:",
      order: 9,
    },
  },
  setupTOTP: {
    QR: {
      totpIssuer: "test issuer",
      totpUsername: "amplify_qr_test_user",
    },
    confirmation_code: {
      label: "New Label",
      placeholder: "Enter your confirmation code:",
      isRequired: false,
    },
  },
  confirmSignIn: {
    confirmation_code: {
      label: "New Label",
      placeholder: "Enter your confirmation code:",
      isRequired: false,
    },
  },
};
console.log(Router);

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const location = useLocation();

  const linkName = useLinkName();

  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);

  const joinRoom = () => {
    // Use linkName directly for both username and room
    const currentRoom = linkName;
    socket.emit("join_room", currentRoom);
    setShowChat(true);
  };
  if (signedIn) {
    console.log("User SignedIn true!");
  }
  useEffect(() => {
    checkAuthState();
  }, []);

  // const checkAuthState = async () => {
  //   try {
  //     await Auth.currentAuthenticatedUser();
  //     setSignedIn(true);
  //   } catch (error) {
  //     setSignedIn(false);
  //   }
  // };
  const checkAuthState = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const token = user.signInUserSession.idToken.jwtToken;
      const authenticatedUsername = user.username;
      setUsername(authenticatedUsername);

      // Send the token to your backend
      await makeRequest("/user/update-token", {
        method: "POST",
        data: { token },
      });

      setSignedIn(true);
    } catch (error) {
      setSignedIn(false);
    }
  };

  return (
    <div className="app-container">
      <SearchComponent />
      <div className="nav">
        <nav>
          <ul>
            <li>
              <Link to="/">Link The Web</Link>
            </li>
            <li>
              <Link to="/search">No-Link-Found Page</Link>
            </li>
            <li>
              <Link to="/linkpage">Link Page</Link>
            </li>
            <li>
              <Link to="/nodepage">Node Page</Link>
            </li>
          </ul>
        </nav>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <div className="auth-container">
              <Authenticator formFields={formFields}>
                {({ signOut }) => <button onClick={signOut}>Sign out</button>}
              </Authenticator>
            </div>
          }
        />
        <Route path="/link/:linkName" element={<LinkPage />} />
        <Route path="/linkpage" element={<LinkPage />} />
        <Route
          path="/links/:id"
          element={
            <LinkProvider>
              <Linkk />
            </LinkProvider>
          }
        />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/nodepage" element={<NodePage />} />
      </Routes>

      {location.pathname === "/" && (
        <div className="how-to-use-section">
          <h2>How to Use</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas
            convallis ac enim vel venenatis. Vestibulum non nisl in arcu
            ultrices congue sit amet vel turpis. Proin congue consequat
            malesuada. Sed accumsan iaculis nisi luctus elementum. Ut aliquet
            tortor ut convallis mollis. Vivamus volutpat, lacus non placerat
            elementum, enim enim lobortis nibh, a molestie lectus erat at urna.
            Pellentesque tempor pharetra quam, vel varius augue efficitur ac.
            Aenean pulvinar pellentesque neque, ut viverra ante lacinia et. Cras
            commodo erat vel tempor ullamcorper. Cras eget feugiat tortor, quis
            condimentum odio. Aenean pretium magna erat, non mattis odio
            vulputate at. Aliquam pretium gravida interdum.
          </p>
        </div>
      )}

      {location.pathname.includes("/links/") &&
        (!showChat ? (
          <div className="joinChatContainer">
            <button onClick={joinRoom}>Join The Chat Room</button>
          </div>
        ) : (
          <Chat socket={socket} username={username} room={linkName} />
        ))}
    </div>
  );
}

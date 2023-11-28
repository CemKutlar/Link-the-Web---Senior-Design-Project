import React from "react";
import { SearchField } from "@aws-amplify/ui-react";
import "./styles/App.css";
import "./styles/style.scss";
import { Amplify } from "aws-amplify";
import { Auth } from "@aws-amplify/auth";
import awsExports from "./aws-exports";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useLocation,
} from "react-router-dom";
import SearchPage from "./Search";
import { useEffect, useState } from "react";
import LinkPage from "./LinkPage";

Amplify.configure({
  Auth: {
    region: awsExports.REGION,
    userPoolId: awsExports.USER_POOL_ID,
    userPoolWebClientId: awsExports.USER_POOL_CLIENT_ID,
  },
});

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

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      await Auth.currentAuthenticatedUser();
      setSignedIn(true);
    } catch (error) {
      setSignedIn(false);
    }
  };

  return (
    // <div className="gradient-bg">
    //   <svg xmlns="http://www.w3.org/2000/svg">
    //     <defs>
    //       <filter id="goo">
    //         <feGaussianBlur
    //           in="SourceGraphic"
    //           stdDeviation="10"
    //           result="blur"
    //         />
    //         <feColorMatrix
    //           in="blur"
    //           mode="matrix"
    //           values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
    //           result="goo"
    //         />
    //         <feBlend in="SourceGraphic" in2="goo" />
    //       </filter>
    //     </defs>
    //   </svg>
    //   <div className="gradients-container">
    //     <div className="g1"></div>
    //     <div className="g2"></div>
    //     <div className="g3"></div>
    //     <div className="g4"></div>
    //     <div className="g5"></div>
    //     <div className="interactive"></div>
    //   </div>

    <Router>
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
        </ul>
      </nav>

      {/* Add the SearchField component with custom styles */}
      <div className="small-search-container">
        <SearchField
          label="Search"
          placeholder="Search here..."
          labelHidden={false}
          className="small-search-field" // Apply custom styles to the search field
        />
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
        <Route path="/linkpage" element={<LinkPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </Router>
  );
}

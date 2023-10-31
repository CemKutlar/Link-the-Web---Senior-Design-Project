import * as React from "react";
import { SearchField } from "@aws-amplify/ui-react";
import styles from "./styles/LinkPage.module.css"; // Import the CSS module

const LinkPage = () => {
  return (
    <div className={styles.container}>
      <SearchField
        className={styles.searchField}
        label="Search"
        placeholder="Search here..."
        labelHidden={false}
      />
    </div>
  );
};

export default LinkPage;

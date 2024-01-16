import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Rule } from "@rsdoctor/types";
import styles from "./RuleIndex.module.scss";
const themeDefault = require('@rspress/core/theme');

const RuleIndex = () => {
  const rules = Object.values(Rule.RuleErrorMap);
  const [ruleMessage, setRuleMessage] = useState(rules[0] as Rule.RuleMessage);

  const selectRuleMessage = (message: Rule.RuleMessage) => {
    setRuleMessage(message);
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.list}`}>
        <div className={styles["card-header"]}>List of the error codes</div>
        <div className={styles["card-body"]}>
          {rules.map((item) => (
            <div
              className={styles.item}
              key={item.code}
              onClick={() => selectRuleMessage(item)}
              style={{
                color:
                  ruleMessage && item.code === ruleMessage.code
                    ? "rgb(24, 144, 255)"
                    : undefined,
              }}
            >
              <span className={styles.tag}>
                <a>{item.code}</a>
              </span>
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {ruleMessage ? (
        <div className={`${styles.card} ${styles.content}`}>
          <div className={styles["card-header"]}>
            <div>
              <span className={styles.tag}>{ruleMessage.code}</span>
              <span>{ruleMessage.title}</span>
            </div>
            <span className={styles.tag}>{ruleMessage.category}</span>
          </div>
          <div className={styles["card-body"]} style={{ paddingTop: 0 }}>
            <ReactMarkdown
              components={{
                ...themeDefault.getCustomMDXComponent(),
                code: (props) => <code {...props} />,
              }}
            >
              {ruleMessage.description}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className={`${styles.card} ${styles.content}`}>
          <div className={styles["card-header"]}>
            This page lists all the error codes emitted by the Rsdoctor.
          </div>
          <div className={styles["card-body"]}>
            click the error code in left bar to show more details.
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleIndex;

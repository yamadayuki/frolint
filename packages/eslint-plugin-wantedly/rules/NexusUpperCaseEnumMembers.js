const { Linter } = require("eslint");
const { getOptionWithDefault } = require("./utils");

const linter = new Linter();
const RULE_NAME = "nexus-upper-case-enum-members";

// Represents the default option and schema for graphql-operation-name option
const DEFAULT_OPTION = {
  autofix: false,
};

linter.defineRule(RULE_NAME, {
  meta: {
    type: "suggestion",
    fixable: "code",
  },
  create(context) {
    let isNexusUsed = false;
    const option = getOptionWithDefault(context, DEFAULT_OPTION);
    const autofixEnabled = option.autofix;

    return {
      ImportDeclaration(importDeclaration) {
        if (
          importDeclaration.source &&
          importDeclaration.source.type === "Literal" &&
          importDeclaration.source.value === "nexus"
        ) {
          isNexusUsed = true;
        }
      },

      Property(node) {
        if (!isNexusUsed) {
          return;
        }

        if (node.key.name !== "members") {
          return;
        }

        if (node.value.type === "ArrayExpression") {
          const elements = node.value.elements;
          elements.forEach(elem => {
            if (elem.type !== "Literal") {
              return;
            }

            const value = elem.value || "";
            const upperCased = value.toUpperCase();

            if (value !== upperCased) {
              context.report({
                node: elem,
                message: "The enum member `{{value}}` should be UPPER_CASE",
                data: {
                  value,
                },
                fix(fixer) {
                  if (autofixEnabled) {
                    const [start, end] = elem.range;
                    return fixer.replaceTextRange([start + 1, end - 1], upperCased);
                  }
                },
              });
            }
          });
        }

        if (node.value.type === "ObjectExpression") {
          const properties = node.value.properties;
          properties.forEach(property => {
            const keyName = property.key.name || "";
            const upperCased = keyName.toUpperCase();

            if (keyName !== upperCased) {
              context.report({
                node: property.key,
                message: "The enum member `{{keyName}}` should be UPPER_CASE",
                data: {
                  keyName,
                },
                fix(fixer) {
                  if (autofixEnabled) {
                    const [start, end] = property.key.range;
                    return fixer.replaceTextRange([start, end], upperCased);
                  }
                },
              });
            }
          });
        }

        if (node.value.type === "Identifier") {
          const membersVariableName = node.value.name;
          const sourceCode = context.getSourceCode();
          const tokensAndComments = sourceCode.tokensAndComments;
          if (!Array.isArray(tokensAndComments)) {
            return;
          }

          const maybeToken = tokensAndComments.find(
            token => token.type === "Identifier" && token.value === membersVariableName
          );
          if (!maybeToken) {
            return;
          }

          const maybeNode = sourceCode.getNodeByRangeIndex(maybeToken.start);
          if (!maybeNode) {
            return;
          }

          const parent = maybeNode.parent;
          if (!parent || parent.type !== "VariableDeclarator" || !parent.init) {
            return;
          }

          if (parent.init.type === "ArrayExpression") {
            /**
             * In this case, the variable is array
             * e.g. const members = ["foo", "bar"]
             */
            const elements = parent.init.elements;
            elements.forEach(elem => {
              if (elem.type !== "Literal") {
                return;
              }

              const value = elem.value || "";
              const upperCased = value.toUpperCase();

              if (value !== upperCased) {
                context.report({
                  node: elem,
                  message: "The enum member `{{value}}` should be UPPER_CASE",
                  data: {
                    value,
                  },
                  // In this situation, we should not fix the issue automatically.
                  // We cannot know the variable is used or not in other file.
                  // fix(fixer) {},
                });
              }
            });
          } else if (parent.init.type === "ObjectExpression") {
            /**
             * In this case, the variable is object
             * e.g. const members = { foo: 1, bar: 2 }
             */
            const properties = parent.init.properties;
            properties.forEach(property => {
              const keyName = property.key.name || "";
              const upperCased = keyName.toUpperCase();

              if (keyName !== upperCased) {
                context.report({
                  node: property,
                  message: "The enum member `{{keyName}}` should be UPPER_CASE",
                  data: {
                    keyName,
                  },
                  // In this situation, we should not fix the issue automatically.
                  // We cannot know the variable is used or not in other file.
                  // fix(fixer) {},
                });
              }
            });
          }
        }
      },
    };
  },
});

module.exports = {
  RULE_NAME,
  RULE: linter.getRules().get(RULE_NAME),
};
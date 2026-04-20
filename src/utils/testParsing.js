/* Utility functions to parse tests and generate HTML for evaluation activities.
 * The generateTestHTML function is parameterized
 * via an options object so callers can provide component or platform context
 * when available.
 */

/**
 * Parses evaluation activities and generates a structured test hierarchy
 * @param {Object} evaluationActivity Single evaluation activity object
 * @returns {Object} Parsed structure with introduction, tests, and testLists
 */
export function parseTests(evaluationActivity) {
  const { testIntroduction = "", tests = {}, testLists = {}, testClosing = "" } = evaluationActivity;

  /**
   * Recursively build the test hierarchy
   * @param {string} testListUUID UUID of the test list to process
   * @param {number} level Current nesting level (for indentation)
   * @returns {Array} Array of test/testList objects with hierarchy info
   */
  function buildTestHierarchy(testListUUID, level = 0) {
    const testList = testLists[testListUUID];
    if (!testList) return [];

    const result = [];

    // Process all test UUIDs in this test list
    for (const testUUID of testList.testUUIDs || []) {
      const test = tests[testUUID];
      if (!test) continue;

      // Add the test
      result.push({
        type: "test",
        level,
        id: test.id || "",
        objective: test.objective || "",
        dependencies: test.dependencies || [],
        conclusion: test.conclusion || "",
      });

      // If this test has nested test lists, process them recursively
      if (test.nestedTestListUUIDs && test.nestedTestListUUIDs.length > 0) {
        for (const nestedListUUID of test.nestedTestListUUIDs) {
          const nestedTests = buildTestHierarchy(nestedListUUID, level + 1);
          result.push(...nestedTests);
        }
      }
    }

    return result;
  }

  // Find root test lists (those where parentTestUUID is null)
  const rootTestLists = Object.entries(testLists)
    .filter(([_, testList]) => testList.parentTestUUID === null)
    .map(([uuid, _]) => uuid);

  // Build the complete hierarchy
  const testHierarchy = [];
  for (const rootUUID of rootTestLists) {
    testHierarchy.push(...buildTestHierarchy(rootUUID));
  }

  return {
    introduction: testIntroduction,
    tests: testHierarchy,
    closing: testClosing,
  };
}

export function generateTestHTML(parsedActivity = {}, options = {}) {
  // options:
  // - componentCcId: optional string used for numbering when available
  // - selectedPlatformNames: optional array of platform names to filter platform-specific tests
  // - platformLookup: optional lookup for platform descriptions
  // - testLabelPrefix: optional prefix to use instead of componentCcId (useful for exportAA)
  const { componentCcId, selectedPlatformNames = [], platformLookup = {}, testLabelPrefix } = options;

  let html = "";

  if (parsedActivity.introduction) {
    html += parsedActivity.introduction;
  }

  if (parsedActivity.tests && parsedActivity.tests.length > 0) {
    html += '<ul style="padding-left: 20px;">\n';

    parsedActivity.tests.forEach((test, index) => {
      const indent = (test.level || 0) * 20;
      const testText = (test.objective || test.conclusion || test.description || test.test || "").trim();
      if (!testText) return;

      const hasPlatformDependency = test.dependencies && test.dependencies.length > 0;

      // If test is platform specific, filter by selected platform(s)
      if (hasPlatformDependency && selectedPlatformNames.length > 0) {
        const matchesSelectedPlatform = test.dependencies.some((dep) => selectedPlatformNames.includes(dep));
        if (!matchesSelectedPlatform) return;
      }

      html += `  <li style="margin-left: ${indent}px; margin-bottom: 10px;">`;

      // Platform header
      if (hasPlatformDependency) {
        const platformNames = test.dependencies;
        const descriptions = platformNames.map((name) => platformLookup[name]?.description).filter(Boolean);
        const descriptionText = descriptions.length > 0 ? ` : <i>${descriptions.join(" / ")}</i>` : "";

        html += `<div><b>Platform: ${platformNames.join(", ")}</b>${descriptionText}</div>`;
      }

      // Test label + body
      if (hasPlatformDependency) {
        // Platform tests - no numbering
        html += `<div>${testText}</div>`;
      } else {
        const prefix = testLabelPrefix || componentCcId || component.cc_id || "";
        const testPrefix = test.id?.trim() ? `<i>Test ${prefix}:${test.id}:</i> ` : `<i>Test ${prefix}:${index + 1}:</i> `;

        html += `<div>${testPrefix}${testText}</div>`;
      }

      html += `</li>\n`;
    });

    html += "</ul>\n";
  }

  if (parsedActivity.closing) {
    html += parsedActivity.closing;
  }

  return html;
}

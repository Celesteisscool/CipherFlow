globalThis.__TESTS = globalThis.__TESTS || [];
const TR = {
    addTests(tests) { globalThis.__TESTS.push(...tests); },
    addApiTests() {},
    tests: globalThis.__TESTS,
};
export default TR;
export const setLongTestFailure = () => {};
export const logTestReport = () => {};

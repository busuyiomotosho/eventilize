require('@testing-library/jest-dom');

// Provide global alert mock for jsdom tests
if (typeof global.alert === 'undefined') {
	global.alert = jest.fn();
}

// import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
// import { assertEquals, assertThrows } from "@std/assert";
// import { Route } from "../src/models/Route.ts";
//
//
// describe("Route", () => {
// 	// let route: Route;
// 	//
// 	// // Before each test, create a new Calculator instance
// 	// beforeEach(() => {
// 	// 	route = new Route();
// 	// });
//
// 	it("should initialize with zero", () => {
// 		assertEquals(route.result, 0);
// 	});
//
// 	it("should initialize with a provided value", () => {
// 		const initializedCalculator = new Calculator(10);
// 		assertEquals(initializedCalculator.result, 10);
// 	});
//
// 	describe("add method", () => {
// 		it("should add a positive number correctly", () => {
// 			route.add(5);
// 			assertEquals(route.result, 5);
// 		});
//
// 		it("should handle negative numbers", () => {
// 			route.add(-5);
// 			assertEquals(route.result, -5);
// 		});
//
// 		it("should be chainable", () => {
// 			route.add(5).add(10);
// 			assertEquals(route.result, 15);
// 		});
// 	});
//
// 	describe("subtract method", () => {
// 		it("should subtract a number correctly", () => {
// 			route.subtract(5);
// 			assertEquals(route.result, -5);
// 		});
//
// 		it("should be chainable", () => {
// 			route.subtract(5).subtract(10);
// 			assertEquals(route.result, -15);
// 		});
// 	});
//
// 	describe("multiply method", () => {
// 		beforeEach(() => {
// 			// For multiplication tests, start with value 10
// 			route = new Calculator(10);
// 		});
//
// 		it("should multiply by a number correctly", () => {
// 			route.multiply(5);
// 			assertEquals(route.result, 50);
// 		});
//
// 		it("should be chainable", () => {
// 			route.multiply(2).multiply(3);
// 			assertEquals(route.result, 60);
// 		});
// 	});
//
// 	describe("divide method", () => {
// 		beforeEach(() => {
// 			// For division tests, start with value 10
// 			route = new Calculator(10);
// 		});
//
// 		it("should divide by a number correctly", () => {
// 			route.divide(2);
// 			assertEquals(route.result, 5);
// 		});
//
// 		it("should throw when dividing by zero", () => {
// 			assertThrows(
// 				() => route.divide(0),
// 				Error,
// 				"Cannot divide by zero",
// 			);
// 		});
// 	});
// });

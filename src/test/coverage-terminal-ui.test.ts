/**
 * Coverage tests for terminalUi.ts — wrapAnsi disabled branch, formatBytes/Duration/Percent
 */
import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  formatBytes,
  formatDuration,
  formatPercent,
  TerminalUi,
} from "../terminalUi.ts";

describe("TerminalUi — color disabled", () => {
  it("should not wrap ANSI codes when color is disabled", () => {
    const ui = new TerminalUi({
      color: false,
      writer: { write: () => {} },
    });
    const result = ui.accent("hello");
    assertEquals(result, "hello");
    assertEquals(result.includes("\x1b"), false);
  });
});

describe("formatBytes", () => {
  it("should format bytes under 1024", () => {
    assertEquals(formatBytes(512), "512 B");
  });

  it("should format KB range", () => {
    assertEquals(formatBytes(2048), "2.0 KB");
  });

  it("should format MB range", () => {
    const result = formatBytes(2 * 1024 * 1024);
    assertStringIncludes(result, "MB");
  });
});

describe("formatDuration", () => {
  it("should format milliseconds", () => {
    assertEquals(formatDuration(500), "500 ms");
  });

  it("should format seconds", () => {
    assertEquals(formatDuration(2500), "2.50 s");
  });
});

describe("formatPercent", () => {
  it("should format percentage with one decimal", () => {
    assertEquals(formatPercent(42.567), "42.6%");
  });
});

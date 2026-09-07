// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import App from "../App";
afterEach(cleanup);
it("keeps composition text and focus intact under Strict Mode and recovers through a field edit", async () => {
  history.replaceState(null, "", "/#0_2_*_*_1-5");
  render(<App />, { reactStrictMode: true });
  const input = screen.getByRole("textbox", { name: "Expression" });
  expect(input).toHaveValue("0 2 * * 1-5");
  input.focus();
  fireEvent.compositionStart(input);
  fireEvent.change(input, { target: { value: "０ 2 * * 1-5" } });
  expect(input).toHaveValue("０ 2 * * 1-5");
  expect(input).toHaveFocus();
  expect(screen.getByRole("button", { name: "Share URL" })).toBeDisabled();
  fireEvent.compositionEnd(input);
  fireEvent.change(input, { target: { value: "05\t02 * * 1-5" } });
  expect(input).toHaveValue("05\t02 * * 1-5");
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: "Hour" }));
  expect(input).toHaveValue("05\t02 * * 1-5");
  await user.click(screen.getByRole("radio", { name: "Every hour" }));
  expect(input).toHaveValue("05 * * * 1-5");
});
